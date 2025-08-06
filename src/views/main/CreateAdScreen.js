import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Dimensions, Image,
  StatusBar, Animated, BackHandler, Modal as ModalRN
} from 'react-native';
import {
  Layout,
  Text,
  Card,
  Icon,
  TopNavigation,
  TopNavigationAction,
  Divider,
  BottomNavigation,
  BottomNavigationTab, useTheme, Modal, Spinner, Button
} from '@ui-kitten/components';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { KeyboardAvoidingView } from '../extra/3rd-party';
import * as ImageManipulator from 'expo-image-manipulator';
import { ArrowIosBackIcon } from "../extra/icons";
import * as eva from "@eva-design/eva";
import ColorPicker from "react-native-wheel-color-picker";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../main/UserContext';
import { supabase } from '../../constants/supabase'
import { logFirebaseEvent } from '../extra/firebaseUtils'
import { captureRef } from 'react-native-view-shot';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { useNetwork } from './NetworkContext';
import { usePermissions } from './PermissionsContext';
import { useRevenueCat } from './RevenueCatContext';
import PaywallScreen from './PaywallScreen';
import AdPreviewScreen from './AdPreviewScreen';
import TailorAdTemplates from './TailorAdTemplates';
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useRoute } from "@react-navigation/native";

const screen = Dimensions.get('window');

const UploadIcon = (props) => <Icon {...props} name='cloud-upload-outline' />;

const CreateAdScreen = ({ navigation }) => {
  const [step, setStep] = useState(0); // Track steps for ad creation
  const theme = useTheme();
  const route = useRoute();
  const { cameraPermission, mediaPermission, requestPermissions } = usePermissions();
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF"); // Background color
  const [adImageUp, setAdImageUp] = useState(null); // Uploaded image
  const [description, setDescription] = useState("Your Ad Description Here"); // Ad description
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [adFinal, setAdFinal] = useState(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showCurrentAd, setShowCurrentAd] = useState(false);
  const [pics, setPics] = useState(null);
  const [noAdPic, setNoAdPic] = useState(false);
  const [changeAdPic, setChangeAdPic] = useState(false);
  const [currentStyle, setCurrentStyle] = useState('normal');
  const viewRef = useRef(null);
  const viewRefAd = useRef(null);
  const { updateCurrentUser, currentUser } = useUser();
  const { isConnected } = useNetwork();
  const { subscriptionActive } = useRevenueCat();
  const [currentAd, setCurrentAd] = useState(null);
  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
	
	const arrowBackAction =() => {
		console.log('in arrowBackAction: ' + step);
		if (step === 3) {
			setStep(0);
		} else if (step > 0) {
			setStep(prevStep => prevStep - 1);
		} else {
			navigation.navigate('HomeMain')
		}
	}

	useEffect(() => {
		let title = 'Create Ad';
		if (step === 1) {
		  title = 'Customize Ad';
		} else if (step === 2) {
		  title = 'Finalize Ad';
		}

		navigation.setOptions({
		  headerTitle: title,
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => arrowBackAction()}/>
		  ),
		});
	  }, [navigation, step]);
  
	useEffect(() => {
		if(!isConnected) {
				 showErrorMessage("No Internet Connection");
		}
	}, []);
	
  useEffect(() => {
    const backAction = () => {
      if (step === 3) {
		setStep(0);
		return true;
	  } else if (step > 0) {
        setStep(step - 1);
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
	  const fetchExistingAd = async () => {
		try {
		  if(adFinal) {
			  setCurrentAd(adFinal);
		  } else if (currentUser?.ShopDetails.adPic) {
			const { data } = await supabase.storage
			  .from('shop-images')
			  .getPublicUrl(`adPic/${currentUser.ShopDetails.adPic}`);
			if (data?.publicUrl) {
			  setCurrentAd(data.publicUrl);
			}
		  }
		} catch (error) {
		  console.error('Error fetching existing ad:', error);
		}
	  };

	  fetchExistingAd();
	}, [currentUser?.ShopDetails.adPic, adFinal]);
	
	const saveAdModal = async() => {
	  const uri = await captureRef(viewRefAd, {
        format: 'png',
        quality: 0.8,
      });
	  logFirebaseEvent('ad_creation', {ad_type: 'precreated_ad'});
	  await saveAd(uri);
	}
	
	const saveAd = async(adImgFinal) => {
	  console.log('in saveAd ' + adImgFinal);
		try {
			setLoading(true);
			
			const manipResult = await ImageManipulator.manipulateAsync(
			  adImgFinal,
			  [{ resize: { width: 1080, height: 600 } }],
			  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
			);
			const resizedImageUri = manipResult.uri;
			
			const arraybuffer = await fetch(resizedImageUri).then((res) => res.arrayBuffer())
			const fileExt = 'jpeg';
			const path = `${Date.now()}.${fileExt}`
			const { data, error: uploadError } = await supabase.storage
									.from('shop-images/adPic')
									.upload(path, arraybuffer, {
									  contentType: 'image/jpeg',
									})

								  if (uploadError) {
										throw uploadError;
								  }
								console.log('data:')  
								console.log(data)
			const { error } = await supabase
			  .from('ShopDetails')
			  .update({ adPic: data.path, ad_created_ts: 'now()' })
			  .eq('id', currentUser.shopId)
			if(error) {
				throw error;
			}
			const { dataRemove, errorRemove } = await supabase
																	  .storage
																	  .from('shop-images')
																	  .remove(['adPic/' + currentUser.ShopDetails.adPic])
														if(errorRemove) {
															throw errorRemove;
														}
			
			const { data: data1, error: error1, status } = await supabase
									.from('profiles')
									.select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
									.eq('id', currentUser.id)
									.single()
								  if (error1 && status !== 406) {
									throw error1;
								  }
			updateCurrentUser(data1)
			logFirebaseEvent('ad_creation', {ad_type: 'custom_ad'});
			showSuccessMessage('Ad created successfully!')
			setAdFinal(adImgFinal);
			setStep(0);
			setPreviewVisible(true);
		} catch(error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	}

	// Add this component definition before your renderStep function
	const ExistingAdSection = () => {
	  if (!currentAd) return null;

	  return (
		<Card style={styles.existingAdCard}>
		  <View style={styles.existingAdHeader}>
			<LinearGradient
			  colors={['#000099', '#66b2ff']}
			  style={styles.existingAdIcon}
			  start={{ x: 0, y: 0 }}
			  end={{ x: 1, y: 1 }}
			>
			  <Icon style={styles.adIcon} fill='#FFFFFF' name='image-outline' />
			</LinearGradient>
			<Text style={styles.existingAdTitle}>Your Current Ad</Text>
		  </View>
		  
		  <View style={styles.existingAdContent}>
			<Image 
			  source={{ uri: currentAd }} 
			  style={styles.existingAdImage}
			/>
			<View style={styles.existingAdActions}>
			  
			  <TouchableOpacity 
				style={styles.actionButton}
				onPress={async() => {
				  await Sharing.shareAsync(currentAd);
				}}
			  >
				<Icon style={styles.actionIcon} fill='#000099' name='share-outline' />
				<Text style={styles.actionText}>Share</Text>
			  </TouchableOpacity>
			</View>
		  </View>
		</Card>
	  );
	};
  
const checkIfSubscribed = () => {
	if(subscriptionActive) {
		setAdImageUp(null); 
		setStep(3);
	} else {
		logFirebaseEvent('subscribe', {from_screen: 'precreated_ad'})
        setPaywallVisible(true);
	}
  }
  
  const checkIfSubscribedNew = () => {
	  console.log('in checkIfSubscribedNew')
	if(subscriptionActive) {
		setStep(1);
	} else {
		logFirebaseEvent('subscribe', {from_screen: 'custom_ad'})
        setPaywallVisible(true);
	}
  }
  
  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPaywallVisible(false);
    });
  };
  
  const handleOptionPress = (option) => {
		setIsModalVisible(false);
		console.log('mediaPermission:')
		console.log(mediaPermission)
		if (cameraPermission === null || mediaPermission === null) {
		  requestPermissions();
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
			//base64:  true,
		  });
		  console.log(result);

			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
			  const compressedSrc = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: screen.width, height: screen.height } }], { compress: 0.5 });
			  const source = { uri: compressedSrc.uri };
			  console.log(source.uri);
			  setPics(source.uri);
			}
	    } else {
			showErrorMessage('Camera permission not granted! Grant permission in Settings')
		}
	};

	const openLibraryAsync = async () => {
		if (mediaPermission === 'granted') {
		  const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			//base64:  true,
			allowsEditing: true,
			quality: 1,
		  });
		  console.log(result);

			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
			  const compressedSrc = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: screen.width, height: screen.height } }], { compress: 0.5 });
			  const source = { uri: compressedSrc.uri };
			  console.log(source.uri);
			  setPics(source.uri);
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};
  
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setAdImageUp(result.assets[0].uri);
    }
  };

  const DurationBadge = () => (
    <LinearGradient
      colors={['#000099', '#66b2ff']}
      style={styles.durationBadge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.durationText}>✨ Active for 15 days</Text>
    </LinearGradient>
  );

  const OptionCard = ({ title, description, icon, actionFn, style }) => (
      <Card style={[styles.optionCard, style]} onPress={actionFn}>
        <LinearGradient
          colors={['#000099', '#66b2ff']}
          style={styles.cardTopBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={styles.optionHeader}>
          <LinearGradient
            colors={['#000099', '#66b2ff']}
            style={styles.optionIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon style={styles.optionIcon} fill='#FFFFFF' name={icon} />
          </LinearGradient>
          <Text style={styles.optionTitle}>{title}</Text>
        </View>
        <Text style={styles.optionDescription}>{description}</Text>
      </Card>
  );

  const StepItem = ({ number, title, description }) => (
    <View style={styles.stepContainer}>
      <LinearGradient
        colors={['#000099', '#66b2ff']}
        style={styles.stepNumber}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.stepNumberText}>{number}</Text>
      </LinearGradient>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
  
  const renderStep = () => {
    if (step === 0) {
	  return (
		<SafeAreaView style={styles.container}>
          {/* Main Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Intro Section */}
            <LinearGradient
              colors={['rgba(0, 0, 153, 0.1)', 'rgba(102, 178, 255, 0.1)']}
              style={styles.introSection}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.introText}>
                Promote your tailoring business and reach new customers through the <Text style={styles.highlightText}>Thaiyal Connect</Text> app and <Text style={styles.highlightText}>thaiyalapp.in</Text> website. Your professionally designed ads will help grow your business reach.
              </Text>
              <DurationBadge />
            </LinearGradient>
			
			<ExistingAdSection />
			
			<Divider style={{marginVertical: 15}}/>

            {/* Options */}
            <View style={styles.optionsContainer}>
              <OptionCard
                title="Create New Ad"
                description="Design a professional advertisement using our intuitive editor with templates and customization options"
                icon="edit-2-outline"
                actionFn={checkIfSubscribedNew}
              />

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or</Text>
                <View style={styles.dividerLine} />
              </View>

              <OptionCard
                title="Upload Your Ad"
                description="Upload an existing advertisement from your gallery or create a new one using your own design"
                icon="cloud-upload-outline"
                actionFn={checkIfSubscribed}
              />
            </View>

            {/* Info Section */}
            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon style={styles.alertIcon} fill='#ea580c' name='alert-triangle-outline' />
                <Text style={styles.infoTitle}>Content Guidelines</Text>
              </View>
              <Text style={styles.infoText}>
                All advertisements are reviewed for quality and appropriateness. 
                Inappropriate content will be rejected to maintain platform standards.
              </Text>
            </Card>

            {/* How it Works */}
            <Card style={styles.howItWorksCard}>
              <View style={styles.howItWorksHeader}>
                <LinearGradient
                  colors={['#000099', '#66b2ff']}
                  style={styles.howItWorksIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon style={styles.questionIcon} fill='#FFFFFF' name='question-mark-circle-outline' />
                </LinearGradient>
                <Text style={styles.howItWorksTitle}>How it works</Text>
              </View>

              <View style={styles.stepsContainer}>
                <StepItem
                  number="1"
                  title="Create or Upload Ad"
                  description="Design a new ad using our templates or upload an existing one that showcases your tailoring expertise and services"
                />
                <StepItem
                  number="2"
                  title="Describe Your Business"
                  description="Add compelling details about your services, specialties, and unique offerings to attract the right customers"
                />
                <StepItem
                  number="3"
                  title="Review & Publish"
                  description="Preview your ad, make final adjustments, and publish it to start reaching potential customers in your area"
                />
              </View>
            </Card>
          </ScrollView>
        </SafeAreaView>
	  );
	}

	if (step === 1) {
		return (
          <TailorAdTemplates saveAd={saveAd}/>
      );
    }

    if (step === 3) {
		return (
          <Layout style={styles.container2}>
			  <Text category='h6' style={styles.sectionTitle}>Upload Your Ad Image</Text>
			  <Card style={styles.uploadCardAd}>
				{adImageUp ? (
				<>
				  <View ref={viewRefAd} collapsable={false}>
					<Image 
					  source={{ uri: adImageUp }} 
					  style={styles.imagePreview} 
					  resizeMode="cover"
					/>
				  </View>
					<View style={styles.imageControlsContainer}>
					  <Button
						size='small'
						style={styles.imageControlButton}
						onPress={saveAdModal}
					  >
						Save Ad
					  </Button>
					  <Button
						size='small'
						status='basic'
						style={styles.imageControlButton}
						onPress={pickImage}
					  >
						Change
					  </Button>
					</View>
				</>
				) : (
				  <View style={styles.uploadContainer}>
					<View style={styles.uploadIconContainer}>
					  <Icon
						name='image-outline'
						fill='#8F9BB3'
						style={styles.uploadPlaceholderIcon}
					  />
					</View>
					<Text appearance='hint' style={styles.uploadHint}>
					  Recommended size: 1080×600px
					</Text>
					<Button
					  accessoryLeft={UploadIcon}
					  size='small'
					  style={styles.uploadButton}
					  onPress={pickImage}
					>
					  Select Image
					</Button>
				  </View>
				)}
			  </Card>
			</Layout>
      );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000099" />
      <LinearGradient
        colors={['#000099', '#66b2ff']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
		{renderStep()}
      </LinearGradient>
	  <Modal
					visible={isModalVisible}
					backdropStyle={styles.backdrop}
					onBackdropPress={() => {setIsModalVisible(false);}}
				  >   
				<Card style={{width: 370}}>
				  <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Select Image Source</Text>
				  <View style={changeAdPic ? styles.modalOptionRow1 : styles.modalOptionRow}>
				    {options.map((option, index) => (
						<TouchableOpacity key={index} style={styles.modalOption} onPress={() => handleOptionPress(option)}>
						  <MaterialCommunityIcons name={option.iconName} size={24} color="black" style={styles.modalIcon} />
						  <Text>{option.title}</Text>
						</TouchableOpacity>
				    ))}
					{changeAdPic && (
						<TouchableOpacity style={styles.modalOption} onPress={() => {setPics(null); setNoAdPic(true); setIsModalVisible(false);}}>
							  <MaterialCommunityIcons name='delete' size={24} color="black" style={styles.modalIcon} />
							  <Text>Remove Image</Text>
						</TouchableOpacity>
					)}
				  </View>
				  <TouchableOpacity style={styles.modalOption} onPress={() => setIsModalVisible(false)}>
					<Text style={{ textAlign: 'center', marginTop: 5}}>Cancel</Text>
				  </TouchableOpacity>
				</Card>
			  </Modal>
			  
			  <Modal visible={previewVisible}
				  backdropStyle={styles.backdrop}
				  onBackdropPress={() => {setPreviewVisible(false);}}
				>
				  <Layout style={styles.modalContainer2}>
					  <Text style={styles.modalHeader}>Ad preview on Thaiyal Connect App</Text>
					  <View style={{ transform: [{ scale: 0.7 }], width: 400, height: '130%', marginTop: -40, marginBottom: -250, borderColor: 'black', borderWidth: 1, borderRadius: 8 }}>
						<AdPreviewScreen adImgs={adFinal}/>
						</View>
					  <Button size='tiny' style={styles.okButton} onPress={() => {setPreviewVisible(false); }}>OK</Button>
				  </Layout>
				</Modal>
				
				<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
				</Modal>
				
				<ModalRN
				  visible={paywallVisible}
				  animationType="slide"
				  transparent={true}
				  onRequestClose={() => setPaywallVisible(false)} // Handle Android back press
				>
				  <View style={styles.modalContainer1}>
					<Layout style={styles.modalContent}>
					  <TouchableOpacity
						style={styles.closeButton}
						onPress={handleClose}
					  >
						<Icon name="close-outline" fill="#555" style={styles.closeIcon} />
					  </TouchableOpacity>
					  <PaywallScreen setPaywallVisible={setPaywallVisible}/>
					</Layout>
				  </View>
				</ModalRN>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  backgroundGradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topNavigation: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  introSection: {
	marginTop: -10,
    padding: 25,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 153, 0.2)',
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4a5568',
    marginBottom: 15,
	textAlign: 'justify'
  },
  highlightText: {
    color: '#000099',
    fontWeight: '600',
  },
  durationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  cardTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionIcon: {
    width: 24,
    height: 24,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  optionDescription: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  infoCard: {
    backgroundColor: '#fef7f0',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 30,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  infoTitle: {
    fontWeight: '600',
    color: '#ea580c',
    fontSize: 16,
  },
  infoText: {
    color: '#c2410c',
    fontSize: 14,
    lineHeight: 20,
  },
  howItWorksCard: {
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  howItWorksIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionIcon: {
    width: 20,
    height: 20,
  },
  howItWorksTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  stepsContainer: {
    gap: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 5,
  },
  stepDescription: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomNavigation: {
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButton: {
          marginLeft: 20
  },
  modalContainer1: {
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
  existingAdCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 5,
	marginTop: -5
  },
  existingAdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  existingAdIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adIcon: {
    width: 20,
    height: 20,
  },
  existingAdTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  existingAdContent: {
    alignItems: 'center',
  },
  existingAdImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginBottom: 15,
  },
  existingAdActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  actionText: {
    color: '#000099',
    fontWeight: '500',
    fontSize: 14,
  },
  container2: {
	flex: 1,
	backgroundColor: '#f7f9fc',
	padding: 20
  },
  sectionTitle: {
    marginBottom: 16,
  },
  uploadCardAd: {
    marginTop: 0,
    minHeight: 200,
	backgroundColor: 'white',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 4,
  },
  imageControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  imageControlButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  uploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
	backgroundColor: 'white',
  },
  uploadIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
	marginTop: -10
  },
  uploadPlaceholderIcon: {
    width: 40,
    height: 40,
  },
  uploadHint: {
    marginBottom: 16,
	marginTop: -20,
    textAlign: 'center',
  },
  uploadButton: {
    marginHorizontal: 60
  },
  modalHeader: {
	  fontSize: 18,
	  fontWeight: 'bold',
	  marginBottom: -85,
	  textAlign: 'center',
	  marginTop: -140
  },
  okButton: {
	  position: 'absolute',
	  minWidth: 80,
	  bottom: 10
  },
  modalContainer2: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
	height: 750,
	width: 350,
	borderRadius: 8,
	backgroundColor: '#f7f9fc'
  }
});

export default CreateAdScreen;