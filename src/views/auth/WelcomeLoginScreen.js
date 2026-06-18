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
import { checkAndDeleteSession } from "../extra/sessionUtils";
import moment from 'moment';

// Password-Role mapping configuration
const ROLE_PASSWORDS = {
  'admin123': 'admin',
  'designer456': 'designer',
  'production789': 'production'
};

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
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [password, setPassword] = useState('');
	const [tempSession, setTempSession] = useState(null);
	const [tempUserData, setTempUserData] = useState(null);
	const [tempCurrentDevice, setTempCurrentDevice] = useState(null);
	const [isNewUser, setIsNewUser] = useState(false);
	const [secureTextEntry, setSecureTextEntry] = useState(true);

	// Reset password states
	const [showResetModal, setShowResetModal] = useState(false);
	const [resetRole, setResetRole] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [newPasswordSecure, setNewPasswordSecure] = useState(true);
	const [confirmPasswordSecure, setConfirmPasswordSecure] = useState(true);
	const [resetLoading, setResetLoading] = useState(false);
	
	const flatListRef = useRef(null);
	const { updateNewDeviceLogin, updateCurrentUser } = useUser();
	const theme = useTheme();
	const { loadDressConfig, isDressConfigLoading } = useDressConfig();
    
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

		setTempSession(session);
		setTempUserData(data1);
		setTempCurrentDevice(currentDevice);
		setIsNewUser(newUser || false);
		setShowPasswordModal(true);
		
	  } catch (error) {
		console.error('Error checking device:', error);
		showErrorMessage('Error checking device authentication!');
	  }
	};

	const validatePasswordAndAssignRole = async (password) => {
	  try {
		const { data, error } = await supabase
		  .from('role_passwords_config')
		  .select('role, password');
		console.log(data)

		if (error && error.code !== 'PGRST116') {
		  console.error('Error fetching role passwords:', error);
		  const role = ROLE_PASSWORDS[password];
		  return role || null;
		}

		if (data && data.length > 0) {
		  const matchedRole = data.find(item => item.password === password);
		  if (matchedRole) {
			return matchedRole.role;
		  }
		}

		return null;
	  } catch (error) {
		console.error('Error validating password:', error);
		return null;
	  }
	};

	const handlePasswordSubmit = async () => {
	  if (!password.trim()) {
		showErrorMessage('Please enter a password');
		return;
	  }

	  try {
		setLoading(true);

		const assignedRole = await validatePasswordAndAssignRole(password);
		
		if (!assignedRole) {
		  showErrorMessage('Invalid password. Please try again.');
		  setPassword('');
		  setLoading(false);
		  return;
		}
		
		tempUserData.userType = assignedRole;
		
		//if (!isNewUser) {
		  await DeviceManager.insertUserDevice(tempSession.user.id, tempCurrentDevice);
		//}
		
		await handleUserLogin(tempSession, tempUserData, tempCurrentDevice);
		
		setShowPasswordModal(false);
		setPassword('');
		setTempSession(null);
		setTempUserData(null);
		setTempCurrentDevice(null);
		
	  } catch (error) {
		console.error('Error in password validation:', error);
		showErrorMessage('Error processing login!');
		setLoading(false);
	  }
	};

	const handleUserLogin = async (session, data1, currentDevice) => {
	  console.log('in handleUserLogin');
	  
	  try {
		setLoading(true);
		
		await updatePushTokenIfNeeded(session.user.id, data1, currentDevice.pushToken);
		
		storage.set('userType', data1.userType);
		console.log('Stored userType in local storage:', data1.userType);
		
		updateCurrentUser(data1);
		updateNewDeviceLogin(true);
		
		await getNames(data1);
		await getWorkers();
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

	const updatePushTokenIfNeeded = async (userId, data1, currentPushToken) => {
	  if (!data1.pushToken || data1.pushToken !== currentPushToken) {
		console.log("updating pushToken");
		await DeviceManager.updateUserPushToken(userId, currentPushToken);
		data1.pushToken = currentPushToken;
	  }
	};

	// ─── Reset Password Handlers ─────────────────────────────────────────────────

	const openResetModal = () => {
	  setResetRole('');
	  setNewPassword('');
	  setConfirmPassword('');
	  setShowResetModal(true);
	};

	const closeResetModal = () => {
	  setShowResetModal(false);
	  setResetRole('');
	  setNewPassword('');
	  setConfirmPassword('');
	};

	const handleResetPassword = async () => {
	  if (!resetRole.trim()) {
		showErrorMessage('Please enter the role name');
		return;
	  }
	  if (!newPassword.trim()) {
		showErrorMessage('Please enter a new password');
		return;
	  }
	  if (newPassword.length < 6) {
		showErrorMessage('Password must be at least 6 characters');
		return;
	  }
	  if (newPassword !== confirmPassword) {
		showErrorMessage('Passwords do not match');
		return;
	  }

	  try {
		setResetLoading(true);

		// Verify the role exists
		const { data, error } = await supabase
		  .from('role_passwords_config')
		  .select('role')
		  .eq('role', resetRole.trim().toLowerCase());

		if (error) throw error;

		if (!data || data.length === 0) {
		  showErrorMessage('Role not found. Please check the role name.');
		  return;
		}

		// Update the password for the matched role
		const { error: updateError } = await supabase
		  .from('role_passwords_config')
		  .update({ password: newPassword })
		  .eq('role', resetRole.trim().toLowerCase());

		if (updateError) throw updateError;

		showSuccessMessage('Password updated successfully!');
		closeResetModal();
	  } catch (error) {
		console.error('Reset password error:', error);
		showErrorMessage('Failed to reset password. Please try again.');
	  } finally {
		setResetLoading(false);
	  }
	};

	// ─────────────────────────────────────────────────────────────────────────────
	
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
		  const maxAttempts = 10;

		  while (!isUnique && attempts < maxAttempts) {
			usernameValue = generateUniqueUsername(email);
			console.log(usernameValue);

			const { count, error: errorUsername } = await supabase
			  .from('profiles')
			  .select('*', { count: 'exact', head: true })
			  .eq('username', usernameValue);

			if (errorUsername) {
			  throw errorUsername;
			}

			if (count === 0) {
			  isUnique = true;
			} else {
			  attempts++;
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
		}, 3000);

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

	const toggleSecureEntry = () => {
		setSecureTextEntry(!secureTextEntry);
	};

	const renderPasswordIcon = (props) => (
		<TouchableOpacity onPress={toggleSecureEntry}>
		  <Icon {...props} name={secureTextEntry ? 'eye-off' : 'eye'} />
		</TouchableOpacity>
	);

  return (
	<View style={{ flex: 1, backgroundColor: '#fff' }}>
	  <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
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

		{/* ── Role Password Modal ── */}
		<Modal
		  visible={showPasswordModal}
		  backdropStyle={styles.backdrop}
		  onBackdropPress={() => {
			setShowPasswordModal(false);
			setPassword('');
			setTempSession(null);
			setTempUserData(null);
			setTempCurrentDevice(null);
		  }}
		>
		  <Card disabled={true} style={styles.passwordCard}>
			<Text category="h6" style={styles.passwordTitle}>
			  Enter Role Password
			</Text>
			<Text category="s2" style={styles.passwordSubtext}>
			  Please enter your role password to continue
			</Text>
			<Input
			  style={styles.passwordInput}
			  placeholder="Enter password"
			  value={password}
			  onChangeText={setPassword}
			  secureTextEntry={secureTextEntry}
			  accessoryRight={renderPasswordIcon}
			  autoCapitalize="none"
			  onSubmitEditing={handlePasswordSubmit}
			/>

			{/* Forgot Password link */}
			<TouchableOpacity onPress={openResetModal} style={styles.forgotPasswordLink}>
			  <Text category="c1" style={styles.forgotPasswordText}>
				Forgot Password?
			  </Text>
			</TouchableOpacity>

			<View style={styles.passwordButtonContainer}>
			  <Button
				style={styles.passwordButton}
				appearance="outline"
				onPress={() => {
				  setShowPasswordModal(false);
				  setPassword('');
				  setTempSession(null);
				  setTempUserData(null);
				  setTempCurrentDevice(null);
				}}
			  >
				Cancel
			  </Button>
			  <Button
				style={styles.passwordButton}
				onPress={handlePasswordSubmit}
				disabled={!password.trim()}
			  >
				Continue
			  </Button>
			</View>
		  </Card>
		</Modal>

		{/* ── Reset Password Modal ── */}
		<Modal
		  visible={showResetModal}
		  backdropStyle={styles.backdrop}
		  onBackdropPress={closeResetModal}
		>
		  <Card disabled={true} style={styles.passwordCard}>

			<TouchableOpacity onPress={closeResetModal} style={styles.backButton}>
			  <Icon name="arrow-back-outline" style={styles.backIcon} fill="#8F9BB3" />
			</TouchableOpacity>

			<Text category="h6" style={styles.passwordTitle}>
			  Reset Password
			</Text>
			<Text category="s2" style={styles.passwordSubtext}>
			  Enter your role name and set a new password
			</Text>

			{/* Role name input */}
			<Input
			  style={styles.passwordInput}
			  placeholder="Role (e.g. admin, designer)"
			  value={resetRole}
			  onChangeText={setResetRole}
			  autoCapitalize="none"
			  accessoryLeft={(props) => <Icon {...props} name="person-outline" />}
			/>

			{/* New password input */}
			<Input
			  style={styles.passwordInput}
			  placeholder="New Password"
			  value={newPassword}
			  onChangeText={setNewPassword}
			  secureTextEntry={newPasswordSecure}
			  autoCapitalize="none"
			  accessoryLeft={(props) => <Icon {...props} name="lock-outline" />}
			  accessoryRight={(props) => (
				<TouchableOpacity onPress={() => setNewPasswordSecure(!newPasswordSecure)}>
				  <Icon {...props} name={newPasswordSecure ? 'eye-off' : 'eye'} />
				</TouchableOpacity>
			  )}
			/>

			{/* Confirm password input */}
			<Input
			  style={styles.passwordInput}
			  placeholder="Confirm Password"
			  value={confirmPassword}
			  onChangeText={setConfirmPassword}
			  secureTextEntry={confirmPasswordSecure}
			  autoCapitalize="none"
			  accessoryLeft={(props) => <Icon {...props} name="lock-outline" />}
			  accessoryRight={(props) => (
				<TouchableOpacity onPress={() => setConfirmPasswordSecure(!confirmPasswordSecure)}>
				  <Icon {...props} name={confirmPasswordSecure ? 'eye-off' : 'eye'} />
				</TouchableOpacity>
			  )}
			/>

			<View style={styles.passwordButtonContainer}>
			  <Button
				style={styles.passwordButton}
				appearance="outline"
				onPress={closeResetModal}
			  >
				Cancel
			  </Button>
			  <Button
				style={styles.passwordButton}
				onPress={handleResetPassword}
				disabled={
				  !resetRole.trim() ||
				  !newPassword.trim() ||
				  !confirmPassword.trim() ||
				  resetLoading
				}
				accessoryLeft={
				  resetLoading
					? () => <Spinner size="small" status="control" />
					: undefined
				}
			  >
				{resetLoading ? 'Saving...' : 'Reset'}
			  </Button>
			</View>

		  </Card>
		</Modal>

		{/* Loading Spinner */}
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
  background: {
    width: width,
	height: height * 0.55,
  },
  imageWrapper: {
    width: width,
    height: '100%',
    borderBottomLeftRadius: width / 3,
    borderBottomRightRadius: width / 3,
    overflow: 'hidden',
  },
  topSection: {
	height: Math.min(400, height * 0.55),
	width: '100%',
  },
  contentSection: {
	flex: 1,
	justifyContent: 'flex-start',
	alignItems: 'center',
	paddingHorizontal: 20,
	marginTop: 70
  },
  passwordCard: {
	width: width * 0.85,
	maxWidth: 400,
	padding: 20,
  },
  passwordTitle: {
	textAlign: 'center',
	marginBottom: 10,
  },
  passwordSubtext: {
	textAlign: 'center',
	marginBottom: 20,
	color: '#8F9BB3',
  },
  passwordInput: {
	marginBottom: 16,
  },
  passwordButtonContainer: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	gap: 10,
  },
  passwordButton: {
	flex: 1,
  },
  forgotPasswordLink: {
	alignSelf: 'flex-end',
	marginTop: -8,
	marginBottom: 16,
  },
  forgotPasswordText: {
	color: '#3366FF',
	textDecorationLine: 'underline',
  },
  backButton: {
	position: 'absolute',
	top: 16,
	left: 16,
	zIndex: 1,
	padding: 4,
  },
  backIcon: {
	width: 22,
	height: 22,
  },
});

export default WelcomeLoginScreen;