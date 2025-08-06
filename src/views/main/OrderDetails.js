import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Alert, View, TouchableOpacity, StyleSheet, BackHandler, Linking, InteractionManager } from 'react-native';
import { Text, Layout, Button, Modal, Card, Icon, Divider, useTheme, Spinner, TopNavigationAction, List } from '@ui-kitten/components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { useRoute } from '@react-navigation/native';
import { useUser } from '../main/UserContext';
import { useRevenueCat } from '../main/RevenueCatContext';
import { supabase } from '../../constants/supabase';
import { useNetwork } from './NetworkContext';
import { storage } from '../extra/storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { schedulePushNotification } from './notificationUtils';
import { ArrowIosBackIcon } from "../extra/icons";
import OrderDetailsItem from '../main/OrderDetailsItem';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import UPIQRModal from './UPIQRModal';
import eventEmitter from './eventEmitter';
import { saveSupabaseDataToFile } from '../extra/supabaseUtils';
import { logFirebaseEvent } from '../extra/firebaseUtils';

// Memoized components for better performance
const MemoizedOrderDetailsItem = memo(OrderDetailsItem);
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
        label="Order Date" 
        value={item.orderDate} 
      />
    </MemoizedCard>
  </View>
));

const PaymentDetails = memo(({ item }) => (
  <>
    <SectionHeader icon="credit-card-outline" title="Payment Details" />
    <MemoizedCard>
      <DetailRow label="Total Order Amount" value={`Rs. ${parseInt(item.orderAmt)}`} />
      <DetailRow label="Payment Status" value={item.paymentStatus} />
      {item.paymentStatus === 'Partially paid' && (
        <>
          <DetailRow label="Advance paid" value={`Rs. ${item.advance}`} />
          <DetailRow 
            label="Pending Amount" 
            value={`Rs. ${parseInt(item.orderAmt - item.advance)}`} 
          />
        </>
      )}
    </MemoizedCard>
  </>
));

const SubTailorDetails = memo(({ item }) => (
  <View style={{marginTop: 16}}>
    <SectionHeader icon="person-outline" title="Order assigned to" />
    <MemoizedCard>
      <DetailRow label="Worker name" value={item.subTailorName} />
      <DetailRow label="Worker Phone Number" value={item.subTailorPhNo?.includes('+91') ? item.subTailorPhNo?.substring(3) : item.subTailorPhNo} />
      <DetailRow label="Worker Due Date" value={item.subTailorDueDate} />
    </MemoizedCard>
  </View>
));

const WorkerDetails = memo(({ item }) => (
  <View style={{marginTop: 16}}>
    <SectionHeader icon="person-outline" title="External tailors/embroiderers" />
    <MemoizedCard>
      <DetailRow label={`${item.workerType} Name`} value={item.workerName} />
      <DetailRow label={`${item.workerType} Phone Number`} value={item.workerPhNo?.includes('+91') ? item.workerPhNo?.substring(3) : item.workerPhNo} />
      <DetailRow label={`${item.workerType} Due Date`} value={item.workerDueDate} />
    </MemoizedCard>
  </View>
));

const OrderDetails = ({ navigation }) => {
  const route = useRoute();
  const { currentUser } = useUser();
  const { subscriptionActive } = useRevenueCat();
  const { isConnected } = useNetwork();
  const theme = useTheme();
  const viewRef = useRef(null);
  const { item, userType, orderDate, shopName, shopAddress, shopPhNo, isShareIntent, custUsername, orderDetails } = route.params;
  console.log(item)
  const [phone, setPhone] = useState(item.phoneNo);
  const [loading, setLoading] = useState(false);
  const [upiModal, setUpiModal] = useState(false);
  let pendingTailorAmount = item.orderAmt - item.advance;
  
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


  const renderOrderDetailsItem = useCallback(({ item: dress, index }) => {
    const measurementsObj = {
      frontNeck: item.frontNeck[index],
      backNeck: item.backNeck[index],
      shoulder: item.shoulder[index],
      sleeve: item.sleeve[index],
	  AHC: item.AHC?.[index],
	  shoulderToWaist: item.shoulderToWaist?.[index],
      chest: item.chest[index],
      waist: item.waist[index],
      hip: item.hip[index],
      leg: item.leg[index],
      topLength: item.topLength[index],
      bottomLength: item.bottomLength[index]
    };

    return (
      <MemoizedOrderDetailsItem
        style={styles.item}
        dressItemId={item.dressItemId?.[index]}
        custId={item.customerId}
        orderStatus={item.orderStatus}
        imageSource1={item.dressPics?.[index]}
        imageSource2={item.patternPics?.[index]}
        dressType={dress}
        dressSubType={dress === 'Alteration' ? 
          item.alterDressType[index] : 
          (item.dressSubType?.[index] ? `${item.dressSubType[index]} ` : '')}
        amt={item.stitchingAmt?.[index] || 0}
        dueDate={item.dueDate?.[index] || new Date()}
        dressGiven={item.dressGiven?.[index] || false}
		frontNeckType={item.frontNeckType?.[index] || null}
		backNeckType={item.backNeckType?.[index] || null}
		sleeveType={item.sleeveType?.[index] || null}
		sleeveLength={item.sleeveLength?.[index] || null}
		frontNeckDesignFile={item.frontNeckDesignFile?.[index] || null}
		backNeckDesignFile={item.backNeckDesignFile?.[index] || null}
		sleeveDesignFile={item.sleeveDesignFile?.[index] || null}
		notes={item.notes?.[index] || ''}
        measurementsObj={measurementsObj}
        extraMeasurements={item.extraMeasurements?.[index] || null}
		defaultSource={require('../../../assets/empty_dress.png')}
		orderFor={item.associateCustName?.[index] || item.custName}
      />
    );
  }, [item]); // Dependencies

  // Use lazy loading for images and other heavy content
  const loadImages = useCallback(async () => {
    // Implement lazy loading logic
  }, []);

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

  const generateBillHTML = (item, qrCode, shopName, shopAddress, shopPhNo, orderDate) => {
	  // Generate table rows for dress details
	  const generateDressDetailsRows = () => {
		let rows = '';
		item.dressDetailsAmt && item.dressDetailsAmt.forEach((dress, index) => {
		  rows += `
			<tr>
			  <td>${index + 1}</td>
			  <td>${dress.key}</td>
			  <td>${dress.count}</td>
			  <td>${dress.groupedAmt}</td>
			</tr>
		  `;
		});
		return rows;
	  };

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
			  <h1>Bill - Order #${item.tailorOrderNo}</h1>
			</div>
			
			<div class="shop-details">
			  <h2>${shopName}</h2>
			  <p>${shopAddress}</p>
			  <p>Ph No.: ${shopPhNo}</p>
			</div>
			
			<div class="customer-details">
			  <p>Customer Name: ${item.custName}</p>
			  <p>Order Date: ${orderDate}</p>
			</div>
			
			<table>
			  <thead>
				<tr>
				  <th>Bill No.</th>
				  <th>Dress Item</th>
				  <th>No. of items</th>
				  <th>Stitching Price (Rs.)</th>
				</tr>
			  </thead>
			  <tbody>
				${generateDressDetailsRows()}
			  </tbody>
			</table>
			
			<div class="total-amount">
			  <div class="total-amount-row">
				<div class="total-amount-empty"></div>
				<div class="total-amount-label">Total Amount:</div>
				<div class="total-amount-value">Rs. ${item.orderAmt}</div>
			  </div>
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
			</div>
			
			${qrCode ? `
			  <div class="qr-section">
				<h3>Scan QR Code to pay</h3>
				<img src="${qrCode}" alt="QR Code" class="qr-code"/>
			  </div>
			` : ''}
			
			<div class="footer">
			  <p>Thank you!</p>
			  <p>Powered by Thaiyal Business</p>
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
	  logFirebaseEvent('bill_generation');
      let qrCode = null;
	  if(currentUser.upiQRCode_url) {
		qrCode =  await downloadQrCode(currentUser.upiQRCode_url);
	  }

      const htmlContent = generateBillHTML(item, qrCode, shopName, shopAddress, shopPhNo, orderDate);
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
  
	const rejectAlert = (navigation) => {
		if(item.orderStatus === 'Created') {
			showErrorMessage('Order already accepted!');
		} else {
			Alert.alert(
				"Confirmation", "Do you want to reject this order?",
				[
					{
						text: 'Cancel',
						onPress: () => console.log("Cancel"),
						style: "cancel",
					},
					{
						text: 'OK',
						onPress: () => handleDeleteOrder()
					}
				],
				{cancelable: true}
			)
		}
    }
  
  const handleDeleteOrder = async () => {
    try {
      setLoading(true);
	  logFirebaseEvent('order_rejected');
	  console.log('in handleDeleteOrder: ' + item.orderNo)
		  
	  const {data, error} = await supabase
		  .from('OrderItems')
		  .delete()
		  .eq('orderNo', item.orderNo)
		  .eq('orderStatus', 'Requested')
		  .select()

		if (error) {
		  console.error('Deletion failed:', error);
		  throw error;
		} else if(data.length === 0) {
			showErrorMessage('No matching order found!')
			return;
		}
		const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(item.dressPics.flat().map(filename => `dressImages/${filename}`))
								if(errorRemove) {
									throw errorRemove;
								}
			const { dataRemove1, errorRemove1 } = await supabase
								  .storage
								  .from('order-images')
								  .remove(item.patternPics.flat().map(filename => `patternImages/${filename}`))
								if(errorRemove1) {
									throw errorRemove1;
								}
			showSuccessMessage('Order Rejected!');
			const title = 'Order Rejected!'
			const body = 'Your order for ' + orderDetails + ' has been rejected by tailor shop ' + currentUser.ShopDetails.shopName + '.';
			let a = await sendNotifToCust(title, body);
			eventEmitter.emit('storageUpdated');
			eventEmitter.emit('newOrderAdded');
			navigation.goBack();
		
    } catch (error) {
      showErrorMessage('Failed to delete the order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptOrder = async() => {
	  try {
		setLoading(true);
		logFirebaseEvent('order_accepted');
		const { data, error } = await supabase
			  .from('OrderItems')
			  .select('orderStatus')
			  .eq('orderNo', item.orderNo);
		if(error) {
			throw error;
		}
		console.log('data in handleAcceptOrder:')
		console.log(data)
		if(data.length === 0) {
			showErrorMessage('No matching order found!');
		} else if(data[0].orderStatus === 'Created') {
			showErrorMessage('Order already accepted!');
		} else {
			const { data: data1, error: error1 } = await supabase
			  .from('OrderItems')
			  .update({ shopId: currentUser.ShopDetails.id, username: currentUser.username, orderStatus: 'Created'})
			  .eq('orderNo', item.orderNo)
			  .select()
			  .single();
			if(error1) {
				throw error1;
			}
			console.log(data1)
			let ud = item;
			const updatedItem = { ...ud, username: currentUser.username, shopId: currentUser.ShopDetails.id, orderStatus: 'Created', tailorOrderNo: data1.tailorOrderNo };
	  
		  const title = 'Order Accepted!'
		  const body = 'Your order for ' + orderDetails + ' has been accepted by tailor shop ' + currentUser.ShopDetails.shopName + '. Order no is #' + data1.tailorOrderNo;
		  let a = await sendNotifToCust(title, body);
		  let arrayA = JSON.parse(storage.getString(currentUser.username+'_Created') || '[]');
			let arrayB = [updatedItem, ...arrayA];
			let bStr = JSON.stringify(arrayB)						
			showSuccessMessage('Order Accepted!');
			storage.set(currentUser.username+'_Created', bStr);
			
			/*if(custUsername) {
				let arrayC = JSON.parse(storage.getString(custUsername+'_Created') || '[]');
				const orderIndex = arrayC?.findIndex(order => order.orderNo === item.orderNo);
				  if (orderIndex && orderIndex !== -1) {
					arrayC[orderIndex].orderStatus = 'Created';
					storage.set(custUsername+'_Created', JSON.stringify(arrayC));
					console.log("Updated cacheValue stored successfully.");
				  }
			}*/
			//below lines are causing readorderitems context and hence OrderBagScreen to be called repeatedly
			eventEmitter.emit('storageUpdated');
			eventEmitter.emit('newOrderAdded');
			navigation.navigate('OrderDetailsMain', {screen: 'EditOrderDetails',
						params: { item: updatedItem, userType: currentUser.userType, orderDate: updatedItem.orderDate || new Date(), shopName: currentUser.ShopDetails.shopName, shopAddress: currentUser.ShopDetails.shopAddress, shopPhNo: currentUser.ShopDetails.shopPhNo, isShareIntent: false }
				});
		}
	  } catch(error) {
		  console.log(error)
	  } finally {
		  setLoading(false);
	  }
  }

  const sendNotifToCust = async (title, body) => {
				const { data, error } = await supabase
											  .from('profiles')
											  .select(`username, pushToken`)
											  .eq('username', custUsername)
											  .maybeSingle();
					if (error) {
						console.log(error)
						return false;
					} else {
						console.log(data);
						if(data && data.pushToken) {
							await schedulePushNotification(data.pushToken, data.username, title, body, {});
						}
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
            <PaymentDetails item={item} />
			<SubTailorDetails item={item} />
			{item.workerType && <WorkerDetails item={item} />}
            
            {custUsername ? (
              <Layout style={styles.buttonContainer}>
                <Button 
                  status="success" 
                  style={styles.actionButton} 
                  onPress={handleAcceptOrder}
                >
                  Accept
                </Button>
                <Button 
                  status="danger" 
                  style={styles.actionButton} 
                  onPress={() => rejectAlert(navigation)}
                >
                  Reject
                </Button>
              </Layout>
            ) : (
                <Button 
                  status='info' 
                  onPress={() => currentUser.upiQRCode_url ? generateBill() : setUpiModal(true)} 
                  style={styles.paymentButton}
                >
                  Generate Bill
                </Button>
            )}
          </View>
        }
      />
	  
	  <UPIQRModal
        visible={upiModal}
        onCloseUpi={() => {setUpiModal(false); generateBill();}}
		currentUser={currentUser}
      />

      <Modal
        visible={loading}
        backdropStyle={styles.backdrop}
      >
        <Spinner size="large" status="primary" />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
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
});

export default memo(OrderDetails);