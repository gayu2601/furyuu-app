import React, { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import {
  Layout,
  Text,
  Card,
  Button,
  Select,
  SelectItem,
  IndexPath,
  TopNavigation,
  TopNavigationAction,
  Icon,
  CheckBox,
  Modal,
  Divider,
  OverflowMenu,
  MenuItem,
  List,
  Spinner,
  Input
} from '@ui-kitten/components';
import { useUser } from "./UserContext";
import { useNetwork } from "./NetworkContext";
import { useReadOrderItems } from "./ReadOrderItemsContext";
import moment from 'moment';
import eventEmitter from './eventEmitter';
import { useNavigation } from "@react-navigation/native";
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';
import { usePubSub } from './SimplePubSub';
import PaymentModal from './PaymentModal';

const ProgressBar = ({ progress, color = '#4CAF50', style }) => (
  <View style={[{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }, style]}>
    <View 
      style={{
        height: '100%',
        width: `${progress}%`,
        backgroundColor: color,
        borderRadius: 4,
      }} 
    />
  </View>
);

const IncompleteOrders = forwardRef(( props, ref ) => {
  const { statusCheckType } = props;
  const [selectedStatusIndex, setSelectedStatusIndex] = useState(new IndexPath(0));
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState(false);
  const { readOrdersGlobal, getOrders, dispatch, getFilters, hasMoreOrders, fetchOrdersFromDB, updateOrderPayment } = useReadOrderItems();
  const orderType = 'Completed';
  /*const orders = useMemo(() => {
    return getOrders(orderType, false);
  }, [getOrders, orderType]);
  console.log(orders)*/
  const [orders, setOrders] = useState([]);
  const { isConnected } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [offset, setOffset] = useState(0);
  const navigation = useNavigation();
  const PAGE_SIZE = 50;
  const INITIAL_SIZE = 50;
  const { currentUser, getNewDeviceLogin, updateNewDeviceLogin, newDeviceLogin } = useUser();
  const isNewDeviceLogin = useMemo(() => getNewDeviceLogin(), [getNewDeviceLogin]);
  const { notify, updateCache, eligible } = usePubSub();
  
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  
  const searchFilters = [
    { id: 'orderid', label: 'Order ID', iconName: 'hash-outline' },
    { id: 'name', label: 'Name', iconName: 'person-outline' },
    { id: 'phone', label: 'Phone', iconName: 'phone-outline' }
  ];

  const statuses = ['All Orders', 'New', 'Cutting', 'Stitching', 'Finishing', 'Checking', 'Billing'];
  const workflowStatuses = ['New', 'Cutting', 'Stitching', 'Finishing', 'Checking', 'Billing', 'Delivered'];
  
  const filters = statusCheckType ? searchFilters : statuses;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const DeleteIcon = (props) => <Icon {...props} name='trash-2-outline' style={styles.deleteIcon} fill={'red'}/>;

  // Single useEffect for initialization and event listeners
	useEffect(() => {
	  // Event handlers
	  const handleNewOrderAdded = async () => {
		console.log('New order added, reloading...');
		if (!isConnected) {
		  showErrorMessage("No Internet Connection");
		  return;
		}
		
		await readOrdersGlobal(null, orderType, statusCheckType, false, null, null, INITIAL_SIZE, null, isNewDeviceLogin);
		setOffset(INITIAL_SIZE);
		setRefreshTrigger(prev => prev + 1);
	  };

	  const handleProductionUpdate = (param) => {
		console.log('in handleProductionUpdate', param.orderNo, param.index);
		setOrders(prevOrders => 
		  prevOrders.map(order => {
			if (order.orderNo === param.orderNo) {
			  const updatedCheckingDone = [...order.checkingDone];
			  updatedCheckingDone[param.index] = param.shouldMark;
			  
			  return {
				...order,
				checkingDone: updatedCheckingDone
			  };
			}
			return order;
		  })
		);
	  };

	  // Initial load function
	  const initialLoad = async () => {
		if (!isConnected) {
		  showErrorMessage("No Internet Connection");
		  return;
		}
		
		console.log('in initialLoad');
		console.log('isnewDeviceLogin: ' + isNewDeviceLogin);
		
		await readOrdersGlobal(null, orderType, statusCheckType, false, null, null, INITIAL_SIZE, null, isNewDeviceLogin);
		setOffset(INITIAL_SIZE);
		
		if (newDeviceLogin) {
		  updateNewDeviceLogin(false);
		}
		
		setLoading(false);
		setRefreshTrigger(prev => prev + 1);
	  };

	  // Set up event listeners
	  eventEmitter.on('newOrderAdded', handleNewOrderAdded);
	  eventEmitter.on('productionStageUpdated', handleProductionUpdate);

	  // Run initial load
	  initialLoad();

	  // Cleanup
	  return () => {
		eventEmitter.off('newOrderAdded', handleNewOrderAdded);
		eventEmitter.off('productionStageUpdated', handleProductionUpdate);
	  };
	}, []); // Empty dependency - runs once on mount

	// Separate useEffect for orders updates (when data changes)
	useEffect(() => {
	  const newOrders = getOrders(orderType, statusCheckType);
	  setOrders(newOrders || []);
	}, [getOrders, orderType, refreshTrigger]);
  
  const getEarliestDateFormatted = (dateArray) => {
	  if(dateArray) {
		  const earliest = new Date(Math.min(...dateArray.map(date => new Date(date))));
		  return moment(earliest).format('DD-MM-YYYY');
	  } else {
			return '';
	  }
	};

  // Icons
  const MenuIcon = (props) => <Icon {...props} name='menu-outline' />;
  const SearchIcon = (props) => <Icon {...props} name='search-outline' />;
  const BellIcon = (props) => <Icon {...props} name='bell-outline' />;
  const PersonIcon = (props) => <Icon {...props} name='person-outline' />;
  const PackageIcon = (props) => <Icon {...props} name='cube-outline' />;
  const ClockIcon = (props) => <Icon {...props} name='clock-outline' />;
  const MoreIcon = (props) => <Icon {...props} name='more-vertical-outline' styles={styles.moreIcon}/>;
  const CloseIcon = (props) => <Icon {...props} name='close-outline' />;
  const ArrowIcon = (props) => <Icon {...props} name='arrow-forward-outline' />;

  const getStatusColor = (status) => {
    const colors = {
      'New': '#3366FF',
      'Cutting': '#FF6B35',
      'Stitching': '#8B5CF6',
      'Finishing': '#F59E0B',
      'Checking': '#6366F1',
      'Billing': '#10B981',
	  'Delivered': '#ccc'
    };
    return colors[status] || '#6B7280';
  };

  const getNextStatus = (currentStatus) => {
    const currentIndex = workflowStatuses.indexOf(currentStatus);
    return currentIndex < workflowStatuses.length - 1 ? workflowStatuses[currentIndex + 1] : null;
  };

  const getDaysUntilDue = (dueDate) => {
    const today = moment().startOf('day');
	  const due = moment(dueDate, 'DD-MM-YYYY').startOf('day');

	  const diffDays = due.diff(today, 'days');

	  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
	  if (diffDays === 0) return 'Due today';
	  if (diffDays === 1) return 'Due tomorrow';
	  return `${diffDays} days left`;
  };

  const getDueDateStatus = (dueDate) => {
      const today = moment().startOf('day');
	  const due = moment(dueDate, 'DD-MM-YYYY').startOf('day');

	  const diffDays = due.diff(today, 'days');

    if (diffDays < 0) return 'danger';
    if (diffDays <= 2) return 'warning';
    return 'success';
  };
  
  const getPlaceholderText = () => {
    switch(activeFilter) {
      case 'orderid': return 'Search by Order ID (e.g., ORD-001)';
      case 'name': return 'Search by customer name';
      case 'phone': return 'Search by phone number';
      default: return 'Search orders...';
    }
  };

  const updateOrderStatus = async(order, newStatus, updatedPaymentData) => {
	  console.log('in updateOrderStatus')
	  console.log(order.orderNo)
	  console.log(newStatus)
	  let newSt = (newStatus === 'Delivered' && 'Completed') || newStatus;
      try {
		setActionLoading(true);
		let updObj = {orderStatus: newSt};
		if(updatedPaymentData) {
			updObj.paymentStatus = updatedPaymentData.paymentStatus;
			updObj.advance = updatedPaymentData.advance
		}
		const {error} = await supabase
			.from('OrderItems')
			.update(updObj)
			.eq('orderNo', order.orderNo);
		
		if (error) throw error;
		const updItem = {
				...order,
				orderStatus: newSt
		}
		console.log(updItem);
		updateCache('UPDATE_ORDER', updItem, `${orderType}_false`);    
		await notify(currentUser.id, 'UPDATE_ORDER', `${orderType}_false`, updItem);

		queueMicrotask(() => {
		  Promise.all([
			readOrdersGlobal(null, orderType, false, false, null, null, INITIAL_SIZE),
			readOrdersGlobal(null, orderType, true, false, null, null, INITIAL_SIZE)
		  ]);
		  setOffset(INITIAL_SIZE);
		});

		eventEmitter.emit('storageUpdated');
		showSuccessMessage(`Order #${order.orderNo} marked as ${newStatus}!`);
		return true;

	  } catch (error) {
		console.log(error); 
		showErrorMessage(`Error: ${error.message}`);
		return false;
	  } finally {
		setActionLoading(false);
	  }
  };

  const updateBulkStatus = async(newStatus) => {
	/*setOrders(orders.map(order => 
      selectedOrders.includes(order.orderNo) ? { ...order, status: newStatus } : order
    ));*/
	let newSt = (newStatus === 'Delivered' && 'Completed') || newStatus;
	try {
		setActionLoading(true)
		const {error} = await supabase
				.from('OrderItems')
				.update({orderStatus: newSt})
				.in('orderNo', selectedOrders);
			
		if (error) {throw error};
		const orderSet = new Set(selectedOrders);
		const updatedOrders = orders.map(order => {
			if (orderSet.has(order.orderNo)) {
				const updItem = {
					...order,
					orderStatus: newSt
				};
				return updItem;
			}
			return order;
		});

		updateCache('BULK_UPDATE_ORDER', updatedOrders, `${orderType}_false`);    
		await notify(currentUser.id, 'BULK_UPDATE_ORDER', `${orderType}_false`, updatedOrders);
		queueMicrotask(() => {
			  readOrdersGlobal(null, orderType, statusCheckType, false, null, null, INITIAL_SIZE)
			  setOffset(INITIAL_SIZE);
		});
		
		setSelectedOrders([]);
		setBulkStatusUpdate(false);
		setBulkMode(false);
	} catch(error) {
		console.log(error); 
		showErrorMessage('Error updating orders!');
	} finally {
		setActionLoading(false);
	}
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectedStatus = statuses[selectedStatusIndex.row];
  
  const filterOrders = () => {
    let filtered = orders;
    
    // Apply status filter if statusCheckType is false
    //if (!statusCheckType) {
      filtered = selectedStatus === 'All Orders' 
		? orders 
		: orders.filter(order => order.orderStatus === selectedStatus);
    //}
    
    // Apply search filter if statusCheckType is true
    if (searchValue && activeFilter) {
      const searchLower = searchValue.toLowerCase();
      
      filtered = filtered.filter(order => {
        switch(activeFilter) {
          case 'orderid':
            return order.orderNo.toString().includes(searchLower);
          case 'name':
            return order.custName.toLowerCase().includes(searchLower);
          case 'phone':
            return order.phoneNo.includes(searchValue);
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };

  const filteredOrders = filterOrders();
  
  /*const filteredOrders = selectedStatus === 'All Orders' 
    ? orders 
    : orders.filter(order => order.orderStatus === selectedStatus);*/

  const renderSearchFilters = () => {
	  const filtersToRender = statusCheckType ? searchFilters : [searchFilters[1]];

	  return (
		<ScrollView
		  horizontal
		  showsHorizontalScrollIndicator={false}
		  style={styles.filterScrollView}
		  contentContainerStyle={styles.filterContainer}
		>
		  {filtersToRender.map(renderFilterButton)}
		</ScrollView>
	  );
	};

  const renderStatusSelect = () => {
    if (statusCheckType) return null;
    
    return (
      <Select
        style={styles.statusSelect}
        placeholder="Select Status"
        value={statuses[selectedStatusIndex.row]}
        selectedIndex={selectedStatusIndex}
        onSelect={(index) => setSelectedStatusIndex(index)}
      >
        {statuses.map((status) => (
          <SelectItem key={status} title={status} />
        ))}
      </Select>
    );
  };

  const renderFilterButton = (filter) => {
    const isActive = activeFilter === filter.id;
    const IconComponent = (props) => <Icon {...props} name={filter.iconName} />;
    
    return (
      <Button
        key={filter.id}
        appearance={isActive ? 'filled' : 'outline'}
        status={isActive ? 'success' : 'basic'}
        size='small'
        accessoryLeft={IconComponent}
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => {
          if (activeFilter === filter.id) {
            setActiveFilter(null);
            setSearchValue('');
          } else {
            setActiveFilter(filter.id);
            setSearchValue('');
          }
        }}
      >
        {filter.label}
      </Button>
    );
  };

  const renderSearchInput = () => {
    if (!activeFilter) return null;
    
    return (
      <View style={styles.searchContainer}>
        <Input
          placeholder={getPlaceholderText()}
          value={searchValue}
          onChangeText={setSearchValue}
          accessoryLeft={SearchIcon}
          accessoryRight={searchValue ? (props) => (
            <Icon
              {...props}
              name='close-outline'
              onPress={() => setSearchValue('')}
            />
          ) : undefined}
          style={styles.searchInput}
        />
      </View>
    );
  };


  const renderStatusIcon = (status) => (
    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
  );

  const renderStatusBadge = (status) => (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );

  const renderDueDateBadge = (dueDate) => (
    <View style={[styles.dueDateBadge, { backgroundColor: getDueDateStatus(dueDate) === 'danger' ? '#FEF2F2' : getDueDateStatus(dueDate) === 'warning' ? '#FEF3CD' : '#F0FDF4' }]}>
      <Text style={[styles.dueDateText, { color: getDueDateStatus(dueDate) === 'danger' ? '#DC2626' : getDueDateStatus(dueDate) === 'warning' ? '#D97706' : '#059669' }]}>
        {getDaysUntilDue(dueDate)}
      </Text>
    </View>
  );
  
  const handleCardPress = (item) => {
	  const formattedDate = moment(item.orderDate).format('DD-MM-YYYY');
	  navigation.navigate('OrderDetailsMain', {screen: 'OrderDetails',
					params: {
						item: item,
						orderDate: formattedDate,
						isShareIntent: false
					}
		});
	  };

  const OrderCard = ({order, index, bulkMode, selectedOrders, toggleOrderSelection, updateOrderStatus}) => {
	const [modalVisible, setModalVisible] = useState(false);
	const [moveToModalVisible, setMoveToModalVisible] = useState(false);
	const [clickPayment, setClickPayment] = useState(false);
	const [menuVisible, setMenuVisible] = useState(false);
	const earliestDueDate = getEarliestDateFormatted(order.dueDate);
	let expressVal = order.expressCharges || Math.max(
	  0,
	  ...(order.expressDuration || [])
		.filter(Boolean)
		.map(obj => obj.price));
	
	const calculateOrderProgress = (order) => {
	  if (!order.checkingDone || order.checkingDone?.length === 0) return 0;
	  
	  const totalDressItems = order.checkingDone.length;
	  const completedDressItems = order.checkingDone.filter(isCompleted => isCompleted === true).length;
	  
	  return (completedDressItems / totalDressItems) * 100;
	};

	const progressPercentage = calculateOrderProgress(order);
	
    const handleStatusUpdate = (newStatus, updatedPaymentData) => {
		console.log('in handleStatusUpdate', newStatus);
		if(newStatus === 'Delivered') {
			setModalVisible(true);
		} else {
		  updateOrderStatus(order, newStatus, updatedPaymentData);
		  setMoveToModalVisible(false);
		}
    };
	
	const savePaymentData = async(updatedPaymentData) => {
		  let key = `${orderType}_${statusCheckType}`;
		  updateOrderPayment(key, order.orderNo, updatedPaymentData);
		  const updItem = {
				...order,
				paymentStatus: updatedPaymentData.paymentStatus,
				advance: updatedPaymentData.advance
		  }
		  updateCache('UPDATE_ORDER', updItem, key);    
		  await notify(currentUser.id, 'UPDATE_ORDER', key, updItem);
		  eventEmitter.emit('payStatusChanged');
          setModalVisible(false);
		  if(order.orderStatus === 'Billing' && !clickPayment) {
			await handleStatusUpdate('Completed', updatedPaymentData);
		  }
	}
	
	const renderMoveToModal = (order) => (
	  <Modal
        visible={moveToModalVisible}
        backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onBackdropPress={() => setMoveToModalVisible(false)}
      >
        <Card disabled={true} style={{ width: 350 }}>
          <View style={{ padding: 20 }}>
            <Text category="h6" style={{ marginBottom: 20, textAlign: 'center' }}>
              Move Order To
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {workflowStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: order.orderStatus === status ? '#f0f0f0' : 'transparent',
                    borderWidth: order.orderStatus === status ? 1 : 0,
                    borderColor: '#ddd',
                    opacity: order.orderStatus === status ? 0.6 : 1
                  }}
                  onPress={() => handleStatusUpdate(status)}
                  disabled={order.orderStatus === status}
                >
                  <View style={{ marginRight: 12 }}>
                    {renderStatusIcon(status)}
                  </View>
                  <Text 
                    style={{ 
                      flex: 1,
                      color: order.orderStatus === status ? '#999' : '#000'
                    }}
                  >
                    {status}
                  </Text>
                  {order.orderStatus === status && (
                    <Text style={{ color: '#999', fontSize: 12 }}>Current</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Button
              style={{ marginTop: 16 }}
              appearance="outline"
              onPress={() => setMoveToModalVisible(false)}
            >
              Cancel
            </Button>
          </View>
        </Card>
      </Modal>
	)
	
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
			
			updateCache('DELETE_ORDER', null, `${orderType}_${statusCheckType}`, itemOrderNo);    
			await notify(currentUser.id, 'DELETE_ORDER', `${orderType}_${statusCheckType}`, null, itemOrderNo);

			queueMicrotask(() => {
				readOrdersGlobal(null, orderType, statusCheckType, false, null, null, INITIAL_SIZE, null, true)
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
	}
	
	const deleteOrderAlert = (item) => {
        Alert.alert(
            "Confirmation", "Do you want to delete this order?",
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => handleDeleteOrder(item.orderNo, item.dressPics, item.patternPics)
                }
            ],
            {cancelable: true}
        )
    }

	return (
    <Card key={order.orderNo} style={styles.orderCard} onPress={() => handleCardPress(order)}>
      <View style={styles.cardContent}>
        {/* Bulk Selection */}
        {bulkMode && (
          <View style={styles.checkboxContainer}>
            <CheckBox
              checked={selectedOrders.includes(order.orderNo)}
              onChange={() => toggleOrderSelection(order.orderNo)}
            />
          </View>
        )}

        {/* Order Header */}
        <View style={[styles.orderHeader, bulkMode && styles.orderHeaderWithCheckbox]}>
          <View style={styles.innerHeader}>
            <Text style={styles.orderNumber}>#{order.orderNo}</Text>
            {!statusCheckType && renderStatusBadge(order.orderStatus)}
          </View>
          
          {!statusCheckType && !bulkMode && (
            <View style={styles.actionButtons}>
              {getNextStatus(order.orderStatus) && (
                <Button
                  size='tiny'
                  appearance='ghost'
                  status='primary'
                  accessoryLeft={ArrowIcon}
                  onPress={() => updateOrderStatus(order, getNextStatus(order.orderStatus))}
                >
                  {getNextStatus(order.orderStatus)}
                </Button>
              )}
            </View>
          )}
        </View>

        {/* Customer Info */}
        <View style={[styles.infoRow, bulkMode && styles.infoRowWithCheckbox]}>
          <PersonIcon style={styles.infoIcon} />
          <Text style={styles.infoText}>{order.custName}</Text>
        </View>

        {/* Dress Item */}
        <View style={[styles.infoRow, bulkMode && styles.infoRowWithCheckbox]}>
          <PackageIcon style={styles.infoIcon} />
          <Text style={styles.infoText}>{order.dressDetails}</Text>
        </View>

        {/* Due Date */}
        {!statusCheckType && <View style={[styles.dueDateRow, bulkMode && styles.dueDateRowWithCheckbox]}>
          <View style={styles.dueDateInfo}>
            <ClockIcon style={styles.infoIcon} />
            <Text style={styles.dueDateLabel}>
              Due: {earliestDueDate}
            </Text>
          </View>
          {renderDueDateBadge(earliestDueDate)}
        </View>}
		{!statusCheckType && (
		  <View style={[styles.progressRow, bulkMode && styles.progressRowWithCheckbox]}>
			<Text category='c1' style={styles.progressText}>
				{Math.round(progressPercentage / 100 * order.dressType?.length)} / {order.dressType?.length}
			</Text>
			<ProgressBar 
			  progress={progressPercentage}
			  color={progressPercentage === 100 ? "#4CAF50" : "#FF9800"}
			  style={styles.progressBar}
			/>
		  </View>
		)}
		    {!bulkMode && (
			  <View style={[styles.actionButtonsRow, bulkMode && styles.actionButtonsRowWithCheckbox]}>
				<Button
				  size='small'
				  appearance='outline'
				  status='info'
				  style={styles.roundedButton}
				  onPress={() => {
					setMenuVisible(false);
					setClickPayment(true);
					setModalVisible(true);
				  }}
				>
					{evaProps => <Text {...evaProps} style={styles.buttonText}>Payment</Text>}
				</Button>
				
				<Button
				  size='small'
				  appearance='outline'
				  status='warning'
				  style={styles.roundedButton}
				  onPress={() => {
					setMenuVisible(false);
					setMoveToModalVisible(true);
				  }}
				>
				  {evaProps => <Text {...evaProps} style={styles.buttonText}>Move Status</Text>}
				</Button>
				
				<Button
				  size='small'
				  appearance='outline'
				  status='success'
				  style={styles.roundedButton}
				  onPress={() => {
					  setMenuVisible(false);
					  navigation.navigate('ProductionDetailsView', { order });
				  }}
				>
				  {evaProps => <Text {...evaProps} style={styles.buttonText}>Prod Details</Text>}
				</Button>
				
				<Button
				  status='basic'
				  appearance='ghost'
				  accessoryLeft={DeleteIcon}
				  style={{marginRight: -20}}
				  onPress={() => deleteOrderAlert(order)}
				/>

			  </View>
			)}
      </View>
	  {renderMoveToModal(order)}
	  <PaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        orderNo={order.orderNo}
        orderAmt={order.orderAmt + expressVal}
        paymentStatus={order.paymentStatus}
        advance={order.advance}
        onSave={(updatedPaymentData) => savePaymentData(updatedPaymentData)}
        noCache={order.orderStatus === 'Billing' && !clickPayment ? true : false}
      />
    </Card>
  )
  };

  const renderBulkUpdateModal = () => (
    <Modal
      visible={bulkStatusUpdate}
      backdropStyle={styles.backdrop}
      onBackdropPress={() => setBulkStatusUpdate(false)}
    >
      <Card disabled={true} style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update {selectedOrders.length} Orders</Text>
          <Button
            size='tiny'
            appearance='ghost'
            accessoryLeft={CloseIcon}
            onPress={() => setBulkStatusUpdate(false)}
          />
        </View>
        <Divider style={styles.divider} />
        <View style={styles.bulkStatusGrid}>
          {workflowStatuses.map((status) => (
            <Button
              key={status}
              style={styles.bulkStatusButton}
              appearance='outline'
              onPress={() => updateBulkStatus(status)}
            >
              <View style={styles.bulkStatusContent}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={styles.bulkStatusText}>{status}</Text>
              </View>
            </Button>
          ))}
        </View>
      </Card>
    </Modal>
  );
  
  const ListEmptyComponent = () => {
	  if (statusCheckType && !activeFilter) {
		  return (
			<Layout style={styles.emptyState}>
			  <SearchIcon style={styles.emptyStateIcon} />
			  <Text category='h6' style={styles.emptyStateTitle}>
				Select a filter to search
			  </Text>
			  <Text appearance='hint' style={styles.emptyStateDescription}>
				Choose Order ID, Name, or Phone to start searching orders.
			  </Text>
			</Layout>
		  );
		}

		if (statusCheckType && searchValue) {
		  return (
			<Layout style={styles.emptyState}>
			  <SearchIcon style={styles.emptyStateIcon} />
			  <Text category='h6' style={styles.emptyStateTitle}>
				No orders found
			  </Text>
			  <Text appearance='hint' style={styles.emptyStateDescription}>
				No orders match your search criteria "{searchValue}"
			  </Text>
			  <Button
				appearance='ghost'
				status='primary'
				onPress={() => setSearchValue('')}
				style={styles.clearButton}
			  >
				Clear search
			  </Button>
			</Layout>
		  );
		}

		if (!statusCheckType) {
			return (<Layout style={styles.emptyState}>
				  <PackageIcon style={styles.emptyIcon} />
				  <Text style={styles.emptyTitle}>No orders found</Text>
				  <Text style={styles.emptyDescription}>
					No orders match the selected status filter.
				  </Text>
				</Layout>
			);
		}
		return null;
	};
  
  const ListFooterComponent = useCallback(() => (
    !hasMoreOrders && orders.length > 0 ? (
      <Text category="s1" style={styles.footerText}>
        No more orders
      </Text>
    ) : null
  ), [hasMoreOrders, orders.length]);
  
  useImperativeHandle(ref, () => ({
    onRefresh
  }));
  
  const onRefresh = async () => {
	console.log('in onRefresh')
	dispatch({
        type: 'RESET_FILTERS'
    });
		queueMicrotask(() => {        
			readOrdersGlobal(null, orderType, statusCheckType, false, null, null, INITIAL_SIZE, null, true)
			setOffset(INITIAL_SIZE);
		});
    setRefresh(false);
  }
  
  const loadMoreOrders = useCallback(async () => {
    if (loading || !hasMoreOrders) return;
    setActionLoading(true);
	queueMicrotask(() => {        
		readOrdersGlobal(
		  null,
		  orderType,
		  statusCheckType,
		  new Date(),
		  new Date(),
		  offset,
		  PAGE_SIZE
		);
		setOffset(prev => prev + PAGE_SIZE);
	});
    setActionLoading(false);
  }, [hasMoreOrders, orderType, offset]);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3366FF" />
	  {loading ? (
		<ActivityIndicator size="large" style={styles.spinner} />
	  ) : (
	  <Layout style={styles.content}>
        <Layout style={styles.header}>
		  <View style={{flexDirection: 'row', gap: 20}}>
			{!statusCheckType && <View style={styles.actionBar}>
			  <Button
				size='small'
				appearance={bulkMode ? 'filled' : 'outline'}
				onPress={() => {
				  setBulkMode(!bulkMode);
				  setSelectedOrders([]);
				}}
			  >
				{bulkMode ? 'Cancel' : 'Bulk Edit'}
			  </Button>
			  
			  {bulkMode && selectedOrders.length > 0 && (
				<Button
				  size='small'
				  onPress={() => setBulkStatusUpdate(true)}
				>
				  Update {selectedOrders.length} orders
				</Button>
			  )}
			</View>}
		
        	{renderSearchFilters()}
		  </View>
			
			{activeFilter ? renderSearchInput() : renderStatusSelect()}

			<Text appearance='hint' style={styles.resultsCounter}>
			  {statusCheckType && activeFilter && searchValue 
				? `${filteredOrders.length} results found`
				: !statusCheckType 
				? `${filteredOrders.length} orders`
				: `${orders.length} total orders`
			  }
			</Text>
		</Layout>

		<List
			data={filteredOrders}
			  renderItem={({ item, index }) => (
				<OrderCard 
				  order={item} 
				  index={index}
				  bulkMode={bulkMode}
				  selectedOrders={selectedOrders}
				  toggleOrderSelection={toggleOrderSelection}
				  updateOrderStatus={updateOrderStatus}
				/>
			  )}
			windowSize={3} 
			  maxToRenderPerBatch={5}
			  initialNumToRender={8}
			  updateCellsBatchingPeriod={50}
			  removeClippedSubviews={true}
			refreshing={refresh}
			onRefresh={onRefresh}
			onEndReached={loadMoreOrders}
			onEndReachedThreshold={0.7}
			ListEmptyComponent={ListEmptyComponent}
			ListFooterComponent={ListFooterComponent}
		  />
      </Layout>
	)}

      {renderBulkUpdateModal()}
	  
	  <Modal
					visible={actionLoading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
	  </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNavigation: {
    backgroundColor: '#3366FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusSelect: {
    marginBottom: 16,
	backgroundColor: 'white',
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 16,
	elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    position: 'relative',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderWithCheckbox: {
    marginLeft: 40,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginRight: 10
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoRowWithCheckbox: {
    marginLeft: 40,
  },
  infoIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: '#6B7280',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dueDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateRowWithCheckbox: {
    marginLeft: 40,
  },
  dueDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  dueDateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    margin: 20,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  statusButton: {
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  statusButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  bulkStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bulkStatusButton: {
    width: '48%',
    marginBottom: 12,
    paddingVertical: 16,
  },
  bulkStatusContent: {
    alignItems: 'center',
  },
  bulkStatusText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    tintColor: '#9CA3AF',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    textAlign: 'center',
    padding: 16,
  },
  header: {
    marginBottom: -10
  },
  filterScrollView: {
    marginBottom: 12,
  },
  filterContainer: {
    paddingRight: 16,
  },
  filterButton: {
    marginRight: 8,
    borderRadius: 12,
  },
  activeFilterButton: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 25,
    backgroundColor: 'white',
  },
  resultsCounter: {
    textAlign: 'center',
    color: 'white',
    fontSize: 12,
  },
  clearButton: {
    marginTop: 8,
  },
  spinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
	color: 'color-primary-500'
  },
  moreButton: {
    marginRight: -20,
  },
  innerHeader: {flex: 1},
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  roundedButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
	width: 100
  },
  buttonText: {
	fontSize: 11
  },
  deleteIcon: {
	width: 20,
	height: 20
  },
  progressText: {
	marginTop: 10,
	textAlign: 'center'
  },
  progressBar: {
	marginVertical: 5
  }
});

export default IncompleteOrders;