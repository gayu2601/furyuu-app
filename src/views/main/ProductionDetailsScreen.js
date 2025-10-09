import React, { useState, useEffect } from 'react';
import {
  Layout,
  Text,
  Card,
  Select,
  SelectItem,
  Input,
  Button,
  IndexPath,
  Datepicker,
  TopNavigation,
  Divider,
  Icon,
  Modal,
  CheckBox
} from '@ui-kitten/components';
import {
  ScrollView,
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from "@react-navigation/native";
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePermissions } from './PermissionsContext';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../constants/supabase'
import { storage } from '../extra/storage';
import eventEmitter from './eventEmitter';

const ProductionDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  //console.log(route.params?.order);
  const { order } = route.params;
  console.log('route order', order);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [deletedImages, setDeletedImages] = useState([]);

  // Separate state for each production stage
  const [allData, setAllData] = useState({
    dressId: {
		dressType: '',
		dressSubType: '',
		cuttingWorker: '',
		cuttingDate: new Date(),
		stitchingWorker: '',
		stitchingDate: new Date(),
		finishingWorker: '',
		finishingDate: new Date(),
		checkingWorker: '',
		checkingDate: new Date(),
		checkingPic: [],
		cuttingDone: false,
		stitchingDone: false,
		finishingDone: false,
		checkingDone: false
	}
  });
  
  const employeeJson = storage.getString('Employees');
  console.log('employeeJson', typeof(employeeJson), employeeJson);
  let workerNameOptions = employeeJson && employeeJson !== 'null' ? JSON.parse(employeeJson) : {0: ''};
  console.log('workerNameOptions', workerNameOptions);
  const workerIds = workerNameOptions ? Object.keys(workerNameOptions) : []; // ["1", "2", ...]
  const workerNames = Object.values(workerNameOptions); // ["Vsns", "Sff", ...]
  console.log('workerNameOptions', workerNameOptions, workerIds, workerNames);
  
  const updateData = (field, value) => {
	  setAllData(prev => ({
		...prev,
		[selectedDressId]: {
		  ...prev[selectedDressId],
		  [field]: value
		}
	  }));
	};
	
	const markCheckingDone = (dressNo) => {
		console.log('in markCheckingDone ', order.dressItemId.indexOf(Number(dressNo)));
		eventEmitter.emit('productionStageUpdated', {
			orderNo: order.orderNo,
			index: order.dressItemId.indexOf(Number(dressNo)),
			shouldMark: true
		  });
	}
	
	const unmarkCheckingDone = (dressNo) => {
		console.log('in unmarkCheckingDone ', order.dressItemId.indexOf(Number(dressNo)));
		eventEmitter.emit('productionStageUpdated', {
			orderNo: order.orderNo,
			index: order.dressItemId.indexOf(Number(dressNo)),
			shouldMark: false
		  });
	}
	
	const updatePicData = (value) => {
		setAllData(prev => ({
			...prev,
			[selectedDressId]: {
			  ...prev[selectedDressId],
			  checkingPic: [...(prev[selectedDressId].checkingPic || []), ...(Array.isArray(value) ? value : [value])]
			}
		}));
	}

  const [selectedModelIndex, setSelectedModelIndex] = useState(new IndexPath(0));
  
  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];

  const dressType = order?.dressType || [];
  const dressSubType = order?.dressSubType || [];
  const dressTypes = dressSubType.length > 0 
	  ? dressType.map((type, i) => `${dressSubType[i] ?? ''} ${type}`)
	  : dressType;

  const dressIds = order?.dressItemId;
  const [selectedDressId, setSelectedDressId] = useState(dressIds[0]);
  
  useEffect(() => {
	  const loadValues = async () => {
		try {
			console.log('in loadValues' + order)
		  const { data, error } = await supabase
			.from("ProdDetails")
			.select(
			  `dressItemNo, dressType, dressSubType, cuttingWorker, cuttingDate, stitchingWorker, stitchingDate, finishingWorker, finishingDate, checkingWorker, checkingDate, checkingPic, cuttingDone, stitchingDone, finishingDone, checkingDone`
			)
			.eq("orderNo", order.orderNo);

		  if (error) {
			throw error;
		  }
		  console.log("raw supabase data:", data);

		  const dataMap = new Map(data?.map((item) => [item.dressItemNo, item]) || []);
		  const currentDate = new Date();
		  console.log('dataMap', dataMap);

		  // build rows with public URLs for checkingPic
		  const mappedEntries = await Promise.all(
			order.dressItemId.map(async (id, idx) => {
			  const existing = dataMap?.get(id);
			  const dressType = existing?.dressType || order.dressType[idx] || "";
			  const dressSubType = existing?.dressSubType || order.dressSubType[idx] || "";
			  console.log('existing', existing);

			  let checkingPicUrls = [];
			  if (existing?.checkingPic && Array.isArray(existing.checkingPic)) {
				checkingPicUrls = existing.checkingPic.map((imageUri) => {
				  const { data: urlData } = supabase.storage
					.from("order-images/prodDetails")
					.getPublicUrl(imageUri);
				  return urlData?.publicUrl || null;
				});
			  }
			  console.log('workerNameOptions', workerNameOptions);

			  return [
				id,
				{
				  dressType,
				  dressSubType,
				  cuttingWorker: workerNameOptions?.[existing?.cuttingWorker] || "",
				  cuttingDate: existing?.cuttingDate
					? new Date(existing.cuttingDate)
					: currentDate,
				  stitchingWorker: workerNameOptions?.[existing?.stitchingWorker] || "",
				  stitchingDate: existing?.stitchingDate
					? new Date(existing.stitchingDate)
					: currentDate,
				  finishingWorker: workerNameOptions?.[existing?.finishingWorker] || "",
				  finishingDate: existing?.finishingDate
					? new Date(existing.finishingDate)
					: currentDate,
				  checkingWorker: workerNameOptions?.[existing?.checkingWorker] || "",
				  checkingDate: existing?.checkingDate
					? new Date(existing.checkingDate)
					: currentDate,
				  checkingPic: checkingPicUrls.filter(Boolean),
				  cuttingDone: existing?.cuttingDone,
				  stitchingDone: existing?.stitchingDone,
				  finishingDone: existing?.finishingDone,
				  checkingDone: existing?.checkingDone
				},
			  ];
			})
		  );

		  const mapped = Object.fromEntries(mappedEntries);

		  console.log("mapped:", mapped);
		  setAllData(mapped);
		} catch (error) {
		  console.log(error);
		  showErrorMessage("Error loading production details");
		}
	  };
	  loadValues();
	}, []);


  // Icons
  const PackageIcon = (props) => <Icon {...props} name='cube-outline' />;
  const ScissorsIcon = (props) => <Icon {...props} name='scissors-outline' />;
  const ZapIcon = (props) => <Icon {...props} name='flash-outline' />;
  const CheckCircleIcon = (props) => <Icon {...props} name='checkmark-circle-outline' />;
  const EyeIcon = (props) => <Icon {...props} name='eye-outline' />;
  const CalendarIcon = (props) => <Icon {...props} name='calendar' />;
  const CameraIcon = (props) => <Icon {...props} name='camera-outline' />;  
  const CloseIcon = (props) => <Icon {...props} name="close-outline" style={styles.closeIcon}/>;
  const TrashIcon = (props) => <Icon {...props} name="trash-2-outline" style={styles.closeIcon}/>;

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
			  updatePicData(source.uri);
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
				updatePicData(aa);
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};

  const updateModelSelection = (index) => {
    setSelectedModelIndex(index);
    
    if (index.row >= 0) {
      setSelectedDressId(dressIds[index.row]);
    }
	console.log(dressIds[index.row]);
	console.log(allData)
  };

  const pickImage = async () => {
    setIsModalVisible(true);
  };

  const renderStatusButton = (stage, status) => (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
      <CheckBox
		  checked={status}
		  onChange={(checked) => {
			//const nextStatus = checked ? 'Completed' : 'Pending';
			updateData(stage, checked);
		  }}
		/>
	  <Text style={styles.label}>Completed?</Text>
    </View>
  );
  
  function startsWithFile(str) {
	  return typeof str === 'string' && str.startsWith("file");
	}

  const saveOrder = async() => {
    let cuttingDateFinal = moment(allData.cuttingDate).format('YYYY-MM-DD');
	let stitchingDateFinal = moment(allData.stitchingDate).format('YYYY-MM-DD');
	let finishingDateFinal = moment(allData.finishingDate).format('YYYY-MM-DD');
	let checkingDateFinal = moment(allData.checkingDate).format('YYYY-MM-DD');
	
	console.log(allData)
	// prepare rows with checkingPic uploads
	const rows = await Promise.all(
	  Object.entries(allData).map(async ([dressItemNo, details]) => {
		let picsArr = [];
		let picsArrLocal = [];
		console.log('in saveOrder', details)
		if(details.checkingDone) {
			console.log('calling markCheckingDone')
			markCheckingDone(dressItemNo);
		} else {
			console.log('calling unmarkCheckingDone')
			unmarkCheckingDone(dressItemNo);
		}
		if (details?.checkingPic && Array.isArray(details?.checkingPic)) {
		  for (const pic of details.checkingPic) {
			if(startsWithFile(pic)) {
				const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer());

				// derive file extension
				const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg';
				const path = `${Date.now()}.${fileExt}`;

				// upload to Supabase Storage
				const { error: uploadError } = await supabase.storage
				  .from('order-images/prodDetails')
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
		}
		console.log('picsArr', picsArr)
		console.log('picsArrLocal', picsArrLocal);
		if(deletedImages) {
			const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(deletedImages.flat().map(filename => `prodDetails/${filename}`))
			if(errorRemove) {
				throw errorRemove;
			}
		}

		return {
		  dbRow: {
			orderNo: order.orderNo,
			dressItemNo,
			dressType: details.dressType,
			dressSubType: details.dressSubType,
			cuttingWorker: details.cuttingWorkerId,
			cuttingDate: details.cuttingDate,
			stitchingWorker: details.stitchingWorkerId,
			stitchingDate: details.stitchingDate,
			finishingWorker: details.finishingWorkerId,
			finishingDate: details.finishingDate,
			checkingWorker: details.checkingWorkerId,
			checkingDate: details.checkingDate,
			checkingPic: picsArr,
			cuttingDone: details.cuttingDone,
			stitchingDone: details.stitchingDone,
			finishingDone: details.finishingDone,
			checkingDone: details.checkingDone,
		  },
		  localRow: {
			...details,
			orderNo: order.orderNo,
			dressItemNo,
			checkingPic: picsArrLocal,
		  }
		};
	  })
	);

	const dbRows = rows.map(r => r.dbRow);
	const localRows = rows.map(r => r.localRow);

	// finally upsert
	const { error } = await supabase
	  .from('ProdDetails')
	  .upsert(dbRows, { onConflict: ['dressItemNo'] });

    if(error) {
		console.log('Error updating production details: ', error);
		return;
	}
	
    showSuccessMessage('Production details assigned successfully!');
	eventEmitter.emit('transactionAdded', { onlyEmployeeData: true });
	route.params?.onEditComplete?.(localRows);
	navigation.goBack()
  };
  
  const handleUploadPress = () => {
    if (allData[selectedDressId]?.checkingPic?.length > 0) {
      setImgModalVisible(true);
    } else {
      pickImage();
    }
  };

  const handleConfirmDelete = (indexToDelete) => {
	  const deletedImage = allData[selectedDressId]?.checkingPic[indexToDelete];

	  const updatedImages = allData[selectedDressId]?.checkingPic.filter(
		(_, index) => index !== indexToDelete
	  );
	  updateData('checkingPic', updatedImages);

	  if (deletedImage) {
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

  
  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  return (
    <Layout style={styles.container} level='2'>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Order Details Section */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <PackageIcon style={styles.sectionIcon} fill='#3366FF' />
            <Text category='h6'>Order Details</Text>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Order ID</Text>
              <Input
                value={`ORD_${order.orderNo}`}
                disabled={true}
                style={styles.disabledInput}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Customer Name</Text>
              <Input
                value={order.custName}
                disabled={true}
                style={styles.disabledInput}
              />
            </View>
          </View>

          <Text style={styles.label}>Model/Item</Text>
          <Select
            placeholder='Select garment item'
            value={selectedModelIndex.row >= 0 ? capitalize(dressTypes[selectedModelIndex.row]) : ''}
            selectedIndex={selectedModelIndex}
            onSelect={index => updateModelSelection(index)}
            style={styles.select}
          >
            {dressTypes.map((item, index) => (
              <SelectItem key={index} title={() => (
				  <Text style={styles.selectItem}>
					{item}
				  </Text>
				)}
			  />
            ))}
          </Select>
        </Card>

        {/* Cutting Section */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <ScissorsIcon style={styles.sectionIcon} fill='#FF9500' />
            <Text category='h6'>Cutting</Text>
          </View>

          <Text style={styles.label}>Cutting By</Text>
          <Select
			  placeholder='Select worker name'
			  value={allData[selectedDressId]?.cuttingWorker || ''}
			  onSelect={(index) => {
				const workerId = workerIds[index.row];
				updateData('cuttingWorkerId', workerId);
				updateData('cuttingWorker', workerNameOptions[workerId]);
			  }}
			  style={styles.input}
			>
			  {workerNames.map((worker, index) => (
				<SelectItem key={index} title={worker} />
			  ))}
			</Select>

          <Text style={styles.label}>Date & Time</Text>
          <Datepicker
            date={allData[selectedDressId]?.cuttingDate}
            onSelect={date => updateData('cuttingDate', date)}
            accessoryRight={CalendarIcon}
            style={styles.datepicker}
          />
          {renderStatusButton('cuttingDone', allData[selectedDressId]?.cuttingDone)}
        </Card>

        {/* Stitching Section */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <ZapIcon style={styles.sectionIcon} fill='#8F00FF' />
            <Text category='h6'>Stitching</Text>
          </View>

          <Text style={styles.label}>Stitching By</Text>
          <Select
			  placeholder='Select worker name'
			  value={allData[selectedDressId]?.stitchingWorker || ''}
			  onSelect={(index) => {
				const workerId = workerIds[index.row];  
				updateData('stitchingWorkerId', workerId);
				updateData('stitchingWorker', workerNameOptions[workerId]);
			  }}
			  style={styles.input}
			>
			  {workerNames.map((worker, index) => (
				<SelectItem key={index} title={worker} />
			  ))}
			</Select>

          <Text style={styles.label}>Date & Time</Text>
          <Datepicker
            date={allData[selectedDressId]?.stitchingDate}
            onSelect={date => updateData('stitchingDate', date)}
            accessoryRight={CalendarIcon}
            style={styles.datepicker}
          />
          {renderStatusButton('stitchingDone', allData[selectedDressId]?.stitchingDone)}
        </Card>

        {/* Finishing Section */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <CheckCircleIcon style={styles.sectionIcon} fill='#00E096' />
            <Text category='h6'>Finishing</Text>
          </View>

          <Text style={styles.label}>Finishing By</Text>
          <Select
			  placeholder='Select worker name'
			  value={allData[selectedDressId]?.finishingWorker || ''}
			  onSelect={(index) => {
				const workerId = workerIds[index.row];
				updateData('finishingWorkerId', workerId);
				updateData('finishingWorker', workerNameOptions[workerId]);
			  }}
			  style={styles.input}
			>
			  {workerNames.map((worker, index) => (
				<SelectItem key={index} title={worker} />
			  ))}
			</Select>
		  
		  <Text style={styles.label}>Date & Time</Text>
          <Datepicker
            date={allData[selectedDressId]?.finishingDate}
            onSelect={date => updateData('finishingDate', date)}
            accessoryRight={CalendarIcon}
            style={styles.datepicker}
          />
          {renderStatusButton('finishingDone', allData[selectedDressId]?.finishingDone)}
        </Card>

        {/* Checking Section */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <EyeIcon style={styles.sectionIcon} fill='#3366FF' />
            <Text category='h6'>Quality Checking</Text>
          </View>

          <Text style={styles.label}>Checking By</Text>
          <Select
			  placeholder='Select worker name'
			  value={allData[selectedDressId]?.checkingWorker || ''}
			  onSelect={(index) => {
				const workerId = workerIds[index.row];
				updateData('checkingWorkerId', workerId);
				updateData('checkingWorker', workerNameOptions[workerId]);
			  }}
			  style={styles.input}
			>
			  {workerNames.map((worker, index) => (
				<SelectItem key={index} title={worker} />
			  ))}
			</Select>

          <Text style={styles.label}>Date & Time</Text>
          <Datepicker
            date={allData[selectedDressId]?.checkingDate}
            onSelect={date => updateData('checkingDate', date)}
            accessoryRight={CalendarIcon}
            style={styles.datepicker}
          />

          <Text style={styles.label}>Upload Picture</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPress}>
			{allData[selectedDressId]?.checkingPic?.length > 0 ? (
			  <>
			  <Image 
                    source={{ uri: allData[selectedDressId]?.checkingPic[0] }} 
                    style={styles.coverImage}
                    resizeMode="cover"
			  />
			  <Text style={styles.uploadText}>
				  View images
			  </Text>
			  </>
			) : (
				<>
				<CameraIcon style={styles.uploadIcon} fill='#8F9BB3' />
				<Text style={styles.uploadText}>
				  Tap to upload picture
				</Text>
				</>
			)}
            
          </TouchableOpacity>

          {renderStatusButton('checkingDone', allData[selectedDressId]?.checkingDone)}
        </Card>

        <Button
          style={styles.actionButton}
          status='primary'
          onPress={saveOrder}
        >
          Save
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
              {allData[selectedDressId]?.checkingPic.map((imageUri, index) => (
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
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNavigation: {
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  disabledInput: {
    backgroundColor: '#F7F9FC',
  },
  select: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  datepicker: {
    marginBottom: 8,
  },
  statusButton: {
    alignSelf: 'flex-start',
  },
  completedButton: {
    backgroundColor: '#E8F5E8',
  },
  progressButton: {
    backgroundColor: '#FFF3E0',
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E4E9F2',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
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
  actionButton: {
    marginHorizontal: 120,
    marginBottom: 30
  },
  dataPreview: {
    backgroundColor: '#F0F3FF',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  previewText: {
    fontSize: 12,
    color: '#3366FF',
    fontStyle: 'italic',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
  },
  closeButton: {
    padding: 8,
	position: 'absolute',
	top: 0,
	right: 0
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
});

export default ProductionDetailsScreen;