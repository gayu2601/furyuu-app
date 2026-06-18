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
import eventEmitter from './eventEmitter';
import { getFileUrl } from '../extra/fileUrl';

  const CalendarIcon = (props) => (
    <Icon {...props} name='calendar-outline' style={[props.style, { marginRight: 3, marginLeft: -2 }]}/>
  );

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
  formattedDate
}) => {
  return (
      <View style={styles.cardFooter}>
          <DateButton 
            overdueOrder={false}
            formattedDate={formattedDate}
            style={styles.dateButtonEnd}
          />
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
	
  useEffect(() => {
		const downloadTitlePic = async() => {
			//console.log(imageUri)
			  try {
					let uri = getFileUrl(imageUri, 'order-images', 'dressImages') ?? undefined;
					  
					setTitleImg(uri);
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
              </View>
            </View>
            
            {item.dressDetails && (
              <Text category='s2' appearance='hint' style={styles.dressDetails}>
                {item.dressDetails}
              </Text>
            )}

			<OptimizedCardFooter
			  formattedDate={earliestDueDate}
			/>
          </View>
        </View>
      </Card>

	
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