import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import {
  Modal,
  Layout,
  Text,
  Input,
  Select,
  SelectItem,
  Button,
  Card,
  Divider,
  IndexPath,
  Icon,
  TopNavigation,
  TopNavigationAction,
  useTheme,
  Datepicker
} from '@ui-kitten/components';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { usePermissions } from '../main/PermissionsContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import moment from 'moment';
import { useNavigation, useRoute } from "@react-navigation/native";
import { storage } from '../extra/storage';
import eventEmitter from '../main/eventEmitter';

const { width } = Dimensions.get('window');

// Custom Icons
const PersonIcon = (props) => <Icon {...props} name='person-outline' />;
const PhoneIcon = (props) => <Icon {...props} name='phone-outline' />;
const FileIcon = (props) => <Icon {...props} name='file-outline' />;
const AlertIcon = (props) => <Icon {...props} name='alert-triangle-outline' />;
const DollarIcon = (props) => <Icon {...props} name='credit-card-outline' />;
const UploadIcon = (props) => <Icon {...props} name='cloud-upload-outline' />;
const ArrowUpIcon = (props) => <Icon {...props} name='arrow-upward-outline' />;
const CameraIcon = (props) => <Icon {...props} name='camera-outline' />;  
const CloseIcon = (props) => <Icon {...props} name="close-outline" style={styles.closeIcon}/>;
const TrashIcon = (props) => <Icon {...props} name="trash-2-outline" style={styles.closeIcon}/>;

const EmployeeOnboardingForm = () => {
  const navigation = useNavigation();
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [idProofIndex, setIdProofIndex] = useState(new IndexPath(0));
  const [salaryTypeIndex, setSalaryTypeIndex] = useState(new IndexPath(0));
  const [rel1Index, setRel1Index] = useState(new IndexPath(0));
  const [rel2Index, setRel2Index] = useState(new IndexPath(0));
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const theme = useTheme();
  const route = useRoute();
  const [deletedImages, setDeletedImages] = useState([]);
  const {employeeParam, idImgs, onEditComplete} = route.params || {};
  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
	
  const idProofTypes = [
    'Select ID type',
    'Driver\'s License',
    'PAN Card',
    'Aadhar Card'
  ];

  const relationshipTypes = [
    'Select',
    'Spouse',
    'Parent',
    'Sibling',
    'Child',
    'Friend',
    'Other'
  ];

  const salaryTypes = [
    'Select',
    'Per Day',
    'Per Month'
  ];
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phoneNo: '',
    dob: new Date(),
    anniversary: new Date(),
    idProofType: idProofTypes[0],
    idProofPic: null,
    emergencyPhNo1: '',
    emergencyPhNo2: '',
    emergencyRelation1: relationshipTypes[0],
    emergencyRelation2: relationshipTypes[0],
	designation: '',
    salary: '',
    salaryType: salaryTypes[0]
  });
  
  useEffect(() => {
	  if(employeeParam) {
		console.log('idImgs', idImgs);
		setFormData({
			name: employeeParam.name,
			phoneNo: employeeParam.phoneNo,
			dob: new Date(employeeParam.dob),
			anniversary: new Date(employeeParam.anniversary),
			idProofType: employeeParam.idProofType,
			idProofPic: idImgs,
			emergencyPhNo1: employeeParam.emergencyPhNo1,
			emergencyPhNo2: employeeParam.emergencyPhNo2,
			emergencyRelation1: employeeParam.emergencyRelation1,
			emergencyRelation2: employeeParam.emergencyRelation2,
			designation: employeeParam.designation,
			salary: employeeParam.salary?.toString() || '',
			salaryType: employeeParam.salaryType
		  });
		  setIdProofIndex(new IndexPath(idProofTypes.indexOf(employeeParam.idProofType) || 0));
		  setRel1Index(new IndexPath(relationshipTypes.indexOf(employeeParam.emergencyRelation1) || 0));
		  setRel2Index(new IndexPath(relationshipTypes.indexOf(employeeParam.emergencyRelation2) || 0));
		  setSalaryTypeIndex(new IndexPath(salaryTypes.indexOf(employeeParam.salaryType) || 0));
	  }
  }, [employeeParam]);
  
  const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' fill={theme['color-primary-500']} style={{width: 20, height: 20}}/>;

  const pickImage = async (id) => {
		    setIsModalVisible(true);
	  };
	  
	const handleOptionPress = (option) => {
		setIsModalVisible(false);
		if (!cameraPermission || cameraPermission !== 'granted' ) {
			  requestCameraPermission();
			}
			if (!mediaPermission || mediaPermission.status === 'denied' ) {
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
			  setFormData(prev => ({
				  ...prev,
				  idProofPic: [...(prev.idProofPic || []), source.uri]
				}));
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
			
			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
				const aa = await Promise.all(
				  result.assets.map(async (asset) => {
					const compressedSrc = await ImageManipulator.manipulateAsync(asset.uri, [], { compress: 0.5 });
					const source = { uri: compressedSrc.uri };
					console.log(source);
					return source.uri;
				  })
				);
				
			  	console.log(aa)
				setFormData(prev => ({
				  ...prev,
				  idProofPic: [...(prev.idProofPic || []), ...aa]
				}));
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};

  function startsWithFile(str) {
	  return typeof str === 'string' && str.startsWith("file");
	}
	
  const handleSubmit = async() => {
	try {
		// Validation
		console.log('formData in handleSubmit', formData);
		const requiredFields = [
		  { field: formData.name, name: 'Name' },
		  { field: formData.phoneNo, name: 'Phone Number' },
		  { field: formData.dob, name: 'Date of Birth' },
		  { field: idProofIndex.row > 0, name: 'ID Proof Type' },
		  { field: formData.idProofPic, name: 'ID Proof Images' },
		  { field: formData.emergencyPhNo1, name: 'Emergency Contact 1' },
		  { field: rel1Index.row > 0, name: 'Emergency Relation 1' },
		  { field: formData.designation, name: 'Designation' },
		  { field: formData.salary, name: 'Salary' },
		  { field: salaryTypeIndex.row > 0, name: 'Salary Type' }
		];
		const emptyFields = requiredFields.filter(item => !item.field);

		if (emptyFields.length > 0) {
		  Alert.alert('Required Fields', `Please fill: ${emptyFields.map(item => item.name).join(', ')}`);
		  return;
		}
		
		console.log('formData', formData);
		let picsArr = [];
		let picsArrLocal = [];
		for (const pic of formData.idProofPic) {
			if(startsWithFile(pic)) {
				const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer());

				// derive file extension
				const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg';
				const path = `${Date.now()}.${fileExt}`;

				// upload to Supabase Storage
				const { error: uploadError } = await supabase.storage
				  .from('employee-ids')
				  .upload(path, arraybuffer, {
					contentType: `image/${fileExt}`,
				  });

				if (uploadError) {
				  throw uploadError;
				}

				picsArr.push(path);
				picsArrLocal.push(pic);
			} else if(pic){
				picsArrLocal.push(pic);
				picsArr.push(pic.split('/').pop());
			}
		  }
		console.log('picsArr', picsArr, picsArrLocal);
		formData.idProofPic = picsArr;
		
		const { data, error } = await supabase
										  .from('Employee')
										  .upsert(formData, {onConflict: ['phoneNo']})
										  .select().single();
						if(error) {
							console.log(error);
							throw error;
						}
		if(deletedImages) {
			console.log('deletedImages', deletedImages);
			const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('employee-ids')
								  .remove(deletedImages)
			if(errorRemove) {
				throw errorRemove;
			}
		}
		let finalData = {...data, idProofPic: picsArrLocal};
		route.params?.onEditComplete?.(finalData);

		const cached = storage.getString('Employees');
		const employeeCache = cached && cached !== 'null' ? JSON.parse(cached) : {};
		employeeCache[data.id] = data.name;
		storage.set('Employees', JSON.stringify(employeeCache));
		eventEmitter.emit('employeeUpdated');
		//eventEmitter.emit('transactionAdded', { onlyEmployeeData: true });
		showSuccessMessage('Employee Details Saved!');
		setFormData({
			name: '',
			phoneNo: '',
			dob: new Date(),
			anniversary: new Date(),
			idProofType: idProofTypes[0],
			idProofPic: null,
			emergencyPhNo1: '',
			emergencyPhNo2: '',
			emergencyRelation1: relationshipTypes[0],
			emergencyRelation2: relationshipTypes[0],
			designation: '',
			salary: '',
			salaryType: salaryTypes[0]
		  });
		setIdProofIndex(new IndexPath(0));
		setRel1Index(new IndexPath(0));
		setRel2Index(new IndexPath(0));
		setSalaryTypeIndex(new IndexPath(0));
		navigation.goBack();
	} catch (error) {
		showErrorMessage('Error saving Employee Details', error.message);
		console.error(error);
	}
  };

  const scrollViewRef = React.useRef();

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  const handleConfirmDelete = (indexToDelete) => {
	  const deletedImage = formData.idProofPic[indexToDelete];

	  const updatedImages = formData.idProofPic.filter(
		(_, index) => index !== indexToDelete
	  );
	  setFormData(prev => ({ ...prev, idProofPic: updatedImages }));

	  if (deletedImage && onEditComplete) {
		setDeletedImages(prev => [...prev, deletedImage]);
	  }
	};

	const deleteImage = (indexToDelete) => {
	  Alert.alert(
		'Delete Image',
		'Are you sure you want to delete this image?',
		[
		  { text: 'Cancel', style: 'cancel' },
		  {
			text: 'Delete',
			style: 'destructive',
			onPress: () => handleConfirmDelete(indexToDelete),
		  },
		]
	  );
	};
  
  const handleUploadPress = () => {
    if (formData.idProofPic?.length > 0) {
      setImgModalVisible(true);
    } else {
      pickImage();
    }
  };

  return (
    <Layout style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContainer}
      >
        {/* Personal Information Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <PersonIcon style={styles.sectionIcon} fill="#667eea" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          
          <Input
            placeholder="Enter your full name"
            label="Full Name *"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            style={styles.input}
            accessoryLeft={PersonIcon}
            size="large"
          />

          <Input
            placeholder="+91 "
            label="Phone Number *"
            value={formData.phoneNo}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNo: text }))}
            keyboardType="phone-pad"
            style={styles.input}
            accessoryLeft={PhoneIcon}
			maxLength={10}
            size="large"
          />

          <View style={styles.row}>
            <Datepicker
			  style={[styles.input, styles.halfInput]}
			  label="Date of Birth *"
			  date={formData.dob}
			  onSelect={(text) => setFormData(prev => ({ ...prev, dob: text }))}
			  accessoryLeft={CalendarIcon}
			  min={new Date(1900, 0, 1)}
			  max={new Date()} 
			/>
			<Datepicker
			  style={[styles.input, styles.halfInput]}
			  label="Anniversary"
			  date={formData.anniversary}
			  onSelect={(text) => setFormData(prev => ({ ...prev, anniversary: text }))}
			  accessoryLeft={CalendarIcon}
			  min={new Date(1900, 0, 1)}
			  max={new Date()}
			  placement='bottom end'
			  boundingElementRect={{ width: 310 }}
			/>
          </View>
        </Card>

        {/* ID Verification Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FileIcon style={styles.sectionIcon} fill="#667eea" />
            <Text style={styles.sectionTitle}>ID Verification</Text>
          </View>

          <Select
            label="ID Proof Type *"
            selectedIndex={idProofIndex}
            onSelect={(index) => {setIdProofIndex(index); setFormData(prev => ({ ...prev, idProofType: idProofTypes[index.row] }));}}
            value={formData.idProofType}
            style={styles.input}
            size="large"
          >
            {idProofTypes.map((type, index) => (
              <SelectItem key={index} title={type} disabled={index === 0} />
            ))}
          </Select>

          <View style={styles.fileUploadContainer}>
            <Text style={styles.label}>ID Proof Images *</Text>
            <TouchableOpacity style={styles.fileUploadButton} onPress={handleUploadPress}>
              {formData.idProofPic?.length > 0 ? (
			  <>
			  <Image 
                    source={{ uri: formData.idProofPic[0] }} 
                    style={styles.coverImage}
                    resizeMode="cover"
			  />
			  <Text style={styles.uploadText}>
				  View images
			  </Text>
			  </>
			) : (
				<>
				<CameraIcon style={styles.uploadIcon} fill="#667eea" />
				<Text style={styles.uploadText}>
				  Tap to upload picture
				</Text>
				</>
			)}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Emergency Contacts Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AlertIcon style={styles.sectionIcon} fill="#667eea" />
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          </View>

          <View style={styles.row}>
            <Input
              placeholder="+91 "
              label="Primary Contact *"
              value={formData.emergencyPhNo1}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyPhNo1: text }))}
              keyboardType="phone-pad"
              style={[styles.input, styles.halfInput]}
			  maxLength={10}
              size="large"
            />

            <Select
              label="Relationship *"
              selectedIndex={rel1Index}
              onSelect={(index) => {setRel1Index(index); setFormData(prev => ({ ...prev, emergencyRelation1: relationshipTypes[index.row] }));}}
              value={formData.emergencyRelation1}
              style={[styles.input, styles.halfInput]}
              size="large"
            >
              {relationshipTypes.map((type, index) => (
                <SelectItem key={index} title={type} disabled={index === 0} />
              ))}
            </Select>
          </View>

          <View style={styles.row}>
            <Input
              placeholder="+91 "
              label="Secondary Contact"
              value={formData.emergencyPhNo2}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyPhNo2: text }))}
              keyboardType="phone-pad"
              style={[styles.input, styles.halfInput]}
			  maxLength={10}
              size="large"
            />

            <Select
              label="Relationship"
              selectedIndex={rel2Index}
              onSelect={(index) => {setRel2Index(index); setFormData(prev => ({ ...prev, emergencyRelation2: relationshipTypes[index.row] }));}}
              value={formData.emergencyRelation2}
              style={[styles.input, styles.halfInput]}
              size="large"
            >
              {relationshipTypes.map((type, index) => (
                <SelectItem key={index} title={type} disabled={index === 0} />
              ))}
            </Select>
          </View>
        </Card>

        {/* Salary Information Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <DollarIcon style={styles.sectionIcon} fill="#667eea" />
            <Text style={styles.sectionTitle}>Compensation Details</Text>
          </View>

			<Input
              label="Designation *"
              value={formData.designation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, designation: text }))}
              style={styles.input}
              size="large"
            />
          <View style={styles.salaryRow}>
            <Input
              placeholder="0.00"
              label="Salary Amount *"
              value={formData.salary}
              onChangeText={(text) => setFormData(prev => ({ ...prev, salary: text }))}
              keyboardType="numeric"
              style={[styles.input, styles.salaryInput]}
              size="large"
            />

            <Select
              label="Pay Period *"
              selectedIndex={salaryTypeIndex}
              onSelect={(index) => {setSalaryTypeIndex(index); setFormData(prev => ({ ...prev, salaryType: salaryTypes[index.row] }));}}
              value={formData.salaryType}
              style={[styles.input, styles.salaryType]}
              size="large"
            >
              {salaryTypes.map((type, index) => (
                <SelectItem key={index} title={type} disabled={index === 0} />
              ))}
            </Select>
          </View>
        </Card>

        {/* Submit Button */}
        <Button
          style={styles.submitButton}
          size="large"
          onPress={handleSubmit}
        >
            Complete Onboarding
        </Button>
      </ScrollView>	
	  
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
        visible={imgModalVisible}
        backdropStyle={styles.backdrop}
		onBackdropPress={() => setImgModalVisible(false)}
      >
          <View style={styles.modalContainer}>
            {/* Header with close button */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setImgModalVisible(false)}
              >
                <CloseIcon />
              </TouchableOpacity>
            </View>

            {/* Image Carousel */}
            <ScrollView 
              horizontal 
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {formData.idProofPic?.map((imageUri, index) => (
                <View key={index} style={styles.imageContainer}> 
                  <Image 
                    source={{ uri: imageUri }} 
                    style={styles.carouselImage}
                    resizeMode="contain"
                  />
                  {/* Delete button */}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteImage(index)}
                  >
                    <TrashIcon />
                  </TouchableOpacity>
                </View>
              ))}
			    <TouchableOpacity 
					style={[styles.imageContainer, styles.uploadButtonContainer]} 
					onPress={pickImage}
				  >
					<View style={styles.uploadButtonInner}>
					  <CameraIcon style={styles.uploadIcon} fill='#8F9BB3' />
						<Text style={styles.uploadText}>
						  Tap to upload picture
						</Text>
					</View>
				</TouchableOpacity>
            </ScrollView>
        </View>
      </Modal>
    </Layout>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 16,
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    marginBottom: 24,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
	marginTop: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    marginBottom: 16,
	marginLeft: -5
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8F9BB3',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  salaryInput: {
	width: 100
  },
  salaryType: {
    width: 200
  },
  fileUploadContainer: {
    marginBottom: 16,
  },
  fileUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f7fafc',
    borderWidth: 2,
    borderColor: '#cbd5e0',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  uploadIcon: {
    width: 20,
    height: 20,
  },
  fileUploadText: {
    fontSize: 14,
    color: '#4a5568',
  },
  submitButton: {
    borderRadius: 12,
    borderWidth: 0,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    width: 24,
    height: 24,
  },
  modalOption: {
    padding: 15,
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
    marginBottom: -20, // Add spacing between options row and cancel button
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageContainer: {
    width: screenWidth * 0.9,
    height: 300,
  },
  coverImage: {
	width: 200,
	height: 200
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
  },
  addMoreText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  closeIcon: {
    width: 20, // Icon size
    height: 20,
  },
  selectItem: {
	textTransform: 'capitalize'
  },
  uploadButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#aaa",
  },
  uploadButtonInner: {
    justifyContent: "center",
    alignItems: "center",
	marginTop: -70
  },
  uploadIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#8F9BB3',
    textAlign: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: screenWidth * 0.9,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  closeButton: {
    padding: 8,
	position: 'absolute',
	top: 0,
	right: 0
  },
});

export default EmployeeOnboardingForm;