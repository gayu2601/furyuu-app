import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Button, Card, Text, StyleService, useStyleSheet, Divider, Modal } from '@ui-kitten/components';
import { storage } from '../extra/storage';
import { useRevenueCat } from './RevenueCatContext';
import { useUser } from './UserContext';
import SubscriptionSuccessModal from './SubscriptionSuccessModal';
import Purchases from 'react-native-purchases';
import { logFirebaseEvent } from '../extra/firebaseUtils';
import { useNavigation } from '@react-navigation/native';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { supabase } from '../../constants/supabase';

const PaywallScreen = ({ setPaywallVisible, stay }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [url, setUrl] = useState(null);
  const styles = useStyleSheet(themedStyles);
  const navigation = useNavigation();
  const { updateCurrentUser, currentUser } = useUser();
  
  const { 
    offerings, 
    purchasePackage, 
    subscriptionActive, 
    getUserDetails,
    showIntroOffer,
	handleFreeTrialButtonClick,
	cancelSub, user
  } = useRevenueCat();
  
  const [plans, setPlans] = useState([
    {
      id: 'monthly',
      title: 'Monthly',
      price: '₹ 199/mo',
      saveText: '',
      package: null
    },
	{
      id: 'quarterly',
      title: 'Quarterly',
      price: '₹ 549/3 mo',
      pricePM: '₹ 183/mo',
      saveText: 'SAVE 8%',
      package: null
    },
    {
      id: 'half-yearly',
      title: 'Half-yearly',
      price: '₹ 999/6 mo',
      pricePM: '₹ 167/mo',
      saveText: 'SAVE 16%',
      package: null
    },
    {
      id: 'annual',
      title: 'Annual',
      price: '₹ 1,899/yr',
      pricePM: '₹ 158/mo',
      saveText: 'SAVE 20%',
      package: null
    },
  ]);
  
  const features = [
	{
	  title: 'Ad-free experience',
	  description: 'Download order details in Excel and create orders without watching ads — enjoy faster workflows and a smoother experience',
	  icon: '⏭️',
	},
    {
      title: 'Order Entries',
      description: 'Skip watching ads when Automate report generation by downloading order details in Excel format without watching ads',
      icon: '📝',
    },
    {
      title: 'Track Business Growth',
      description: 'Get insights into your shop\'s performance by analyzing top customers, best-selling stitched items and demand patterns',
      icon: '📊',
    },
	{
	  title: 'Multi-Device Support',
	  description: 'Access your shop data seamlessly from multiple devices on the go — stay in control anytime, anywhere',
	  icon: '📱',
	},
    {
      title: 'Enable Online Payments',
      description: 'Link your bank account to get instant payments from customers via Card/Net-banking',
      icon: '💸',
    },
    {
      title: 'Upload More Shop Images',
      description: 'Showcase your expertise by uploading more images of your past work',
      icon: '📸',
    },
    {
      title: 'Access Contract Tailors',
      description: 'Get contact info of independent/contract tailors for peak seasons',
      icon: '🤝',
    },
	{
      title: 'Create Ads',
      description: 'Boost your business growth by creating and displaying in-app ads to customers',
      icon: '📢',
    },
	{
		title: 'Ready-Made Portfolio Website',
		description: 'A personalized digital portfolio that showcases your tailoring work - ready to share instantly',
		icon: '🗂️'
	}
  ];

  useEffect(() => {
    // When offerings are loaded from the context, update the plans
    if (offerings && offerings.length > 0) {
      updatePlansWithPackages();
    }
  }, [offerings]);
  
  const createSlugFromText = (text) => {
	  if (!text) return '';
	  
	  return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
	};
  
  const generateSlug = async (shopId, pincode) => {
	  try {
		// Get shop details with location data by joining tables
		const { data: shopData, error: shopError } = await supabase
		  .from('PincodeMapping')
		  .select(`*`)
		  .eq('pincode', pincode)
		  .maybeSingle();

		if (shopError) {
		  throw new Error(`Error fetching shop: ${shopError.message}`);
		}
		
		// Extract location with fallback priority: city → area → district → 'unknown'
		const location = shopData?.area || 
						shopData?.district || 
						'unknown';
		// Create base slug
		const shopSlug = createSlugFromText(currentUser.ShopDetails.shopName);
		const locationSlug = createSlugFromText(location);
		const baseSlug = `${shopSlug}-${locationSlug}`;

		// Find unique slug by checking for duplicates
		let finalSlug = baseSlug;
		let counter = 1;

		while (true) {
		  // Check if slug already exists (excluding current shop)
		  const { data: existingSlugs, error: checkError } = await supabase
			.from('ShopDetails')
			.select('id')
			.eq('slug', finalSlug)
			.neq('id', shopId);

		  if (checkError) {
			throw new Error(`Error checking slug uniqueness: ${checkError.message}`);
		  }

		  // If no duplicates found, we have our unique slug
		  if (!existingSlugs || existingSlugs.length === 0) {
			break;
		  }

		  // Increment counter and try again
		  counter++;
		  finalSlug = `${baseSlug}-${counter}`;
		}

		// Update the shop with the generated slug
		const { error: updateError } = await supabase
		  .from('ShopDetails')
		  .update({ slug: finalSlug })
		  .eq('id', shopId);

		if (updateError) {
		  throw new Error(`Error updating shop slug: ${updateError.message}`);
		}

		return finalSlug;

	  } catch (error) {
		console.error('Error generating location-based slug:', error);
		throw error;
	  }
	};


  const handleFreeTrial = async() => {
	  let val = await handleFreeTrialButtonClick();
	  await getUserDetails();
	  if(val && currentUser?.shopId) {
		let slug = currentUser.ShopDetails.slug;
		if(!slug) {
			slug = await generateSlug(currentUser.shopId, currentUser.ShopDetails.pincode);
			console.log(slug)
			const updatedUser = {
				 ...currentUser,
				 ShopDetails: {
				   ...currentUser.ShopDetails,
				   slug: slug
				 }
			};
			updateCurrentUser(updatedUser);
		}
		let finalVal = "https://thaiyalapp.in/" + slug
		setUrl(finalVal);
		setSuccessModalVisible(true);
	  } else if(stay) {
		setPaywallVisible(false);
	  } else {
		navigation.goBack();
	  }
  }
  
  const handleSuccessModalClose = () => {
	  setSuccessModalVisible(false);
	  setPaywallVisible(false);
	};
  
  const updatePlansWithPackages = () => {
    if (!offerings || offerings.length === 0) return;
    
    const updatedPlans = [...plans];
    
    offerings.forEach(pkg => {
      const matchingPlan = matchPackageToPlan(pkg);
      if (matchingPlan) {
        const planIndex = updatedPlans.findIndex(p => p.id === matchingPlan.id);
        if (planIndex !== -1) {
          updatedPlans[planIndex] = {
            ...updatedPlans[planIndex],
            package: pkg,
            price: pkg.product.priceString
          };
        }
      }
    });
    console.log('in updatePlansWithPackages:');
    console.log(updatedPlans);
    setPlans(updatedPlans);
  };

  const matchPackageToPlan = (pkg) => {
    // Logic to match RevenueCat package to your plan structure
    // This is an example - adjust based on your actual package identifiers
    const identifier = pkg.identifier.toLowerCase();
    
    if (identifier.includes('monthly')) {
      return plans.find(p => p.id === 'monthly');
    } else if (identifier.includes('three')) {
      return plans.find(p => p.id === 'quarterly');
    } else if (identifier.includes('six')) {
      return plans.find(p => p.id === 'half-yearly');
    } else if (identifier.includes('annual')) {
      return plans.find(p => p.id === 'annual');
    }
    
    return null;
  };

  const formatPricingStructure = (plan) => {
    if (!plan || !plan.package) return '';
    
    const { product } = plan.package;
    
    // Create a clear pricing sequence: Free month → Regular price
    return (
		<View style={styles.planInfo}>
                <View style={styles.planHeader}>
                  <Text category='s1' style={styles.planTitle}>{plan.title}</Text>
                  {plan.saveText && (
                    <View style={styles.saveTag}>
                      <Text style={styles.saveText}>{plan.saveText}</Text>
                    </View>
                  )}
                  <View style={styles.pricingContainer}>
					{/* Original price with strikethrough */}
					<Text style={styles.originalPrice}>
					  <Text style={styles.strikethrough}>{product.priceString}</Text>
					</Text>
				  </View>
                </View>
                <Text category='p2' style={styles.freeTag}>
					<Text style={styles.highlightText}>1st month FREE</Text>
				</Text>
				<Text category='c1' style={styles.monthlyRate}>
					{plan.originalPrice || ''}
				</Text>
        </View>
    );
  };

  const handlePurchase = async () => {
	if(selectedPlan === '') {
		if(setPaywallVisible) {
			setPaywallVisible(false)
		} else {
			navigation.goBack();
		}
		showErrorMessage('Please select a subscription plan!');
		return;
	}
    try {
      const selectedPackage = plans.find(plan => plan.id === selectedPlan)?.package;
      
      if (selectedPackage) {
		logFirebaseEvent('subscribe_purchase', {tier: selectedPackage.id});
        let val = await purchasePackage(selectedPackage);
        // The context should handle subscription updates
        await getUserDetails();
		if(val) {
			setUrl(currentUser.ShopDetails.slug);
			setSuccessModalVisible(true);
		} else if(stay) {
			setPaywallVisible(false);
		} else {
			navigation.goBack();
		}
      }
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };
  
  const handlePress = async () => {
	const url = 'https://sites.google.com/view/thaiyal/home';
    // Check if the URL can be opened
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      // Open the URL
      await Linking.openURL(url);
    } else {
      console.error(`Cannot open URL: ${url}`);
      // You might want to show an alert to the user here
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Image
            source={require('../../../assets/paywall_logo.png')}
            style={styles.logo}
          />
          <Text style={styles.headerText} category='s1'>
            Unlock <Text category='s1' style={styles.boldText}>all our exclusive features</Text> by subscribing to <Text category='s1' style={styles.boldText}>Thaiyal Business Premium</Text>
          </Text>
          <View style={styles.trialButton}>
            <Text category='s2' style={styles.trialText}>Start with 1 month FREE trial</Text>
          </View>
        </View>
        <Card style={styles.plansContainer}>
          {plans.map((plan) => {
			  // Extract numeric value from price string and calculate base price
			  const numericPrice = parseFloat(plan.price.replace(/[^\d.]/g, ''));
			  const basePrice = (numericPrice / 1.18).toFixed(2);
			  const currencySymbol = plan.price.match(/[^\d.]/)?.[0] || '₹'; // Extract currency symbol
			  
			  return (
				<TouchableOpacity
				  key={plan.id}
				  style={[
					styles.planItem,
					selectedPlan === plan.id && styles.selectedPlan,
				  ]}
				  onPress={() => setSelectedPlan(plan.id)}
				>
				  <View style={styles.radioButton}>
					<View
					  style={[
						styles.radioInner,
						selectedPlan === plan.id && styles.radioInnerSelected,
					  ]}
					/>
				  </View>
				  <View style={styles.planInfo}>
					<View style={styles.planHeader}>
					  <Text category='s1' style={styles.planTitle}>{plan.title}</Text>
					  {plan.saveText && (
						<View style={styles.saveTag}>
						  <Text style={styles.saveText}>{plan.saveText}</Text>
						</View>
					  )}
					  <View style={styles.priceContainer}>
						<Text category='s1'>{currencySymbol}{basePrice}</Text>
						<Text category='p2' style={styles.priceStyle}  appearance='hint'> + GST</Text>
					  </View>
					</View>
					<Text category='p2' style={styles.pricePm} appearance='hint'>{plan.pricePM}</Text>
				  </View>
				</TouchableOpacity>
			  );
			})}
        </Card>
        <Text category='s1' style={styles.featuresTitle}>WHAT'S INCLUDED</Text>
        <Card style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text category='s1' style={styles.featureTitle}>{feature.title}</Text>
                <Text category='s2' appearance='hint' style={styles.featureDescription}>{feature.description}</Text>
                <Divider style={styles.divider}/>
              </View>
            </View>
          ))}
        </Card>
        <Layout style={styles.footer}>
          <Button 
            style={styles.continueButton} 
            onPress={showIntroOffer ? handleFreeTrial : handlePurchase}
          >
            {showIntroOffer ? 'Start Free Trial' : 'Start subscription'}
          </Button> 
          <Text category='p2' style={styles.subscriptionNotice}>
            Enjoy a 1-month free trial. Cancel anytime. After the trial, choose a plan to continue enjoying premium features.
          </Text>
          <Layout style={styles.footerButtons}>
            <Button appearance='ghost' size='small' onPress={cancelSub}>Cancel anytime</Button>
            <Button appearance='ghost' size='small' onPress={handlePress}>Terms & Privacy</Button>
          </Layout>
        </Layout>
      </ScrollView>
	  <SubscriptionSuccessModal
        visible={successModalVisible}
        onClose={handleSuccessModalClose}
        userUrl={url}
      />
    </SafeAreaView>
  );
};

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: -10
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
    marginTop: -10
  },
  headerText: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
  trialButton: {
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5
  },
  trialText: {
    fontWeight: 'bold',
    color: '#333',
  },
  plansContainer: {
    margin: 15,
    marginTop: 0,
    borderRadius: 8
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -10,
    marginRight: -10,
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPlan: {
    borderColor: 'color-primary-500',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'color-primary-500',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioInnerSelected: {
    backgroundColor: 'color-primary-500',
  },
  planInfo: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  planTitle: {
    marginRight: 10,
	marginTop: 2
  },
  saveTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: -30,
	height: 30
  },
  saveText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  originalPrice: {
    color: '#666',
    fontSize: 12,
  },
  pricingStep: {
    marginTop: 3,
    fontSize: 12,
  },
  highlightText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  introOfferText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  featuresSection: {
    margin: 15,
    marginTop: -20,
    borderRadius: 8
  },
  featuresTitle: {
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 15,
    padding: 20,
    marginTop: -10
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 5,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
    marginLeft: -5
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    marginBottom: 5,
  },
  featureDescription: {
    lineHeight: 20,
  },
  continueButton: {
    marginHorizontal: 80
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  subscriptionNotice: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 10,
    marginHorizontal: 20,
  },
  divider: {
    marginTop: 10,
    marginBottom: -10, 
    backgroundColor: '#ccc'
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    width: '85%',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 15,
  },
  freeTrialText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 20,
  },
  regularPrice: {
    textAlign: 'center',
    marginTop: 5,
  },
  offerDetails: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
  },
  benefitsText: {
    marginBottom: 15,
    lineHeight: 20,
  },
  modalButtons: {
    marginTop: 10,
  },
  subscribeButton: {
    marginBottom: 10,
  },
	pricingContainer: {
		marginTop: 4,
	},
	freeTag: {
	  color: '#4CAF50',
	  fontWeight: 'bold',
	  marginTop: 2,
	},
	originalPrice: {
	  color: '#757575',
	},
	strikethrough: {
	  textDecorationLine: 'line-through',
	},
	monthlyRate: {
	  color: '#757575',
	  marginTop: 2,
	},
	tagContainer: {
		marginTop: -20
	},
	pricePm: {marginTop: -20},
	priceStyle: {marginTop: 5}
});

export default PaywallScreen;