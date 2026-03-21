import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, ScrollView, TextInput, Dimensions } from 'react-native';
import { Layout, List, ListItem, Modal, Card, Text, Button, Icon, Input, RadioGroup, Radio, CheckBox, useTheme, Divider } from '@ui-kitten/components';
import moment from 'moment';
import { supabase } from '../../constants/supabase';
import NeckTypesModal from './NeckTypesModal';
import { usePermissions } from './PermissionsContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";

const ShareIcon = (props) => <Icon {...props} name='share-outline' />;
const ChevronDownIcon = (props) => <Icon {...props} name='chevron-down-outline' />;
const ChevronUpIcon = (props) => <Icon {...props} name='chevron-up-outline' />;
const TrashIcon = (props) => <Icon {...props} name='trash-2-outline' fill='red'/>;
const PlusIcon = (props) => <Icon {...props} name='plus-outline' />;
const EditIcon = (props) => <Icon {...props} name='edit-outline' />;
const CameraIcon = (props) => <Icon {...props} name='camera-outline' />;
const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' />;
const ShirtIcon = (props) => <Icon {...props} name='person-outline' />;
const RulerIcon = (props) => <Icon {...props} name='maximize-outline' />;

const EditOrderItemComponent = (props, ref) => {
	const { 
	  item, 
	  index,
	  expandedItems, 
	  toggleItemExpansion,
	  measurementFields,
	  isBag,
	  editRouteParams,
	  setOrderAmtChanged
	} = props;
  const navigation = useNavigation();
  const theme = useTheme();
  const [dressImages, setDressImages] = useState([]);
  const [patternImages, setPatternImages] = useState([]);
  const [measImages, setMeasImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [picsRaw, setPicsRaw] = useState(null); 
	const [patternPicsRaw, setPatternPicsRaw] = useState(null);
	const [measPicsRaw, setMeasPicsRaw] = useState(null);
	const [deletedPics, setDeletedPics] = useState([]);
	const [deletedPatternPics, setDeletedPatternPics] = useState([]);
	const [deletedMeasPics, setDeletedMeasPics] = useState([]);
	const [deletedFnImg, setDeletedFnImg] = useState(null);
	const [deletedBnImg, setDeletedBnImg] = useState(null);
	const [deletedSleeveImg, setDeletedSleeveImg] = useState(null);
	const [picType, setPicType] = useState('dress');
  // Edit states
  const [editableItem, setEditableItem] = useState(item);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fnImg, setFnImg] = useState(null);
  const [bnImg, setBnImg] = useState(null);
  const [sleeveImg, setSleeveImg] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  
  const [neckModalField, setNeckModalField] = useState('');
  const [neckModalVisible, setNeckModalVisible] = useState(false);
  const [changedFields, setChangedFields] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    addons: true,
    slots: false,
    neckSleeve: false,
    measurements: false
  });
  
  const [editDressType, setEditDressType] = useState(item.dressType || '');
	const [editDressSubType, setEditDressSubType] = useState(
	  item.dressType === 'salwar'
		? item.dressSubType || ''
		: (item.dressSubType?.trim() || '')
	);

  
  const ADDON_OPTIONS = [
	  "Lining",
	  "Piping",
	  "Embroidery",
	  "Hemming",
	  "Lace",
	  "Falls",
	  "Elastic",
	  "Pocket",
	  "Zipper",
	  "Hook/Button",
	  "Patch Work",
	  "Other",
	];
  
  const sleeveOptions = [
		"Ordinary",
		"Puff",
		"Sleeveless",
		"Draw design"
	  ];
	  
	  const sleeveLenOptions = [
		"Elbow",
		"Half",
		"3/4th",
		"Full"
	  ];
  
    const [selectedIndexSleeve, setSelectedIndexSleeve] = useState(sleeveOptions.indexOf(item.sleeveType) || 0);
	const [selectedIndexSleeveLen, setSelectedIndexSleeveLen] = useState(sleeveLenOptions.indexOf(item.sleeveLength) ||0);
	const [sleeveType, setSleeveType] = useState(item.sleeveType);
	  
    const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();

  const options = [
    { title: 'Take Photo', iconName: 'camera' },
    { title: 'Choose from Gallery', iconName: 'image' },
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader = ({ title, icon: IconComponent, isExpanded, onToggle }) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={onToggle}
    >
      <View style={styles.sectionHeaderContent}>
        <IconComponent style={styles.sectionIcon} />
        <Text category='s1' style={styles.sectionTitle}>{title}</Text>
      </View>
      {isExpanded ? 
        <ChevronUpIcon style={styles.chevronIcon} /> : 
        <ChevronDownIcon style={styles.chevronIcon} />
      }
    </TouchableOpacity>
  );

  const openModal = useCallback((images) => {
    setCurrentImages(images);
    setModalVisible(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const openFullscreen = (imageUrl) => {
    setFullscreenImage(imageUrl);
    setImgModalVisible(true);
  };

  const closeFullscreen = () => {
    setImgModalVisible(false);
    setFullscreenImage(null);
  };

  const getSaveData = () => {
    let a = {
      dressItemId: item.dressItemId,
	  deletedPics,
	  deletedPatternPics,
	  deletedMeasPics,
	  ...(deletedFnImg != null && { deletedFnImg }),
	  ...(deletedBnImg != null && { deletedBnImg }),
	  ...(deletedSleeveImg != null && { deletedSleeveImg }),
	  ...(!('stitchingAmt' in changedFields) && { stitchingAmt: item.stitchingAmt }),
	  ...(!('extraOptions' in changedFields) && { extraOptions: item.extraOptions }),
	  ...(!('dressType' in changedFields) && { dressType: item.dressType }),
      ...(!('dressSubType' in changedFields) && { dressSubType: item.dressSubType }),
	  ...changedFields,
	  ...(changedFields.dressType && { dressType: changedFields.dressType.toLowerCase() }),
    };
	console.log(a)
	return a;
  };

  useImperativeHandle(ref, () => ({
    getSaveData
  })); 
  
  const imagesMap = {
	  dressPics: dressImages,
	  patternPics: patternImages,
	  measurementPics: measImages,
	};

	const rawMap = {
	  dressPics: picsRaw,
	  patternPics: patternPicsRaw,
	  measurementPics: measPicsRaw,
	};

	const setImagesMap = {
	  dressPics: setDressImages,
	  patternPics: setPatternImages,
	  measurementPics: setMeasImages,
	};

	const setRawMap = {
	  dressPics: setPicsRaw,
	  patternPics: setPatternPicsRaw,
	  measurementPics: setMeasPicsRaw,
	};

	const setDeletedMap = {
	  dressPics: setDeletedPics,
	  patternPics: setDeletedPatternPics,
	  measurementPics: setDeletedMeasPics,
	};
	
	const fieldMap = {
	  dress: "dressPics",
	  pattern: "patternPics",
	  meas: "measurementPics",
	};
  
  const pickImage = async (type) => {
		  setPicType(type)
		  setIsModalVisible(true);
	  };
	  
	const handleDeleteImage = (picType, index) => {
	  const images = imagesMap[picType];
	  const rawImages = rawMap[picType];

	  const newImages = [...images];
	  const newRaw = [...rawImages];

	  const deletedItem = rawImages[index];

	  newImages.splice(index, 1);
	  newRaw.splice(index, 1);
	  
	  if(picType === 'dressPics') {
		  const updatedImages = currentImages.filter((_, i) => i !== index);
		  setCurrentImages(updatedImages);
	  }

	  setImagesMap[picType](newImages);
	  setRawMap[picType](newRaw);

	  setDeletedMap[picType](prev => [...prev, deletedItem]);

	  updateItemField(picType, newImages);
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
			  const uri = compressedSrc.uri;
			  const currentImgs = imagesMap[picType];
				const currentRaw = rawMap[picType] || [];

				setImagesMap[picType]([...currentImgs, uri]);
				setRawMap[picType]([...currentRaw, uri]);
				updateItemField(picType, [...currentImgs, uri]);
				
				if(picType === 'dressPics') {
				  setCurrentImages([...currentImages, uri]);
				}
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
				const compressed = await Promise.all(
					result.assets.map(a =>
					  ImageManipulator.manipulateAsync(a.uri, [], { compress: 0.5 })
					)
				  );

				  const newUris = compressed.map(c => c.uri);

				  // update item-local images
				  const currentImgs = imagesMap[picType];
				  const currentRaw = rawMap[picType] || [];

				  setImagesMap[picType]([...currentImgs, ...newUris]);
				  setRawMap[picType]([...currentRaw, ...newUris]);
				  updateItemField(picType, [...currentImgs, ...newUris]);
				  
				  if(picType === 'dressPics') {
					  setCurrentImages([...currentImages, ...newUris]);
				  }
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};
  
  const downloadPics = useCallback(async(picsDb, picsType) => {
    if (!picsDb || picsDb.length === 0) return [];
    
    try {
        const downloadPromises = picsDb.map(async (img) => {
            try {
                const { data, error } = await supabase.storage
                  .from('order-images')
                  .getPublicUrl(`${picsType}/${img}`);
                if (error) throw error;
                return data.publicUrl;
            } catch (error) {
              console.log('Error downloading image: ', error?.message || error);
              return null;
            }
        });
        
        const results = await Promise.all(downloadPromises);
        return results.filter(url => url !== null);
    } catch (error) {
        console.log('Error in downloadPics: ', error?.message || error);
        return [];
    }
}, []);

const downloadDesignPics = useCallback(async(picsDb, picsType) => {
    if (!picsDb) return null;
    console.log('in downloadDesignPics ' + picsDb)
    try {
                const { data, error } = await supabase.storage
                  .from('design-files')
                  .getPublicUrl(`${picsType}/${picsDb}`);
                if (error) throw error;
                return data.publicUrl;
        } catch (error) {
			console.log('Error downloading design image:', error?.message || error);
			return null;
		}
}, []);

  useEffect(() => {
    if (isBag) return;
    
    const loadImages = async () => {
      try {
        setIsLoading(true);
        const downloadTasks = [];
        
        if (item.dressPics) {
			setPicsRaw(item.dressPics);
          downloadTasks.push(
            downloadPics(item.dressPics, 'dressImages').then(imgs => ({ type: 'dress', images: imgs }))
          );
        }
        if (item.patternPics) {
			setPatternPicsRaw(item.patternPics);
          downloadTasks.push(
            downloadPics(item.patternPics, 'patternImages').then(imgs => ({ type: 'pattern', images: imgs }))
          );
        }
        if (item.measurementPics) {
			setMeasPicsRaw(item.measurementPics);
          downloadTasks.push(
            downloadPics(item.measurementPics, 'measurementImages').then(imgs => ({ type: 'measurements', images: imgs }))
          );
        }
		if(item.frontNeckDesignFile) {
			downloadTasks.push(
				downloadDesignPics(item.frontNeckDesignFile, 'frontNeckDesignFile')
					.then(img => ({ type: 'frontNeckDesignFile', images: img }))
			);
		}
		if(item.backNeckDesignFile) {
			downloadTasks.push(
				downloadDesignPics(item.backNeckDesignFile, 'backNeckDesignFile')
					.then(img => ({ type: 'backNeckDesignFile', images: img }))
			);
		}
		if(item.sleeveDesignFile) {
			downloadTasks.push(
				downloadDesignPics(item.sleeveDesignFile, 'sleeveDesignFile')
					.then(img => ({ type: 'sleeveDesignFile', images: img }))
			);
		}
        
        if (downloadTasks.length > 0) {
          const results = await Promise.all(downloadTasks);
          
          results.forEach(result => {
            switch(result.type) {
              case 'dress':
                setDressImages(result.images);
                break;
              case 'pattern':
                setPatternImages(result.images);
                break;
              case 'measurements':
                setMeasImages(result.images);
                break;
			  case 'frontNeckDesignFile':
				setFnImg(result.images);
				break;
			  case 'backNeckDesignFile':
				setBnImg(result.images);
				break;
			  case 'sleeveDesignFile':
				setSleeveImg(result.images);
				break;
            }
          });
        }
      } catch (error) {
        console.log('Error loading images: ', error?.message || error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadImages();
  }, [isBag, item.dressPics, item.patternPics, item.measurementPics]);

  // Update functions
  const updateItemField = (field, value) => {
	setEditableItem(prev => ({
		...prev,
		[field]: value
	  }));
	setChangedFields(prev => ({
		...prev,
		[field]: value
	  }));
  };
  
  const updateSlots = (field, diff, val) => {
	  console.log('in updateSlots', diff, val);
	  setEditableItem(prev => ({
		...prev,
		[field]: val
	  }));
	setChangedFields(prev => ({
		...prev,
		[field]: val,
		slotsDiff: diff,
		slotDates: Object.keys(val)
	  }));
  }

  const addExtraOptions = (newAddons) => {
	console.log('in addExtraOptions ' , newAddons);
	setEditableItem((prev) => ({
			...prev,
			extraOptions: { ...prev.extraOptions, ...newAddons },
	}));
	setChangedFields((prev) => ({
		...prev,
		extraOptions: { ...prev.extraOptions, ...newAddons },
	  }));
  }
  
  const updateNestedField = (parentField, childField, value) => {
    setEditableItem((prev) => ({
		...prev,
		[parentField]: {
			...prev[parentField],
			[childField]: value
		},
	}));
	setChangedFields(prev => ({
		...prev,
		[parentField]: {
			...prev[parentField],
			[childField]: value
		}
	  }));
  };

  const deleteImage = (imageArray, setImageArray, imageIndex, imageType) => {
    const newImages = [...imageArray];
    newImages.splice(imageIndex, 1);
    setImageArray(newImages);
    
    // Update the item's image array
    const fieldMap = {
      'dress': 'dressPics',
      'pattern': 'patternPics', 
      'measurements': 'measurementPics'
    };
    
    if (fieldMap[imageType]) {
      updateItemField(fieldMap[imageType], newImages);
    }
  };
  
  const navigateToSlotScreen = () => {
		console.log('in navigateToSlotScreen')
		console.log(editableItem.slots)
		navigation.navigate('SlotBooking', {slotDate: Object.keys(editableItem.slots), slotsForDress: editableItem.slots, onSave: handleSlotSelection, prevScreen: 'Edit', editRouteParams: editRouteParams, orderNo: item.orderNo, slotsDiff: changedFields.slotsDiff});
	}
	
	const handleSlotSelection = (val) => {
		console.log('in handleSlotSelection');
		console.log(val);
		console.log(item.slots);

		const allDates = new Set([
			...Object.keys(item.slots || {}),
			...Object.keys(val || {}),
		]);

		const diffs = Object.fromEntries(
			[...allDates].map((date) => {
				const oldVal = item.slots?.[date] || {};
				const newVal = val?.[date] || {};

				return [
					date,
					{
						regular: (newVal.regular || 0) - (oldVal.regular || 0),
						express: (newVal.express || 0) - (oldVal.express || 0),
						total: (newVal.total || 0) - (oldVal.total || 0),
					},
				];
			})
		);

		console.log("Diffs:", diffs);

		// optional: skip if no meaningful changes
		/*const hasChanges = Object.values(diffs).some(
			(d) => d.regular !== 0 || d.express !== 0 || d.total !== 0
		);*/

		if (val) {
			updateSlots('slots', diffs, val);
		}
	};
  
  const renderSlotSummary = (slots) => {
    const data = Object.entries(slots).map(([date, { regular, express, total, expressDuration }]) => ({
      date,
      regular,
      express,
      total,
	  expressDuration: expressDuration?.label || ''
    }));
	
	const hasSlots = data.length > 0;

    return (
      <View style={styles.sectionContainer}>
        <SectionHeader 
          title="Selected Slots" 
          icon={CalendarIcon}
          isExpanded={expandedSections.slots}
          onToggle={() => toggleSection('slots')}
        />
        {expandedSections.slots && (
          <View style={styles.sectionContent}>
		    {hasSlots ? (
            <>
            <View style={styles.tableContainer}>
              {/* Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableHeaderCell}>Date</Text>
                <Text style={[styles.tableHeaderCell, styles.centerText]}>Regular</Text>
                <Text style={[styles.tableHeaderCell, styles.centerText]}>Express</Text>
				<Text style={[styles.tableHeaderCell, styles.centerText]}>Express Duration</Text>
              </View>

              {/* Data Rows */}
              {data.map((row, idx) => (
                <View key={idx} style={styles.tableDataRow}>
                  <Text style={styles.tableDataCell}>{row.date}</Text>
                  <View style={[styles.tableDataCell, styles.centerAlign]}>
                    <View style={styles.slotBadge}>
                      <Text style={styles.slotBadgeText}>{row.regular}</Text>
                    </View>
                  </View>
                  <View style={[styles.tableDataCell, styles.centerAlign]}>
                    <View style={styles.expressSlotBadge}>
                      <Text style={styles.slotBadgeText}>{row.express}</Text>
                    </View>
                  </View>
				  <View style={[styles.tableDataCell, styles.centerAlign]}>
                    <View >
                      <Text style={styles.slotBadgeText}>{row.expressDuration}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
			<View style={styles.editButtonContainer}>
              <Button size="small" appearance="outline" onPress={navigateToSlotScreen}>
                Edit Slots
              </Button>
            </View>
		  </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No Slots Selected</Text>
              <View style={styles.editButtonContainer}>
                <Button size="small" appearance="outline" onPress={navigateToSlotScreen}>
                  Select Slots
                </Button>
              </View>
            </View>
          )}
          </View>
        )}
      </View>
    );
  };

  const RenderExtraOptions = ({
	  extraOptions,
	  expandedSections,
	  toggleSection,
	  updateNestedField,
	  addExtraOptions
	}) => {
	  const [modalVisible, setModalVisible] = useState(false);
	  const [selectedAddons, setSelectedAddons] = useState(extraOptions || {});

	  const toggleAddon = (addon) => {
		console.log('in toggleAddon ', addon)
		setSelectedAddons((prev) => {
		  const copy = { ...prev };
		  if (copy[addon] !== undefined) {
			delete copy[addon]; // remove if unchecked
		  } else {
			copy[addon] = ""; // default empty price
		  }
		  return copy;
		});
	  };

	  const updateAddonPrice = (addon, value) => {
		console.log('in updateAddonPrice', addon, value);
		console.log(selectedAddons);
		setSelectedAddons((prev) => ({
		  ...prev,
		  [addon]: value,
		}));
		setOrderAmtChanged(true);
	  };

	  const handleSave = () => {
		console.log('in handleSave', selectedAddons)
		addExtraOptions(selectedAddons); // send all selected with prices - need to call this somewhere else
		setModalVisible(false);
		//setSelectedAddons({});
	  };
	  
	  const hasAddons = Object.keys(extraOptions || {}).length > 0;

	  return (
		<View style={styles.sectionContainer}>
		  <SectionHeader
			title="Add-ons"
			icon={PlusIcon}
			isExpanded={expandedSections.addons}
			onToggle={() => toggleSection("addons")}
		  />

		  {expandedSections.addons && (
			<View style={styles.sectionContent}>
			{hasAddons ? (
			  Object.entries(selectedAddons).map(([option, price]) => (
				<View key={option} style={styles.addonItem}>
				  <Text category="s2" style={styles.addonName1}>
					{option}
				  </Text>
				  <Text category="s2" style={styles.addonPrice}>
					₹{selectedAddons[option]?.toString() || '0'}
				  </Text>
				  
				</View>
			  ))) : (
			    <View style={styles.emptyStateContainer}>
					<Text style={styles.emptyStateText}>No Add-ons Selected</Text>
				</View>
			  )}

		  <Button onPress={() => setModalVisible(true)} size="small" appearance="outline"
			style={styles.addonButton}
			  >
				  {hasAddons ? "Add/Edit Add-ons" : "Add Add-ons"}
				</Button>

			  {hasAddons && (
				<View style={styles.totalSection}>
				  <Text category="s1" style={styles.totalLabel}>
					Total Add-ons:
				  </Text>
				  <Text category="s1" style={styles.totalAmount}>
					₹
					{Object.values(selectedAddons).reduce(
					  (sum, price) => sum + Number(price || 0),
					  0
					)}
				  </Text>
				</View>
			  )}
			</View>
		  )}

		  {/* Add-ons Modal */}
		  <Modal
			visible={modalVisible}
			backdropStyle={styles.backdrop}
			onBackdropPress={() => setModalVisible(false)}
		  >
			<View style={styles.modalContainer}>
			  <Text category="s1" style={styles.modalTitle}>
				Select Add-ons
			  </Text>

			  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}
								  persistentScrollbar={true} keyboardShouldPersistTaps="handled">
				{ADDON_OPTIONS.map((addon) => (
				  <CheckBox
					key={addon}
					checked={selectedAddons[addon] !== undefined}
					onChange={() => toggleAddon(addon)}
					style={styles.checkbox}
				  >
					{addon}
				  </CheckBox>
				))}
				{Object.keys(selectedAddons).length > 0 && (
					<View style={styles.addonInputsSection}>
					  {Object.entries(selectedAddons).map(([addon, value]) => (
						<View key={addon} style={styles.addonRow}>
						  <Text style={styles.addonName}>{addon}</Text>
						  <Input
							placeholder="Price"
							keyboardType="numeric"
							style={styles.addonInput}
							value={value}
							onChangeText={(text) => updateAddonPrice(addon, text)}
						  />
						</View>
					  ))}
					</View>
				)}
			  </ScrollView>
				
			  <Button style={styles.saveButton} onPress={handleSave}>
				Save
			  </Button>
			</View>
		  </Modal>
		</View>
	  );
	};

  const renderDesignPictures = (designPics) => (
    <View style={styles.sectionContainer}>
      <SectionHeader 
        title="Design Pictures" 
        icon={CameraIcon}
        isExpanded={expandedSections.designPics}
        onToggle={() => toggleSection('designPics')}
      />
      {expandedSections.designPics && (
        <View style={styles.sectionContent}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {designPics && designPics.length > 0 && designPics.map((imageUrl, index) => (
              <View key={index} style={styles.designImageContainer}>
                <TouchableOpacity 
                  onPress={() => openFullscreen(imageUrl)}
                  style={styles.designImageTouchable}
                >
                  <Image 
                    source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/100' }} 
                    style={styles.designImageItem} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteImage('patternPics', index)}
                  style={styles.closeButtonDesign}
                >
                  <Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
                </TouchableOpacity>
              </View>
            ))}
            
            <Button style={styles.uploadButton} status='control' onPress={() => pickImage('patternPics')}>
					<View style={styles.uploadContent}>
					  <Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
					  <Text category='s2' style={styles.uploadButtonText}>Upload Design Pics</Text>
					</View>
			</Button>
          </ScrollView>
        </View>
      )}
    </View>
  );
  
  const handleDeleteDesign = (designType, fieldType) => {
		  updateItemField(designType, null);
		  if(fieldType !== 'sleeveType') updateItemField(fieldType, null);
		  switch(fieldType) {
				case 'frontNeckType':
					setDeletedFnImg(fnImg.split('/').pop());
					setFnImg(null);
					break;
				case 'backNeckType':
					setDeletedBnImg(bnImg.split('/').pop());
					setBnImg(null);
					break;
				case 'sleeveType':
					setDeletedSleeveImg(sleeveImg.split('/').pop());
					setSleeveImg(null);
					break;
				default:
					break;
		  }
	}
	
	const handleSelectSleeve = (index) => {
		setSelectedIndexSleeve(index);
		let slTemp = sleeveOptions[index] === 'Draw design' ? 'Custom' : sleeveOptions[index];
		setSleeveType(slTemp)
		updateItemField('sleeveType', slTemp);
		if(editableItem.sleeveDesignFile) {
			updateItemField('sleeveDesignFile', null);
		}
	};
	
	const handleSelectSleeveLen = (index) => {
		setSelectedIndexSleeveLen(index);
		updateItemField('sleeveLength', sleeveLenOptions[index]);
	};
	
	const editSelectedItemDesign = (fieldName, value) => {
		console.log('in editSelectedItemDesign:' + fieldName + ',' + value);
	  updateItemField(fieldName, value);
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

  const renderNeckSleeveDetails = (neckAndSleeve) => (
    <View style={styles.sectionContainer}>
      <SectionHeader 
        title="Neck & Sleeve Details" 
        icon={ShirtIcon}
        isExpanded={expandedSections.neckSleeve}
        onToggle={() => toggleSection('neckSleeve')}
      />
      {expandedSections.neckSleeve && (
        <View style={styles.sectionContent}>
          {/* Front Neck */}
          <View style={styles.neckSleeveDetailItem}>
            <Text category='label' style={styles.detailLabel}>Front Neck Type</Text>
            {editableItem.frontNeckType === 'Custom' && fnImg ? (
              <View style={styles.customDesignContainer}>
                <View style={styles.customImageContainer}>
                  <Image source={{ uri: fnImg }} style={styles.customImage} />
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteDesign('frontNeckDesignFile', 'frontNeckType')}
                  style={styles.deleteDesignButton}
                >
                  <Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
                </TouchableOpacity>
                <Button 
                  style={styles.changeDesignButton} 
                  size='tiny'
                  onPress={() => {
                    handleDeleteDesign('frontNeckDesignFile', 'frontNeckType'); 
                    setNeckModalField('frontNeckType'); 
                    setNeckModalVisible(true);
                  }}
                >
                  Change Front Neck
                </Button>
              </View>
            ) : (
              <Button 
                style={styles.selectTypeButton} 
                status='control' 
                onPress={() => {setNeckModalField('frontNeckType'); setNeckModalVisible(true);}}
              >
                <View style={styles.selectTypeContent}>
                  {editableItem.frontNeckType ? (
                    <View style={styles.selectedContent}>
                      <Text category='s2' style={styles.selectTypeText}>
                        {editableItem.frontNeckType} Front Neck
                      </Text>
                      <Icon name='edit-2-outline' style={styles.editIconSmall} fill='#8F9BB3' />
                    </View>
                  ) : (
                    <Text category='s2' style={styles.selectTypeText}>Select front neck type</Text>
                  )}
                </View>
              </Button>
            )}
          </View>

          {/* Back Neck */}
          <View style={styles.neckSleeveDetailItem}>
            <Text category='label' style={styles.detailLabel}>Back Neck Type</Text>
            {editableItem.backNeckType === 'Custom' && bnImg ? (
              <View style={styles.customDesignContainer}>
                <View style={styles.customImageContainer}>
                  <Image source={{ uri: bnImg }} style={styles.customImage} />
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteDesign('backNeckDesignFile', 'backNeckType')}
                  style={styles.deleteDesignButton}
                >
                  <Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
                </TouchableOpacity>
                <Button 
                  style={styles.changeDesignButton} 
                  size='tiny'
                  onPress={() => {
                    handleDeleteDesign('backNeckDesignFile', 'backNeckType'); 
                    setNeckModalField('backNeckType'); 
                    setNeckModalVisible(true);
                  }}
                >
                  Change Back Neck
                </Button>
              </View>
            ) : (
              <Button 
                style={styles.selectTypeButton} 
                status='control' 
                onPress={() => {setNeckModalField('backNeckType'); setNeckModalVisible(true);}}
              >
                <View style={styles.selectTypeContent}>
                  {editableItem.backNeckType ? (
                    <View style={styles.selectedContent}>
                      <Text category='s2' style={styles.selectTypeText}>
                        {editableItem.backNeckType} Back Neck
                      </Text>
                      <Icon name='edit-2-outline' style={styles.editIconSmall} fill='#8F9BB3' />
                    </View>
                  ) : (
                    <Text category='s2' style={styles.selectTypeText}>Select back neck type</Text>
                  )}
                </View>
              </Button>
            )}
          </View>

          {/* Sleeve Type */}
          <View style={styles.fieldContainer}>
            <Text category='label' style={styles.fieldLabel}>Sleeve Type</Text>
            <RadioGroup
              style={styles.radioGroup}
              selectedIndex={selectedIndexSleeve}
              onChange={(index) => handleSelectSleeve(index)}
            >
              {sleeveOptions.map((option, index) => (
                <Radio key={index}>{option}</Radio>
              ))}
            </RadioGroup>
          </View>

          {/* Custom Sleeve Design */}
          {editableItem.sleeveType === 'Custom' && (
            <View style={styles.customSleeveContainer}>
              {sleeveImg ? (
                <View style={styles.customDesignContainer}>
                  <View style={styles.customImageContainer}>
                    <Image source={{ uri: sleeveImg }} style={styles.customImage} />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteDesign('sleeveDesignFile', 'sleeveType')}
                    style={styles.deleteDesignButton}
                  >
                    <Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
                  </TouchableOpacity>
                  <Button 
                    style={styles.changeDesignButton} 
                    size='tiny'
                    onPress={() => {
                      navigation.navigate('CustomDesign', {
                        field: 'sleeve',
                        returnFile: (selectedFile) => {
                          setSleeveImg(selectedFile);
                          updateItemField('sleeveDesignFile', selectedFile);
                        },
                        prevScreen: 'EditOrderDetails',
                        editRouteParams: editRouteParams
                      });
                    }}
                  >
                    Edit Design
                  </Button>
                </View>
              ) : (
                <Button 
                  style={styles.drawButton} 
                  size='small'
                  onPress={() => {
                    navigation.navigate('CustomDesign', {
                      field: 'sleeve',
                      returnFile: (selectedFile) => {
                        updateItemField('sleeveDesignFile', selectedFile);
                        setSleeveImg(selectedFile);
                      },
                      prevScreen: 'EditOrderDetails',
                      editRouteParams: editRouteParams
                    });
                  }}
                >
                  Draw sleeve design
                </Button>
              )}
            </View>
          )}

          {/* Sleeve Length */}
          <View style={styles.fieldContainer}>
            <Text category='label' style={styles.fieldLabel}>Sleeve Length</Text>
            <RadioGroup
              style={styles.radioGroup}
              selectedIndex={selectedIndexSleeveLen}
              onChange={(index) => handleSelectSleeveLen(index)}
            >
              {sleeveLenOptions.map((option, index) => (
                <Radio key={index}>{option}</Radio>
              ))}
            </RadioGroup>
          </View>
        </View>
      )}
    </View>
  );
  
  const getDisplayFields = (dressType) => {
    if (!dressType) return [];
    let dtFinal = dressType.toLowerCase(); 
    const fields = dtFinal ? measurementFields[dtFinal] || [] : [];
    return fields.sort((a, b) => a.order - b.order);
  };

  const renderMeasurements = (measurements, measurementImages = [], notes = '', dressType) => {
	console.log('in renderMeasurements', measurements);
    const displayFields = getDisplayFields(dressType);
	let keys = Object.keys(measurements);

	let isCodeStyle = keys.length > 0 && (keys[1] === keys[1].toUpperCase() || keys[1].includes("_"));

	let measurementsFinal = isCodeStyle
	  ? keys
	  : keys.map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));

	console.log('measurementsFinal', measurementsFinal);

    const measurementDressGiven = measurementImages && measurementImages.length > 0 ? 'Yes' : 'No';

    return (
      <View style={styles.sectionContainer}>
        <SectionHeader 
          title="Measurements" 
          icon={RulerIcon}
          isExpanded={expandedSections.measurements}
          onToggle={() => toggleSection('measurements')}
        />
        {expandedSections.measurements && (
          <View style={styles.sectionContent}>
            {/* Measurement Status */}
            <View style={styles.measurementStatusContainer}>
              <View style={styles.measurementStatusRow}>
                <Text category='c1' style={styles.measurementStatusLabel}>Measurement dress given:</Text>
                <Text 
                  category='s1' 
                  style={[
                    styles.measurementStatusValue, 
                    measurementDressGiven === 'Yes' ? styles.statusYes : styles.statusNo
                  ]}
                >
                  {measurementDressGiven}
                </Text>
              </View>
            </View>
			
			{/* Measurement Pictures */}
            <View style={styles.measurementImagesContainer}>
              <Text category='label' style={styles.measurementImagesTitle}>Measurement Images:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.measurementImagesScroll}
                contentContainerStyle={styles.measurementImagesScrollContent}
              >
                {measurementImages && measurementImages.length > 0 && measurementImages.map((imageUrl, index) => (
                  <View key={index} style={styles.measurementImageContainer}>
                    <TouchableOpacity 
                      onPress={() => openFullscreen(imageUrl)}
                      style={styles.measurementImageTouchable}
                    >
                      <Image 
                        source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/100' }} 
                        style={styles.measurementImage} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteImage('measurementPics', index)}
                      style={styles.closeButtonDesign}
                    >
                      <Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <Button style={styles.uploadButton1} status='control' onPress={() => pickImage('measurementPics')}>
					<View style={styles.uploadContent}>
					  <Icon name="cloud-upload-outline" style={styles.uploadIcon1} fill={theme['color-primary-500']} />
					  <Text category='s2' style={styles.uploadButtonText}>Upload Measurement Pics</Text>
					</View>
				</Button>
              </ScrollView>
            </View>

            {/* Dynamic Measurement Fields - Editable */}
            <View style={styles.measurementFieldsContainer}>
              {measurementsFinal.map((field) => {
                const value = editableItem.measurementsObj?.[field] || '';
                
                return (
				  <>
                  <View key={field} style={styles.measurementFieldContainer}>
                    <Text category='label' style={styles.measurementLabel}>{field}:</Text>
                    <Input
                      style={styles.measurementInput}
                      value={value.toString()}
                      placeholder="0"
                      keyboardType="numeric"
                      onChangeText={(text) => updateNestedField('measurementsObj', field, text)}
                    />
                  </View>
				  <Divider/>
				  </>
                );
              })}
            </View>

            {/* Editable Notes Section */}
            <View style={styles.notesContainer}>
              <Text category='label' style={styles.notesLabel}>Notes:</Text>
              <Input
                style={styles.notesInput}
                multiline={true}
                numberOfLines={3}
                value={editableItem.notes || ''}
                placeholder="Add notes here..."
                onChangeText={(text) => updateItemField('notes', text)}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.orderContainer}>
        <View style={styles.garmentCard}>
          <View style={styles.loadingContainer}>
            <Text category='s1'>Loading images...</Text>
          </View>
        </View>
      </View>
    );
  }

  const isExpanded = expandedItems.has(index);
  const extraOptionsTotal = Object.values(editableItem.extraOptions).reduce((sum, price) => sum + Number(price || 0), 0);
  const itemTotal = Number(editableItem.stitchingAmt || 0) + extraOptionsTotal;
  const formattedDate = moment(editableItem.dueDate).format('DD-MM-YYYY');
  
  return (
    <View style={styles.topView}>
	  <View style={styles.orderContainer}>
        {/* Garment Info Card */}
        <TouchableOpacity 
          style={styles.garmentCard} 
          onPress={() => toggleItemExpansion(index)}
          activeOpacity={0.7}
        >
          <View style={styles.garmentCardContent}>
            {/* Main Item Header */}
            <View style={styles.itemHeader}>
              {/* Left Section - Image and Info */}
              <View style={styles.itemLeft}>
                {/* Image Section */}
                <View style={styles.garmentImageSection}>
                  {dressImages?.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => openModal(dressImages)}
                      style={styles.garmentImageContainer}
                    >
                      <Image
                        style={styles.garmentImage}
                        source={dressImages[0] ? { uri: dressImages[0] } : editableItem.defaultSource}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.noImageContainer} onPress={() => pickImage('dressPics')}>
                      <CameraIcon style={styles.noImageIcon} />
                      <Text category='c2' style={styles.noImageText}>No images</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Item Info */}
                <View style={styles.garmentInfoSection}>
                  <Text category='s1' style={styles.garmentTitle}>
                    {`${editDressSubType || ''} ${editDressType}`.trim() || 'Dress'}
                  </Text>
                  <Text category='c1' style={styles.itemDue}>
                    Due: {formattedDate}
                  </Text>
                </View>
              </View>
              
              {/* Right Section - Price and Expand Icon */}
              <View style={styles.itemRight}>
                <View style={styles.itemPrice}>
                  <Text category='c1' style={styles.priceLabel}>Price</Text>
                  <Input style={styles.priceValue}
                      value={editableItem.stitchingAmt.toString()}
                      keyboardType="numeric"
                      onChangeText={(text) => {setOrderAmtChanged(true); updateItemField('stitchingAmt', text);}}
					/>
                </View>
                <View style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}>
                    <ChevronDownIcon 
					  style={{width: 30, height: 30}} 
					  color="#666"
					/>
                </View>
              </View>
            </View>
			
			  <Divider />

			  {/* Bottom Row — editable fields */}
			  <View style={styles.bottomRow}>
				<View style={styles.fieldWrap}>
				  <Text category='c1' style={styles.fieldLabel}>Sub type</Text>
				  <Input
					style={styles.fieldInput}
					value={editDressSubType}
					onChangeText={(text) => { setEditDressSubType(text); updateItemField('dressSubType', text.trim()); }}
					autoCapitalize="none"
				  />
				</View>
				<View style={styles.fieldWrap}>
				  <Text category='c1' style={styles.fieldLabel}>Dress type</Text>
				  <Input
					style={styles.fieldInput}
					value={editDressType}
					onChangeText={(text) => { setEditDressType(text); updateItemField('dressType', text.trim()); }}
					autoCapitalize="none"
				  />
				</View>
			  </View>

          </View>
        </TouchableOpacity>

        {/* Expandable Details */}
        {isExpanded && (
          <View style={styles.expandedDetails}>
            <RenderExtraOptions 
					extraOptions={editableItem.extraOptions}
					expandedSections={expandedSections}
					toggleSection={toggleSection}
					updateNestedField={updateNestedField}
					addExtraOptions={addExtraOptions}
			/>
			{renderSlotSummary(editableItem.slots)}
            {renderDesignPictures(patternImages)}
            {renderNeckSleeveDetails(editableItem)}
            {renderMeasurements(editableItem.measurementsObj, measImages, editableItem.notes, editableItem.dressType)}
			<View style={styles.notesContainer}>
				<Text category='label' style={styles.notesLabel}>Notes:</Text>
				<Input
						style={styles.notesInput}
						multiline={true}
						numberOfLines={3}
						value={editableItem.notes || ''}
						placeholder="Add notes here..."
						onChangeText={(text) => updateItemField('notes', text)}
				/>
			</View>
          </View>
        )}
      </View>
      
      {/* Image Modal */}
      <Modal 
        style={styles.fullScreenModal} 
        visible={modalVisible} 
        backdropStyle={styles.backdrop}
        onBackdropPress={closeModal}
      >
        <Card>
          <List
            data={currentImages}
            renderItem={({ item, index }) => (
              <ListItem>
                <Image source={{ uri: item }} style={styles.carouselImage} />
                <Button
                  style={styles.shareButton}
                  appearance="ghost"
                  accessoryLeft={TrashIcon}
                  onPress={() => handleDeleteImage('dressPics', index)}
                />
              </ListItem>
            )}
            horizontal
            keyExtractor={(item, index) => index.toString()}
			ListFooterComponent={() => (
				<Button style={styles.carouselImage} status='control' onPress={() => pickImage('dressPics')}>
				  <View style={styles.uploadContent}>
					<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
					<Text category='s2' style={styles.uploadButtonText}>Upload Material Pics</Text>
				  </View>
				</Button>
			)}
          />
        </Card>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={imgModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={closeFullscreen}
        style={styles.fullScreenModal}
      >
        <Card>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={closeFullscreen}
          >
            <Icon style={styles.closeIcon} name="close-outline" color={theme["color-primary-500"]}/>
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.carouselImage}
              resizeMode="contain"
            />
          )}
        </Card>
      </Modal>
      
      {/* Image Picker Modal */}
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
        editRouteParams={editRouteParams}
        prevScreen='EditOrderDetails'
      />
    </View>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Main container styles
  orderContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  // Garment card styles
  garmentCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 12,
    marginHorizontal: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  garmentCardContent: {
    // Container for card content
  },
  
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  
  garmentImageSection: {
    width: 50,
    height: 50,
  },
  
  garmentImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  
  garmentInfoSection: {
    flex: 1,
  },
  
  garmentTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
	textTransform: 'capitalize'
  },
  
  itemDue: {
    fontSize: 12,
    color: '#666',
  },
  
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  itemPrice: {
    alignItems: 'flex-end',
  },
  
  priceLabel: {
    fontSize: 12,
    color: '#666',
	marginRight: 14
  },
  
  priceValue: {
    fontWeight: '600',
    color: '#333',
	padding: 0
  },
  
  extraTotal: {
    color: '#28a745',
    fontSize: 12,
  },
  
  expandIcon: {
    transform: [{ rotate: '0deg' }],
    transition: 'transform 0.2s ease',
  },
  
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  
  expandIconText: {
    fontSize: 16,
    color: '#666',
  },

  // Expandable details
  expandedDetails: {
    backgroundColor: '#fff',
  },

  // Section styles
  sectionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  sectionIcon: {
    width: 20,
    height: 20,
    tintColor: '#2563eb',
    marginRight: 12,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  
  chevronIcon: {
    width: 20,
    height: 20,
    tintColor: '#6b7280',
  },
  
  sectionContent: {
    padding: 16,
  },

  // Add-ons styles
  addonItem: {
    flexDirection: 'row',
    gap: 140,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  addonPrice: {
    fontWeight: '600'
  },
  totalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 150,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold'
  },

  // Edit button container
  editButtonContainer: {
    marginTop: 10,
    alignItems: 'center',
  },

  // Table styles
  tableContainer: {
    backgroundColor: '#fff',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  tableDataCell: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  centerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expressSlotBadge: {
    backgroundColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },

  // Design pictures styles
  horizontalScrollContent: {
    paddingRight: 16,
  },
  designImageContainer: {
    width: 96,
    height: 96,
    marginRight: 12,
    position: 'relative',
  },
  designImageTouchable: {
    width: 96,
    height: 96,
  },
  designImageItem: {
    width: 96,
    height: 96,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  noContentPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderIcon: {
    width: 24,
    height: 24,
    tintColor: '#9ca3af',
    marginBottom: 8,
  },

  // Neck & Sleeve Details styles
  neckSleeveDetailItem: {
    marginBottom: 20,
  },
  detailLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  customDesignContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  customImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  deleteDesignButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 2,
  },
  changeDesignButton: {
    marginVertical: 10,
    width: 120,
  },
  selectTypeButton: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    height: 60,
    padding: 0,
    backgroundColor: '#F7F9FC',
  },
  selectTypeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTypeText: {
    textAlign: 'center',
    fontSize: 12
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  editIconSmall: {
    width: 16,
    height: 16,
    marginLeft: 8,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customSleeveContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  drawButton: {
    borderRadius: 10,
    marginBottom: 15,
    marginTop: -10,
    width: 200,
    alignItems: 'center'
  },

  // Measurements styles
  measurementStatusContainer: {
    marginBottom: 16,
  },
  measurementStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  measurementStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  measurementStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusYes: {
    color: '#28a745',
  },
  statusNo: {
    color: '#dc3545',
  },
  measurementFieldsContainer: {
    marginBottom: 16,
  },
  measurementFieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldContainer: {
	marginTop: 10 
  },
  measurementLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  measurementInput: {
    width: 80,
  },
  measurementImagesContainer: {
    marginBottom: 16,
  },
  measurementImagesTitle: {
    color: '#495057',
    marginBottom: 8,
	marginTop: -5
  },
  measurementImagesScroll: {
    flexGrow: 0,
  },
  measurementImagesScrollContent: {
    paddingRight: 16,
  },
  measurementImageContainer: {
    marginRight: 12,
    borderRadius: 8,
    position: 'relative',
  },
  measurementImageTouchable: {
    width: 80,
    height: 80,
  },
  measurementImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  notesContainer: {
    marginTop: 12,
  },
  notesLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 80,
  },

  // Common styles
  noImageContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageIcon: {
    width: 16,
    height: 16,
    tintColor: '#999',
  },
  noImageText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  addImageButton: {
    width: 96,
    height: 96,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
  },
  closeButtonDesign: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 2,
  },
  closeIcon: {
    width: 20,
    height: 20,
  },

  // Loading styles
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal styles
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  carouselImage: {
    width: 300,
    height: 200,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  shareButton: {
    position: 'absolute',
    top: 0,
    right: 5
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 25,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalOption: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    margin: 5,
  },
  modalIcon: {
    marginBottom: 5,
  },
  emptyStateContainer: {
	  alignItems: 'center',
	},

	emptyStateText: {
	  fontSize: 14,
	  color: '#999',
	  fontStyle: 'italic',
	},
	addonButton: {
		marginHorizontal: 80,
		marginVertical: 10
	},
	modalContainer: {
		width: 300,
		borderRadius: 12,
		backgroundColor: '#fff',
		padding: 16,
		alignSelf: 'center',
	  },
	  modalTitle: {
		fontWeight: '600',
		fontSize: 16,
		marginBottom: 12,
		textAlign: 'center',
	  },
	  checkbox: {
		marginVertical: 4,
	  },
	  addonInputsSection: {
		marginTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		paddingTop: 12,
	  },
	  addonRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		justifyContent: 'space-between',
	  },
	  addonName: {
		fontSize: 14,
		fontWeight: '500'
	  },
	  addonName1: {
		fontSize: 14,
		fontWeight: '500',
		width: 100
	  },
	  addonInput: {
		marginRight: 12,
		width: 70
	  },
	  saveButton: {
		marginTop: 16,
		borderRadius: 8,
	  },
	  heading: {marginBottom: 10, fontWeight: 'bold'},
	  uploadButton: {
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		width: 110,
		height: 100,
		padding: 0,
		backgroundColor: '#F7F9FC',
	  },
	  uploadButton1: {
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		width: 120,
		height: 100,
		padding: 0,
		backgroundColor: '#F7F9FC',
	  },
	  uploadContent: {
		alignItems: 'center',
		justifyContent: 'center'
	  },
	  uploadIcon: {
		width: 32,
		height: 32,
		marginBottom: 4,
		marginLeft: 15
	  },
	  uploadIcon1: {
		width: 32,
		height: 32,
		marginBottom: 4,
		marginLeft: 25
	  },
	  uploadButtonText: {
		textAlign: 'center',
		fontSize: 12
	  },
	  topView: {marginTop: 5},
	topRow: {
	  flexDirection: 'row',
	  alignItems: 'center',
	  justifyContent: 'space-between',
	  padding: 12,
	  gap: 8,
	},
	topLeft: {
	  flexDirection: 'row',
	  alignItems: 'center',
	  gap: 10,
	  flex: 1,
	},
	topRight: {
	  flexDirection: 'row',
	  alignItems: 'center',
	  gap: 8,
	  flexShrink: 0,
	},
	bottomRow: {
	  flexDirection: 'row',
	  gap: 8,
	  paddingHorizontal: 12,
	  paddingBottom: 12,
	  paddingTop: 8,
	},
	fieldWrap: {
	  flex: 1,
	  gap: 3,
	},
	fieldLabel: {
	  fontSize: 10,
	  color: '#888',
	  marginLeft: 2,
	},
	fieldInput: {
	  height: 32,
	  fontSize: 12,
	},
});

export default forwardRef(EditOrderItemComponent);