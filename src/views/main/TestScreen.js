import React, { useState, useEffect, useRef, useCallback, memo, useMemo, useImperativeHandle, forwardRef, useReducer } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableWithoutFeedback, Alert, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Animated, BackHandler, Keyboard, TextInput, Modal as ModalRN } from 'react-native';
import { ApplicationProvider, Layout, List, ListItem, Toggle, Button, Avatar, Text, Icon, Select, SelectItem, Input, Divider, IndexPath, useTheme, Card, Modal, Datepicker, RadioGroup, Radio, Autocomplete, AutocompleteItem, Tooltip as TooltipUi, Spinner, TopNavigationAction, CheckBox } from '@ui-kitten/components';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useUser } from './UserContext';
import { useOrderItems } from './OrderItemsContext';
import { useReadOrderItems } from './ReadOrderItemsContext';
import useDressConfig from './useDressConfig';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { generateUniqueId, getIdCounter } from '../main/generateUniqueId';
import { PersonIcon, PhoneIcon, ArrowIosBackIcon } from '../extra/icons';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import { resetIdCounter } from '../main/generateUniqueId';
import { FontAwesome } from '@expo/vector-icons';
import { useNetwork } from './NetworkContext';
import * as Sharing from 'expo-sharing';
import Breadcrumbs from '../extra/Breadcrumbs';
import NeckTypesModal from './NeckTypesModal';
import { usePermissions } from './PermissionsContext';
import { KeyboardAvoidingView } from '../extra/3rd-party';
import MultiSelectOptions from './MultiSelectOptions';
import moment from 'moment';

  const CameraIcon = (props) => <Icon {...props} name="camera-outline" />;
  const ImageIcon = (props) => <Icon {...props} name="image-outline" />;
  const CloseIcon = (props) => <Icon {...props} name="close-outline" />;
  const TrashIcon = (props) => <Icon {...props} name="trash-2-outline" />;
  const LockIcon = (props) => <Icon {...props} name="lock-outline" />;
  const EditIcon = (props) => <Icon {...props} name="edit-outline" />;

const TestScreen = ({ route }) => {
  const { currentUser } = useUser();
  const { isConnected } = useNetwork();
  const navigation = useNavigation();
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  const [custName, setCustName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [inputDisabled, setInputDisabled] = useState(false);
  const [custInserted, setCustInserted] = useState(false);
  const [custNameError, setCustNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [phoneErrorValid, setPhoneErrorValid] = useState(false);
  const orderForTypes = ['This Customer', 'Other'];
  const [orderForIndex, setOrderForIndex] = useState(0); 
  const [orderFor, setOrderFor] = useState('This Customer');
  const occOptions = [' ', 'Casual', 'Bridal', 'Ethnic', 'Formal', 'Party', 'Other'];
  const [associateCustName, setAssociateCustName] = useState("")
  const [associateCustNameError, setAssociateCustNameError] = useState(false);
  const [ttVisible, setTtVisible] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
    const [expandedItems, setExpandedItems] = useState([true]);
	const [customerData, setCustomerData] = useState(null);
  const [dob, setDob] = useState(null);
  const [anniversary, setAnniversary] = useState(null);
  const [location, setLocation] = useState('');
  const [profession, setProfession] = useState('');
  const [customerDataFound, setCustomerDataFound] = useState(false);
  const [awarenessSourceIndex, setAwarenessSourceIndex] = useState(null);
  const [awarenessSource, setAwarenessSource] = useState('');
  const awarenessOptions = [
    'Google Search',
    'Facebook',
    'Instagram',
    'WhatsApp',
    'Friend/Family Referral',
    'Walked by the store',
    'Previous Customer',
    'Other'
  ];
	
  const theme = useTheme();
  const breadcrumbRoutes = [
    { name: 'Home', screen: 'HomeMain' },
    { name: 'Customer Details', screen: 'TestCustomer' },
	{ name: 'Order Details', screen: 'TestOrder' },
  ];

    const { addItemContext, addItemBatchContext, getItems, addPicItem, resetItemsForLabel, saveOrder, getNewOrderCust, setNewOrderCust } = useOrderItems();
	const { prevOrderNo, setPrevOrderNo } = useReadOrderItems();
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
	const [checkedCust, setCheckedCust] = useState(false)
	const [checkedCustNew, setCheckedCustNew] = useState(true);
	const [custExists, setCustExists] = useState(false)
	
	const [showSubDropdown, setShowSubDropdown] = useState(true);
	
	const [selectedIndex, setSelectedIndex] = useState(null); 
	const [occError, setOccError] = useState(false);
	  
	    const [currentIndex, setCurrentIndex] = useState(0);
	  
	  const [custList, setCustList] = useState([])
	  const [filteredCustList, setFilteredCustList] = useState([]);
	    const scrollViewRef = useRef(null);
	const { measurementFields, isLoading } = useDressConfig();
			const itemRefs = useRef([]);
	
		// Function to save all local states - add this to your parent component
		const saveAllLocalStates = (index, newState) => {
			console.log('in saveAllLocalStates')
			let finalItems = null;
			console.log(index)
			console.log(newState)
			if(newState) {
				console.log('in if')
				const ref = itemRefs.current[index];
				  console.log(ref)
				  if (!ref) return null;
				  finalItems = ref.saveLocalState(newState);
			} else {
				itemRefs.current.forEach((ref, index) => {
					if (ref && ref.saveLocalState) {
						finalItems = ref.saveLocalState();
					}
				});
			}
			console.log(finalItems);
			return finalItems;
		};
	useEffect(() => {
		   if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		   }
		   if(routeParams.custName) {
			  setCustName(routeParams.custName)
			  let ph = routeParams.phoneNo.includes('+91') ? routeParams.phoneNo.substring(3) : routeParams.phoneNo
			  setPhoneNo(ph)
			  //setInputDisabled(false)
			  saveOrder([], {custName: '', phoneNo: '', occasion: '', custInserted: false})
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
				/*if(custDetails.tempSave) {
					setInputDisabled(true);
				}*/
		  }
		  const namesDbLocal = storage.getString('Customers');
			let namesAll = namesDbLocal ? JSON.parse(namesDbLocal) : [];
			let aa = namesAll.length > 0 ? namesAll : [];
			
			setCustList(aa);
			setFilteredCustList(aa);
			if(!prevOrderNo) {
				console.log('calling fetchMaxOrderNo');
				fetchMaxOrderNo();
			}
	  }, []);
	  
	  const fetchMaxOrderNo = async () => {
		let prevOn = storage.getString('prevOrderNo');
		console.log('prevOn', prevOn);
		if(prevOn) {
			console.log('got from cache', prevOn);
			setPrevOrderNo(Number(prevOn));
		} else {
			try {
			  const { data, error } = await supabase
				.from("OrderItems")
				.select("orderNo")
				.order("orderNo", { ascending: false })
				.limit(1);

			  if (!error && data?.length > 0) {
				console.log('setting prevOrderNo', data[0].orderNo);
				storage.set('prevOrderNo', data[0].orderNo);
				setPrevOrderNo(data[0].orderNo);
			  }
			} catch (err) {
			  console.error("Error fetching max orderNo:", err);
			}
		}
	  };
	  
	  useEffect(() => {
		if (phoneNo && phoneNo.length === 10) {
		  searchCustomer(phoneNo);
		}
	  }, [phoneNo]);	 

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
		localItems.length > 0 && setCheckedCustNew(false);
		setShowSuggestions(false);
		Keyboard.dismiss();
	  };
	  
	  const handleFocus = () => {
		setShowSuggestions(true);
	  };

	  const subTypeOptions = {
		default: [],
		salwar: ['A-Line', 'Anarkali', 'Slit-Kurti', 'Umbrella', 'Other'],
		pants: ['Normal', 'Patiala', 'Leggings', 'Gatherings', 'Jeans', 'Bell-bottom', 'Trousers', 'Palazzo', 'Straight',  'Formal', 'Balloon', 'Other'],
		blouse: ['Normal non-lining', 'Lining', 'Princess only', 'Princess + belt', 'Katori', 'Cross-cut', 'Other']
	  };
	  
	  const pantsOptions = ['Normal', 'Patiala', 'Leggings', 'Gatherings', 'Jeans', 'Bell-bottom', 'Trousers', 'Palazzo', 'Straight',  'Formal', 'Balloon', 'Other'];
	  
	    const optionsSub = subTypeOptions[routeParams.itemName?.toLowerCase()] || subTypeOptions.default;

	  const [uniqId, setUniqId] = useState(getIdCounter());
	    
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
	  
	  useEffect(() => {
		const backAction = () => {
		  /*if (inCustom) {
			  navigation.navigate('HomeMain', {screen: 'HomeNew'});
			  setInCustom(false);
			  setShowDesign(true);
			  return true; // Prevent further back action
			}*/
		  const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
		  if(step === 1) {
			console.log('calling addItemBatchContext:')
			console.log(localItems);
			addItemBatchContext(itemKey, localItems);
			setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion, custInserted: custInserted})
			navigation.navigate('HomeMain', {screen: 'HomeNew'});
			return true;
		  } else if (step > 1) {
			console.log('calling addItemBatchContext:')
			saveAllLocalStates();
			console.log(localItems);
			addItemBatchContext(itemKey, localItems); 
			setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion, custInserted: custInserted})
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
	  }, [step, custName, phoneNo, occasion, localItems]);
	  
	useFocusEffect(
		useCallback(() => {
			console.log('screen focused')
			console.log(localItems)
			console.log(custName + ',' + phoneNo)
		  return () => {
			console.log('screen unfocused');
			//saveAllLocalStates(); //why commented?
			console.log(localItems)
			console.log(custName + ',' + phoneNo)
			addItemBatchContext(itemKey, localItems);
			const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo;
			setNewOrderCust({
			  custName: custName, 
			  phoneNo: phNo, 
			  occasion: occasion,
			  custInserted: custInserted
			});
		  };
		}, [navigation, custName, phoneNo, occasion, localItems])
	);

	useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				/*if (inCustom) {
				  navigation.navigate('HomeMain', {screen: 'HomeNew'});
				  setInCustom(false);
				  setShowDesign(true);
				}*/
				  const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
				  if(step === 1) {
					console.log('in step1 back')
					addItemBatchContext(itemKey, localItems);
					setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion, custInserted: custInserted})
					navigation.navigate('HomeMain', {screen: 'HomeNew'});
				  } else if (step > 1) {
					console.log('in step2 back')
					saveAllLocalStates();
					addItemBatchContext(itemKey, localItems);
					setNewOrderCust({custName: custName, phoneNo: phNo, occasion: occasion, custInserted: custInserted})
					setStep(prevStep => prevStep - 1);
				  } else {
					console.log('in else back')
					navigation.goBack();
				  }
				}
			}/>
		  ),
		});
	}, [navigation, step, custName, phoneNo, localItems]);
	  
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
		setShowSubDropdown(!['pants', 'skirt', 'saree'].includes(routeParams?.itemName));
	  }, [routeParams?.itemName, step]);
	  
		// Get measurement fields for a specific dress type
		const getMeasurementFields = (dressType) => {
		  return measurementFields[dressType] || [];
		};
		
	const searchCustomer = async (phone) => {
		if (phone.length < 10) return;
		
		//setLoading(true);
		const phNo = phone.includes('+91') ? phone : '+91' + phone;
		  const { data: customer, error: custError } = await supabase
				.from('Customer')
				.select(`*`)
				.eq('phoneNo', phNo)
				.maybeSingle();
			console.log('customer ', customer);
		  if (customer?.dob) {
			setCustomerData(customer);
			//setInputDisabled(true);
			setCustomerDataFound(true);
		  } else {
			setCustomerData(null);
			//setInputDisabled(false);
			setCustomerDataFound(false);
		  }
		  //setLoading(false);
	  };

	const checkUpcomingDates = (anniversary, dob) => {
		const today = new Date();
		const currentYear = today.getFullYear();
		const upcomingEvents = [];

		if (anniversary) {
		  const anniversaryDate = new Date(anniversary);
		  const thisYearAnniversary = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
		  const nextYearAnniversary = new Date(currentYear + 1, anniversaryDate.getMonth(), anniversaryDate.getDate());
		  
		  let targetAnniversary = thisYearAnniversary;
		  if (thisYearAnniversary < today) {
			targetAnniversary = nextYearAnniversary;
		  }
		  
		  const daysUntilAnniversary = Math.ceil((targetAnniversary - today) / (1000 * 60 * 60 * 24));
		  
		  if (daysUntilAnniversary >= 0 && daysUntilAnniversary <= 45) {
			upcomingEvents.push({
			  type: 'Anniversary',
			  date: targetAnniversary,
			  days: daysUntilAnniversary
			});
		  }
		}

		if (dob) {
		  const birthDate = new Date(dob);
		  const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
		  const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
		  
		  let targetBirthday = thisYearBirthday;
		  if (thisYearBirthday < today) {
			targetBirthday = nextYearBirthday;
		  }
		  
		  const daysUntilBirthday = Math.ceil((targetBirthday - today) / (1000 * 60 * 60 * 24));
		  
		  if (daysUntilBirthday >= 0 && daysUntilBirthday <= 45) {
			upcomingEvents.push({
			  type: 'Birthday',
			  date: targetBirthday,
			  days: daysUntilBirthday
			});
		  }
		}

		return upcomingEvents;
	  };
	  
	const PersonIcon = (props) => (
		<Icon {...props} name="person-outline" />
	  );

	  const CalendarIcon = (props) => (
		<Icon {...props} name="calendar-outline" />
	  );

	  const PinIcon = (props) => (
		<Icon {...props} name="pin-outline" />
	  );

	  const BriefcaseIcon = (props) => (
		<Icon {...props} name="briefcase-outline" />
	  );

	  const InfoIcon = (props) => (
		<Icon {...props} name="info-outline" />
	  );
	  
	const handleSelectAwarenessSource = (index) => {
		setAwarenessSourceIndex(index);
		setAwarenessSource(awarenessOptions[index.row]);
	  };
	
	const formatDate = (d) => d ? moment(d).format('YYYY-MM-DD') : null;
	
	const saveCustDetails = async() => {
		console.log('in saveCustDetails')
		const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo;
				if(dob || anniversary || location || profession || awarenessSource) {
					const { data, error } = await supabase
					  .from('Customer')
					  .upsert({ custName: custName, phoneNo: phNo, dob: formatDate(dob), anniversary: formatDate(anniversary), location: location, profession: profession, awareness_source: awarenessSource }, { onConflict: 'phoneNo' }).select().single();
					if(error) {
						showErrorMessage('Error saving Customer details!', error)
						console.error(error);
					}
					console.log('data', data);
					showSuccessMessage('Customer Details Saved!')
					setCustInserted(true);
					setNewOrderCust({
					  custName: custName, 
					  phoneNo: phNo, 
					  occasion: occasion,
					  custInserted: true
					});
					setCustomerData(data);
					setCustomerDataFound(true);
				}
	}
	
	const renderNewCustomerFields = () => {
		if (customerDataFound || phoneNo.length < 10) return null;

		return (
		  <Card style={styles.newCustomerCard}>
			<View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -5}}>
			  <Text category="h6" style={[styles.newCustomerTitle, !customerData && {marginBottom: 8}]}>
				📝 New Customer Information
			  </Text>
			  {customerData && <Button
					size='medium'
					appearance='ghost'
					accessoryLeft={CloseIcon}
					onPress={() => {setCustomerDataFound(true);}}
			  />}
		  </View>
			<Text category="p2" style={styles.newCustomerSubtitle}>
			  Help us know you better by filling these details
			</Text>

			<Datepicker
			  style={styles.formInput}
			  label="Date of Birth"
			  placeholder="Select date of birth"
			  date={dob}
			  onSelect={setDob}
			  accessoryRight={CalendarIcon}
			  min={new Date(1900, 0, 1)}
			  max={new Date()} 
			/>

			<Datepicker
			  style={styles.formInput}
			  label="Anniversary Date"
			  placeholder="Select anniversary date"
			  date={anniversary}
			  onSelect={setAnniversary}
			  accessoryRight={CalendarIcon}
			  min={new Date(1900, 0, 1)}
			  max={new Date()} 
			/>

			<Input
			  style={styles.formInput}
			  label="Location/City"
			  placeholder="Enter your city"
			  value={location}
			  onChangeText={setLocation}
			  accessoryRight={PinIcon}
			/>

			<Input
			  style={styles.formInput}
			  label="Profession"
			  placeholder="Enter your profession"
			  value={profession}
			  onChangeText={setProfession}
			  accessoryRight={BriefcaseIcon}
			/>

			<Select
			  style={styles.formInput}
			  label="How did you know about us?"
			  placeholder="Select awareness source"
			  selectedIndex={awarenessSourceIndex}
			  onSelect={handleSelectAwarenessSource}
			  value={awarenessSource}
			>
			  {awarenessOptions.map((option, index) => (
				<SelectItem title={option} key={index} />
			  ))}
			</Select>
		  </Card>
		);
	  };	  
	
	const handleEditFields = () => {
		setDob(new Date(customerData.dob));
		setAnniversary(new Date(customerData.anniversary));
		setLocation(customerData.location);
		setProfession(customerData.profession);
		setAwarenessSource(customerData.awareness_source || '');
		setAwarenessSourceIndex(customerData.awareness_source
			? new IndexPath(awarenessOptions.indexOf(customerData.awareness_source))
			: null
		);
		setCustomerDataFound(false);
	}
	
  const renderUpcomingCelebrations = () => {
    if (!customerData) return null;

    const upcomingEvents = checkUpcomingDates(customerData.anniversary, customerData.dob);
    
    if (upcomingEvents.length > 0) {
      return (
        <Card style={styles.celebrationCard}>
          <Text category="h6" style={styles.celebrationTitle}>
            🎉 Upcoming Celebrations!
          </Text>
          {upcomingEvents.map((event, index) => (
            <View key={index} style={styles.celebrationItem}>
              <View style={styles.celebrationLeft}>
                <Text category="s1" style={styles.celebrationType}>
                  {event.type === 'Anniversary' ? '💕' : '🎂'} {event.type}
                </Text>
                <Text category="p2" style={styles.celebrationDate}>
                  {event.date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <View style={[styles.daysBadge, 
                event.days === 0 ? styles.todayBadge :
                event.days <= 7 ? styles.soonBadge : styles.upcomingBadge
              ]}>
                <Text style={[styles.daysText,
                  event.days === 0 ? styles.todayText :
                  event.days <= 7 ? styles.soonText : styles.upcomingText
                ]}>
                  {event.days === 0 ? 'Today!' : 
                   event.days === 1 ? 'Tomorrow' : 
                   `${event.days} days`}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      );
    } else if (customerData) {
      return (
        <Card style={styles.celebrationCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -5}}>
			  <Text category="h6">
				Customer Info
			  </Text>
			  <Button
					size='medium'
					appearance='ghost'
					accessoryLeft={EditIcon}
					onPress={handleEditFields}
				/>
		  </View>
          <View style={styles.celebrationRow}>
			<View style={[styles.celebrationItem, styles.celebrationItemHalf]}>
			  <View style={styles.celebrationLeft}>
                <Text category="s1" style={styles.celebrationType}>
                  🎂 Date of Birth
                </Text>
                <Text category="p2" style={styles.celebrationVal}>
                  {customerData.dob}
                </Text>
              </View>
			</View>
			<View style={[styles.celebrationItem, styles.celebrationItemHalf]}>
			  <View style={styles.celebrationLeft}>
                <Text category="s1" style={styles.celebrationType}>
                  💕 Anniversary
                </Text>
                <Text category="p2" style={styles.celebrationVal}>
                  {customerData.anniversary}
                </Text>
              </View>
			</View>
		  </View>
		  <View style={styles.celebrationRow}>
			<View style={[styles.celebrationItem, styles.celebrationItemHalf]}>
			  <View style={styles.celebrationLeft}>
                <Text category="s1" style={styles.celebrationType}>
                  📍Location
                </Text>
                <Text category="p2" style={styles.celebrationVal}>
                  {customerData.location}
                </Text>
              </View>
			</View>
			<View style={[styles.celebrationItem, styles.celebrationItemHalf]}>
			  <View style={styles.celebrationLeft}>
                <Text category="s1" style={styles.celebrationType}>
                  💼 Profession
                </Text>
                <Text category="p2" style={styles.celebrationVal}>
                  {customerData.profession}
                </Text>
              </View>
			</View>
		  </View>
		  <View style={styles.celebrationRow}>
			<View style={[styles.celebrationItem, styles.celebrationItemHalf]}>
			  <View style={styles.celebrationLeft}>
                <Text category="s1" style={styles.celebrationType}>
                  📣 Heard Via
                </Text>
                <Text category="p2" style={styles.celebrationVal}>
                  {customerData.awareness_source}
                </Text>
              </View>
			</View>
		  </View>
        </Card>
      );
    }
	return null;
  };

	  const addItem = async () => {
		  console.log("in additem");
		  
		  setUniqId(generateUniqueId());
		  if (localItems.length > 0) {
			const firstItem = localItems[0];
			
			setCount(prevCount => {
			  const newCo = prevCount + 1;
			  console.log("uniq id in add item if: " + uniqId + ',' + newCo);
			  
			  // Create measurement data object with current dress type fields
			  const measurementData = {};
			  const fields = getMeasurementFields(routeParams?.itemName);
			  console.log('fields', routeParams?.itemName, fields);
			  fields.forEach(field => {
				measurementData[field.key] = firstItem.measurementData?.[field.key] || '';
			  });
			  
			  const newItem = { 
				id: uniqId, 
				localId: newCo, 
				dressType: routeParams?.itemName,
				dressSubType: firstItem.dressSubType, 
				dueDate: firstItem.dueDate, 
				stitchingAmt: firstItem.stitchingAmt, 
				frontNeckType: firstItem.frontNeckType, 
				backNeckType: firstItem.backNeckType, 
				sleeveType: firstItem.sleeveType, 
				sleeveLength: firstItem.sleeveLength, 
				measurementData: measurementData, // Dynamic measurements
				notes: '', 
				frontNeckDesignFile: firstItem.frontNeckDesignFile, 
				backNeckDesignFile: firstItem.backNeckDesignFile, 
				sleeveDesignFile: firstItem.sleeveDesignFile, 
				dressPics: [], 
				patternPics: [],
				measurementPics: [],
				dressGiven: firstItem.dressGiven, 
				alterDressType: "", 
				extraMeasurements: firstItem.extraMeasurements, 
				editable: true, 
				repeatDesign: true, 
				repeatMeas: true,
				extraOptions: {},
				slotDates: [],
				slots: {}
			  };
			  
			  console.log("newItem if: ", newItem);
			  setLocalItems(prevItems => [...prevItems, newItem]);
			  return newCo;
			});
		  } else {
			setCount(prevCount => {
			  const newCo = prevCount + 1;
			  console.log("uniq id in add item else: " + uniqId + ',' + newCo);
			  
			  // Create empty measurement data object for new dress type
			  const measurementData = {};
			  const fields = getMeasurementFields(routeParams?.itemName);
			  fields.forEach(field => {
				measurementData[field.key] = '';
			  });
			  
			  const newItem = { 
				id: uniqId, 
				localId: newCo, 
				dressType: routeParams?.itemName,
				dressSubType: optionsSub[0], 
				dueDate: new Date(), 
				stitchingAmt: '', 
				frontNeckType: "", 
				backNeckType: "", 
				sleeveType: "", 
				sleeveLength: "", 
				measurementData: measurementData, // Dynamic measurements
				notes: '', 
				frontNeckDesignFile: null, 
				backNeckDesignFile: null, 
				sleeveDesignFile: null, 
				dressPics: [], 
				patternPics: [],
				measurementPics: [],
				dressGiven: false, 
				alterDressType: "", 
				extraMeasurements: {}, 
				editable: true, 
				repeatDesign: false, 
				repeatMeas: false,
				extraOptions: {},
				slotDates: [],
				slots: {}
			  };
			  
			  console.log("newItem else: ", newItem);
			  setLocalItems(prevItems => [...prevItems, newItem]);
			  return newCo;
			});
		  }
		  setLocalCount(prevCount => prevCount + 1);
		  setExpandedItems(prev => [...prev, true]);
		};

	  const updateItem = (itemId, field, value) => {
		 let updatedItems;
		 
		 setLocalItems(prevItems => {
		   updatedItems = prevItems.map(item => 
			 item.id === itemId 
			   ? { ...item, [field]: value }
			   : item
		   );
		   return updatedItems;
		 });
		 
		 return updatedItems;
	  };
	  
	  const updateItemMultiple = (itemId, changes) => {
		 let updatedItems;
		 
		 setLocalItems(prevItems => {
		   updatedItems = prevItems.map(item => 
			 item.id === itemId 
			   ? { ...item, ...changes }
			   : item
		   );
		   return updatedItems;
		 });
		 
		 return updatedItems;
	  };

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
	  
	  const handleSave = async () => {
			console.log("items")
			let allItemsSaved = saveAllLocalStates();
			console.log(allItemsSaved)
			if(!allItemsSaved) {
				allItemsSaved = localItems;
			}
			console.log(custName + ',' +phoneNo) 
			try {
				setLoading(true);
					console.log('in save order else')
					const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo
					const updatedItems = allItemsSaved?.map(item => ({
						  ...item,
						  associateCustName: associateCustName.trim()
					}));
					console.log('itemKey: ' + itemKey)
					addItemBatchContext(itemKey, updatedItems);
					resetItemsForLabel(itemKey)
					saveOrder(updatedItems, {custName: custName, phoneNo: phNo, occasion: occasion, custInserted: custInserted});
					showSuccessMessage("Item added!");
					setLocalItems([]);
					setLocalCount(1)
					setStep(0)
					navigation.reset({
												index: 0,
												routes: [{name: "OrderBagScreen", params: { cleanup: true, itemName: routeParams.itemName, headerImgUri: routeParams.headerImgUri }}]
											})
			} finally {
				setLoading(false);
			}
	  };
	  
	const resetAllMeasurements = (newMeasurementData) => {
	  setLocalItems(prevItems => 
		prevItems.map(item => ({
		  ...item,
		  measurementData: { ...newMeasurementData }
		}))
	  );
	};
	   
	const checkIfCustExists = async (resetExisting) => {
	  console.log('in checkIfCustExists');
	  setCheckedCust(true);
	  
	  if (orderFor !== 'Other') {
		const phNo = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo;
		console.log(custName + ' , ' + phNo + ', ' + routeParams?.itemName);
		
		let cachedData = storage.getString(phNo + '_' + routeParams?.itemName);
		const measure = cachedData ? JSON.parse(cachedData) : null;
		
		if (measure) {
		  setCustExists(true);
		  console.log('Data retrieved from cache:', measure);
		  if(resetExisting) {
			resetAllMeasurements(measure.measurementData);
			return;
		  }
		  populateMeasurements(measure);
		  return true;
		} else {
		  console.log('getting measurements from db:');
		  if (phNo?.trim()) {
			try {
			  const { data, error, status } = await supabase
				.from('measurements_new')
				.select(`
				  id, 
				  dress_type,
				  measurement_data,
				  customer_id,
				  Customer!inner(id, custName, phoneNo)
				`)
				.eq('Customer.phoneNo', phNo)
				.eq('dress_type', routeParams?.itemName)
				.eq('other_cust', false)
				.order('id', { ascending: false })
				.limit(1)
				.maybeSingle();
			
			  if (error && status !== 406) {
				console.log(error);
				return false;
			  } else {
				console.log("Measurements:", data);
				if(resetExisting) {
					resetAllMeasurements(measure.measurement_data);
					return;
				}
				populateMeasurements(data);
				if (data) {
				  const cacheData = {
					dressType: routeParams?.itemName,
					measurementData: data.measurement_data
				  };
				  
				  const resultJson = JSON.stringify(cacheData);
				  console.log('resultJson:', resultJson);
				  storage.set(phNo + '_' + routeParams?.itemName, resultJson);
				  return true;
				} else {
				  return false;
				}
			  }
			} catch (error) {
			  console.log(error.message);
			  return false;
			}
		  } else {
			return false;
		  }
		}
	  } else {
		addItem();
	  }
	  return false;
	};
	  
	  const nonNullZero = (value) => {
		  return value !== null && value !== '0';
	  }
	  
	  const populateMeasurements = (res) => {
		  if (res === null || res.length === 0 || routeParams?.itemName === 'Alteration') {
			console.log("in populateMeasurements if");
			addItem();
		  } else {
			console.log("in measurements else");
			console.log(res);
			
			// Handle both database response and cached data
			const measurementData = res.measurementData || res.measurement_data || {};
			
			// Ensure all fields for current dress type are present
			const fields = getMeasurementFields(routeParams?.itemName);
			const completeMeasurementData = {};
			
			fields.forEach(field => {
			  completeMeasurementData[field.key] = measurementData[field.key] 
				? measurementData[field.key].toString() 
				: '';
			});
			
			setUniqId(generateUniqueId());
			setCount(prevCount => {
			  const newCo = prevCount + 1;
			  console.log("in measurement count: " + newCo);
			  
			  const newItem = { 
				id: uniqId, 
				localId: newCo, 
				dressType: routeParams?.itemName,
				dressSubType: optionsSub[0], 
				dueDate: moment(new Date()).format("YYYY-MM-DD"), 
				stitchingAmt: '', 
				frontNeckType: '', 
				backNeckType: '', 
				sleeveType: '', 
				sleeveLength: '', 
				measurementData: completeMeasurementData, // Dynamic measurements
				notes: '', 
				frontNeckDesignFile: null, 
				backNeckDesignFile: null, 
				sleeveDesignFile: null, 
				dressPics: [], 
				patternPics: [], 
				measurementPics: [], 
				dressGiven: false, 
				alterDressType: "", 
				extraMeasurements: {}, 
				editable: false, 
				repeatDesign: true, 
				repeatMeas: true,
				extraOptions: {},
				slotDates: [],
				slots: {}
			  };
			  
			  console.log("newItem:", newItem);
			  setLocalItems(prevItems => [...prevItems, newItem]);
			  return newCo;
			});
		  }
	};
	
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
		saveAllLocalStates();
		addItem()
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
			setCustomerData(null);
			setCustomerDataFound(false);
	}
	
	function isValidPhoneNumber(phoneNo) {
		  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
		  return phoneRegex.test(phoneNo);
	}
	
	const handleNextStep = async() => {
			if(custName.trim() === '') {
				setCustNameError(true);
			} else if(phoneNo.trim() === '') {
				setPhoneError(true);
			} else if(occasion === ' ') {
				setOccError(true);
			} else if(!customerData?.dob && dob) {
				saveCustDetails();
			}
			const isValid = isValidPhoneNumber(phoneNo)
			if(isValid) {
				if(!checkedCustNew) {
					await checkIfCustExists(true);
					setCheckedCustNew(true);
				}
				setStep(2);
			} else {
				setPhoneErrorValid(true)
			}
	  };
	  
	  const renderSubTypeIcon = (props) => (
		<FontAwesome name='female' size={24} color={theme['color-primary-500']} style={{marginHorizontal: 10}}/>
	  );
	  
	  const handleNavigate = () => {
		  navigation.navigate('OrderBagScreen')
	  }
	  
	  const navigateToContacts = async() => {
		  setShowSuggestions(false);
		  navigation.navigate('ImportCustomerScreen', {itemName: routeParams.itemName, headerImgUri: routeParams.headerImgUri});
	  }
	  
	  const renderContactsIcon = (props) => (
	    <TouchableOpacity onPress={navigateToContacts}>
			<Icon {...props} name='person-done-outline' fill={theme['color-primary-500']}/>
		</TouchableOpacity>
	  );
	  
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
	
	const RenderItemCollapsible = memo(forwardRef(({ item, index, isExpanded, onToggle }, ref) => {
	  // All local state variables - no more mixed approach
	  const [localState, setLocalState] = useState({
		stitchingAmt: item.stitchingAmt,
		notes: item.notes,
		alterDressType: item.alterDressType,
		extraOptions: item.extraOptions || {},
		dueDate: item.dueDate,
		dressSubType: item.dressSubType,
		frontNeckType: item.frontNeckType,
		backNeckType: item.backNeckType,
		sleeveType: item.sleeveType,
		sleeveLength: item.sleeveLength,
		measurementData: item.measurementData || {},
		dressPics: item.dressPics || [],
		patternPics: item.patternPics || [],
		measurementPics: item.measurementPics || [],
		dressGiven: item.dressGiven,
		repeatDesign: item.repeatDesign,
		repeatMeas: item.repeatMeas,
		frontNeckDesignFile: item.frontNeckDesignFile,
		backNeckDesignFile: item.backNeckDesignFile,
		sleeveDesignFile: item.sleeveDesignFile,
		extraMeasurements: item.extraMeasurements,
		slotDates: item.slotDates,
		slots: item.slots
	  });

	  const [isPricingExpanded, setIsPricingExpanded] = useState(false);
	  const [isAddonsExpanded, setIsAddonsExpanded] = useState(true);
	  const [savedDesign, setSavedDesign] = useState(false);
	    const [savedMeas, setSavedMeas] = useState(false);
	    const [selectedItemDesign, setSelectedItemDesign] = useState(null);
	    const [selectedItem, setSelectedItem] = useState(null);
	const [showMeas, setShowMeas] = useState(false);
	const [showCarouselDress, setShowCarouselDress] = useState(false);
	const [showCarouselPattern, setShowCarouselPattern] = useState(false);
	const [neckModalVisible, setNeckModalVisible] = useState(false);
	const [neckModalField, setNeckModalField] = useState('');
	const [picType, setPicType] = useState('dressPics');
	const [selectedIndexSleeve, setSelectedIndexSleeve] = useState(0);
	const [selectedIndexSleeveLen, setSelectedIndexSleeveLen] = useState(0);
	const [extraOptionsKeys, setExtraOptionsKeys] = useState(Object.keys(item.extraOptions) || []);
	const [nameValues, setNameValues] = useState([]);
    const [inCustom, setInCustom] = useState(false);
	const [showDesign, setShowDesign] = useState(false);
	const [selectedIndexSubType, setSelectedIndexSubType] = useState(new IndexPath(0));
	const [selectedIndexPants, setSelectedIndexPants] = useState(new IndexPath(0));
	
	  const handleCustomDesign = (customDesignFile, fieldName) => {
		  updateLocalState(fieldName, customDesignFile);
		  updateItem(selectedItemDesign.id, fieldName, customDesignFile);
	  }

	  const [isModalVisible, setIsModalVisible] = useState(false);
	  const options = [
			{ title: 'Take Photo', iconName: 'camera' },
			{ title: 'Choose from Gallery',iconName: 'image' },
		  ];
		  
	const [imgModalVisible, setImgModalVisible] = useState(false);

	  useEffect(() => {
		setLocalState({
		  stitchingAmt: item.stitchingAmt,
		  notes: item.notes,
		  alterDressType: item.alterDressType,
		  extraOptions: item.extraOptions || {},
		  dueDate: item.dueDate,
		  dressSubType: item.dressSubType,
		  frontNeckType: item.frontNeckType,
		  backNeckType: item.backNeckType,
		  sleeveType: item.sleeveType,
		  sleeveLength: item.sleeveLength,
		  measurementData: item.measurementData || {},
		  dressPics: item.dressPics || [],
		  patternPics: item.patternPics || [],
		  measurementPics: item.measurementPics || [],
		  dressGiven: item.dressGiven,
		  repeatDesign: item.repeatDesign,
		  repeatMeas: item.repeatMeas,
		  frontNeckDesignFile: item.frontNeckDesignFile,
		  backNeckDesignFile: item.backNeckDesignFile,
		  sleeveDesignFile: item.sleeveDesignFile,
		  extraMeasurements: item.extraMeasurements,
		  deliveryType: item.deliveryType,
		  expressDuration: item.expressDuration,
		  slotDates: item.slotDates,
		  slots: item.slots
		});
	  }, [item.id]); // Only update when item ID changes, not on every item change

	  // Generic function to update local state
	  const updateLocalState = useCallback((field, value) => {
		console.log('in updateLocalState ' + field + value)
		setLocalState(prev => ({
		  ...prev,
		  [field]: value
		}));
	  }, []);
	  
	  const updateDressSubTypePart = useCallback((part, value) => {
		  setLocalState(prev => {
			const existing = prev.dressSubType || '';
			let [topPart = '', pantsPart = ''] = existing.split('_');

			// Update the correct part
			if (part === 'top') {
			  topPart = value;
			} else if (part === 'pants') {
			  pantsPart = value;
			}

			const newValue = [topPart, pantsPart].filter(Boolean).join('_');

			console.log(`in updateDressSubTypePart (${part}) →`, newValue);

			return {
			  ...prev,
			  dressSubType: newValue,
			};
		  });
	  }, []);

	  // Function to update nested objects (like measurementData, extraOptions)
	  const updateNestedLocalState = useCallback((parentField, childField, value) => {
		setLocalState(prev => ({
		  ...prev,
		  [parentField]: {
			...prev[parentField],
			[childField]: value
		  }
		}));
	  }, []);

	  // Function to update arrays (like images)
	  const updateArrayLocalState = useCallback((field, newArray) => {
		setLocalState(prev => ({
		  ...prev,
		  [field]: newArray
		}));
	  }, []);
	  
	  const updateItemPicLocal = useCallback((field, value) => {
		console.log("in updateitemPicLocal: " + ',' + field + ',' + value);
		setLocalState(prev => ({
				...prev, [field]: prev[field].concat(value)
            }));
	  }, []);

	  // Function to add to arrays (for image uploads)
	  const addToArrayLocalState = useCallback((field, newItems) => {
		setLocalState(prev => ({
		  ...prev,
		  [field]: Array.isArray(newItems) ? [...prev[field], ...newItems] : [...prev[field], newItems]
		}));
	  }, []);

	  // Expose saveLocalState function to parent
	  useImperativeHandle(ref, () => ({
		saveLocalState: (newState) => {
		  console.log('Saving local state for item:', item.id);
		  console.log(localState);
		  console.log(newState);
		  let updatedItem = null;
		  if(newState) {
			  updatedItem = updateItemMultiple(item.id, newState);
		  } else {
			  const changes = {};
			  Object.keys(localState).forEach(key => {
				if (JSON.stringify(localState[key]) !== JSON.stringify(item[key])) {
				  changes[key] = localState[key];
				}
			  });

			  console.log('Changes detected:', changes);
			  
			  if (Object.keys(changes).length > 0) {
				updatedItem = updateItemMultiple(item.id, changes);
				console.log('Updated item:', updatedItem);
				if(updatedItem) {
					updatedItem.nameValues = nameValues;
				}
			  }
		  }
		  return updatedItem;
		}
	  }), [localState, item]);
	  
	  const handleDeleteDesign = (designType, fieldType) => {
		  const updatedItemDesign = { ...selectedItemDesign, [designType]: null, [fieldType]: null };
		  setSelectedItemDesign(updatedItemDesign);
			updateLocalState(designType, null);
            updateLocalState(fieldType, null);
	  }
	  
	  const handleSaveMeas = () => {
		const jsonObject = selectedItem.extraMeasurements.reduce((acc, pair) => {
			let p = pair.name.trim();
		  if (p) {
			  console.log('adding nameValues ' + p)
				setNameValues(prev => [...prev, {
					dressType: routeParams?.itemName,
					value: p
				}]);
			acc[p] = typeof pair.value === 'string' ? (parseInt(pair.value.trim() ? pair.value.trim() : 0)) : pair.value;
		  }
		  return acc;
		}, {});

		console.log('Final JSON Object:', jsonObject);
		return jsonObject;
	  };

	  // Event handlers using local state
	  const handleDateSelect = useCallback((nextDate) => {
		const formattedDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
		console.log('handleDateSelect', formattedDate)
		updateLocalState('dueDate', formattedDate);
	  }, [updateLocalState]);

	  const handleDesignEdit = useCallback(() => {
		setSelectedItemDesign({...item, ...localState}); // Merge current item with local changes
		setShowDesign(true);
	  }, [item, localState]);

	  const handleMeasurementEdit = useCallback(() => {
		console.log('in handleMeasurementEdit: ');
		let itemFin = JSON.parse(JSON.stringify({...item, ...localState})); // Merge with local state
		if (localState.extraMeasurements) {
		  itemFin.extraMeasurements = Object.entries(localState.extraMeasurements).map(([key, value]) => ({
			name: key,
			value: value.toString(),
			fromDb: true
		  }));
		}
		
		console.log('itemFin:', itemFin);
		setSelectedItem(itemFin); 
		setShowMeas(true);
	  }, [item, localState]);
		  
	  const openModal = (uri) => {
		setImgModalVisible(true);
	  };

	  const closeModal = () => {
		setImgModalVisible(false);
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
			  updateItemPicLocal(picType, source.uri);
			  if(picType === 'measurementPics') {
				const updItem = { ...selectedItem, measurementPics: [...(selectedItem.measurementPics || []), source.uri], };
				setSelectedItem(updItem);
				setSavedMeas(true);
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
				const aa = await Promise.all(
				  result.assets.map(async (asset) => {
					const compressedSrc = await ImageManipulator.manipulateAsync(asset.uri, [], { compress: 0.5 });
					const source = { uri: compressedSrc.uri };
					console.log(source);
					updateItemPicLocal(picType, source.uri);
					return source.uri;
				  })
				);
				
			 if(picType === 'measurementPics') {
				console.log(aa)
				const updItem = {
				  ...selectedItem,
				  measurementPics: [...(selectedItem.measurementPics || []), ...aa],
				};
				console.log('updItem:')
				console.log(updItem)
				setSelectedItem(updItem);
				setSavedMeas(true);		  
			  }
			}
		} else {
			showErrorMessage('Media permission not granted! Grant permission in Settings')
		}
	};

	  const handleViewDressPics = useCallback(() => {
		setShowCarouselDress(true);
	  }, []);

	  const handleViewPatternPics = useCallback(() => {
		setShowCarouselPattern(true);
	  }, []);

	  const handleDelete = useCallback(() => {
		deleteItemAlert(item.id, index);
	  }, [item.id, index]);

	  const handleRepeatDesignChange = useCallback((isChecked) => {
		updateLocalState('repeatDesign', isChecked);
		
		// Handle repeat design logic
		queueMicrotask(() => {
		  if (isChecked) {
			const firstItem = localItems[0];
			if (firstItem) {
			  const designProperties = {
				frontNeckType: firstItem.frontNeckType,
				backNeckType: firstItem.backNeckType,
				sleeveType: firstItem.sleeveType,
				sleeveLength: firstItem.sleeveLength
			  };
			  
			  // Update local state with design properties
			  setLocalState(prev => ({
				...prev,
				...designProperties
			  }));
			}
		  } else {
			const resetProperties = {
			  frontNeckType: '',
			  backNeckType: '',
			  sleeveType: '',
			  sleeveLength: ''
			};
			
			setLocalState(prev => ({
			  ...prev,
			  ...resetProperties
			}));
		  }
		});
	  }, [updateLocalState, localItems]);

	  const handleRepeatMeasChange = useCallback((isChecked) => {
		updateLocalState('repeatMeas', isChecked);
		
		queueMicrotask(() => {
		  if (isChecked) {
			const firstItem = localItems[0];
			if (firstItem) {
			  const measurementProperties = {
				dressGiven: firstItem.dressGiven,
				measurementData: firstItem.measurementData
			  };
			  
			  setLocalState(prev => ({
				...prev,
				...measurementProperties
			  }));
			} else {
			  showErrorMessage("No dress items yet added!");
			}
		  }
		});
	  }, [updateLocalState, localItems]);

	  const handleMultiselectChange = useCallback((val) => {
		console.log('in handleMultiselectChange', val);
		setExtraOptionsKeys(val);
		const newOptions = {};
		val.forEach(name => {
		  newOptions[name] = localState.extraOptions?.[name] ?? '';
		});
		updateLocalState('extraOptions', newOptions);
	  }, [localState.extraOptions, updateLocalState]);

	  const handleAddonPriceChange = useCallback((optionName, price) => {
		updateNestedLocalState('extraOptions', optionName, price);
	  }, [localState.extraOptions, updateNestedLocalState]);

	  // Handle image deletion from local state
	  const handleDeleteImage = useCallback((imageIndex, imageArray, imageType) => {
		const newImages = [...imageArray];
		newImages.splice(imageIndex, 1);
		if(imageType === 'measurementPics') {
			setSelectedItem(prev => ({
			  ...prev,
			  measurementPics: newImages
			}));
		}
		updateArrayLocalState(imageType, newImages);
	  }, [updateArrayLocalState]);
	  
	  const calculateTotal = useCallback(() => {
		const basePrice = parseFloat(localState.stitchingAmt) || 0;
		const addonTotal = Object.values(localState.extraOptions).reduce((sum, price) => {
		  return sum + (parseFloat(price) || 0);
		}, 0);
		return (basePrice + addonTotal).toFixed(2);
	  }, [localState.stitchingAmt, localState.extraOptions]);

	  // Icon components
	  const ChevronIcon = (props) => (
		<Icon 
		  {...props} 
		  name={isPricingExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
		  fill={theme['color-basic-600']}
		/>
	  );

	  const AddonChevronIcon = (props) => (
		<Icon 
		  {...props} 
		  name={isAddonsExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
		  fill={theme['color-basic-600']}
		/>
	  );

	  const PriceTagIcon = (props) => (
		<Icon 
		  {...props} 
		  name='pricetags-outline'
		  fill={theme['color-primary-500']}
		/>
	  );
	  
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
	
  const onCheckedChange = (isChecked) => {
	  const updItem = { ...selectedItem, dressGiven: isChecked };
		setSelectedItem(updItem);
		setSavedMeas(true);
		updateLocalState('dressGiven', isChecked);
	};
	
	const handleSelectSleeve = (index) => {
		setSelectedIndexSleeve(index);
		updateLocalState('sleeveType', sleeveOptions[index] === 'Draw design' ? 'Custom' : sleeveOptions[index])
	};
	
	const handleSelectSleeveLen = (index) => {
		setSelectedIndexSleeveLen(index);
		updateLocalState('sleeveLength', sleeveLenOptions[index])
	};
	
	const editDesign = () => {
										setShowDesign(false);
										setInCustom(true);
										saveAllLocalStates();
										navigation.navigate('CustomDesign', {
										field: 'sleeve',
										returnFile: (selectedFile) => {
										  const updatedItemDesign = { ...selectedItemDesign, sleeveDesignFile: selectedFile };
										  setSelectedItemDesign(updatedItemDesign);
										  handleCustomDesign(selectedFile, 'sleeveDesignFile');
										  setShowDesign(true);
										}
									  })
	}
	  
	  const renderDesignModal = () => {
		if (!selectedItemDesign) return null;
		console.log(selectedItemDesign)

		return (
				<>
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
								selectedIndex={selectedItemDesign.sleeveType === 'Custom' ? 3 : sleeveOptions.indexOf(selectedItemDesign.sleeveType) || selectedIndexSleeve}
								onChange={(index) => {
									const updatedItemDesign = { ...selectedItemDesign, sleeveType: sleeveOptions[index] === 'Draw design' ? 'Custom' : sleeveOptions[index] };
									setSelectedItemDesign(updatedItemDesign);
									setSavedDesign(true);
									handleSelectSleeve(index)
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
											onPress={editDesign}
										  >
											Edit
										  </Button>
									</View>
								  ) : (
									<Button style={styles.drawButton} size='small'
									  onPress={editDesign}
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
									handleSelectSleeveLen(index)
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
					
					<NeckTypesModal
						visible={neckModalVisible}
						onClose={() => setNeckModalVisible(false)}
						fieldName={neckModalField}
						updateSelectedItemDesign={updateSelectedItemDesign}
						setShowDesign={setShowDesign}
						setInCustom={setInCustom}
						saveAllLocalStates = {saveAllLocalStates}
					/>
				</>
			)
	  }
	  
	  
	const updateSelectedItemDesign = (fieldName, value) => {
		console.log('in updateSelectedItemDesign: ' + fieldName + ',' + value);
	  const updatedItemDesign = { ...selectedItemDesign, [fieldName]: value };
	  console.log(updatedItemDesign);
	  setSelectedItemDesign(updatedItemDesign);
	  setSavedDesign(true);
	  updateLocalState(fieldName, value)
	  if(fieldName.includes('DesignFile') || value === 'Custom') {
		updateItem(selectedItemDesign.id, fieldName, value);
	  }
	  setShowDesign(true);
	};
	
	const saveAllMeas = () => {
									console.log('onPress selectedItem.extraMeasurements:')
									console.log(selectedItem.extraMeasurements);
									if(selectedItem.extraMeasurements?.length > 0) {
										setSavedMeas(true);
										let aMeas = handleSaveMeas();
										console.log('aMeas:')
										console.log(aMeas);
										console.log(nameValues);
										updateLocalState('extraMeasurements', aMeas);
									}
									setShowMeas(false);
								}
	const handleImageUpload = (imgType) => {
			setPicType(imgType);
		    setIsModalVisible(true);
	  };
	  
const renderSlotSummary = (slots) => {
    const data = Object.entries(slots).map(([date, { regular, express, total }]) => ({
      date,
      regular,
      express,
      total
    }));
	
    return (
      <View style={styles.sectionContainer}>
          <View style={styles.sectionContent}>
            <View style={styles.tableContainer}>
              {/* Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableHeaderCell}>Date</Text>
                <Text style={[styles.tableHeaderCell, styles.centerText]}>Regular</Text>
                <Text style={[styles.tableHeaderCell, styles.centerText]}>Express</Text>
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
                </View>
              ))}
            </View>
          </View>
      </View>
    );
  };
	  
	  const renderMeasurementsModal = () => {
		if (!selectedItem) return null;
  
		  const fields = getMeasurementFields(selectedItem.dressType);
		  console.log('in renderMeasurementsModal', fields)
		  return (
				<Modal style={styles.fullScreenModalMeas} visible={showMeas} backdropStyle={styles.backdrop} onBackdropPress={() => setShowMeas(false)}>
				<KeyboardAvoidingView>
							  <Layout style={styles.tabContent}>
								<View style={styles.fieldContainerDG}>
									<Text category='label' >Measurement Dress Given</Text>
									<CheckBox
									  checked={selectedItem.dressGiven}
									  onChange={(isChecked) => {
												  onCheckedChange(isChecked)
										}}
									/>
								</View>
							<View style={{ marginLeft: -10, marginTop: 10 }}>
							  <Text category='h6' style={{ marginBottom: 10 }}>
								Measurement Pics:
							  </Text>
							  {selectedItem.measurementPics?.length > 0 ? (
								<ScrollView 
									horizontal 
									style={styles.imagePreview}
									showsHorizontalScrollIndicator={true}
									persistentScrollbar={true}
								  >
								  {selectedItem.measurementPics.map((image, index) => (
									<View key={index} style={styles.imageContainerMeas}>
									  <Image
										source={{ uri: image }}
										style={styles.previewImage}
										resizeMode='cover'
									  />
									  <Button
										size='tiny'
										appearance='ghost'
										accessoryLeft={TrashIcon}
										style={{
										  position: 'absolute',
										  top: -5,
										  right: -5,
										  width: 25,
										  height: 25,
										  borderRadius: 12.5,
										  backgroundColor: 'rgba(255,0,0,0.8)'
										}}
										onPress={() => handleDeleteImage(index, selectedItem.measurementPics, 'measurementPics')}
									  />
									</View>
								  ))}
								  <Button style={styles.uploadButton1} status='control' onPress={() => handleImageUpload('measurementPics')}>
										<View style={styles.uploadContent}>
											<Icon name="cloud-upload-outline" style={styles.uploadIcon1} fill={theme['color-primary-500']} />
											<Text category='s2' style={styles.uploadButtonText}>Upload More</Text>
										</View>
								  </Button>
								</ScrollView>
							  ) : (
								  <Button
									appearance='outline'
									size='medium'
									accessoryLeft={ImageIcon}
									onPress={() => handleImageUpload('measurementPics')}
									style={{ 
									  marginBottom: 15,
									  opacity: 1
									}}
								  >
									Add Measurement Pics
								  </Button>
							  )}
							</View>
							<Divider/>
							<Text category='h6' style={{marginLeft: -15, marginTop: 10}}> Measurements: </Text>
								<ScrollView style={styles.scrollView}
								  contentContainerStyle={styles.scrollViewContent}
								  showsVerticalScrollIndicator={true}
								  persistentScrollbar={true}
								  bounces={false}
								  nestedScrollEnabled={true}
								  keyboardShouldPersistTaps="handled"
								>							
					{fields.map((field) => (
							<View key={field.key} style={styles.fieldContainer2}>
							  <Text category='label'>
								{field.key}
								{field.required && <Text style={{color: 'red'}}> *</Text>}
							  </Text>
							  <Input
								style={{width: 60}}
								autoCapitalize='none'
								keyboardType='numeric'
								value={selectedItem.measurementData?.[field.key]?.toString() || ''}
								size='small'
								onChangeText={(value) => { 
								  const updatedMeasurementData = {
									...selectedItem.measurementData,
									[field.key]: value
								  };
								  const updItem = { 
									...selectedItem, 
									measurementData: updatedMeasurementData 
								  };
								  updateLocalState('measurementData', updatedMeasurementData);
								  setSavedMeas(true);
								  setSelectedItem(updItem);
								}}
							  />
							</View>
				))}
						  
					{selectedItem.extraMeasurements && selectedItem.extraMeasurements.map((pair, index) => (
							<View key={index} style={styles.fieldContainer2}>
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
									style={{width: 60}}
									keyboardType='numeric'
									value={pair.value}
									onChangeText={(newValue) => {
									  setSavedMeas(true);
									  updateMeasurement(index, 'value', newValue);
									}}
								  />
							</View>
					))}

				</ScrollView>
						  
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
							</KeyboardAvoidingView>
						  </Modal>
	)}
	
	const navigateToSlotScreen = () => {
		saveAllLocalStates();
		console.log('in navigateToSlotScreen')
		console.log(item)
		console.log(item.slotDates)
		navigation.navigate('SlotBooking', {itemId: `${item.dressSubType ?? ''} ${item.dressType}_${item.id}`, slotDate: item.slotDates, slotsForDress: item.slots, onSave: handleSlotSelection});
	}
	
	const handleSlotSelection = (val) => {
		console.log('in handleSlotSelection')
		console.log(val);
		if(val) {
			console.log('inside val')
			let dueDates = Object.keys(val);
			console.log(dueDates)
			const newState = {
			  ...localState,
			  slotDates: dueDates,
			  slots: val
			};
			setLocalState(newState);
			saveAllLocalStates(index, {slotDates: dueDates,
			  slots: val}); 
		}
	}

	  // Only render expensive content when expanded
	  const renderExpandedContent = () => {
		if (!isExpanded) return null;
		
		return (
		  <Layout style={styles.collapsibleContent}>
			<Layout style={styles.selectContainer}>
			  {['salwar', 'pants', 'blouse'].includes(routeParams?.itemName) && (
				  <>
					{/* Salwar / Pants / Blouse subtype */}
					<Select
					  placeholder='Select Type'
					  accessoryLeft={renderSubTypeIcon}
					  value={(localState?.dressSubType?.split('_')[0]) || 'Select Type'}
					  onSelect={(index) => {
						setSelectedIndexSubType(index);
						routeParams?.itemName === 'salwar' ? updateDressSubTypePart('top', optionsSub[index.row]) : updateLocalState('dressSubType', optionsSub[index.row]);
					  }}
					>
					  {optionsSub.map((option, index) => (
						<SelectItem key={index} title={option} />
					  ))}
					</Select>

					{/* Extra dropdown only if Salwar → Pants subtype */}
					{routeParams?.itemName === 'salwar' && (
					  <Select
					    style={styles.pantsTypeField}
						placeholder='Select Pants Type'
						accessoryLeft={renderSubTypeIcon}
						value={(localState?.dressSubType?.split('_')[1]) || 'Select Pants Type'}
						onSelect={(index) => {
						  setSelectedIndexPants(index);
						  updateDressSubTypePart('pants', pantsOptions[index.row]);
						}}
					  >
						{pantsOptions.map((option, index) => (
						  <SelectItem key={index} title={option} />
						))}
					  </Select>
					)}
				  </>
				)}

			  {optionsSub[selectedIndexSubType.row] === 'Other' && (
				<Layout style={styles.alterContainer}>
				  <Layout style={styles.innerLayout}>
					<AntDesign name='skin' size={24} color={theme['color-primary-500']}/>
					<Text category='s1' style={{ marginLeft: 16 }}>Enter Type</Text>
				  </Layout>
				  <Input
					value={localState.dressSubType}
					onChangeText={(text) => updateLocalState('dressSubType', text)}
					style={styles.priceInput}
				  />
				</Layout>
			  )}
			  {routeParams?.itemName === 'Alteration' && (
				<Layout style={styles.alterContainer}>
				  <Layout style={styles.innerLayout}>
					<AntDesign name='skin' size={24} color={theme['color-primary-500']}/>
					<Text category='s1' style={{ marginLeft: 16 }}>Alter Dress Type</Text>
				  </Layout>
				  <Input
					value={localState.alterDressType}
					onChangeText={(text) => updateLocalState('alterDressType', text)}
					style={styles.priceInput}
				  />
				</Layout>
			  )}
			</Layout>
			
			<Layout style={styles.dateContainer}>
					<Layout style={styles.innerLayout}>
						<Icon name='calendar-outline' style={styles.icon} fill={theme['color-primary-500']}/>
						<Text category='s1' style={{marginLeft: 6}}>Slots</Text>
					</Layout>
					<Button size='small' onPress={navigateToSlotScreen}>{Object.keys(item.slots).length > 0 ? 'Edit slots' : 'Select slots'}</Button>
			</Layout>
			{Object.keys(item.slots).length > 0 && renderSlotSummary(item.slots)}
			
			{/* Date Container */}
			<Layout style={styles.dateContainer}>
			  <Layout style={styles.innerLayout}>
				<Ionicons name='calendar-number-outline' size={22} color={theme['color-primary-500']}/>
				<Text category='s1' style={{marginLeft: 15}}>Due date</Text>
			  </Layout>
			  <Datepicker
				date={new Date(localState.dueDate) || new Date()}
				min={new Date()}
				status='basic'
				placement='top end'
				onSelect={handleDateSelect}
				boundingElementRect={{ width: 310 }}
			  />
			</Layout>
			{/* Repeat Design Checkbox */}
			{index > 0 && showSubDropdown && (
			  <View style={styles.switchContainer}>
				<CheckBox
				  checked={localState.repeatDesign}
				  onChange={handleRepeatDesignChange}
				>
				  {evaProps => 
					<Text category='s1' style={styles.checkboxText}>
					  Repeat <Text category='label' style={styles.checkboxStyle}>'Dress 1'</Text> neck, sleeve types?
					</Text>
				  }
				</CheckBox>
			  </View>
			)}
			
			{/* Design Edit Section */}
			{(index === 0 || !localState.repeatDesign) && showSubDropdown && (
			  <Layout style={styles.priceContainer}>
				<Layout style={styles.innerLayout}>
				  <Icon name="person-outline" style={styles.icon} fill={theme['color-primary-500']}/>
				  <Text category="s1" style={{ marginLeft: 4 }}>
					Neck & Sleeve
				  </Text>
				</Layout>
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
			
			{/* Repeat Measurements Checkbox */}
			{index > 0 && (  
			  <View style={styles.switchContainer}>
				<CheckBox
				  checked={localState.repeatMeas}
				  onChange={handleRepeatMeasChange}
				>
				  {evaProps => 
					<Text category='s1' style={styles.checkboxText}>
					  Repeat <Text category='label' style={styles.checkboxStyle}>'Dress 1'</Text> measurements?
					</Text>
				  }
				</CheckBox>
			  </View>
			)}
			
			{/* Measurements Edit Section */}
			{(index === 0 || !localState.repeatMeas) && (
			  <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={true}>
				<Layout style={styles.priceContainer}>
				  <Layout style={styles.innerLayout}>
					<Icon name="maximize-outline" style={styles.icon} fill={theme['color-primary-500']}/>
					<Text category="s1" style={{ marginLeft: 4 }}>
					  Measurements *
					</Text>
				  </Layout>
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
		  
			<MultiSelectOptions onSelectionChange={handleMultiselectChange} initialItems={extraOptionsKeys}/>
		  
			{/* Pricing Card */}
			<Card style={styles.accordionCard}>
			  <TouchableOpacity
				style={styles.accordionHeader}
				onPress={() => setIsPricingExpanded(!isPricingExpanded)}
			  >
				<Layout style={styles.headerContent}>
				  <Layout style={styles.headerLeft}>
					<PriceTagIcon style={styles.headerIcon} />
					<Text category='s1' style={styles.headerText}>Pricing</Text>
				  </Layout>
				  <Layout style={styles.headerRight}>
					<Text category='h6' style={[styles.priceText, { color: theme['color-primary-600'] }]}>
					  ₹{calculateTotal()}
					</Text>
					<ChevronIcon style={styles.chevronIcon} />
				  </Layout>
				</Layout>
			  </TouchableOpacity>

			  {isPricingExpanded && (
				<Layout style={styles.expandedContent}>
				  <Layout style={styles.stitchingContainer}>
					<Layout style={styles.inputHeader}>
					  <Text category='s1' style={styles.inputLabel}>Stitching Amount</Text>
					</Layout>
					<Input
					  keyboardType='numeric'
					  value={localState.stitchingAmt}
					  onChangeText={(text) => updateLocalState('stitchingAmt', text)}
					  size='small'
					  style={{width: 80}}
					/>
				  </Layout>

				  <Layout style={styles.addonsAccordion}>
					<TouchableOpacity
					  style={styles.addonsHeader}
					  onPress={() => setIsAddonsExpanded(!isAddonsExpanded)}
					>
					  <Layout style={styles.addonsHeaderContent}>
						<Layout style={styles.addonsHeaderLeft}>
						  <Text category='s1' style={styles.addonsHeaderText}>Addons</Text>
						</Layout>
						<AddonChevronIcon style={styles.addonsChevron} />
					  </Layout>
					</TouchableOpacity>

					{isAddonsExpanded && (
					  <Layout style={styles.addonsContent}>
						{Object.entries(localState.extraOptions).map(([name, price], index) => (
						  <Layout key={index} style={styles.addonItem}>
							<Layout style={styles.addonRow}>
							  <Text category='s2' style={styles.addonName}>{name}</Text>
							  <Input
								keyboardType='numeric'
								value={price}
								onChangeText={(text) => handleAddonPriceChange(name, text)}
								size='small'
								placeholder='0'
							  />
							</Layout>
						  </Layout>
						))}
					  </Layout>
					)}
				  </Layout>
				</Layout>
			  )}
			</Card>

			{/* Image Upload Section */}
			<View style={{flexDirection: 'row', gap: 20, marginLeft: 40}}>
			  <Layout style={styles.imageContainer}>
				{localState.dressPics.length > 0 ? (
				  <View style={styles.imageWrapper}>
					<Image source={{ uri: localState.dressPics[0] }} style={styles.image} />
					<TouchableOpacity onPress={handleViewDressPics} style={styles.overlay}>
					  <Text category='s2' style={styles.overlayText}>View Material Pics</Text>
					</TouchableOpacity>
				  </View>
				) : (
				  <Button style={styles.uploadButton} status='control' onPress={() => handleImageUpload('dressPics')}>
					<View style={styles.uploadContent}>
					  <Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
					  <Text category='s2' style={styles.uploadButtonText}>Upload Material Pics</Text>
					</View>
				  </Button>
				)}
			  </Layout>
			  
			  <Layout style={styles.imageContainer}>
				{localState.patternPics.length > 0 ? (
				  <View style={styles.imageWrapper}>
					<Image source={{ uri: localState.patternPics[0] }} style={styles.image} />
					<TouchableOpacity onPress={handleViewPatternPics} style={styles.overlay}>
					  <Text category='s2' style={styles.overlayText}>View Design Pics</Text>
					</TouchableOpacity>
				  </View>
				) : (
				  <Button style={styles.uploadButton} status='control' onPress={() => handleImageUpload('patternPics')}>
					<View style={styles.uploadContent}>
					  <Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
					  <Text category='s2' style={styles.uploadButtonText}>Upload Design Pics</Text>
					</View>
				  </Button>
				)}
			  </Layout>
			</View>

			<Input
			  value={localState.notes}
			  placeholder='Notes'
			  onChangeText={(text) => updateLocalState('notes', text)}
			  style={styles.notesInput}
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
			  {index > 0 && (
				<Button
				  appearance="ghost"
				  accessoryLeft={(props) => <Icon {...props} name="trash-outline" fill='#FF6363'/>}
				  size='small'
				  onPress={handleDelete}
				  style={styles.trashIcon}
				/>
			  )}
			</View>
		  </TouchableOpacity>
		  
		  {renderExpandedContent()}
		  {renderMeasurementsModal()}
		  {renderDesignModal()}
		  
		  <Modal style={styles.fullScreenModal} visible={showCarouselDress} backdropStyle={styles.backdrop} onBackdropPress={() => setShowCarouselDress(false)}>
										<Card style={styles.modalContent}>
											<TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCarouselDress(false)}>
											  <Icon name="close-outline" style={styles.modalCloseIcon} />
											</TouchableOpacity>
											<View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
												{localState.dressPics.map((image, index) => (
												<View key={index} style={styles.imageWrapper}>
												  <Image source={{ uri: image }} style={styles.image} />
												  <TouchableOpacity
													onPress={() => handleDeleteImage(index, localState.dressPics, 'dressPics')}
													style={styles.closeButton}
												  >
													<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
												  </TouchableOpacity>
												</View>
												))}
												<Button style={styles.uploadButton} status='control' onPress={() => handleImageUpload('dressPics')}>
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
												{localState.patternPics.map((image, index) => (
													<View key={index} style={styles.imageWrapper}>
													  <Image source={{ uri: image }} style={styles.image} />
													  <TouchableOpacity
														onPress={() => handleDeleteImage(index, localState.patternPics, 'patternPics')}
														style={styles.closeButton}
													  >
														<Icon name="trash-outline" fill="#FF6363" style={styles.closeIcon} />
													  </TouchableOpacity>
													</View>
												))}
												<Button style={styles.uploadButton} status='control' onPress={() => handleImageUpload('patternPics')}>
												  <View style={styles.uploadContent}>
													<Icon name="cloud-upload-outline" style={styles.uploadIcon} fill={theme['color-primary-500']} />
													<Text category='s2' style={styles.uploadButtonText}>Upload Design Pics</Text>
												  </View>
												</Button>
											</View>
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
		</Layout>
	  );
	}), (prevProps, nextProps) => {
	  return (
		prevProps.isExpanded === nextProps.isExpanded &&
		prevProps.item.id === nextProps.item.id &&
		prevProps.item.localId === nextProps.item.localId
	  );
	});
	
	const renderItems = () => {
		return (
		  <FlatList
			data={localItems}
			keyExtractor={(item) => item.id.toString()}
			renderItem={({ item, index }) => (
			  <RenderItemCollapsible 
			    ref={(ref) => itemRefs.current[index] = ref}
				key={item.id}
				item={item} 
				index={index} 
				isExpanded={!!expandedItems[index]} 
				onToggle={() => toggleExpand(index)}
			  />
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
	
	const handlePhNoChange = (text) => {
				  onChangeText(text);
				  setPhoneError(false);
				  setPhoneErrorValid(false);
				  setAnniversary(null);
				  setDob(null)
				  setLocation('');
				  setProfession('');
				  setAwarenessSource('');
				  setAwarenessSourceIndex(null);
				  setShowSuggestions(text.length > 0);
	}
	
  return (
	<ScrollView ref={scrollViewRef} style={styles.container} keyboardShouldPersistTaps="handled">
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
		<Breadcrumbs steps={breadcrumbRoutes} itemName={routeParams.itemName} headerImgUri={routeParams.headerImgUri} step={step} setStep={setStep} navigation={navigation} bcDisabled={phoneNo ? false : true}/>

		{step === 1 ? (
          <TouchableWithoutFeedback onPress={() => {
			  setShowSuggestions(false); // Hide the suggestions when tapping outside
			  Keyboard.dismiss(); // Close keyboard when tapping outside
		  }}>
		  <View>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
				<Text category='h6' style={styles.title}>Customer Details</Text>
				<Text style={styles.title}>Prev. Order: #{prevOrderNo}</Text>
			</View>
			<Card style={styles.card} status="primary">
			  <Input
				status={(phoneError || phoneErrorValid) ? 'danger' : 'basic'}
				style={{ width: '100%' }}
				label="Customer Phone Number *"
				keyboardType="phone-pad"
				accessoryRight={renderContactsIcon}
				maxLength={10}
				value={phoneNo}
				onChangeText={(text) => handlePhNoChange(text)}
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
		  {customerDataFound && renderUpcomingCelebrations()}
		  {renderNewCustomerFields()}
		  <View style={styles.nextButtonContainer}>
		    <Button appearance='outline' style={styles.cancelButton} onPress={handleClear}>Clear details</Button>
			<Button onPress={handleNextStep} style={styles.nextButton} disabled={!custName || !phoneNo || occasion === ' '}>Next</Button>
		  </View>
		</View>
		</TouchableWithoutFeedback>
        ) : (
          <>

		  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
				<Text category='h6' style={styles.title}>Fill and Confirm your Order</Text>
				<Text style={styles.title}>Prev. Order: #{prevOrderNo}</Text>
		  </View>
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
					Confirm order
				</Button>
          </Layout>
		  </>
		)}
        </Layout>
		</>
	  )}
			<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
			</Modal>
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
    marginBottom: 10
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
	justifyContent: 'space-between',
	alignItems: 'center',
	marginHorizontal: 40
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
	  marginTop: -5
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
	marginTop: 10,
	marginBottom: -5
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
  uploadButton1: {
    marginTop: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
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
	marginLeft: 5
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
  fieldContainerDG: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
	marginLeft: -10,
	marginTop: 10,
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
	height: 600,
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
		width: '105%',
		height: 400,
		marginLeft: -10
	  },
	  scrollViewContent: {
		paddingVertical: 10,
		paddingHorizontal: 10,
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
  imageContainerMeas: {
    position: 'relative',
    marginRight: 12,
	marginTop: 10
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imagePreview: {
    maxHeight: 100,
  },
  addOnItem: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  addOnInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addOnNameInput: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addOnPriceInput: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButton: {
    paddingHorizontal: 8,
  },
  removeIcon: {
    width: 16,
    height: 16,
  },
  accordionCard: {
    borderRadius: 8,
	marginTop: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
	marginLeft: -7
  },
  headerText: {
    fontWeight: '600'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
  },
  chevronIcon: {
    width: 20,
    height: 20,
  },
  expandedContent: {
	  marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    backgroundColor: 'transparent',
  },
  stitchingContainer: {
    padding: 16,
    backgroundColor: 'transparent',
	flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  inputIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  inputLabel: {
	marginTop: 5
  },
  priceInput: {
    marginTop: 4,
  },
  addonsAccordion: {
    backgroundColor: '#f8f9fa',
  },
  addonsHeader: {
    padding: 12,
  },
  addonsHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addonsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addonsIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  addonsHeaderText: {
    fontWeight: '500',
  },
  addonsChevron: {
    width: 16,
    height: 16,
  },
  addonsContent: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
  },
  addonItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: 'transparent',
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addonName: {
    flex: 1,
    marginRight: 12,
  },
  sectionContent: {
    padding: 16,
  },
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
  celebrationCard: {
    marginTop: 20,
	marginBottom: -10,
    backgroundColor: '#F7F9FC',
	borderRadius: 10,
    elevation: 5,
  },
  celebrationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  celebrationLeft: {
    flex: 1,
  },
  celebrationType: {
    fontWeight: 'bold',
    color: '#374151',
  },
  celebrationDate: {
    color: '#6b7280',
    marginTop: 2,
  },
  celebrationVal: {
    color: '#6b7280',
    marginTop: 2,
	marginLeft: 22
  },
  daysBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayBadge: {
    backgroundColor: '#fee2e2',
  },
  soonBadge: {
    backgroundColor: '#fed7aa',
  },
  upcomingBadge: {
    backgroundColor: '#dbeafe',
  },
  daysText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  todayText: {
    color: '#dc2626',
  },
  soonText: {
    color: '#ea580c',
  },
  upcomingText: {
    color: '#2563eb',
  },
  foundCard: {
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
  },
  newCustomerCard: {
    marginTop: 20,
	marginBottom: -10,
	borderRadius: 10,
    backgroundColor: '#F7F9FC',
    elevation: 5,
  },
  newCustomerTitle: {
    textAlign: 'center',
  },
  newCustomerSubtitle: {
    textAlign: 'center',
	marginLeft: -20,
    marginBottom: 10,
  },
  celebrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  celebrationItemHalf: {
    flex: 0.48, // Slightly less than 0.5 to account for spacing
  },
  custSaveButton: {
	marginTop: 10,
	marginHorizontal: 100
  },
  celebrationTitle: {marginBottom: 8},
  pantsTypeField: {marginTop: 10}
});

export default TestScreen;
