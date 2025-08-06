import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { ScrollView, View, Alert, BackHandler, StyleSheet, TouchableOpacity, Dimensions, Image, StatusBar, ImageBackground, Animated, Modal as ModalRN, Keyboard, TouchableWithoutFeedback, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Layout, Button, Text, Input, Icon, Autocomplete, AutocompleteItem, Modal, Card, useTheme, Divider, Spinner, CheckBox, Toggle, Select, SelectItem} from '@ui-kitten/components';
import ImageViewComponent from '../main/ImageViewComponent';
import PaywallScreen from '../main/PaywallScreen';
import { KeyboardAvoidingView } from '../extra/3rd-party';
import { logFirebaseEvent } from '../extra/firebaseUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../constants/supabase';
import keys from "../../constants/Keys";
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import {
  PhoneIcon
} from '../extra/icons';
import { useUser } from '../main/UserContext';
import { useRevenueCat } from '../main/RevenueCatContext';
import { usePermissions } from '../main/PermissionsContext';
import { storage } from '../extra/storage';
import { locationWorkerInstance } from '../extra/LocationWorker';
import ShopInfoModal from '../extra/ShopInfoModal';
import SubscriptionSuccessModal from '../main/SubscriptionSuccessModal';

const AddressInputScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute();
  const { subscriptionActive } = useRevenueCat();
  const { session, shopPhNo } = route.params;
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [url, setUrl] = useState(null);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [shopName, setShopName] = useState('');
  const [finalData, setFinalData] = useState(null);
  const [shopIdMaps, setShopIdMaps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [phoneErrorValid, setPhoneErrorValid] = useState(false);
  const [shopNameError, setShopNameError] = useState(false)
  const [pincodeError, setPincodeError] = useState(false)
  const [selImg, setSelImg] = useState(null)
  const [pincode, setPincode] = useState('');
  const autocompleteRef = useRef(null);
  const [places, setPlaces] = useState([]);
  const [pics, setPics] = useState([]);
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [existingImgCount, setExistingImgCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const MAX_FREE_IMAGES = 2;
  const [remSlots, setRemSlots] = useState(MAX_FREE_IMAGES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [spIndex, setSpIndex] = useState([]);
  const [sp, setSp] = useState(null); 
  const [spArr, setSpArr] = useState(null); 
  const [spError, setSpError] = useState(false);
  const spServices = ['None', 'Wedding', 'Bridal', 'Suits', 'Casual-wear', 'Kids', 'Ethnic', 'Western', 'Alterations'];
  
  useEffect(() => {
    const backAction = async() => {
      const {error: error2} = await supabase
            .from('profiles')
            .delete()
            .eq('id', session.user.id)
      navigation.navigate('RegisterScreen', {session});
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  const API_KEY = keys.ola_maps_api_key;
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const options = [
      { title: 'Take Photo', iconName: 'camera' },
      { title: 'Choose from Gallery',iconName: 'image' },
    ];
  const openModal = () => {
    setImgModalVisible(true);
  };

  const closeModal = () => {
    setImgModalVisible(false);
  };
  
  const handleShopModalClose = (data) => {
    setShopModalVisible(false);
    if (data.shopName && data.shopAddress) {
      setShopName(data.shopName + ', ' + data.shopAddress);
    setShopNameError(false);
    }
  };

  const [value, setValue] = useState("")
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
        setShopName("")
        setShopIdMaps('')
        setPincodeError(false)
        setPincode('')
        setChecked(false)
        setPics([])
    });
    return () => unsubscribe();
  }, [navigation]);
    
  const fetchPlaces = async (query) => {
    try {
      console.log('in fetchPlaces')
      
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
          const filteredPlaces = data.predictions
          .filter((prediction, index, self) => 
            index === self.findIndex(p => 
            p.description.toLowerCase() === prediction.description.toLowerCase()
            )
          );
          console.log('filteredPlaces:')
          console.log(filteredPlaces)
        setPlaces(filteredPlaces.map(prediction => ({
            description: prediction.description,
            place_id: prediction.place_id
          })));
      } 
      
    } catch (error) {
      console.error(error);
    }
  };
    
  useEffect(() => {
    if (shopName.length > 2) { // Trigger fetch when the input is more than 2 characters
      console.log("in useEffect " + shopName)
      fetchPlaces(shopName);
    }
  }, [shopName]);
    
  const onCheckedChange = (isChecked) => {
    setChecked(isChecked);
  };
    
  function isValidPhoneNumber(phoneNo) {
    const phoneRegex = /^(?:\+91|91)?\d{10}$/;
    return phoneRegex.test(phoneNo);
  }
  
  const handleSelectSp = (index) => {
    setSpIndex(index);
    const selectedServices = index.map(i => spServices[i.row]);
    const commaSeparatedSp = selectedServices.join(', ');
    setSpArr(selectedServices);
    setSp(commaSeparatedSp);
    setSpError(false);
  };

  const handleSubscribe = () => {
    logFirebaseEvent('subscribe', {from_screen: 'shop_images'}); 
    setPaywallVisible(true);
  }
    
  const saveAddress = async () => {
  console.log(shopName)
  const [firstPart, ...rest] = shopName.split(",");

      const selectedPlace = firstPart.trim();
      const selectedPlaceAddress = rest.join(",").trim();

      console.log("selected shop: " + selectedPlace + ',' + selectedPlaceAddress)
  if (selectedPlace === '' || shopName === 'Type something to search') {
    setShopNameError(true)
    showErrorMessage('Please enter a valid shop location!')
    } else if (selectedPlaceAddress === '') {
    setShopNameError(true)
    showErrorMessage('Please enter a valid shop address!')
    } else if (pincode.trim() === '' || pincode.length < 6) {
    setPincodeError(true)
    showErrorMessage('Please enter a valid pincode!')
    } else if(!sp){
      setSpError(true);
      showErrorMessage('Please select a specialization!')
  } else {	
        try {
          setLoading(true);
          const { data: { session }, error } = await supabase.auth.getSession()
            console.log(session);
        if(session) {
          setExistingImgCount(pics.length);
          let shopPicsArr = [];
            let a = await Promise.all(
              pics.map(async(pic) => {
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
            console.log(shopIdMaps + ',' + selectedPlace + ',' + selectedPlaceAddress)
            
            const { data: dataCount, error: errorCount } = await supabase.rpc("check_existing_shop", {
              parameter1: session.user.id,
              parameter2: shopIdMaps,
              parameter3: selectedPlace,
              parameter4: selectedPlaceAddress
            }).select().single();

            if(errorCount) {
              throw errorCount;
            }
            console.log(dataCount.count)
            
            if(dataCount.count > 0) {
              closeModal();
              showErrorMessage('Selected shop is already linked with another user');
            } else {
              const {count, error: perror} = await supabase
                  .from('PincodeMapping')
                  .select('*', { count: 'exact', head: true })
                  .eq('pincode', pincode)
              if(perror) {
                throw perror;
              }
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
              const { data: data2, error: error2 } = await supabase
              .from('ShopDetails')
              .upsert(
                { shopName: selectedPlace, shopAddress: selectedPlaceAddress, shopPhNo: shopPhNo, shopPics: shopPicsArr.length > 0 ? shopPicsArr : null, homeMeasurement: checked, topServices: spArr, websiteConsent: consentChecked, pincode: pincode, maps_place_id: shopIdMaps},
                {onConflict: 'maps_place_id, shopName, shopAddress'})
              .select().single();

                if (error2) {
                console.error('Error upserting user:', error2);
                throw error2;
                } 
                console.log('Inserted shop:', data2);
                console.log(data2.id)
                logFirebaseEvent('shop_sign_up');
                
                const { data: data1, error: error1 } = await supabase
                  .from('profiles')
                  .update({ shopId: data2.id, signupStep: 2 })
                  .eq('id', session.user.id)
                  .select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
                  .maybeSingle();
                  
                  if(error1) {
                      throw error1;
                  }
                  console.log(data1)
                  if(data1) {
                  if(data1.subscribed) {
                    setUrl("https://thaiyalapp.in/" + data1.ShopDetails.slug);
                    setFinalData(data1);
                    setSuccessModalVisible(true);
                  } else {
                    navigation.reset({
                      index: 0,
                      routes: [{name: "MainScreen", params: { data1: data1, newUser: true }}]
                    });
                  }
                  } else {
                      showErrorMessage('Shop Details not created!')
                  }
            } 
           } else {
             throw new Error('No user on the session!')
           }
        } catch (error) {
          showErrorMessage('Error updating shop details: ' + error.message);
        } finally {
            setShopName("")
            setShopIdMaps(null)
            setPincodeError(false)
            setPincode('')
            setPics([])
            setExistingImgCount(0);
            setLoading(false);
        }
      }
  };
  
  const handleSuccessModalClose = () => {
  setSuccessModalVisible(false);
  navigation.reset({
    index: 0,
    routes: [{name: "MainScreen", params: { data1: finalData, newUser: true }}]
  });
  }
  
  const onSelect = useCallback((index) => {
      console.log(" in onselect " + places[index])
      setShopName(places[index].description);
      setShopIdMaps(places[index].place_id);
    }, [places]);

    const onChangeText = useCallback(async (query) => {
      console.log("in onchangetext " + query)
        setShopName(query);
    }, []);

    const clearSearch = () => {
        setShopName('');
        setShopIdMaps(null);
        setPlaces(['Type something to search'])
        console.log("cleared search")
    };
    
    const checkAndPickImage = () => {
      if (!subscriptionActive) {
        logFirebaseEvent('max_shop_images');
        const remainingSlots = Math.max(0, MAX_FREE_IMAGES - existingImgCount);
              
        if(remainingSlots === 0) {
			
				console.log('slots reached')
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
    const newImages = [...pics];
    newImages.splice(index, 1);
    setPics(newImages);
    setExistingImgCount(newImages.length);
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
        console.log(source);
        setPics(pics => [...pics, source.uri]);
        setRemSlots(prevSlots => prevSlots - 1);
        setExistingImgCount(prevCount => prevCount + 1);
      }
    } else {
      showErrorMessage('Camera permission not granted! Grant permission in Settings')
    }
  };

  const openLibraryAsync = async () => {
    if (mediaPermission !== 'denied') {
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
            setPics(pics => [...pics, source.uri]);
          })
          setRemSlots(prevSlots => prevSlots - selectedImages.length);
          setExistingImgCount(prevCount => prevCount + selectedImages.length);
      }
    } else {
      showErrorMessage('Media permission not granted! Grant permission in Settings')
    }
  };

  
  const CustomDivider = () => <Divider style={styles.customDivider} />;
  
  const renderIcon = (props) => (
    <Icon {...props} name='search' />
  );
    
  const renderCloseIcon = (props) => (
      <TouchableOpacity onPress={clearSearch}>
      <Icon {...props} name='close-outline' />
    </TouchableOpacity>
  );
    
  const PincodeIcon = (style: ImageStyle): IconElement => {
    return (
    <Icon {...style} name='pin-outline' fill={theme['color-primary-100']}/>
    )
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
    
  const handleSelect = (item) => {
    setShopName(item.description);
    setShopIdMaps(item.place_id);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };
    
  const RenderItem = memo(({ item, onSelect }) => (
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
    <RenderItem item={item} onSelect={handleSelect} />
  ), [handleSelect]);

  return (
    <Layout style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <ImageBackground
          source={require('../../../assets/tailor_shop.jpg')}
          style={styles.heroImage}
        >
        </ImageBackground>
      </View>

      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowSuggestions(false);
          Keyboard.dismiss();
        }}>
		
          <View style={styles.formContainer}>
            <Text style={styles.heroTitle}>Shop Details</Text>
            
            {/* Basic Information Section */}
            <Card style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <Input
                  status={shopNameError ? 'danger' : 'basic'}
                  style={styles.input}
                  accessoryLeft={renderIcon}
                  accessoryRight={shopName ? renderCloseIcon : null}
                  value={shopName}
                  onChangeText={onChangeText}
                  onFocus={() => setShowSuggestions(true)}
                  label="Shop name and address *"
				  placeholder="Type here to search for your shop"
                />
                
                {/* Suggestions List */}
                {showSuggestions && places.length > 0 && (
                  <View style={styles.suggestionsList}>
                    <FlatList
                      data={places}
                      keyExtractor={(item, index) => index.toString()}
                      keyboardShouldPersistTaps="handled"
                      renderItem={renderItem}
                      scrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                      maxToRenderPerBatch={10}
                      windowSize={10}
                      style={styles.flatList}
                    />
                  </View>
                )}
                
                <Button 
                  appearance='ghost' 
                  style={styles.helpLink} 
                  size='medium' 
                  onPress={() => setShopModalVisible(true)}
                >
                  Can't find your shop? Click here
                </Button>
              </View>

              <View style={styles.formGroup}>
                <Input
                  status={pincodeError ? 'danger' : 'basic'}
                  style={styles.input}
                  keyboardType='numeric'
                  maxLength={6}
                  accessoryRight={PincodeIcon}
                  value={pincode}
				  label='Pincode *'
                  onChangeText={setPincode}
                />
              </View>

              <View style={styles.formGroup}>
                <Select
                  status={spError ? 'danger' : 'basic'}
                  multiSelect={true}
                  selectedIndex={spIndex}
                  onSelect={handleSelectSp}
                  value={sp}
                  label="Specialization *"
                >
                  {spServices.map((option, index) => (
                    <SelectItem title={option} key={index} />
                  ))}
                </Select>
              </View>
            </Card>

            {/* Additional Details Section */}
            <Card style={styles.formSection} disabled>
              <Text style={styles.sectionTitleOptional}>
                Additional Details 
              </Text>
			  
                <Text style={styles.optionalTag}> (Optional - Showcases your work and services clearly)</Text>
              
              <View style={styles.formGroupCompact}>
                <Text style={styles.fieldLabelOptional}>Shop Images</Text>
                <TouchableOpacity 
                  style={styles.imageUploadCompact} 
                  onPress={checkAndPickImage}
                  disabled={!shopName || !pincode}
                >
                  <View style={styles.uploadIconCompact}>
                    <Icon 
                      name="camera-outline" 
                      style={styles.uploadIcon} 
                      fill={(!shopName || !pincode) ? theme['color-basic-500'] : theme['color-primary-500']}
                    />
                  </View>
                  <Text style={styles.uploadTextCompact}>Add photos of your shop</Text>
                </TouchableOpacity>
                
                {/* Image Preview */}
                {pics.length > 0 && (
                  <ScrollView 
                    horizontal 
                    style={styles.imagePreview}
                    showsHorizontalScrollIndicator={true}
					persistentScrollbar={true}
                  >
                    {pics.map((image, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteImage(index)}
                        >
                          <Icon name="close-outline" style={styles.deleteIcon} fill="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {setSelImg(image); openModal()}}>
                          <Image source={{uri: image}} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.formGroupCompact}>
                <View style={styles.toggleGroup}>
                  <Text style={styles.toggleLabel}>
                    Willing to take home measurements for customers?
                  </Text>
                  <Toggle
                    checked={checked}
                    onChange={onCheckedChange}
                    style={styles.toggle}
                  />
                </View>
              </View>
            </Card>
			
			<View style={styles.formGroupCompact}>
                <View style={styles.checkboxGroupCompact}>
                  <CheckBox
                    checked={consentChecked}
                    onChange={setConsentChecked}
                    style={styles.checkbox}
                  />
                  <Text style={styles.checkboxText}>
                    Display my shop profile on thaiyalapp.in website and Thaiyal Connect app
                  </Text>
                </View>
              </View>

            <Button 
              style={styles.saveButton} 
              onPress={saveAddress}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </Button>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={isModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setIsModalVisible(false)}
      >   
        <Card>
          <Text style={styles.modalTitle}>Select Image Source</Text>
          <View style={styles.modalOptionRow}>
            {options.map((option, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.modalOption} 
                onPress={() => handleOptionPress(option)}
              >
                <MaterialCommunityIcons 
                  name={option.iconName} 
                  size={24} 
                  color="black" 
                  style={styles.modalIcon} 
                />
                <Text>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.modalCancel} 
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
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
          closeModal={closeModal}
        />
      )}
      
      <ShopInfoModal visible={shopModalVisible} onClose={handleShopModalClose} />
      
      <SubscriptionSuccessModal
        visible={successModalVisible}
        onClose={handleSuccessModalClose}
        userUrl={url}
      />
      
      <ModalRN
        visible={paywallVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPaywallVisible(false)}
      >
        <View style={styles.modalContainer1}>
          <Layout style={styles.modalContent1}>
            <TouchableOpacity
              style={styles.closeButton} 
              onPress={handleClose}
            >
              <Icon name="close-outline" style={styles.closeIcon} fill="#fff" />
            </TouchableOpacity>
            <PaywallScreen
              setPaywallVisible={setPaywallVisible}
			  stay={true}
            />
          </Layout>
        </View>
      </ModalRN>
    </Layout>
  );
};
const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  heroSection: {
    height: 280,
    overflow: 'hidden',
  },
  heroImage: {
	width: width,
    height: height * 0.35,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    overflow: 'hidden',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
	marginVertical: 5
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  formSection: {
    marginVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
	borderBottomColor: '#e9ecef',  
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 20,
  },
  sectionTitleOptional: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  optionalTag: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '400',
	borderBottomColor: '#e9ecef',  
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 20,
	marginLeft: -5
  },
  formGroup: {
    marginBottom: 24,
  },
  formGroupCompact: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#495057',
  },
  fieldLabelOptional: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
    color: '#6c757d',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  helpLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
	marginBottom: -15,
	marginLeft: -10
  },
  suggestionsList: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  flatList: {
    maxHeight: 200,
  },
  imageUploadCompact: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f8f9fa',
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadIconCompact: {
    width: 24,
    height: 24,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    width: 14,
    height: 14,
  },
  uploadTextCompact: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '400',
  },
  imagePreview: {
    marginTop: 12,
    maxHeight: 100,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
	marginTop: 10
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    elevation: 2,
  },
  deleteIcon: {
    width: 12,
    height: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
    fontWeight: '400',
  },
  toggle: {
    marginLeft: 12,
  },
  checkboxGroupCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    gap: 12,
	marginTop: 10,
	marginBottom: -20
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxText: {
    color: '#6c757d',
    fontSize: 14,
    lineHeight: 18,
    flex: 1
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 8,
    paddingVertical: 16
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  modalOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 100,
  },
  modalIcon: {
    marginBottom: 8,
  },
  modalCancel: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    marginTop: 8,
  },
  modalCancelText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  modalContainer1: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent1: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 24,
    height: 24,
  },
  customDivider: {
    backgroundColor: '#e9ecef',
    height: 1,
    marginVertical: 8,
  },
});

export default AddressInputScreen;