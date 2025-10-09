import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Image, ScrollView, Alert, View, TouchableOpacity, StyleSheet, BackHandler, Linking, InteractionManager } from 'react-native';
import { Text, Layout, Button, Modal, Card, Icon, Divider, useTheme, Spinner, TopNavigationAction, List } from '@ui-kitten/components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { useRoute } from '@react-navigation/native';
import { useUser } from '../main/UserContext';
import useDressConfig from '../main/useDressConfig';
import { supabase } from '../../constants/supabase';
import { useNetwork } from './NetworkContext';
import { storage } from '../extra/storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { schedulePushNotification } from './notificationUtils';
import { ArrowIosBackIcon } from "../extra/icons";
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import OrderItemComponent from './OrderItemComponent';
import DeliveryOptionsModal from './DeliveryOptionsModal';
import eventEmitter from './eventEmitter';
import { saveSupabaseDataToFile } from '../extra/supabaseUtils';
import { usePubSub } from './SimplePubSub';

const MemoizedCard = memo(Card);

const SectionHeader = memo(({ icon, title }) => {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Icon style={styles.icon} fill={theme['color-primary-500']} name={icon} />
      <Text category="s1" style={styles.headerText}>{title}</Text>
    </View>
  );
});

const DetailRow = memo(({ label, value, labelStyle }) => (
  <View style={styles.detailRow}>
    <Text category="label" style={labelStyle}>{label}</Text>
    <Text category="s2">{value}</Text>
  </View>
));

const CustomerDetails = memo(({ item, currentUsername, phone }) => (
  <View style={styles.header}>
    <SectionHeader icon="person-outline" title="Customer Details" />
    <MemoizedCard>
      <DetailRow label="Name" value={item.custName} />
		{item.username === currentUsername && (<DetailRow 
			label="Phone No" 
			value={phone?.includes('+91') ? phone?.substring(3) : phone} 
		/>)}
      <DetailRow 
        label="Phone No" 
        value={item.phoneNo} 
      />
	  <DetailRow 
        label="Order Date" 
        value={item.orderDate} 
      />
    </MemoizedCard>
  </View>
));

const PaymentDetails = memo(({ item, selectedAddons }) => {
	const expressVal = item.expressCharges || Math.max(
	  0,
	  ...(item.expressDuration || [])
		.filter(Boolean)
		.map(obj => obj.price)
	);
	console.log('Payment ', expressVal)
	let totalAmt = expressVal + item.orderAmt;

	return (
  <>
    <SectionHeader icon="credit-card-outline" title="Payment Details" />
    <MemoizedCard>
      <DetailRow label="Order Amount" value={`Rs. ${parseInt(item.orderAmt)}`} />
	  <DetailRow label="Express Charges" value={`Rs. ${expressVal}`} />
	  <DetailRow label="Total Amount" value={`Rs. ${totalAmt}`} />
      <DetailRow label="Payment Status" value={item.paymentStatus} />
	  <DetailRow label="Payment Mode" value={item.paymentMode} />
      {item.paymentStatus === 'Partially paid' && (
        <>
          <DetailRow label="Advance paid" value={`Rs. ${item.advance}`} />
          <DetailRow 
            label="Pending Amount" 
            value={`Rs. ${parseInt(item.orderAmt - item.advance)}`} 
          />
        </>
      )}
	  {(selectedAddons.length > 0 || item.deliveryOptions) && 
		  <View style={styles.deliveryOptions}>
			<Text category='label'>Was this order delivered with Alteration work?</Text>
			{(selectedAddons || item.deliveryOptions).map((option, index) => (
			  <Text key={index} category='s2'>{option}</Text>
			))}
		  </View>
	  }
    </MemoizedCard>
  </>
)});

const OrderDetails = ({ navigation }) => {
  const route = useRoute();
  const { currentUser } = useUser();
  const { isConnected } = useNetwork();
  const theme = useTheme();
  const viewRef = useRef(null);
  const { item, orderDate, isShareIntent, custUsername, orderDetails } = route.params;
  console.log(item)
  const [phone, setPhone] = useState(item.phoneNo);
  const [loading, setLoading] = useState(false);
  let pendingTailorAmount = item.orderAmt - item.advance;
  const [expandedItems, setExpandedItems] = useState(new Set());
  const { measurementFields } = useDressConfig();
  const [visible, setVisible] = useState(false);
  const { notify, updateCache, eligible } = usePubSub();
  const [selectedAddons, setSelectedAddons] = useState([]);
  const orderDeliveryOptions = ['No Alteration', 'Loose or Tight', 'Shoulder mistake', 'Arm hole mistake', 'Measurement mistake (diff in taken vs stitched)', 'Design mismatch (diff in reference vs stitched)', 'Other'];

   useEffect(() => {
		if (route.params?.triggerShare) {
		  //setPhone('xxx');
		  shareOrder1();
		  //setPhone(item.phoneNo);
		  route.params.triggerShare = false;
		}
	}, [route.params?.triggerShare]);
	
	useEffect(() => {
	    if(!isConnected) {
            showErrorMessage("No Internet Connection");
        }
    }, []);
	
	const toggleItemExpansion = useCallback((index) => {
	  setExpandedItems(prev => {
		const newSet = new Set(prev);
		if (newSet.has(index)) {
		  newSet.delete(index);
		} else {
		  newSet.add(index);
		}
		return newSet;
	  });
	}, []);
	
	const shareOrder = async () => {
		try {
		  setLoading(true);
		  const uri = await captureRef(viewRef, {
			format: 'png',
			quality: 0.8,
		  });
		  console.log('Screenshot captured at:', uri);
		  await Sharing.shareAsync(uri);
		} catch (error) {
		  showErrorMessage('Error! Failed to share order details. Please try again.');
		  console.error(error);
		} finally {
			setLoading(false);
		}
	};
	
	const shareOrder1 = useCallback(async () => {
	  setPhone('');
	  
	  // Wait for UI to update
	  await new Promise(resolve => {
		InteractionManager.runAfterInteractions(resolve);
	  });
	  
	  // Capture and share
	  const uri = await captureRef(viewRef, {
			format: 'png',
			quality: 0.8,
		  });
	  await Sharing.shareAsync(uri);
	  setPhone(item.phoneNo);
	}, [item.phoneNo]);
	  
	  const shareImage = useCallback(async (remoteImageUri) => {
		try {
		  const { data, error } = await supabase
			.storage
			.from('order-images/dressImages')
			.createSignedUrl(remoteImageUri, 60);

		  if (error) throw error;
		  const imageUrl = data.signedUrl;

		  // Define the local file path
		  const localUri = FileSystem.documentDirectory + 'shared-image.jpg';

		  // Download the image from the remote URL
		  const response = await FileSystem.downloadAsync(imageUrl, localUri);

		  // Share the downloaded image
		  await Sharing.shareAsync(response.uri);
		} catch (error) {
		  console.error('Error sharing image: ', error);
		}
	  }, []);
	  
	  const ShareIcon = useCallback(props => 
		<Icon {...props} name="share-outline" style={{ width: 24, height: 24 }} />, 
	  []);

	// Replace the existing renderOrderDetailsItem callback with this:
	const renderOrderDetailsItem = useCallback(({ item: dress, index }) => {
		console.log('in renderOrderDetailsItem')
		console.log(item)
	  // Transform the data to match the structure expected by renderOrderItem
	  const transformedItem = {
		dressItemId: item.dressItemId?.[index],
        custId: item.customerId,
        orderStatus: item.orderStatus,
        dressPics: item.dressPics?.[index],
        patternPics: item.patternPics?.[index],
		measurementPics: item.measurementPics?.[index],
        dressType: dress,
        dressSubType: dress === 'Alteration' ? 
          item.alterDressType[index] : 
          (item.dressSubType?.[index] ? `${item.dressSubType[index]} ` : ''),
        stitchingAmt: item.stitchingAmt?.[index] || 0,
        dueDate: item.dueDate?.[index] || new Date(),
        dressGiven: item.dressGiven?.[index] || false,
		frontNeckType: item.frontNeckType?.[index] || null,
		backNeckType: item.backNeckType?.[index] || null,
		sleeveType: item.sleeveType?.[index] || null,
		sleeveLength: item.sleeveLength?.[index] || null,
		frontNeckDesignFile: item.frontNeckDesignFile?.[index] || null,
		backNeckDesignFile: item.backNeckDesignFile?.[index] || null,
		sleeveDesignFile: item.sleeveDesignFile?.[index] || null,
		notes: item.notes?.[index] || '',
        measurementData: item.measurementData?.[index] || {},
		defaultSource: require('../../../assets/empty_dress.png'),
		orderFor: item.associateCustName?.[index] || item.custName,
		oldData: item.oldData,
		extraOptions: item.extraOptions?.[index] || {},
		slots: item.slots?.[index] || {}
	  };

	  return (
		<OrderItemComponent
		  item={transformedItem}
		  index={index}
		  expandedItems={expandedItems}
		  toggleItemExpansion={toggleItemExpansion}
		  measurementFields={measurementFields}
		/>
	  );
	}, [item, expandedItems, measurementFields]);

  // Effect cleanup
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        navigation.navigate('Home');
        return true;
      }
    );

    return () => {
      backHandler.remove();
    };
  }, []);
  
  useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => navigation.navigate('Home')}/>
		  ),
		});
	}, [navigation]);

  const generateBillHTML = (item, qrCode, orderDate) => {
	  console.log(item);
	  console.log('item.slots', item.slots);
	  let extraOptionsTotalAmt = item.orderAmt;
	  
	  const generateDressDetailsRows = () => {
		let rows = '';
		let serialNumber = 1;
		
		let groupedExtraOptions = [];
		if (item.extraOptions) {
		  const optionsMap = {};
		  
		  item.extraOptions.forEach(extraOptionObj => {
			Object.entries(extraOptionObj).forEach(([key, value]) => {
			  const numValue = Number(value) || 0;
			  
			  if (optionsMap[key]) {
				optionsMap[key].count += 1;
				optionsMap[key].groupedAmt += numValue;
			  } else {
				optionsMap[key] = {
				  key: key,
				  count: 1,
				  groupedAmt: numValue
				};
			  }
			});
		  });
		  groupedExtraOptions = Object.values(optionsMap);
		  extraOptionsTotalAmt += groupedExtraOptions.reduce((total, option) => total + option.groupedAmt, 0);
		}
		item.dressType && item.dressType.forEach((dress, index) => {
			console.log('item.expressDuration', item.expressDuration[index]);
		  // Add the main dress row
		  rows += `
			<tr>
			  <td>${serialNumber}</td>
			  <td>${item.dressSubType[index] ?? ''} ${dress}</td>
			  <td>1</td>
			  <td>${item.stitchingAmt[index]}</td>
			  <td>${item.expressDuration[index] ? 'Express' : 'Regular'}</td>
			  <td>${item.expressDuration[index]?.label || ''}</td>
			</tr>
		  `;
		  serialNumber++;
		});
		groupedExtraOptions.forEach(option => {
		  rows += `
			<tr>
			  <td>${serialNumber}</td>
			  <td>${option.key}</td>
			  <td>${option.count}</td>
			  <td>${option.groupedAmt}</td>
			  <td></td>
			  <td></td>
			</tr>
		  `;
		  serialNumber++;
		});

		return rows;
	  };
	  
	  const expressVal = item.expressCharges || Math.max(
		  0,
		  ...(item.expressDuration || [])
			.filter(Boolean)
			.map(obj => obj.price)
		);
	  const totalAmt = expressVal + extraOptionsTotalAmt;
	  console.log('expressVal', expressVal)
	  console.log('totalAmt', totalAmt)
	  
	  // Generate the complete HTML template
	  return `
		<html>
		  <head>
			<style>
			  body {
				font-family: Arial, sans-serif;
				padding: 20px;
			  }
			  
			  .header {
				text-align: center;
				margin-bottom: 20px;
			  }
			  
			  .shop-details {
				text-align: center;
				margin-bottom: 30px;
			  }
			  
			  .customer-details {
				display: flex;
				justify-content: space-between;
				margin-bottom: 20px;
			  }
			  
			  table {
				width: 100%;
				border-collapse: collapse;
				margin-top: 20px;
				margin-bottom: 20px;
			  }

			  th {
				background-color: #f2f2f2;
				font-weight: bold;
			  }

			  th, td {
				border: 1px solid black;
				padding: 8px;
				text-align: left;
			  }
			  
			  .total-amount {
				  background-color: #f2f2f2;
				  padding: 10px;
				  margin-top: 20px;
				  width: 100%;
				  display: table;
				}

				.total-amount-row {
				  display: table-row;
				}

				.total-amount-label {
				  display: table-cell;
				  width: 20%;
				  text-align: left;
				  padding-left: 40px;
				}

				.total-amount-value {
				  display: table-cell;
				  width: 25%;
				  text-align: left;
				}

				/* Add an empty cell for proper alignment */
				.total-amount-empty {
				  display: table-cell;
				  width: 25%;
				}
			  
			  .qr-section {
				text-align: center;
				margin-top: 30px;
			  }
			  
			  .qr-code {
				width: 150px;
				height: 150px;
				margin: 10px auto;
			  }
			  
			  .footer {
				text-align: center;
				margin-top: 40px;
				color: #666;
				font-size: 12px;
			  }
			</style>
		  </head>
		  <body>
			<div class="header">
			  <h1>Bill - Order #${item.orderNo}</h1>
			</div>
			
			<div class="shop-details">
			  <h2>Furyuu Designers</h2>
			  <p>Thaneer Pandhal, 31A, V. K Road, 1st St, Maheshwari Nagar, Coimbatore, Tamil Nadu 641004</p>
			  <p>Ph No.: 7871477077</p>
			</div>
			
			<div class="customer-details">
			  <p>Customer Name: ${item.custName}</p>
			  <p>Phone No: ${item.phoneNo}</p>
			  <p>Order Date: ${orderDate}</p>
			</div>
			
			<table>
			  <thead>
				<tr>
				  <th>Bill No.</th>
				  <th>Dress Item</th>
				  <th>No. of items</th>
				  <th>Stitching Price (Rs.)</th>
				  <th>Delivery Type</th>
				  <th>Express Delivery Days</th>
				</tr>
			  </thead>
			  <tbody>
				${generateDressDetailsRows()}
			  </tbody>
			</table>
			
			<div class="total-amount">
			  <div class="total-amount-row">
				<div class="total-amount-empty"></div>
				<div class="total-amount-label">Total Stitching Charges:</div>
				<div class="total-amount-value">Rs. ${extraOptionsTotalAmt}</div>
			  </div>
			  <div class="total-amount-row">
				<div class="total-amount-empty"></div>
				<div class="total-amount-label">Express Charges:</div>
				<div class="total-amount-value">Rs. ${expressVal}</div>
			  </div>
			  <div class="total-amount-row">
				<div class="total-amount-empty"></div>
				<div class="total-amount-label"><b>Total Amount:</b></div>
				<div class="total-amount-value"><b>Rs. ${totalAmt}</b></div>
			  </div>
			  <br/>
			  <br/>
			  <div class="total-amount-row">
				<div class="total-amount-empty"></div>
				<div class="total-amount-label">Payment status:</div>
				<div class="total-amount-value">${item.paymentStatus}</div>
			  </div>
			  ${item.paymentStatus === 'Partially paid' ? `
				<div class="total-amount-row">
				  <div class="total-amount-empty"></div>
				  <div class="total-amount-label">Advance Paid:</div>
				  <div class="total-amount-value">Rs. ${item.advance}</div>
				</div>
				<div class="total-amount-row">
				  <div class="total-amount-empty"></div>
				  <div class="total-amount-label">Balance Amount:</div>
				  <div class="total-amount-value">Rs. ${pendingTailorAmount}</div>
				</div>
			  ` : ''}
			  <div class="total-amount-row">
				  <div class="total-amount-empty"></div>
				  <div class="total-amount-label">Payment Mode:</div>
				  <div class="total-amount-value">${item.paymentMode || ''}</div>
			  </div>
			</div>
			
			${qrCode ? `
			  <div class="qr-section">
				<h3>Scan QR Code to pay</h3>
				<img src="${qrCode}" alt="QR Code" class="qr-code"/>
			  </div>
			` : ''}
			
			<div class="footer">
			  <p>Thank you!</p>
			</div>
		  </body>
		</html>
	  `;
	};
	
  
   const downloadQrCode = async (fileName) => {
		  let result = null;
		  try {
			const cachedPath = storage.getString(currentUser.username + '_upiQrCode');
			if (cachedPath && (await FileSystem.getInfoAsync(cachedPath)).exists) {
				const base64 = await FileSystem.readAsStringAsync(cachedPath, {
				  encoding: FileSystem.EncodingType.Base64,
				});

				return `data:image/jpeg;base64,${base64}`; 
			} else {
				const { data, error } = await supabase.storage
				  .from('upi-qr-code')
				  .download(fileName);

				if (error) {
				  showErrorMessage('Error downloading image: ' + error.message);
				  return null;
				}

				const fr = new FileReader();
				fr.readAsDataURL(data);
				const frPromise = new Promise((resolve, reject) => {
					fr.onload = () => resolve(fr.result);
					fr.onerror = () => reject(new Error('Failed to read image data'));
				});

				const result = await frPromise;
				
				let localFileUri = await saveSupabaseDataToFile(data, fileName);
				console.log('localfile uri:')
				console.log(localFileUri)
				storage.set(currentUser.username + '_upiQrCode', localFileUri);
				return result;
			}
		  } catch (error) {
			console.error('Error downloading or converting QR code:', error);
			return null;
		  }
	}

  const generateBill = async () => {
	  console.log('in generateBill')
    try {
      setLoading(true);
	  console.log(currentUser.upiQRCode_url)
	  let qrCode = null;
	  if(currentUser.upiQRCode_url) {
		qrCode =  await downloadQrCode(currentUser.upiQRCode_url);
	  }

      const htmlContent = generateBillHTML(item, qrCode, orderDate);
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      const pdfUri = FileSystem.cacheDirectory + 'bill.pdf';
      await FileSystem.moveAsync({ from: uri, to: pdfUri });
      
      const data = await FileSystem.getContentUriAsync(pdfUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { 
        data, 
        flags: 1
      });
    } catch (error) {
      console.error('Error generating bill:', error);
      showErrorMessage('Failed to generate bill: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
	  const toggleAddon = (addon) => {
		console.log('in toggleAddon ', selectedAddons, addon)
		  setSelectedAddons((prev) => {
			if (prev.includes(addon)) {
			  return prev.filter((item) => item !== addon);
			} else {
			  return [...prev, addon];
			}
		  });
	  };
	  
	const saveDeliveryOptions = async() => {
		const { error } = await supabase
				  .from('OrderItems')
				  .update({ deliveryOptions: selectedAddons })
				  .eq('orderNo', item.orderNo)
		if(error) {
			console.error(error);
			showErrorMessage('Error saving delivery options: ' + error);
		} else {
			setVisible(false);
			let cacheKey = item.orderStatus === 'Completed' ? 'Completed_true' : 'Completed_false';
			let updVal = {...item, deliveryOptions: selectedAddons};
			updateCache('UPDATE_ORDER', updVal, cacheKey);
			await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updVal);
			eventEmitter.emit('newOrderAdded');
			generateBill();
		}
	}
  
  return (
    <View style={styles.container} ref={viewRef} collapsable={false}>
            <List
        data={item.dressType}
        renderItem={renderOrderDetailsItem}
        keyExtractor={(_, index) => index.toString()}
        style={{ flex: 1 }}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListHeaderComponent={<CustomerDetails item={item} currentUsername={currentUser.username} phone={phone}/>}
        ListFooterComponent={
          <View style={styles.footer}>
            <PaymentDetails item={item} selectedAddons={selectedAddons}/>
			<Button 
                  status='info' 
                  onPress={() => setVisible(true)} 
                  style={styles.paymentButton}
                >
                  Generate Bill
                </Button>
          </View>
        }
      />
	  
      <Modal
        visible={loading}
        backdropStyle={styles.backdrop}
      >
        <Spinner size="large" status="primary" />
      </Modal>
	      <DeliveryOptionsModal
			visible={visible}
			onClose={() => {setVisible(false); setSelectedAddons([]); generateBill();}}
			selectedAddons={selectedAddons}
			toggleAddon={toggleAddon}
			orderDeliveryOptions={orderDeliveryOptions}
			onSave={saveDeliveryOptions}
		  />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -3
  },
  modalTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
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
  cancelText: {
    textAlign: 'center',
    color: '#FF3D71',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  actionButton: {
    flex: 1,
    margin: 5,
  },
  paymentButton: {
    marginHorizontal: 100,
    marginTop: 20,
	marginBottom: 16,
    borderRadius: 8,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
	  marginBottom: 15
  },
  footer: {
	  marginTop: 15
  },
  paymentModalButton: {
	  flexDirection: 'row',
	  alignItems: 'space-between',
	  gap: 30,
	  marginTop: 10
  },
  navButton: {
	  marginLeft: 20
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
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
  },
  itemInfo: {
    flex: 1,
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
  deliveryOptions: {
	 marginTop: 5
  }
});

export default memo(OrderDetails);