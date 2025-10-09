import React, { useState, useEffect, memo } from 'react';
import { Image, StyleSheet, View, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { Button, ListItem, Text, OverflowMenu, MenuItem, Icon, CheckBox, Modal, List, Card, Toggle, Spinner } from '@ui-kitten/components';
import moment from "moment";
import { useUser } from '../main/UserContext';
import { useNavigation } from "@react-navigation/native";
import PaymentModal from '../main/PaymentModal';
import { supabase } from '../../constants/supabase'
import { storage } from '../extra/storage';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { useReadOrderItems } from './ReadOrderItemsContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { usePubSub } from './SimplePubSub';
import eventEmitter from './eventEmitter';

const MoreIcon = (props) => (
	  <Icon {...props} name='more-vertical' />
	);

  const CalendarIcon = (props) => (
    <Icon {...props} name='calendar-outline' style={[props.style, { marginRight: 3, marginLeft: -2 }]}/>
  );


const OrderMenu = memo(({ orderType, menuVisible, toggleMenu, onMenuItemSelect, username, currentUsername }) => {
  return (
    <OverflowMenu
      anchor={() => (
        <Button
          style={styles.moreButton}
          appearance='ghost'
          status='basic'
          accessoryLeft={MoreIcon}
          onPress={toggleMenu}
        />
      )}
      visible={menuVisible}
      onBackdropPress={toggleMenu}
      onSelect={onMenuItemSelect}
    >
      <MenuItem title='Update payment' />
	  <MenuItem title='Edit' />
      <MenuItem title='Delete' />
      {username === currentUsername && <MenuItem title='Call customer' />}
      {orderType !== "Created" && (
        <MenuItem
          title={
            orderType === "Completed"
              ? "Move to In Progress"
              : "Move to New"
          }
        />
      )}
    </OverflowMenu>
  );
});

// Memoized button components
const ActionButton = memo(({ orderType, workStarted, onCheckedChange, item, setModalVisible }) => {
	return (
  <Button
    size='small'
    status={orderType === 'Created' ? 'primary' : 'success'}
    style={styles.actionButton}
    onPress={() => orderType === 'InProgress' ? setModalVisible(true) : onCheckedChange(!workStarted, item)}>
    {evaProps => (
      <Text 
        {...evaProps} 
        status='control' 
        style={{fontSize: 12, fontWeight: 'bold', marginTop: -1}}
      >
        {orderType === 'Created' ? 'Start work' : 'Mark Completed'}
      </Text>
    )}
  </Button>
)});

const DateButton = memo(({ overdueOrder, formattedDate, style }) => (
  <Button
    size='small'
    appearance='outline'
    status={overdueOrder ? 'danger' : 'primary'}
    style={style}
    accessoryLeft={CalendarIcon}>
    {evaProps => (
      <Text 
        {...evaProps} 
        status={overdueOrder ? 'danger' : 'primary'} 
        style={{fontSize: 12, fontWeight: 'bold', marginTop: -1}}
      >
        {formattedDate}
      </Text>
    )}
  </Button>
));

// Main optimized card footer component
const OptimizedCardFooter = memo(({ 
  item, 
  orderType, 
  workStarted, 
  onCheckedChange, 
  formattedDate, 
  overdueOrder,
  setModalVisible
}) => {
  return (
      <View style={styles.cardFooter}>
        {orderType !== 'Completed' ? (
          <>
            <ActionButton 
              orderType={orderType}
              workStarted={workStarted}
              onCheckedChange={onCheckedChange}
              item={item}
			  setModalVisible={setModalVisible}
            />
            <DateButton 
              overdueOrder={overdueOrder}
              formattedDate={formattedDate}
              style={styles.dateButton}
            />
          </>
        ) : (
          <DateButton 
            overdueOrder={false}
            formattedDate={formattedDate}
            style={styles.dateButtonEnd}
          />
        )}
      </View>
  );
});

const ListOrderItem = (props) => {
	const { currentUser } = useUser();
	const { updateOrderPayment, readOrdersGlobal } = useReadOrderItems();
  const { style, index, imageUri, defaultSource, item, orderType, userType, isShareIntent=false, changeOrderStatus = () => {}, handleItemPress = () => {}, workStarted, onCheckedChange = () => {}, handleDeleteOrder = () => {}, ...listItemProps } = props;
  const [loading, setLoading] = useState(false);
    const currentDate = moment();
  const formattedDate = moment(item.orderDate).format('DD-MM-YYYY');
	const [clickPayment, setClickPayment] = useState(false);
	const getEarliestDateFormatted = (dateArray) => {
	  const earliest = new Date(Math.min(...dateArray.map(date => new Date(date))));
	  return moment(earliest).format('DD-MM-YYYY');
	};

	const earliestDueDate = getEarliestDateFormatted(item.dueDate);

  const [modalVisible, setModalVisible] = useState(false);
	const [titleImg, setTitleImg] = useState(null);
	const [imageURIs, setImageURIs] = useState({});
	const [imgModalVisible, setImgModalVisible] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	  const [selectedItems, setSelectedItems] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const navigation = useNavigation()
  const [menuVisible, setMenuVisible] = useState(false);
		const { notify, updateCache} = usePubSub();
	
  const isOrderOverdue = (date) => {
	  if (!date) return false;
	  const orderDate = new Date(date);
	  const today = new Date();
	  return orderDate < today;
	};  

  const overdueOrder = orderType !== 'Completed' && isOrderOverdue(item.dueDate);
  
  useEffect(() => {
		const downloadTitlePic = async() => {
			//console.log(imageUri)
			  try {
					  const { data, error } = await supabase.storage.from('order-images').getPublicUrl('dressImages/' + imageUri)

					  if (error) {
						throw error
					  }
					setTitleImg(data.publicUrl);
					return true;
				} catch (error) {
					console.error('Error downloading image: ', error.message)
					return false;
				} finally {
					setLoading(false);
				}
		}
		if(imageUri) {
			downloadTitlePic()
		}
	},[imageUri]);
  
  const getStatus = () => {
    switch(orderType) {
      case 'Created':
        return 'warning';
      case 'InProgress':
        return 'info';
      case 'Completed':
        return 'success';
      default:
        return 'basic';
    }
  }
  const handleCardPress = () => {
	  navigation.navigate('OrderDetailsMain', {screen: 'OrderDetails',
					params: {
						item: item,
						userType: userType,
						orderDate: formattedDate,
						shopName: item.shopName,
						shopAddress: item.shopAddress,
						shopPhNo: item.shopPhNo,
						isShareIntent: false
					}
		});
	  };
	  
	/*useEffect(() => {
		const allSelected = data.every((item) => selectedItems[item.id]);
		setSelectAll(allSelected);
	  }, [selectedItems]);*/
  
  const handleSelectAll = () => {
    const newSelectedItems = {};
	console.log('in select all:')
	console.log(Object.keys(imageURIs))
    if (!selectAll) {
      Object.keys(imageURIs).forEach((key) => {
        newSelectedItems[key] = true;
      });
    }
	console.log('newSelectedItems:')
	console.log(newSelectedItems)
    setSelectedItems(newSelectedItems);
    setSelectAll(!selectAll);
  };

  const handleItemSelect = (itemImgName) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemImgName]: !prev[itemImgName],
    }));
  };

  
  

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  
  const handleCall = (phoneNumber) => {
	const url = `tel:${phoneNumber}`;
	console.log(url);
	Linking.openURL(url).catch(() => alert("Unable to make the call."));
  }

  const onMenuItemSelect = (index) => {
    setMenuVisible(false);
    switch (index.row) {
      case 0:
		setModalVisible(true);
		setClickPayment(true);
        break;
	  case 1:
		navigation.navigate('OrderDetailsMain', {screen: 'EditOrderDetails',
					params: {
						item: item,
						userType: userType,
						orderDate: formattedDate,
						shopName: item.shopName,
						shopAddress: item.shopAddress,
						shopPhNo: item.shopPhNo,
						isShareIntent: false
					}
		});
		break;
	  case 2:
		deleteOrderAlert();
		break;
      case 3:
        handleCall(item.phoneNo);
        break;
	  case 4:
		markCompletedAlert(index)
		break;
      default:
        console.log('Invalid option selected');
    }
  };

  const deleteOrderAlert = () => {
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
	
	const getOrderStatusUpd = () => {
		switch(orderType) {
			case 'Created':
				return 'Completed';
			  case 'InProgress':
				return 'Created';
			  case 'Completed':
				return 'InProgress';
			  default:
				return 'Created';
		}
	}
	
	const markCompletedAlert = (index) => {
        Alert.alert(
            "Confirmation", orderType === 'Created' ? "Do you want to mark this order as completed?" : (orderType === 'InProgress' ? "Do you want to move this order to New?" : "Do you want to move this order to In Progress?"),
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => changeOrderStatus(item, getOrderStatusUpd())
                }
            ],
            {cancelable: true}
        )
    }
	
	const savePaymentData = async(updatedPaymentData) => {
		  updateOrderPayment(orderType, item.orderNo, updatedPaymentData);
		  const updItem = {
				...item,
				paymentStatus: updatedPaymentData.paymentStatus,
				advance: updatedPaymentData.advance
		  }
		  updateCache('UPDATE_ORDER', updItem, currentUser.username, item.orderStatus);    
		  await notify(currentUser.id, 'UPDATE_ORDER', currentUser.username, item.orderStatus, updItem);
		  eventEmitter.emit('payStatusChanged');
          setModalVisible(false);
		  if(orderType === 'InProgress' && !clickPayment) {
			await onCheckedChange(!workStarted, item, updatedPaymentData);
		  }
	}
	
  return (
	<>
	<Card
        {...listItemProps}
        style={[styles.card, style]}
        onPress={isShareIntent ? () => handleItemPress(index) : handleCardPress}>
        <View style={styles.cardContent}>
          <Image
            style={styles.orderImage}
            source={titleImg ? { uri: titleImg } : defaultSource}
          />
          <View style={styles.orderDetails}>
            <View style={styles.orderHeader}>
              <Text style={styles.customerName}>
                {item.custName}
              </Text>
              <View style={styles.orderIdContainer}>
                <Text category='s1'>#{item.orderNo}</Text>
                {!isShareIntent && (
					<OrderMenu 
					  orderType={orderType}
					  menuVisible={menuVisible}
					  toggleMenu={toggleMenu}
					  onMenuItemSelect={onMenuItemSelect}
					  username={item.username}
					  currentUsername={currentUser.username}
					/>
				  )}
              </View>
            </View>
            
            {item.dressDetails && (
              <Text category='s2' appearance='hint' style={styles.dressDetails}>
                {item.dressDetails}
              </Text>
            )}

			<OptimizedCardFooter
			  item={item}
			  orderType={orderType}
			  workStarted={workStarted}
			  onCheckedChange={onCheckedChange}
			  formattedDate={earliestDueDate}
			  overdueOrder={overdueOrder}
			  setModalVisible={setModalVisible}
			/>
          </View>
        </View>
      </Card>

	  <PaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
		orderNo={item.orderNo}
		orderAmt={item.orderAmt}
		paymentStatus={item.paymentStatus}
		advance={item.advance}
		onSave={(updatedPaymentData) => savePaymentData(updatedPaymentData)}
		noCache={orderType === 'InProgress' ? true : false}
      />
	
				<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
				</Modal>
	</>
  );
};

const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
  card: {
    margin: 8,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 8,
  },
  orderImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
	marginTop: 5,
	marginLeft: -10
  },
  orderDetails: {
    flex: 1,
    marginLeft: 17,
	marginRight: -10,
    justifyContent: 'space-between',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    width: 130,
	fontWeight: 'bold',
	fontSize: 16
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
	marginLeft: 20
  },
  dressDetails: {
    textTransform: 'capitalize',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 20,
	marginLeft: -5,
	height: 10,
  },
  dateButton: {
    borderRadius: 20,
    width: 100,
	marginLeft: 10,
	height: 10,
  },
  dateButtonEnd: {
    borderRadius: 20,
    width: 100,
	marginLeft: 110,
	height: 10,
  },
  moreButton: {
    width: 32,
    height: 32,
    padding: 0,
    marginLeft: 2,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});

export default ListOrderItem;