import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Layout, Text, Icon, List, ListItem, Button, Modal, Card, Spinner } from '@ui-kitten/components';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../constants/supabase'
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import ProfileAvatarAuth from '../extra/ProfileAvatarAuth';
import { EditIcon } from '../extra/icons';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import ImageViewComponent from '../main/ImageViewComponent';
import { usePermissions } from '../main/PermissionsContext';
import { storage } from '../extra/storage';
import { saveSupabaseDataToFile } from '../extra/supabaseUtils';
import keys from '../../constants/Keys';
import { Buffer } from 'buffer';
import * as Application from 'expo-application';
import { useOrderItems } from '../main/OrderItemsContext';
import { resetIdCounter } from '../main/generateUniqueId';
import { checkAndDeleteSession } from "../extra/sessionUtils";

const ProfileScreen = () => {
	const navigation = useNavigation();
	const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
	const [profilePic, setProfilePic] = useState(null);
	const [selImg, setSelImg] = useState(null);
	const [loading, setLoading] = useState(false)
	const { updateCurrentUser, currentUser } = useUser();
	const { isConnected } = useNetwork();
	const { saveOrder, resetItemsForLabel } = useOrderItems();
	const [isModalVisible, setIsModalVisible] = useState(false);
		  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
			{ title: 'Delete profile pic',iconName: 'delete' },
		  ];

	const [imgModalVisible, setImgModalVisible] = useState(false);
  
	  const openImgModal = () => {
		setImgModalVisible(true);
	  };

	  const closeImgModal = () => {
		setImgModalVisible(false);
	  };	  
	const data = [
	  { title: 'Personal Settings', icon: 'person-outline', key: 'personal', onPress: () => navigation.navigate('PersonalDetailsScreen') },
	  { title: 'Shop Settings', icon: 'shopping-bag-outline', key: 'shop', onPress: () => navigation.navigate('ShopDetailsScreen') },
	  { title: 'Payment Settings', icon: 'credit-card-outline', key: 'bank', onPress: () => navigation.navigate('PaymentSettingsScreen') },
	  { title: 'Digital Portfolio', icon: 'at-outline', key: 'bank', onPress: () => navigation.navigate('DigitalPortfolioScreen') },
	  { title: 'Subscription', icon: 'award-outline', key: 'subscription', onPress: () => navigation.navigate('SubscriptionsScreen') },
	  { title: 'Support', icon: 'question-mark-circle-outline', key: 'support', onPress: () => navigation.navigate('SupportScreen') },
	  { title: 'Log Out', icon: 'log-out-outline', key: 'logout', onPress: () => logoutAlert() },
	];

	useEffect(() => {
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		}
		const downloadProfilePic = async() => {
			const profilePic = currentUser.avatar_url;
			console.log(currentUser.avatar_url);
			if (profilePic) {
			  try {
				  const cachedPath = storage.getString(currentUser.username + '_profilePic');
				  console.log(cachedPath)
					if (cachedPath && (await FileSystem.getInfoAsync(cachedPath)).exists) {
						const base64 = await FileSystem.readAsStringAsync(cachedPath, {
						  encoding: FileSystem.EncodingType.Base64,
						});

						setProfilePic(`data:image/jpeg;base64,${base64}`); 
					} else {
					  const { data, error } = await supabase.storage.from('avatars').download(profilePic)

					  if (error) {
						throw error
					  }

					  const fr = new FileReader();
						fr.readAsDataURL(data);
						const frPromise = new Promise((resolve, reject) => {
							fr.onload = () => resolve(fr.result);
							fr.onerror = () => reject(new Error('Failed to read image data'));
						});

						const result = await frPromise;
						
						localFileUri = await saveSupabaseDataToFile(data, profilePic);
						storage.set(currentUser.username + '_profilePic', localFileUri);
					  setProfilePic(result);
					}
				} catch (error) {
				  if (error instanceof Error) {
					console.log('Error downloading image: ', error.message)
				  }
				}
			}
		}
		downloadProfilePic();
	}, [])
	
	const logout = async () => {
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		} else {
			try {
				setLoading(true);

				saveOrder([], {custName: '', phoneNo: '', occasion: ''});
				resetItemsForLabel();
				resetIdCounter();
				
				await checkAndDeleteSession();
				const {error: error3} = await supabase
						.from('profiles')
						.update({pushToken: null})
						.eq('id', currentUser.id);
				if(error3) {
					throw error3;
				}
				const {error: error2} = await supabase
						.from('user_last_device_v2')
						.delete()
						.eq('user_id', currentUser.id)
						.eq('device_id', Application.getAndroidId());
				if(error2) {
					throw error2;
				}
					navigation.reset({
						index: 0,
						routes: [{ name: 'AuthScreen' }],
					  });

					return true
			}catch(error) {
				console.error(error);
				showErrorMessage("Error: " + error.message)
				return false
			} finally {
				setLoading(false);
			}
		}
    }

    const logoutAlert = () => {
        Alert.alert(
            "Confirmation", "Do you want to logout?",
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => logout()
                }
            ],
            {cancelable: true}
        )
    }
	
	const renderPhotoButton = () => (
		<Button
		  style={styles.editAvatarButton}
		  status='basic'
		  accessoryLeft={EditIcon}
		  onPress={handleEditProfileImage}
		/>
	  );
	  
	const handleEditProfileImage = async () => {
		setIsModalVisible(true);
	  };
	  
	  const handleOptionPress = (option) => {
		setIsModalVisible(false); // Hide the modal after selecting an option
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
		} else if (option.title === 'Delete profile pic') {
		  deletePicAlert();
		}
	  };

	const deletePicAlert = () => {
        Alert.alert(
            "Confirmation", "Do you want to delete profile pic?",
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => setProfilePic(null)
                }
            ],
            {cancelable: true}
        )
    }  
	  
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
			  setProfilePic(source.uri);
			  console.log(source.uri);
			  let aa = await updateProfileDb(source.uri);
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
			  setProfilePic(source.uri);
			  console.log(source.uri);
			  let aa = await updateProfileDb(source.uri);
			} 
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};
	
	const updateProfileDb = async(picUri) => {
		try {
		  const arraybuffer = await fetch(picUri).then((res) => res.arrayBuffer())
		  const fileExt = picUri?.split('.').pop()?.toLowerCase() ?? 'jpeg'
		  let profilePath = `${Date.now()}.${fileExt}`
		  const { data: uploadData, error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(profilePath, arraybuffer, {
			  contentType: 'image/jpeg',
			})

		  if (uploadError) {
			console.log(uploadError)
			throw uploadError
		  }
		  const base64String = Buffer.from(arraybuffer).toString('base64');
			const localFileUri = `${FileSystem.cacheDirectory}${profilePath}`;
			await FileSystem.writeAsStringAsync(localFileUri, base64String, {
			  encoding: FileSystem.EncodingType.Base64,
			});

			console.log('File saved locally:', localFileUri);
			storage.set(currentUser.username + '_profilePic', localFileUri);
			const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('avatars')
								  .remove([currentUser.avatar_url])
								if(errorRemove) {
									throw errorRemove;
								}
		
			const { data, error } = await supabase
			  .from('profiles')
			  .update({ avatar_url: profilePath })
			  .eq('id', currentUser.id)
			  .select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
			  .maybeSingle();
			if(error) {
				throw error;
			}
			if(data) {
				updateCurrentUser(data);
			} else {
				showErrorMessage('Unable to update profile pic!')
			}
		} catch(error) {
			console.log(error);
		}
	}
  
  const renderItem = ({ item }) => (
    <View style={styles.listItemContainer} onTouchEnd={item.onPress}>
      <View style={styles.listItemContent}>
        {/* Left Icon */}
        <Icon name={item.icon} style={styles.icon} fill="#2F80ED" />
        
        {/* Title Text */}
        <Text style={styles.itemText}>{item.title}</Text>
      </View>
      
      {/* Chevron Icon */}
      <Icon name="chevron-right" style={styles.chevron} fill="#BDBDBD" />
    </View>
  );

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header}>
	    <TouchableOpacity onPress={() => {
			setSelImg(profilePic); 
			openImgModal();
		}} disabled={!profilePic}>
          <ProfileAvatarAuth
			style={styles.profileAvatar}
			source={profilePic ? { uri: profilePic } : require('../../../assets/blank_profile.png')}
			editButton={renderPhotoButton}
		  />
		</TouchableOpacity>
        <Layout style={styles.userInfo}>
          <Text category="h6" style={styles.name}>{currentUser.name}</Text>
          <Text category="s2" style={styles.subtitle}>Tailor</Text>
        </Layout>
      </Layout>

      {/* List */}
      <List
        style={styles.list}
        data={data}
        renderItem={renderItem}
      />
	  
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
					<Text style={{ textAlign: 'center'}}>Cancel</Text>
				  </TouchableOpacity>
				</Card>
			  </Modal>
			  <Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
			</Modal>
			{selImg && (
						<ImageViewComponent
							imageUri={selImg}
							modalVisible={imgModalVisible}
							closeModal={closeImgModal}
						  />
			)}
    </Layout>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  avatar: {
    marginRight: 15,
  },
  profileAvatar: {
    aspectRatio: 1.0,
    height: 80,
    alignSelf: 'center',
  },
  userInfo: {
    flexDirection: 'column',
	marginLeft: 15
  },
  name: {
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    color: '#828282',
  },
  list: {
    marginTop: 10,
    backgroundColor: '#ffffff',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    marginLeft: 15,
    color: '#333333',
    fontSize: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
  chevron: {
    width: 24,
    height: 24,
  },
  editAvatarButton: {
    aspectRatio: 1.0,
    height: 10,
    borderRadius: 24,
  },
  modalOption: {
    padding: 0,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    margin: 5,
  },
  modalIcon: {
    marginRight: 10,
  },
  modalOptionRow: {
    flexDirection: 'row', // Arrange options horizontally in a row
    justifyContent: 'space-between', // Distribute options evenly
    marginBottom: 10, // Add spacing between options row and cancel button
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
