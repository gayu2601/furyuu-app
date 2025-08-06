import React, { useState, useEffect, forwardRef, useImperativeHandle  } from 'react';
import { Image, StyleSheet, View, Alert, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Input, Button, ListItem, Text, Icon, Modal, Card, List, Datepicker } from '@ui-kitten/components';
import moment from "moment";
import { useUser } from '../main/UserContext';
import CustomModalEdit from '../main/CustomModalEdit';
import { useNavigation } from "@react-navigation/native";
import { storage } from '../extra/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../constants/supabase'
import { usePermissions } from './PermissionsContext';

const EditOrderDetailsItem = (props, ref) => {
	const { currentUser } = useUser();
  const { style, onInputChange, inCustom, setInCustom, editRouteParams, dressItemId, custId, custName, custPhNo, imageSource1, imageSource2, dressType, dressSubType, amt, dueDate, dressGiven, frontNeckType, backNeckType, sleeveType, sleeveLength, frontNeckDesignFile, backNeckDesignFile, sleeveDesignFile, defaultSource, notes, measurementsObj, extraMeasurements, setOrderAmtChanged, ...listItemProps } = props;
  console.log(imageSource2)
  const navigation = useNavigation()
  
  const [measurementsData, setMeasurementsData] = useState([])
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [date, setDate] = useState(new Date(dueDate));
  const [pics, setPics] = useState([]);
  const [picsRaw, setPicsRaw] = useState([]);
  const [patternPics, setPatternPics] = useState([]);
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [deletedPics, setDeletedPics] = useState([]);
  
  const [localState, setLocalState] = useState({
    price: amt.toString(),
    notes: notes,
    dressPics: imageSource1 || [],
    dueDate: dueDate,
  });
  const [changedFields, setChangedFields] = useState({});
  
  const modalRef = React.useRef();
  
  // Get current state data including from modal
  const getItemData = () => {
    // Get modal data if ref exists and has getModalData method
	console.log(modalRef)
    const modalCurrentData = modalRef.current?.getModalData?.() || {};
    
    let a = {
      dressItemId,
	  dressType,
	  dressSubType,
	  deletedPics,
	  ...(!('stitchingAmt' in changedFields) && { stitchingAmt: amt }),
	  ...changedFields,
      ...modalCurrentData // Include all data from the modal
    };
	console.log(a)
	return a;
  };
  
  useImperativeHandle(ref, () => ({
    getItemData
  }));
  
  useEffect(() => {
		const downloadPics = async(picsDb, picsType) => {
			const downloadedImgs = [];
			  try {
					for (const img of picsDb) {
						console.log(img)
					  let folderName = '';
					  if(picsType === 'dress') {
						  folderName = 'dressImages'
					  } else {
						  folderName = 'patternImages'
					  }
						  
					  const { data, error } = await supabase.storage.from('order-images').getPublicUrl(folderName + '/' + img)

					  if (error) {
						throw error
					  }

					  downloadedImgs.push(data.publicUrl)
				  }
				  if(picsType === 'dress') {
					  setPics(downloadedImgs)
				  } else {
					  setPatternPics(downloadedImgs)
				  }
				} catch (error) {
				  if (error instanceof Error) {
					  console.log(error)
					console.log('Error downloading image: ', error.message)
					return false;
				  }
				}
			return true;
		}
		if(imageSource1) {
			setPicsRaw(imageSource1);
			downloadPics(imageSource1, 'dress')
		}
		if(imageSource2) {
			downloadPics(imageSource2, 'pattern')
		}
	},[imageSource1, imageSource2]);
  
  const openModal = () => {
    setModalVisible(true);
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
  
  const [price, setPrice] = useState(0);
  const [notesLocal, setNotesLocal] = useState('');
  
  useEffect(() => {
	  console.log(custName + ',' + custPhNo)
	  setPrice(amt.toString())
	  //onInputChange(dressItemId, 'stitchingAmt', amt.toString());
	  setNotesLocal(notes);
	}, [amt, notes, custId, dressItemId]);
  
  const closeModal = () => {
    setModalVisible(false);
  };
  
  const pickImage = async () => {
		  setIsModalVisible(true);
	  };
	  
	const handleDeleteImage = (index) => {
		console.log('in delete image')
		const newImages = [...pics];
		let newImagesRaw = [...picsRaw]; // Creates a shallow copy
		console.log(newImagesRaw)
		newImages.splice(index, 1);
		newImagesRaw.splice(index, 1);
		console.log(newImagesRaw)
		setPics(newImages);
		setPicsRaw(newImagesRaw);
		setDeletedPics(prevDeletedPics => [...prevDeletedPics, picsRaw[index]]);
		//onInputChange(dressItemId, 'dressPics', newImagesRaw);
		handleDressPicsChange(newImagesRaw);
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
		  
			if (result.canceled) {
			  console.log('User cancelled image picker');
			} else if (result.error) {
			  console.log('ImagePicker Error: ', result.error);
			} else {
			  const compressedSrc = await ImageManipulator.manipulateAsync(result.assets[0].uri, [], { compress: 0.5 });
			  const source = { uri: compressedSrc.uri };
			  console.log(source);
			  setPics(pics => [...pics, source.uri]);
			  let a = picsRaw ? [...picsRaw, ...newUris] : newUris
			  handleDressPicsChange(a);
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
				const a = picsRaw ? [...picsRaw, ...newUris] : newUris;
				setPicsRaw(a);
				
				console.log('a:');
				console.log(a);
				
				// Update with the complete array
				handleDressPicsChange(a);
			  })
			  .catch(error => {
				console.error('Error processing images:', error);
			  });
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};
	
  const handlePriceChange = (value) => {
    setLocalState(prev => ({
      ...prev,
      price: value
    }));
	setChangedFields(prev => ({
		...prev,
		stitchingAmt: value
	  }));
	setOrderAmtChanged(true);
  };
  
  const handleDateChange = (nextDate) => {
    const formattedDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    setDate(nextDate);
    setLocalState(prev => ({
      ...prev,
      dueDate: formattedDate
    }));
	setChangedFields(prev => ({
		...prev,
		dueDate: formattedDate
	  }));
  };

  const handleDressPicsChange = (value) => {
    setLocalState(prev => ({
      ...prev,
      dressPics: value
    }));
	setChangedFields(prev => ({
		...prev,
		dressPics: value
	  }));
  };

  
  return (
	<>
    <ListItem
      {...listItemProps}
      style={[styles.container, style]}
	  >
	  <Card style={styles.card}>
		<View style={styles.row}>
		  <TouchableOpacity
			style={styles.imageContainer}
			onPress={() => openModal()}
		  >
			<Image
			  style={styles.imageCard}
			  source={pics && pics[0] ? { uri: pics[0] } : defaultSource}
			/>
			<View style={styles.overlay}>
			  <Text style={styles.overlayText}>+</Text>
			</View>
		</TouchableOpacity>

		<View style={styles.content}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
				<Text category="label" style={{ textTransform: 'capitalize', marginBottom: 0, marginLeft: -4 }}>
				  {dressSubType} {dressType}
				</Text>
				<Button
                  appearance="ghost"
                  size="medium"
                  status="primary"
                  style={{ marginRight: -45 }}
                  onPress={() => setDetailsModalVisible(true)}
                >
					Edit Details
				</Button>
			</View>
			<View style={{marginTop: -10, flexDirection: 'row', alignItems: 'center', gap: 60}}>
				<Text category='s2' style={{marginTop: 5}}>Due on:</Text>
				<Datepicker
						date={date}
						style={{width: 110, marginTop: 5, marginLeft: 5}}
						size='small'
						min={new Date()}
						onSelect={handleDateChange}
						placement='bottom end'
						boundingElementRect={{ width: 100 }}
				/>
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 5, gap: 60 }}>
				<Text category="s2">Stitching price:</Text>
				<Input
					autoCapitalize='none'
					keyboardType='numeric'
					value={localState.price}
					textStyle={{ textAlign: 'right' }}
					size='small'
					style={{width: 67, marginLeft: 5}}
					onChangeText={handlePriceChange}
				/>
			</View>
      </View>
	  </View>
	  </Card>
    </ListItem>
	   <Modal visible={modalVisible} backdropStyle={styles.backdrop} onBackdropPress={() => setModalVisible(false)}>
	    <Card>
		 
		 <List
			  data={[...pics]}
			  renderItem={({ item, index }) => (
				<ListItem>
				  <View style={{alignItems: 'center'}}>
				  <Image
					source={item ? { uri: item } : defaultSource}
					style={styles.carouselImage}
				  />
				  <Button
					  appearance="ghost"
					  size="tiny"
					  accessoryLeft={() => (
						<Icon name="trash-2-outline" fill="#FF0000" style={{ width: 25, height: 25 }} />
					  )}
					  onPress={() => handleDeleteImage(index)}
					  style={styles.trashButton}
					/>
				  </View>
				</ListItem>
			  )}
			  horizontal
			  keyExtractor={(item, index) => index.toString()}
			  ListFooterComponent={(
				<ListItem>
				  <Button
					style={styles.carouselImage} // Same size as images
					appearance="outline"
					accessoryLeft={(props) => (
					  <Icon {...props} style={styles.icon} name="plus-outline" />
					)}
					onPress={pickImage}
				  />
				</ListItem>
			  )}
			/>
			<Button size='tiny' style={{marginTop: 5, marginHorizontal: 130}} onPress={() => setModalVisible(false)}>Save</Button>
		  
        </Card>
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
	  
	  <CustomModalEdit onInputChange={onInputChange} ref={modalRef} inCustom={inCustom} setInCustom={setInCustom} editRouteParams={editRouteParams} visible={detailsModalVisible} setVisible={setDetailsModalVisible} frontNeckTypeG={frontNeckType} backNeckTypeG={backNeckType} sleeveTypeG={sleeveType} sleeveLengthG={sleeveLength} frontNeckDesignFile={frontNeckDesignFile} backNeckDesignFile={backNeckDesignFile} sleeveDesignFile={sleeveDesignFile} dressItemId = {dressItemId} dressType={dressType} measurements={measurementsObj} extraMeasurements={extraMeasurements} patternImgs={patternPics} patternImgsRaw={imageSource2} defaultSource={defaultSource} dressGiven={dressGiven} notes={notes}/>
	</>
  );
};

const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
  container: {
	  flexDirection: 'row',
    alignItems: 'center',
	justifyContent: 'space-between',
    paddingHorizontal: 10,
	height: 130,
  },
  image: {
    width: 95,
    height: 95,
	borderRadius: 5,
  },
  imageContainer: {
	  flexDirection: 'row',
	  width: 95,
    height: 95,
	borderRadius: 5,
  },
  imageContainer1: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
	flexDirection: 'row',
	flex: 1,
    justifyContent: 'space-between',
	alignItems: 'center',
	marginTop: -40
  },
  dateButton: {
    width: 150,
    borderRadius: 16,
	marginLeft: -5
  },
  detailsButton: {
    width: 130,
    borderRadius: 16,
	marginLeft: 7
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -25,
    right: 0,
	width: '100%',
	height: '135%',
	marginTop: -30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  overlayText: {
    color: 'white',
    fontSize: 50,
	marginTop: -10
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  carouselImage: {
    width: 320,
    height: 300,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  fullContainer: {
	  flex: 1,
    justifyContent: 'space-between',
  },
  trashButton: {
    position: 'absolute', // Absolute positioning to place the button at the bottom right
    top: -10, // Distance from the bottom
    right: -5, // Distance from the right
    paddingHorizontal: 0, // Remove padding for a more compact button
  },
  icon: {
    width: 50,
    height: 50,
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
  card: {
    borderRadius: 8,
    padding: 0,
    marginVertical: 10,
    elevation: 3, // For shadow on Android
    shadowColor: '#000', // For shadow on iOS
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
	width: WIDTH - 30,
	marginLeft: -10,
	height: 115,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: 120,
    height: 120,
	marginTop: -10
  },
  imageCard: {
    width: '100%',
    height: '120%',
	marginLeft: -25,
	borderRadius: 5,
	marginTop: -10
  },
  content: {
    flex: 2,
    padding: 10,
	marginTop: -50,
	marginHorizontal: 5,
	marginLeft: -20
  },
});

export default forwardRef(EditOrderDetailsItem);