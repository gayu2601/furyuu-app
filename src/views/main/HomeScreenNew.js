import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Alert, View, Image, StyleSheet, FlatList, ScrollView, StatusBar, SafeAreaView, TouchableOpacity, Dimensions, LayoutAnimation, ImageBackground } from 'react-native';
import { ApplicationProvider, Layout, Input, Avatar, Text, Icon, Button, Autocomplete, AutocompleteItem, OverflowMenu, MenuItem, useTheme, Divider, List, ListItem, Modal, Card, Select, SelectItem, IndexPath, CheckBox } from '@ui-kitten/components';
import MasonryList from 'react-native-masonry-list';
import { AntDesign } from '@expo/vector-icons';
import { useUser } from '../main/UserContext';
import * as Notifications from "expo-notifications";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useNotification } from '../main/NotificationContext';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import NotificationsButton from "../extra/NotificationsButton";
import OrderBagButton from "../extra/OrderBagButton";
import { useProfileCompletionModal } from './useProfileCompletionModal';
import ProfileCompletionModal from "./ProfileCompletionModal";
import DashboardCard from "./DashboardCard";
import Feather from "react-native-vector-icons/Feather";
import { storage } from '../extra/storage';
import { logFirebaseEvent } from '../extra/firebaseUtils';
import * as Network from 'expo-network';
import { Linking } from 'react-native';
import { resetIdCounter } from '../main/generateUniqueId';
import { NotificationWorker } from './NotificationWorker';
import keys from "../../constants/Keys";
import Tooltip from 'react-native-walkthrough-tooltip';
import { useWalkthrough } from './WalkthroughContext';
import { checkAndDeleteSession } from "../extra/sessionUtils";
import { locationWorkerInstance } from '../extra/LocationWorker';
import { createClient } from '@supabase/supabase-js'

const menDress = [
  { title: 'Shirt', value: 'shirt', source: require('../../../assets/men/shirt.jpg'), width: 1080, height: 1920 },
  { title: 'Suit', value: 'suit', source: require('../../../assets/men/suit.jpg'), width: 1080, height: 1920 },
  { title: 'Pants', value: 'pants', source: require('../../../assets/men/pants.jpg'), width: 1080, height: 1920 },
  { title: 'Pyjama-Kurta', value: 'pyjama', source: require('../../../assets/men/pyjama.jpg'), width: 1080, height: 1920 },
  { title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg'), width: 1080, height: 1920 },
];

const womenDress = [
  { title: 'Party Dresses', value: 'partywear', source: require('../../../assets/women/partywear.jpg'), width: 1080, height: 1920 },
  { title: 'Tops', value: 'tops', source: require('../../../assets/women/shirt.jpg'), width: 1080, height: 1920 },
  { title: 'Chudithar', value: 'chudithar', source: require('../../../assets/women/chudithar.jpg'), width: 1080, height: 1920 },
  { title: 'Lehenga/Gagra', value: 'lehenga', source: require('../../../assets/women/lehenga.jpg'), width: 1080, height: 1920 },
  { title: 'Blouse', value: 'blouse', source: require('../../../assets/women/blouse.jpg'), width: 1080, height: 1920 },
  { title: 'Pants', value: 'pants', source: require('../../../assets/women/pants.jpg'), width: 1080, height: 1920 },
  { title: 'Half Saree', value: 'halfsaree', source: require('../../../assets/women/halfsaree.jpg'), width: 1080, height: 1920 },
  { title: 'Nightie', value: 'nightie', source: require('../../../assets/women/nightie.jpg'), width: 1080, height: 1920 },
  { title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg'), width: 1080, height: 1920 },
];

const kidsDress = [
  { title: 'Tops', value: 'shirt', source: require('../../../assets/kids/tops.jpg'), width: 1080, height: 1920 },
  { title: 'Lehenga/Gagra', value: 'lehenga', source: require('../../../assets/kids/gagra.jpg'), width: 1080, height: 1920 },
  { title: 'Pants', value: 'pants', source: require('../../../assets/kids/pants.jpg'), width: 1080, height: 1920 },
  { title: 'Frock', value: 'frock', source: require('../../../assets/kids/frock.jpg'), width: 1080, height: 1920 },
  { title: 'Uniform', value: 'uniform', source: require('../../../assets/kids/uniform.jpg'), width: 1080, height: 1920 },
  { title: 'Ethnic Wear', value: 'paavadai', source: require('../../../assets/kids/paavadai.jpg'), width: 1080, height: 1920 },
  { title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg'), width: 1080, height: 1920 },
];

// Extracted HeaderSection component to prevent rerenders
const HeaderSection = React.memo(({ currentUser, navigation, theme, address }) => {
    const { isStepActive, next, end, back } = useWalkthrough();
	let locDenied = locationWorkerInstance.isLocationDenied();
  return (
    <View style={styles.topHeader}>
      {/* Logo and Location */}
      <View style={styles.headerContent}>
        <Image source={require('../../../assets/logo.jpeg')} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />
        <View style={{marginTop: 10}}>
          <Text category="s1" >Hi, {currentUser.name}!</Text>
		  {!locDenied && <Text category="c1" style={{width: 190}}>{address ? address : 'Loading location...'}</Text>}
        </View>
      </View>

      {/* Notification and Bag Icons */}
      <View style={styles.headerContent}>
        <View style={{marginRight: -35, marginBottom: 5 }}>
			<Tooltip
			  isVisible={isStepActive('HomeNew', 'notifications')}
			  content={
				<View style={styles.tooltipContent}>
				  <Text style={styles.tooltipText}>
					This shows notifications received when customers place new orders to your tailor shop via Thaiyal Connect app
				  </Text>
				  <View style={styles.tooltipButtons}>
					<TouchableOpacity onPress={end}>
					  <Text style={styles.skipText}>Skip Tour</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={back}>
					  <Text style={styles.skipText}>Back</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.nextButton} onPress={end}>
					  <Text style={styles.nextText}>End</Text>
					</TouchableOpacity>
				  </View>
				</View>
			  }
			  placement="bottom"
			  backgroundColor="rgba(0,0,0,0.5)"	
			  topAdjustment={-30}
			  horizontalAdjustment={10}
			childrenWrapperStyle={{
				width: 35,paddingLeft: 30, backgroundColor: 'white'
			  }}
			  onClose={end}
			>
				<NotificationsButton />
			</Tooltip>
        </View>
		<Tooltip
			  isVisible={isStepActive('HomeNew', 'orderBag')}
			  content={
				<View style={styles.tooltipContent}>
				  <Text style={styles.tooltipText}>
					This shows a summary of dress items added, payment info and worker assignments for an order yet to be created
				  </Text>
				  <View style={styles.tooltipButtons}>
					<TouchableOpacity onPress={end}>
					  <Text style={styles.skipText}>Skip Tour</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={back}>
					  <Text style={styles.skipText}>Back</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.nextButton} onPress={next}>
					  <Text style={styles.nextText}>Next (5/6)</Text>
					</TouchableOpacity>
				  </View>
				</View>
			  }
			  placement="bottom"
			  backgroundColor="rgba(0,0,0,0.5)"
			  topAdjustment={-30} 
			  horizontalAdjustment={15}
			childrenWrapperStyle={{
				width: 35,paddingRight: 15, backgroundColor: 'white'
			  }}
			  onClose={end}
		>
			<OrderBagButton />
		</Tooltip>
        <Button
          appearance="ghost"
          accessoryLeft={(props) => <Icon {...props} name="person-outline" style={{width: 25, height: 25}} fill={theme['color-primary-500']}/>}
          onPress={() => navigation.navigate('ProfileSettings')}
          size='small'
          style={{marginRight: 10 }}
        />
      </View>
    </View>
  );
});

// Extracted CategoryButtons component to prevent rerenders
const CategoryButtons = React.memo(({ selIndex, setSelIndex }) => {
  return (
    <View style={styles.buttonContainer}>
      <Button
        size="tiny"
        style={[
          styles.filterButtonTop,
          selIndex === 0 && styles.highlightedButton,
        ]}
        status="basic"
        onPress={() => setSelIndex(0)}
      >
        Women
      </Button>
      
      <Button
        size='tiny'
        status='basic'
        style={[
          styles.filterButtonTopYear,
          selIndex === 1 && styles.highlightedButton
        ]}
        onPress={() => setSelIndex(1)}
      >
        Men
      </Button>
      
      <Button
        size='tiny'
        status='basic'
        style={[
          styles.filterButtonTopYear,
          selIndex === 2 && styles.highlightedButton,
        ]}
        onPress={() => setSelIndex(2)}
      >
        Kids
      </Button>
    </View>
  );
});

// Optimized MasonryHeader component to prevent rerenders
const MasonryHeader = React.memo(({ data, onPress }) => (
  <TouchableOpacity style={styles.masonryHeader} onPress={() => onPress(data)}>
    <Text style={styles.masonryText}>{data.title}</Text>
  </TouchableOpacity>
));

const HomeScreenNew = ({ navigation }) => {
  const theme = useTheme();
  const route = useRoute();
  const routeParams = route?.params ?? {};
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selIndex, setSelIndex] = useState(0);
  const { updateCurrentUser, currentUser, profileCompleted } = useUser();
    const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
    const [spIndex, setSpIndex] = useState([]);
  const [sp, setSp] = useState(null);
  const [spArr, setSpArr] = useState([]);
  const spServices = ['None', 'Wedding', 'Bridal', 'Suits', 'Casual-wear', 'Kids', 'Ethnic', 'Western', 'Alterations'];
  const [consentChecked, setConsentChecked] = useState(false);
  
  const { notificationCount, updateNotificationCount, markNotificationAsRead } = useNotification();
  const workerInitialized = useRef(false);
  const { isStepActive, start, next, end, back } = useWalkthrough();
	const [address, setAddress] = useState(null);
	
	const { setShouldShowModal, shouldShowModal, hideModal, isLoading } = useProfileCompletionModal();

  const startWalkthrough = () => {
    start(navigation);
  };
 
  useFocusEffect(
	  useCallback(() => {
		// Auto-start walkthrough for first-time users
		let w = storage.getString(currentUser.username + '_walkthrough_done')
		if(!w) {
		  console.log('in autostart walkthrough')
		  setTimeout(() => {
			startWalkthrough();
		  }, 5000); // 5 second delay
		  storage.set(currentUser.username + '_walkthrough_done', 'true');
		}
	  }, [navigation])
	);
  
  useEffect(() => {
    const initLocation = async () => {
		console.log('in initLocation')
      try {
		  let addressStr = locationWorkerInstance.getLocationAddress();
		  if(!addressStr) {
			const result = await locationWorkerInstance.initialize();
			console.log('in useEffect address:')
			console.log(result)
			setAddress(result.address);
		  } else {
			  setAddress(addressStr);
		  }
      } catch (error) {
        console.log(error);
      }
    };
    initLocation();
  }, []);

  // Create a memoized callback for navigation
  const navigateToTest = useCallback((item) => {
    navigation.navigate('HomeMain', {
      screen: 'Test', 
      params: {
        itemName: item.value, 
        headerImgUri: item.source
      }
    });
  }, [navigation]);

  // Handle remote logout without recreating on every render
  const handleRemoteLogout = useCallback(async () => {
    try {
      await checkAndDeleteSession();

      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthScreen' }],
      });
      
      // Show alert
      Alert.alert(
        "Logged Out",
        "You have been logged out because your account was signed in on another device.",
        [{ text: "OK", onPress: () => navigation.reset({
          index: 0,
          routes: [{ name: 'AuthScreen' }],
        })}]
      );
    } catch (error) {
      console.error('Error handling remote logout:', error);
    }
  }, [navigation]);

  // Create worker dependencies just once
  const workerDependencies = useMemo(() => ({
    currentUser,
    updateNotificationCount,
    markNotificationAsRead,
    notificationCount,
    handleRemoteLogout
  }), [currentUser, updateNotificationCount, markNotificationAsRead, notificationCount, handleRemoteLogout]);

  // Memoize filtered dress items to avoid recalculation on render
  const filteredDressItems = useMemo(() => {
    switch(selIndex) {
      case 0: return womenDress;
      case 1: return menDress;
      case 2: return kidsDress;
      default: return [];
    }
  }, [selIndex]);

  // Initialize notification worker only once
  useEffect(() => {
    if (workerInitialized.current) return;
    
    console.log('calling worker dependencies');
    const worker = new NotificationWorker(
      workerDependencies.currentUser,
      workerDependencies.updateNotificationCount,
      workerDependencies.markNotificationAsRead,
      workerDependencies.notificationCount,
      handleRemoteLogout
    );

    worker.start();
    workerInitialized.current = true;
    
    return () => {
      worker.stop();
    };
  }, [workerDependencies]);
  
  // Perform network check only once
  useEffect(() => {
	const checkNetworkState = async() => {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        showErrorMessage("No Internet Connection");
      }
    };
	
	const checkValues = async() => {
		if(!currentUser.ShopDetails.topServices) {
			setShowMultiSelectModal(true);
		}
		if(currentUser.ShopDetails.websiteConsent == null) {
			setShowConsentModal(true);
		}
	}

    checkNetworkState();
	checkValues();
	if(routeParams?.isNewUser || routeParams?.firstOrder) {
		setShouldShowModal(true);
	}
  }, []);
  
  const handleMultiSelectConfirm = (index) => {
    setSpIndex(index);
	const selectedServices = index.map(i => spServices[i.row]);
	const commaSeparatedSp = selectedServices.join(', ');
	setSp(commaSeparatedSp);
	setSpArr(selectedServices)
  };
  
  const handleContinue = async(key, value) => {
	if (key === 'topServices') {
		setShowMultiSelectModal(false);
	} else if (key === 'websiteConsent') {
		setShowConsentModal(false);
	}

	const fieldObj = { [key]: value };

	const { error: error1 } = await supabase
			.from('ShopDetails')
			.update(fieldObj)
			.eq('id', currentUser.ShopDetails.id)
			.select().maybeSingle();
		if(error1) {
			console.log('tailor specialization and consent updation error:');
			console.log(error1);
			return false; 
		}
		const updatedUser = {
			...currentUser,
			ShopDetails: {
				...currentUser.ShopDetails,
				...fieldObj
			}
		};
		console.log(updatedUser);
		updateCurrentUser(updatedUser);
  };
  
  // Memoize the rendering of MasonryHeader to avoid recreating on each item
  const renderMasonryHeader = useCallback((data) => (
    <MasonryHeader data={data} onPress={navigateToTest} />
  ), [navigateToTest]);
  
  const renderMultiSelectModal = () => (
    <Modal
      visible={showMultiSelectModal}
      backdropStyle={styles.backdrop}
      onBackdropPress={() => {}} // Prevent closing by backdrop
    >
      <Card disabled={true} style={styles.card}>
        <Text category="h6" style={styles.modalCard1}>
          Select your tailoring services specialization
        </Text>
        
        <Select
		  style={styles.select}
          value={sp}
          selectedIndex={spIndex}
          onSelect={handleMultiSelectConfirm}
          multiSelect={true}
        >
          {spServices.map((category, index) => (
            <SelectItem key={index} title={category} />
          ))}
        </Select>
        
        <View style={styles.modalButton}>
          <Button
			size='small'
            style={styles.buttonModal}
            onPress={() => handleContinue('topServices', spArr)}
            disabled={spIndex.length === 0}
          >
            Continue
          </Button>
        </View>
      </Card>
    </Modal>
  );

  const renderConsentModal = () => (
    <Modal
      visible={showConsentModal}
      backdropStyle={styles.backdrop}
      onBackdropPress={() => {}} // Prevent closing by backdrop
    >
      <Card disabled={true} style={styles.modalCard}>
        <Text category="h6" style={styles.modalTitle}>
          Profile Visibility Consent
        </Text>
        <CheckBox
          checked={consentChecked}
          onChange={setConsentChecked}
		  style={styles.checkBox}
        >
		  {evaProps => <Text {...evaProps} style={{fontSize: 14, textAlign: 'justify', marginLeft: 10}}>I consent to display my tailor profile and shop details on thaiyalapp.in website and Thaiyal Connect app</Text>}
        </CheckBox>
        
        <View style={styles.modalButton}>
          <Button
			size='small'
            style={styles.buttonModal}
            onPress={() => handleContinue('websiteConsent', consentChecked)}
          >
            Continue
          </Button>
        </View>
      </Card>
    </Modal>
  );
  
  const handleUpdate = async (formData) => {
    // Implement your API call here
    console.log('Updating profile with:')
	console.log(formData);

	let shopPicsArr = [];
	if(formData.shopPics) {
            let a = await Promise.all(
              formData.shopPics.map(async(pic) => {
                const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer())
                  const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg'
                  const path = `${Date.now()}.${fileExt}`
                  shopPicsArr.push(path);
                const { data, error: uploadError } = await supabase.storage
                  .from('shop-images/shopPics')
                  .upload(path, arraybuffer, {
                    contentType: 'image/jpeg',
                  })

                  if (uploadError) {
                      console.log(pic);
                      console.log(uploadError);
                      throw uploadError;
                  }
              })
            );
		formData.shopPics = shopPicsArr.length > 0 ? shopPicsArr : null;
	}
	
	const profileFields = ['upiQRCode_url', 'yearsOfExp'];

	const updates = Object.entries(formData).reduce(
	  (acc, [key, value]) => {
		if (profileFields.includes(key)) {
		  acc.profile[key] = value;
		  acc.user[key] = value;
		} else {
		  acc.shop[key] = value;
		  acc.user.ShopDetails[key] = value;
		}
		return acc;
	  },
	  { 
		profile: {}, 
		shop: {}, 
		user: { ...currentUser, ShopDetails: { ...currentUser.ShopDetails } }
	  }
	);
	console.log(updates)
	
	// Update DB and user object
	await Promise.all([
	  Object.keys(updates.profile).length && supabase.from('profiles').update(updates.profile).eq('id', currentUser.id),
	  Object.keys(updates.shop).length && supabase.from('ShopDetails').update(updates.shop).eq('id', currentUser.shopId)
	]);

	updateCurrentUser(updates.user);
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView 
        style={styles.container}
        removeClippedSubviews={true} // Optimize performance by removing views outside of viewport
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={require('../../../assets/tailor_front.jpg')}
          style={styles.headerBackground}
          resizeMode="cover"
          imageStyle={{
            borderBottomLeftRadius: 30, 
            borderBottomRightRadius: 30,
          }} 
        >
          {/* Header Section - Now memoized */}
          <HeaderSection 
            currentUser={currentUser} 
            navigation={navigation} 
            theme={theme}
			address={address}
          />

			
			<View style={styles.dashboardCardWrapper}>
			<Tooltip
			  isVisible={isStepActive('HomeNew', 'welcome')}
			  content={
				<View style={styles.tooltipContent}>
				  <Text style={styles.tooltipTitle}>Welcome to Thaiyal Business! 🎉</Text>
				  <Text style={styles.tooltipText}>
					This is your home dashboard showing status of orders created in the last 30 days
				  </Text>
				  <View style={styles.tooltipButtons}>
					<TouchableOpacity onPress={end}>
					  <Text style={styles.skipText}>Skip Tour</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.nextButton} onPress={next}>
					  <Text style={styles.nextText}>Next (1/6)</Text>
					</TouchableOpacity>
				  </View>
				</View>
			  }
			  placement="bottom"
			  backgroundColor="rgba(0,0,0,0.5)"
			  onClose={end}
			>
				<DashboardCard />
			</Tooltip>
			  </View>
        </ImageBackground>
		
		<Text category='h6' style={styles.sectionTitleOrder}>Start New Order</Text>
		
		<View style={styles.contentView}>
        {/* Category Buttons - Now memoized */}
        <CategoryButtons selIndex={selIndex} setSelIndex={setSelIndex} />
      <Tooltip
			  isVisible={isStepActive('HomeNew', 'createOrder')}
			  content={
				<View style={styles.tooltipContent}>
				  <Text style={styles.tooltipText}>
					Start creating a new order by clicking any dress type below
				  </Text>
				  <View style={styles.tooltipButtons}>
					<TouchableOpacity onPress={end}>
					  <Text style={styles.skipText}>Skip Tour</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={back}>
					  <Text style={styles.skipText}>Back</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.nextButton} onPress={next}>
					  <Text style={styles.nextText}>Next (2/6)</Text>
					</TouchableOpacity>
				  </View>
				</View>
			  }
			  placement="top"
			  backgroundColor="rgba(0,0,0,0.5)"
			  topAdjustment={-10}
			  showChildInTooltip={false}
			  onClose={end}
		>
			  <MasonryList
				key={selIndex}
				images={filteredDressItems}
				columns={2}
				spacing={5}
				renderIndividualHeader={renderMasonryHeader}
				onPressImage={navigateToTest}
				imageContainerStyle={styles.masonryImageContainer}
				listContainerStyle={styles.masonryContainer}
			  />
		</Tooltip>
		{renderMultiSelectModal()}
		{renderConsentModal()}
		<ProfileCompletionModal
			visible={shouldShowModal && !profileCompleted}
			onClose={hideModal}
			currentUser={currentUser}
			onUpdate={handleUpdate}
			firstOrder={routeParams?.firstOrder}
		  />
		</View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  container1: {
    marginTop: -140,
    zIndex: 1,
    top: 160,
  },
  sectionTitleOrder: {
    marginLeft: 20,
    marginTop: -90
  },
  masonryContainer: { overflow: 'hidden', paddingHorizontal:  8 },
  masonryImageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    width: screenWidth/2.5,
    height: 100,
  },
  masonryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  masonryHeader: {
    position: "absolute",
    zIndex: 10,
    flexDirection: "row",
    padding: 5,
    bottom: 10,
    right: 10,
    alignItems: "center",
    backgroundColor: "rgba(150,150,150,0.4)"
  },
  topHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 10, 
    marginTop: 20 
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  iconButton: {
    marginHorizontal: 4,
    padding: 0,
  },
  customDivider: {
    backgroundColor: '#ccc',
    height: 2,
    marginTop: -10
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#E5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackground: {
    width: '100%',
    paddingBottom: 16,
    height: 280,
    marginBottom: 210
  },
  dashboardCardWrapper: {
    marginTop: -140,
    paddingHorizontal: 16,
    zIndex: 1,
    top: 160,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10
  },
  filterButtonTop: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: 80,
    marginLeft: 20
  },
  filterButtonTopYear: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: 80,
    marginLeft: 40
  },
  highlightedButton: {
    backgroundColor: '#d3d3d3',
  },
  devButtons: {
	  flexDirection: 'row',
	  gap: 30
  },
  tooltipContent: {
    padding: 10
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tooltipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
	textAlign: 'justify'
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#999',
    fontSize: 15,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  contentView: {marginTop: -50},
  select: {marginTop: 10, marginBottom: 20},
  modalCard: {marginVertical: 10, marginHorizontal: 20},
  modalCard1: {marginVertical: 10},
  modalButton: {alignItems: 'center', marginTop: 10},
  buttonModal: {width: 120},
  modalTitle: {marginBottom: 10},
  modalText: {textAlign: 'justify', marginBottom: 5, lineHeight: 20},
  checkBox: {marginTop: 10, marginBottom: 15},
  card: {width: 350}
});

export default React.memo(HomeScreenNew);