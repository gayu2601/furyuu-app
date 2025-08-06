import React, { useState, useEffect, forwardRef, useImperativeHandle  } from 'react';
import { Modal, Card, Button, Layout, Text, Input, Tab, TabBar, Icon, List, ListItem, Radio, RadioGroup, Toggle, IndexPath } from '@ui-kitten/components';
import { View, ScrollView, Image, StyleSheet, Dimensions, TouchableOpacity, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { usePermissions } from './PermissionsContext';
import NeckTypesModal from './NeckTypesModal';
import { useNavigation } from "@react-navigation/native";
import { supabase } from '../../constants/supabase'

const CustomModalEdit = ( props, ref ) => {
	const {
    onInputChange, inCustom, setInCustom, editRouteParams, visible, setVisible, frontNeckTypeG, backNeckTypeG, sleeveTypeG,
    sleeveLengthG, frontNeckDesignFile, backNeckDesignFile, sleeveDesignFile,
    dressItemId, dressType, measurements, extraMeasurements, patternImgs,
    patternImgsRaw, defaultSource, dressGiven, notes
  } = props;
	const navigation = useNavigation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [notesLocal, setNotesLocal] = useState(notes);
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [measurementsLocal, setMeasurementsLocal] = useState({
	  frontNeck: String(measurements.frontNeck ? measurements.frontNeck : 0),
	  backNeck: String(measurements.backNeck ? measurements.backNeck : 0),
	  shoulder: String(measurements.shoulder ? measurements.shoulder : 0),
	  sleeve: String(measurements.sleeve ? measurements.sleeve : 0),
	  AHC: String(measurements.AHC ? measurements.AHC : 0),
	  shoulderToWaist: String(measurements.shoulderToWaist ? measurements.shoulderToWaist : 0),
	  chest: String(measurements.chest ? measurements.chest : 0),
	  waist: String(measurements.waist ? measurements.waist : 0),
	  hip: String(measurements.hip ? measurements.hip : 0),
	  leg: String(measurements.leg ? measurements.leg : 0),
	  topLength: String(measurements.topLength ? measurements.topLength : 0),
	  bottomLength: String(measurements.bottomLength ? measurements.bottomLength : 0)
	});
	const [neckModalVisible, setNeckModalVisible] = useState(false);
    const [neckModalField, setNeckModalField] = useState('');
  const [dressGivenLocal, setDressGivenLocal] = useState(dressGiven)
  const [fnImg, setFnImg] = useState(null);
	const [bnImg, setBnImg] = useState(null);
	const [sleeveImg, setSleeveImg] = useState(null);
let frontNeckDesignFileJson = frontNeckDesignFile ? JSON.parse(JSON.stringify(frontNeckDesignFile)) : null
let backNeckDesignFileJson = backNeckDesignFile ? JSON.parse(JSON.stringify(backNeckDesignFile)) : null
let sleeveDesignFileJson = sleeveDesignFile ? JSON.parse(JSON.stringify(sleeveDesignFile)) : null
	console.log(sleeveTypeG);
	  const sleeveOptions = [
		"Ordinary",
		"Puff",
		"Knot",
		"Sleeveless",
		"Draw design",
	  ];
	  
	  const sleeveLenOptions = [
		"Short",
		"Medium",
		"Full",
	  ];
	
    const [selectedIndexSleeve, setSelectedIndexSleeve] = useState(sleeveOptions.indexOf(sleeveTypeG) || 0);
	  const [selectedIndexSleeveLen, setSelectedIndexSleeveLen] = useState(sleeveLenOptions.indexOf(sleeveLengthG) ||0);
	  const [frontNeckType, setFrontNeckType] = useState(frontNeckTypeG)
	  const [backNeckType, setBackNeckType] = useState(backNeckTypeG)
	  const [sleeveType, setSleeveType] = useState(sleeveTypeG)
	  const [sleeveLength, setSleeveLength] = useState(sleeveLengthG)
	  const [changedFields, setChangedFields] = useState({});

const [pics, setPics] = useState(null);
const [picsRaw, setPicsRaw] = useState(null); 
const [deletedPatternPics, setDeletedPatternPics] = useState([]);

useEffect(() => {
	const downloadPic = async(imageUri, folderName) => {
			  try {
					  const { data, error } = await supabase.storage.from('design-files').getPublicUrl(folderName + '/' + imageUri)

					  if (error) {
						throw error
					  }
					return data.publicUrl;
				} catch (error) {
					console.error('Error downloading image: ', error.message)
					return null;
				}
		}
		const getDesignFiles = async() => {
			if(frontNeckDesignFile) {
				let a = await downloadPic(frontNeckDesignFile, 'frontNeckDesignFile')
				setFnImg(a);
			}
			if(backNeckDesignFile) {
				let b = await downloadPic(backNeckDesignFile, 'backNeckDesignFile')
				setBnImg(b);
			}
			if(sleeveDesignFile) {
				let c = await downloadPic(sleeveDesignFile,'sleeveDesignFile')
				setSleeveImg(c);
			}
		}
		
		getDesignFiles();
		setPics(patternImgs);
		setPicsRaw(patternImgsRaw);
}, [patternImgs, frontNeckDesignFile, backNeckDesignFile, sleeveDesignFile]);

const [localModalState, setLocalModalState] = useState({
    frontNeckType: frontNeckTypeG,
    backNeckType: backNeckTypeG,
    sleeveType: sleeveTypeG,
    sleeveLength: sleeveLengthG,
    frontNeckDesignFile,
    backNeckDesignFile,
    sleeveDesignFile,
    dressGiven,
    notes,
    patternImgsRaw: patternImgsRaw || [],
    measurements: { ...measurements },
    extraMeasurements: { ...extraMeasurements }
  });
  
  // Handle local changes without propagating to parent
  const handleLocalChange = (field, value) => {
	  if(field === 'patternPics') {
		  console.log('changing patternPics')
		  console.log(value)
	  }
    setLocalModalState(prev => ({
      ...prev,
      [field]: value
    }));
	setChangedFields(prev => ({
		...prev,
		[field]: value
	  }));
  };
  
  // For nested objects like measurements
  const handleMeasurementChange = (field, value) => {
    setLocalModalState(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [field]: value
      }
    }));
	setChangedFields(prev => ({
		...prev,
		measurements: {
			...prev.measurements,
			[field]: value
		}
	  }));
  };
  
  // Method to get all current modal data
  const getModalData = () => {
	let a = {
      deletedPatternPics,
	  ...changedFields
    };
	return a;
  };
  
  // Expose method to parent
  useImperativeHandle(ref, () => ({
    getModalData
  }));

const [isModalVisible, setIsModalVisible] = useState(false);
  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
	
	const handleSelectSleeve = (index) => {
		setSelectedIndexSleeve(index);
		let slTemp = sleeveOptions[index] === 'Draw design' ? 'Custom' : sleeveOptions[index];
		setSleeveType(slTemp)
		handleLocalChange('sleeveType', slTemp);
		if(sleeveDesignFile) {
			handleLocalChange('sleeveDesignFile', null);
		}
	};
	
	const handleSelectSleeveLen = (index) => {
		setSelectedIndexSleeveLen(index);
		setSleeveLength(sleeveLenOptions[index])
		handleLocalChange('sleeveLength', sleeveLenOptions[index]);
	};
  
  const keysToDisplay = {
    Bottom: ['waist', 'hip', 'leg', 'bottomLength'],
    Full: ['frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'waist', 'hip', 'leg', 'topLength', 'bottomLength'],
    Top: ['frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'topLength'],
  };

  const dressTypeToKeysMapping = {
    shirt: 'Top',
	tops: 'Top',
    chudithar: 'Full',
    lehenga: 'Full',
    frock: 'Full',
    skirt: 'Bottom',
	suit: 'Full',
    pants: 'Bottom',
    blouse: 'Top',
    nightie: 'Full',
    pyjama: 'Full',
	partywear: 'Full',
	uniform: 'Full',
	nightdress: 'Full',
	halfsaree: 'Full',
	paavadai: 'Full'
  };

  const keyGroup = dressTypeToKeysMapping[dressType.toLowerCase()];
  const displayKeys = keysToDisplay[keyGroup] || [];
  displayKeysLabel = {
	    frontNeck: 'Front Neck',
	    backNeck: 'Back Neck',
		shoulder: 'Shoulder',
		sleeve: 'Sleeve',
		AHC: 'Arm Hole Curve',
		shoulderToWaist: 'Shoulder to Waist Length',
		chest: 'Chest',
		waist: 'Waist',
		hip: 'Hip',
		leg: 'Leg',
		topLength: 'Top Length',
		bottomLength: 'Bottom Length'
	}
	const calculatedHeight = displayKeys.length > 6 ? 700 : 450;
  
/*useEffect(() => {
	setPics(patternImgs)
	/*const convertedMeasurements = Object.keys(measurements).reduce((acc, key) => {
		acc[key] = String(measurements[key]);
		return acc;
	  }, {});


	  setMeasurementsLocal(convertedMeasurements);
}, []);*/

	const editSelectedItemDesign = (fieldName, value) => {
		console.log('in editSelectedItemDesign: ' + fieldName + ',' + value);
	  handleLocalChange(fieldName, value);
	  switch(fieldName) {
		case 'frontNeckDesignFile':
			setFnImg(value);
			break;
		case 'backNeckDesignFile':
			setBnImg(value);
			break;
		case 'sleeveDesignFile':
			setSleeveImg(value);
			break;
		default:
			break;
	  }
	};

  const handleCloseModal = () => {
    setVisible(false);
  };
  
  const pickImage = async () => {
		  setIsModalVisible(true);
	  };
	  
	const handleDeleteImage = (index) => {
		const newImages = [...pics];
		const newImagesRaw = [...picsRaw];
		newImages.splice(index, 1);
		newImagesRaw.splice(index, 1);
		console.log(newImagesRaw)
		setPics(newImages);
		setPicsRaw(newImagesRaw);
		setDeletedPatternPics(prevDeletedPics => [...prevDeletedPics, picsRaw[index]]);
		//onInputChange(dressItemId, 'patternPics', newImagesRaw);
		handleLocalChange('patternPics', newImagesRaw);
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
			  //console.log(pics)
			  //onInputChange(dressItemId, 'patternPics', [...patternImgsRaw, source.uri]);
			  let a = picsRaw ? [...picsRaw, ...newUris] : newUris
			  handleLocalChange('patternPics', a);
			  setPicsRaw(a);
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
				const compressionPromises = result.assets.map(asset => 
				  ImageManipulator.manipulateAsync(asset.uri, [], { compress: 0.5 })
				);

			  Promise.all(compressionPromises)
			  .then(compressedResults => {
				// Extract all URIs
				const newUris = compressedResults.map(result => result.uri);
				
				// Update pics state
				setPics(pics => [...pics, ...newUris]);
				
				// Create the updated pattern images array all at once
				const updatedPatternImgsRaw = picsRaw ? [...picsRaw, ...newUris] : newUris;
				setPicsRaw(updatedPatternImgsRaw);
				
				console.log('updatedPatternImgsRaw:');
				console.log(updatedPatternImgsRaw);
				
				// Update with the complete array
				handleLocalChange('patternPics', updatedPatternImgsRaw);
			  })
			  .catch(error => {
				console.error('Error processing images:', error);
			  });
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};
	
	  const onCheckedChange = (isChecked) => {
		setDressGivenLocal(isChecked);
		handleLocalChange('dressGiven', isChecked);
	  };
  
	const handleDeleteDesign = (designType, fieldType) => {
		  handleLocalChange(designType, null);
		  handleLocalChange(fieldType, null);
		  switch(fieldType) {
				case 'frontNeckType':
					setFnImg(null);
					break;
				case 'backNeckType':
					setBnImg(null);
					break;
				case 'sleeveType':
					setSleeveImg(null);
					break;
				default:
					break;
		  }
	}
  
  const renderTabContent = (index) => {
	  //console.log(measurementsLocal)
    switch (index) {
      case 0:
        return (
          <Layout style={styles.tabContent}>
			<View style={styles.fieldContainer1}>
				<Text category='label' >Measurement Dress Given</Text>
				<Toggle
						style={{ transform: [{ scale: 0.7 }] }}
						  checked={dressGivenLocal}
						  onChange={(isChecked) => onCheckedChange(isChecked)}
						>
				</Toggle>
			</View>
		      {displayKeys.map((key) => {
				  return (
				<View key={key} style={styles.fieldContainer1}>
				  <Text category='label'>{displayKeysLabel[key]}</Text>
				  <Input
					style={{width: 100}}
					autoCapitalize='none'
					keyboardType='numeric'
					value={localModalState.measurements[key]}
					size='small'
					onChangeText={(value) => handleMeasurementChange(key, value)}
				  />
				</View>
				)
			  })}
			  {extraMeasurements && Object.entries(extraMeasurements).map(([key, value]) => {
								  console.log(key + ',' + value)
								  return (
								<View key={key} style={styles.fieldContainer1}>
								  <Text category='label' style={{textTransform: 'capitalize'}}>{key}</Text>
								  <Input
									style={{width: 100}}
									autoCapitalize='none'
									keyboardType='numeric'
									value={value.toString()}
									size='small'
									onChangeText={(newValue) => {
										extraMeasurements[key]=newValue;
										handleLocalChange('extraMeasurements_measurement', extraMeasurements);
									  }}
								  />
								</View>
								)
							  })}
			  <Card>
					  <Text category='label' style={{ fontWeight: 'bold', marginBottom: 10, marginLeft: -10 }}>Notes:</Text>
					  <Input
						style={{width: 250, backgroundColor: 'white', marginLeft: -10}}
						autoCapitalize='none'
						value={localModalState.notes}
						size='small'
						onChangeText={(text) => handleLocalChange('notes', text)}
					  />
			  </Card>
          </Layout>
        );
      case 1:
		console.log(pics);
        return (
          <Layout style={styles.tabContent}>
            <List
			  data={[...pics]}
			  renderItem={({ item, index }) => {
				console.log(item)
				return (
				<ListItem>
				  <View style={{alignItems: 'center'}}>
				  <Image style={styles.image} source={item ? { uri: item } : defaultSource} />
				  <Button
					  appearance="ghost"
					  size="tiny"
					  accessoryLeft={() => (
						<Icon name="trash-2-outline" fill="#FF0000" style={{ width: 20, height: 20 }} />
					  )}
					  onPress={() => handleDeleteImage(index)}
					  style={styles.trashButton}
					/>
				  </View>
				</ListItem>
			  )}}
			  horizontal
			  keyExtractor={(item, index) => index.toString()}
			  ListFooterComponent={(
				<ListItem>
				  <Button
					style={styles.image} // Same size as images
					appearance="outline"
					accessoryLeft={(props) => (
					  <Icon {...props} style={styles.icon} name="plus-outline" />
					)}
					onPress={pickImage}
				  />
				</ListItem>
			  )}
			/>
          </Layout>
        );
	  case 2:
        return (
          <Layout style={styles.tabContent}>
            <View style={styles.tabContentRow}>
				<View>
						<Text category='label' style={styles.labelText}>Front Neck</Text>
							{localModalState.frontNeckType === 'Custom' && fnImg ? (
								<View style={{marginTop: 10}}>
										<View style={{borderWidth: 1, borderRadius: 8}}>
											<Image source={{ uri: fnImg }} style={styles.carouselImage} />
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteDesign('frontNeckDesignFile', 'frontNeckType')}
											style={styles.closeButtonDesign}
										>
											<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
										</TouchableOpacity>

										  <Button style={styles.editButton1} size='tiny'
											onPress={() => {handleDeleteDesign('frontNeckDesignFile', 'frontNeckType'); setNeckModalField('frontNeckType'); setNeckModalVisible(true);}}
										  >
											{evaProps => <Text status='control' style={styles.designButtonText}>Change Front Neck</Text>}
										  </Button>
									</View>
							) : (
								<Button 
								  style={styles.uploadButton} 
								  status='control' 
								  onPress={() => {setNeckModalField('frontNeckType'); setNeckModalVisible(true);}}
								>
								  <View style={styles.uploadContent}>
									{localModalState.frontNeckType ? (
									  <View style={styles.selectedContent}>
										<Text category='s2' style={styles.uploadButtonText}>
										  {localModalState.frontNeckType} Front Neck
										</Text>
										<Icon name='edit-2-outline' style={styles.editIcon} fill='#8F9BB3' />
									  </View>
									) : (
									  <Text category='s2' style={styles.uploadButtonText}>Select front neck type</Text>
									)}
								  </View>
								</Button>
							)}
				</View>
				<View>
							<Text category='label' style={styles.labelText}>Back Neck</Text>
								{localModalState.backNeckType === 'Custom' && bnImg ? (
									<View style={{marginTop: 10}}>
										<View style={{borderWidth: 1, borderRadius: 8}}>
											<Image source={{ uri: bnImg }} style={styles.carouselImage} />
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteDesign('backNeckDesignFile', 'backNeckType')}
											style={styles.closeButtonDesign}
										>
											<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
										</TouchableOpacity>

										  <Button style={styles.editButton1} size='tiny'
											onPress={() => {handleDeleteDesign('backNeckDesignFile', 'backNeckType'); setNeckModalField('backNeckType'); setNeckModalVisible(true);}}
										  >
											{evaProps => <Text status='control' style={styles.designButtonText}>Change Back Neck</Text>}
										  </Button>
									</View>
								  ) : (
									<Button 
									  style={styles.uploadButton} 
									  status='control' 
									  onPress={() => {setNeckModalField('backNeckType'); setNeckModalVisible(true);}}
									>
									  <View style={styles.uploadContent}>
										{localModalState.backNeckType ? (
										  <View style={styles.selectedContent}>
											<Text category='s2' style={styles.uploadButtonText}>
											  {localModalState.backNeckType} Back Neck
											</Text>
											<Icon name='edit-2-outline' style={styles.editIcon} fill='#8F9BB3' />
										  </View>
										) : (
										  <Text category='s2' style={styles.uploadButtonText}>Select back neck type</Text>
										)}
									  </View>
									</Button>
								  )}
					</View>
				</View>

							<View style={styles.fieldContainer4}>
							  <Text category='label' style={styles.fieldLabel}>Sleeve</Text>
							  <RadioGroup
								style={styles.selectFieldRadio}
								selectedIndex={selectedIndexSleeve}
								onChange={(index) => handleSelectSleeve(index)}
							  >
								{sleeveOptions.map((option, index) => (
								  <Radio key={index}>{option}</Radio>
								))}
							  </RadioGroup>
							</View>
							<View style={{marginHorizontal: 50}}>
								{localModalState.sleeveType === 'Custom' && (
								  sleeveImg ? (
									<View style={{marginHorizontal: 40}}>
										<View style={{borderWidth: 1, borderRadius: 8}}>
											<Image source={{ uri: sleeveImg }} style={styles.carouselImage} />
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteDesign('sleeveDesignFile', 'sleeveType')}
											style={styles.closeButtonDesign}
										>
											<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
										</TouchableOpacity>
										  <Button style={styles.editButton} size='tiny'
											onPress={() => 
												{
													setInCustom(true);
													setVisible(false);
													navigation.navigate('CustomDesign', {
													  field: 'sleeve',
													  returnFile: (selectedFile) => {
														handleLocalChange('sleeveDesignFile', selectedFile);
														setSleeveImg(selectedFile);
														setVisible(true);
													  },
													  prevScreen: 'Edit',
													  editRouteParams: editRouteParams
													}
												)}}
										  >
											Edit
										  </Button>
									</View>
								  ) : (
									<Button style={styles.drawButton} size='small'
									  onPress={() => {
										setInCustom(true);
										setVisible(false);
										navigation.navigate('CustomDesign', {
										field: 'sleeve',
										returnFile: (selectedFile) => {
										  handleLocalChange('sleeveDesignFile', selectedFile);
										  setSleeveImg(selectedFile);
										  setVisible(true);
										},
										prevScreen: 'Edit',
										editRouteParams: editRouteParams
									  })}
									  }
									>
									  Draw sleeve design
									</Button>
								  )
								)}
							</View>
							<View style={styles.fieldContainer3}>
							  <Text category='label' style={styles.fieldLabel}>Sleeve Length</Text>
							  <RadioGroup
								style={styles.selectFieldRadio}
								selectedIndex={selectedIndexSleeveLen}
								onChange={(index) => handleSelectSleeveLen(index)}
							  >
								{sleeveLenOptions.map((option, index) => (
								  <Radio key={index}>{option}</Radio>
								))}
							  </RadioGroup>
							</View>
          </Layout>
        );
      default:
        return null;
    }
  };

  return (
   <>
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={handleCloseModal}
    >
	<ScrollView style={[styles.scrollView, {height: calculatedHeight}]}
				contentContainerStyle={styles.scrollViewContent}
				  showsVerticalScrollIndicator={true}
				  bounces={false}
				  nestedScrollEnabled={true}
				  keyboardShouldPersistTaps="handled">
      <Card disabled={true} style={styles.modalCard}>
        
		{dressType !== 'pants' ? (
			<TabBar
			  selectedIndex={selectedIndex}
			  onSelect={setSelectedIndex}
			>
				<Tab title="Measurements" />
				<Tab title="Design Pics" />
				<Tab title="Neck & Sleeve" />
			</TabBar>
		  ) : (
			<TabBar
			  selectedIndex={selectedIndex}
			  onSelect={setSelectedIndex}
			>
			  <Tab title="Measurements" />
			  <Tab title="Design Pics" />
			</TabBar>
		  )}
        <ScrollView keyboardShouldPersistTaps="handled">
          {renderTabContent(selectedIndex)}
        </ScrollView>
        <Button onPress={handleCloseModal} style={styles.closeButton} size='small'>
          Save
        </Button>
      </Card>
	  </ScrollView>
    </Modal>
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
		<NeckTypesModal
                                visible={neckModalVisible}
                                onClose={() => setNeckModalVisible(false)}
                                fieldName={neckModalField}
                                updateSelectedItemDesign={editSelectedItemDesign}
								setShowDesign={setVisible}
								editRouteParams={editRouteParams}
								setInCustom={setInCustom}
        />		  
	</>
  );
};

const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalCard: {
    width: WIDTH - 20,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  fieldContainer1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
	alignItems: 'center'
  },
  selectFieldRadio: {
          flexDirection: 'row',
          marginLeft: 5,
          marginTop: 5,
          flexWrap: 'wrap',
          marginLeft: -20
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
  },
  closeButton: {
    marginTop: 16,
	marginHorizontal: 100
  },
  imageDesign: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
	marginBottom: 15
  },
  deleteButton: {
    borderRadius: 10,
	marginTop: 5,
    zIndex: 1,
	width: 100
  },
  drawButton: {
    borderRadius: 10,
	marginBottom: 15,
	marginTop: -5,
	width: 200,
	alignItems: 'center'
  },
  icon: {
    width: 50,
    height: 50,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  trashButton: {
    position: 'absolute', // Absolute positioning to place the button at the bottom right
    top: -10, // Distance from the bottom
    right: -5, // Distance from the right
    paddingHorizontal: 0, // Remove padding for a more compact button
  },
  tabContentRow: {
	flexDirection: 'row',
	gap: 30,
	flexWrap: 'wrap',
	marginLeft: 0
  },
  fieldLabel: {
	marginLeft: -20
  },
  fieldContainer4: {
	margin: 16,
    marginTop: 25,
	marginLeft: 25
  },
  fieldContainer3: {
	marginTop: 10,
	marginLeft: 25
  },
  fieldContainer2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
	marginLeft: -10,
	alignItems: 'center'
  },
  carouselImage: {
    width: 100,
    height: 100,
  },
  closeButtonDesign: {
    position: 'absolute', // Position relative to the image
    top: -10, // Adjust for desired vertical offset
    right: -10, // Adjust for desired horizontal offset
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background to improve visibility
    borderRadius: 20, // Optional: Make the background circular
    padding: 2, // Optional: Add padding around the icon
  },
  closeIcon: {
    width: 20, // Icon size
    height: 20,
  },
  editButton: {
    marginLeft: 25,
	width: 50,
	marginBottom: 10,
	marginTop: 10
  },
  editButton1: {
    width: 100,
	marginBottom: 10,
	marginTop: 10
  },
  designButtonText: {textAlign: 'center', fontSize: 12, fontWeight: 'bold'},
  uploadButton: {
    marginTop: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 100,
    padding: 0,
	backgroundColor: '#F7F9FC',
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    textAlign: 'center',
	fontSize: 12
  },
  selectedContent: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
    },
    editIcon: {
          width: 16,
          height: 16,
          marginLeft: 8,
    },
	labelText: {
		marginBottom: 5
	},
	scrollView: {
		width: '100%',
	},
	  scrollViewContent: {
		paddingVertical: 10,
	  },
});

export default forwardRef(CustomModalEdit);
