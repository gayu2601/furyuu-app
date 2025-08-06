import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, ImageStyle, Alert, TouchableOpacity, BackHandler, ImageBackground, Dimensions, StatusBar } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import {
  Button,
  CheckBox,
  Input,
  StyleService,
  useStyleSheet,
  Text, Layout,
  Icon, 
  Select, SelectItem,
  IndexPath, useTheme, Spinner, Toggle, Modal, Card,
  RadioGroup, Radio
} from '@ui-kitten/components';
import { ImageOverlay } from '../extra/ImageOverlay';
import { ProfileAvatar } from '../extra/ProfileAvatar';
import {
  EmailIcon,
  PersonIcon,
  PlusIcon,
  PhoneIcon
} from '../extra/icons';
import { KeyboardAvoidingView } from '../extra/3rd-party';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { storage } from '../extra/storage';
import { usePermissions } from '../main/PermissionsContext';
import { firebase } from '@react-native-firebase/analytics';
import { Buffer } from 'buffer';
import { checkAndDeleteSession } from "../extra/sessionUtils";
import { locationWorkerInstance } from '../extra/LocationWorker';

const RegisterScreen = ({ navigation }) => {
	const route = useRoute();
	const { session } = route.params;
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
	const [phoneNo, setPhoneNo] = useState('');
	const [phoneError, setPhoneError] = useState(false);
	const [major, setMajor] = useState(false);
  const [phoneErrorValid, setPhoneErrorValid] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState(false);
  const [name, setName] = useState('');
  const [genderIndex, setGenderIndex] = useState(null); 
  const [gender, setGender] = useState(''); 
  const genders = ['Male', 'Female', 'Other'];
    const [pushToken, setPushToken] = useState();
    	const theme = useTheme();
		
		const [isModalVisible, setIsModalVisible] = useState(false);
		  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
  
	useEffect(() => {
		const backAction = async() => {
		  await checkAndDeleteSession();
		  navigation.navigate('WelcomeLoginScreen');
		  return true;
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove();
	  }, [navigation]);
  
	useEffect(() => {
		const unsubscribe = navigation.addListener('focus', () => {
					setName('');
					setGenderIndex(null)
					setGender('')
					setNameError(false)
					setPhoneNo('');
					setPhoneError(false)
					setPhoneErrorValid(false)
					setProfilePic(null)
					setMajor(false)
		});
		return () => unsubscribe();
	}, [navigation]);
	
	
  useEffect(() => {
    const initLocation = async () => {
      try {
        const result = await locationWorkerInstance.initialize();
		console.log('in useEffect address:')
		console.log(result)
      } catch (error) {
        console.log(error);
      }
    };
    initLocation();
  }, []);
	
	function isValidPhoneNumber(phoneNo) {
	  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
	  return phoneRegex.test(phoneNo);
	}
	
	const handleGenderSelect = (index) => {
		setGenderIndex(index);
		setGender(genders[index]);
	};
  
  const styles = useStyleSheet(themedStyles);
	  
	const generateUniqueUsername = () => {
		const sanitizedName = name.trim().replace(/\s+/g, "").toLowerCase();
		const uniqueIdentifier = new Date().getTime().toString().slice(-4);
		let a = `${sanitizedName}${uniqueIdentifier}`
		console.log('unique username: ')
		console.log(a)
		return a;
	}
	
	const generateAndCheckUniqueUsername = async() => {
		if(name) {
		  let isUnique = false;
		  let usernameValue;
		  let attempts = 0;
		  const maxAttempts = 10; // Prevent infinite loop in edge cases

		  while (!isUnique && attempts < maxAttempts) {
			// Generate a new username
			usernameValue = generateUniqueUsername(name);
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

	  
	const getPushToken = async () => {
		Notifications.getPermissionsAsync()
		  .then((statusObj) => {
			if (statusObj.status !== "granted") {
			  return Notifications.requestPermissionsAsync();
			}
			return statusObj;
		  })
		  .then((statusObj) => {
			if (statusObj.status !== "granted") {
			  // alert();
			  throw new Error("Permission not granted.");
			}
		  });
		  let t = await getToken();
		  return t;
	};
	
	const getToken = async () => {
			  console.log("Getting token..");
			  try {
				const projectId = Constants.expoConfig?.extra?.eas?.projectId;
				let response = await Notifications.getExpoPushTokenAsync({
					  projectId
					});
				const token = response.data;
				console.log(token);
				setPushToken(token);
				return token;
			  } catch(err) {
				console.log(err);
				return null;
			  }
		  };

  const registerUser = async function () {
	  const nameValue = name.trim()
		const isValid = phoneNo !== '' ? isValidPhoneNumber(phoneNo) : false;
		
		if(nameValue === '') {
            setNameError(true)
        } else if (phoneNo === '') {
            setPhoneError(true)
        } else if (!isValid) {
            setPhoneErrorValid(true)
        } else {
			try {
					setLoading(true);
					firebase.analytics().logSignUp({method: 'email'});
					const phNo = '+91' + phoneNo;
					const usernameValue = await generateAndCheckUniqueUsername();
					console.log('Unique username: ' + usernameValue);
					const tok = await getPushToken();
					let profileUrl = null;
						if(profilePic) {
							const arraybuffer = await fetch(profilePic.uri).then((res) => res.arrayBuffer())
							  const fileExt = profilePic.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg'
							  const path = `${Date.now()}.${fileExt}`
							const { data: data2, error: uploadError } = await supabase.storage
								.from('avatars')
								.upload(path, arraybuffer, {
								  contentType: 'image/jpeg',
								})

							  if (uploadError) {
								  console.log(uploadError);
								return false;
							  }
								profileUrl = data2.path;
								
								const base64String = Buffer.from(arraybuffer).toString('base64');
								const localFileUri = `${FileSystem.cacheDirectory}${profileUrl}`;
								await FileSystem.writeAsStringAsync(localFileUri, base64String, {
								  encoding: FileSystem.EncodingType.Base64,
								});

								console.log('File saved locally:', localFileUri);
								storage.set(usernameValue + '_profilePic', localFileUri);
						}
						
							const capName = nameValue.charAt(0).toUpperCase() + nameValue.slice(1)
							
							const { data: data1, error: error1 } = await supabase
							  .from('profiles')
							  .insert({ 
								id: session.user.id,
								username: usernameValue, 
							    name: capName, 
								phoneNo: phNo,
								email: session.user.email,
								gender: gender,
								userType: 'tailor',
								avatar_url: profileUrl,
								pushToken: tok,
								signupStep: 1
							  })
							  .select().single();
						  if(error1) {
							  if (error1.code === '23505') { // PostgreSQL unique constraint violation code
							    showErrorMessage('This phone number is already registered. Please try another one.');
							  } else {
								showErrorMessage('An unexpected error occurred. Please try again.')
							  }
							  console.log('insert error:');
							  console.log(error1);
							  return false;
						  }
						  console.log(data1)
						  
						  const { error: error2 } = await supabase
							  .from('Worker')
							  .update({ username: usernameValue })
							  .eq('workerPhNo', phNo)
							if(error2) {
								throw error2;
							}
						  
						  navigation.navigate('AddressInputScreen', {session: session, shopPhNo: phNo});
							return true;
						
			} catch (error) {
			  showErrorMessage('Error: ' + error.message);
			  return false;
			} finally {
                    setLoading(false)
            }
		}
  };
  
  const onSignInButtonPress = () => {
    navigation && navigation.navigate('WelcomeLoginScreen');
  };
  
  const handleEditProfileImage = async () => {
		  setIsModalVisible(true); // Show the modal for option selection
	  };
	  
	const openCameraAsync = async () => {
		if (cameraPermission === 'granted') {
		  const result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			quality: 1,
		  });
		  console.log(result);

			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
			  const compressedSrc = await ImageManipulator.manipulateAsync(result.assets[0].uri, [], { compress: 0.5 });
			  const source = { uri: compressedSrc.uri };
			  setProfilePic(source);
			  console.log(source);
			}
		} else {
			showErrorMessage('Camera permission not granted! Grant permission in Settings')
		}
	};

	const openLibraryAsync = async () => {
		if (mediaPermission !== 'denied') {
		  const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only allow images
			allowsEditing: true,
			quality: 1,
		  });
		  console.log(result);

			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
			  const compressedSrc = await ImageManipulator.manipulateAsync(result.assets[0].uri, [], { compress: 0.5 });
			  const source = { uri: compressedSrc.uri };
			  setProfilePic(source);
			  console.log(source);
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};
	
  const renderEditAvatarButton = () => (
    <Button
      style={styles.editAvatarButton}
      accessoryRight={PlusIcon}
	  onPress={handleEditProfileImage}
    />
  );

  
	const WorkIcon = (style: ImageStyle): IconElement => {
	  const theme = useTheme();
	  return (
		<Icon {...style} name='briefcase-outline' fill={theme['color-primary-100']}/>
	  )
	};

  const handleOptionPress = (option) => {
		setIsModalVisible(false);
		if (!cameraPermission || cameraPermission !== 'granted' ) {
		  requestCameraPermission();
		}
		if (!mediaPermission || mediaPermission === 'denied' ) {
		  requestMediaPermission();
		}
		if (option.title === 'Take Photo') {
		  openCameraAsync();
		} else if (option.title === 'Choose from Gallery') {
		  openLibraryAsync();
		}
	  };

  return (
  <ScrollView keyboardShouldPersistTaps="handled">
	<StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content" // Use "dark-content" if your image is bright
      />
    <Layout style={styles.container}>
        {/* Profile Image */}
		<ImageBackground
			source={require('../../../assets/thaiyal_signup.jpg')}
			style={styles.background}
		  />

		<View style={styles.popup}>
			<Text style={{marginBottom: 15, marginTop: -25, fontSize: 26,
    fontWeight: '600',
    textAlign: 'center'}}>Create your account</Text>
			<View style={styles.headerContainer}>
			  <ProfileAvatar
				style={profilePic ? styles.profileAvatarPic : styles.profileAvatar}
				resizeMode={profilePic ? 'cover' : 'center'}
				source={profilePic ? { uri: profilePic.uri } : require('../assets/image-person.png')}
				editButton={renderEditAvatarButton}
			  />
			</View>
			<View style={styles.formContainer}>
			 <Input
				status={nameError ? 'danger' : 'basic'}
				style={styles.formInput}
				autoCapitalize='none'
				label='Name *'
				accessoryLeft={PersonIcon}
				value={name}
				onChangeText={(text) => {
				  setName(text);
				  setNameError(false);
				}}
			  />
			  {nameError && <Text status='danger'>Name is required</Text>}
			  
			  <Input
				status={(phoneError || phoneErrorValid) ? 'danger' : 'basic'}
				label='Shop Phone Number *'
				style={styles.formInput}
				accessoryLeft={PhoneIcon}
				keyboardType="phone-pad"
				value={phoneNo}
				maxLength={10}
				onChangeText={(text) => {
				  setPhoneNo(text);
				  setPhoneError(false);
				  setPhoneErrorValid(false);
				}}
			  />
				{phoneError && <Text status='danger'>Phone number is required</Text>}
				{phoneErrorValid && <Text status='danger'>Please enter a valid phone number</Text>}

				<Text category='s1' appearance='hint' style={{marginRight: 10, marginTop: 5}}>						
						Select Gender
				</Text>
			    <Layout style={{ flexDirection: 'row', padding: 5, height: 50, justifyContent: 'space-between',alignItems: 'center', marginBottom: -10 }}>
					  <RadioGroup
						selectedIndex={genderIndex}
						onChange={handleGenderSelect}
						style={styles.radioButton}  
					  >
						{genders.map((gender, index) => (
						  <Radio key={index}>{gender}</Radio>
						))}
					  </RadioGroup>
				</Layout>
				<CheckBox
				  checked={major}
				  onChange={nextChecked => setMajor(nextChecked)}
				  style={{marginTop: 20}}
				>
				  I confirm that I am 18 years of age or older
				</CheckBox>
			  
			</View>
			<Button
			  size='small'
			  disabled={!phoneNo || !name || !major}
			  onPress={registerUser}>
			  SIGN UP
			</Button>
			<Button
			  style={styles.signInButton}
			  appearance='ghost'
			  onPress={onSignInButtonPress}>
			  Already have an account? Sign In
			</Button>
		</View>
	          <Modal
					visible={isModalVisible}
					backdropStyle={styles.backdrop}
					onBackdropPress={() => setIsModalVisible(false)}
				  >   
				<Card>
				  <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Select Image Source</Text>
				  <View style={styles.modalOptionRow}>
				    {options.map((option, index) => (
						<TouchableOpacity key={index} style={styles.modalOption} onPress={() => handleOptionPress(option)}>
						  <MaterialCommunityIcons name={option.iconName} size={24} color="black" style={styles.modalIcon} />
						  <Text>{option.title}</Text>
						</TouchableOpacity>
				    ))}
				  </View>
				  <TouchableOpacity style={styles.modalOption} onPress={() => setIsModalVisible(false)}>
					<Text style={{ textAlign: 'center', marginTop: 5}}>Cancel</Text>
				  </TouchableOpacity>
				</Card>
			  </Modal>
			  
			      <Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
				  </Modal>

    </Layout>
	</ScrollView>
  );
};

const { width, height } = Dimensions.get("window");

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
	
  },
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    //minHeight: 216,
  },
  profileAvatarPic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    backgroundColor: 'background-basic-color-1',
	borderWidth: 1
  },
  editAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  formInput: {
    marginTop: 5,
	marginBottom: 15
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleText: {
    flex: 1,
    marginRight: 15,
  },
  upiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  upiInput: {
    flex: 1,
    marginRight: 10,
  },
  upiButton: {
    width: 140,
  },
  saveQrButton: {
    width: 120,
	marginHorizontal: 75
  },
  qrCodeText: {
    textAlign: 'center',
	width: 270,
    marginTop: 10,
    marginBottom: 15,
  },
  signInButton: {
	 marginTop: 5,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: 18,
	marginBottom: 10,
  },
  modalOption: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    margin: 5,
  },
  modalOptionText: {
    fontSize: 16,
	marginTop: 5
  },
  modalIcon: {
    marginRight: 10,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end', // Align modal content to bottom
    margin: 0, // Remove default margin
  },
  modalOptionRow: {
    flexDirection: 'row', // Arrange options horizontally in a row
    justifyContent: 'space-between', // Distribute options evenly
    marginBottom: -20, // Add spacing between options row and cancel button
  },
  background: {
	width: width,
    height: height * 0.35,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    overflow: 'hidden',
  },
  popup: {
    width: width,
    alignSelf: "center",
    padding: 40,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 80,
    borderWidth: 1,
    tintColor: 'color-primary-500',
  },
  formContainer: {
	  marginBottom: 20,
	  width: width * 0.8,
  },
  genderSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  text: {
    color: 'white',
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radio: {
    marginHorizontal: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: width - 20,
    borderRadius: 15,
    padding: 10,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  qrCodeContainer: {
    padding: 20, // Adjust padding as needed
    backgroundColor: 'white', // Optional, ensure contrast around the QR code
    alignSelf: 'center', // Center the QR code container
  },
  signUpButton: {
	  marginHorizontal: 40,
	  marginTop: 10
  },
  link: {
    color: '#3366FF', // Link color (you can customize this)
    textDecorationLine: 'underline',
  },
  headerText: {
	position: 'absolute',
	top: 50,
	left: 100,
  },
  radioButton: { flexDirection: 'row', marginLeft: -5 }
});

export default RegisterScreen;