import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  Modal,
  Card,
  Text,
  Button,
  Input,
  Layout,
  Icon,
  Divider,
  TopNavigation,
  TopNavigationAction,
  Spinner,
} from '@ui-kitten/components';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Image, Modal as ModalRN, Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import { Buffer } from 'buffer';
import { supabase } from '../../constants/supabase'
import PaywallScreen from './PaywallScreen';
import UPIQRModal from './UPIQRModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRevenueCat } from '../main/RevenueCatContext';
import { usePermissions } from '../main/PermissionsContext';
import { logFirebaseEvent } from '../extra/firebaseUtils';

// Icons
const CloseIcon = (props) => <Icon {...props} name='close-outline' />;
const CameraIcon = (props) => <Icon {...props} name='camera-outline' />;
const ClockIcon = (props) => <Icon {...props} name='clock-outline' />;
const CreditCardIcon = (props) => <Icon {...props} name='credit-card-outline' />;
const InstagramIcon = (props) => <Icon {...props} name='globe-outline' />;
const CheckIcon = (props) => <Icon {...props} name='checkmark-circle-2' />;
const ChevronRightIcon = (props) => <Icon {...props} name='chevron-right-outline' />;
const StarIcon = (props) => <Icon {...props} name='star-outline' />;

const ProfileCompletionModal = ({ visible, onClose, currentUser, onUpdate, firstOrder }) => {
	console.log(currentUser)
  const [formData, setFormData] = useState({
    yearsOfExp: currentUser?.yearsOfExp || '',
    socialMediaAcct: currentUser?.ShopDetails?.socialMediaAcct || '',
    shopPics: currentUser?.ShopDetails.shopPics || [],
    upiQRCode_url: currentUser?.upiQRCode_url || '',
  });
  
  // Single temporary object for all changes
  const [tempChanges, setTempChanges] = useState({});
  
  const { subscriptionActive } = useRevenueCat();
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [existingImgCount, setExistingImgCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const MAX_FREE_IMAGES = 2;
  const [remSlots, setRemSlots] = useState(MAX_FREE_IMAGES);
  
  const [loading, setLoading] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [tempInputValue, setTempInputValue] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  
  // Completion refs for all checklist items
  const shopImagesCompletionRef = useRef(!!(currentUser?.ShopDetails?.shopPics && currentUser?.ShopDetails?.shopPics.length > 0));
  const upiCompletionRef = useRef(!!currentUser?.upiQRCode_url);
  const experienceCompletionRef = useRef(!!currentUser?.yearsOfExp);
  const socialMediaCompletionRef = useRef(!!(currentUser?.ShopDetails?.socialMediaAcct && currentUser?.ShopDetails?.socialMediaAcct !== ''));
  
  const [upiQRref, setUpiQRref] = useState(null);
  const [upiModal, setUpiModal] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const options = [
      { title: 'Take Photo', iconName: 'camera' },
      { title: 'Choose from Gallery',iconName: 'image' },
    ];
	
  const checklistItems = useMemo(() => [
    {
      id: 'shopImages',
      title: 'Add Shop Photos',
      description: 'Show customers your workspace',
      icon: CameraIcon,
      isCompleted: formData.shopPics && formData.shopPics.length > 0,
      field: 'shopPics',
      inputType: 'images',
      completionRef: shopImagesCompletionRef
    },
    {
      id: 'upiQR',
      title: 'Add UPI QR Code',
      description: 'Get paid faster with digital payments',
      icon: CreditCardIcon,
      isCompleted: formData.upiQRCode_url ? true : false,
      field: 'upiQRCode_url',
      inputType: 'upi',
      completionRef: upiCompletionRef
    },
    {
      id: 'experience',
      title: 'Add Years of Experience',
      description: 'Build trust with your expertise',
      icon: ClockIcon,
      isCompleted: formData.yearsOfExp ? true : false,
      field: 'yearsOfExp',
      inputType: 'number',
      completionRef: experienceCompletionRef
    },
    {
      id: 'instagram',
      title: 'Add Insta/Facebook ID',
      description: 'Showcase your work to more customers',
      icon: InstagramIcon,
      isCompleted: formData.socialMediaAcct && formData.socialMediaAcct !== '' ? true : false,
      field: 'socialMediaAcct',
      inputType: 'text',
      completionRef: socialMediaCompletionRef
    }
  ], [formData]);

  const incompleteItems = checklistItems.filter(item => !item.isCompleted);
  const completedCount = checklistItems.length - incompleteItems.length;
  const totalCount = checklistItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  const handleItemPress = (item) => {
	  console.log(item);
    //if (item.isCompleted) return;
    
    if (item.inputType === 'images') {
      checkAndPickImage();
    } else {
		if(item.inputType === 'upi') {
		  setUpiModal(true);
		} else {
		  setActiveModal(item.id);
		  console.log(formData[item.field])
		  setTempInputValue(formData[item.field] || '');
		}
    }
  };
  
  const handleSubscribe = () => {
    logFirebaseEvent('subscribe', {from_screen: 'shop_images'}); 
    setPaywallVisible(true);
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

  const handleInputChange = useCallback((field, value) => {
    console.log('handleInputChange called with:', { field, value });
    
    if (field === 'upiQRCode_url') {
      // Store UPI data in temp changes
      setTempChanges(prev => ({ ...prev, [field]: value }));
	  upiCompletionRef.current = true;
    } else if (field === 'shopPics') {
      // Handle shop images - add to existing temp shopPics or create new array
      setTempChanges(prev => ({
        ...prev,
        [field]: [...(prev[field] || formData[field] || []), value]
      }));
      shopImagesCompletionRef.current = true;
    } else if (field === 'yearsOfExp') {
      // Handle years of experience
      setTempChanges(prev => ({
        ...prev,
        [field]: value
      }));
      experienceCompletionRef.current = !!value;
    } else if (field === 'socialMediaAcct') {
      // Handle social media account
      setTempChanges(prev => ({
        ...prev,
        [field]: value
      }));
      socialMediaCompletionRef.current = !!(value && value !== '');
    } else {
      // Handle other fields normally
      setTempChanges(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }, [formData]);

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
        //setPics(pics => [...pics, source.uri]);
        handleInputChange('shopPics', source.uri);
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
            //setPics(pics => [...pics, source.uri]);
			handleInputChange('shopPics', source.uri);
          })
          setRemSlots(prevSlots => prevSlots - selectedImages.length);
          setExistingImgCount(prevCount => prevCount + selectedImages.length);
      }
    } else {
      showErrorMessage('Media permission not granted! Grant permission in Settings')
    }
  };

  const handleModalSave = () => {
    const currentItem = checklistItems.find(item => item.id === activeModal);
      if (tempInputValue.trim()) {
        handleInputChange(currentItem.field, tempInputValue);
        setActiveModal(null);
        setTempInputValue('');
      } else {
        Alert.alert('Error', 'Please enter a value');
      }
  };

  const handleModalCancel = () => {
    setActiveModal(null);
    setTempInputValue('');
  };

  const handleSave = async () => {
    try {
		setTempInputValue('');
		setUpiId('');
		setQrCodeVisible(false);
		console.log('in handleSave')
		console.log(tempChanges);
      // Merge formData with tempChanges for the final data
	  //const finalData = { ...formData, ...tempChanges };
      await onUpdate(tempChanges);
      Alert.alert('Success', 'Profile updated successfully!');
      onClose();
    } catch (error) {
		console.log(error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  
  const generateUPIString = (upiVal) => {
    const baseUrl = 'upi://pay';
    const params = [
      `pa=${upiVal}`,
      //payeeName ? `pn=${encodeURIComponent(payeeName)}` : '',
      'cu=INR'
    ].join('&');

    return `${baseUrl}?${params}`;
  };

  const renderInputModal = () => {
    const currentItem = checklistItems.find(item => item.id === activeModal);
    if (!currentItem) return null;

    return (
      <Modal
        visible={activeModal !== null}
        backdropStyle={styles.backdrop}
        style={styles.inputModal}
      >
        <Card style={styles.inputModalCard}>
          <TopNavigation
            title={() => <Text category='h6' style={{width: 200}}>{currentItem.title}</Text>}
            accessoryRight={() => (
              <TopNavigationAction
                icon={CloseIcon}
                onPress={handleModalCancel}
				style={{position: 'absolute', top: -40, right: -35}}
              />
            )}
          />
          <Divider />
          
          <View style={styles.inputModalContent}>
            {currentItem.inputType === 'upi' ? (
              <View>
                <Text category='s1' style={styles.inputLabel}>
                  Enter your UPI ID:
                </Text>
                <Input
                  placeholder="example@paytm"
                  value={upiId}
                  onChangeText={setUpiId}
                  style={styles.modalInput}
                />
                {!qrCodeVisible ? (
					<Button
					  style={styles.generateButton}
					  onPress={() => setQrCodeVisible(true)}
					  disabled={loading.qrGeneration}
					  accessoryLeft={loading.qrGeneration ? Spinner : undefined}
					  size='small'
					>
					  {loading.qrGeneration ? 'Generating...' : 'Generate QR Code'}
					</Button>
				) : (
					<View style={{width: 200, justifyContent: 'center', alignItems: 'center'}}>
					  <Text style={styles.qrCodeText}>UPI QR Code</Text>
					  	<QRCode
							value={generateUPIString(upiId)}
							getRef={(c) => setUpiQRref(c)}
							logoSize={30}
							logoBackgroundColor='white'
							quietZone={20}
						/>
						<Button
							size='small'
						  onPress={handleModalSave}
						  style={styles.saveButton}
						>
						  Save
						</Button>
					</View>
				)}
              </View>
            ) : (
              <View>
                <Input
                  placeholder={
                    currentItem.inputType === 'number' 
                      ? 'e.g., 5' 
                      : '@username'
                  }
                  value={tempInputValue}
                  onChangeText={setTempInputValue}
                  keyboardType={currentItem.inputType === 'number' ? 'numeric' : 'default'}
                  style={styles.modalInput}
                />
				<Button
						size='small'
					  onPress={handleModalSave}
					  style={styles.saveButton}
					>
					  Save
					</Button>
              </View>
            )}
            
            
          </View>
        </Card>
      </Modal>
    );
  };
  
  const renderChecklistItem = (item) => {
	  
	let isCompletedCheck = item.isCompleted || item.completionRef.current;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.itemHeader,
          isCompletedCheck && styles.completedItem
        ]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemLeft}>
          <View style={styles.iconTitleRow}>
            <View style={[
              styles.iconContainer,
              isCompletedCheck && styles.completedIconContainer
            ]}>
              {isCompletedCheck ? (
                <CheckIcon style={styles.completedIcon} />
              ) : (
                <item.icon style={styles.icon} />
              )}
            </View>
            <Text category='s1' style={[
              styles.itemTitle,
              isCompletedCheck && styles.completedText
            ]}>
              {item.title}
            </Text>
          </View>
          <Text category='c1' style={[
            styles.itemDescription,
            isCompletedCheck && styles.completedDescription
          ]}>
            {item.description}
          </Text>
        </View>
        {loading[item.field] && <Spinner size='small' />}
      </TouchableOpacity>
    );
  };

  if (incompleteItems.length === 0) {
    return null;
  }
  
  const handleUpiClose = () => {
	  console.log('UPI Modal closing...');
	  setUpiModal(false);
	  // Add this to see if something else is closing the profile modal
	  console.log('Profile modal should still be open');
	}

  return (
    <>
      <Modal
        visible={visible}
        backdropStyle={styles.backdrop}
        style={styles.modal}
      >
        <Card style={styles.card}>
		<ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[
              styles.headerIcon,
              firstOrder && styles.firstOrderHeaderIcon
            ]}>
              {firstOrder ? (
                <StarIcon style={styles.headerIconStyle} />
              ) : (
                <CheckIcon style={styles.headerIconStyle} />
              )}
            </View>
            <Text category='h6' style={styles.headerTitle}>
              {firstOrder ? 'Great Job on Your First Order!' : 'Complete Your Profile'}
            </Text>
            {firstOrder && (
              <Text category='s1' style={styles.headerSubtitle}>
                Boost your business with these profile enhancements
              </Text>
            )}
          </View>

          <View style={styles.checklist}>
            {checklistItems.map((item, index) => (
              <View 
                key={item.id} 
                style={[
                  styles.itemWrapper,
                  styles.halfWidth
                ]}
              >
                {renderChecklistItem(item)}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Button
              appearance="ghost"
              onPress={onClose}
            >
              {firstOrder ? 'Maybe Later' : 'Skip for now'}
            </Button>
			<Button
              onPress={handleSave}
              disabled={incompleteItems.length === checklistItems.length}
            >
              {firstOrder ? 'Enhance Profile' : 'Save Progress'}
            </Button>
          </View>
		  
		  <Divider/>
		  <Text category='s2' appearance='hint' style={styles.hint}>
            * You can update these values anytime in Settings under the Profile icon.
          </Text>
		  </ScrollView>
        </Card>
      </Modal>

      {renderInputModal()}
	  
	  <UPIQRModal
        visible={upiModal}
        onCloseUpi={handleUpiClose}
		currentUser={currentUser}
		handleInputChange={handleInputChange}
      />
	  
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
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    marginRight: 30
  },
  inputModalContent: {
    padding: 20,
  },
  inputModalCard: {
	width: 300
  },
  inputLabel: {
    marginBottom: 12,
    fontWeight: '600',
  },
  modalInput: {
    marginBottom: 16,
  },
  generateButton: {
    marginBottom: 20,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeLabel: {
    marginBottom: 12,
    fontWeight: '600',
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  inputModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalSaveButton: {
    flex: 1,
    marginRight: 8,
  },
  modalCancelButton: {
    flex: 1,
    marginLeft: 8,
  },
  content: {
    maxHeight: 500,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  firstOrderHeaderIcon: {
    backgroundColor: '#FFF4E6',
  },
  headerIconStyle: {
    width: 32,
    height: 32,
    tintColor: '#3366FF',
  },
  headerTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
    color: '#8F9BB3',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#EDF1F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3366FF',
  },
  progressText: {
    color: '#8F9BB3',
  },
  checklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemWrapper: {
    marginBottom: 12,
  },
  fullWidth: {
    width: '100%',
  },
  halfWidth: {
    width: '48%',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF1F7',
    backgroundColor: '#FFFFFF',
    height: 130
  },
  completedItem: {
    backgroundColor: '#F7F9FC',
    borderColor: '#00E096',
  },
  itemLeft: {
    flex: 1,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDF1F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  completedIconContainer: {
    backgroundColor: '#E8F5E8',
  },
  icon: {
    width: 16,
    height: 16,
    tintColor: '#8F9BB3',
  },
  completedIcon: {
    width: 16,
    height: 16,
    tintColor: '#00E096',
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: '600',
    textWrap: 'wrap',
    width: 90
  },
  completedText: {
    color: '#00E096',
  },
  itemDescription: {
    color: '#8F9BB3',
    paddingHorizontal: 5,
    marginTop: 5,
    width: 120
  },
  completedDescription: {
    color: '#00B383',
  },
  chevron: {
    width: 20,
    height: 20,
    tintColor: '#8F9BB3',
  },
  rotatedChevron: {
    transform: [{ rotate: '90deg' }],
  },
  footer: {
    padding: 16,
    paddingTop: 8,
	flexDirection: 'row',
	gap: 20
  },
  saveButton: {
	marginHorizontal: 60 
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
  hint: {
	lineHeight: 20,
	marginVertical: 10
  }
});

export default ProfileCompletionModal;