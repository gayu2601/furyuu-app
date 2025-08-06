import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, Image, ImageBackground, Dimensions, BackHandler, SafeAreaView, StatusBar, FlatList, Modal as ModalRN, Alert, Platform } from 'react-native';
import { Layout, Text, Input, Icon, Button, Spinner, Modal, useTheme, Select, SelectItem, Card } from '@ui-kitten/components';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { useUser } from '../main/UserContext';
import { supabase } from '../../constants/supabase'
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { storage } from '../extra/storage';
import { firebase } from '@react-native-firebase/analytics';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { useFocusEffect } from '@react-navigation/native';
import keys from "../../constants/Keys";
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { schedulePushNotification } from '../main/notificationUtils';
import { checkAndDeleteSession } from "../extra/sessionUtils";
import moment from 'moment';
import PaywallScreen from '../main/PaywallScreen';

const DeviceManager = {
  async getCurrentDeviceInfo() {
    const deviceId = Application.getAndroidId();
    const deviceName = await this.getDeviceName();
    const pushToken = await this.getPushToken();
    return { deviceId, deviceName, pushToken };
  },

  async getUserLastDevice(userId) {
    const { data, error } = await supabase
      .from('user_last_device_v2')
      .select('device_id, device_name, device_push_token')
      .eq('user_id', userId);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },
  
  async getDeviceName() {
	  let deviceName;
	  if (Device.isDevice) {
		deviceName = `${Device.modelName} (${Platform.OS})`;
	  } else {
		deviceName = `Simulator/Emulator (${Platform.OS})`;
	  }
	  return deviceName;
	},
	
	async getPushToken() {
		Notifications.getPermissionsAsync()
		  .then((statusObj) => {
			if (statusObj.status !== "granted") {
			  return Notifications.requestPermissionsAsync();
			}
			return statusObj;
		  })
		  .then((statusObj) => {
			if (statusObj.status !== "granted") {
			  throw new Error("2$es43AR4 not granted.");
			}
		  });
		  let t = await this.getToken();
		  return t;
	},
	
	async getToken() {
			  console.log("Getting token..");
			  try {
				const projectId = Constants.expoConfig?.extra?.eas?.projectId;
				let response = await Notifications.getExpoPushTokenAsync({
					  projectId
					});
				const token = response.data;
				console.log(token);
				return token;
			  } catch(err) {
				  showErrorMessage("token error: " + err.message)
					console.log(err);
					return null;
			  }
	},

  async updateUserDevice(userId, deviceInfo, prevDevicesLen) {
	try {
		if(prevDevicesLen == 1) {
			const { error } = await supabase
			  .from('user_last_device_v2')
			  .update({
				device_id: deviceInfo.deviceId,
				device_name: deviceInfo.deviceName,
				last_login: new Date().toISOString(),
				device_push_token: deviceInfo.pushToken
			  })
			  .eq('user_id', userId);
			if(error) {
				throw error;
			}
		} else {
			const { error: error1 } = await supabase.rpc("replace_user_device",{ 
				p_user_id: userId,
				p_device_id: deviceInfo.deviceId,
				p_device_name: deviceInfo.deviceName,
				p_last_login: new Date().toISOString(),
				p_device_push_token: deviceInfo.pushToken });
			if(error1) {
				throw error1;
			}
		}
	} catch(error) {
		console.error(error);
		showErrorMessage('Error logging in user!'); 
	}
  },

  async insertUserDevice(userId, deviceInfo) {
    const { error } = await supabase
      .from('user_last_device_v2')
      .upsert({
        user_id: userId,
        device_id: deviceInfo.deviceId,
        device_name: deviceInfo.deviceName,
        last_login: new Date().toISOString(),
        device_push_token: deviceInfo.pushToken
      },
	  {onConflict: 'user_id, device_id'});
    
    if (error) throw error;
  },

  async updateUserPushToken(userId, pushToken) {
    const { error } = await supabase
      .from('profiles')
      .update({ pushToken })
      .eq('id', userId);
    
    if (error) throw error;
  },

  async sendLogoutNotification(prevDeviceToken, username, newDeviceName) {
    if (!prevDeviceToken) return;
    
    const notifTitle = 'New Device Login';
    const notifBody = `Your Thaiyal Business App account has been logged out on this device due to a login on another device: ${newDeviceName}.`;
    
    await schedulePushNotification(prevDeviceToken, username, notifTitle, notifBody, {});
  }
};

const WelcomeLoginScreen = ({ navigation }) => {
	const [loading, setLoading] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { updateNewDeviceLogin, updateCurrentUser } = useUser();
    const [paywallVisible, setPaywallVisible] = useState(false);
  const theme = useTheme();
    
	/*useFocusEffect(
	  useCallback(() => {
		checkAndDeleteSession();
		
		// Optional cleanup function
		return () => {
		  // Any cleanup code if needed
		};
	  }, [])
	);*/		
	
	const sendQueuedNotifications = async (dbUsername, token) => {
		console.log("in sendQueuedNotifications " + token + ',' + dbUsername)
		const { data, error } = await supabase
		  .from('QueuedNotifications')
		  .select(`*`)
		  .eq('username', dbUsername)
		  .eq('notificationRead', false);

		if (error) {
		  console.error('Error fetching data:', error);
		} else {
		  console.log('Fetched data:', data);
		  if(data && data.length > 0) {
			  for (const notification of data) {
				let dataFinal = notification.notificationData || {}
				dataFinal.objectId = notification.id;
				const message = {
					to: token,
					sound: 'default',
					title: notification.notificationTitle,
					body: notification.notificationMsg,
					data: dataFinal
				  };
				await fetch('https://exp.host/--/api/v2/push/send', {
					method: 'POST',
					headers: {
					  Accept: 'application/json',
					  'Accept-encoding': 'gzip, deflate',
					  'Content-Type': 'application/json',
					},
					body: JSON.stringify(message),
				  });
			  }
		  }
		}
	};

	  const getNames = async (currentUser) => {
		  console.log("in getNames")
		      const { data, error } = await supabase.rpc("get_customers_list",{ parameter1: currentUser.username })

				if (error) {
				  console.error('Error fetching shop names:', error);
				} else {
				  console.log('Distinct customers list:', data);
				  storage.set(currentUser.username+'_Customers', JSON.stringify(data))
				}
	  }
	  
	const checkDeviceAndNotify = async (session, data1) => {
	  console.log('in checkDeviceAndNotify');
	  
	  try {
		const currentDevice = await DeviceManager.getCurrentDeviceInfo();
		const lastDevice = await DeviceManager.getUserLastDevice(session.user.id);
		console.log(currentDevice)
		
		console.log('Last device data:', lastDevice);
		
		const isOldDevice = lastDevice.some(device => device.device_id === currentDevice.deviceId);
		const now = moment().format('YYYY-MM-DD');
		const isNewEndDateSameOrAfter = data1.gracePeriodEndDate >= now;

		if (lastDevice.length > 0 && !isOldDevice) {
			console.log('in new device')
		  if (data1.subscribed || isNewEndDateSameOrAfter) {
			// Subscribed users can login from multiple devices
			await handleSubscribedUserLogin(session, data1, currentDevice);
		  } else {
			// Non-subscribed users need confirmation
			await showLogoutConfirmation(lastDevice[0].device_name, session, data1, currentDevice, lastDevice[0].device_push_token, lastDevice.length);
		  }
		} else if(lastDevice.length === 0) {
			console.log('in else if new device')
		  //first login
		  await handleSubscribedUserLogin(session, data1, currentDevice);
		} else {
			console.log('in else same device')
			//same device
			await handleUserLogin(session, data1, currentDevice, null);
		}
		
	  } catch (error) {
		console.error('Error checking device:', error);
		showErrorMessage('Error checking device authentication!');
	  }
	};

	// Handle login for subscribed users (can use multiple devices)
	const handleSubscribedUserLogin = async (session, data1, currentDevice) => {
	  try {
		await DeviceManager.insertUserDevice(session.user.id, currentDevice);
		await handleUserLogin(session, data1, currentDevice, null);
	  } catch (error) {
		console.error('Error in subscribed user login:', error);
		showErrorMessage('Error logging into this device!');
	  }
	};

	// Consolidated user login handler
	const handleUserLogin = async (session, data1, currentDevice, prevDeviceToken, prevDevicesLen) => {
	  console.log('in handleUserLogin', prevDeviceToken);
	  
	  try {
		setLoading(true);
		
		await updatePushTokenIfNeeded(session.user.id, data1, currentDevice.pushToken);
		
		if(prevDeviceToken) {
			// Handle device switching and notifications
			await handleDeviceSwitch(data1.username, session.user.id, currentDevice, prevDeviceToken, prevDevicesLen);
		}
		// Update app state
		updateCurrentUser(data1);
		updateNewDeviceLogin(true);
		
		// Load additional data and navigate
		await getNames(data1);
		queueMicrotask(() => sendQueuedNotifications(data1.username, currentDevice.pushToken));
		
		navigateToAppropriateScreen(data1, session);
		
	  } catch (error) {
		console.error('Error in user login:', error);
		showErrorMessage('Error logging in user!');
	  } finally {
		setLoading(false);
	  }
	};

	// Update push token only if it has changed
	const updatePushTokenIfNeeded = async (userId, data1, currentPushToken) => {
	  if (!data1.pushToken || data1.pushToken !== currentPushToken) {
		console.log("updating pushToken");
		await DeviceManager.updateUserPushToken(userId, currentPushToken);
		data1.pushToken = currentPushToken;
	  }
	};

	// Handle device switching logic
	const handleDeviceSwitch = async (username, userId, currentDevice, prevDeviceToken, prevDevicesLen) => {
	  // Send logout notification to previous device
	  await DeviceManager.sendLogoutNotification(prevDeviceToken, username, currentDevice.deviceName);
	  
	  // Update current device in database
	  await DeviceManager.updateUserDevice(userId, currentDevice, prevDevicesLen);
	};

	// Navigate based on user's signup completion status
	const navigateToAppropriateScreen = (data1, session) => {
	  console.log("navigating with data:", data1);
	  
	  if (data1.signupStep === 1) {
		navigation.navigate('AddressInputScreen', {
		  session: session,
		  shopPhNo: data1.phoneNo
		});
	  } else {
		navigation.reset({
		  index: 0,
		  routes: [{ name: "MainScreen", params: { data1 } }]
		});
	  }
	};

	// Show logout confirmation alert
	const showLogoutConfirmation = (previousDeviceName, session, data1, currentDevice, prevDeviceToken, prevDevicesLen) => {
	  console.log('in showLogoutConfirmation');
	  
	  return new Promise((resolve) => {
		Alert.alert(
		  "New Device Login",
		  `Your account was active on another device (${previousDeviceName}). Continue here and log out there, or subscribe to use multiple devices.`,
		  [
			{
			  text: "Continue Here",
			  onPress: () => {
				handleUserLogin(session, data1, currentDevice, prevDeviceToken, prevDevicesLen);
				resolve(true);
			  },
			  style: "destructive"
			},
			{
			  text: "Subscribe now",
			  onPress: () => {
				setPaywallVisible(true);
				resolve(true);
			  },
			  style: "destructive"
			},
			{
			  text: "Cancel",
			  onPress: () => {
				checkAndDeleteSession();
				resolve(false);
			  },
			  style: "cancel"
			}
		  ],
		  { cancelable: false }
		);
	  });
	};

	  
	const signInUser = async() => {
					try {
					  setLoading(true)
					  firebase.analytics().logLogin({method: 'email'});
					  GoogleSignin.configure({
						scopes: ['profile','email'],
						webClientId: keys.google_webClientId,
					  });
					  await GoogleSignin.hasPlayServices()
					  const userInfo = await GoogleSignin.signIn()
					  console.log('userInfo:')
					  console.log(userInfo)
					  if(userInfo.type === 'cancelled') {
						  return;
					  }
					  if (userInfo.data.idToken) {
						const { data: { session }, error } = await supabase.auth.signInWithIdToken({
						  provider: 'google',
						  token: userInfo.data.idToken,
						})
						if (error) {
							console.log('supabase error:')
							console.log(error)
							return;
						}
							console.log('session:');
							console.log(session);
							console.log(session.user.id);
							const { data: data1, error: error1, status } = await supabase
								.from('profiles')
								.select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
								.eq('id', session.user.id)
								.maybeSingle();
							  if (error1 && status !== 406) {
								console.log(error1)
								throw error1;
							  } else {
									console.log(data1)
									if(data1) {
										if(data1.userType === 'customer') {
											await checkAndDeleteSession();
											showErrorMessage('This email is already registered as customer in Thaiyal Connect app! Please use another email to login as tailor.');
											return;
										}
										await checkDeviceAndNotify(session, data1);
									} else {
										navigation.navigate('RegisterScreen', {session: session});
									}
							  }
					  } else {
						throw new Error('no ID token present!')
					  }
					} catch (error) {
						console.log(JSON.stringify(error))
						showErrorMessage('Error: ' + error.message);
						return;
					} finally {
						setLoading(false);
					}
	}
	
	const images = [
	  { source: require('../../../assets/tailor_ledger.jpg')},
	  { source: require('../../../assets/tailor_performance.jpg')},
	];


	useEffect(() => {
		const interval = setInterval(() => {
		  const nextIndex = (currentIndex + 1) % images.length;
		  flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
		  setCurrentIndex(nextIndex);
		}, 3000); // Auto-scroll every 3 seconds

		return () => clearInterval(interval);
	  }, [currentIndex]);

	  const renderItem = ({ item }) => (
	      <View style={styles.imageWrapper}>
			<ImageBackground source={item.source} style={styles.background}/>
		  </View>
	  );
    
	const onSignUpButtonPress = () => {
		navigation && navigation.navigate('RegisterScreen');
	  };

  return (
	<View style={{ flex: 1, backgroundColor: '#fff' }}>
	  <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content" // Use "dark-content" if your image is bright
      />

      <Layout style={styles.container}>
	    <View style={styles.topSection}>
          <FlatList
			ref={flatListRef}
			data={images}
			renderItem={renderItem}
			horizontal
			pagingEnabled
			showsHorizontalScrollIndicator={false}
			keyExtractor={(_, index) => index.toString()}
		  />
		</View>
		
		<View style={styles.contentSection}>

		<View style={styles.logoView}>
		  <Image
                    style={styles.logo}
                    source={require('../../../assets/logo-nobg.png')}
                    defaultSource={require('../../../assets/logo-nobg.png')}
            />
		</View>

		  {/* Popup */}
		  	<View style={styles.popup}>
			<Text category="h5" style={styles.welcomeText}>
			  Welcome to Thaiyal Business!
			</Text>
			<Text category="s2" style={styles.subText}>
			  Tailoring, Simplified – Thaiyal at Your Fingertips
			</Text>
			<GoogleSigninButton
			  size={GoogleSigninButton.Size.Wide}
			  color={GoogleSigninButton.Color.Dark}
			  onPress={signInUser}
			  style={{ marginTop: 20, marginBottom: -10 }}
			/>
		  </View>
		</View>

		<ModalRN
		  visible={paywallVisible}
		  animationType="slide"
		  transparent={true}
		  onRequestClose={() => setPaywallVisible(false)} // Handle Android back press
		>
		  <View style={styles.modalContainer}>
			<Layout style={styles.modalContent}>
			  <TouchableOpacity
				style={styles.closeButton}
				onPress={() => setPaywallVisible(false)}
			  >
				<Icon name="close-outline" fill="#555" style={styles.closeIcon} />
			  </TouchableOpacity>

			  <PaywallScreen setPaywallVisible={setPaywallVisible} stay={true}/>
			</Layout>
		  </View>
		</ModalRN>

		<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
		</Modal>
      </Layout>
	</View>
  );
};

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeText: {
	marginTop: -40,
    textAlign: 'center',
	marginLeft: -20,
	marginRight: -20,
	marginBottom: 10
  },
  subText: {
    marginTop: 5,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginVertical: 20,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
  },
  disabledButton: {
    backgroundColor: '#E4E9F2',
    borderColor: '#E4E9F2',
  },
  signUpText: {
    marginTop: 20,
    color: '#FF5A5F',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  phNo: { 
	marginTop: 16, width: '100%', height: 60, borderWidth: 1, borderRadius : 4, borderColor: '#ccc', marginBottom: 5
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popup: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 15,
	marginTop: -10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#777",
    marginBottom: 20,
  },
  input: {
    width: "80%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  button: {
    width: "80%",
    borderRadius: 8,
	marginTop: 10,
  },
  background: {
    width: width,
	height: height * 0.55,
  },
  imageWrapper: {
    width: width,
    height: '100%', // Half height to create semi-circle effect
    borderBottomLeftRadius: width / 3,
    borderBottomRightRadius: width / 3,
    overflow: 'hidden',
  },
  signInButton: {
	 marginTop: 10,
	 width: 300
  },
  overlayText: {
	position: 'absolute',
	top: 40,
	right: 30
  },
  logo: {
        height: 150,
        width: 150
    },
	logoView: {
		alignItems: 'center',
		marginTop: -75, // Negative margin to overlap with top section
		marginBottom: 20,
	},
	topSection: {
		height: Math.min(400, height * 0.55), // Cap at 350px or 45% of screen height, whichever is smaller
		width: '100%',
	  },
	  // Content section takes remaining space
	  contentSection: {
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingHorizontal: 20,
		marginTop: 70
	  },
	  modalContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
	  },
	  modalContent: {
		backgroundColor: 'white',
		borderTopLeftRadius: 15,
		borderTopRightRadius: 15,
		height: '90%'
	  },
	  closeButton: {
		position: 'absolute',
		top: 5,
		right: 15,
		zIndex: 10,
	  },
	  closeIcon: {
		width: 28,
		height: 28,
	  },
});

export default WelcomeLoginScreen;
