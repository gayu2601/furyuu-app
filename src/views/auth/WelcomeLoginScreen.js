import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, Image, ImageBackground, Dimensions, BackHandler, SafeAreaView, StatusBar, FlatList, Modal as ModalRN, Alert, Platform } from 'react-native';
import { Layout, Text, Input, Icon, Button, Spinner, Modal, useTheme, Select, SelectItem, Card } from '@ui-kitten/components';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { useUser } from '../main/UserContext';
import { supabase } from '../../constants/supabase'
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { storage } from '../extra/storage';
import useDressConfig from '../main/useDressConfig';
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
}

const WelcomeLoginScreen = ({ navigation }) => {
	const [loading, setLoading] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { updateNewDeviceLogin, updateCurrentUser } = useUser();
  const theme = useTheme();
  const { loadDressConfig, isDressConfigLoading } = useDressConfig();
    
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
		      const { data, error } = await supabase.rpc("get_customers_list")

				if (error) {
				  console.error('Error fetching customer names:', error);
				} else {
				  console.log('Distinct customers list:', data);
				  storage.set('Customers', JSON.stringify(data))
				}
	  }
	  
	  const getWorkers = async () => {
		  console.log("in getWorkers")
		      const { data, error } = await supabase.rpc("get_distinct_employee_names");

				if (error) {
				  console.error('Error fetching worker names:', error);
				} else {
				  console.log('Distinct workers list:', data);
				  storage.set('Employees', JSON.stringify(data))
				}
	  }
	  
	const checkDeviceAndNotify = async (session, data1, newUser) => {
	  console.log('in checkDeviceAndNotify');
	  
	  try {
		const currentDevice = await DeviceManager.getCurrentDeviceInfo();
		console.log(currentDevice);
		const lastDevice = !newUser 
		  ? await DeviceManager.getUserLastDevice(session.user.id) 
		  : [];

		const isOldDevice = !newUser && lastDevice.some(
		  (device) => device.device_id === currentDevice.deviceId
		);

		const loginHandler = !newUser && !isOldDevice 
		  ? handleSubscribedUserLogin 
		  : handleUserLogin;

		await loginHandler(session, data1, currentDevice);
	  } catch (error) {
		console.error('Error checking device:', error);
		showErrorMessage('Error checking device authentication!');
	  }
	};

	const handleSubscribedUserLogin = async (session, data1, currentDevice) => {
	  try {
		await DeviceManager.insertUserDevice(session.user.id, currentDevice);
		await handleUserLogin(session, data1, currentDevice);
	  } catch (error) {
		console.error('Error in subscribed user login:', error);
		showErrorMessage('Error logging into this device!');
	  }
	};

	// Consolidated user login handler
	const handleUserLogin = async (session, data1, currentDevice) => {
	  console.log('in handleUserLogin');
	  
	  try {
		setLoading(true);
		
		await updatePushTokenIfNeeded(session.user.id, data1, currentDevice.pushToken);
		updateCurrentUser(data1);
		updateNewDeviceLogin(true);
		
		// Load additional data and navigate
		await getNames(data1);
		await getWorkers();
		queueMicrotask(() => sendQueuedNotifications(data1.username, currentDevice.pushToken));
		await loadDressConfig(data1);
		navigation.reset({
		  index: 0,
		  routes: [{ name: "MainScreen", params: { data1 } }]
		});
		
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
	
	const generateUniqueUsername = (email) => {
		const baseName = email.split("@")[0];  
		const sanitizedName = baseName.trim().replace(/\s+/g, "").toLowerCase();
		const uniqueIdentifier = new Date().getTime().toString().slice(-4);
		let a = `${sanitizedName}${uniqueIdentifier}`
		console.log('unique username: ')
		console.log(a)
		return a;
	}
	
	const generateAndCheckUniqueUsername = async(email) => {
		if(email) {
		  let isUnique = false;
		  let usernameValue;
		  let attempts = 0;
		  const maxAttempts = 10; // Prevent infinite loop in edge cases

		  while (!isUnique && attempts < maxAttempts) {
			// Generate a new username
			usernameValue = generateUniqueUsername(email);
			console.log(usernameValue);

			// Check if the username already exists in the database
			const { count, error: errorUsername } = await supabase
			  .from('profiles')
			  .select('*', { count: 'exact', head: true })
			  .eq('username', usernameValue);

			if (errorUsername) {
			  throw errorUsername; // Handle error appropriately
			}

			// If no matching usernames found, mark as unique
			if (count === 0) {
			  isUnique = true;
			} else {
			  attempts++; // Increment attempts counter
			}
		  }

		  if (attempts >= maxAttempts) {
			throw new Error("Failed to generate a unique username after multiple attempts.");
		  }

		  return usernameValue;
		}
	}

	const signInUser = async() => {
					try {
					  setLoading(true)
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
								.select(`*`)
								.eq('id', session.user.id)
								.maybeSingle();
							  if (error1 && status !== 406) {
								console.log(error1)
								throw error1;
							  } else {
									console.log(data1)
									if(data1) {
										await checkDeviceAndNotify(session, data1);
									} else {
										const usernameValue = await generateAndCheckUniqueUsername(session.user.email);
										console.log('Unique username: ' + usernameValue);
										const tok = await DeviceManager.getPushToken();
										const { data: data2, error: error1 } = await supabase
										  .from('profiles')
										  .insert({ 
											id: session.user.id,
											username: usernameValue, 
											email: session.user.email,
											pushToken: tok
										  })
										  .select().single();
									  if(error1) {
										  showErrorMessage('An unexpected error occurred. Please try again.')
										  console.log('insert error:');
										  console.log(error1);
										  return false;
									  }
									  console.log(data2)
									  await checkDeviceAndNotify(session, data2, true);
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
		  {/* Popup */}
		  	<View style={styles.popup}>
			<Text category="h5" style={styles.welcomeText}>
			  Welcome!
			</Text>
			<Text category="s2" style={styles.subText}>
			  Furyuu Designers – A Style for Every Outfit
			</Text>
			<GoogleSigninButton
			  size={GoogleSigninButton.Size.Wide}
			  color={GoogleSigninButton.Color.Dark}
			  onPress={signInUser}
			  style={{ marginTop: 20, marginBottom: -10 }}
			/>
		  </View>
		</View>

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
