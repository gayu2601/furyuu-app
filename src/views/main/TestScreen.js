import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableWithoutFeedback, Alert, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Animated, BackHandler, Keyboard, TextInput } from 'react-native';
import { ApplicationProvider, Layout, List, ListItem, Toggle, Button, Avatar, Text, Icon, Select, SelectItem, Input, Divider, IndexPath, useTheme, Card, Modal, Datepicker, RadioGroup, Radio, Autocomplete, AutocompleteItem, Tooltip as TooltipUi, Spinner, TopNavigationAction, CheckBox } from '@ui-kitten/components';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useUser } from '../main/UserContext';
import { useOrderItems } from '../main/OrderItemsContext';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { generateUniqueId, getIdCounter } from '../main/generateUniqueId';
import { PersonIcon, PhoneIcon, ArrowIosBackIcon } from '../extra/icons';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { resetIdCounter } from '../main/generateUniqueId';
import { FontAwesome } from '@expo/vector-icons';
import { useNetwork } from './NetworkContext';
import * as Sharing from 'expo-sharing';
import Breadcrumbs from '../extra/Breadcrumbs';
import NeckTypesModal from './NeckTypesModal';
import { usePermissions } from './PermissionsContext';
import { firebase } from '@react-native-firebase/analytics';
import { KeyboardAvoidingView } from '../extra/3rd-party';
import Tooltip from 'react-native-walkthrough-tooltip';
import { useWalkthrough } from './WalkthroughContext';

const TestScreen = ({ route }) => {
  const { currentUser } = useUser();
  const { isConnected } = useNetwork();
  const navigation = useNavigation();
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemDesign, setSelectedItemDesign] = useState(null);
  const [custName, setCustName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [inputDisabled, setInputDisabled] = useState(false)
  const [custNameError, setCustNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [phoneErrorValid, setPhoneErrorValid] = useState(false);
  const orderForTypes = ['This Customer', 'Other'];
  const [orderForIndex, setOrderForIndex] = useState(0); 
  const [orderFor, setOrderFor] = useState('This Customer');
  const occOptions = [' ', 'Casual', 'Bridal', 'Ethnic', 'Formal', 'Party', 'Other'];
  const [selectedIndexSubType, setSelectedIndexSubType] = useState(new IndexPath(0));
  const [subTypeVal, setSubTypeVal] = useState('default');
  const [associateCustName, setAssociateCustName] = useState("")
  const [associateCustNameError, setAssociateCustNameError] = useState(false);
  const [savedDesign, setSavedDesign] = useState(false);
  const [savedMeas, setSavedMeas] = useState(false);
  const [ttVisible, setTtVisible] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
    const [expandedItems, setExpandedItems] = useState([true]);
	const [neckModalVisible, setNeckModalVisible] = useState(false);
    const [neckModalField, setNeckModalField] = useState('');
	const { isStepActive, next, end, back } = useWalkthrough();

  const theme = useTheme();
  const breadcrumbRoutes = [
    { name: 'Home', screen: 'HomeMain' },
    { name: 'Customer Details', screen: 'TestCustomer' },
	{ name: 'Order Details', screen: 'TestOrder' },
  ];

    const { addItemContext, addItemBatchContext, getItems, addPicItem, resetItemsForLabel, saveOrder, getNewOrderCust, setNewOrderCust } = useOrderItems();
    const custDetails = useMemo(() => getNewOrderCust(), [getNewOrderCust]);
	const routeParams = route?.params ?? {};
	
	const [occIndex, setOccIndex] = useState(new IndexPath(occOptions.indexOf(custDetails?.occasion || ' '))); 
    const [occasion, setOccasion] = useState(custDetails?.occasion || ' ');
  
  const itemKey = routeParams?.itemName;
	const initialItems = useMemo(() => getItems(itemKey), [getItems, itemKey]);
	console.log('initialItems:')
	console.log(initialItems)
	const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(routeParams?.step || 1);
  
	const [count, setCount] = useState(initialItems.length > 0 ? initialItems[initialItems.length - 1].localId : 0)
	
	const [localCount, setLocalCount] = useState(initialItems.length > 0 ? initialItems[initialItems.length - 1].localId : 1)
	const [localItems, setLocalItems] = useState(routeParams?.editMode ? routeParams?.orderItem : initialItems);

	const [picItemId, setPicItemId] = useState(0)
	const [checkedCust, setCheckedCust] = useState(false)
	const [custExists, setCustExists] = useState(false)
	
	const [showSubDropdown, setShowSubDropdown] = useState(true);
	const [showSubDropdownChudi, setShowSubDropdownChudi] = useState(false);
	
	const [picType, setPicType] = useState('dress');
	const [selectedIndex, setSelectedIndex] = useState(null); 
	
	const [priceError, setPriceError] = useState(false);
	const [occError, setOccError] = useState(false);
	  
	    const [currentIndex, setCurrentIndex] = useState(0);
	  
	  const [custList, setCustList] = useState([])
	  const [filteredCustList, setFilteredCustList] = useState([]);
	    const scrollViewRef = useRef(null);

	  useEffect(() => {
		const namesDbLocal = storage.getString(currentUser.username+'_Customers');
		let namesAll = namesDbLocal ? JSON.parse(namesDbLocal) : [];
		let aa = namesAll.length > 0 ? namesAll : [];
		
		setCustList(aa);
		setFilteredCustList(aa);
	  }, []);

	  const onChangeText = async (query) => {
		setPhoneNo(query);
		if (query === '') {
		  setFilteredCustList([]);
		} else {
		  const filteredData = custList.filter((item) =>
			item.phoneNo.includes(query)
		  );
		  if(filteredData.length > 0) {
			  setFilteredCustList(filteredData);
		  } else {
			  setFilteredCustList([]);
		  }
		  setPhoneError(false);
		  setPhoneErrorValid(false);
		}
	  };

	  const onSelect = (selItem) => {
		setCustName(selItem.custName.trim())
		setPhoneNo(selItem.phoneNo.substring(3));
		//setPhoneNo(filteredCustList[index].substring(3));
	  };

	  const handleSelect = (item) => {
		onSelect(item);
		setShowSuggestions(false);
		Keyboard.dismiss();
		firebase.analytics().logSearch({
			search_term: item.phoneNo,
			origin: item.custName
		  });
	  };
	  
	  const handleFocus = () => {
		setShowSuggestions(true);
	  };
	  
	  const handleAddInputs = () => {
		setSelectedItem((prevSelectedItem) => ({
			...prevSelectedItem,
			extraMeasurements: [
				...prevSelectedItem.extraMeasurements,
				{ name: '', value: '', fromDb: false }
			]
		}));
	  };
	  
	  const updateMeasurement = (index, field, newValue) => {
		setSelectedItem((prevSelectedItem) => {
			// Make a copy of the previous state
			const updatedExtraMeasurements = [...prevSelectedItem.extraMeasurements];

			// Update the specific field of the object at the given index
			updatedExtraMeasurements[index] = {
				...updatedExtraMeasurements[index], // Copy the current object to avoid direct mutation
				[field]: newValue // Update the specific field
			};

			// Return the updated state
			return {
				...prevSelectedItem,
				extraMeasurements: updatedExtraMeasurements
			};
		});
	};


	  const handleInputChange = (index, field, newValue) => {
		setInputPairs((prevPairs) => {
		  const updatedPairs = [...prevPairs]; // Make a copy of the array
		  updatedPairs[index][field] = newValue; // Update the specific field
		  return updatedPairs; // Return the updated array
		});
	  };

	  const handleSaveMeas = () => {
		const jsonObject = selectedItem.extraMeasurements.reduce((acc, pair) => {
		  if (pair.name.trim()) {
			acc[pair.name] = typeof pair.value === 'string' ? (parseInt(pair.value.trim() ? pair.value.trim() : 0)) : pair.value;
		  }
		  return acc;
		}, {});

		console.log('Final JSON Object:', jsonObject);
		return jsonObject;
	  };
	  
	  const handleMeasurementChange = (key, newValue) => {
		setSelectedItem((prevSelectedItem) => ({
		  ...prevSelectedItem,
		  extraMeasurements: {
			...prevSelectedItem.extraMeasurements,
			[key]: newValue, // Update the specific key with the new value
		  },
		}));
	  };

	  const subTypeOptions = {
		default: [],
		chudithar: ['Anarkali', 'Slit-Kurti', 'Umbrella', 'Other'],
		pants: ['Normal', 'Patiala', 'Leggings', 'Gatherings', 'Jeans', 'Bell-bottom', 'Trousers', 'Palazzo', 'Straight',  'Formal', 'Balloon', 'Other']
	  };
	  
	    const optionsSub = subTypeOptions[routeParams.itemName?.toLowerCase()] || subTypeOptions.default;

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

  const keyGroup = dressTypeToKeysMapping[routeParams?.itemName];
  const displayKeys = keysToDisplay[keyGroup] || [];
  const calculatedHeight = displayKeys.length > 6 ? 700 : 450;
	
  const onCheckedChange = (isChecked, id) => {
		updateItem(id, 'dressGiven', isChecked);
	  };
	  
	  const onRepeatDesignCheckedChange = (isChecked, id) => {
		  updateItem(id, 'repeatDesign', isChecked);
		  queueMicrotask(() => {
			  if(isChecked) {
				// Find the first item and the target item once
				const firstItem = localItems[0];
				
				if(firstItem) {
				  // Create a batch update object with all changes
				  const designProperties = {
					frontNeckType: firstItem.frontNeckType,
					backNeckType: firstItem.backNeckType,
					sleeveType: firstItem.sleeveType,
					sleeveLength: firstItem.sleeveLength
				  };
				  
				  // Apply updates in a single batch
				  updateItemBatch(id, designProperties);
				}
			  } else {
				// Create a batch update for unchecking
				const resetProperties = {
				  frontNeckType: '',
				  backNeckType: '',
				  sleeveType: '',
				  sleeveLength: ''
				};
				
				// Apply updates in a single batch
				updateItemBatch(id, resetProperties);
			  }
		  });
		};

	  const onRepeatMeasCheckedChange = (isChecked, id) => {
		  // First update the toggle state immediately for responsiveness
		  updateItem(id, 'repeatMeas', isChecked);
		  queueMicrotask(() => {
			  if(isChecked) {
				const firstItem = localItems[0];
				if(firstItem) {
				  // Create a batch update object with all measurement changes
				  const measurementProperties = {
					dressGiven: firstItem.dressGiven,
					frontNeck: firstItem.frontNeck,
					backNeck: firstItem.backNeck,
					shoulder: firstItem.shoulder,
					sleeve: firstItem.sleeve,
					AHC: firstItem.AHC,
					shoulderToWaist: firstItem.shoulderToWaist,
					chest: firstItem.chest,
					waist: firstItem.waist,
					hip: firstItem.hip,
					leg: firstItem.leg,
					topLength: firstItem.topLength,
					bottomLength: firstItem.bottomLength
				  };
				  
				  updateItemBatch(id, measurementProperties);
				} else {
				  showErrorMessage("No dress items yet added!");
				}
			  }
		  });
		};

	  
	  const [uniqId, setUniqId] = useState(getIdCounter());
	  
	  const [previewFile, setPreviewFile] = useState(null);
	  const [selectedIndexSleeve, setSelectedIndexSleeve] = useState(0);
	  const [selectedIndexSleeveLen, setSelectedIndexSleeveLen] = useState(0);
	  const [inCustom, setInCustom] = useState(false);
	  
	  const handleCustomDesign = (customDesignFile, itemId, fieldName) => {
		  updateItem(itemId, fieldName, customDesignFile);
	  }
	  
	  const handlePreviewDesign = (previewDesignFile, itemId) => {
		  updateItem(itemId, 'previewDesign', previewDesignFile);
	  }

	  const [isModalVisible, setIsModalVisible] = useState(false);
	  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
		  
	const [imgModalVisible, setImgModalVisible] = useState(false);
	const [showDesign, setShowDesign] = useState(false);
	const [showMeas, setShowMeas] = useState(false);
	const [showCarouselDress, setShowCarouselDress] = useState(false);
	const [showCarouselPattern, setShowCarouselPattern] = useState(false);
		  
  const openModal = (uri) => {
    setImgModalVisible(true);
  };

  const closeModal = () => {
    setImgModalVisible(false);
  };
  
  const handleSelectOcc = (index) => {
	    if(index.row === 0) {
			setOccError(true);
			setOccIndex(index);
			setOccasion(occOptions[index.row]);
		} else {
			setOccError(false);
			setOccIndex(index);
			setOccasion(occOptions[index.row]);
		}
	};

	const handleSelectSleeve = (index, itemid) => {
		setSelectedIndexSleeve(index);
		updateItem(itemid, 'sleeveType', sleeveOptions[index] === 'Draw design' ? 'Custom' : sleeveOptions[index])
	};
	
	const handleSelectSleeveLen = (index, itemid) => {
		setSelectedIndexSleeveLen(index);
		updateItem(itemid, 'sleeveLength', sleeveLenOptions[index])
	};
	
	  const sleeveOptions = [
		"Ordinary",
		"Puff",
		"Knot",
		"Sleeveless",
		"Draw design"
	  ];
	  
	  const sleeveLenOptions = [
		"Short",
		"Medium",
		"Full"
	  ];
	  
	  useEffect(() => {
		const backAction = () => {
		  if (inCustom) {
			  navigation.navigate('HomeMain', {screen: 'HomeNew'});
			  setInCustom(false);
			  setShowDesign(true);
			  return true; // Prevent further back action
			}
		  const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
		  if(step === 1) {
			console.log('calling addItemBatchContext:')
			console.log(localItems);
			addItemBatchContext(itemKey, localItems);
			setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion})
			navigation.navigate('HomeMain', {screen: 'HomeNew'});
			return true;
		  } else if (step > 1) {
			console.log('calling addItemBatchContext:')
			console.log(localItems);
			addItemBatchContext(itemKey, localItems); 
			setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion})
			setStep(prevStep => prevStep - 1);
			return true; // Prevent default back behavior
		  } else {
			console.log('in else back')
			return false;
		  }
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	  }, [step, inCustom, custName, phoneNo, occasion, localItems]);
	  
	useFocusEffect(
		useCallback(() => {
			console.log('screen focused')
			console.log(localItems)
			console.log(custName + ',' + phoneNo)
		  return () => {
			console.log('screen unfocused');
			console.log(localItems)
			console.log(custName + ',' + phoneNo)
			addItemBatchContext(itemKey, localItems);
			const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo;
			setNewOrderCust({
			  custName: custName, 
			  phoneNo: phNo, 
			  occasion: occasion
			});
		  };
		}, [navigation, custName, phoneNo, occasion, localItems])
	);

	useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				if (inCustom) {
				  navigation.navigate('HomeMain', {screen: 'HomeNew'});
				  setInCustom(false);
				  setShowDesign(true);
				}
				  const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
				  if(step === 1) {
					console.log('in step1 back')
					addItemBatchContext(itemKey, localItems);
					setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion})
					navigation.navigate('HomeMain', {screen: 'HomeNew'});
				  } else if (step > 1) {
					console.log('in step2 back')
					addItemBatchContext(itemKey, localItems);
					setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion})
					setStep(prevStep => prevStep - 1);
				  } else {
					console.log('in else back')
					navigation.goBack();
				  }
				}
			}/>
		  ),
		});
	}, [navigation, step, custName, phoneNo, localItems, inCustom]);
	  
	  useEffect(() => {
		   if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		   }
		   if(routeParams.custName) {
			  setCustName(routeParams.custName)
			  let ph = routeParams.phoneNo.includes('+91') ? routeParams.phoneNo.substring(3) : routeParams.phoneNo
			  setPhoneNo(ph)
			  //setInputDisabled(false)
			  saveOrder([], {custName: '', phoneNo: '', occasion: ''})
			  resetItemsForLabel()
			  resetIdCounter()
		  }
	  },[routeParams.custName])
	  
	  useEffect(() => {
		  console.log('in custDetails useEffect')
		  console.log(custDetails)
		  if(custDetails && custDetails.custName !== '') {
				console.log(custDetails)
				setCustName(custDetails.custName)
				setPhoneNo(custDetails.phoneNo.substring(3))
				setOccError(false)
				if(custDetails.tempSave) {
					setInputDisabled(true);
				}
		  }
	  }, []);
	  
	  useEffect(() => {
		  console.log('in initial useEffect')
		  const initialThings = async() => {
			  try {
				setLoading(true);
				let ch = false;
				if(!checkedCust && localItems.length === 0) {
					console.log("checking" + checkedCust + ',' + localItems?.length)
					ch = await checkIfCustExists();
				}
			  } catch(error) {
				  console.log(error)
			  } finally {
				  setLoading(false);
			  }
		  }
		  if(step === 2 && !routeParams?.editMode) {
			initialThings();
		  }
		setShowSubDropdown(routeParams?.itemName !== 'pants' && routeParams?.itemName !== 'skirt');
		const fullLengthDress = ["chudithar", "lehenga", "pyjama", "frock", "nightie"];
		setShowSubDropdownChudi(fullLengthDress.includes(routeParams?.itemName));
	  }, [routeParams?.itemName, step]);
	  
	  const addItem = async () => {
		console.log("in additem");
		
		setUniqId(generateUniqueId());
		if (localItems.length > 0) {
		  const firstItem = localItems[0];
		  
		  setCount(prevCount => {
			const newCo = prevCount + 1;
			console.log("uniq id in add item if: " + uniqId + ',' + newCo);
			
			const newItem = { 
			  id: uniqId, 
			  localId: newCo, 
			  dressType: routeParams?.itemName, 
			  dressSubType: firstItem.dressSubType, 
			  dueDate: firstItem.dueDate, 
			  stitchingAmt: '', 
			  frontNeckType: firstItem.frontNeckType, 
			  backNeckType: firstItem.backNeckType, 
			  sleeveType: firstItem.sleeveType, 
			  sleeveLength: firstItem.sleeveLength, 
			  frontNeck: firstItem.frontNeck, 
			  backNeck: firstItem.backNeck, 
			  shoulder: firstItem.shoulder, 
			  sleeve: firstItem.sleeve,
			  AHC: firstItem.AHC,
			  shoulderToWaist: firstItem.shoulderToWaist,
			  chest: firstItem.chest, 
			  waist: firstItem.waist, 
			  hip: firstItem.hip, 
			  leg: firstItem.leg, 
			  topLength: firstItem.topLength, 
			  bottomLength: firstItem.bottomLength, 
			  notes: '', 
			  frontNeckDesignFile: firstItem.frontNeckDesignFile, 
			  backNeckDesignFile: firstItem.backNeckDesignFile, 
			  sleeveDesignFile: firstItem.sleeveDesignFile, 
			  dressPics: [], 
			  patternPics: [], 
			  dressGiven: firstItem.dressGiven, 
			  alterDressType: "", 
			  extraMeasurements: firstItem.extraMeasurements, 
			  editable: true, 
			  repeatDesign: true, 
			  repeatMeas: true 
			};
			
			console.log("newItem if: ", newItem);
			//addItemContext(itemKey, newItem);
			setLocalItems(prevItems => [...prevItems, newItem]);
			return newCo;
		  });
		} else {
		  setCount(prevCount => {
			const newCo = prevCount + 1;
			console.log("uniq id in add item else: " + uniqId + ',' + newCo);
			
			const newItem = { 
			  id: uniqId, 
			  localId: newCo, 
			  dressType: routeParams?.itemName, 
			  dressSubType: optionsSub[selectedIndexSubType.row], 
			  dueDate: new Date(), 
			  stitchingAmt: '', 
			  frontNeckType: "", 
			  backNeckType: "", 
			  sleeveType: "", 
			  sleeveLength: "", 
			  frontNeck: "", 
			  backNeck: "", 
			  shoulder: "", 
			  sleeve: "", 
			  AHC: "",
			  shoulderToWaist: "",
			  chest: "", 
			  waist: "", 
			  hip: "", 
			  leg: "", 
			  topLength: "", 
			  bottomLength: "", 
			  notes: '', 
			  frontNeckDesignFile: null, 
			  backNeckDesignFile: null, 
			  sleeveDesignFile: null, 
			  dressPics: [], 
			  patternPics: [], 
			  dressGiven: false, 
			  alterDressType: "", 
			  extraMeasurements: {}, 
			  editable: true, 
			  repeatDesign: false, 
			  repeatMeas: false 
			};
			
			console.log("newItem else: ", newItem);
			//addItemContext(itemKey, newItem);
			setLocalItems(prevItems => [...prevItems, newItem]);
			return newCo;
		  });
		}
		setLocalCount(prevCount => prevCount + 1);
		setExpandedItems(prev => [...prev, true]);
	  }

	  const updateItem = (id, field, value) => {
		console.log("in updateitem: " + id + ',' + field + ',' + value);
		//updateItemAttribute(id, itemKey, field, value);
		setLocalItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    return { ...item, [field]: value };
                }
                return item;
            });
        });
	  }
	  
	  const updateItemPic = (id, field, value) => {
		console.log("in updateitemPic: " + id + ',' + field + ',' + value);
		//updateItemAttribute(id, itemKey, field, value);
		setLocalItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    return { ...item, [field]: item[field].concat(value) };
                }
                return item;
            });
        });
	  }
	  
	  const updateItemBatch = (id, propertiesToUpdate) => {
		console.log("in updateitemBatch: " + id + ',' + propertiesToUpdate);
		//updateItemAttributeBatch(id, itemKey, propertiesToUpdate);
		setLocalItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    return { ...item, ...propertiesToUpdate };
                }
                return item;
            });
        });
	  }
	  
	  const deleteItem = (id, indexToRemove) => {
		console.log('deleted item id: ' + id);
		setLocalItems(prevItems => prevItems.filter(item => item.id !== id));
		setLocalCount(prevCount => prevCount - 1);
		setExpandedItems(prev => {
		  // If removing the last item, simply pop
		  if (indexToRemove === prev.length - 1) {
			return prev.slice(0, -1);
		  }
		  
		  // Otherwise, filter and create a new array
		  return prev.filter((_, index) => index !== indexToRemove);
		});
	  }
	  
	  const findInvalidItems = (items) => {
		  const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
		  const jsonCacheVal = storage.getString(phNo + '_' + routeParams?.itemName)
		  const invalidItems = items
			.map((item, index) => ({ item, index }))
			.filter(({ item }) => {
				let a = !item.dressGiven &&
						!jsonCacheVal &&
					   !item.frontNeck &&
					   !item.backNeck &&
					   !item.shoulder &&
					   !item.sleeve &&
					   !item.AHC &&
					   !item.shoulderToWaist &&
					   !item.chest &&
					   !item.waist &&
					   !item.hip &&
					   !item.leg &&
					   !item.topLength &&
					   !item.bottomLength &&
					   Object.keys(item.extraMeasurements || {}).length === 0
				console.log(a)
			  return a;
			});

		  return invalidItems;
		};

	  
	  const handleSave = async () => {
			console.log("items")
			console.log(localItems)
			console.log(custName + ',' +phoneNo) 
			try {
				setLoading(true);
				const hasInvalidPrice = localItems.some(item => item.stitchingAmt === null || item.stitchingAmt === '' || item.stitchingAmt === 0);
				if (hasInvalidPrice) {
					setPriceError(true)
					showErrorMessage("Price is required!")
					return;
				}
				const invalidItems = findInvalidItems(localItems);
				console.log("invalidItems: ")
				console.log(invalidItems)
				if (invalidItems.length > 0) {
					showErrorMessage("Provide measurement dress or enter measurements for the dress");
					return;
				} else {
					console.log('in save order else')
					const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
					const updatedItems = localItems.map(item => ({
						  ...item,
						  associateCustName: associateCustName.trim(),
					}));
					console.log('itemKey: ' + itemKey)
					addItemBatchContext(itemKey, updatedItems);
					resetItemsForLabel(itemKey)
					saveOrder(updatedItems, {custName: custName, phoneNo: phNo, occasion: occasion});
					showSuccessMessage("Item added!");
					setLocalItems([]);
					setLocalCount(1)
					setStep(0)
					navigation.reset({
												index: 0,
												routes: [{name: "OrderBagScreen", params: { cleanup: true, itemName: routeParams.itemName, headerImgUri: routeParams.headerImgUri }}]
											})
				}
			} finally {
				setLoading(false);
			}
	  };
	   
	const checkIfCustExists = async () => {
		  console.log('in checkIfCustExists')
		  setCheckedCust(true)
	if(orderFor !== 'Other') {
		  const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
		  console.log(custName + ' , ' + phNo + ', ' + routeParams?.itemName);
		  let a = storage.getString(phNo + '_' + routeParams?.itemName)
			const measure = a ? JSON.parse(a) : null
			
       if (measure) {
		   setCustExists(true)
			 console.log('Data retrieved from cache:', measure);
			 populateMeasurements(measure);
			 return true
       } else {
			console.log('getting meas from db:')
		  if (phNo?.trim()) {
			  
		    try {
			  const { data, error, status } = await supabase
								.from('Measurements')
								.select(`id, dressType, frontNeck, backNeck, sleeve, shoulder, AHC, shoulderToWaist, chest, waist, hip, leg, topLength, bottomLength, extraMeasurements, customerId, Customer!inner(id, custName, phoneNo)`)
								.eq('Customer.phoneNo', phNo)
								.eq('dressType', routeParams?.itemName)
								.eq('otherCust', false)
								.order('id', { ascending: false })
								.limit(1).maybeSingle();

				if (error && status !== 406) {
					console.log(error)
					return false;
				} else {
					console.log("Measurements:");
					console.log(data)	  
					populateMeasurements(data);
					const selectedProperties = ['dressType', 'frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'waist', 'hip', 'leg', 'topLength', 'bottomLength', 'extraMeasurements'];
					if(data) {
							const filteredObject = {};
							selectedProperties.forEach(prop => {
							  filteredObject[prop] = data[prop];
							});
							const resultJson = JSON.stringify(filteredObject, (key, value) => {
											  return value;
											});
							console.log('resultJson:');
							console.log(resultJson);
						storage.set(phNo +'_'+ routeParams?.itemName, resultJson);
						return true
					} else {
						return false
					}
				}
		  } catch (error) {
				console.log(error.message)
				return false
		  }
		} else {
			return false
		}
	   }
	  } else {
		  addItem();
	  }
	   return false
	  };
	  
	  const nonNullZero = (value) => {
		  return value !== null && value !== '0';
	  }
	  
	  const populateMeasurements = (res) => {
		if(res === null || res.length === 0 || routeParams?.itemName === 'Alteration') {
			console.log("in populateMeasurements if")
			  addItem()
		  }
		  else {
			  console.log("in measurements else")
			  console.log(res)
					const frontNeckValue = res.frontNeck ? res.frontNeck.toString() : 0;
					const backNeckValue = res.backNeck ? res.backNeck.toString() : 0;
					const shoulderValue = res.shoulder ? res.shoulder.toString() : 0;
					const sleeveValue = res.sleeve ? res.sleeve.toString() : 0;
					const AHCValue = res.AHC ? res.AHC.toString() : 0;
					const shToWaistValue = res.shoulderToWaist ? res.shoulderToWaist.toString() : 0;
					const chestValue = res.chest ? res.chest.toString() : 0;
					const waistValue = res.waist ? res.waist.toString() : 0;
					const hipValue = res.hip ? res.hip.toString() : 0;
					const legValue = res.leg ? res.leg.toString() : 0;
					const topLengthValue = res.topLength ? res.topLength.toString() : 0;
					const bottomLengthValue = res.bottomLength ? res.bottomLength.toString() : 0
					const extraMeasurementsValue = res.extraMeasurements;
					setUniqId(generateUniqueId())
					setCount(prevCount => {
						const newCo = prevCount + 1;
						console.log("in measurement count: " + newCo)
						const newItem = { id: uniqId, localId: newCo, dressType: routeParams?.itemName, dressSubType: optionsSub[selectedIndexSubType.row], dueDate: new Date(), stitchingAmt: '', frontNeckType: '', backNeckType: '', sleeveType: '', sleeveLength: '', frontNeck: frontNeckValue, backNeck: backNeckValue, shoulder: shoulderValue, sleeve: sleeveValue, AHC: AHCValue, shoulderToWaist: shToWaistValue, chest: chestValue, waist: waistValue, hip: hipValue, leg: legValue, topLength: topLengthValue, bottomLength: bottomLengthValue, notes: '', frontNeckDesignFile: null, backNeckDesignFile: null, sleeveDesignFile: null, dressPics: [], patternPics: [], dressGiven: false, alterDressType: "", extraMeasurements: extraMeasurementsValue, editable: false, repeatDesign: true, repeatMeas: true };
						console.log("newItem:")
						console.log(newItem)
						//addItemContext(itemKey, newItem)
						setLocalItems(prevItems => [...prevItems, newItem]);
						return newCo;
					});
		  }
    }
	
	const deleteItemAlert = (id, index) => {
		Alert.alert(
            "Confirmation", "Do you want to delete this item?",
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => deleteItem(id, index)
                }
            ],
            {cancelable: true}
        )
	}
	
	const handleIncrement = () => {
		addItem()
	  };

	  const pickImage = async (id) => {
		    setPicType('dress');
		    setIsModalVisible(true);
			setPicItemId(id);
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
			  if(picType === 'dress') {
				updateItemPic(picItemId, 'dressPics', source.uri);
			  } else {
				updateItemPic(picItemId, 'patternPics', source.uri);
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
				result.assets.forEach(async(asset) => {
				  const compressedSrc = await ImageManipulator.manipulateAsync(asset.uri, [], { compress: 0.5 });
				  const source = { uri: compressedSrc.uri };
				  console.log(source);
				  if(picType === 'dress') {
					updateItemPic(picItemId, 'dressPics', source.uri);
				  } else {
					updateItemPic(picItemId, 'patternPics', source.uri);
				  }
				})
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};

	  
	  const pickImagePattern = async (id) => {
		  setPicType('pattern');
		  setIsModalVisible(true);
		  setPicItemId(id);
	  };
	  
	const handleDeleteImage = (index, pics, id) => {
		const newImages = [...pics];
		newImages.splice(index, 1);
		updateItem(id, 'dressPics', newImages);
	};
	
	const handleDeleteImagePattern = (index, patternPics, id) => {
		const newImages = [...patternPics];
		newImages.splice(index, 1);
		updateItem(id, 'patternPics', newImages);
	};
	
	const handleOrderForSelect = (index) => {
		setOrderForIndex(index);
		setOrderFor(orderForTypes[index]);
	};
	
	const handleClear = () => {
			setCustName('')
			setPhoneNo('')
			setOccasion(' ')
			setOccIndex(new IndexPath(0))
	}
	
	function isValidPhoneNumber(phoneNo) {
		  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
		  return phoneRegex.test(phoneNo);
	}
	
	const handleNextStep = () => {
		if(routeParams.walkthroughActive) {
			setStep(2);
		} else {
			if(custName.trim() === '') {
				setCustNameError(true);
			} else if(phoneNo.trim() === '') {
				setPhoneError(true);
			} else if(occasion === ' ') {
				setOccError(true);
			}
			const isValid = isValidPhoneNumber(phoneNo)
			if(isValid) {
				setStep(2);
			} else {
				setPhoneErrorValid(true)
			}
		}
	  };
	  
	  const renderSubTypeIcon = (props) => (
		<FontAwesome name='female' size={24} color={theme['color-primary-500']} style={{marginHorizontal: 10}}/>
	  );
	  
	  const renderUploadIcon = (props) => (
		<Icon {...props} name="cloud-upload-outline" />
	  );
	  
	  const handleNavigate = () => {
		  navigation.navigate('OrderBagScreen')
	  }
	  
	  const navigateToContacts = async() => {
		  setShowSuggestions(false);
		  navigation.navigate('ImportCustomerScreen', {itemName: routeParams.itemName, headerImgUri: routeParams.headerImgUri});
	  }
	  
	  const handleDeleteDesign = (designType, fieldType) => {
		  const updatedItemDesign = { ...selectedItemDesign, [designType]: null, [fieldType]: null };
		  setSelectedItemDesign(updatedItemDesign);
			//handleCustomDesign(null, selectedItemDesign.id, designType);
			updateItem(selectedItemDesign.id, designType, null);
            updateItem(selectedItemDesign.id, fieldType, null);
	  }
	  
	  const renderContactsIcon = (props) => (
	    <TouchableOpacity onPress={!inputDisabled ? navigateToContacts : null} disabled={inputDisabled} style={{ opacity: inputDisabled ? 0.5 : 1 }} >
			<Icon {...props} name='person-done-outline' fill={theme['color-primary-500']}/>
		</TouchableOpacity>
	  );
	  
	  /*const clearBagAlert = (editingOther) => {
        Alert.alert(
            "Confirmation", editingOther ? "Changing 'Create order for' will empty the order bag. Proceed?" : "Editing customer details will empty the order bag. Proceed?",
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => {
						//setInputDisabled(false);
						saveOrder([], {custName: '', phoneNo: '', occasion: ''})
						resetItemsForLabel()
						resetIdCounter()
						setCustName('')
						setPhoneNo('')
						setOccasion(' ')
						setOccIndex(new IndexPath(0))
					}
                }
            ],
            {cancelable: true}
        )
    }*/
	
	const showTooltip = () => {
		setTtVisible(true);
		setTimeout(() => setTtVisible(false), 5000);
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
		<Text category='s2'>{item.custName}</Text>
		<Text category='s2' appearance="hint">{item.phoneNo}</Text>
	  </TouchableOpacity>
	));
	
	const renderItem = useCallback(({ item }) => (
	  <RenderItem item={item} onSelect={handleSelect} />
	), [handleSelect]);
	
	  const toggleExpand = (index) => {
		console.log('in toggleExpand: ' + index);
		console.log(expandedItems);
		setExpandedItems(prev => {
		  const newExpanded = [...prev];
		  newExpanded[index] = !newExpanded[index];
		  return newExpanded;
		});
	  };
	
	const RenderItemCollapsible = memo(({ item, index, isExpanded, onToggle }) => {
	    const [localPrice, setLocalPrice] = useState(null);
		const [localNotes, setLocalNotes] = useState(null);
		const [localAlterType, setLocalAlterType] = useState(null);
		const [priceInputState, setPriceInputState] = useState({
			isFocused: false,
			hasError: false
		  });
		const [notesInputState, setNotesInputState] = useState({
			isFocused: false,
			hasError: false
		  });
		const [alterTypeInputState, setAlterTypeInputState] = useState({
			isFocused: false,
			hasError: false
		  });

	  useEffect(() => {
		setLocalPrice(item.stitchingAmt);
		setLocalNotes(item.notes);
		setLocalAlterType(item.alterDressType);
	  }, [item.id]);
	  
	  const debounce = useCallback((fn, delay) => {
		let timeoutId;
		return (...args) => {
		  clearTimeout(timeoutId);
		  timeoutId = setTimeout(() => fn(...args), delay);
		};
	  }, []);
	  
	  const debouncedUpdatePrice = useCallback(
		  debounce((value) => {
			updateItem(item.id, 'stitchingAmt', value);
		  }, 500),
		  [item.id]
		);
		
		const debouncedUpdateNotes = useCallback(
		  debounce((value) => {
			updateItem(item.id, 'notes', value);
		  }, 500),
		  [item.id]
		);
		
		const debouncedUpdateAlterType = useCallback(
		  debounce((value) => {
			updateItem(item.id, 'alterDressType', value);
		  }, 500),
		  [item.id]
		);

		const handlePriceChange = (value) => {
		  setLocalPrice(value);
		  setPriceError(false);
		  setPriceInputState(prev => ({
			  ...prev,
			  hasError: false
			}));
		  debouncedUpdatePrice(value);
		};
		
		const handlePriceFocus = () => {
			setPriceInputState(prev => ({ ...prev, isFocused: true }));
		  };
	  
	  // Submit the price when input loses focus
	  const handlePriceBlur = () => {
		updateItem(item.id, 'stitchingAmt', localPrice);
		setPriceInputState(prev => ({ ...prev, isFocused: false }));
	  };
	  
	  const handleNotesChange = useCallback((value) => {
		setLocalNotes(value)
		setNotesInputState(prev => ({
		  ...prev,
		  hasError: false
		}));
		debouncedUpdateNotes(value);
	  }, []);
	  
	  // Submit notes when input loses focus
	  const handleNotesBlur = () => {
		updateItem(item.id, 'notes', localNotes);
		setNotesInputState(prev => ({ ...prev, isFocused: false }));
	  }
	  
	  const handleNotesFocus = () => {
		setNotesInputState(prev => ({ ...prev, isFocused: true }));
	  };
	  
	  
	  const handleAlterTypeChange = useCallback((value) => {
		setLocalAlterType(value)
		setAlterTypeInputState(prev => ({
		  ...prev,
		  hasError: false
		}));
		debouncedUpdateAlterType(value);
	  }, []);
	  
	  // Submit notes when input loses focus
	  const handleAlterTypeBlur = () => {
		updateItem(item.id, 'alterDressType', localAlterType);
		setAlterTypeInputState(prev => ({ ...prev, isFocused: false }));
	  }
	  
	  const handleAlterTypeFocus = () => {
		setAlterTypeInputState(prev => ({ ...prev, isFocused: true }));
	  };
	  
	  const handleDateSelect = useCallback((nextDate) => {
		const formattedDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
		updateItem(item.id, 'dueDate', formattedDate);
	  }, [item.id]);
	  
	  const handleDesignEdit = useCallback(() => {
		setSelectedItemDesign(item);
		setShowDesign(true);
	  }, [item.id]);
	  
	  const handleMeasurementEdit = useCallback(() => {
		let itemFin = JSON.parse(JSON.stringify(item));
		if(item.extraMeasurements) {
		  itemFin.extraMeasurements = Object.entries(item.extraMeasurements).map(([key, value]) => ({
			name: key,
			value: value,
			fromDb: true
		  }));
		}
		console.log('itemFin:');
		console.log(itemFin);
		setSelectedItem(itemFin); 
		setShowMeas(true);
	  }, [item.id]);
	  
	  const handleImagePick = useCallback(() => {pickImage(item.id), [item.id];});
	  const handlePatternPick = useCallback(() => {pickImagePattern(item.id), [item.id];});
	  const handleViewDressPics = useCallback(() => {setShowCarouselDress(true), []});
	  const handleViewPatternPics = useCallback(() => {setShowCarouselPattern(true), [];});
	  const handleDelete = useCallback(() => {deleteItemAlert(item.id, index), [item.id];});
	  const handleRepeatDesignChange = useCallback((isChecked) => {onRepeatDesignCheckedChange(isChecked, item.id), [item.id];});
	  const handleRepeatMeasChange = useCallback((isChecked) => {onRepeatMeasCheckedChange(isChecked, item.id), [item.id]});
	  
	  // Only render expensive content when expanded
	  const renderExpandedContent = () => {
		if (!isExpanded) return null;
		
		return (
		  <Layout style={styles.collapsibleContent}>
			<Layout style={styles.priceContainer1}>
			  <Layout style={styles.innerLayout}>
				<Icon name='pricetags-outline' style={styles.icon} fill={theme['color-primary-500']}/>
				<Text category='s1' style={{marginLeft: 7}}>Price *</Text>
			  </Layout>
			  <TextInput
			    keyboardType='numeric'
				value={localPrice}
				textStyle={{ textAlign: 'right' }}
				onChangeText={handlePriceChange}
				onBlur={handlePriceBlur}
				onFocus={handlePriceFocus}
				style={[styles.priceInput,
				priceInputState.isFocused && styles.focusedInput,
				priceInputState.hasError && styles.errorInput]}
			  />
			</Layout>
			
			<Layout style={styles.selectContainer}>
					{['chudithar', 'pants'].includes(routeParams?.itemName) && <Select
					  placeholder='Select Type'
					  accessoryLeft={renderSubTypeIcon} 
					  value={item.dressSubType || (selectedIndexSubType !== null ? optionsSub[selectedIndexSubType.row] : 'Select Type')}
					  onSelect={(index) => {setSelectedIndexSubType(index); updateItem(item.id, 'dressSubType', optionsSub[index.row]); }}
					>
					  {optionsSub.map((option, index) => (
						<SelectItem key={index} title={option} />
					  ))}
					</Select>
					}
					{optionsSub[selectedIndexSubType.row] === 'Other' && (
						<Text category='s2' style={{marginTop: 5}}>{`Enter ${routeParams.itemName} type in Notes field`}</Text>
					)}
					{routeParams?.itemName === 'Alteration' && (<Layout style={styles.alterContainer}>
					  <Layout style={styles.innerLayout}>
						<AntDesign name='skin' size={24} color={theme['color-primary-500']}/>
						<Text category='s1' style={{ marginLeft: 16 }}>Alter Dress Type</Text>
					  </Layout>
					  <TextInput
						value={localAlterType}
						textStyle={{ textAlign: 'left' }}
						onChangeText={handleAlterTypeChange}
						onBlur={handleAlterTypeBlur}
						onFocus={handleAlterTypeFocus}
						style={[styles.priceInput,
						alterTypeInputState.isFocused && styles.focusedInput,
						alterTypeInputState.hasError && styles.errorInput]}
					  />
					</Layout>
					)}
			</Layout>
			
			{/* Rest of the expandable content */}
			<Layout style={styles.dateContainer}>
			  <Layout style={styles.innerLayout}>
				<Icon name='calendar-outline' style={styles.icon} fill={theme['color-primary-500']}/>
				<Text category='s1' style={{marginLeft: 7}}>Due date</Text>
			  </Layout>
			  <Datepicker
				date={new Date(item.dueDate) || new Date()}
				min={new Date()}
				status='basic'
				placement='top end'
				onSelect={handleDateSelect}
				boundingElementRect={{ width: 310 }}
			  />
			</Layout>
			
			{index > 0 && showSubDropdown && (
			  <View style={styles.switchContainer}>
				<CheckBox
				  checked={item.repeatDesign}
				  onChange={handleRepeatDesignChange}
				>
				  {evaProps => <Text category='s1' style={styles.checkboxText}>Repeat <Text category='label' style={styles.checkboxStyle}>'Dress 1'</Text> neck, sleeve types?</Text>}
				</CheckBox>
			  </View>
			)}
			
			{(index === 0 || !item.repeatDesign) && showSubDropdown && (
					<Layout style={styles.priceContainer}>
					  <Layout style={styles.innerLayout}>
						<Icon name="brush-outline" style={styles.icon} fill={theme['color-primary-500']}/>
						<Text category="s1" style={{ marginLeft: 7 }}>
						  Neck & Sleeve
						</Text>
					  </Layout>

					  {/* Edit Button */}
					  <Button
						appearance="ghost"
						status="primary"
						size="medium"
						style={{marginRight: 5}}
						onPress={handleDesignEdit}
					  >
						{savedDesign ? 'Updated': 'Edit'}
					  </Button>
					</Layout>
				  )}
				  
				  {index > 0 && (  
					<View style={styles.switchContainer}>
					  <CheckBox
						  checked={item.repeatMeas}
						  onChange={handleRepeatMeasChange}
						>
						  {evaProps => <Text category='s1' style={styles.checkboxText}>Repeat <Text category='label' style={styles.checkboxStyle}>'Dress 1'</Text> measurements?</Text>}
						</CheckBox>
					</View>
				  )}
				  
				  {(index === 0 || !item.repeatMeas) && (
					<ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled"
					  showsVerticalScrollIndicator={true}>
					  <Layout style={styles.priceContainer}>
						<Layout style={styles.innerLayout}>
						  <MaterialCommunityIcons name='ruler' size={24} color={theme['color-primary-500']}/>
						  <Text category="s1" style={{ marginLeft: 16 }}>
							Measurements *
						  </Text>
						</Layout>

						{/* Edit Button */}
						<Button
						  appearance="ghost"
						  status="primary"
						  size="medium"
						  style={{marginRight: 5}}
						  onPress={handleMeasurementEdit}
						>
						  {savedMeas ? 'Updated' : 'Edit'}
						</Button>
					  </Layout>
					</ScrollView>
				  )}
				  
				  <View style={{flexDirection: 'row', gap: 20, marginLeft: 40}}>
					<Layout style={styles.imageContainer}>
					  {item.dressPics.length > 0 ? (
						<View style={styles.imageWrapper}>
						  <Image source={{ uri: item.dressPics[0] }} style={styles.image} />
						  <TouchableOpacity onPress={handleViewDressPics} style={styles.overlay}>
							<Text category='s2' style={styles.overlayText}>View Material Pics</Text>
						  </TouchableOpacity>
						</View>
					  ) : (
						// If no images, show the upload button
						<Button style={styles.uploadButton} status='control' onPress={handleImagePick}>
						  <View style={styles.uploadContent}>
							<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
							<Text category='s2' style={styles.uploadButtonText}>Upload Material Pics</Text>
						  </View>
						</Button>
					  )}
					</Layout>
					
					<Layout style={styles.imageContainer}>
					  {item.patternPics.length > 0 ? (
						<View style={styles.imageWrapper}>
						  <Image source={{ uri: item.patternPics[0] }} style={styles.image} />
						  <TouchableOpacity onPress={handleViewPatternPics} style={styles.overlay}>
							<Text category='s2' style={styles.overlayText}>View Design Pics</Text>
						  </TouchableOpacity>
						</View>
					  ) : (
						<Button style={styles.uploadButton} status='control' onPress={handlePatternPick}>
						  <View style={styles.uploadContent}>
							<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
							<Text category='s2' style={styles.uploadButtonText}>Upload Design Pics</Text>
						  </View>
						</Button>
					  )}
					</Layout>
				</View>

			    <TextInput
					value={localNotes}
					placeholder='Notes'
					onChangeText={handleNotesChange}
					onBlur={handleNotesBlur}
					onFocus={handleNotesFocus}
					style={[
						styles.notesInput,
						notesInputState.isFocused && styles.focusedInput,
						notesInputState.hasError && styles.errorInput
					]}
				/>
		  </Layout>
		);
	  };

	  return (
		<Layout style={styles.collapsibleItemContainer}>
		  <TouchableOpacity onPress={onToggle} style={styles.collapsibleHeader}>
			<Text category='s1' style={styles.itemTitle}>Dress {index + 1}</Text>
			<View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
			  <Icon 
				name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} 
				style={styles.expandIcon} 
				fill={theme['color-primary-500']}
			  />
			  {index > 0 && (<Button
				appearance="ghost"
				accessoryLeft={(props) => <Icon {...props} name="trash-outline" fill='#FF6363'/>}
				size='small'
				onPress={handleDelete}
				style={styles.trashIcon}
			  />)}
			</View>
		  </TouchableOpacity>
		  
		  {renderExpandedContent()}
		</Layout>
	  );
	}, (prevProps, nextProps) => {
	  return (
		prevProps.isExpanded === nextProps.isExpanded &&
		prevProps.item.id === nextProps.item.id &&
		prevProps.item.localId === nextProps.item.localId &&
		prevProps.item.stitchingAmt === nextProps.item.stitchingAmt &&
		prevProps.item.notes === nextProps.item.notes &&
		prevProps.item.dueDate === nextProps.item.dueDate &&
		prevProps.item.repeatDesign === nextProps.item.repeatDesign &&
		prevProps.item.repeatMeas === nextProps.item.repeatMeas &&
		prevProps.item.dressPics.length === nextProps.item.dressPics.length &&
		prevProps.item.patternPics.length === nextProps.item.patternPics.length
		// Add other critical props as needed
	  );
	});
	
	const renderItems = () => {
		return (
		  <FlatList
			data={localItems}
			keyExtractor={(item) => item.id.toString()}
			renderItem={({ item, index }) => (
			<>
			  <RenderItemCollapsible 
				key={item.id}
				item={item} 
				index={index} 
				isExpanded={!!expandedItems[index]} 
				onToggle={() => toggleExpand(index)}
			  />
			  <Modal style={styles.fullScreenModal} visible={showCarouselDress} backdropStyle={styles.backdrop} onBackdropPress={() => setShowCarouselDress(false)}>
										<Card style={styles.modalContent}>
											<TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCarouselDress(false)}>
											  <Icon name="close-outline" style={styles.modalCloseIcon} />
											</TouchableOpacity>
											<View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
												{item.dressPics.map((image, index) => (
												<View key={index} style={styles.imageWrapper}>
												  <Image source={{ uri: image }} style={styles.image} />
												  <TouchableOpacity
													onPress={() => handleDeleteImage(index, item.dressPics, item.id)}
													style={styles.closeButton}
												  >
													<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
												  </TouchableOpacity>
												</View>
												))}
												<Button style={styles.uploadButton} status='control' onPress={() => pickImage(item.id)}>
												  <View style={styles.uploadContent}>
													<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
													<Text category='s2' style={styles.uploadButtonText}>Upload Material Pics</Text>
												  </View>
												</Button>
											</View>
										</Card>
									</Modal>
					
									<Modal style={styles.fullScreenModal} visible={showCarouselPattern} backdropStyle={styles.backdrop} onBackdropPress={() => setShowCarouselPattern(false)}>
										<Card style={styles.modalContent}>
											<TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCarouselPattern(false)}>
											  <Icon name="close-outline" style={styles.modalCloseIcon} />
											</TouchableOpacity>
											<View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
												{item.patternPics.map((image, index) => (
													<View key={index} style={styles.imageWrapper}>
													  <Image source={{ uri: image }} style={styles.image} />
													  <TouchableOpacity
														onPress={() => handleDeleteImagePattern(index, item.patternPics, item.id)}
														style={styles.closeButton}
													  >
														<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
													  </TouchableOpacity>
													</View>
												))}
												<Button style={styles.uploadButton} status='control' onPress={() => pickImagePattern(item.id)}>
												  <View style={styles.uploadContent}>
													<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
													<Text category='s2' style={styles.uploadButtonText}>Upload Design Pics</Text>
												  </View>
												</Button>
											</View>
										</Card>								
						</Modal>
				</>
			)}
			initialNumToRender={3} // Render only visible items initially
			maxToRenderPerBatch={2} // Limit batch size
			windowSize={5} // Buffer size
			removeClippedSubviews={true} // Remove items outside of viewport
			getItemLayout={(data, index) => ({
			  length: 100, // Approximate height of collapsed item
			  offset: 100 * index,
			  index,
			})}
		  />
		);
	};
	
	const updateSelectedItemDesign = (fieldName, value) => {
		console.log('in updateSelectedItemDesign: ' + fieldName + ',' + value);
	  const updatedItemDesign = { ...selectedItemDesign, [fieldName]: value };
	  setSelectedItemDesign(updatedItemDesign);
	  setSavedDesign(true);
	  updateItem(selectedItemDesign.id, fieldName, value)
	};
	
	const saveAllMeas = () => {
									console.log('onPress selectedItem.extraMeasurements:')
									console.log(selectedItem.extraMeasurements);
									if(selectedItem.extraMeasurements?.length > 0) {
										setSavedMeas(true);
										let aMeas = handleSaveMeas();
										console.log('aMeas:')
										console.log(aMeas);
										updateItem(selectedItem.id, 'extraMeasurements', aMeas);
									}
									setShowMeas(false);
								}
	
  return (
	<ScrollView ref={scrollViewRef} style={styles.container} keyboardShouldPersistTaps="handled">
	  <Tooltip
				  isVisible={isStepActive('Test', 'dressDetails')}
				  content={
					<View style={styles.tooltipContent}>
					  <Text style={styles.tooltipText}>
						Add price, neck, sleeve and measurements and click 'Proceed to create order'
					  </Text>
					  <View style={styles.tooltipButtons}>
						<TouchableOpacity onPress={() => {end(); navigation.goBack();}}>
						  <Text style={styles.skipText}>Skip Tour</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => {back(); setStep(1); }}>
						  <Text style={styles.skipText}>Back</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.nextButton1} onPress={next}>
						  <Text style={styles.nextText}>Next (4/6)</Text> 
						</TouchableOpacity>
					  </View>
					</View>
				  }
				  placement="top"
				  backgroundColor="rgba(0,0,0,0.5)"
				  showChildInTooltip={false}
				  onClose={end}
				>
				</Tooltip>
	  {loading ? (
				<ActivityIndicator size="large" style={styles.spinner} />
	  ) : (  
	  <>
        <Layout style={styles.header}>
          <Image 
            source={routeParams?.headerImgUri}
            style={styles.headerImage}
          />
        </Layout>

        <Layout style={styles.content}>
		  	<Tooltip
			  isVisible={isStepActive('Test', 'custDetails')}
			  content={
				<View style={styles.tooltipContent}>
				  <Text style={styles.tooltipText}>
					Add customer details in this page and click 'Next'
				  </Text>
				  <View style={styles.tooltipButtons}> 
					<TouchableOpacity onPress={() => {end(); navigation.goBack();}}>
					  <Text style={styles.skipText}>Skip Tour</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={back}>
					  <Text style={styles.skipText}>Back</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.nextButton1} onPress={() => {next(); handleNextStep();}}>
					  <Text style={styles.nextText}>Next (3/6)</Text>
					</TouchableOpacity>
				  </View>
				</View>
			  }
			  placement="top"
			  backgroundColor="rgba(0,0,0,0.5)"
			  showChildInTooltip={false}
			  onClose={end}
			>
			</Tooltip>
			
		<Breadcrumbs steps={breadcrumbRoutes} itemName={routeParams.itemName} headerImgUri={routeParams.headerImgUri} step={step} setStep={setStep} navigation={navigation} bcDisabled={phoneNo ? false : true}/>

		{step === 1 ? (
          <TouchableWithoutFeedback onPress={() => {
			  setShowSuggestions(false); // Hide the suggestions when tapping outside
			  Keyboard.dismiss(); // Close keyboard when tapping outside
		  }}>
		  <View>
			<Text category='h6' style={styles.title}>Customer Details</Text>
			<Card style={styles.card} status="primary">
			  <Input
				status={(phoneError || phoneErrorValid) ? 'danger' : 'basic'}
				style={{ width: '100%' }}
				label="Customer Phone Number *"
				keyboardType="phone-pad"
				accessoryRight={renderContactsIcon}
				maxLength={10}
				value={phoneNo}
				onChangeText={(text) => {
				  onChangeText(text);
				  setPhoneError(false);
				  setPhoneErrorValid(false);
				  setShowSuggestions(text.length > 0); // Show suggestions only if text exists
				}}
				onFocus={handleFocus}
			  />

			<View style={{zIndex: 1}}>
			{showSuggestions && (
			  <>
				{filteredCustList.length > 0 && (
					<FlatList
					  data={filteredCustList}
					  keyExtractor={(item, index) => index.toString()}
					  style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						backgroundColor: 'white',
						borderWidth: 1,
						borderColor: '#ccc',
						borderRadius: 5,
						zIndex: 1000,
					  }}
					  keyboardShouldPersistTaps="handled"
					  renderItem={renderItem}
					/>
			  )}
			</>
			)}
			</View>

				{phoneError && <Text status='danger'>Phone number is required</Text>}
				{phoneErrorValid && <Text status='danger'>Please enter a valid phone number</Text>}
				
				<Input
					status={custNameError ? 'danger' : 'basic'}
					label='Customer name *'
					style={styles.formInput}
					accessoryRight={PersonIcon}
					value={custName}
					onChangeText={(text) => {
						if (inputDisabled) return;
						setCustName(text);
						setCustNameError(false);
					}}
				  />
				{custNameError && <Text status='danger'>Customer name is required</Text>}
			
			<View>
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
				  <Text category='label' style={{marginTop: 20, marginBottom: 5}}>
					Create Order for
				  </Text>
				  <TooltipUi
					anchor={() => (
					  <Button
						  appearance="ghost"
						  size="small"
						  accessoryLeft={(props) => <Icon {...props} name="info-outline" />}
						  onPress={showTooltip}
						  style={{marginBottom: -10, marginLeft: -15}}
						/>
					)}
					visible={ttVisible}
					onBackdropPress={() => setTtVisible(false)}
				  >
					Select 'Other' to create order for someone else
				  </TooltipUi>
				</View>

				  <RadioGroup
					selectedIndex={orderForIndex}
					onChange={handleOrderForSelect}
					style={{ flexDirection: 'row' }}  
				  >
					{orderForTypes.map((orderForType, index) => (
					  <Radio key={index}>{orderForType}</Radio>
					))}
				  </RadioGroup>
				</View>	
				
				{orderFor === 'Other' && (
					<>
						<Input
							status={associateCustNameError ? 'danger' : 'basic'}
							style={styles.formInput}
							autoCapitalize='none'
							label='Other Customer Name'
							accessoryRight={PersonIcon}
							value={associateCustName}
							onChangeText={text => {
								setAssociateCustName(text)
								setAssociateCustNameError(false)
							}}
						  />
						  {associateCustNameError && <Text status='danger'>Name is required</Text>}
					</>
				)}
				
				<Select
								style={styles.selectFieldOcc}
								label='Occasion *'
								selectedIndex={occIndex}
								onSelect={handleSelectOcc}
								value={occasion}
							  >
								{occOptions.map((option, index) => (
								  <SelectItem title={option} key={index} style={{backgroundColor: 'white'}}/>
								))}
				</Select>
				{occError && <Text status='danger'>Select an occasion type</Text>}
          </Card>
		  <View style={styles.nextButtonContainer}>
		    <Button appearance='outline' style={styles.cancelButton} onPress={handleClear}>Clear details</Button>
			<Button onPress={handleNextStep} style={styles.nextButton} disabled={!routeParams?.walkthroughActive && (!custName || !phoneNo || occasion === ' ')}>Next</Button>
		  </View>
		</View>
		</TouchableWithoutFeedback>
        ) : (
          <>

          <Text category='h6' style={styles.title}>Fill and Confirm your Order</Text>
			  {renderItems()}

          <Layout style={styles.footer}>
			  <Button 
				appearance='outline'
				onPress={handleIncrement}
			  >
				Add more
			  </Button>
			   <Button 
					onPress={handleSave}
				>
					Proceed to create order
				</Button>
          </Layout>
		  </>
		)}
        </Layout>
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
		</>
	  )}
	  
		{selectedItem && (
			<Modal style={styles.fullScreenModalMeas} visible={showMeas} backdropStyle={styles.backdrop} onBackdropPress={() => setShowMeas(false)}>
				<ScrollView style={[styles.scrollView, {height: calculatedHeight}]}
				  contentContainerStyle={styles.scrollViewContent}
				  showsVerticalScrollIndicator={true}
				  bounces={false}
				  nestedScrollEnabled={true}
				  keyboardShouldPersistTaps="handled"
				>
						  <Layout style={styles.tabContent}>
							<View style={styles.fieldContainer2}>
								<Text category='label' >Measurement Dress Given</Text>
								<CheckBox
								  checked={selectedItem.dressGiven}
								  onChange={(isChecked) => {
											  const updItem = { ...selectedItem, dressGiven: isChecked };
											  setSelectedItem(updItem);
											  setSavedMeas(true);
											  onCheckedChange(isChecked, selectedItem.id)
									}}
								/>
							</View>
							  {displayKeys.map((key) => {
								  return (
								<View key={key} style={styles.fieldContainer2}>
								  <Text category='label'>{displayKeysLabel[key]}</Text>
								  <Input
									style={{width: 100}}
									autoCapitalize='none'
									keyboardType='numeric'
									value={selectedItem[key].toString()}
									size='small'
									onChangeText={(value) => { 
										const updItem = { ...selectedItem, [key]: value };
										updateItem(selectedItem.id, key, value);
										setSavedMeas(true);
										setSelectedItem(updItem);
									}}
								  />
								</View>
								)
							  })}
							  {selectedItem.extraMeasurements && selectedItem.extraMeasurements.map((pair, index) => {
								  console.log(pair.name + ',' + pair.value + ',' + pair.fromDb)
								  return (
								<View key={index} style={styles.fieldContainer2}>
								  {pair.fromDb ? (
								    <>
									  <Text category='label'>{pair.name}</Text>
									  <Input
										style={{width: 100}}
										placeholder="Size"
										autoCapitalize='none'
										keyboardType='numeric'
										value={pair.value.toString()}
										size='small'
										onChangeText={(newValue) => {setSavedMeas(true); handleMeasurementChange(pair.name, newValue);}}
									  />
									</>
								  ) : (
								    <>
										<Input
										  placeholder="Name"
										  autoCapitalize='none'
										  size='small'
										  value={pair.name}
										  onChangeText={(newValue) => {
											setSavedMeas(true);
											updateMeasurement(index, 'name', newValue);
										  }}
										/>
										<Input
										  placeholder="Size"
										  autoCapitalize='none'
										  size='small'
										  keyboardType='numeric'
										  value={pair.value}
										  onChangeText={(newValue) => {
											setSavedMeas(true);
											updateMeasurement(index, 'value', newValue);
										  }}
										/>
									</>
								  )}
								  
								</View>
								)
							  })}
							  
							  <View style={styles.buttonTextContainer}>
									<Button
										  appearance='ghost'
										  size='large'
										  accessoryLeft={(props) => <Icon {...props} name="plus-outline"/>}
										  onPress={handleAddInputs}
										>
										  {() => (
											<Text category='label'>Add more measurement(s)</Text>
										  )}

										</Button>
							  </View>
							<View style={{alignItems: 'center'}}>
								<Button size='small' onPress={saveAllMeas}
								>
									Save
								</Button>
							</View>
						  </Layout>
						</ScrollView>
					  </Modal>
		)}
		
		{selectedItemDesign && (
					  <Modal style={styles.fullScreenModalMeas} visible={showDesign} backdropStyle={styles.backdrop} onBackdropPress={() => setShowDesign(false)}>
						<ScrollView keyboardShouldPersistTaps="handled">
						  <Layout style={styles.tabContent}>
						    <View style={styles.tabContentRow}>
							<View>
							<Text category='label' style={styles.labelText}>Front Neck</Text>
							{selectedItemDesign.frontNeckDesignFile ? (
								<View style={{marginTop: 10}}>
										<View style={{borderWidth: 1, borderRadius: 8}}>
											<Image source={{ uri: selectedItemDesign.frontNeckDesignFile }} style={styles.carouselImage} />
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
									{selectedItemDesign.frontNeckType ? (
									  <View style={styles.selectedContent}>
										<Text category='s2' style={styles.uploadButtonText}>
										  {selectedItemDesign.frontNeckType} Front Neck
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
								{selectedItemDesign.backNeckDesignFile ? (
									<View style={{marginTop: 10}}>
										<View style={{borderWidth: 1, borderRadius: 8}}>
											<Image source={{ uri: selectedItemDesign.backNeckDesignFile }} style={styles.carouselImage} />
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
										{selectedItemDesign.backNeckType ? (
										  <View style={styles.selectedContent}>
											<Text category='s2' style={styles.uploadButtonText}>
											  {selectedItemDesign.backNeckType} Back Neck
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

							<View style={styles.fieldContainer1}>
							  <Text category='label' style={styles.fieldLabel}>Sleeve</Text>
							  <RadioGroup
								style={styles.selectFieldRadio}
								selectedIndex={selectedItemDesign.sleeveType === 'Custom' ? 4 : sleeveOptions.indexOf(selectedItemDesign.sleeveType) || selectedIndexSleeve}
								onChange={(index) => {
									const updatedItemDesign = { ...selectedItemDesign, sleeveType: sleeveOptions[index] === 'Draw design' ? 'Custom' : sleeveOptions[index] };
									setSelectedItemDesign(updatedItemDesign);
									setSavedDesign(true);
									handleSelectSleeve(index, selectedItemDesign.id)
								}}
							  >
								{sleeveOptions.map((option, index) => (
								  <Radio key={index}>{option}</Radio>
								))}
							  </RadioGroup>
							</View>
							<View style={{marginHorizontal: 50}}>
								{selectedItemDesign.sleeveType === 'Custom' && (
								  selectedItemDesign.sleeveDesignFile ? (
									<View style={{marginHorizontal: 40}}>
										<View style={{borderWidth: 1, borderRadius: 8}}>
											<Image source={{ uri: selectedItemDesign.sleeveDesignFile }} style={styles.carouselImage} />
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
													setShowDesign(false);
													setInCustom(true);
													navigation.navigate('CustomDesign', {
													  field: 'sleeve',
													  returnFile: (selectedFile) => {
														const updatedItemDesign = { ...selectedItemDesign, sleeveDesignFile: selectedFile };
														setSelectedItemDesign(updatedItemDesign);
														handleCustomDesign(selectedFile, selectedItemDesign.id, 'sleeveDesignFile');
														setShowDesign(true);
													  }
													}
												)}}
										  >
											Edit
										  </Button>
									</View>
								  ) : (
									<Button style={styles.drawButton} size='small'
									  onPress={() => {
										setShowDesign(false);
										setInCustom(true);
										navigation.navigate('CustomDesign', {
										field: 'sleeve',
										returnFile: (selectedFile) => {
										  const updatedItemDesign = { ...selectedItemDesign, sleeveDesignFile: selectedFile };
										  setSelectedItemDesign(updatedItemDesign);
										  handleCustomDesign(selectedFile, selectedItemDesign.id, 'sleeveDesignFile');
										  setShowDesign(true);
										}
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
								selectedIndex={sleeveLenOptions.indexOf(selectedItemDesign.sleeveLength) || selectedIndexSleeveLen}
								onChange={(index) => {
									const updatedItemDesign = { ...selectedItemDesign, sleeveLength: sleeveLenOptions[index] };
									setSelectedItemDesign(updatedItemDesign);
									setSavedDesign(true);
									handleSelectSleeveLen(index, selectedItemDesign.id)
								}}
							  >
								{sleeveLenOptions.map((option, index) => (
								  <Radio key={index}>{option}</Radio>
								))}
							  </RadioGroup>
							</View>
								<Button size='small' onPress={() => setShowDesign(false)} style={styles.designButton}>
									Save
								</Button>
						  </Layout>
						</ScrollView>
					</Modal>
			)}
			<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
			</Modal>
			<NeckTypesModal
                                visible={neckModalVisible}
                                onClose={() => setNeckModalVisible(false)}
                                fieldName={neckModalField}
                                updateSelectedItemDesign={updateSelectedItemDesign}
                                setShowDesign={setShowDesign}
								setInCustom={setInCustom}
            />
      </ScrollView>
  );
};

const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    position: 'relative',
    height: 220,
	marginBottom: -45
  },
  headerImage: {
    width: '100%',
	height: '80%',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
	resizeMode: 'cover'
  },
  avatar: {
    position: 'absolute',
    right: 20,
    bottom: -30,
    width: 60,
    height: 60,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  changeButton: {
    position: 'absolute',
    right: 20,
    bottom: -55,
  },
  content: {
    padding: 20,
	overflow: 'visible'
  },
  title: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  shopCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#F7F9FC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#F7F9FC',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 10,
	gap: 30,
	marginLeft: 10
  },
  bookNowButton: {
    flex: 1,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
	backgroundColor: '#F7F9FC',
	height: 50,
  },
  selectContainer: { 
	  width: 310,
	  marginTop: 10
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
	backgroundColor: '#F7F9FC',
	height: 50,
	width: 310,
	marginTop: 10
  },
  alterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
	backgroundColor: '#F7F9FC',
	height: 50,
	width: 310,
	marginTop: 5
  },
  priceContainer1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
	backgroundColor: '#F7F9FC',
	height: 50,
	width: 310,
	marginTop: -5
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
	marginTop: 10,
    paddingHorizontal: 10,
	backgroundColor: '#F7F9FC',
	height: 50,
	width: 310,
	position: 'relative',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  formInput: {
    marginTop: 16,
  },
  nextButton: {
	marginTop: 25,
	width: 100
  },
  cancelButton: {
	marginTop: 25,
	width: 150
  },
  itemContainer: {
    borderRadius: 8,
	width: 310,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  label: {
	  marginLeft: 10
  },
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
    justifyContent: 'center'
  },
  uploadIcon: {
    width: 32,
    height: 32,
    marginBottom: 4,
	marginLeft: 15
  },
  uploadButtonText: {
    textAlign: 'center',
	fontSize: 12
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
	marginLeft: -10,
	marginHorizontal: 15
  },
  imageWrapper: {
    position: 'relative',
    margin: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  deleteIcon: {
    width: 24,
    height: 24,
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
  tabContent: {
    padding: 16,
	paddingLeft: 30,
	borderRadius: 8,
	width: 320
  },
  tabContentRow: {
	flexDirection: 'row',
	gap: 30,
	flexWrap: 'wrap',
  },
  fieldLabel: {
	marginLeft: -20
  },
  fieldContainer1: {
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
  drawButton: {
    borderRadius: 10,
	marginBottom: 15,
	marginTop: -5,
    zIndex: 1,
	width: 200,
	alignItems: 'center'
  },
  overlay: {
	  position: 'absolute',
	  padding: 5,
	  top: 0,
	  left: 0,
	  right: 0,
	  bottom: 0,
	  justifyContent: 'center',
	  alignItems: 'center',
	  backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
	  borderRadius: 10, // Optional: to match image border radius if any
	},
  overlayText: {
	  color: '#fff',
	  textAlign: 'center',
	  marginTop: 40
	},
	carouselContainer: {
    // Style for carousel container, e.g., height, padding, etc.
    position: 'relative',
  },
  deleteButtonImg: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  carouselImage: {
    width: 100,
    height: 100,
  },
  deleteImgButton: {
    position: 'absolute',
    bottom: -50,
    right: 10,
  },
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  fullScreenModalMeas: {
	justifyContent: 'center',
    alignItems: 'center',
	//height: 600,
	borderRadius: 20
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute', // Position relative to the image
    top: -10, // Adjust for desired vertical offset
    right: -10, // Adjust for desired horizontal offset
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background to improve visibility
    borderRadius: 20, // Optional: Make the background circular
    padding: 2, // Optional: Add padding around the icon
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
  closeButtonOuter: {
    position: 'absolute', // Position relative to the image
    top: 30, // Adjust for desired vertical offset
    right: -10, // Adjust for desired horizontal offset
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background to improve visibility
    borderRadius: 20, // Optional: Make the background circular
    padding: 2, // Optional: Add padding around the icon
  },
  modalContent: {
    padding: 20,
	marginLeft: -20,
    position: 'relative', // Ensure positioning for the close button
  },
  modalCloseButton: {
    position: 'absolute', // Absolute positioning for the button
    top: -30, // Adjust vertical position
    right: -30, // Adjust horizontal position
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background for better visibility
    borderRadius: 15, // Make the button circular
    padding: 5, // Add padding to increase touch area
  },
  modalCloseIcon: {
    width: 30, // Size of the icon
    height: 30,
  },
  spinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
	color: 'color-primary-500'
  },
  selectField: {
	  width: 150,
	  marginRight: -30
  },
  selectFieldRadio: {
          flexDirection: 'row',
          marginLeft: 5,
          marginTop: 5,
          flexWrap: 'wrap',
          marginLeft: -20
  },
  selectFieldOcc: {
	  marginTop: 10
  },
  switchContainer: {
	  flexDirection: 'row', 
	  alignItems: 'center' , 
	  justifyContent: 'space-between', 
	  marginTop: 10,
	  padding: 10
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, // Makes the overlay cover the entire screen
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
    zIndex: 9,
  },
  subView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    //height: 500,
    zIndex: 10,
    elevation: 5,
  },
  subView1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    //height: 300,
    zIndex: 10,
    elevation: 5,
  },
  innerLayout: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 5, backgroundColor: '#F7F9FC'},
  buttonTextContainer: {
    flexDirection: "row", 
    alignItems: "center", 
    marginLeft: -35,
	marginTop: -10
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    borderRadius: 10,
    backgroundColor: '#F7F9FC',
    elevation: 5,
  },
  itemsScrollView: {
	marginTop: 10,
    marginBottom: 10,
  },
  collapsibleItemContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E9F2',
    backgroundColor: 'white',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F9FC',
  },
  itemTitle: {
    fontWeight: 'bold',
  },
  expandIcon: {
    width: 24,
    height: 24,
  },
  trashIcon: {
    marginLeft: -10,
	marginRight: -10
  },
  collapsibleContent: {
	padding: 16,
    backgroundColor: 'white',
  },
  datePicker: {
	position: 'relative',
  },
  checkboxText: {marginLeft: 10},
  checkboxStyle: {
	fontWeight: 'bold', fontSize: 14
  },
  priceInput: {width: 115, height: 40, textAlign: 'right', borderWidth: 1, borderRadius: 4, paddingRight: 15, borderColor: '#E4E9F2', backgroundColor: 'white' },
  focusedInput: {
    borderColor: '#000099',
    backgroundColor: 'white'
  },
  errorInput: {
    borderColor: 'red',
	backgroundColor: 'white',
  },
  notesInput: {backgroundColor: 'white', marginTop: 20, marginHorizontal: 5, borderWidth: 1, borderRadius: 4, paddingVertical: 10, paddingLeft: 15, borderColor: '#E4E9F2'},
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
    designButton: {
                marginHorizontal: 90,
                marginTop: 10
    },
    designButtonText: {textAlign: 'center', fontSize: 12, fontWeight: 'bold'},
	labelText: {
		marginBottom: 5
	},
	nextButtonContainer: {
		flexDirection: 'row',
		gap: 30,
		justifyContent: 'center'
	},
	navButton: {
		marginLeft: 20
	},
	scrollView: {
		width: '100%',
	  },
	  scrollViewContent: {
		paddingVertical: 10,
	  },
	tooltipContent: {
    padding: 10
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tooltipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
	textAlign: 'justify'
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#999',
    fontSize: 15,
  },
  nextButton1: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TestScreen;
