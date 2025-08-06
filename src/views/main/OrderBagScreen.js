import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, View, TouchableOpacity, ScrollView, StyleSheet, Image, Share, Linking, BackHandler } from 'react-native';
import {
  Input,
  Text, Layout,
  Select, SelectItem,
  IndexPath, useTheme, Datepicker,
  RadioGroup, Radio, Button, Icon, Modal, Spinner, Card, Divider, TopNavigationAction
} from '@ui-kitten/components';
import { ImageOverlay } from '../extra/ImageOverlay';
import { FontAwesome } from '@expo/vector-icons';
import moment from 'moment';
import { useRoute } from '@react-navigation/native';
import { useUser } from './UserContext';
import { useRevenueCat } from './RevenueCatContext';
import { useNetwork } from './NetworkContext';
import { useOrderItems } from '../main/OrderItemsContext';
import OrderDetailsItem from '../main/OrderDetailsItem';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import { logFirebaseEvent } from '../extra/firebaseUtils';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { resetIdCounter } from '../main/generateUniqueId';
import { captureRef } from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import { ArrowIosBackIcon } from '../extra/icons';
import BreadcrumbsOrderBag from '../extra/BreadcrumbsOrderBag';
import { useFocusEffect } from "@react-navigation/native";
import { schedulePushNotification } from './notificationUtils';
import {
  PersonIcon,
  PhoneIcon,
} from '../extra/icons';
import * as Contacts from 'expo-contacts';
import eventEmitter from './eventEmitter';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { usePubSub } from './SimplePubSub';

const OrderBagScreen = ({ navigation }) => {
	const route = useRoute();
	const theme = useTheme();
	const {currentUser} = useUser();
	const { isConnected } = useNetwork();
	const userType = currentUser.userType;
	const { getNewOrder, getNewOrderCust, saveOrder, resetItemsForLabel } = useOrderItems();
	const { notify, updateCache, eligible } = usePubSub();
	const [customerType, setCustomerType] = useState('');
	const [orderScreenDets, setOrderScreenDets] = useState(new Map());
	const items = getNewOrder();
	console.log('items in orderbag')
	console.log(items)
	const { subscriptionActive, gracePeriodActive } = useRevenueCat();
	const custDetails = getNewOrderCust();
	
	const useDatepickerState = (initialDate = null) => {
	    const [date, setDate] = useState(initialDate);
		const resetDate = () => setDate(null);
		return { date, onSelect: setDate, resetDate };
	};
	const useDatepickerStateSub = (initialDate = null) => {
	    const [date, setDate] = useState(initialDate);
		const resetDate = () => setDate(null);
		return { date, onSelect: setDate, resetDate };
	};
	const filterPickerState = useDatepickerState();
	const filterPickerStateSub = useDatepickerStateSub();
	
	const [loading, setLoading] = useState(false)
	const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
	const [payStatusIndex, setPayStatusIndex] = useState(0); 
	const [payStatus, setPayStatus] = useState('Pending'); 
	const [advancePaid, setAdvancePaid] = useState(0)
	const viewRef = useRef(null);
	const [modalVisible, setModalVisible] = useState(false);
	const workerSelected = ['Yes', 'No'];
	const [workerIndex, setWorkerIndex] = useState(1); 
	const [userTypeSelectedIndex, setUserTypeSelectedIndex] = useState(0);
	const [userTypeWorker, setUserTypeWorker] = useState('')
	const [subName, setSubName] = useState("")
	const [subPhNo, setSubPhNo] = useState("")
	const [subPhoneErrorValid, setSubPhoneErrorValid] = useState(false)
	const [workerName, setWorkerName] = useState("")
	const [workerPhNo, setWorkerPhNo] = useState("")
	const [workerPhoneErrorValid, setWorkerPhoneErrorValid] = useState(false)
	const [workerNameError, setWorkerNameError] = useState(false)
	const [eventEmitted, setEventEmitted] = useState(false);
	const data = [
	  'Tailor',
	  'Embroiderer',
	];
	const [step, setStep] = useState(1);
	const breadcrumbRoutes = [
		{ name: 'Order Details', screen: 'OrderBagItems' },
		{ name: 'Create Order', screen: 'OrderBagCreate' },
	];
  
	console.log('new order item:')
	console.log(JSON.stringify(items))
	console.log(custDetails)
	
	useEffect(() => {
		navigation.setOptions({
		  headerRight: () => (
			<Icon name="trash-2-outline" fill="#FF0000" style={{ width: 25, height: 25, marginRight: 20 }} onPress={() => handleDelete(null)}/>
		  ),
		});
	  }, [navigation]);
	
	useEffect(() => {
		const backAction = () => {
		if(step === 1) {
			if(route.params?.cleanup) {
				console.log('in resetItemsForLabel useEffect')
				resetItemsForLabel(route.params?.itemName);
			}
			navigation.navigate('HomeMain', {screen: 'HomeNew'});
			return true;
		} else if (step > 1) {
			setStep(prevStep => prevStep - 1);
			return true;
		  } else {
			return false;
		  }
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, [step]);  
	
	useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				if(step === 1) {
					if(route.params?.cleanup) {
						console.log('in resetItemsForLabel useEffect')
						resetItemsForLabel(route.params?.itemName);
					}
					navigation.navigate('HomeMain', {screen: 'HomeNew'});
				} else if (step > 1) {
					setStep(prevStep => prevStep - 1);
				  } else {
					navigation.goBack();
				  }
				}
			}/>
		  ),
		});
	}, [navigation, step]);
	
	useFocusEffect(
		useCallback(() => {
			items.forEach(item => {
				setOrderScreenDets(prev => new Map(prev).set(item.id, {itemName: route.params?.itemName, headerImgUri: route.params?.headerImgUri}))
			});
		  return () => {
			console.log('screen unfocused');
			if(route.params?.cleanup) {
						console.log('in resetItemsForLabel orderbag useEffect')
						resetItemsForLabel(route.params?.itemName);
			}
		  };
		}, [navigation])
	);
	  
	useEffect(() => {
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		}
		console.log('updated items')
		console.log(items);
		console.log(custDetails);
	}, [getNewOrder, getNewOrderCust]);
	
	useEffect(() => {
		   if(route.params?.workerNameImp) {
			if(customerType === 'worker') {
			  setWorkerName(route.params.workerNameImp)
			  let ph = route.params.workerPhNoImp.includes('+91') ? route.params.workerPhNoImp.substring(3) : route.params.workerPhNoImp
			  setWorkerPhNo(ph)
			} else if(customerType === 'subTailor') {
				setSubName(route.params.workerNameImp)
				  let ph = route.params.workerPhNoImp.includes('+91') ? route.params.workerPhNoImp.substring(3) : route.params.workerPhNoImp
				  setSubPhNo(ph)
			}
		  }
	  },[route.params?.workerNameImp])

  const handlePayStatusSelect = (index) => {
		setPayStatusIndex(index);
		setPayStatus(payStatuses[index]);
	};
	
	const showAdAfterAction = () => {
		// Use test ad unit IDs in development
		const adUnitID = __DEV__ 
		  ? TestIds.INTERSTITIAL 
		  : Platform.select({
			  ios: 'ca-app-pub-3653760421436075/9615373788',
			  android: 'ca-app-pub-3653760421436075/9615373788',
			});
			
		// Create and load the interstitial ad
		const interstitialAd = InterstitialAd.createForAdRequest(adUnitID, {
		  requestNonPersonalizedAdsOnly: false,
		  keywords: ['productivity', 'business'],
		});
		
		// Add event listeners
		const unsubscribeLoaded = interstitialAd.addAdEventListener(
		  AdEventType.LOADED,
		  () => {
			console.log('Post-action ad loaded, showing now');
			interstitialAd.show();
		  }
		);
		
		const unsubscribeError = interstitialAd.addAdEventListener(
		  AdEventType.ERROR,
		  (error) => {
			console.error('Failed to load post-action ad:', error);
			// Clean up event listeners on error
			cleanup();
		  }
		);
		
		const unsubscribeClosed = interstitialAd.addAdEventListener(
		  AdEventType.CLOSED,
		  () => {
			console.log('Post-action ad closed');
			// Clean up event listeners after ad is closed
			cleanup();
		  }
		);
		
		// Function to clean up event listeners
		const cleanup = () => {
		  unsubscribeLoaded();
		  unsubscribeError();
		  unsubscribeClosed();
		};
		
		// Set a timeout to clean up if ad never loads
		const timeoutId = setTimeout(() => {
		  console.log('Ad load timeout - cleaning up');
		  cleanup();
		}, 10000); // 10 seconds timeout
		
		// Start loading the ad
		console.log('Loading post-action ad...');
		interstitialAd.load();
	};
	
	const uploadDesignFile = async(itemLocal, fileType) => {
		const arraybuffer = await fetch(itemLocal[fileType]).then((res) => res.arrayBuffer())
		const fileExt = itemLocal[fileType]?.split('.').pop()?.toLowerCase() ?? 'jpeg'
		const path = `${Date.now()}.${fileExt}`
		const { data, error: uploadError } = await supabase.storage
								.from('design-files/' + fileType)
								.upload(path, arraybuffer, {
								  contentType: 'image/jpeg',
								})

		if (uploadError) {
			console.log(uploadError);
			return false;
		} else {
			itemLocal[fileType] = data.path;
		}
	}
	
	const uploadOrderImages = async(picType, pics) => {
		let orderPicsString = null;
		console.log(pics)
		const folderName = picType === 'dress' ? 'dressImages' : 'patternImages'
		let a = await Promise.all(
							pics.map(async(pic) => {
								const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer())
								  const fileExt = pic.split('.').pop()?.toLowerCase() ?? 'jpeg'
								  const path = `${Date.now()}.${fileExt}`
								const { data, error: uploadError } = await supabase.storage
									.from('order-images/' + folderName)
									.upload(path, arraybuffer, {
									  contentType: 'image/jpeg',
									})

								  if (uploadError) {
									  console.log(pic);
									  console.log(uploadError);
									  throw uploadError;
								  }
								  return path;
							})
						);
		if (a.length > 0) {
			orderPicsString = a.join(','); // Join paths into a string
		}
		console.log('orderPicsString:')
		console.log(orderPicsString);
		return orderPicsString;
	}
	
	  const addDressItemsToParse = async (orderNo, customerId, custName, phNo) => {
		  
		try {
			const grouped = {};
			let dressItemIds = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				logFirebaseEvent('new_order_creation', {item: item.dressType});
				console.log("in add: ")
				console.log(item);
				const jsonCacheVal = storage.getString(phNo+'_'+item.dressType);
						if(item.frontNeckDesignFile) {
							console.log('uploading frontNeckDesignFile')
							uploadDesignFile(item, 'frontNeckDesignFile')
						}
						if(item.backNeckDesignFile) {
							console.log('uploading backNeckDesignFile')
							uploadDesignFile(item, 'backNeckDesignFile')
						}
						if(item.sleeveDesignFile) {
							console.log('uploading sleeveDesignFile')
							uploadDesignFile(item, 'sleeveDesignFile')
						}
						if(item.dressPics) {
							item.dressPics = await uploadOrderImages('dress', item.dressPics);
						}
						if(item.patternPics) {
							item.patternPics = await uploadOrderImages('pattern', item.patternPics);
						}
						
					const { data, error } = await supabase
									  .from('DressItems')
									  .insert({ orderNo: orderNo, dressType: item.dressType, dueDate: item.dueDate, dressSubType: item.dressSubType, stitchingAmt: parseInt(item.stitchingAmt ? item.stitchingAmt : 0), frontNeckType: item.frontNeckType, backNeckType: item.backNeckType, sleeveType: item.sleeveType, sleeveLength: item.sleeveLength, dressGiven: item.dressGiven, alterDressType: item.alterDressType, notes: item.notes, dressPics: item.dressPics, patternPics: item.patternPics, frontNeckDesignFile: item.frontNeckDesignFile, backNeckDesignFile: item.backNeckDesignFile, sleeveDesignFile: item.sleeveDesignFile, associateCustName: item.associateCustName?.trim() })
									  .select().single();
					if(error) {
						console.log(error);
						throw error;
					}
					dressItemIds.push(data.id)
					
					try {
						const selPr = ['type', 'frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'waist', 'hip', 'leg', 'topLength', 'bottomLength', 'extraMeasurements'];
						
						const values1 = selPr.map(key => item[key]);
						let measCacheVal = jsonCacheVal ? JSON.parse(jsonCacheVal) : null;
						const values2 = measCacheVal ? Object.values(measCacheVal) : null;

						if (values2 === null || !values1.every((val, index) => val === values2[index])) {
							const selectedProperties = ['dressType', 'frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'waist', 'hip', 'leg', 'topLength', 'bottomLength', 'extraMeasurements'];
							
							const { data: data1, error: error1 } = await supabase
								  .from('Measurements')
								  .insert({ dressType: item.dressType, customerId: customerId, frontNeck: parseInt(item.frontNeck), backNeck: parseInt(item.backNeck), sleeve: parseInt(item.sleeve), shoulder: parseInt(item.shoulder), AHC: parseInt(item.AHC), shoulderToWaist: parseInt(item.shoulderToWaist), chest: parseInt(item.chest), waist: parseInt(item.waist), hip: parseInt(item.hip), leg: parseInt(item.leg), topLength: parseInt(item.topLength), bottomLength: parseInt(item.bottomLength), extraMeasurements: item.extraMeasurements, dressItemNo: data.id, otherCust: item.associateCustName ? true : false })
								  .select();
							if(error1) {
								console.log(error1)
								throw error1;
							}
							console.log("Measurement saved successfully:", data1);
							const filteredObject = {};
							selectedProperties.forEach(prop => {
							  filteredObject[prop] = data1[0][prop];
							});
							if(!item.associateCustName) {
								console.log('updating UPDATE_MEAS')
								/*storage.set(phNo + '_' + item.dressType, resultJson);
								console.log("storage.getString: ")
								console.log(storage.getString(phNo + '_' + item.dressType))*/
								updateCache('UPDATE_MEAS', filteredObject, phNo, item.dressType);    
								await notify(subscriptionActive || gracePeriodActive, currentUser.id, 'UPDATE_MEAS', phNo, item.dressType, filteredObject);
							}
						}
					} catch(error) {
						console.error('Error saving Measurement:', error.message);
						throw error;
					}
				
				const key = (item.dressType === 'Alteration' ? item.alterDressType : (item.dressSubType ? item.dressSubType : '')) + " " + item.dressType;
							if (grouped[key]) {
							  grouped[key].count += 1;
							  grouped[key].groupedAmt += item.stitchingAmt;
							} else {
							  grouped[key] = { count: 1, groupedAmt: item.stitchingAmt };
							}
			}
			const details = Object.entries(grouped)
						.map(([key, value]) => {
							return `${value.count} ${key}`})
						.join(', ');
			const detailsAmt = Object.entries(grouped).map(([key, value]) => ({
						  key,
						  ...value
						}));
			console.log('dressItemIds:')
			console.log(dressItemIds)
			return [details, detailsAmt, dressItemIds];
		} catch (error) {
			  console.error('Error saving DressItem:', error.message);
			  const response = await supabase
				  .from('OrderItems')
				  .delete()
				  .eq('orderNo', orderNo);
			  if (response.error) {
				  console.error('Deletion failed:', response.error.message);
				  throw error;
			  }
			  return null;
		}
	  };

		const calculateTotalAmount = (data) => {
		  return data.reduce((total, item) => total + parseInt(item.stitchingAmt ? item.stitchingAmt : 0), 0);
		};
		
	
	function isValidPhoneNumber(phoneNo) {
	  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
	  return phoneRegex.test(phoneNo);
	}
		
	  const createOrder = async (shopPhNoContacts) => {
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		} else {
		  if(!custDetails.custName?.trim() || !custDetails.phoneNo?.trim()) {
			  showErrorMessage("Empty customer name or phone number!")
		  } else if (items.length===0) {
			  showErrorMessage("Add atleast one order item!")
		  } else {
				try {
						setLoading(true);
						let grRes = [];
						let custInserted = false;
							console.log(custDetails)
							let custId = null;
							let custUn = null;
							
							  const { data, error, status } = await supabase
								.from('Customer')
								.select(`*`)
								.eq('phoneNo', custDetails.phoneNo)
								.single()
							  if (error && status !== 406) {
								console.log(error)
								throw error;
							  }
							    console.log('cust data:')
								console.log(data)
								if(data) {
									custId = data.id;
									custUn = data.username;
								} else {
									custInserted = true;
									const {data: dataUser, error: errorUser } = await supabase
										.rpc("insert_customer_with_username", {
											p_cust_name: custDetails.custName,
											p_phone_no: custDetails.phoneNo
										})
									if(errorUser) {
										throw errorUser;
									}
									
										console.log(dataUser[0])
										custId = dataUser[0].id;
										custUn = dataUser[0].username;
										
										/*const customers = storage.getString(currentUser.username+'_Customers');
										let customersArray = customers ? JSON.parse(customers) : [];
										customersArray.push({custName: custDetails.custName, phoneNo: custDetails.phoneNo});
										storage.set(currentUser.username+'_Customers', JSON.stringify(customersArray, ['custName', 'phoneNo']));*/
									
								}
								
								let workerId = null;
								let formattedWorkerDate = null;
								let formattedWorkerDateSub = null;
								if(workerIndex === 0) {
								  const isValid = workerPhNo ? isValidPhoneNumber(workerPhNo) : false;		
								  if(!workerName) {
										setWorkerNameError(true)
										showErrorMessage('Enter Outsourcing ' + userTypeWorker + ' name!');
										return;
								  } else if (!isValid) {
										setWorkerPhoneErrorValid(true)
										showErrorMessage('Enter a valid phone number for outsourcing ' + userTypeWorker + '!');
										return;
								  } else {
									let wPh = '+91' + workerPhNo.trim();
									const { data: datawp, error: errorwp } = await supabase
									  .from('profiles')
									  .select(`username`)
									  .eq('phoneNo', wPh)
									if(errorwp) {
										console.log(errorwp)
										throw errorwp
									}
									console.log(datawp)
									formattedWorkerDate = filterPickerState.date ? moment(filterPickerState.date).format('YYYY-MM-DD') : filterPickerState.date;
									console.log(formattedWorkerDate)
									const capWName = workerName.charAt(0).toUpperCase() + workerName.slice(1)
									const { data: dataw, error: errorw } = await supabase
										.from('Worker')
										.upsert({ workerName: capWName.trim(), workerPhNo: wPh, username: datawp && datawp.length > 0 ? datawp[0].username : null },
										{ onConflict: ['workerName', 'workerPhNo'] })
										.eq('workerName', capWName.trim())
										.eq('workerPhNo', wPh)
										.select().single()
									  if (errorw) {
										console.log(errorw)
										throw errorw;
									  }
									console.log(dataw);
									workerId = dataw.id;
								  }
								}
								if(subPhNo && !isValidPhoneNumber(subPhNo)) {
									setSubPhoneErrorValid(true);
									showErrorMessage('Enter a valid phone number for outsourcing ' + userTypeWorker + '!');
								}
								if(subName) {
									formattedWorkerDateSub = filterPickerStateSub.date ? moment(filterPickerStateSub.date).format('YYYY-MM-DD') : filterPickerStateSub.date;
									console.log(formattedWorkerDateSub)
								}
								let insertJson = {};
									insertJson = { username: currentUser.username, orderDate: new Date(), orderStatus: 'Created', orderAmt: calculateTotalAmount(items), shopId: currentUser.ShopDetails.id, paymentStatus: payStatus, advance: parseInt(advancePaid ? advancePaid : 0), customerId: custId, workerId: workerId, workerDueDate: workerIndex === 0 ? formattedWorkerDate : null, workerType: userTypeWorker, subTailorName: subName, subTailorPhNo: subPhNo, subTailorDueDate: subName ? formattedWorkerDateSub : null, occasion: custDetails.occasion }
								
								console.log('insertJson:')
								console.log(insertJson)
								const { data: data1, error: error1 } = await supabase
									  .from('OrderItems')
									  .insert(insertJson)
									  .select(`*, Worker!workerId(workerName, workerPhNo)`).maybeSingle();
								if(error1) {
									console.log(error1);
									throw error1;
								}
									console.log(data1)
									if (data1 && data1.Worker) {
									  data1.workerName = data1.Worker.workerName;
									  data1.workerPhNo = data1.Worker.workerPhNo;
									  delete data1.Worker; // Remove the nested object
									}

									grRes = await addDressItemsToParse(data1.orderNo, custId, custDetails.custName, custDetails.phoneNo);
									console.log("grRes: " + grRes[0] + grRes[1] + grRes[2])
							
								console.log(items)
								const combinedObject = items.reduce((accumulator, currentObj) => {
								  for (const key in currentObj) {
									let value = currentObj[key];

									if ((key === 'dressPics' || key === 'patternPics') && typeof value === 'string') {
									  value = value.split(',');
									}

									if (accumulator[key]) {
									  accumulator[key].push(value);
									} else {
									  accumulator[key] = [value];
									}
								  }
								  return accumulator;
								}, {});

								
								console.log("combined dress items: ");
								const selProps = ['associateCustName', 'dressType', 'dressSubType', 'alterDressType', 'frontNeckType', 'backNeckType', 'sleeveType', 'sleeveLength',  'frontNeckDesignFile', 'backNeckDesignFile', 'sleeveDesignFile', 'dressGiven', 'dueDate', 'stitchingAmt', 'notes', 'dressPics', 'patternPics', 'frontNeck', 'backNeck', 'shoulder', 'sleeve', 'chest', 'AHC', 'shoulderToWaist', 'waist', 'hip', 'leg', 'topLength', 'bottomLength', 'extraMeasurements'];
								const filteredObjectCombined = {};
								selProps.forEach(prop => {
								  filteredObjectCombined[prop] = combinedObject[prop];
								});
								const selComObj = JSON.stringify(filteredObjectCombined, (key, value) => {
												  return value;
												});
								const selComObjJson = JSON.parse(selComObj)
								console.log(selComObjJson)
								console.log(data1);
								const itemFinal = {...data1, ...selComObjJson, ...{ shopName: currentUser.ShopDetails.shopName, shopAddress: currentUser.ShopDetails.shopAddress, shopPhNo: currentUser.ShopDetails.shopPhNo, custName: custDetails.custName, phoneNo: custDetails.phoneNo, custUsername: custUn, dressItemId: grRes[2], dressDetails: grRes[0], dressDetailsAmt: grRes[1]}}
								console.log('itemFinal:')
								console.log(itemFinal)
								
								
										/*let arrayA = JSON.parse(storage.getString(currentUser.username+'_Created') || '[]');
										let arrayB = [itemFinal, ...arrayA];
										let bStr = JSON.stringify(arrayB)
										storage.set(currentUser.username+'_Created', bStr);*/
										
										updateCache('NEW_ORDER', itemFinal, currentUser.username, 'Created', null, custInserted);    
										await notify(subscriptionActive || gracePeriodActive, currentUser.id, 'NEW_ORDER', currentUser.username, 'Created', itemFinal, null, custInserted);
										
									showSuccessMessage('Order saved!');
									eventEmitter.emit('storageUpdated');
									eventEmitter.emit('newOrderAdded');
									if(!eventEmitted) {
										eventEmitter.emit('transactionAdded');
										setEventEmitted(true);
									}
								
							  saveOrder([], {custName: '', phoneNo: '', occasion: ''});
							  resetItemsForLabel();
							  resetIdCounter();
							  if(!subscriptionActive) {
								  showAdAfterAction();
							  }
							  navigation.navigate('HomeMain', {screen: 'HomeNew', params: {firstOrder: data1.tailorOrderNo === 1} });
						
			} catch(error) {
						console.error("Error calling Cloud Code function:", error.message);
			} finally {
				setPayStatusIndex(0);
				setPayStatus('Pending');
				setAdvancePaid(0);
				setWorkerIndex(1);
				setUserTypeSelectedIndex(0);
				setUserTypeWorker('');
				setSubName('');
				setSubPhNo('');
				setSubPhoneErrorValid(false);
				setWorkerName('');
				setWorkerPhNo('');
				setWorkerNameError(false);
				setWorkerPhoneErrorValid(false);
				filterPickerState.resetDate();
				filterPickerStateSub.resetDate();
				setLoading(false)
			}
		  }
		}
	}

	  const navigateToContacts = () => {
		navigation.navigate('ImportCustomerScreen', {screenName: 'OrderBagScreen'});
	  }
	  
	const handleEdit = (indexList) => {
		let newOrderItem = { ...items.splice(indexList, 1)[0] };
		console.log(newOrderItem) 
		navigation.navigate('HomeMain', {screen: 'Test', params: {itemName: orderScreenDets.get(newOrderItem.id).itemName, headerImgUri: orderScreenDets.get(newOrderItem.id).headerImgUri, step: 2, orderItem: [newOrderItem], editMode: true}});
	}
	
	const handleDelete = (indexList, editMode) => {
		if(indexList === null) {
			saveOrder([], {custName: '', phoneNo: '', occasion: ''});
		} else {
			const updatedOrder = [...items];
			updatedOrder.splice(indexList, 1);
			if(updatedOrder.length > 0) {
				saveOrder(updatedOrder, custDetails, true);
			} else {
				saveOrder([], {custName: '', phoneNo: '', occasion: ''});
			}
		}
	}
	
	const handleWorkerSelect = (index) => {
		setWorkerIndex(index);
		setUserTypeWorker('Tailor');
	};
	
	const handleUserTypeSelect = (index) => {
		console.log('in handleUserTypeSelect ' + index)
		setUserTypeSelectedIndex(index);
		setUserTypeWorker(data[index]);
	};
	
	const DateIcon = (style: ImageStyle): IconElement => {
	  const theme = useTheme();
	  return (
		<Icon {...style} name='calendar-outline' fill={theme['color-primary-100']}/>
	  )
	};

  return (
  <View style={styles.outerContainer}>
  <ScrollView keyboardShouldPersistTaps="handled">
	<View style={styles.container}>
		{items.length === 0 ? (
		  <View style={{alignItems: 'center', marginTop: 150, marginBottom: 200}}>
			<Image
				style={styles.imageBag}
				source={require('../../../assets/no_orders_bag.png')}/>
			<Text category="h5" style={styles.title}>
			  No dress items added yet!
			</Text>
			<Text category="s1" style={styles.subtitle}>
			  Choose a dress type from Home tab to start creating an order
			</Text>
		  </View>
		) : (
		<Layout style={{marginTop: -25}}>
		<BreadcrumbsOrderBag steps={breadcrumbRoutes} step={step} setStep={setStep} navigation={navigation}/>
	{step === 1 ? (
		<>
		<View ref={viewRef} collapsable={false}>
			<View style={styles.sectionHeader}>
				<Icon style={styles.icon} fill={theme['color-primary-500']} name="person-outline" />
				<Text category="s1" style={styles.headerText}>
				  Customer Details
				</Text>
			  </View>
			  <Card style={styles.cardFinal}>
				<View style={styles.detailRow}>
				  <Text category="label">
					Name
				  </Text>
				  <Text category="s2">{custDetails.custName}</Text>
				</View>
				<View style={styles.detailRow}>
				  <Text category="label">
					Phone No
				  </Text>
				  <Text category="s2">{custDetails.phoneNo}</Text>
				</View>
				<View style={styles.detailRow}>
				  <Text category="label">
					Order Date
				  </Text>
				  <Text category="s2">{moment(new Date()).format('DD-MM-YYYY')}</Text>
				</View>
			  </Card>
			
		<Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
				<Icon style={styles.icon} fill={theme['color-primary-500']} name="shopping-bag-outline" />
				<Text category="s1" style={styles.headerText}>
				  Order Details
				</Text>
		</View>
	  
	  {items.map((item, index) => {
			let measurementsObj = {
			  frontNeck: item.frontNeck,
			  backNeck: item.backNeck,
			  shoulder: item.shoulder,
			  sleeve: item.sleeve,
			  AHC: item.AHC,
			  shoulderToWaist: item.shoulderToWaist,
			  chest: item.chest,
			  waist: item.waist,
			  hip: item.hip,
			  leg: item.leg,
			  topLength: item.topLength,
			  bottomLength: item.bottomLength,
			};

			return (
			  <OrderDetailsItem
				key={item.id}
				indexList={index}
				onDeleteItem={handleDelete}
				onEditItem={handleEdit}
				style={styles.item}
				dressItemId={item.id}
				custId={item.localId} // You may want to adjust the `custId` if needed
				imageSource1={item.dressPics} // Assuming first image
				imageSource2={item.patternPics} // Assuming first pattern image
				dressType={item.dressType}
				dressSubType={item.dressType === 'Alteration' ? item.alterDressType : item.dressSubType}
				amt={item.stitchingAmt || 0}
				dueDate={item.dueDate || new Date()}
				dressGiven={item.dressGiven || false}
				frontNeckType={item.frontNeckType || null}
				backNeckType={item.backNeckType || null}
				sleeveType={item.sleeveType || null}
				sleeveLength={item.sleeveLength || null}
				frontNeckDesignFile={item.frontNeckDesignFile || null}
				backNeckDesignFile={item.backNeckDesignFile || null}
				sleeveDesignFile={item.sleeveDesignFile || null}
				notes={item.notes || ''}
				measurementsObj={measurementsObj}
				extraMeasurements={item.extraMeasurements}
				isBag = {true}
				defaultSource={require('../../../assets/empty_dress.png')} // Default image if no image is available
				orderFor = {item.associateCustName || custDetails.custName}
			  />
			);
		  })}
		</View>
		<View style={styles.buttonContainerOuter}>
			<View style={styles.buttonContainer}>
				<Button appearance='outline' 
					  onPress={() => navigation.navigate('HomeMain', {screen: 'HomeNew' })}
					  style={styles.infoButton}
				>
							Add another dress item
				</Button>
				<Text category='s2' appearance='hint' style={styles.infoText}>Takes you to homepage to add another dress item to order</Text>
			</View>
			<View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or</Text>
                <View style={styles.dividerLine} />
              </View>
			<View style={styles.buttonContainer}>
				<Button onPress={() => setStep(2)} style={styles.infoButton}>Next</Button>
				<Text category='s2' appearance='hint' style={styles.infoText}>Proceed to create order by adding payment and worker details</Text>
			</View>
		</View>
		</>
	) : (
	<>
      <View style={styles.sectionHeader}>
        <Icon style={styles.icon} fill={theme['color-primary-500']} name="credit-card-outline" />
        <Text category="s1" style={styles.headerText}>
          Payment Details
        </Text>
      </View>
      <Card style={styles.cardFinal}>
        <View style={styles.detailRow}>
          <Text category="label">
            Total Order Amount
          </Text>
          <Text category="label">Rs. {calculateTotalAmount(items)}</Text>
        </View>
        <View>
          <Text category="label">
            Payment Status
          </Text>
            <RadioGroup
					selectedIndex={payStatusIndex}
					onChange={handlePayStatusSelect}
					style={{ flexDirection: 'row' }}  
				  >
					{payStatuses.map((paySt, index) => (
					  <Radio key={index} style={{ marginLeft: -5 }}>{paySt}</Radio>
					))}
			</RadioGroup>
        </View>
        {payStatuses[payStatusIndex] === "Partially paid" && (
			<View style={styles.generalField}>
			  <Text category="label">
				Advance paid
			  </Text>
			  <View style={{flexDirection: 'row', alignItems: 'center', marginHorizontal: 100}}>
				<Text category='s2'>Rs. </Text>
			    <Input
				  style={{width: 80}}
				  value={advancePaid}
				  keyboardType='numeric'
				  textStyle={{ textAlign: 'right' }}
				  onChangeText={(text) => setAdvancePaid(text)}
				/>
			  </View>
			</View>
		)}
		</Card>
		
		<Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
			<Icon style={styles.icon} fill={theme['color-primary-500']} name="credit-card-outline" />
			<Text category="s1" style={styles.headerText}>
			  Assign order
			</Text>
		  </View>
		<Card style={styles.cardFinal}>
			
					<Input
							autoCapitalize='none'
							label='Worker Name'
							accessoryRight={<TouchableOpacity onPress={() => {setCustomerType('subTailor'); navigateToContacts()}}>
								<Icon name='person-done-outline' fill={theme['color-primary-500']}/>
							</TouchableOpacity>}
							value={subName}
							onChangeText={text => {
								setSubName(text)
							}}
						  />
						  
						  <Input
						    status={subPhoneErrorValid ? 'danger' : 'basic'}
							label='Worker Phone'
							style={styles.formInput}
							accessoryRight={PhoneIcon}
							keyboardType="phone-pad"
							maxLength={10}
							value={subPhNo}
							onChangeText={(text) => {
								setSubPhNo(text);
								setSubPhoneErrorValid(false);
							}}
						  />
						  
						<Datepicker
							style={styles.formInput}
							label='Worker to complete order by'
							accessoryRight={DateIcon}
							status='basic'
							min={new Date()}
							{...filterPickerStateSub}
						  />
      </Card>
	  
	  <Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
			<Icon style={styles.icon} fill={theme['color-primary-500']} name="credit-card-outline" />
			<Text category="s1" style={styles.headerText}>
			  External tailors/embroiderers
			</Text>
		  </View>
		  <View>
				  <Text category='label' style={styles.dateText}>						
					Any tailor/embroiderer working on this order?
				  </Text>
				  <RadioGroup
					selectedIndex={workerIndex}
					onChange={handleWorkerSelect}
					style={{ flexDirection: 'row' }}  
				  >
					{workerSelected.map((sel, index) => (
					  <Radio key={index}>{sel}</Radio>
					))}
				  </RadioGroup>
			</View>
			
	{workerIndex === 0 && (
		<Card style={styles.cardFinal}>
					<Text category="label" style={{color: '#878683', fontSize: 12}}>
						Select worker type *
					  </Text>
					<RadioGroup
						selectedIndex={userTypeSelectedIndex}
						onChange={handleUserTypeSelect}
						style={{ flexDirection: 'row', marginLeft: 3, marginTop: 3, marginBottom: -5 }}  
					  >
						{data.map((op, index) => (
						  <Radio key={index} style={{ marginLeft: -5 }}>{op}</Radio>
						))}
					</RadioGroup>
					<Input
							status={workerNameError ? 'danger' : 'basic'}
							style={styles.formInput}
							autoCapitalize='none'
							label='Name *'
							accessoryRight={<TouchableOpacity onPress={() => {setCustomerType('worker'); navigateToContacts()}}>
								<Icon name='person-done-outline' fill={theme['color-primary-500']}/>
							</TouchableOpacity>}
							value={workerName}
							onChangeText={text => {
								setWorkerNameError(false)
								setWorkerName(text)
							}}
						  />
						  
						  <Input
							status={workerPhoneErrorValid ? 'danger' : 'basic'}
							label='Phone *'
							style={styles.formInput}
							accessoryRight={PhoneIcon}
							keyboardType="phone-pad"
							maxLength={10}
							value={workerPhNo}
							onChangeText={(text) => {
								setWorkerPhNo(text);
								setWorkerPhoneErrorValid(false);
							}}
						  />
						  
						<Datepicker
							style={styles.formInput}
							label='Due date'
							accessoryRight={DateIcon}
							status='basic'
							min={new Date()}
							{...filterPickerState}
						  />
			  </Card>
			)}
			<Button
					  style={styles.nextButton}
					  size='medium'
					  onPress={createOrder}
					  disabled={!isConnected}
					  status='info'
				>
							Create Order
				</Button>
			</>
		)}
			<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
			</Modal>
		</Layout>
		)}
	</View>
	</ScrollView>
	</View>
  );
};

const styles = StyleSheet.create({
	outerContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
	backgroundColor: '#fff',
  },
  content: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    marginBottom: 8,
	fontWeight: 'bold',
  },
  table: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    alignItems: 'center',
    padding: 5,
  },
  poweredBy: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
  },
  
  card: {
    borderRadius: 10,
    backgroundColor: 'white',
    padding: 10,
    elevation: 5,
	width: '100%',
	height: 250,
	marginTop: 10,
  },
  card1: {
	  flexDirection: 'row',
	  justifyContent: 'space-between',
	  alignItems: 'center',
		padding: 10
  },
  card2: {
	  padding: 10
  },
  topHalf: {
	height: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: {
	  width: 120,
	  textAlign: 'center',
    borderWidth: 1, // Thickness of the border
    borderColor: 'black', // Color of the border
    padding: 5, // Optional: Add padding for space inside the border
    borderRadius: 4, // Optional: Rounds the corners of the border
    color: 'black', // Text color (optional, for better contrast)
  },
  bottomHalf: {
	  height: 100,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    padding: 5,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 5,
  },
  carouselImage: {
    width: 300,
    height: 300,
    marginTop: 50,
  },
separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  additionalTextContainer: {
    marginBottom: 10,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  additionalText: {
    flex: 1,
    marginHorizontal: 5,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'grey',
    borderRadius: 5,
    padding: 5,
    color: 'white',
  },
  innerMargin: {
        height: 10
    },
	list: {
    paddingVertical: 24,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
	marginBottom: 10
  },
  
  header: {
	  flexDirection: 'row',
	  justifyContent: 'space-between',
	  fontWeight: 'bold',
	  paddingLeft: 120,
	  paddingRight: 10
  },
  buttonTextContainer: {
    flexDirection: "row", // Place button and text in a row
    alignItems: "center", // Align items vertically in the center
    marginLeft: -15, // Move it closer to the left (you can adjust this value)
  },
  buttonText: {
    fontSize: 16,
    marginLeft: -10, // Reduce the space between button and text
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  endButton: {marginHorizontal: 100, marginTop: 10, borderRadius: 8},
    divider: {
    marginVertical: 8,
    backgroundColor: '#E4E9F2',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
	marginTop: 5
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#222B45',
  },
  cardFinal: {
    borderRadius: 8,
    backgroundColor: '#F7F9FC',
    elevation: 2,
	marginLeft: 4, marginRight: 8, marginVertical: 5, marginBottom: 10
  },
  detailRow: {
    flexDirection: 'row',
	justifyContent: 'space-between',
    marginBottom: 8,
  },
  generalField: {
	  flexDirection: 'row',
	  alignItems: 'center',
	  justifyContent: 'space-between'
  },
  imageBag: {
    width: 250,
    height: 250,
    marginBottom: 24,
	marginTop: -100
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
	marginTop: - 30
  },
  subtitle: {
    textAlign: 'center',
	width: 300
  },
  button: {
    width: '50%',
    borderRadius: 25,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {alignItems: 'center'},
  dropdownContainer: {
	flex: 1,
	padding: 10,
	marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Adjust border color as needed
    borderRadius: 5,
  },
  formInput: {
    marginTop: 16,
  },
  nextButton: {
	marginTop: 15,
	width: 150,
	marginHorizontal: 100
  },
  buttonContainerFinal: {flexDirection: 'row', gap: 30, alignItems: 'center', marginLeft: 30, marginTop: 20},
  navButton: {
	  marginLeft: 20
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 20,
    color: '#94a3b8',
    fontWeight: '500',
  },
  buttonContainerOuter: {
	marginTop: 15
  },
  infoButton: {width: 300},
  infoText: {width: 270, textAlign: 'center', lineHeight: 20, marginTop: 5}
});

export default OrderBagScreen;
