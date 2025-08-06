import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ScrollView, StyleSheet, View, Modal, TouchableOpacity, Image, Alert, Animated, BackHandler, Keyboard, FlatList } from 'react-native';
import { Layout, Text, Input, Icon, Button, Divider, Card, RadioGroup, Radio, Autocomplete, AutocompleteItem, IndexPath, Select, SelectItem, useTheme, CheckBox } from '@ui-kitten/components';
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import ImageViewComponent from '../main/ImageViewComponent';
import PaywallScreen from '../main/PaywallScreen';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import { usePermissions } from '../main/PermissionsContext';
import { useRevenueCat } from '../main/RevenueCatContext';
import keys from "../../constants/Keys";
import { logFirebaseEvent } from "../extra/firebaseUtils";
import { useNavigation } from '@react-navigation/native';
import { locationWorkerInstance } from '../extra/LocationWorker';
import ShopInfoModal from '../extra/ShopInfoModal';
import SubscriptionSuccessModal from '../main/SubscriptionSuccessModal';

const ShopDetailsScreen = () => {
	const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [inputValue, setInputValue] = useState('');
  const { updateCurrentUser, currentUser } = useUser();
  const { subscriptionActive } = useRevenueCat();
  const { isConnected } = useNetwork();
  const [pincodeError, setPincodeError] = useState(false)
  const [pincode, setPincode] = useState(null);
  const theme = useTheme();
  const [consentChecked, setConsentChecked] = useState(false);
  const [shopId, setShopId] = useState('');
  const [shopDetailsChanged, setShopDetailsChanged] = useState(false);
  const [shopAddress, setShopAddress] = useState('');
  const [shopIdMaps, setShopIdMaps] = useState(null);
  const [emp, setEmp] = useState('');
  const [empError, setEmpError] = useState(false);
  const [shopCursorPosition, setShopCursorPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [shopPhoneNumber, setShopPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selImg, setSelImg] = useState(null)
  const autocompleteRef = useRef(null);
  const API_KEY = keys.ola_maps_api_key;
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [shopPicsOriginal, setShopPicsOriginal] = useState([]);
  const [shopPicsUnsaved, setShopPicsUnsaved] = useState([]);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [existingImgCount, setExistingImgCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const MAX_FREE_IMAGES = 2;
  const [remSlots, setRemSlots] = useState(MAX_FREE_IMAGES);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [url, setUrl] = useState(null);
  
  const [spIndex, setSpIndex] = useState([]);
	const [sp, setSp] = useState(null); 
	const [spArr, setSpArr] = useState(null); 
	const spServices = ['None', 'Wedding', 'Bridal', 'Suits', 'Casual-wear', 'Kids', 'Ethnic', 'Western', 'Alterations'];
  
  const openImgModal = () => {
    setImgModalVisible(true);
  };

  const closeImgModal = () => {
    setImgModalVisible(false);
  };
  
  const handleSelectSp = (index) => {
		setSpIndex(index);
		const selectedServices = index.map(i => spServices[i.row]);
		const commaSeparatedSp = selectedServices.join(', ');
		setSpArr(selectedServices);
		setSp(commaSeparatedSp);
	};
  
  const handleShopModalClose = (data) => {
    setShopModalVisible(false);
    if (data.shopName && data.shopAddress) {
      setShopAddress(data.shopName + ', ' + data.shopAddress);
	  setShopDetailsChanged(true);
    }
  };
  
  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPaywallVisible(false);
    });
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
		  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
  
  const profileItems = [
	{ label: 'Shop ID', value: shopId, icon: 'hash-outline' },
    { label: 'Shop Name and Address', value: shopAddress, icon: 'pin-outline' },
    { label: 'Shop Phone Number', value: shopPhoneNumber, icon: 'phone-outline' },
	{ label: 'No. of employees in shop', value: emp, icon: 'person-outline' },
	{ label: 'Specialization', value: sp, icon: 'bulb-outline' },
	{ label: 'Consent to display Shop and Profile Details', value: consentChecked ? 'Yes' : 'No', icon: 'info-outline' },
	{ label: 'Shop Images', value: shopPicsUnsaved, icon: 'image-outline' }
  ];
  
  useEffect(() => {
		const backAction = () => {
			  navigation.navigate('ProfileScreen')
			  return true;
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, []);
  
  useEffect(() => {
	  if(!isConnected) {
			 showErrorMessage("No Internet Connection");
	  }
	  
	  const downloadShopPics = async() => {
			let picsDb = currentUser.ShopDetails.shopPics;
			console.log('picsDb;')
			console.log(picsDb);
			if(picsDb) {
				let allPics = [];
				await Promise.all(
					picsDb.map(async (img) => {
						try {	  
							  const { data, error } = await supabase.storage.from('shop-images').getPublicUrl('shopPics/' + img)

							  if (error) {
								throw error;
							  }

							  allPics.push(data.publicUrl);
						} catch (error) {
							console.log('Error downloading image: ', error.message)
							return null;
						}
					})
				);
				setShopPicsOriginal(allPics);
				setShopPicsUnsaved(allPics);
				setExistingImgCount(allPics.length);
			}
		}
	  
    const fetchShopDetails = async () => {
      if (currentUser && currentUser.ShopDetails) {
			setShopId('TH#'+currentUser.shopId);
			setShopPhoneNumber(currentUser.ShopDetails.shopPhNo?.substring(3));
			setShopAddress(currentUser.ShopDetails.shopName + ', ' + currentUser.ShopDetails.shopAddress);
			setShopCursorPosition({ start: 0, end: 0 });
			setPincode(currentUser.ShopDetails.pincode);
			setPincodeError(false);
			setEmp(currentUser.ShopDetails.noOfEmp ? currentUser.ShopDetails.noOfEmp.toString() : '');
			let aa = currentUser.ShopDetails.topServices;
			if(aa) {
				setSpArr(aa);
				setSp(aa.join(','));
			}
			setConsentChecked(currentUser.ShopDetails.websiteConsent);
      }
    };

	downloadShopPics();
    fetchShopDetails();
  }, []);

  const openModal = (item) => {
    setSelectedItem(item.label);
    setInputValue(item.value);
    setModalVisible(true);
  };

  const closeModal = () => {
	switch(selectedItem) {
		case 'Shop Name and Address':
			setShopAddress(currentUser.ShopDetails.shopName + ', ' + currentUser.ShopDetails.shopAddress)
			setShopCursorPosition({ start: 0, end: 0 });
			setPincode(currentUser.ShopDetails.pincode);
			setPincodeError(false);
			break;
		case 'Shop Phone Number':
			setShopPhoneNumber(currentUser.ShopDetails.shopPhNo.substring(3));
			break;
		case 'No. of employees in shop':
			setEmp(currentUser.ShopDetails.noOfEmp);
			break;
		case 'Specialization':
			let aa = currentUser.ShopDetails.topServices;
			if(aa) {
				setSpArr(aa);
				setSp(aa.join(','));
			}
			break;
		case 'Consent to display Shop and Profile Details':
			setConsentChecked(currentUser.ShopDetails.websiteConsent);
			break;
		case 'Shop Images':
			console.log(shopPicsOriginal)
			setShopPicsUnsaved(shopPicsOriginal);
			setExistingImgCount(0);
			break;
	}
	setModalVisible(false);
  };
  
  const checkAndPickImage = () => {
			if (!subscriptionActive) {
				  logFirebaseEvent('max_shop_images');
				const remainingSlots = Math.max(0, MAX_FREE_IMAGES - existingImgCount);
				if(remainingSlots === 0) {
					Alert.alert(
					  'Image Limit Reached',
					  'You\'ve reached the limit of 2 images. Upgrade to premium to add more images!',
					  [
						{
						  text: 'Maybe Later',
						  style: 'cancel',
						  onPress: () => {return;}
						},
						{
						  text: 'Upgrade Now',
						  onPress: () => handleSubscribe()
						}
					  ]
					);
				} else {
					Alert.alert(
					  'Image Limit',
					  `Free users can only add ${MAX_FREE_IMAGES} images. You can add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}.\n\nUpgrade to premium for unlimited images!`,
					  [
						{
						  text: 'Maybe Later',
						  style: 'cancel',
						  onPress: () => {setRemSlots(remainingSlots); pickImage();}
						},
						{
						  text: 'Upgrade Now',
						  onPress: () => handleSubscribe()
						}
					  ]
					);
				}
			} else {
				pickImage();
			}
  }
  
  const pickImage = async () => {
		  setIsModalVisible(true);
	  };
	  
	const handleDeleteImage = (index) => {
		const newImages = [...shopPicsUnsaved];
		newImages.splice(index, 1);
		setShopPicsUnsaved(newImages);
		setExistingImgCount(newImages.length);
	};
  
  const handleEditProfileImage = async () => {
		    setIsModalVisible(true);
			setPicType('profilePic')
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
		}
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
			  setShopPicsUnsaved(shopPics => [...shopPics, source.uri])
			  console.log(source.uri);
			  setRemSlots(prevSlots => prevSlots - 1);
			  setExistingImgCount(prevCount => prevCount + 1);
			}
		} else {
			showErrorMessage('Camera permission not granted! Grant permission in Settings')
		}
	};

	const openLibraryAsync = async () => {
		if (mediaPermission !== 'denied') {
		  try {
			const result = await ImagePicker.launchImageLibraryAsync({
			  mediaTypes: ImagePicker.MediaTypeOptions.Images,
			  allowsMultipleSelection: true,
			  quality: 1,
			});

			console.log(result);

			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
				const selectedImages = subscriptionActive ? result.assets : result.assets.slice(0, remSlots); 
				selectedImages.forEach(async(asset) => {
				  const compressedSrc = await ImageManipulator.manipulateAsync(asset.uri, [], { compress: 0.5 });
				  const source = { uri: compressedSrc.uri };
				  console.log(source);
				  setShopPicsUnsaved(shopPics => [...shopPics, source.uri]);
				})
				setRemSlots(prevSlots => prevSlots - selectedImages.length);
				setExistingImgCount(prevCount => prevCount + selectedImages.length);
			}
		  } catch (error) {
			console.error('Error selecting images:', error);
			showErrorMessage('Failed to select images. Please try again.');
		  }

		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};

	function startsWithFile(str) {
	  return typeof str === 'string' && str.startsWith("file");
	}
	
	function isValidPhoneNumber(phoneNo) {
	  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
	  return phoneRegex.test(phoneNo);
	}
	
	const handleSubscribe = () => {
		logFirebaseEvent('subscribe', {from_screen: 'shop_images'}); 
		setPaywallVisible(true);
	}
	
  const handleSave = async() => {
    switch (selectedItem) {
	  case 'Shop Phone Number':
		if(shopPhoneNumber === '') {
			showErrorMessage('Enter value to update!')
			return;
		} else {
			const isValid = isValidPhoneNumber(shopPhoneNumber);
			if(isValid) {
				const phNo = '+91' + shopPhoneNumber;
				const { error } = await supabase
							.from('ShopDetails')
							.update({ shopPhNo: phNo})
							.eq('id', currentUser.shopId);

							if(error) {
								throw error;
							}
			} else {
				showErrorMessage('Enter a valid phone number!');
				return;
			}
		}
		break;
	  case 'Shop Name and Address':
	    if(shopDetailsChanged) {
			if (shopAddress.trim() === '') {
				setModalVisible(false);
				showErrorMessage('Please enter a valid shop location!')
				return;
			} else if(pincode.trim() === '' || pincode.length < 6) {
				showErrorMessage('Please enter a valid pincode!')
				setPincodeError(true);
				return;
			} else {
				const [firstPart, ...rest] = shopAddress.split(",");
				
				const placeName = firstPart.trim();
				const placeAddress = rest.join(",").trim();
				if(placeAddress === '') {
					setModalVisible(false);
					showErrorMessage('Enter a valid shop address!');
					return;
				}
				
				const { data: dataCount, error: error2 } = await supabase.rpc("check_and_cleanup_shop_optimal", {
					parameter1: currentUser.id,
					parameter2: shopIdMaps,
					parameter3: placeName,
					parameter4: placeAddress
				  }).select().single();

				if(error2) {
					throw error2;
				}
				console.log(dataCount);
				
				if(dataCount.linked_to_other_user > 0) {
					closeModal();
					setShopAddress(currentUser.ShopDetails.shopName + ', ' + currentUser.ShopDetails.shopAddress)
					showErrorMessage('Selected shop is already linked with another user');
					return;
				} else {	
					const {count, error: perror} = await supabase
							.from('PincodeMapping')
							.select('*', { count: 'exact', head: true })
							.eq('pincode', pincode)
					if(perror) {
						throw perror;
					}
					console.log(count)
					if(count === 0) {
						const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
						const data = await response.json();
						if (data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
						  const postOffice = data[0].PostOffice[0];
							const { error: ierror } = await supabase
							  .from('PincodeMapping')
							  .insert({ area: postOffice.Name || '', district: postOffice.District || '',  state: postOffice.State || '', pincode: pincode})
							if(ierror) {
								throw ierror;
							}
						} 
					}
					const { error } = await supabase
							.from('ShopDetails')
							.update({ 
								  shopName: placeName, 
								  shopAddress: placeAddress, 
								  maps_place_id: shopIdMaps, 
								  pincode: pincode 
								}).eq('id', currentUser.shopId);
					/*if(data.id !== currentUser.shopId) {
						console.log('updating user in shiopid')
						const { error: erroru } = await supabase
                            .from('profiles')
                            .update({ shopId: data.id})
                            .eq('id', currentUser.id);
						if(erroru) {
							throw erroru;
						}

						const updatedUser = {
						 ...currentUser,
						 shopId: data.id,
						 ShopDetails: {
						   ...currentUser.ShopDetails,
						   id: data.id
						 }
						};
						updateCurrentUser(updatedUser);
					}*/
					console.log('updating shop details')
					if(error) {
						throw error;
					}
					
				}
			}
		}
		break;
	  case 'Shop Images':
			setExistingImgCount(shopPicsUnsaved.length);
		let shopPicsArr = [];
		console.log(shopPicsUnsaved)
		let a = await Promise.all(
			shopPicsUnsaved.map(async(pic) => {
						if(startsWithFile(pic)) {
								const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer())
								  const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg'
								  const path = `${Date.now()}.${fileExt}`
								  shopPicsArr.push(path);
								const { data: uploadShopData, error: uploadShopError } = await supabase.storage
									.from('shop-images/shopPics')
									.upload(path, arraybuffer, {
									  contentType: 'image/jpeg',
									})

								  if (uploadShopError) {
									  console.log(uploadShopError);
									  throw uploadShopError;
								  }
								  console.log('shopPicsArr:')
								  console.log(shopPicsArr)
						} else {
							shopPicsArr.push(pic.split("/").pop());
						}
			})
		);
						console.log('shopPicsArr:')
						console.log(shopPicsArr);
		const { error: error3 } = await supabase
						.from('ShopDetails')
					    .update({ shopPics: shopPicsArr })
						.eq('id', currentUser.shopId);

						if(error3) {
							console.log(error3)
							throw error3;
						}
		break;
	  case 'No. of employees in shop':
	    if(emp === '') {
			showErrorMessage('Enter value to update!')
			return;
		} else {
				console.log('emp: ' + emp + typeof(emp))
				const { error: error4 } = await supabase
							.from('ShopDetails')
							.update({ noOfEmp: parseInt(emp)})
							.eq('id', currentUser.shopId)
							.select().single();

							if(error4) {
								throw error4;
				}
		}
		break;
	  case 'Specialization':
		const { error: error5 } = await supabase
							.from('ShopDetails')
							.update({ topServices: spArr})
							.eq('id', currentUser.shopId)
							.select().single();

							if(error5) {
								throw error5;
							}
		break;
	  case 'Consent to display Shop and Profile Details':
		const { error: error6 } = await supabase
							.from('ShopDetails')
							.update({ websiteConsent: consentChecked})
							.eq('id', currentUser.shopId)
							.select().single();

							if(error6) {
								throw error6;
							}
		break;
	  default:
		break;
	}
	
	const { data: data1, error: error1, status } = await supabase
								.from('profiles')
								.select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
								.eq('id', currentUser.id)
								.maybeSingle();
	if (error1) {
		console.log(error1)
		throw error1;
	}
	console.log(data1)
	if(data1) {
		updateCurrentUser(data1);
		showSuccessMessage('Updated ' + selectedItem + '!')
		if(data1.subscribed) {
                    setUrl("https://thaiyalapp.in/" + data1.ShopDetails.slug);
                    setSuccessModalVisible(true);
        }
    } else {
		showErrorMessage('Unable to update shop details!')
	}
	setModalVisible(false);
  };
  
  const handleSuccessModalClose = () => {
	  setSuccessModalVisible(false);
  }
    
	const fetchPlaces = async (query) => {
		try {
			const input = query;

		  let loc = locationWorkerInstance.getLocationString();
		  let url = '';
		  if(loc) {
			url = `https://api.olamaps.io/places/v1/autocomplete?location=${loc}&input=${input}&api_key=${API_KEY}`;
		  } else {
			url = `https://api.olamaps.io/places/v1/autocomplete?input=${input}&api_key=${API_KEY}`;
		  }
		  console.log(url)
		  const response = await fetch(url);
		  const data = await response.json();
		  console.log(data)

		  if (data.status === 'ok') {
			const filteredPlaces = data.predictions.filter((prediction, index, self) => {
			  return self.findIndex(p => p.description.toLowerCase() === prediction.description.toLowerCase()) === index;
			});
			setPlaces(filteredPlaces.map(prediction => ({
			  description: prediction.description,
			  place_id: prediction.place_id
			})));
		  } else {
			setError(data.error_message || 'An error occurred');
		  }
		  
		} catch (error) {
		  console.error(error);
		  setError('Network error');
		}
	  };
  
  useEffect(() => {
		if (shopAddress.length > 2) { // Trigger fetch when the input is more than 2 characters
			console.log("in useEffect " + shopAddress)
		  fetchPlaces(shopAddress);
		}
	  }, [shopAddress]);
  
    const onSelect = (item) => {
			console.log(" in onselect ")
			console.log(item)
			setShopAddress(item.description);
			setShopIdMaps(item.place_id);
			setShowSuggestions(false);
			Keyboard.dismiss();
		}

	const onChangeText = useCallback(async (query) => {
			console.log("in onchangetext " + query)
			  setShopAddress(query);
			  setShopDetailsChanged(true);
		}, []);
		
	const renderIcon = (props) => (
		<Icon {...props} name='search' />
	  );
	  
	const renderCloseIcon = (props) => (
	    <TouchableOpacity onPress={clearSearch}>
			<Icon {...props} name='close-outline' />
		</TouchableOpacity>
	  );
	  
	const clearSearch = () => {
		  setShopAddress('');
		  setShopIdMaps(null);
		  setShopCursorPosition(null)
		  setPlaces([])
		  console.log("cleared search")
		  setShopDetailsChanged(true)
	  };
	  
	const renderShopImages = () => (
	  <Layout style={styles.imagesContainer}>
		{shopPicsUnsaved.map((pic, index) => (
		  <Layout key={index} style={styles.imageWrapper}>
			<Button
					  style={styles.image}
					  appearance='ghost'
					  accessoryLeft={() => (
						<Image source={{ uri: pic }} style={styles.image} />
					  )}
					  onPress={() => {setSelImg(pic); openImgModal(); }}
					/>
			<Button
					  style={styles.deleteIcon}
					  appearance='ghost'
					  status='control'
					  accessoryLeft={(props) => <Icon {...props} name="trash-2-outline" fill='#fff' style={styles.deleteIconStyle}/>}
					  onPress={() => handleDeleteImage(index)}
					/>
		  </Layout>
		))}
		<Button style={styles.uploadWrapper} status='control' onPress={checkAndPickImage}>
			<View style={styles.uploadContent}>
				<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
				<Text category='s2' style={styles.uploadButtonText}>Upload</Text>
			</View>
		</Button>
	  </Layout>
	);
	
	RenderItem = memo(({ item, onSelect }) => (
	  <TouchableOpacity
		onPress={() => onSelect(item)}
		style={{
		  padding: 10,
		  borderBottomWidth: 1,
		  borderBottomColor: "#ddd",
		}}
	  >
		<Text category='s2'>{item.description}</Text>
	  </TouchableOpacity>
	));
	
	const renderItem = useCallback(({ item }) => (
	  <RenderItem item={item} onSelect={onSelect} />
	), [onSelect]);

	const PincodeIcon = (style: ImageStyle): IconElement => {
	  return (
		<Icon {...style} name='pin-outline' fill={theme['color-primary-100']}/>
	  )
	};
  
  const renderModalContent = () => {
    switch (selectedItem) {
      case 'Shop Phone Number':
        return (
          <Input
				style={styles.input}
				placeholder={`Enter ${selectedItem}`}
				keyboardType="phone-pad"
				value={shopPhoneNumber}
				maxLength={10}
				onChangeText={(text) => {
				  setShopPhoneNumber(text);
				}}
			  />
        );
      case 'Shop Name and Address':
        return (
		  <>
			<Input
				style={styles.autocompleteInput}
				accessoryRight={shopAddress ? renderCloseIcon : null}
				value={shopAddress}
				onChangeText={onChangeText}
				onFocus={() => setShowSuggestions(true)}
				placeholder="Type here to search for your shop"
			  />

			<View>
			{showSuggestions && (
			  <>
				{places.length > 0 && (
					<FlatList
					  data={places}
					  keyExtractor={(item, index) => index.toString()}
					  style={styles.listInput}
					  keyboardShouldPersistTaps="handled"
					  renderItem={renderItem}
					  scrollEnabled={true}
					  showsVerticalScrollIndicator={true}
					  nestedScrollEnabled={true} 
					  persistentScrollbar={true}
					  removeClippedSubviews={false}
					  contentContainerStyle={{
						flexGrow: 1,
						paddingVertical: 5
					  }}
					  maxToRenderPerBatch={10}
					  windowSize={10}
					/>
			  )}
			</>
			)}
			</View>
			
			<Button appearance='ghost' style={styles.findShopButton} size='small' onPress={() => setShopModalVisible(true)}>Can't find your shop? Click here</Button>
			
			<Input
					status={pincodeError ? 'danger' : 'basic'}
					style={styles.formInput}
					autoCapitalize='none'
					label='Pincode *'
					keyboardType='numeric'
					maxLength={6}
					accessoryRight={PincodeIcon}
					value={pincode}
					onChangeText={(val) => {setPincode(val); setShopDetailsChanged(true);}} 
			/>
		  </>
        );
	  case 'No. of employees in shop':
		return (
			<Input
				style={styles.input}
				placeholder={`Enter ${selectedItem}`}
				keyboardType="numeric"
				value={emp}
				onChangeText={(text) => {
				  setEmp(text);
				}}
			  />
		);
	  case 'Specialization':
		return (
			<Select
				    multiSelect={true}
					style={styles.formInput}
					label='Specialization'
					selectedIndex={spIndex}
					onSelect={handleSelectSp}
					value={sp}
			>
					{spServices.map((option, index) => (
					  <SelectItem title={option} key={index} />
					))}
			</Select>
		);
	  case 'Consent to display Shop and Profile Details':
		return (
			<CheckBox
			  checked={consentChecked}
			  onChange={setConsentChecked}
			  style={styles.checkbox}
			>
			  I consent to display my tailor profile and shop details on thaiyalapp.in website and Thaiyal Connect app
			</CheckBox>
		);
	  case 'Shop Images':
        return (
			renderShopImages()
        );
    }
  };

  return (
	<ScrollView keyboardShouldPersistTaps="handled">
      <Layout style={styles.container}>
        {profileItems.map((item, index) => (
		  <>
		  {item.label === 'Shop Images' ? (
			<View style={styles.column}>
				<TouchableOpacity key={index} style={styles.row} onPress={() => openModal(item)}>
					<View style={{flexDirection: 'row', alignItems: 'center', marginLeft: -15}}>
					  <Icon name={item.icon} style={styles.icon} fill={item.danger ? '#FF3D71' : '#000'} />
					  <Text category="label" style={styles.modalHeader}>{item.label}</Text>					
					  <Icon name="chevron-right-outline" style={[styles.arrowIcon, {marginLeft: 195}]} fill="#8F9BB3" />
					</View>
				</TouchableOpacity>
				  <Layout style={styles.imagesContainer1}>
					{shopPicsUnsaved.map((pic, index) => (
					  <Layout key={index} style={styles.imageWrapper}>
						<Button
						  style={styles.image1}
						  appearance='ghost'
						  accessoryLeft={() => (
							<Image source={{ uri: pic }} style={styles.image1} />
						  )}
						  onPress={() => {setSelImg(pic); openImgModal() }}
						/>
					  </Layout>
					))}
				  </Layout>
			</View>
		  ) : (
			  <TouchableOpacity key={index} style={styles.row} onPress={() => item.label !== 'Shop ID' ? openModal(item) : {}}>
				<Icon name={item.icon} style={styles.icon} fill={item.danger ? '#FF3D71' : '#000'} />
				<View style={styles.column}>
				  <Text category="label">{item.label}</Text>
				  <Text category='s2'>{item.value}</Text>
				</View>
				{item.label !== 'Shop ID' && (<Icon name="chevron-right-outline" style={styles.arrowIcon} fill="#8F9BB3" />)}
			  </TouchableOpacity>
		  )}
		  </>
        ))}

		<ShopInfoModal visible={shopModalVisible} onClose={handleShopModalClose} />
		
		<SubscriptionSuccessModal
			visible={successModalVisible}
			onClose={handleSuccessModalClose}
			userUrl={url}
		  />
        
		<Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text category="h6" style={styles.modalTitle}>
                Edit {selectedItem}
              </Text>
              {renderModalContent()}
              <View style={styles.modalActions}>
                <Button style={styles.button} size='small' onPress={closeModal} appearance="outline">
                  Cancel
                </Button>
                <Button style={styles.button} size='small' onPress={handleSave}>
                  Save
                </Button>
              </View>
            </View>
          </View>
        </Modal>
		
		<Modal
					visible={isModalVisible}
					transparent
					animationType="slide"
					onRequestClose={() => setIsModalVisible(false)}
				  >   
				<View style={styles.modalContainer}>
				<View style={styles.modalContent}>
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
				</View>
				</View>
			  </Modal>
				{selImg && (
						<ImageViewComponent
							imageUri={selImg}
							modalVisible={imgModalVisible}
							closeModal={closeImgModal}
						  />
				)}
				
				<Modal
				  visible={paywallVisible}
				  animationType="slide"
				  transparent={true}
				  onRequestClose={() => setPaywallVisible(false)} // Handle Android back press
				>
				  <View style={styles.modalContainer1}>
					<Layout style={styles.modalContent1}>
					  <TouchableOpacity
						style={styles.closeButton}
						onPress={handleClose}
					  >
						<Icon name="close-outline" fill="#555" style={styles.closeIcon} />
					  </TouchableOpacity>

					  <PaywallScreen setPaywallVisible={setPaywallVisible}/>
					</Layout>
				  </View>
				</Modal>
      </Layout>
	</ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  column: {
    flex: 1,
    marginLeft: 16,
  },
  icon: {
    width: 32,
    height: 32,
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
	marginLeft: -5
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
	marginTop: 5
  },
  button: {
    marginLeft: 8,
  },
  divider: {
	color: '#ccc',
	marginVertical: 5
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Wrap to the next line
    gap: 5,
	marginTop: -10,
  },
  imagesContainer1: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Wrap to the next line
    gap: 5,
	marginLeft: 20
  },
  imageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  image1: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  deleteIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 5,
  },
  deleteIconStyle: {
    width: 16,
    height: 16,
  },
  uploadWrapper: {
    width: 90,
    height: 90,
    backgroundColor: '#eaeaea',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderRadius: 8,
  },
  uploadIcon: {
    width: 32,
    height: 32,
	marginLeft: 5
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
	marginVertical: 5,
    paddingVertical: 10,
	marginLeft: 15
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
	marginHorizontal: 35
  },
  uploadButtonText: {
    textAlign: 'center',
	fontSize: 12
  },
  modalContainer1: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent1: {
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
  autocompleteInput: {width: 350, padding: 10},
  findShopButton: {
	marginTop: -10, marginLeft: -165, marginBottom: 16
  },
  listInput: {height: 200},
  formInput: {
	marginBottom: 10,
	marginHorizontal: 10,
  },
  checkbox: {marginBottom: 20}
});

export default ShopDetailsScreen;
