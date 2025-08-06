import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import Purchases from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import * as Linking from "expo-linking";
import keys from "../../constants/Keys";
import { logFirebaseEvent } from "../extra/firebaseUtils";
import { supabase } from '../../constants/supabase'
import { useUser } from '../main/UserContext';
import { storage } from '../extra/storage';
import moment from 'moment';
import { navigationRef } from '../../../App.js';

const RevenueCatContext = createContext();

export const RevenueCatProvider = ({ children }) => {
	const [isAnonymous, setIsAnonymous] = useState(true);
	const [userId, setUserId] = useState(null);
	const [user, setUser] = useState(null);
	const [subscriptionActive, setSubscriptionActive] = useState(false);
	const [gracePeriodActive, setGracePeriodActive] = useState(false);
	const [trialSubStartDate, setTrialSubStartDate] = useState(null);
	const [trialSubEndDate, setTrialSubEndDate] = useState(null);
	const [offerings, setOfferings] = useState([]);
	const [isReady, setIsReady] = useState(false);
	const [showIntroOffer, setShowIntroOffer] = useState(false);
    const { updateCurrentUser, currentUser } = useUser();
	
	console.log('currentUser in revenuecat: ')
	console.log(currentUser);
	useEffect(() => {
		const init = async () => {
			console.log('in RevenueCat init');
			if(currentUser) {
				Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
				await Purchases.configure({ apiKey: keys.revenuecat_google_api_key, appUserID: currentUser.id });					
				//await getUserDetails();
				await loadOfferings();
			}
			setIsReady(true);
		};
		init();
	}, [currentUser?.id]);
	
	useEffect(() => {
		// Subscribe to purchaser updates
		Purchases.addCustomerInfoUpdateListener(getUserDetails);
		return () => {
		  Purchases.removeCustomerInfoUpdateListener(getUserDetails);
		};
	});
	
	const cancelSub = () => {
		try {
			logFirebaseEvent('cancel_subscription');
		  if (Platform.OS === 'ios') {
			Linking.openURL('https://apps.apple.com/account/subscriptions');
		  } else if (Platform.OS === 'android') {
			Linking.openURL('https://play.google.com/store/account/subscriptions');
		  }
		  getUserDetails();
		} catch(error) {
		  console.error(error)
		}
	}
	
	const calculateRemainingDays = (endDate) => {
	  const now = new Date();
	  const end = new Date(endDate);
	  const diffTime = end - now;
	  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	  return Math.max(0, diffDays); // Ensure we don't return negative days
	};

	const handleFreeTrialButtonClick = async () => {
		console.log('in handleFreeTrialButtonClick ' + currentUser.id)
	  try {
		// 1. Check if user already availed free trial
		const { data, error } = await supabase
		  .from('subscriptions')
		  .select('*')
		  .eq('user_id', currentUser.id)
		  .eq('has_used_trial', true)
		  .maybeSingle();
		  
		if (data) {
		  // User already used free trial, show alert to subscribe
		  Alert.alert(
			'Free Trial Already Used',
			'You have already used your free trial. Would you like to subscribe now?',
			[
			  { text: 'Not Now', style: 'cancel' },
			  { text: 'Subscribe', onPress: () => navigateToSubscriptionScreen() }
			]
		  );
		  return false;
		}
		
		// 2. If first time user, start free trial
		/*const offerings = await Purchases.getOfferings();
		if (!offerings.current) throw new Error('No offerings available');
		
		// Find the subscription package
		const package = offerings.current.availablePackages[0]; // Adjust as needed
		
		// Process purchase through RevenueCat
		const { customerInfo } = await Purchases.purchasePackage(package);*/
		
		// 3. Record trial start in database
		const now = new Date();
		const trialEndDate = new Date(now);
		trialEndDate.setDate(trialEndDate.getDate() + 30); // Add 30 days
		const daysRemaining = 30; // Initial days remaining
		
		const { data: subscriptionData, error: subscriptionError } = await supabase
		  .from('subscriptions')
		  .insert({
			user_id: currentUser.id,
			//package_id: package.identifier,
			package_id: null,
			trial_start_date: now.toISOString(),
			trial_end_date: trialEndDate.toISOString(),
			is_in_trial: true,
			has_used_trial: true,
			days_remaining: daysRemaining,
			//original_transaction_id: customerInfo.originalTransactionId,
			original_transaction_id: null
		  });
		
		if (subscriptionError) throw subscriptionError;
		setSubscriptionActive(true);
		// Show success message to user
		Alert.alert(
		  'Free Trial Started',
		  `Your 30-day free trial has started! You'll have access to all premium features until ${trialEndDate.toLocaleDateString()}.`
		);
		
		return true;
	  } catch (error) {
		console.error('Free trial error:', error);
		Alert.alert('Error', 'Failed to start free trial. Please try again later.');
		return { success: false, error };
	  }
	};

	// Load all offerings a user can (currently) purchase
	const loadOfferings = async () => {
	  try {
		const offerings = await Purchases.getOfferings();
		console.log('in loadOfferings: ')
		console.log(offerings.all.Default.availablePackages)
		if (offerings.all) {
			setOfferings(offerings.all.Default.availablePackages);
		}
	  } catch(error) {
		  console.error('loadOfferings error: ')
		  console.error(error)
	  }
	};

	// Combined function to check subscription status from DB and RevenueCat
	const getUserDetails = async () => {
		console.log('in getUserDetails/checkAndUpdateSubscriptionStatus');
		
		try {
			// Set user identification info
			setIsAnonymous(await Purchases.isAnonymous());
			setUserId(await Purchases.getAppUserID());
			
			// Get RevenueCat customer info
			const customerInfo = await Purchases.getCustomerInfo();
			console.log("RevenueCat customerInfo:", customerInfo);
			
			// Check RevenueCat entitlements
			const hasActiveRevenueCatSubscription = !!customerInfo.entitlements.active['premium'];
			
			// Get the latest subscription record from our database
			const { data, error } = await supabase
				.from('subscriptions')
				.select('*')
				.eq('user_id', currentUser.id)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();
			
			let daysRemaining = 0;
			let isActive = hasActiveRevenueCatSubscription;
			let isInTrial = false;
			let requiresUpdate = false;
			let wasInTrial = false;
			let subscriptionEndDate = null;
			let trialEndDate = null;
			let gracePeriodEndDate = null;
			
			// If we have DB data about the subscription
			if (!error && data) {
				console.log('in if')
				const now = new Date();
				
				// Check if in trial
				if (data.is_in_trial) {
					console.log('in if if')
					trialEndDate = new Date(data.trial_end_date);
					daysRemaining = calculateRemainingDays(trialEndDate);
					console.log('daysRemaining: ' + daysRemaining);
					
					// If trial has ended
					if (daysRemaining <= 0) {
						console.log('in if if if')
						isInTrial = false;
						isActive = hasActiveRevenueCatSubscription; // Use RevenueCat status
						wasInTrial = true;
						requiresUpdate = true; 
					} else {
						console.log('in if if else')
						isInTrial = true;
						isActive = true;
						wasInTrial = true;
						
						// Update days_remaining if it's different
						if (data.days_remaining !== daysRemaining) {
							requiresUpdate = true;
						}
					}
				} else if (data.has_used_trial) {
					console.log('in used trial if')
					isInTrial = false;
					isActive = hasActiveRevenueCatSubscription;
					wasInTrial = true;
					requiresUpdate = true;
					trialEndDate = new Date(data.trial_end_date);
				}
				// Check if paid subscription
				else if (data.subscription_end_date) {
					console.log('in if else')
					subscriptionEndDate = new Date(data.subscription_end_date);
					daysRemaining = calculateRemainingDays(subscriptionEndDate);
					
					// If local DB says subscription has ended, but RevenueCat says it's active
					if (daysRemaining <= 0 && hasActiveRevenueCatSubscription) {
						console.log('in if else if')
						// Get updated expiration date from RevenueCat
						const expirationMs = customerInfo.entitlements.active['premium'].expirationDate;
						subscriptionEndDate = new Date(expirationMs);
						daysRemaining = calculateRemainingDays(subscriptionEndDate);
						isActive = true;
						requiresUpdate = true;
					}
					// If local DB says subscription has ended and RevenueCat agrees
					else if (daysRemaining <= 0) {
						console.log('in if else else1')
						isActive = false;
						requiresUpdate = true;
					} 
					// If subscription is still active according to both sources
					else {
						console.log('in if else else2')
						isActive = true;
						// Update days_remaining if it's different
						if (data.days_remaining !== daysRemaining) {
							requiresUpdate = true;
						}
					}
				}
				
				// Update the database if needed
				if (requiresUpdate) {
					const {error: errorU} = await supabase
						.from('subscriptions')
						.update({
							days_remaining: daysRemaining,
							is_in_trial: isInTrial,
							subscription_end_date: subscriptionEndDate ? subscriptionEndDate.toISOString() : data.subscription_end_date
						})
						.eq('user_id', data.user_id);
					if(errorU) {
						throw errorU;
					}
				}
				
				// If RevenueCat shows active but our DB doesn't have proper data
				if (hasActiveRevenueCatSubscription && (!isActive || !subscriptionEndDate)) {
					console.log('in if2')
					// Get expiration date from RevenueCat
					const expirationMs = customerInfo.entitlements.active['premium'].expirationDate;
					subscriptionEndDate = new Date(expirationMs);
					daysRemaining = calculateRemainingDays(subscriptionEndDate);
					isActive = true;
					
					// Update our database with RevenueCat info
					const {error: errorU1 } = await supabase
						.from('subscriptions')
						.update({
							days_remaining: daysRemaining,
							is_in_trial: false,
							subscription_end_date: subscriptionEndDate.toISOString()
						})
						.eq('user_id', data.user_id);
					if(errorU1) {
						throw errorU1;
					}
				}
				
				// Check if we need to show trial-ended or subscription ended alert
				const lastEndAlert = storage.getString(`end_alert_${currentUser.id}`);
				let phrase = wasInTrial ? 'Free Trial Ended' : 'Subscription Ended';
				let phraseDesc = wasInTrial ? 'Your free trial has ended. Subscribe now to continue enjoying the premium features!' : 'Your subscription has ended. Renew now to continue enjoying the premium features!';
				if (daysRemaining === 0 && !lastEndAlert) {
					Alert.alert(
						phrase,
						phraseDesc,
						[
							{ text: 'Not Now', style: 'cancel' },
							{ text: 'Subscribe', onPress: () => navigateToSubscriptionScreen() }
						]
					);
					
					// Save that we showed the alert
					storage.set(`trial_end_alert_${currentUser.id}`, new Date().toISOString());
				}
				gracePeriodEndDate = await checkAndShowRenewalAlerts(wasInTrial, isActive, trialEndDate, subscriptionEndDate);
				console.log('gracePeriodActive: ' + gracePeriodActive)
			} 
			// If we don't have subscription data in our database but RevenueCat shows active
			else if (hasActiveRevenueCatSubscription) {
				console.log('in else')
				// Get expiration date from RevenueCat
				const expirationMs = customerInfo.entitlements.active['premium'].expirationDate;
				subscriptionEndDate = new Date(expirationMs);
				daysRemaining = calculateRemainingDays(subscriptionEndDate);
				isActive = true;
				let nowDate = new Date();
				// Create new subscription record
				const {error: errorI } = await supabase
					.from('subscriptions')
					.insert({
						user_id: currentUser.id,
						is_in_trial: false,
						days_remaining: daysRemaining,
						subscription_start_date: nowDate.toISOString(),
						subscription_end_date: subscriptionEndDate.toISOString(),
						original_transaction_id: customerInfo.originalAppUserId || customerInfo.originalTransactionId
					});
				if(errorI) {
						throw errorI;
				}
				data.subscription_start_date = subscriptionEndDate.toISOString();
				data.subscription_end_date = nowDate.toISOString();
			}
			
			// Update profile subscription status
			const {error: errorU2 } = await supabase
				.from('profiles')
				.update({ subscribed: isActive, gracePeriodEndDate: gracePeriodEndDate })
				.eq('id', currentUser.id);
			if(errorU2) {
						throw errorU2;
			}
			
			// Update state
			setSubscriptionActive(isActive);
			setUser(customerInfo);
			
			// Check if user is eligible for intro offer
			console.log('wasInTrial:'+ wasInTrial)
			if ((!customerInfo.activeSubscriptions || customerInfo.activeSubscriptions.length === 0) && !wasInTrial) {
				console.log('setting showintro offer')
				setShowIntroOffer(true);
			} else {
				setShowIntroOffer(false)
			}
			if(isInTrial) {
				setTrialSubStartDate(data.trial_start_date);
				setTrialSubEndDate(data.trial_end_date);
			} else if(isActive) {
				setTrialSubStartDate(data.subscription_start_date);
				setTrialSubEndDate(data.subscription_end_date);
			}
			
			return {
				isActive,
				gracePeriodActive,
				isInTrial,
				daysRemaining,
				wasInTrial,
				subscriptionEndDate: subscriptionEndDate ? subscriptionEndDate.toISOString() : null
			};
		} catch (error) {
			console.error('Subscription status check error:', error);
			return { isActive: false, gracePeriodActive: false, error };
		}
	};
	
	const checkAndShowRenewalAlerts = async (wasInTrial, isActive, trialEndDate, subscriptionEndDate) => {
		// Clean up old alert keys when user becomes active again
		if (isActive) {
			await cleanupRenewalAlerts();
			return null;
		}
		
		// Only show alerts if user has ended trial/subscription and is not currently active
		if (!isActive && (wasInTrial || subscriptionEndDate)) {
			const now = new Date();
			const endDate = trialEndDate || subscriptionEndDate;
			
			if (!endDate) return null;
			const newEndDate = moment(endDate).add(3, 'days').format('YYYY-MM-DD');

			// Calculate days since trial/subscription ended
			const daysSinceEnd = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
			
			// Clean up alerts if grace period has completely passed (more than 3 days)
			if (daysSinceEnd > 3) {
				console.log(daysSinceEnd + ', setting gracePeriodActive to false');
				gracePeriodActive && setGracePeriodActive(false);
				await cleanupRenewalAlerts();
				if(daysSinceEnd === 4) {
					await deleteShopPics();
				}
				return null;
			}
			
			const alertDays = [0, 1, 2, 3];
			
			if (alertDays.includes(daysSinceEnd)) {
				console.log(daysSinceEnd + ', setting gracePeriodActive to true');
				setGracePeriodActive(true);
				const alertKey = `renewal_alert_shown_day_${daysSinceEnd}_${currentUser.id}`;
				const alertShown = storage.getBoolean(alertKey);
				
				// Show alert if we haven't shown it for this specific day
				if (!alertShown) {
					let alertTitle, alertMessage;
					
					if (daysSinceEnd === 0) {
						alertTitle = wasInTrial ? 'Free Trial Ended' : 'Subscription Ended';
						alertMessage = `Your ${wasInTrial ? 'free trial' : 'subscription'} has ended. Renew in 3 days to keep all shop images — or only the first 2 will be saved. If logged in on multiple devices, others will be logged out.`;
					} else if (daysSinceEnd === 1) {
						alertTitle = 'Shop Images & Multi-Device Access at Risk';
						alertMessage = `2 days left! Renew now to keep all your shop images. If using multiple devices, you’ll be logged out from all except your latest device.`;
					} else if (daysSinceEnd === 2) {
						alertTitle = 'Urgent: Shop Images & Multi-Device Access at Risk';
						alertMessage = `1 day left! Renew now to save all images. If logged in on more than one device, others will be logged out.`;
					} else if (daysSinceEnd === 3) {
						alertTitle = 'Image Deletion & Device Logout Today';
						alertMessage = `Your uploaded shop images are being deleted today! Renew now to keep them all. If using multiple devices, only the latest device will stay logged in.`;
					}
					
					if (alertTitle && alertMessage) {
						Alert.alert(
							alertTitle,
							alertMessage,
							[
								{ text: 'Later', style: 'cancel' },
								{ text: 'Subscribe Now', onPress: () => navigateToSubscriptionScreen() }
							]
						);
						
						// Mark this alert as shown for this day
						storage.set(alertKey, true);
					}
				}
			}
			return newEndDate;
		}
	};
	
	const deleteShopPics = async() => {
		try {
			const slicedArr = currentUser.ShopDetails.shopPics.slice(0, 2);
			const remaining = currentUser.ShopDetails.shopPics.slice(2);
			console.log('in deleteShopPics')
			console.log(slicedArr)
			console.log(remaining)
			const { error: error3 } = await supabase
							.from('ShopDetails')
							.update({ shopPics: slicedArr })
							.eq('id', currentUser.ShopDetails.id);
			if(error3) {
				throw error3;
			}
			const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('shop-images')
								  .remove(remaining.map(filename => `shopPics/${filename}`))
			if(errorRemove) {
				throw errorRemove;
			}
			const updatedUser = {
				...currentUser,
				ShopDetails: {
					...currentUser.ShopDetails,
					shopPics: slicedArr
				}
			};
			console.log(updatedUser);
			updateCurrentUser(updatedUser);
		} catch(error) {
			console.log(error)
		}
	}

	// Helper function to clean up old renewal alert keys
	const cleanupRenewalAlerts = async () => {
		try {
			// Get all storage keys
			const allKeys = storage.getAllKeys();
			
			// Filter keys that are renewal alerts and trial end alerts for this user
			const alertKeysToDelete = allKeys.filter(key => 
				(key.includes(`renewal_alert_shown_day_`) && key.endsWith(`_${currentUser.id}`))
			);
			
			// Delete all alert keys for this user
			alertKeysToDelete.forEach(key => {
				storage.delete(key);
			});
			
			console.log(`Cleaned up ${alertKeysToDelete.length} alert keys (renewal + trial end)`);
		} catch (error) {
			console.error('Error cleaning up renewal alerts:', error);
		}
	};
	
	const navigateToSubscriptionScreen = () => {
		navigationRef?.current?.navigate('Paywall');
	}

	// Purchase a package
	const purchasePackage = async (pack) => {
		console.log('in purchasePackage')
		console.log(pack);
		try {
			const { customerInfo } = await Purchases.purchasePackage(pack);
			console.log('customerInfo in purchasePackage:')
			console.log(customerInfo)
			if (typeof customerInfo.entitlements.active['premium'] !== 'undefined') {
				//navigationRef?.current?.goBack();
				return false;
			} else {
				const expirationMs = customerInfo.entitlements.active['premium'].expirationDate;
				const subscriptionEndDate = new Date(expirationMs);
				const daysRemaining = calculateRemainingDays(subscriptionEndDate);
				
				// Update subscription in database
				await supabase
				  .from('subscriptions')
				  .upsert({
					user_id: currentUser.id,
					package_id: pack.identifier,
					is_in_trial: false,
					days_remaining: daysRemaining,
					subscription_start_date: new Date().toISOString(),
					subscription_end_date: subscriptionEndDate.toISOString(),
					original_transaction_id: customerInfo.originalTransactionId,
				  });
				setSubscriptionActive(true);
				Alert.alert(
				  'Subscription Started',
				  `Your subscription has started! You'll have access to all premium features until ${subscriptionEndDate.toLocaleDateString()}.`
				);
				//navigationRef?.current?.goBack();  
				return true;
			  }
		} catch (e) {
			if (e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
				Alert.alert('Error purchasing package', e.message);
			}
			console.log(e)
		}
	};

	// // Restore previous purchases
	const restoreUserPurchases = async () => {
	  try {
		const customer = await Purchases.restorePurchases();
		return customer;
	  } catch(error) {
		  console.error(error)
	  }
	};

	const value = useMemo(() => ({
		restoreUserPurchases,
		getUserDetails,
		user,
		isAnonymous,
		userId,
		subscriptionActive,
		trialSubStartDate,
		trialSubEndDate,
		gracePeriodActive,
		offerings,
		showIntroOffer,
		purchasePackage,
		cancelSub,
		handleFreeTrialButtonClick,
		loadOfferings
	}), [user,
	isAnonymous,
	userId,
	subscriptionActive,
	trialSubStartDate,
	trialSubEndDate,
	gracePeriodActive,
	offerings,
	showIntroOffer,
	currentUser?.id]);

	// Return empty fragment if provider is not ready (Purchase not yet initialised)
	if (!isReady) return <></>;

	return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
};

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
};

export default RevenueCatContext;