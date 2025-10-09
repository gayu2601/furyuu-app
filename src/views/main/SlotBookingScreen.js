import React, { useEffect, useState } from 'react';
import { supabase } from '../../constants/supabase';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import {
  Layout,
  Text,
  Button,
  Card,
  Modal,
  TopNavigation,
  TopNavigationAction,
  Divider,
  Icon,
  List,
  ListItem,
  RadioGroup,
  Radio 
} from '@ui-kitten/components';
import MoveOrderModal from './MoveOrderModal';
import SettingsModal from './SettingsModal';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSlotBooking } from './SlotBookingContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import { ArrowIosBackIcon, SettingsIcon } from "../extra/icons";
import { usePubSub } from './SimplePubSub';
import { useUser } from './UserContext';
import eventEmitter from './eventEmitter';
import { storage } from '../extra/storage';

const { width } = Dimensions.get('window');

const SlotBookingScreen = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedForExpress, setSelectedForExpress] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlotDate, setSelectedSlotDate] = useState(null);
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [showMoveOrder, setShowMoveOrder] = useState(false);
  const [orderToMove, setOrderToMove] = useState(null);
  const [showManageSlot, setShowManageSlot] = useState(false);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState(null);
  const [bookedSlotsState, setBookedSlotsState] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const route = useRoute();
  const {slotDate, slotsForDress, prevScreen, editRouteParams, itemId, orderNo, slotsDiff} = route.params;
  console.log('slotDate', slotDate)
  const [confirmedSlotDate, setConfirmedSlotDate] = useState([]);
  const [currentSlots, setCurrentSlots] = useState({});
  const [ordersForDate, setOrdersForDate] = useState([]);
  const [currentOrderData, setCurrentOrderData] = useState({});
  const [loading, setLoading] = useState(false);
  const [tempChanges, setTempChanges] = useState({regular: 0, express: 0, total: 0, regularSlots: 0, expressSlots: 0});
  const navigation = useNavigation();
  const { getAllBookings, addBooking, getBookingsForDate } = useSlotBooking();
  const todayDate = moment().format("YYYY-MM-DD");
  const [tempSlots, setTempSlots] = useState({});
  const [movedOrders, setMovedOrders] = useState([]);
  const {notify, updateCache} = usePubSub();
  const { currentUser } = useUser();
  const [settingsVisible, setSettingsVisible] = useState(false);
  let regCached = storage.getString('maxRegularSlots');
  let expCached = storage.getString('maxExpressSlots');
  const [maxRegularSlots, setMaxRegularSlots] = useState(regCached ? Number(regCached) : 8);
  const [maxExpressSlots, setMaxExpressSlots] = useState(expCached ? Number(expCached) : 3);
  
  useEffect(() => {
		navigation.setOptions({
		  headerRight: () => (
			<TopNavigationAction icon={SettingsIcon} style={{marginRight: 20}} onPress={() => {console.log('clicked settings'); setSettingsVisible(true);}}/>
		  ),
		});
	}, [navigation]);
  
  // Add state to track if this is first time booking or editing existing
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				if (prevScreen === 'Edit') {
				  navigation.navigate('EditOrderDetails', editRouteParams);
				} else {
					navigation.goBack();
				}
			}}/>
		  ),
		});
	  }, [navigation, prevScreen, editRouteParams]);
	  
	useEffect(() => {
		const backAction = () => {
			if (prevScreen === 'Edit') {
				return false;
			} else {
				navigation.goBack();
				return true;
			}
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, [navigation, prevScreen, editRouteParams]);   
  
	useEffect(() => {
		const getBookedSlots = async() => {
		  try {
			  console.log('in getBookedSlots')
			  console.log(slotDate)
			setLoading(true);
			  const { data, error } = await supabase
							  .from('v_daily_slot_summary')
							  .select(`*`);
			  if (error) {
				throw error;
			  } 
			  console.log(data);
			  
			  const dbSlots = data.reduce((acc, slot) => {
				  acc[slot.slot_date] = {
					regular: slot.regular_slots_booked,
					express: slot.express_slots_booked,
					total: slot.total_slots_booked
				  };
				  return acc;
				}, {});
				
			console.log(slotsForDress);
			let contextData = getAllBookings();
			if(prevScreen === 'Edit') {
				contextData = slotsForDress;
			}
			console.log('contextData', contextData);
			setCurrentSlots(slotsForDress);
			
			setConfirmedSlotDate(slotDate);
			
			const allDates = new Set([
			  ...Object.keys(dbSlots),
			  ...Object.keys(contextData)
			]);
			
			const bookedSlots = {};

			allDates.forEach(date => {
			  const db = dbSlots[date] || { regular: 0, express: 0, total: 0 };
			  let ctx = { regular: 0, express: 0, total: 0 };
			  if(prevScreen === 'Edit') {
				ctx = slotsDiff?.[date] || { regular: 0, express: 0, total: 0 };
			  } else {
				ctx = contextData[date] || { regular: 0, express: 0, total: 0 };
			  }
			  bookedSlots[date] = {
				regular: db.regular + ctx.regular,
				express: db.express + ctx.express,
				total: db.total + ctx.total
			  };
			});

			setBookedSlotsState(bookedSlots);
		  } catch(error) {
			console.error('Error fetching daily slots:', error);
		  } finally {
			setLoading(false);
		  }
		}
		getBookedSlots();
	}, [slotDate, slotsForDress]);

  const expressOptions = [
    { days: '5-3', label: '5 to 3 Days', price: 500 },
    { days: '3', label: '3 Days', price: 800 },
    { days: '2', label: '2 Days', price: 1200 },
    { days: '1', label: '1 Day', price: 2000 }
  ];

  // Icons
  const BackIcon = (props) => <Icon {...props} name='arrow-back-outline' />;
  const ForwardIcon = (props) => <Icon {...props} name='arrow-forward-outline' />;
  const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' />;
  const ClockIcon = (props) => <Icon {...props} name='clock-outline' />;
  const PlusIcon = (props) => <Icon {...props} name='plus-outline' />;
  const CloseIcon = (props) => <Icon {...props} name='close-outline' />;
  const CheckIcon = (props) => <Icon {...props} name='checkmark-outline' />;
  const FlashIcon = (props) => <Icon {...props} name='flash-outline' />;
  const MinusIcon = (props) => <Icon {...props} name='minus-outline' />;
  const EyeIcon = (props) => <Icon {...props} name='eye-outline' />;
  const EditIcon = (props) => <Icon {...props} name='edit-outline' />;
  const TrashIcon = (props) => <Icon {...props} name='trash-2-outline' />;

  const getDaysInMonth = (date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
	const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDay.getUTCDate();
    const firstDayOfWeek = firstDay.getUTCDay();
	
    const days = [];
    
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };
  
  const handleSaveSettings = (regular, express) => {
    setMaxRegularSlots(regular);
    setMaxExpressSlots(express);
    setSettingsVisible(false);
    
    // Optionally save to AsyncStorage or your state management
    storage.set('maxRegularSlots', regular.toString());
    storage.set('maxExpressSlots', express.toString());
    
    console.log('Settings saved:', { regular, express });
  };

  const formatDate = (day, monthName) => {
	let mn = monthName || currentMonth;
    const year = mn.getFullYear();
    const month = String(mn.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getSlotCount = (day, monthName) => {
    if (!day) return { regular: 0, express: 0, total: 0 };
	let mn = monthName || currentMonth;
	const dateKey = formatDate(day, mn);
	return bookedSlotsState[dateKey] || { regular: 0, express: 0, total: 0 };
  };

  const isSlotFull = (day, monthName) => {
    const slots = getSlotCount(day, monthName);
    return slots.total >= 11;
  };

  const hasExpressBookings = (day) => {
    const slots = getSlotCount(day);
    return slots.express > 0;
  };

  const navigateMonth = (direction) => {
	console.log('in navigateMonth')
	console.log(currentMonth);
    const newMonth = new Date(currentMonth);
	console.log(newMonth)
	console.log(currentMonth.getMonth());
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };
  
  const getCurrentSlots = (date) => {
	  return bookedSlots[date] || { regular: 0, express: 0, total: 0 };
	};

  const handleDateClick = async(day) => {
    if (!day) return;
    
    const dateKey = formatDate(day);
    const slots = getSlotCount(day);
	console.log('in handleDateClick ' + dateKey + orderNo)
	const dressItemIds = [...new Set(movedOrders.map(order => order.dressItemId))];
	console.log('dressItemIds filtered', dressItemIds);
	const { data, error } = await supabase
							  .rpc('get_slot_orders', {due_date_param: dateKey, order_no_param: orderNo || null, dress_ids: dressItemIds || []});
	if (error) {
		console.error('Error fetching daily slots:', error);
	}
	console.log(data)
	setOrdersForDate(data);
	let contextItemData = getBookingsForDate(dateKey);
	console.log('contextItemData', contextItemData);
	if(contextItemData) {
		const { [itemId]: _, ...filtered } = contextItemData;
		console.log('filtered', filtered);
		setCurrentOrderData(filtered);
	}
	console.log('movedOrders', movedOrders)
	console.log('dateKey', dateKey);
	if(movedOrders.length > 0) {
		const matchingOrders = movedOrders
			.filter(order => order.target_date === dateKey)
			.map(({ regular, express, total, ...rest }) => ({
				...rest,
				slots: { regular, express, total }
			}));
		console.log('matchingOrders', matchingOrders);
		setOrdersForDate(prev => (prev || []).concat(matchingOrders));
	}
    setSelectedSlotDate(dateKey);
    
    // Check if this is editing existing booking or creating new one
    const hasExistingBooking = currentSlots && currentSlots[dateKey]?.total > 0;
    setIsEditingExisting(hasExistingBooking);
    
    if (hasExistingBooking) {
      // Initialize tempChanges with existing values for editing
      setTempChanges({
        regular: currentSlots[dateKey].regular,
        express: currentSlots[dateKey].express,
        total: currentSlots[dateKey].total,
        regularSlots: 0,
        expressSlots: 0
      });
    } else {
      // Initialize tempChanges for new booking
      setTempChanges({regular: 0, express: 0, total: 0, regularSlots: 0, expressSlots: 0});
    }
    
    setShowManageSlot(true);
  };

  const handleExpressDelivery = () => {
    if (selectedDate) {
      setSelectedForExpress(selectedDate);
    }
    setShowDeliveryOptions(true);
  };

  const selectExpressOption = (option) => {
    if (selectedDate) {
      setSelectedForExpress(selectedDate);
    }
    setShowDeliveryOptions(false);
  };

  const closeModal = () => {
    setShowDeliveryOptions(false);
    setShowMoveOrder(false);
    setShowManageSlot(false);
	setSelectedSlotDate(null);
    setOrderToMove(null);
    setSelectedDeliveryType(null);
    setIsEditingExisting(false);
  };

  const handleMoveOrder = (order) => {
    setOrderToMove(order);
    setShowMoveOrder(true);
  };

  const adjustSlots = (type, change) => {
	const slotsKey = `${type}Slots`
	console.log('in adjustSlots')
	console.log(tempChanges);
	setTempChanges(prev => {
	  const updated = {
		...prev,
		[type]: Math.max(0, prev[type] + change),
		[slotsKey]: (prev[slotsKey] || 0) + change
	  };

	  return {
		...updated,
		total: updated.regular + updated.express,
	  };
	});
	console.log(tempChanges);
  };
  
  const updateSlots = (prev, selectedSlotDate, tempChanges) => {
	  if (tempChanges.total === 0) {
		const { [selectedSlotDate]: _, ...rest } = prev; // remove the key
		return rest;
	  }

	  return {
		...prev,
		[selectedSlotDate]: {
		  regular: tempChanges.regular,
		  express: tempChanges.express,
		  total: tempChanges.total,
		  expressDuration: tempChanges.express > 0 ? expressOptions[selectedIndex] : null
		}
	  };
	};
  
  const saveEditedChanges = () => {
		console.log(bookedSlotsState[selectedSlotDate])
		setCurrentSlots(prev => updateSlots(prev, selectedSlotDate, tempChanges));
		setTempSlots(prev => ({ ...prev, [selectedSlotDate]: { regular: tempChanges.regular, express: tempChanges.express, total: tempChanges.total, expressDuration: tempChanges.express > 0 ? expressOptions[selectedIndex] : null } }));
		console.log(tempChanges)
		setBookedSlotsState(prev => {
		  const base = prev[selectedSlotDate] || { regular: 0, express: 0, total: 0 };
		  console.log(base);

		  const updated = {
			regular: base.regular + (tempChanges.regularSlots || 0),
			express: base.express + (tempChanges.expressSlots || 0),
			total: base.total + ((tempChanges.regularSlots || 0) + (tempChanges.expressSlots || 0))
		  };
		  
		  updated.expressDuration = updated.express > 0 ? expressOptions[selectedIndex] : null;
		  console.log(updated);
		  return {
			...prev,
			[selectedSlotDate]: updated,
		  };
		});
		console.log('currentSlots[selectedSlotDate]:')
		console.log(currentSlots[selectedSlotDate])
		if(tempChanges.total === 0) {
			console.log('total is 0')
			setConfirmedSlotDate(prev => 
				prev.filter(date => date !== selectedSlotDate)
			);
		} else {
		  // Add to confirmed dates if not already there
		  setConfirmedSlotDate(prevDates => {
			if (!prevDates.includes(selectedSlotDate)) {
			  return [...prevDates, selectedSlotDate];
			}
			return prevDates;
		  });
		}
		setTempChanges({regular: 0, express: 0, total: 0});
		console.log(bookedSlotsState[selectedSlotDate])
  }

  const removeAllSlots = (type) => {
	const slotsKey = `${type}Slots`;
	console.log('in removeAllSlots')
	setTempChanges(prev => {
		console.log(prev[type])
		const updated = { ...prev, [type]: 0, [slotsKey]: -prev[type] };
		return { ...updated, total: updated.regular + updated.express };
	  });
  };

  const moveOrderToDate = (targetDate) => {
	console.log('in moveOrderToDate ', targetDate)
    const sourceDate = selectedSlotDate;
    let srcCurrent = currentSlots[selectedSlotDate] || {regular: 0, express: 0, total: 0};
	let targetCurrent = currentSlots[targetDate] || {regular: 0, express: 0, total: 0};
	let mvVal = orderToMove.slots;
    setBookedSlotsState(prev => {
      const updated = { ...prev };
	  
      if (updated[sourceDate]) {
		console.log('in if')
        const sourceSlots = { ...updated[sourceDate] };
          sourceSlots.express = Math.max(0, sourceSlots.express - mvVal.express);
          sourceSlots.regular = Math.max(0, sourceSlots.regular - mvVal.regular);
        sourceSlots.total = sourceSlots.regular + sourceSlots.express;
        updated[sourceDate] = sourceSlots;
		srcCurrent = sourceSlots;
      }
      
      if (!updated[targetDate]) {
        updated[targetDate] = { regular: 0, express: 0, total: 0 };
      }
      const targetSlots = { ...updated[targetDate] };
        targetSlots.express += mvVal.express;
        targetSlots.regular += mvVal.regular;
      targetSlots.total = targetSlots.regular + targetSlots.express;
      updated[targetDate] = targetSlots;
      targetCurrent = targetSlots;
	  console.log('updated', updated)
      return updated;
    });
    setShowMoveOrder(false);
    setOrderToMove(null);
	setOrdersForDate(prev => prev.filter(order => order.dressItemId !== orderToMove.dressItemId));
	let mv = {source_date: sourceDate, target_date: targetDate, dressItemId: orderToMove.dressItemId, regular: mvVal.regular, express: mvVal.express, total: mvVal.total, orderNo: orderToMove.orderNo, dressType: orderToMove.dressType, dressSubType: orderToMove.dressSubType, custName: orderToMove.custName, orderStatus: orderToMove.orderStatus}
	console.log('mv', mv)
	setMovedOrders(prev => [...prev, mv]);
  };
  
  const saveAllSlots = async() => {
		console.log('in saveAllSlots')
		console.log(currentSlots);
	  console.log(tempSlots);
	  if(movedOrders?.length > 0) {
		  console.log(movedOrders)
		  for (const mo of movedOrders) {
			  const { source_date, target_date, dressItemId, regular, express, total, orderStatus } = mo;
			  const { error } = await supabase.rpc("move_slot_key", {
				record_id: dressItemId,
				source_key: source_date,
				target_key: target_date,
				reg: regular,
				exp: express,
				tot: total
			  });

			  if (error) console.error(error);
			  console.log('updating movedOrders in db')
			  console.log(source_date, target_date, dressItemId, regular, express, total);
			  const cacheKey = orderStatus === 'Completed' ? 'Completed_true' : 'Completed_false';
			  updateCache('UPDATE_SLOTS', mo, cacheKey);    
			  await notify(currentUser.id, 'UPDATE_SLOTS', cacheKey, mo);
			  eventEmitter.emit('newOrderAdded');
		  }
		}
	  	  const { onSave } = route.params
		  if (onSave) {
			onSave(currentSlots);
		  }
		  if(prevScreen !== 'Edit') {
			addBooking(tempSlots, itemId);
		  }
		  setConfirmedSlotDate([]);
		  setBookedSlotsState([]);
		  setCurrentSlots({});
		  setMovedOrders([]);
			if (prevScreen === 'Edit') {
				navigation.navigate('EditOrderDetails', editRouteParams);
			} else {
				navigation.goBack();
			}
  }
  
  const renderOrderItem = ({ item, index }) => (
    <Card style={styles.orderCard} key={index}>
      <Layout style={styles.orderContent}>
        <Layout>
          <Text category='s1' style={styles.orderNumber}>#{item.orderNo}</Text>
          <Text category='p2' appearance='hint'>{item.custName}</Text>
          <Text category='c1' appearance='hint'>{item.dressSubType} {item.dressType}</Text>
		  <View style={styles.buttonContainer}>
			  <View style={styles.roundedButton}>
				<Text category='c1' appearance='hint'>Regular: {item.slots.regular}</Text>
			  </View>
			  <View style={styles.roundedButtonExpress}>
				<Text category='c1' appearance='hint'>Express: {item.slots.express}</Text>
			  </View>
		  </View>
        </Layout>
        <Layout style={styles.orderActions}>
          
          <Button
            size='tiny'
            appearance='ghost'
            onPress={() => handleMoveOrder(item)}
          >
            Move Order
          </Button>
        </Layout>
      </Layout>
    </Card>
  );
  
  const renderCurrentOrderItem = (item) => {
	console.log('in renderCurrentOrderItem ', item)
    return Object.entries(item).map(([key, counts]) => (
      <Card style={styles.orderCard} key={key}>
        <Layout style={styles.orderContent}>
          <Layout>
            <Text category='s1' style={styles.orderNumber}>{key.split('_')[0]}</Text>
            <Text category='p2' appearance='hint'>Express: {counts.express}</Text>
            <Text category='p2' appearance='hint'>Regular: {counts.regular}</Text>
			<Text category='c1' appearance='hint'>Total: {counts.total}</Text>
          </Layout>
        </Layout>
      </Card>
    ));
  };
	
	const isQuantityDisabledManageSlots = (type) => {
		console.log(selectedSlotDate)
		console.log(bookedSlotsState[selectedSlotDate])
		const booked = bookedSlotsState[selectedSlotDate]?.[type] || 0;
		console.log('in isQuantityDisabledManageSlots ', booked, tempChanges) 

		  if (type === 'regular') {
			return booked >= maxRegularSlots || booked + tempChanges.regularSlots >= maxRegularSlots;
		  } else {
			return booked >= maxExpressSlots || booked + tempChanges.expressSlots >= maxExpressSlots;
		  }
	}

  const renderCalendarDay = (day, index) => {
    if (!day) return <View key={index} style={[styles.dayCell, styles.emptyDay]} />;

    const slots = getSlotCount(day);
	const isFull = isSlotFull(day);
    const hasExpress = hasExpressBookings(day);
    const dateKey = formatDate(day);
    const isSelected = selectedDate === dateKey;
    const isSelectedForExpressDelivery = selectedForExpress === dateKey;
	const isSelectedSlot = confirmedSlotDate.includes(dateKey);
	
    let dayStyle = styles.availableDay;
    let textColor = '#10B981';
	
    if (isSelected && !slots.total) {
      dayStyle = styles.selectedDay;
      textColor = '#7C3AED';
    } else if (isSelectedForExpressDelivery) {
      dayStyle = styles.expressSelectedDay;
      textColor = '#EA580C';
    } else if (isFull) {
      dayStyle = styles.fullDay;
      textColor = '#DC2626';
    } else if (slots.total > 0) {
      dayStyle = styles.bookedDay;
      textColor = '#2563EB';
    }
	
    return (
      <TouchableOpacity
        key={index}
        style={[styles.dayCell, dayStyle]}
        onPress={() => handleDateClick(day)}
      >
	   <View style={styles.dayCellContent}>
	    <View style={[
            styles.dayNumberContainer
          ]}>
            <Text style={[
              styles.dayNumber,
              { color: textColor }
            ]}>
              {day}
            </Text>
        </View>

		{isSelectedSlot && (
          <View style={styles.tickIndicator}>
            <Icon style={styles.tickIcon} fill='#fff' name='checkmark-outline' />
          </View>
        )}
		  <View style={styles.slotIndicatorContainer}>
			{slots.regular > 0 && (
				<View style={styles.slotIndicator}>
				  <Text style={styles.slotText}>
					{slots.regular}
				  </Text>
				</View>
			)}
			{slots.express > 0 && (
				<View style={styles.slotIndicator1}>
				  <Text style={styles.slotText}>
					{slots.express}
				  </Text>
				</View>
			)}
		  </View>
		</View>
      </TouchableOpacity>
    );
  };

  return (
    <Layout style={styles.container}>
	{loading ? (
				<ActivityIndicator size="large" style={styles.spinner} />
	  ) : (
	  <>
	  <ScrollView style={styles.scrollView}>
        {/* Calendar Navigation */}
		<Card style={{marginLeft: -20, marginRight: -25}}>
          <Layout style={styles.monthNavigation}>
            <TopNavigationAction
              icon={BackIcon}
              onPress={() => navigateMonth(-1)}
            />
            <Text category='h6' style={styles.monthTitle}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TopNavigationAction
              icon={ForwardIcon}
              onPress={() => navigateMonth(1)}
			  style={{marginRight: 20}}
            />
          </Layout>

            {/* Day headers */}
            <Layout style={styles.weekHeadersContainer}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <View key={index} style={styles.weekHeaderCell}>
					<Text style={styles.weekHeaderText}>{day}</Text>
				</View>
              ))}
            </Layout>

            {/* Calendar days */}
            <Layout style={styles.daysGrid}>
              {getDaysInMonth(currentMonth).map((day, index) => renderCalendarDay(day, index))}
            </Layout>
		</Card>
		
		<Button style={styles.saveButton} onPress={saveAllSlots}>Confirm Slots</Button>

        {/* Legend */}
        <Card style={styles.legendCard}>
          <Text category='s1' style={styles.legendTitle}>Legend:</Text>
          <Layout style={styles.legendItems}>
            {[
              { type: 'color', color: '#D1FAE5', border: '#10B981', text: 'Fully available' },
              { type: 'color', color: '#2563EB', border: '#2563EB', text: 'Regular delivery slots booked' },
              { type: 'color', color: '#EA580C', border: '#EA580C', text: 'Express delivery slots booked' },
			  { type: 'color', color: '#DBEAFE', border: '#2563EB', text: 'Partially Booked' },
			  { type: 'color', color: '#FEE2E2', border: '#DC2626', text: 'Fully Booked' }
            ].map((legend, index) => (
				legend.type === 'color' ? (
				  <Layout key={index} style={styles.legendItem}>
					<View style={[styles.legendColor, { backgroundColor: legend.color, borderColor: legend.border }]} />
					<Text category='c1' style={styles.legendText}>{legend.text}</Text>
				  </Layout>
				) : (
				  <Layout key={index} style={styles.legendItem}>
					{legend.icon === 'flash' ? (
						  <Icon 
							  name={legend.icon} 
							  style={styles.legendIcon} 
							/>
					) : (
						<MaterialCommunityIcons name={legend.icon} size={24} color='#10B981'/>
					)}
					<Text category='c1' style={styles.legendText}>{legend.text}</Text>
				  </Layout>
				)
            ))}
          </Layout>
        </Card>
		
        {/* Quick Actions */}
        <Layout style={styles.actionsContainer}>
          {selectedDate && (
            <Card style={[styles.statusCard, { backgroundColor: '#D1FAE5' }]}>
              <Text category='c1' style={{ color: '#059669' }}>
                ✓ Selected date: {selectedDate} for regular delivery
              </Text>
            </Card>
          )}

          {selectedForExpress && (
            <Card style={[styles.statusCard, { backgroundColor: '#FED7AA' }]}>
              <Text category='c1' style={{ color: '#EA580C' }}>
                ⚡ Selected date: {selectedForExpress} for express delivery
              </Text>
            </Card>
          )}
        </Layout>
      </ScrollView>

      {/* Single Consolidated Modal for Booking and Managing Slots */}
      <Modal
        visible={showManageSlot}
        backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onBackdropPress={() => {console.log('in backdrop press'); closeModal()}}
      >
	  	<Card style={styles.manageSlotsMainCard} disabled>
		  {/* Enhanced Header */}
		  <Layout style={styles.manageSlotsHeader}>
			<Layout style={styles.manageSlotsHeaderContent}>
			  <Layout style={styles.manageSlotsHeaderText}>
				<Text category='h5'>
				  {isEditingExisting ? 'Manage Slots' : 'Book Slots'}
				</Text>
				<Layout style={styles.manageSlotsHeaderDate}>
				  <CalendarIcon style={styles.manageSlotsCalendarIcon} />
				  <Text category='c1' style={styles.manageSlotsHeaderDateText}>
					{selectedSlotDate}
				  </Text>
				</Layout>
			  </Layout>
			  <TopNavigationAction
				icon={(props) => <CloseIcon {...props} style={styles.manageSlotsCloseIcon} />}
				onPress={closeModal}
				style={styles.manageSlotsCloseButton}
			  />
			</Layout>
		  </Layout>
		
		    <ScrollView 
			  style={styles.manageSlotsScrollView}
			  contentContainerStyle={styles.manageSlotsScrollContent}
			  keyboardShouldPersistTaps="handled"
			  showsVerticalScrollIndicator={true}
			  persistentScrollbar={true}
			>
		  {/* Regular Slots Section */}
		  <Card style={styles.manageSlotsRegularCard}>
			<Layout style={styles.manageSlotsSlotHeader}>
			  <Layout style={styles.manageSlotsSlotTitleContainer}>
				<Layout style={styles.manageSlotsRegularIndicator} />
				<Text category='s1' style={styles.manageSlotsRegularTitle}>
				  Regular Slots
				</Text>
			  </Layout>
			  <Layout style={styles.manageSlotsRegularBadge}>
				<Text category='c1' style={styles.manageSlotsBadgeText}>
				  {tempChanges.regular}
				</Text>
			  </Layout>
			</Layout>

			  <Layout style={styles.manageSlotsCounterContainer}>
				<Button
				  size='small'
				  appearance='outline'
				  status='danger'
				  accessoryLeft={MinusIcon}
				  onPress={() => adjustSlots('regular', -1)}
				  disabled={tempChanges.regular <= 0}
				  style={styles.manageSlotsCounterButton}
				/>
				<Layout style={styles.manageSlotsCountDisplay}>
				  <Text category='h6' style={styles.manageSlotsCountText}>
					{tempChanges.regular}
				  </Text>
				</Layout>
				<Button
				  size='small'
				  appearance='outline'
				  status='success'
				  accessoryLeft={PlusIcon}
				  onPress={() => adjustSlots('regular', 1)}
				  disabled={isQuantityDisabledManageSlots('regular') || selectedSlotDate < todayDate}
				  style={styles.manageSlotsCounterButton}
				/>
				{tempChanges.regular > 0 && (
					<Button
					  size='tiny'
					  appearance='ghost'
					  status='danger'
					  accessoryLeft={TrashIcon}
					  onPress={() => removeAllSlots('regular')}
					  style={styles.manageSlotsRemoveButton}
					>
					  Remove All
					</Button>
				)}
			  </Layout>
		  </Card>

		  {/* Express Slots Section */}
		  <Card style={styles.manageSlotsExpressCard}>
			<Layout style={styles.manageSlotsSlotHeader}>
			  <Layout style={styles.manageSlotsSlotTitleContainer}>
				<Layout style={styles.manageSlotsExpressIndicator} />
				<Text category='s1' style={styles.manageSlotsExpressTitle}>
				  Express Slots
				</Text>
			  </Layout>
			  <Layout style={styles.manageSlotsExpressBadge}>
				<Text category='c1' style={styles.manageSlotsBadgeText}>
				  {tempChanges.express}
				</Text>
			  </Layout>
			</Layout>

			  <Layout style={styles.manageSlotsCounterContainer}>
				<Button
				  size='small'
				  appearance='outline'
				  status='danger'
				  accessoryLeft={MinusIcon}
				  onPress={() => adjustSlots('express', -1)}
				  disabled={tempChanges.express <= 0}
				  style={styles.manageSlotsCounterButton}
				/>
				<Layout style={styles.manageSlotsCountDisplay}>
				  <Text category='h6' style={styles.manageSlotsCountText}>
					{tempChanges.express}
				  </Text>
				</Layout>
				<Button
				  size='small'
				  appearance='outline'
				  status='success'
				  accessoryLeft={PlusIcon}
				  onPress={() => adjustSlots('express', 1)}
				  disabled={isQuantityDisabledManageSlots('express') || selectedSlotDate < todayDate}
				  style={styles.manageSlotsCounterButton}
				/>
				{tempChanges.express > 0 && 
				  <Button
					size='tiny'
					appearance='ghost'
					status='danger'
					accessoryLeft={TrashIcon}
					onPress={() => removeAllSlots('express')}
					style={styles.manageSlotsRemoveButton}
				  >
					Remove All
				  </Button>
				}
			  </Layout>

			  {tempChanges.express > 0 && (
				  <Card style={styles.expressDurationCard}>
					<Text category='s2' style={styles.expressDurationTitle}>Express Duration</Text>
					<RadioGroup
					  selectedIndex={selectedIndex}
					  onChange={index => setSelectedIndex(index)}
					>
					  {expressOptions.map((option, index) => (
						<Radio key={index}>
						  <Text category='c1'>{option.label}</Text>
						</Radio>
					  ))}
					</RadioGroup>
				  </Card>
			  )}
		  </Card>

		  {/* Summary Section */}
		  <Card style={styles.manageSlotsSummaryCard}>
			<Layout style={styles.manageSlotsSummaryIconContainer}>
			  <ClockIcon style={styles.manageSlotsSummaryIcon} />
			  <Text category='s1' style={styles.manageSlotsSummaryTitle}>
				Total Slots
			  </Text>
			</Layout>
			
			<Text category='h4' style={styles.manageSlotsSummaryCount}>
			  {tempChanges.total}
			</Text>
			
			<Layout style={styles.manageSlotsSummaryBreakdown}>
			  <Layout style={styles.manageSlotsSummaryItem}>
				<Layout style={styles.manageSlotsRegularDot} />
				<Text category='c1' style={styles.manageSlotsSummaryText}>
				  Regular: {tempChanges.regular}
				</Text>
			  </Layout>
			  
			  <Layout style={styles.manageSlotsSummaryItem}>
				<Layout style={styles.manageSlotsExpressDot} />
				<Text category='c1' style={styles.manageSlotsSummaryText}>
				  Express: {tempChanges.express}
				</Text>
			  </Layout>
			</Layout>
			
			{tempChanges.express > 0 && (
			  <Layout style={styles.manageSlotsSummaryItem}>
				<Text category='c1' style={styles.manageSlotsSummaryText}>
				  Express Duration: {expressOptions[selectedIndex]?.label}
				</Text>
			  </Layout>
			)}
		  </Card>

		  {/* Existing Orders Section */}
		  {(getSlotCount(parseInt(selectedSlotDate?.split('-')[2])).total > 0 || ordersForDate?.length > 0 || Object.keys(currentOrderData).length > 0) && (
			<Card style={styles.existingOrdersCard}>
			  <Text category='h6' style={styles.existingOrdersTitle}>Existing Orders</Text>
			  <Divider style={styles.existingOrdersDivider} />
			  	{ordersForDate?.map((order, index) => renderOrderItem({ item: order, index }))}
				{currentOrderData && renderCurrentOrderItem(currentOrderData)}
			</Card>
		  )}

		  {/* Info Card */}
		  <Card style={styles.infoCard}>
			<Text category='c2' appearance='hint'>
			  Regular slots: {maxRegularSlots} per day | Express slots: {maxExpressSlots} per day
			</Text>
		  </Card>
		</ScrollView>

		  {/* Action Buttons */}
		  <Layout style={styles.manageSlotsActionContainer}>
			<Button
			  style={styles.manageSlotsBackButton}
			  size='small'
			  appearance='outline'
			  onPress={closeModal}
			>
			  {(evaProps) => (
				<Text {...evaProps} style={styles.manageSlotsBackButtonText}>
				  Cancel
				</Text>
			  )}
			</Button>
			
			<Button
			  style={styles.manageSlotsSaveButton}
			  size='small'
			  onPress={() => {
				console.log(tempChanges);
				saveEditedChanges();
				closeModal();
				Alert.alert('Success', `Slots ${isEditingExisting ? 'updated' : 'booked'} successfully!`);
			  }}
			>
			  {(evaProps) => (
				<Text {...evaProps} style={styles.manageSlotsSaveButtonText}>
				  {isEditingExisting ? 'Save Changes' : 'Book Slots'}
				</Text>
			  )}
			</Button>
		  </Layout> 
		</Card>
      </Modal>
	  
	  <MoveOrderModal showMoveOrder={showMoveOrder}
		  orderToMove={orderToMove}
		  closeModal={closeModal}
		  getDaysInMonth={getDaysInMonth}
		  getSlotCount={getSlotCount}
		  isSlotFull={isSlotFull}
		  formatDate={formatDate}
		  selectedSlotDate={selectedSlotDate}
		  moveOrderToDate={moveOrderToDate}
		/>

      <Modal
        visible={showDeliveryOptions}
        backdropStyle={styles.backdrop}
        onBackdropPress={closeModal}
      >
        <Card style={styles.modal}>
          <Layout style={styles.modalHeader}>
            <Text category='h6'>Express Delivery Options</Text>
            <TopNavigationAction icon={CloseIcon} onPress={closeModal} />
          </Layout>

          <ScrollView style={styles.modalContent}>
            {expressOptions.map((option, index) => (
              <Card
                key={index}
                style={[styles.expressOption, { backgroundColor: '#FED7AA' }]}
                onPress={() => selectExpressOption(option)}
              >
                <Layout style={styles.expressOptionContent}>
                  <Layout>
                    <Text category='s1'>{option.label} Delivery</Text>
                    <Text category='c1' appearance='hint'>Express charges apply</Text>
                  </Layout>
                  <Layout style={styles.expressOptionRight}>
                    <Text category='s1' style={{ color: '#EA580C' }}>{option.price}</Text>
                    <Icon style={styles.arrowIcon} fill='#9CA3AF' name='arrow-forward' />
                  </Layout>
                </Layout>
              </Card>
            ))}
          </ScrollView>
        </Card>
      </Modal>
	  
	  <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSave={handleSaveSettings}
        initialRegularSlots={maxRegularSlots}
        initialExpressSlots={maxExpressSlots}
      />
	  </>
	)}
    </Layout>
  );
};

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#7C3AED',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  calendarCard: {
    margin: 0,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  calendarGrid: {
    width: '100%',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
	padding: 1,  
	marginLeft: 5
  },
  dayCell: {
	  width: `${100/7.5}%`,
		height: 80,
		padding: 2,
		margin: 1
	},
	dayCellContent: {
	  flex: 1,
	  width: '100%',
	  padding: 8,
	  marginLeft: 10
	},
  dayContainer: {
    width: width / 10 - 2,
    aspectRatio: 1, 
    margin: 3,
    borderRadius: (width / 10 - 2)/2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
	marginBottom: 10
  },
  emptyDay: {
    backgroundColor: '#ccc',
  },
  availableDay: {
    backgroundColor: '#D1FAE5',
  },
  bookedDay: {
    backgroundColor: '#DBEAFE',
  },
  fullDay: {
    backgroundColor: '#FEE2E2',
  },
  selectedDay: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
    borderWidth: 2,
  },
  expressSelectedDay: {
    backgroundColor: '#FED7AA',
    borderColor: '#EA580C',
    borderWidth: 2,
  },
  slotBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    minHeight: 16,
    minWidth: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  expressIndicator: {
    position: 'absolute',
    top: -2,
    right: 5,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    padding: 2,
  },
  expressIcon: {
    width: 8,
    height: 8
  },
  legendCard: {
    margin: 16,
    marginTop: 0,
  },
  legendTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendIcon: {
    width: 20,
    height: 20,
    marginRight: -4,
  },
  legendText: {
    flex: 1,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
  },
  statusCard: {
    padding: 12,
    borderRadius: 8,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '95%',
    maxHeight: '100%',
	marginLeft: 10
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalContent: {
    maxHeight: 300,
  },
  modalDivider: {
    marginVertical: 8,
  },
  modalButton: {
    marginTop: 8,
  },
  orderCard: {
    marginBottom: 12,
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontWeight: 'bold',
  },
  orderActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deliveryOption: {
    marginBottom: 12,
    flexDirection: 'row',
	gap: 10
  },
  infoCard: {
    backgroundColor: '#F3F4F6'
  },
  quantityContent: {
    alignItems: 'center',
    padding: 16,
  },
  quantityLabel: {
    textAlign: 'center',
    marginBottom: 24,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  quantityDisplay: {
    width: 80,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  quantityText: {
	padding: 0
  },
  pricingCard: {
    padding: 16,
    marginBottom: 24,
    borderRadius: 8,
  },
  pricingTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pricingList: {
    gap: 4,
	backgroundColor: 'transparent'
  },
  confirmButton: {
    paddingVertical: 12,
    width: '100%',
  },
  expressOption: {
    marginBottom: 12,
    padding: 16,
  },
  expressOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expressOptionRight: {
    alignItems: 'flex-end',
  },
  arrowIcon: {
    width: 16,
    height: 16,
    marginTop: 4,
  },
  textBorder: {
	  borderWidth: 1,
      borderColor: '#ccc',
      padding: 4,
	  paddingLeft: 6,
	  marginBottom: 5,
      borderRadius: 12,
	  color: 'white'
  },
  tickIndicator: {
	  position: 'absolute',
	  top: -5,
	  right: 5,
	  width: 16,
	  height: 16,
	  borderRadius: 8,
	  backgroundColor: '#10B981',
	  alignItems: 'center',
	  justifyContent: 'center',
	},
	tickIcon: {
	  width: 15,
	  height: 15,
	},
	saveButton: {
		marginVertical: 10,
		marginHorizontal: 100
	},
	manageSlotsScrollView: {
	  marginTop: 10,
	  height: 450
	},

	manageSlotsScrollContent: {
	  paddingBottom: 20
	},

	manageSlotsMainCard: {
		width: '95%',
		borderRadius: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 15,
		marginLeft: 10,
		alignSelf: 'center', 
	  },

	  // Header Styles
	  manageSlotsHeader: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingBottom: 16
	  },
	  manageSlotsHeaderContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: 'transparent',
		marginTop: 5,
		marginBottom: -5
	  },
	  manageSlotsHeaderText: {
		backgroundColor: 'transparent',
	  },
	  manageSlotsHeaderDate: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'transparent',
		marginTop: 4,
	  },
	  manageSlotsCalendarIcon: {
		width: 14,
		height: 14,
		tintColor: '#C7D2FE',
	  },
	  manageSlotsHeaderDateText: {
		marginLeft: 6,
	  },
	  manageSlotsCloseButton: {
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		borderRadius: 20,
	  },
	  manageSlotsCloseIcon: {
		tintColor: '#FFFFFF',
		width: 24, 
		height: 24
	  },

	  // Regular Slots Styles
	  manageSlotsRegularCard: {
		backgroundColor: '#EFF6FF',
		borderColor: '#DBEAFE',
		borderWidth: 1,
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: '#3B82F6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	  },
	  manageSlotsRegularIndicator: {
		width: 12,
		height: 12,
		backgroundColor: '#3B82F6',
		borderRadius: 6,
		marginRight: 8,
	  },
	  manageSlotsRegularTitle: {
		color: '#1E40AF',
		fontWeight: '600',
	  },
	  manageSlotsRegularBadge: {
		backgroundColor: '#3B82F6',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 4,
	  },
	  manageSlotsRegularDot: {
		width: 8,
		height: 8,
		backgroundColor: '#3B82F6',
		borderRadius: 4,
		marginRight: 4,
	  },

	  // Express Slots Styles
	  manageSlotsExpressCard: {
		backgroundColor: '#FFF7ED',
		borderColor: '#FED7AA',
		borderWidth: 1,
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: '#F97316',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	  },
	  manageSlotsExpressIndicator: {
		width: 12,
		height: 12,
		backgroundColor: '#F97316',
		borderRadius: 6,
		marginRight: 8,
	  },
	  manageSlotsExpressTitle: {
		color: '#C2410C',
		fontWeight: '600',
	  },
	  manageSlotsExpressBadge: {
		backgroundColor: '#F97316',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 4,
	  },
	  manageSlotsExpressDot: {
		width: 8,
		height: 8,
		backgroundColor: '#F97316',
		borderRadius: 4,
		marginRight: 4,
	  },

	  // Express Duration Card
	  expressDurationCard: {
		backgroundColor: '#FFF7ED',
		borderColor: '#FED7AA',
		borderWidth: 1,
		borderRadius: 12,
		marginTop: 10
	  },
	  expressDurationTitle: {
		color: '#C2410C',
		fontWeight: '600',
		marginBottom: 8,
	  },

	  // Common Slot Styles
	  manageSlotsSlotHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		backgroundColor: 'transparent',
	  },
	  manageSlotsSlotTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'transparent',
	  },
	  manageSlotsBadgeText: {
		color: '#FFFFFF',
		fontWeight: 'bold',
	  },
	  manageSlotsCounterContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'transparent',
		gap: 10,
	  },
	  manageSlotsCounterButton: {
		borderRadius: 12,
		width: 40,
		height: 40,
	  },
	  manageSlotsCountDisplay: {
		minWidth: 40,
		alignItems: 'center',
		backgroundColor: 'transparent',
	  },
	  manageSlotsCountText: {
		color: '#1F2937',
		fontWeight: 'bold',
	  },
	  manageSlotsRemoveButton: {
		borderRadius: 8,
		paddingHorizontal: 12,
		alignSelf: 'center',
	  },

	  // Summary Card Styles
	  manageSlotsSummaryCard: {
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 16,
		marginBottom: 10,
	  },
	  manageSlotsSummaryIconContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		backgroundColor: 'transparent',
	  },
	  manageSlotsSummaryIcon: {
		width: 16,
		height: 16,
		tintColor: '#64748B',
		marginRight: 6,
	  },
	  manageSlotsSummaryTitle: {
		color: '#475569',
		fontWeight: '600',
	  },
	  manageSlotsSummaryCount: {
		color: '#1E293B',
		fontWeight: 'bold',
		marginBottom: 8,
	  },
	  manageSlotsSummaryBreakdown: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'transparent',
	  },
	  manageSlotsSummaryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 8,
		backgroundColor: 'transparent',
	  },
	  manageSlotsSummaryText: {
		color: '#64748B',
	  },

	  // Existing Orders Styles
	  existingOrdersCard: {
		backgroundColor: '#FAFBFC',
		borderColor: '#E5E7EB',
		borderWidth: 1,
		borderRadius: 16,
		marginBottom: 16
	  },
	  existingOrdersTitle: {
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	  },
	  existingOrdersDivider: {
		backgroundColor: '#E5E7EB',
		marginBottom: 12,
	  },
	  existingOrdersScrollView: {
		maxHeight: 150,
	  },

	  // Action Buttons
	  manageSlotsActionContainer: {
		flexDirection: 'row',
		marginTop: -10,
		marginBottom: 10,
		backgroundColor: 'transparent',
	  },
	  manageSlotsBackButton: {
		flex: 1,
		marginRight: 8,
		borderRadius: 12,
		borderColor: '#E5E7EB',
		borderWidth: 2,
	  },
	  manageSlotsBackButtonText: {
		color: '#374151',
		fontWeight: '500',
	  },
	  manageSlotsSaveButton: {
		flex: 1,
		marginLeft: 8,
		borderRadius: 12
	  },
	  manageSlotsSaveButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
	  },
	  dayNumberContainer: {
		alignSelf: 'flex-start',
		marginBottom: 4,
	  },
	  dayNumber: {
		fontSize: 14,
		fontWeight: '400',
		textAlign: 'center',
	  },
	slotIndicatorContainer: {
	  position: 'absolute',
	  bottom: 10,
	  right: 12,
	  flexDirection: 'row',
	  alignItems: 'center'
	},

	slotIndicator: {
	  minWidth: 20,
	  height: 20,
	  borderRadius: 6,
	  justifyContent: 'center',
	  alignItems: 'center',
	  paddingHorizontal: 4,
	  backgroundColor: '#2563EB',
	  marginRight: 4,
	},

	slotIndicator1: {
	  minWidth: 20,
	  height: 20,
	  borderRadius: 6,
	  justifyContent: 'center',
	  alignItems: 'center',
	  paddingHorizontal: 4,
	  backgroundColor: '#EA580C',
	},

	  slotText: {
		fontSize: 10,
		fontWeight: '600',
		color: 'white'
	  },
	  weekHeadersContainer: {
		flexDirection: 'row',
		marginBottom: 4,
	  },
	  
	  weekHeaderCell: {
		flex: 1,
		alignItems: 'center',
		padding: 4,
	  },
	  weekHeaderText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6B7280',
	  },
	navButton: {
	  marginLeft: 20
    },
	roundedButton: {
		marginTop: 5,
		marginLeft: -5,
		  borderRadius: 12,
		  backgroundColor: '#DBEAFE',   // light blue, for example
		  paddingVertical: 4,
		  paddingHorizontal: 8,
		  alignSelf: 'flex-start',      
	  },
	  roundedButtonExpress: {
		marginTop: 5,
		marginLeft: -5,
		  borderRadius: 12,
		  backgroundColor: '#FFD9C2',   // light blue, for example
		  paddingVertical: 4,
		  paddingHorizontal: 8,
		  alignSelf: 'flex-start',      
	  },
	  buttonContainer: {
		flexDirection: 'row',
		gap: 10
	  }
});

export default SlotBookingScreen;