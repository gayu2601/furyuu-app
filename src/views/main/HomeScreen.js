import React, { useState, useEffect, useCallback, useMemo, memo, forwardRef, useImperativeHandle } from 'react';
import { Alert, View, ScrollView, Image, StyleSheet, TouchableOpacity, Dimensions, BackHandler, ActivityIndicator, Modal as ModalRN } from 'react-native';
import { 
  Layout,
  TopNavigation,
  TopNavigationAction,
  Icon,
  Text,
  Button,
  Input,
  Tab,
  TabBar,
  Card,
  List,
  Divider,
  Spinner, useTheme, Modal, RadioGroup, Radio, RangeCalendar
} from '@ui-kitten/components';
import { useNavigation, useRoute } from "@react-navigation/native";
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import { useReadOrderItems } from '../main/ReadOrderItemsContext';
import { usePubSub } from './SimplePubSub';
import { storage } from '../extra/storage';
import ListOrderItem from './ListOrderItem';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { DatePickerModal } from 'react-native-paper-dates';
import { enGB, registerTranslation } from 'react-native-paper-dates';
import { supabase } from '../../constants/supabase';
import XLSX from "xlsx";
import * as FileSystem from 'expo-file-system';
import moment from 'moment';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import eventEmitter from './eventEmitter';
import { StorageAccessFramework } from 'expo-file-system';
import { schedulePushNotification } from './notificationUtils';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 50;
const INITIAL_SIZE = 50;

const FilterIcon = (props) => {
	const theme = useTheme();
	return(
		<Icon {...props} name='options-2-outline' fill={theme['color-primary-500']} style={[props.style, styles.filterIcon]}/>
	)
};
const CalendarIcon = (props) => {
	const theme = useTheme();
	return(
		<Icon {...props} name='calendar-outline' fill={theme['color-primary-500']} style={[props.style, styles.calendarIcon]}/>
	)
};

const RefreshIcon = (props) => {
	const theme = useTheme();
	return(
		<Icon {...props} name='refresh-outline' fill={theme['color-primary-500']} style={[props.style, styles.calendarIcon]}/>
	)
};
const SearchIcon = memo((props) => <Icon {...props} name='search'/>);
const CloseIcon = memo((props) => <Icon {...props} name='close-outline'/>);
const MemoizedListOrderItem = memo(ListOrderItem);

const SearchBar = memo(({ value, onChangeText, onClear }) => {
  const renderCloseIcon = useCallback((props) => (
    <TouchableOpacity onPress={onClear}>
      <CloseIcon {...props}/>
    </TouchableOpacity>
  ), [onClear]);

  return (
    <Input
      placeholder="Search by customer name"
      value={value}
      onChangeText={onChangeText}
      accessoryLeft={SearchIcon}
      accessoryRight={value ? renderCloseIcon : null}
      size="large"
	  style={styles.searchBar}
    />
  );
});

const CalendarModal = memo(({ visible, onClose, value, onSelect, onDateChange, onReset }) => {
	const renderCalendarFooter = () => (
    <View style={styles.footerContainer}>
      <Button 
        size="small" 
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

const FilterModal = memo(({ visible, onClose, selectedIndex, onIndexChange, onApply }) => {
  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={onClose}
	  style={styles.fullScreenModal}
    >
      <Card disabled style={{width: 300}}>
        <Text category="h6" style={styles.modalTitle}>Show Orders for</Text>
        <RadioGroup
          selectedIndex={selectedIndex}
          onChange={onIndexChange}
          style={styles.radioGroup}
        >
          <Radio>All</Radio>
          <Radio>Customer</Radio>
          <Radio>Other Tailors</Radio>
        </RadioGroup>
        <Layout style={styles.buttonGroup} level="1">
          <Button
            style={styles.modalButton}
            onPress={onApply}
            size="small"
          >
            Apply
          </Button>
          <Button
            style={styles.modalButton}
            appearance="outline"
            onPress={onClose}
            size="small"
          >
            Cancel
          </Button>
        </Layout>
      </Card>
    </Modal>
  );
});

const DownloadModal = memo(({ visible, onClose, onApply }) => {
  return (
    <Modal visible={visible} backdropStyle={styles.backdrop} onBackdropPress={onClose}>
				  <View style={styles.modalContentModal}>
					<Text style={styles.modalText}>Apply existing 'date', 'search' and 'orders from' filters to download report?</Text>
					<View style={styles.buttonContainerModal}>
					  <Button appearance="filled" onPress={onApply}>
						OK
					  </Button>
					  <Button appearance="outline" onPress={onClose}>
						Cancel
					  </Button>
				  </View>
				</View>
	</Modal>
)});

const HomeScreen = forwardRef(( props, ref ) => {
  registerTranslation('en', enGB);
  const { orderType, custName } = props;
  const navigation = useNavigation();
  const { currentUser, getNewDeviceLogin, updateNewDeviceLogin, newDeviceLogin, profileCompleted } = useUser();
  const { isConnected } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [loadExcel, setLoadExcel] = useState(false);
  const [loadDates, setLoadDates] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [excelDateModalVisible, setExcelDateModalVisible] = useState(false)
  const [isDateChanged, setIsDateChanged] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [isDownload, setIsDownload] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const { readOrdersGlobal, getOrders, dispatch, getFilters, hasMoreOrders, fetchOrdersFromDB } = useReadOrderItems();
  const orders = getOrders(orderType);
  const fils = getFilters();
  const theme = useTheme();
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [range, setRange] = useState({});
  const [range1, setRange1] = useState({});
  const { notify, updateCache, eligible } = usePubSub();
const isNewDeviceLogin = useMemo(() => getNewDeviceLogin(), [getNewDeviceLogin]);

  // Memoized values and callbacks
  const filterParams = useMemo(() => ({
    searchQuery: fils.searchQuery || '',
    orderType,
    isDateChanged: fils.isDateChanged,
    startDate: fils.startDate,
    endDate: fils.endDate,
    userType: 'tailor',
  }), [fils.searchQuery, orderType, fils.isDateChanged, fils.startDate, fils.endDate]);

  useImperativeHandle(ref, () => ({
    onRefresh
  }));
  
  
  const resetRange = () => {
	if(isDateChanged) {
		setLoadDates(true);
		setDatePickerVisible(false);
		setRange({});
		setIsDateChanged(false);
		let today = moment().format('YYYY-MM-DD');
		console.log(today)
		queueMicrotask(() => {
			readOrdersGlobal('', orderType, false, today, today, 'tailor', 0, INITIAL_SIZE, null, true)
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
			readOrdersGlobal(searchQuery, orderType, true, formattedStartDate, formattedEndDate, 'tailor', 0, INITIAL_SIZE)
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
  
  const resetRange1 = () => {
		setExcelDateModalVisible(false);
		setRange1({});
  };
  
  const onDateChange1 = (nextRange) => {
	console.log(nextRange);
    setRange1(nextRange);
  }
  
  const onConfirmDatePicker1 = () => {
	setExcelDateModalVisible(false);
	const formattedStartDate = moment(range1.startDate).format('YYYY-MM-DD')
	const formattedEndDate = moment(range1.endDate).format('YYYY-MM-DD')
	exportToExcel(formattedStartDate, formattedEndDate)
  };

  const onSearchChange = useCallback((query) => {
	setSearchQuery(query);
    dispatch({
        type: 'UPDATE_SEARCH_FILTER',
        query: query
    });
    // Use microtask for data fetching
    queueMicrotask(() => {
        readOrdersGlobal(query, orderType, fils.isDateChanged, fils.startDate, fils.endDate, 'tailor', 0, INITIAL_SIZE);
		setOffset(INITIAL_SIZE);
    });
  }, [orderType, fils.isDateChanged, fils.startDate, fils.endDate]);

  const onClearSearch = useCallback(() => {
    setSearchQuery('');
	dispatch({
        type: 'UPDATE_SEARCH_FILTER',
        query: ''
    });
	console.log(fils);
    // Use microtask for data fetching
    queueMicrotask(() => {
        readOrdersGlobal('', orderType, fils.isDateChanged, fils.startDate, fils.endDate, 'tailor', 0, INITIAL_SIZE);
		setOffset(INITIAL_SIZE);
    });
  }, [orderType, fils.isDateChanged, fils.startDate, fils.endDate]);
  
  const onRefresh = async (syncWithDb = false) => {
	console.log('in onRefresh' + syncWithDb)
    setRefresh(true);
    setIsDateChanged(false);
	setSearchQuery('')
	setRange({ startDate: undefined, endDate: undefined })
	setSelectedIndex(0)
	dispatch({
        type: 'RESET_FILTERS'
    });
	if(syncWithDb) {
		queueMicrotask(() => {
		  Promise.all([
			readOrdersGlobal('', 'Created', false, new Date(), new Date(), 'tailor', 0, INITIAL_SIZE, null, true),
			readOrdersGlobal('', 'InProgress', false, new Date(), new Date(), 'tailor', 0, INITIAL_SIZE, null, true),
			readOrdersGlobal('', 'Completed', false, new Date(), new Date(), 'tailor', 0, INITIAL_SIZE, null, true)
		  ]);
		  setOffset(INITIAL_SIZE);
		});
	} else {
		queueMicrotask(() => {        
			readOrdersGlobal('', orderType, false, new Date(), new Date(), 'tailor', 0, INITIAL_SIZE, null, true)
			setOffset(INITIAL_SIZE);
		});
	}
    setRefresh(false);
  }

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
		changeOrderStatus={changeOrderStatus}
        workStarted={false}
		onCheckedChange={onCheckedChange}
		handleDeleteOrder={handleDeleteOrder}
      />
    );
  }, [orderType, changeOrderStatus, onCheckedChange]);

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
      const query = custName || '';
      setSearchQuery(query);
	  dispatch({
			type: 'UPDATE_ALL',
			isDateChanged: false,
			startDate: new Date(),
			endDate: new Date(),
			query: query
		});
		console.log('isnewDeviceLogin: ' + isNewDeviceLogin)
		// Use microtask for data fetching
		queueMicrotask(() => {        
			readOrdersGlobal(query, orderType, false, new Date(), new Date(), 'tailor', 0, INITIAL_SIZE, null, isNewDeviceLogin)
			setOffset(INITIAL_SIZE);
		});
		if(newDeviceLogin) {
			updateNewDeviceLogin(false);
		}
      setLoading(false);
    };

	eventEmitter.on('newOrderAdded', initialLoad);

    initialLoad();
  }, []);
  
  useEffect(() => {
	  const backAction = () => {
		  if (custName) {
			navigation.navigate('Dashboard', {screen: 'AnalyticsScreen'});
			return true; // Prevent default back behavior
		  } else {
			navigation.navigate('HomeMain', {screen: 'HomeNew'})
			return true;
		  }
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);
		
		return () => backHandler.remove();
  }, [])
  
  const loadMoreOrders = useCallback(async () => {
    if (loading || !hasMoreOrders) return;
    setLoading(true);
	queueMicrotask(() => {        
		readOrdersGlobal(
		  fils.searchQuery,
		  orderType,
		  fils.isDateChanged,
		  fils.startDate,
		  fils.endDate,
		  'tailor',
		  offset,
		  PAGE_SIZE
		);
		setOffset(prev => prev + PAGE_SIZE);
	});
    setLoading(false);
  }, [hasMoreOrders, fils, orderType, offset]);

  const batchUpdateStorage = (updates) => {
	  console.log(updates)
	  updates.forEach(({ key, value }) => {
		storage.set(key, JSON.stringify(value));
	  });
	};

	// Optimized moveOrderBetweenArrays
	const moveOrderBetweenArrays = async (keyPrefix, orderNo, fromStatus, toStatus, updObj) => {
	  // Read both arrays at once
	  const sourceKey = `${keyPrefix}_${fromStatus}`;
	  const targetKey = `${keyPrefix}_${toStatus}`;
	  let sourceArray = JSON.parse(storage.getString(sourceKey) || '[]');
	  const targetArray = JSON.parse(storage.getString(targetKey) || '[]');
	  
	  let itemToMove = null;
  
	  // Filter out and capture the target item in a single pass
	  sourceArray = sourceArray.filter(item => {
		if (item.orderNo === orderNo) {
		  itemToMove = item;
		  return false;
		}
		return true;
	  });
	  console.log(sourceArray)
	  console.log('itemToMove:')
	  console.log(itemToMove);
	  
	  // Exit if no item found
	  if (!itemToMove) return;

	  const updatedObject = { ...itemToMove, ...updObj };
	  console.log(updatedObject)
	  /*targetArray.length > 0 ? targetArray.unshift(updatedObject) : targetArray.push(updatedObject);
	  
	  batchUpdateStorage([
		{ key: sourceKey, value: sourceArray },
		{ key: targetKey, value: targetArray }
	  ]);*/
	  
	  updateCache('DELETE_ORDER', null, currentUser.username, fromStatus, orderNo);    
	  await notify(currentUser.id, 'DELETE_ORDER', currentUser.username, fromStatus, null, orderNo);
	  
	  updateCache('NEW_ORDER', updatedObject, currentUser.username, toStatus);    
	  await notify(currentUser.id, 'NEW_ORDER', currentUser.username, toStatus, updatedObject);
	};
	
	const handleDeleteOrder = async (itemOrderNo, dressPicsAll, patternPicsAll) => {
		console.log('in handleDeleteOrder')
		try {
		  setLoading(true);
		  const response = await supabase
			  .from('OrderItems')
			  .delete()
			  .eq('orderNo', itemOrderNo)

			if (response.error) {
			  console.error('Deletion failed:', response.error.message);
			  showErrorMessage('No matching order found!');
			  throw error;
			}
			const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(dressPicsAll.flat().map(filename => `dressImages/${filename}`))
								if(errorRemove) {
									throw errorRemove;
								}
			const { dataRemove1, errorRemove1 } = await supabase
								  .storage
								  .from('order-images')
								  .remove(patternPicsAll.flat().map(filename => `patternImages/${filename}`))
								if(errorRemove1) {
									throw errorRemove1;
								}
			
			/*let arrayA = JSON.parse(storage.getString(currentUser.username+'_'+orderType) || '[]');
			const newArray = arrayA.filter(oitem => oitem.orderNo !== itemOrderNo);
			console.log(newArray)
			storage.set(currentUser.username+'_'+orderType, JSON.stringify(newArray));*/
			
			updateCache('DELETE_ORDER', null, currentUser.username, orderType, itemOrderNo);    
			await notify(currentUser.id, 'DELETE_ORDER', currentUser.username, orderType, null, itemOrderNo);
			queueMicrotask(() => {
				readOrdersGlobal(fils.searchQuery, orderType, fils.isDateChanged, fils.startDate, fils.endDate, 'tailor', 0, INITIAL_SIZE)
				setOffset(INITIAL_SIZE);
			});
				showSuccessMessage('Order Deleted!');
				eventEmitter.emit('storageUpdated');
				eventEmitter.emit('transactionAdded');
				eventEmitter.emit('payStatusChanged');
		} catch (error) {
		  showErrorMessage('Failed to delete the order: ' + error.message);
		} finally {
		  setLoading(false);
		}
	};

	const changeOrderStatus = useCallback(async (item, newStatus, updatedPaymentData) => {
	  setLoadExcel(true);
	  
	  try {
		let updObj = {};
		if(newStatus === 'InProgress') {
			updObj = {orderStatus: newStatus, order_started_date: new Date()};
		} else if(newStatus === 'Completed') {
			updObj = {orderStatus: newStatus, order_completed_date: new Date()};
		} else {
			updObj = {orderStatus: newStatus};
		}
		if(updatedPaymentData) {
			updObj.paymentStatus = updatedPaymentData.paymentStatus;
			updObj.advance = updatedPaymentData.advance
		}
		const [error] = await supabase
			.from('OrderItems')
			.update(updObj)
			.eq('orderNo', item.orderNo);
		
		if (error) throw error;

		// Update local storage (both updates in parallel)
		await moveOrderBetweenArrays(currentUser.username, item.orderNo, orderType, newStatus, updObj);

		// Batch refresh orders
		queueMicrotask(() => {
		  Promise.all([
			readOrdersGlobal(fils.searchQuery, orderType, fils.isDateChanged, fils.startDate, fils.endDate, 'tailor', 0, INITIAL_SIZE),
			readOrdersGlobal(fils.searchQuery, newStatus, fils.isDateChanged, fils.startDate, fils.endDate, 'tailor', 0, INITIAL_SIZE)
		  ]);
		  setOffset(INITIAL_SIZE);
		});

		eventEmitter.emit('storageUpdated');
		showSuccessMessage(`Order #${item.tailorOrderNo} marked as ${newStatus}!`);
		return true;

	  } catch (error) {
		showErrorMessage(`Error: ${error.message}`);
		return false;
	  } finally {
		setLoadExcel(false);
	  }
	}, []);

	// Optimized onCheckedChange
	const onCheckedChange = async (isChecked, item, updatedPaymentData) => {
	  if (!isChecked) return;
	  setLoadExcel(true);
	  try {
		// Update orders array efficiently
		let orderIndex = orders.findIndex((order) => order.orderNo === item.orderNo);
        if (orderIndex !== -1) {
            orders[orderIndex].workStarted = isChecked;
        }

		const newStatus = orderType === 'Created' ? 'InProgress' : 'Completed';
		await changeOrderStatus(item, newStatus, updatedPaymentData);
		
	  } catch (error) {
		console.error(error);
		showErrorMessage(error.message);
	  } finally {
		setLoadExcel(false);
	  }
	};


  const getStatus = (orderStatus) => {
	switch(orderStatus) {
		case 'Created':
			return 'New';
		case 'InProgress':
			return 'In Progress';
		case 'Completed':
			return 'Completed';
		default:
			return null;
	}
  }
  
  const exportToExcel = useCallback(async (startDateLocal, endDateLocal) => {
	console.log('in exportToExcel')
    setIsDownload(false);
    try {
      setLoadExcel(true);
      //const ordersAll = getOrders('all', startDateLocal);
	  let ordersAll = [];
	  if(startDateLocal) {
		ordersAll = await fetchOrdersFromDB('tailor', null, '', true, moment(startDateLocal).format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'), 0, null, orderType);
	  } else {
		ordersAll = await fetchOrdersFromDB('tailor', null, '', false, null, null, 0, null, orderType );
	  }
	  
      const formattedData = ordersAll.map((item, index) => ({
        "S.No.": index + 1,
        "Order No.": item.tailorOrderNo,
        "Customer Name": item.custName,
        "Order Date": item.orderDate,
        "Order Details": item.dressDetails,
        "Order Amount": item.orderAmt,
        "Order Status": getStatus(item.orderStatus)
      }));

      const totalEarnings = ordersAll.reduce((total, item) => total + item.orderAmt, 0);

		let endF = endDateLocal ? endDateLocal : moment(new Date()).format('YYYY-MM-DD');
		console.log(startDateLocal + ',' + endF)
      const queryParams = { parameter1: currentUser.username, parameter2: startDateLocal, parameter3: endF };

      const { data, error } = await supabase.rpc('get_income_expense', queryParams);
      if (error) throw error;

      const { inc = 0, exp = 0 } = data.reduce((acc, item) => {
        if (item.entryType === 'Income') acc.inc = item.sum;
        if (item.entryType === 'Expense') acc.exp = item.sum;
        return acc;
      }, { inc: 0, exp: 0 });

      formattedData.push(
        {
          "S.No.": "",
          "Order No.": "Total Earnings",
          "Order Amount": totalEarnings,
        },
        {
          "S.No.": "",
          "Order No.": "Other Income",
          "Order Amount": inc,
        },
        {
          "S.No.": "",
          "Order No.": "Expenses",
          "Order Amount": exp,
        }
      );

      // Create and save Excel file
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "List Data");
      
      const excelFile = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) return;

      await StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        `Thaiyal_orders_${moment().format('DD_MM_YYYY')}`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ).then(async (fileUri) => {
        await FileSystem.writeAsStringAsync(fileUri, excelFile, { 
          encoding: FileSystem.EncodingType.Base64 
        });
      });

      showSuccessMessage("File saved to Downloads folder!");
    } catch (error) {
      showErrorMessage(error.message);
    } finally {
      setLoadExcel(false);
    }
  }, [currentUser.username, fils, getOrders]);

  const renderFilterAction = () => (
    <TopNavigationAction icon={FilterIcon} onPress={() => setOpenFilter(true)}/>
  );

  const renderCalendarAction = () => (
    <TopNavigationAction icon={CalendarIcon} onPress={() => setDatePickerVisible(true)}/>
  );
  
  /*const renderSyncAction = () => (
    <TopNavigationAction icon={RefreshIcon} onPress={() => onRefresh(true)}/>
  );*/
  
	const downloadAlert = () => {
			Alert.alert(
				"Confirmation", 
				"Do you want to download order data for a custom date range or just for the past 1 month?",
				[
					{
						text: "Download Custom Date Range",
						onPress: () => setExcelDateModalVisible(true),
						style: "destructive"
					},
					{
						text: "Download 1 Month",
						onPress: () => {const monthStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD'); exportToExcel(monthStartDate);},
						style: "destructive"
					},
					{
						text: "Cancel",
						onPress: () => console.log("Cancel"),
						style: "cancel"
					}
				],
				{ cancelable: true }
			);
	};
	
  return (
    <Layout style={styles.container}>
	{loading ? (
		<ActivityIndicator size="large" style={styles.spinner} />
	) : (
	<>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          onClear={onClearSearch}
        />
        <View style={styles.actionButtons}>
          {renderFilterAction()}
          {renderCalendarAction()}
        </View>
      </View>

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
	  
	  <CalendarModal
        visible={excelDateModalVisible}
        onClose={() => setExcelDateModalVisible(false)}
        value={range1}
        onSelect={onConfirmDatePicker1}
		onDateChange={onDateChange1}
		onReset={resetRange1}
      />

      <FilterModal
        visible={openFilter}
        onClose={() => setOpenFilter(false)}
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
        onApply={() => {
          setOpenFilter(false);
          readOrdersGlobal('', orderType, false, new Date(), new Date(), 'tailor', 0, INITIAL_SIZE, selectedIndex);
        }}
      />
	  
	  <Button
			appearance='ghost'
			size='large'
			accessoryLeft={<MaterialCommunityIcons name="microsoft-excel" color='white' size={25}/>}
			onPress={downloadAlert}
			style={[styles.fab, {backgroundColor: theme['color-primary-500']}]}
			status='control'
		/>
		
		<DownloadModal
			visible={isDownload}
			onClose={() => setIsDownload(false)}
			onApply={exportToExcel}
		/>
		
		<Modal
					visible={loadExcel}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
		</Modal>
		
		    <LoadingOverlay visible={loadDates} />
	</>
	)}
    </Layout>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  searchBar: {
    width: 265,
	marginTop: 5,
	marginRight: 5
  },
  actionButtons: {
    flexDirection: 'row',
  },
  list: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  card: {
    margin: 8,
    elevation: 2,
    borderRadius: 12,
	marginLeft: 7, 
	marginRight: 10
  },
  cardContent: {
    flexDirection: 'row',
    padding: 8,
  },
  orderImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  orderDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreButton: {
    width: 24,
    height: 24,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
	marginBottom: -5
  },
  actionButton: {
    borderRadius: 20,
  },
  dateButton: {
    borderRadius: 20,
	width: 100,
  },
  bottomNav: {
    elevation: 8,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
	color: 'color-primary-500'
  },
  fab: {
        alignItems: 'center',
        justifyContent: 'center',
		flexDirection: 'row',
        height: 50,
		width: 50,
        position: 'absolute',
		borderRadius: 10,
        bottom: 45,
        right: 35,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    },
  modalContentModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainerModal: {
    flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
    width: '100%',
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: '90%'
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 15,
    zIndex: 10,
  },
  closeIcon: {
    width: 28,
    height: 28,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
	alignItems: 'center',
    marginTop: 16,
	gap: 30
  },
  footerButton: {
    marginLeft: 8,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
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
    },
	fullScreenModal: {
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		height: '100%',
	},
	filterIcon: {
		marginTop: 2
	},
	calendarIcon: {
		marginRight: -5,
		marginTop: 2
	}
});

export default memo(HomeScreen);