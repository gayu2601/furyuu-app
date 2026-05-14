import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert, View, TouchableOpacity, ScrollView, StyleSheet, Image, Share, Linking, BackHandler } from 'react-native';
import {
  Input,
  Text, Layout,
  Select, SelectItem,
  IndexPath, useTheme, Datepicker,
  RadioGroup, Radio, Button, Icon, Modal, Spinner, Card, Divider, TopNavigationAction
} from '@ui-kitten/components';
import { ImageOverlay } from '../extra/ImageOverlay';
import { FontAwesome } from '@expo/vector-icons';
import moment from 'moment';
import { useRoute } from '@react-navigation/native';
import { useUser } from './UserContext';
import { useNetwork } from './NetworkContext';
import { useSlotBooking } from './SlotBookingContext';
import useDressConfig from './useDressConfig';
import { useOrderItems } from '../main/OrderItemsContext';
import OrderItemComponent from './OrderItemComponent';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { resetIdCounter } from '../main/generateUniqueId';
import { captureRef } from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import { ArrowIosBackIcon } from '../extra/icons';
import BreadcrumbsOrderBag from '../extra/BreadcrumbsOrderBag';
import { useFocusEffect } from "@react-navigation/native";
import {
  PersonIcon,
  PhoneIcon,
} from '../extra/icons';
import * as Contacts from 'expo-contacts';
import eventEmitter from './eventEmitter';
import { usePubSub } from './SimplePubSub';

const OrderBagScreen = ({ navigation }) => {
  const [expandedItems, setExpandedItems] = useState(new Set([0])); // First item expanded by default
  const route = useRoute();
  const theme = useTheme();
  const { refresh, measurementFields } = useDressConfig();
  const {currentUser} = useUser();
  const { isConnected } = useNetwork();
  const { getNewOrder, getNewOrderCust, saveOrder, resetItemsForLabel } = useOrderItems();
  const { notify, updateCache, eligible } = usePubSub();
  const [customerType, setCustomerType] = useState('');
  const [orderScreenDets, setOrderScreenDets] = useState(new Map());
  
  const [loading, setLoading] = useState(false);
  const [payStatusIndex, setPayStatusIndex] = useState(0); 
  const [payStatus, setPayStatus] = useState('Pending'); 
  const [advancePaid, setAdvancePaid] = useState(0);
  const viewRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventEmitted, setEventEmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [payModeIndex, setPayModeIndex] = useState(0);
  const { clearAllBookings, removeItemBooking } = useSlotBooking();

  const userType = currentUser.userType;
  const items = getNewOrder();
  const custDetails = getNewOrderCust();
  console.log('custDetails', custDetails);
  const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
  const breadcrumbRoutes = [
    { name: 'Order Details', screen: 'OrderBagItems' },
    { name: 'Create Order', screen: 'OrderBagCreate' },
  ];
  const payModes = ['Cash', 'Credit/Debit Card', 'UPI', 'Net-banking', 'Other'];
  const [payNotes, setPayNotes] = useState(null);
  
	console.log('new order item:')
	console.log(items)
	console.log(custDetails)
	
	const deleteAlert = (index, itemId, slotDates) => {
		Alert.alert(
            "Confirmation", `Do you want to delete this order item?`,
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => handleDelete(index, itemId, slotDates)
                }
            ],
            {cancelable: true}
        )
	}
	
	useEffect(() => {
		console.log('useEffect 1');
		navigation.setOptions({
		  headerRight: () => (
			<Icon name="trash-2-outline" fill="#FF0000" style={{ width: 25, height: 25, marginRight: 20 }} onPress={() => deleteAlert(null)}/>
		  ),
		});
	  }, [navigation]);
	
	useEffect(() => {
		console.log('useEffect 2');
		const backAction = () => {
		if(step === 1) {
			if(route.params?.cleanup) {
				console.log('in resetItemsForLabel useEffect')
				resetItemsForLabel(route.params?.itemName);
			}
			navigation.navigate('HomeMain', {screen: 'HomeNew'});
			return true;
		} else if (step > 1) {
			setStep(prevStep => prevStep - 1);
			return true;
		  } else {
			return false;
		  }
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, [step]);  
	
	useEffect(() => {
		console.log('useEffect 3');
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				if(step === 1) {
					if(route.params?.cleanup) {
						console.log('in resetItemsForLabel useEffect')
						resetItemsForLabel(route.params?.itemName);
					}
					navigation.navigate('HomeMain', {screen: 'HomeNew'});
				} else if (step > 1) {
					setStep(prevStep => prevStep - 1);
				  } else {
					navigation.goBack();
				  }
				}
			}/>
		  ),
		});
	}, [navigation, step]);
	
	useFocusEffect(
		useCallback(() => {
			console.log('useEffect 4');
			items.forEach(item => {
				setOrderScreenDets(prev => new Map(prev).set(item.id, {itemName: route.params?.itemName, headerImgUri: route.params?.headerImgUri}))
			});
		  return () => {
			console.log('screen unfocused');
			if(route.params?.cleanup) {
						console.log('in resetItemsForLabel orderbag useEffect')
						resetItemsForLabel(route.params?.itemName);
			}
		  };
		}, [navigation])
	);
	  
	useEffect(() => {
		console.log('useEffect 5');
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		}
		console.log('updated items')
		console.log(items);
		console.log(custDetails);
	}, [getNewOrder, getNewOrderCust]);
	
  const handlePayStatusSelect = (index) => {
		setPayStatusIndex(index);
		setPayStatus(payStatuses[index]);
	};
	
	const handlePayModeSelect = (index) => {
		setPayModeIndex(index);
		setPaymentMode(payModes[index]);
	};
	
	const uploadDesignFile = async(itemLocal, fileType) => {
		const arraybuffer = await fetch(itemLocal[fileType]).then((res) => res.arrayBuffer())
		const fileExt = itemLocal[fileType]?.split('.').pop()?.toLowerCase() ?? 'jpeg'
		const path = `${Date.now()}.${fileExt}`
		const { data, error: uploadError } = await supabase.storage
								.from('design-files/' + fileType)
								.upload(path, arraybuffer, {
								  contentType: 'image/jpeg',
								})

		if (uploadError) {
			console.log(uploadError);
			return false;
		} else {
			itemLocal[fileType] = data.path;
		}
	}
	
	const getPicFolder = (type) => {
		switch(type) {
			case 'dress':
				return 'dressImages';
			case 'pattern':
				return 'patternImages';
			case 'measurements':
				return 'measurementImages';		
		}
	  }
	
	const uploadOrderImages = async(picType, pics) => {
		let orderPicsString = null;
		console.log(pics)
		const folderName = getPicFolder(picType);
		let a = await Promise.all(
							pics?.map(async(pic) => {
								const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer())
								  const fileExt = pic.split('.').pop()?.toLowerCase() ?? 'jpeg'
								  const path = `${Date.now()}.${fileExt}`
								const { data, error: uploadError } = await supabase.storage
									.from('order-images/' + folderName)
									.upload(path, arraybuffer, {
									  contentType: 'image/jpeg',
									})

								  if (uploadError) {
									  console.log(pic);
									  console.log(uploadError);
									  throw uploadError;
								  }
								  return path;
							})
						);
		if (a.length > 0) {
			orderPicsString = a.join(','); // Join paths into a string
		}
		console.log('orderPicsString:')
		console.log(orderPicsString);
		return orderPicsString;
	}

  const toggleItemExpansion = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  // Icons
  const EditIcon = (props) => <Icon {...props} name='edit-outline' style={styles.editIcon} fill={theme['color-primary-500']}/>;
  const DeleteIcon = (props) => <Icon {...props} name='trash-2-outline' style={styles.deleteIcon} fill={'red'}/>;
  const ChevronDownIcon = (props) => <Icon {...props} name='chevron-down-outline' />;
  const ChevronUpIcon = (props) => <Icon {...props} name='chevron-up-outline' />;
  const PlusIcon = (props) => <Icon {...props} name='plus-outline' />;
  const DateIcon = (props) => <Icon {...props} name='calendar-outline' fill={theme['color-primary-100']}/>
  
  const totalAmount = items.reduce((total, item) => {
    const extraOptionsTotal = Object.values(item.extraOptions).reduce((sum, price) => sum + price, 0);
    return total + item.stitchingPrice + extraOptionsTotal;
  }, 0);

  const renderCustomerDetails = () => (
  <>
  <Text category='h6' style={styles.sectionTitle}>👤 Customer Details</Text>
    <Card style={styles.customerCard}>
      <View style={styles.detailRow}>
        <Text category='s1' appearance='hint'>Order No</Text>
        <Text category='s1'>{custDetails.orderNo}</Text>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.detailRow}>
        <Text category='s1' appearance='hint'>Name</Text>
        <Text category='s1'>{custDetails.custName}</Text>
      </View>
      <Divider style={styles.divider} />
	  {custDetails.associateCustName && <View style={styles.detailRow}>
        <Text category='s1' appearance='hint'>Order For</Text>
        <Text category='s1'>{custDetails.associateCustName}</Text>
      </View>}
      <Divider style={styles.divider} />
      <View style={styles.detailRow}>
        <Text category='s1' appearance='hint'>Phone No</Text>
        <Text category='s1'>{custDetails.phoneNo}</Text>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.detailRow}>
        <Text category='s1' appearance='hint'>Order Date</Text>
        <Text category='s1'>{moment(new Date()).format('DD-MM-YYYY')}</Text>
      </View>
    </Card>
	</>
  );
  
  const summarizeExpressDuration = (slotsObj) => {
	  let minDuration = Infinity;
	  let finalDuration = null;
	  
	  console.log(slotsObj);
	  
	  for (const { expressDuration } of Object.values(slotsObj)) {
		console.log(expressDuration);
		
		if (expressDuration) {
		  const daysStr = expressDuration.days;
		  
		  if (daysStr && typeof daysStr === 'string') {
			const nums = daysStr.match(/\d+/g)?.map(Number) || [];
			const lowest = Math.min(...nums, Infinity);
			
			if (lowest < minDuration) {
			  minDuration = lowest;
			  finalDuration = {
				...expressDuration,
				price: parseInt(expressDuration.price) || expressDuration.price
			  };
			}
		  }
		}
	  }
	  
	  return finalDuration;
	};

  // ─── helper: unchanged ────────────────────────────────────────────────────────
const calculateTotalAmount = (data) => {
  return data.reduce((total, item) => {
    const stitchingAmount = parseInt(item.stitchingAmt ? item.stitchingAmt : 0);
    let extraOptionsSum = 0;
    if (item.extraOptions && typeof item.extraOptions === 'object') {
      extraOptionsSum = Object.values(item.extraOptions).reduce(
        (sum, value) => sum + (parseInt(value) || 0), 0
      );
    }
    return total + stitchingAmount + extraOptionsSum;
  }, 0);
};

// ─── helper: unchanged ────────────────────────────────────────────────────────
const calcExpressCharges = (data) => {
  return data.reduce((max, item) => {
    const expressAmt = parseInt(item.expressDuration ? item.expressDuration.price : 0);
    return Math.max(max, expressAmt);
  }, 0);
};

// ─── file uploads (unchanged, must still happen before RPC) ──────────────────
// ─── file uploads — must stay client-side (touches storage, not DB) ──────────
const prepareItemFiles = async (item) => {
  if (item.frontNeckDesignFile) await uploadDesignFile(item, 'frontNeckDesignFile');
  if (item.backNeckDesignFile)  await uploadDesignFile(item, 'backNeckDesignFile');
  if (item.sleeveDesignFile)    await uploadDesignFile(item, 'sleeveDesignFile');

  if (item.dressPics)       item.dressPics       = await uploadOrderImages('dress',        item.dressPics);
  if (item.patternPics)     item.patternPics      = await uploadOrderImages('pattern',      item.patternPics);
  if (item.measurementPics) item.measurementPics  = await uploadOrderImages('measurements', item.measurementPics);

  return item;
};

// ─── createOrder ─────────────────────────────────────────────────────────────
const createOrder = async () => {
  if (!isConnected) {
    showErrorMessage("No Internet Connection");
    return;
  }
  if (!custDetails.custName?.trim() || !custDetails.phoneNo?.trim()) {
    showErrorMessage("Empty customer name or phone number!");
    return;
  }
  if (items.length === 0) {
    showErrorMessage("Add at least one order item!");
    return;
  }

  try {
    setLoading(true);

    // 1. Fetch customer id
    const { data: custData, error: custError } = await supabase
      .from('Customer')
      .select('*')
      .eq('phoneNo', custDetails.phoneNo)
      .maybeSingle();
    if (custError) throw custError;
    const custId = custData.id;

    // 2. Attach expressDuration + upload files (client-side, before RPC)
    const itemsWithExpress = await Promise.all(
      items
        .map(item => ({ ...item, expressDuration: summarizeExpressDuration(item.slots) }))
        .map(item => prepareItemFiles(item))
    );

    const expressCharges = itemsWithExpress.reduce((max, item) => {
      const price = item.expressDuration?.price || 0;
      return price > max ? price : max;
    }, 0);
	
	console.log('itemsWithExpress', itemsWithExpress);

    // 3. Single RPC call — all DB writes, fully atomic
    const payload = {
      username:       currentUser.username,
      orderDate:      new Date().toISOString(),
      orderStatus:    'New',
      orderAmt:       calculateTotalAmount(items),
      paymentStatus:  payStatus,
      advance:        parseInt(advancePaid || 0),
      customerId:     Number(custId),
      occasion:       custDetails.occasion,
      paymentMode:    paymentMode,
      expressCharges: Number(expressCharges),
      paymentNotes:   payNotes,
	  associateCustName: custDetails.associateCustName || null,
      ...(custDetails.orderNo > 0 ? { orderNo: custDetails.orderNo } : {}),
      items: itemsWithExpress,
    };
	console.log('payload', payload);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'create_order_with_items',
      { payload }
    );
    if (rpcError) throw rpcError;
	
	if (!rpcData || !rpcData.order || !rpcData.order.orderNo || !rpcData.dressIds?.length) {
	  throw new Error(`RPC returned invalid data: ${JSON.stringify(rpcData)}`);
	}
	
	console.log('rpcData', rpcData);
	
    // rpcData = { order: { orderNo, ... full OrderItems row }, dressIds: [...] }
    const { order: createdOrder, dressIds } = rpcData;
	
	const { data: verifyData, error: verifyError } = await supabase
	  .from('OrderItems')
	  .select('orderNo')
	  .eq('orderNo', createdOrder.orderNo)
	  .maybeSingle();

	if (verifyError || !verifyData) {
		try {
			await supabase.functions.invoke('send-alert-email', {
			  body: {
				to: 'thaiyalapp@gmail.com',
				subject: `Order Verification Failed — orderNo: ${createdOrder.orderNo}`,
				text: [
				  `Order verification failed after RPC call.`,
				  ``,
				  `orderNo: ${createdOrder.orderNo}`,
				  `verifyError: ${verifyError ? JSON.stringify(verifyError) : 'null'}`,
				  `verifyData: ${verifyData ? JSON.stringify(verifyData) : 'null'}`,
				  ``,
				  `Payload snapshot:`,
				  JSON.stringify(payload, null, 2),
				].join('\n'),
			  },
			});
		  } catch (mailErr) {
			console.warn('Failed to send alert email:', mailErr.message);
			// Non-fatal — don't let mail failure swallow the real error
		  }
	  throw new Error(`Order not found in DB after RPC: orderNo=${createdOrder.orderNo}`);
	}

    // 4. Post-success: local cache updates + notifications
    const grouped = {};

    for (const item of itemsWithExpress) {
      // cache measurement per dress type (skip associate items)
      if (!custDetails.associateCustName?.trim()) {
        const mergedMeas = { ...item.measurementData, ...item.extraMeasurements };
        const filteredObject = { dressType: item.dressType, measurementData: mergedMeas };
        updateCache('UPDATE_MEAS', filteredObject, `${custDetails.phoneNo}_${item.dressType}`);
        await notify(currentUser.id, 'UPDATE_MEAS', `${custDetails.phoneNo}_${item.dressType}`, filteredObject);
      }

      // refresh local extra measurement field list
      if (item.nameValues?.length) await refresh();

      // build grouped summary  e.g. "2 Blouse, 1 Alteration Salwar"
      const key =
        (item.dressType === 'Alteration'
          ? item.alterDressType
          : item.dressSubType ?? '') +
        ' ' + item.dressType;
      grouped[key] = (grouped[key] || 0) + 1;
    }

    const dressDetails = Object.entries(grouped)
      .map(([key, count]) => `${count} ${key}`)
      .join(', ');

    // 5. Build itemFinal in the same shape the rest of the app expects
    const combinedObject = itemsWithExpress.reduce((acc, cur) => {
      for (const key in cur) {
        let value = cur[key];
        if (
          ['dressPics', 'patternPics', 'measurementPics'].includes(key) &&
          typeof value === 'string'
        ) {
          value = value.split(',');
        }
        acc[key] = acc[key] ? [...acc[key], value] : [value];
      }
      acc['checkingDone'] = [...(acc['checkingDone'] || []), false];
      return acc;
    }, {});
	
	console.log('combinedObject', combinedObject);

    const selProps = [
      'dressType', 'dressSubType', 'alterDressType',
      'frontNeckType', 'backNeckType', 'sleeveType', 'sleeveLength',
      'frontNeckDesignFile', 'backNeckDesignFile', 'sleeveDesignFile',
      'dressGiven', 'dueDate', 'stitchingAmt', 'notes',
      'dressPics', 'patternPics', 'measurementPics', 'measurementData',
      'extraOptions', 'slots', 'slotDates', 'expressDuration',
    ];
    const filteredCombined = Object.fromEntries(
      selProps.map(p => [p, combinedObject[p]])
    );

    const itemFinal = {
      ...createdOrder,               // full OrderItems row from DB
      ...filteredCombined,
      custName:    custDetails.custName,
      phoneNo:     custDetails.phoneNo,
	  associateCustName: custDetails.associateCustName,
      dressItemId: dressIds,
      dressDetails,
    };

    console.log(itemFinal);
	updateCache('NEW_ORDER', itemFinal, 'Completed_false', null, custDetails.custInserted || false);
    await notify(currentUser.id, 'NEW_ORDER', 'Completed_false', itemFinal, null, custDetails.custInserted || false);
	
    // 6. Emit events + reset state
    showSuccessMessage('Order saved! Order no: ' + createdOrder.orderNo);
    eventEmitter.emit('storageUpdated');
    eventEmitter.emit('newOrderAdded');
    eventEmitter.emit('payStatusChanged');
    if (!eventEmitted) {
      eventEmitter.emit('transactionAdded');
      setEventEmitted(true);
    }

    saveOrder([], { custName: '', phoneNo: '', occasion: '', custInserted: false, orderNo: 0 });
    resetItemsForLabel();
    resetIdCounter();
    clearAllBookings();
    navigation.navigate('HomeMain', { screen: 'HomeNew' });
  } catch (error) {
    console.error("Error creating order:", error.message);
    showErrorMessage("Failed to save order. Please try again. Error: " + error.message);
  } finally {
    setPayStatusIndex(0);
    setPayStatus('Pending');
    setAdvancePaid(0);
    setPaymentMode('Cash');
    setPayModeIndex(0);
    setLoading(false);
  }
};

	  const navigateToContacts = () => {
		navigation.navigate('ImportCustomerScreen', {screenName: 'OrderBagScreen'});
	  }
	  
	const handleEdit = (indexList) => {
		let newOrderItem = { ...items.splice(indexList, 1)[0] };
		console.log(newOrderItem) 
		navigation.navigate('HomeMain', {screen: 'Test', params: {itemName: orderScreenDets.get(newOrderItem.id).itemName, headerImgUri: orderScreenDets.get(newOrderItem.id).headerImgUri, step: 2, orderItem: [newOrderItem], editMode: true}});
	}
	
	const handleDelete = (indexList, itemId, slotDates) => {
		if(indexList === null) {
			saveOrder([], {custName: '', phoneNo: '', occasion: '', custInserted: false, orderNo: 0});
			clearAllBookings();
		} else {
			const updatedOrder = [...items];
			updatedOrder.splice(indexList, 1);
			removeItemBooking(itemId, slotDates);
			if(updatedOrder.length > 0) {
				saveOrder(updatedOrder, custDetails, true);
			} else {
				saveOrder([], {custName: '', phoneNo: '', occasion: '', custInserted: false, orderNo: 0});
			}
		}
	}
	
	const renderOrderItem1 = (item, index) => {
	  return (
		<OrderItemComponent
		  item={item}
		  index={index}
		  expandedItems={expandedItems}
		  toggleItemExpansion={toggleItemExpansion}
		  measurementFields={measurementFields}
		  isBag={true}
		  handleEdit={handleEdit}
		  deleteAlert={deleteAlert}
		/>
	  );
	};

  return (
    <Layout style={styles.container} level='2'>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
	    {items.length === 0 ? (
		  <View style={{alignItems: 'center', marginTop: 150, marginBottom: 200}}>
			<Image
				style={styles.imageBag}
				source={require('../../../assets/no_orders_bag.png')}/>
			<Text category="h5" style={styles.title}>
			  No dress items added yet!
			</Text>
			<Text category="s1" style={styles.subtitle}>
			  Choose a dress type from Home tab to start creating an order
			</Text>
		  </View>
		) : (
		<Layout>
		<View style={styles.section}>
          {renderCustomerDetails()}
        </View>

        <View style={styles.section}>
          <Text category='h6' style={styles.sectionTitle}>
            👗 Order Items ({items.length})
          </Text>
          {items.map((item, index) => renderOrderItem1(item, index))}
        </View>

		<Text category='h6' style={styles.sectionTitle1}>🛍️ Add More to Your Order</Text>
        <View style={styles.actionSection}>
          <Button
            style={styles.addButton}
            appearance='outline'
            accessoryLeft={PlusIcon}
            onPress={() => navigation.navigate('HomeMain', {screen: 'HomeNew' })}
          >
            Add another dress
          </Button>
          <Text category='c1' appearance='hint' style={styles.infoText}>
            Takes you to homepage to add another dress item to order
          </Text>
		</View>
	<View style={styles.section}>
        <Text category="h6" style={styles.headerText}>
          💵 Payment Details
        </Text>
      <Card style={styles.cardFinal}>
        <View style={styles.detailRow}>
          <Text category="label">
            Total Order Amount
          </Text>
          <Text category="label">Rs. {calculateTotalAmount(items)}</Text>
        </View>
        <View>
          <Text category="label">
            Payment Status
          </Text>
            <RadioGroup
					selectedIndex={payStatusIndex}
					onChange={handlePayStatusSelect}
					style={{ flexDirection: 'row' }}  
				  >
					{payStatuses.map((paySt, index) => (
					  <Radio key={index} style={styles.radioButton}>{paySt}</Radio>
					))}
			</RadioGroup>
        </View>
		{payStatuses[payStatusIndex] === "Partially paid" && (
			<View style={styles.generalField}>
			  <Text category="label">
				Advance paid
			  </Text>
			  <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 110}}>
				<Text category='s2'>Rs. </Text>
			    <Input
				  style={{width: 80}}
				  value={advancePaid}
				  keyboardType='numeric'
				  textStyle={{ textAlign: 'right' }}
				  onChangeText={(text) => setAdvancePaid(text)}
				/>
			  </View>
			</View>
		)}
		<View>
          <Text category="label">
            Payment Mode
          </Text>
            <RadioGroup
					selectedIndex={payModeIndex}
					onChange={handlePayModeSelect}
					style={{ flexDirection: 'row', flexWrap: 'wrap' }}  
				  >
					{payModes.map((payMode, index) => (
					  <Radio key={index} style={styles.radioButton}>{payMode}</Radio>
					))}
			</RadioGroup>
			{paymentMode === 'Other' && (
				<Input
				  style={{width: 80}}
				  value={payNotes}
				  onChangeText={(text) => setPayNotes(text)}
				/>
			)}
        </View>
		</Card>
		</View>
		
			<Button
					  style={styles.nextButton}
					  size='medium'
					  onPress={createOrder}
					  disabled={!isConnected}
					  status='info'
				>
							Create Order
				</Button>
			<Modal
						visible={loading}
						backdropStyle={styles.backdrop}
					  >
							<Spinner size="large" status="primary" />
			</Modal>
			</Layout>
	)}
	</ScrollView>
    </Layout>
)};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
	marginTop: -10
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  sectionTitle1: {
    marginBottom: 12,
    fontWeight: 'bold',
	marginLeft: 15
  },
  subsectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  customerCard: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 4,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
	marginTop: 5
  },
  itemInfo: {
    flex: 1,
	marginLeft: 5
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemType: {
    flex: 1,
    fontWeight: 'bold',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
  },
  boldText: {
    fontWeight: 'bold',
  },
  extraTotal: {
    color: '#28a745',
    fontSize: 12,
  },
  itemTotal: {
    fontWeight: '600',
    marginTop: 4,
  },
  expandButton: {
    marginTop: 8,
  },
  itemDetails: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  extraOptionsContainer: {
    marginBottom: 16,
  },
  extraOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extraOptionItem: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 8,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  extraOptionLabel: {
    textAlign: 'center',
    fontWeight: '500',
  },
  extraOptionPrice: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  designPicsContainer: {
    marginBottom: 16,
  },
  scrollViewContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  imageItemContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  designImage: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
  },
  measurementImage: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
  },
  shareButton: {
    width: 50,
    marginTop: 10,
  },
  shareButtonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 2,
  },
  shareIconOverlay: {
    width: 20,
    height: 20,
  },
  noMeasurementImages: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  noContentPlaceholder: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderStyle: 'dashed',
  },
  addContentBtn: {
    marginTop: 8,
  },
  neckSleeveContainer: {
    marginBottom: 16,
  },
  neckSleeveSection: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  neckLabel: {
    marginBottom: 4,
  },
  neckValue: {
    marginBottom: 2,
  },
  sleeveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  designFileContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  designFileImage: {
    width: 100,
    height: 100,
    borderRadius: 6,
  },
  neckSleeveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  neckSleeveItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#28A745',
    flex: 1,
    minWidth: '45%',
  },
  neckSleeveValue: {
    fontWeight: '600',
    marginTop: 2,
  },
  measurementsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
	marginTop: -15
  },
  measurementFieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  measurementLabel: {
    flex: 1,
  },
  measurementValue: {
    textAlign: 'right',
    minWidth: 40,
  },
  measurementPicsLabel: {
    marginTop: 10,
    marginBottom: 8,
  },
  notesCard: {
    marginTop: 12,
  },
  notesLabel: {
    fontWeight: 'bold',
  },
  measurementStatus: {
    marginBottom: 12,
	flexDirection: 'row',
	justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusProvided: {
    backgroundColor: '#D4EDDA',
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
  },
  statusText: {
    fontWeight: '500',
  },
  measurementsTable: {
    gap: 6,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  actionSection: {
    padding: 16,
	marginTop: -15,
    alignItems: 'center',
  },
  addButton: {
    marginBottom: 16,
	marginHorizontal: 80
  },
  orText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  nextButton: {
	marginHorizontal: 120,
    marginBottom: 8,
  },
  proceedText: {
    textAlign: 'center',
    marginTop: 8,
  },
  editIcon: {width: 22, height: 22},
  deleteIcon: {width: 20, height: 20, marginLeft: 5},
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 20,
    color: '#94a3b8',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
	marginTop: 5
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#222B45',
  },
  cardFinal: {
    borderRadius: 8,
    elevation: 2,
	marginLeft: 4, marginRight: 8, marginVertical: 5, marginBottom: 10
  },
  detailRow: {
    flexDirection: 'row',
	justifyContent: 'space-between',
    marginBottom: 8,
  },
  generalField: {
	  flexDirection: 'row',
	  alignItems: 'center',
	  justifyContent: 'space-between'
  },
  imageBag: {
    width: 250,
    height: 250,
    marginBottom: 24,
	marginTop: -100
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
	marginTop: - 30
  },
  subtitle: {
    textAlign: 'center',
	width: 300
  },
  imageContainer: {
    flex: 1,
    width: 75,
    height: 120,
	marginLeft: -5
  },
  imageCard: {
    width: '100%',
    height: '135%',
    borderRadius: 5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '135%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  overlayText: {
    color: 'white',
    fontSize: 14
  },
  carouselImage: {
    width: 320,
    height: 300,
  },
  shareButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 20,
    padding: 5,
  },
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  radioButton: 
	{ marginLeft: -5, transform: [
      { scaleX: 0.9 }, // shrink horizontally
      { scaleY: 0.9 }  // shrink vertically (track + thumb)
    ],
 }
 });

export default OrderBagScreen;