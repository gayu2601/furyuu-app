import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Alert, StyleSheet, TouchableOpacity, View, Image, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Animated } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useReadOrderItems } from '../main/ReadOrderItemsContext';
import ListOrderItem from './ListOrderItem';
import ClothingModal from './ClothingModal';
import { Input, List, ListItem, Card, Text, Layout, Autocomplete, AutocompleteItem, Button, Icon, Modal, Spinner, StyleService, useStyleSheet, Divider, TopNavigationAction, RangeCalendar } from '@ui-kitten/components';
import IconMaterial from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../../constants/supabase'
import { useShareIntentContext } from "expo-share-intent";
import { useNetwork } from './NetworkContext';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import moment from 'moment';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 50;
const INITIAL_SIZE = 50;

// Memoized icons
const CalendarIcon = React.memo((props) => <Icon {...props} name='calendar-outline'/>);
const CloseIcon = React.memo((props) => <Icon {...props} name='close-outline'/>);
const MemoizedListOrderItem = React.memo(ListOrderItem);
// Memoized components
const CustomDivider = React.memo(() => {
  return <Divider style={styles.divider}/>;
});

const LoadingSpinner = React.memo(() => (
  <Layout style={styles.spinnerContainer} level="1">
    <Spinner size="giant"/>
  </Layout>
));

const CalendarModal = React.memo(({ visible, onClose, value, onSelect, onDateChange, onReset }) => {
  const renderCalendarFooter = () => (
    <View style={styles.footerContainer}>
      <Button 
        size="small" 
        status="danger"
        appearance="outline"
        style={styles.footerButton}
        onPress={onReset}>
        Reset
      </Button>
      <Button 
        size="small"
        style={styles.footerButton}
        onPress={onSelect}>
        Select Range
      </Button>
    </View>
  );

  return (
	<Modal
        visible={visible}
        backdropStyle={styles.backdrop}
        onBackdropPress={onClose}>
        <Card disabled={true}>
			<TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
				<Icon name="close-outline" style={styles.modalCloseIcon} />
			</TouchableOpacity>
          <Text category="h6" style={styles.title}>Select Date Range</Text>
          <RangeCalendar
            range={value}
            onSelect={onDateChange}
            renderFooter={renderCalendarFooter}
			min={new Date(1900, 0, 0)}
			max={new Date(2050, 0, 0)}
          />
        </Card>
      </Modal>
	);
});

const LoadingOverlay = ({ visible }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.spinnerDates}>
      <Spinner size="large" status="primary" />
    </View>
  );
};

export default function ShareIntentScreenTailor() {
    const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntentContext();
	const navigation = useNavigation();
	const { isConnected } = useNetwork();
	const [loading, setLoading] = useState(true)
	const [refresh, setRefresh] = useState(false)
	const [loadDates, setLoadDates] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
	const [range, setRange] = useState({});
	const [isDateChanged, setIsDateChanged] = useState(false);
	const [offset, setOffset] = useState(0);
	const { readOrdersGlobal, getOrders, dispatch, getFilters, hasMoreOrders } = useReadOrderItems();
	const [imageURIs, setImageURIs] = useState({});
	let orderType='Completed';
	const orders = getOrders('Completed_false');
	const fils = getFilters();
	
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	
  const resetRange = () => {
	if(isDateChanged) {
		setLoadDates(true);
		setDatePickerVisible(false);
		setRange({});
		setIsDateChanged(false);
		let today = moment().format('YYYY-MM-DD');
		console.log(today)
		queueMicrotask(() => {
			readOrdersGlobal(null, orderType, false, false, null, null, INITIAL_SIZE)
			  .then(() => {
				dispatch({
					type: 'UPDATE_DATE_FILTERS',
					startDate: today,
					endDate: today
				});
				setLoadDates(false);
				setDatePickerVisible(false);
			  })
			  .catch((error) => {
				console.error(error);
				setLoadDates(false);
				setDatePickerVisible(false);
			});
			setOffset(INITIAL_SIZE);
		});
	}
  };
  
  const onDateChange = (nextRange) => {
	console.log(nextRange);
    setRange(nextRange);
  }
  
  const onConfirmDatePicker = () => {
	setDatePickerVisible(false);
	if(range.startDate && range.endDate) {
		setLoadDates(true);
		setIsDateChanged(true);
		const formattedStartDate = moment(range.startDate).format('YYYY-MM-DD')
		const formattedEndDate = moment(range.endDate).format('YYYY-MM-DD')
		console.log(formattedStartDate)
		console.log(formattedEndDate)
		queueMicrotask(() => {
			readOrdersGlobal(null, orderType, false, true, formattedStartDate, formattedEndDate, INITIAL_SIZE)
			  .then(() => {
				dispatch({
					type: 'UPDATE_DATE_FILTERS',
					startDate: formattedStartDate,
					endDate: formattedEndDate
				});
				setLoadDates(false);
				setDatePickerVisible(false);
			  })
			  .catch((error) => {
				console.error(error);
				setLoadDates(false);
				setDatePickerVisible(false);
			});
			setOffset(INITIAL_SIZE);
		});
	}
  };

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    setIsDateChanged(false);
	setRange({ startDate: undefined, endDate: undefined })
	setSelectedIndex(0)
	dispatch({
        type: 'RESET_FILTERS'
    });
    // Use microtask for data fetching
    queueMicrotask(() => {        
		readOrdersGlobal(null, orderType, false, false, null, null, INITIAL_SIZE)
		setOffset(INITIAL_SIZE);
    });
    setRefresh(false);
  }, []);

  const renderItem = useCallback(({ item, index }) => {
    const firstValue = getFirstImage(item.dressPics);
    return (
      <MemoizedListOrderItem 
        style={styles.item}
        index={index}
        imageUri={firstValue}
        defaultSource={require('../../../assets/img_na.png')}
        item={item}
        orderType={orderType}
        userType="tailor"
		isShareIntent={true}
		handleItemPress={handleItemPress}
      />
    );
  }, [orderType]);

    const getFirstImage = (dressPics) => {
		if (!dressPics || !Array.isArray(dressPics)) return null;
		const firstNonEmptyArray = dressPics.find(dp => Array.isArray(dp) && dp.length > 0);
		return firstNonEmptyArray?.[0] || null;
	};

  const ListEmptyComponent = useCallback(() => (
    <Layout style={styles.emptyContainer} level="1">
      <Text category="h6">
        No {orderType === 'Created' ? 'New' : orderType === 'InProgress' ? 'Ongoing' : orderType} orders found
      </Text>
    </Layout>
  ), [orderType]);

  const ListFooterComponent = useCallback(() => (
    !hasMoreOrders && orders.length > 0 ? (
      <Text category="s1" style={styles.footerText}>
        No more orders
      </Text>
    ) : null
  ), [hasMoreOrders, orders.length]);

  // Initial load effect
  useEffect(() => {
    if (!isConnected) {
      showErrorMessage("No Internet Connection");
      return;
    }

    const initialLoad = async () => {
      dispatch({
			type: 'RESET_FILTERS'
		});
		// Use microtask for data fetching
		queueMicrotask(() => {        
			readOrdersGlobal(null, orderType, false, false, null, null, INITIAL_SIZE)
			setOffset(INITIAL_SIZE);
		});
      setLoading(false);
    };

    initialLoad();
  }, []);
	
	const loadMoreOrders = useCallback(async () => {
		if (loading || !hasMoreOrders) return;
		setLoading(true);
		queueMicrotask(() => {        
			readOrdersGlobal(
			  null,
			  orderType,
			  false,
			  false,
			  null,
			  null,
			  offset,
			  PAGE_SIZE
			);
			setOffset(prev => prev + PAGE_SIZE);
		});
		setLoading(false);
	  }, [hasMoreOrders, orderType, offset]);

	const handleItemPress = (index) => {
		console.log('in handleItemPress: ' + index)
		setSelectedIndex(index);
		setModalVisible(true);
	  };

	if (loading) {
		return <LoadingSpinner />;
	  }

  const renderCalendarAction = () => (
    <TopNavigationAction icon={CalendarIcon} onPress={() => setDatePickerVisible(true)}/>
  );
  
  return (
    <Layout style={styles.container} level="1">
      <Layout style={styles.headerButtons} level="1">
        <View style={styles.actionButtons}>
          {renderCalendarAction()}
		</View>
      </Layout>

      <List
        data={orders}
        renderItem={renderItem}
        style={styles.list}
		windowSize={3} 
		  maxToRenderPerBatch={5}
		  initialNumToRender={8}
		  updateCellsBatchingPeriod={50}
		  removeClippedSubviews={true}
        ItemSeparatorComponent={Divider}
		refreshing={refresh}
        onRefresh={onRefresh}
		onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.7}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
      />
	  
	  <CalendarModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        value={range}
        onSelect={onConfirmDatePicker}
		onDateChange={onDateChange}
		onReset={resetRange}
      />
	  
	  <LoadingOverlay visible={loadDates} />
						
			<ClothingModal 
			  visible={modalVisible}
			  onClose={() => setModalVisible(false)}
			  supabase={supabase} // Your Supabase instance
			  orders={orders} // Your orders array
			  userType='tailor'
			  selectedIndex={selectedIndex} // Current selected order index
			  navigation={navigation} // Navigation prop
			  shareIntent={shareIntent} // Share intent data
			/>
			
		</Layout>
    )
}
	
const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
	alignItems: 'center',
    marginTop: 16,
  },
  item: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    textAlign: 'center',
    padding: 16,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    marginBottom: 16,
  },
  radioGroup: {
    marginBottom: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 8,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
	flexDirection: 'row',
	marginLeft: -15
  },
  list: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalCard: {
    width: WIDTH - 20,
	alignSelf: 'center', 
	flexShrink: 1 
  },
  image: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  footerButton: {
    marginLeft: 8,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 4,
    padding: 4,
    paddingLeft: 12,
    width: '100%',
    marginBottom: 16,
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
  spinnerDates: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999, // Very high z-index to appear above all modals
    }
})