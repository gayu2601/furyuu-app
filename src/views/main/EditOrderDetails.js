import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, View, TouchableOpacity, ScrollView, StyleSheet, Image, Dimensions, BackHandler } from 'react-native';
import {
  Input,
  Text, Layout,
  Select, SelectItem,
  IndexPath, useTheme, Datepicker,
  RadioGroup, Radio, Button, Icon, Modal, Spinner, Card, Divider, TopNavigationAction, List
} from '@ui-kitten/components';
import { FontAwesome } from '@expo/vector-icons';
import moment from 'moment';
import { useRoute } from '@react-navigation/native';
import useDressConfig from './useDressConfig';
import { useUser } from '../main/UserContext';
import { useSlotBooking } from '../main/SlotBookingContext';
import { useNetwork } from '../main/NetworkContext';
import EditOrderItemComponent from '../main/EditOrderItemComponent';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import {
  PhoneIcon,
} from '../extra/icons';
import { ArrowIosBackIcon } from "../extra/icons";
import eventEmitter from './eventEmitter';
import { usePubSub } from './SimplePubSub';

const EditOrderDetails = ({ navigation }) => {
	const route = useRoute();
	const theme = useTheme();
		const { notify, updateCache, eligible } = usePubSub();
	  const [formData, setFormData] = useState({
    dressItems: [],
  });
  const { clearAllBookings } = useSlotBooking();
    const { measurementFields } = useDressConfig();
  const [expandedItems, setExpandedItems] = useState(new Set());
  let aroute = {...route?.params};
  const {currentUser} = useUser();
  const {isConnected} = useNetwork();
	const { item, userType, orderDate, shopName, shopAddress, shopPhNo, isShareIntent } = route.params
	console.log('item in editorderdetails:')
	console.log(item)
    const [loading, setLoading] = useState(false)
  const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
  const payModes = ['Cash', 'Credit/Debit Card', 'UPI', 'Net-banking'];
	const [payStatusIndex, setPayStatusIndex] = useState(item.paymentStatus ? payStatuses.indexOf(item.paymentStatus) : 0); 
  const [payStatus, setPayStatus] = useState(item.paymentStatus || 'Pending'); 
  const [advancePaid, setAdvancePaid] = useState(item.advance || 0)
	const itemRefs = useRef({});
	const [inCustom, setInCustom] = useState(false);
	const [orderAmtChanged, setOrderAmtChanged] = useState(false);
	const [paymentMode, setPaymentMode] = useState(item.paymentMode || 'Cash');
  const [payModeIndex, setPayModeIndex] = useState(item.paymentMode ? payModes.indexOf(item.paymentMode) : 0);
  const [editCust, setEditCust] = useState(false);
  const [phChanged, setPhChanged] = useState(false);
  const [custName, setCustName] = useState(item.custName);
  const [phoneNo, setPhoneNo] = useState(item.phoneNo);
  const [customerId, setCustomerId] = useState(item.customerId);
  const cacheKey = item.orderStatus === 'Completed' ? 'Completed_true' : 'Completed_false';
  
	useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				if (inCustom) {
					console.log('inCustom true');
				  navigation.navigate('EditOrderDetails', {...route.params});
				  setInCustom(false);
				} else {
					clearAllBookings();
					let ph = phoneNo.includes('+91') ? phoneNo : '+91'+phoneNo;
					const updatedItem = {
					  ...item,
					  custName: custName,
					  phoneNo: ph,
					  customerId: customerId
					};
					console.log('updatedItem', updatedItem);
					console.log(route.params);
				  navigation.navigate('OrderDetails', {...route.params, item: updatedItem })
				}
			}}/>
		  ),
		});
	  }, [navigation, inCustom, custName, phoneNo, customerId]);
	
	useEffect(() => {
		const backAction = () => {
			if (inCustom) {
				console.log('inCustom true');
			  navigation.navigate('EditOrderDetails', {...route.params});
			  setInCustom(false);
			  return true; // Prevent further back action
			} else {
				clearAllBookings();
				console.log('inside backAction')
				let ph = phoneNo.includes('+91') ? phoneNo : '+91'+phoneNo;
				console.log(custName, ph);
				const updatedItem = {
				  ...item,
				  custName: custName,
				  phoneNo: ph,
				  customerId: customerId
				};
				console.log('updatedItem', updatedItem);
				console.log(route.params);
			  navigation.replace('OrderDetails', {...route.params, item: updatedItem })
			  return true;
			}
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, [inCustom, custName, phoneNo, customerId]);
	
  useEffect(() => {
	  if(!isConnected) {
			 showErrorMessage("No Internet Connection");
	  }
	}, []);
	
  const handlePayStatusSelect = (index) => {
		setPayStatusIndex(index);
		setPayStatus(payStatuses[index]);
		if(index < 2) {
			setAdvancePaid(item.advance || 0);
		}
		handleInputChange('componentA', 'paymentStatus', payStatuses[index]);
	};
	
	
	const handlePayModeSelect = (index) => {
		setPayModeIndex(index);
		setPaymentMode(payModes[index]);
		handleInputChange('componentA', 'paymentMode', payModes[index]);
	};
	
	const DateIcon = (style: ImageStyle): IconElement => {
	  const theme = useTheme();
	  return (
		<Icon {...style} name='calendar-outline' fill={theme['color-primary-100']}/>
	  )
	};
	
	const handleInputChange = (dressItemId, fieldName, value) => {
		console.log(fieldName)
		console.log(value)
	  setFormData((prevData) => {
		if (dressItemId === 'componentA') {
		  // Handle normal fields in ComponentA
		  return {
			...prevData,
			[fieldName]: value
		  };
		} else {
		  // Handle fields in dressItems (for ComponentB)
		  const dressIndex = prevData.dressItems?.findIndex(
			(item) => item.dressItemId === dressItemId
		  );
		  
		  let updatedDressItems;

		  if (dressIndex !== -1) {
			const currentDress = prevData.dressItems[dressIndex];
			
			let updatedDress;
			
			if (fieldName.includes('_measurement')) {
			  updatedDress = {
				...currentDress,
				measurements: {
				  ...currentDress.measurements,
				  [fieldName]: value
				}
			  };
			} else {
			  updatedDress = {
				...currentDress,
				[fieldName]: value
			  };
			}

			updatedDressItems = [
			  ...prevData.dressItems.slice(0, dressIndex),
			  updatedDress,
			  ...prevData.dressItems.slice(dressIndex + 1)
			];
		  } else {
			  // Add new dress item if not found
			  if (fieldName.includes('_measurement')) {
				const newDress = {
				  dressItemId: dressItemId,
				  dressType: item.dressType[index1],
				  dressSubType: item.dressSubType[index1],
				  measurements: {
					[fieldName]: value
				  }
				};

				updatedDressItems = [...prevData.dressItems, newDress];
			  } else {
				  // Update other fields if not measurements
				  const index1 = item.dressItemId?.findIndex(
					(id) => id === dressItemId
				  );
				  console.log('index1:')
				  console.log(index1)
				  const newDress = {
					  dressItemId: dressItemId,
					  dressType: item.dressType[index1],
					  dressSubType: item.dressSubType[index1],
					  [fieldName]: value
					};

					updatedDressItems = [...prevData.dressItems, newDress];
			}
		  }

		  return {
			...prevData,
			dressItems: updatedDressItems
		  };
		}
	  });
	};
  
	function isNotBase64(str) {
	  // Check if the string is empty or has invalid characters for Base64
	  if (!str || typeof str !== 'string') {
		return true; // Not Base64 if it's not a string or is empty
	  }

	  // Regular expression to check for valid Base64 encoding
	  const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;

	  return !base64Regex.test(str); // Return true if it does NOT match Base64 format
	}

	function startsWithFile(str) {
	  return typeof str === 'string' && str.startsWith("file");
	}
	
	const getPicFolder = (type) => {
		switch(type) {
			case 'dressPics':
				return 'dressImages';
			case 'patternPics':
				return 'patternImages';
			case 'measurementPics':
				return 'measurementImages';
		}
	}

	const uploadOrderImages = async(picType, pics) => {
		console.log('in uploadOrderImages')
		console.log(pics)
		let orderPicsString = null;
		const folderName = getPicFolder(picType);
		let uploadedImages = [];
		await Promise.all(
							pics.map(async(pic, index) => {
								if(startsWithFile(pic)) {
									const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer())
								  const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg'
								  const path = `${Date.now()}.${fileExt}`
									orderPicsString += path + ',';
									const { data, error: uploadError } = await supabase.storage
									.from('order-images/' + folderName)
									.upload(path, arraybuffer, {
									  contentType: 'image/jpeg',
									})

								  if (uploadError) {
									  console.log(pic.uri);
									  console.log(uploadError);
									  throw uploadError;
								  }
								  uploadedImages.push(path);
								} else if(pic){
									uploadedImages.push(pic.split('/').pop());
								}
							})
						);
		if (uploadedImages.length > 0) {
			orderPicsString = uploadedImages.join(','); // Convert array to comma-separated string
		}
		console.log('orderPicsString:')
		console.log(orderPicsString);
		return orderPicsString;
	}
	
	const uploadDesignFile = async(itemLocal, fileType) => {
		let path = null;
		if(itemLocal[fileType]) {
			const arraybuffer = await fetch(itemLocal[fileType]).then((res) => res.arrayBuffer())
			const fileExt = itemLocal[fileType]?.split('.').pop()?.toLowerCase() ?? 'jpeg'
			path = `${Date.now()}.${fileExt}`
			const { data, error: uploadError } = await supabase.storage
									.from('design-files/' + fileType)
									.upload(path, arraybuffer, {
									  contentType: 'image/jpeg',
									})

			if (uploadError) {
				console.log(uploadError);
				return null;
			}
		}
		const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('design-files')
								  .remove([`${fileType}/${item[fileType]}`])
								if(errorRemove) {
									throw errorRemove;
								}
		return path;
	}
	
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
	
	const renderEditOrderDetailsItem = useCallback(({ item: dress, index }) => {
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
        measurementsObj: item.measurementData?.[index] || {},
		defaultSource: require('../../../assets/empty_dress.png'),
		orderFor: item.associateCustName?.[index] || item.custName,
		oldData: item.oldData,
		extraOptions: item.extraOptions?.[index] || {},
		slots: item.slots?.[index] || {},
		orderNo: item.orderNo
	  };
	  console.log(transformedItem)

	  return (
		<EditOrderItemComponent
		  item={transformedItem}
		  index={index}
		  expandedItems={expandedItems}
		  toggleItemExpansion={toggleItemExpansion}
		  measurementFields={measurementFields}
		  editRouteParams={aroute}
		  ref={el => itemRefs.current[transformedItem.dressItemId] = el}
		  setOrderAmtChanged={setOrderAmtChanged}
		/>
	  );
	}, [item, expandedItems, measurementFields]);

	const summarizeExpressDuration = (slotsObj) => {
	  let minDuration = Infinity;
	  let finalDuration = null;
	  
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
  
  const saveEditedOrder = async() => {
	    if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		} else {
		  try {
			  clearAllBookings();
			  setLoading(true);
			// Loop through refs to get data from each item component
			console.log(itemRefs)
			const dressItemIds = Object.keys(itemRefs.current);
			console.log(dressItemIds)
			const updatedDressItems = dressItemIds.map(dressItemId => {
			  const ref = itemRefs.current[dressItemId];
			  console.log(ref)
			  if (ref && typeof ref.getSaveData === 'function') {
				let aa = ref.getSaveData();
				console.log('aa:')
				console.log(aa)
				return aa; 
			  }
			  return null;
			}).filter(Boolean); // Remove any null results
			
			console.log("Updated dress items:", updatedDressItems);
			
			// Update form data with all collected changes
			const updatedFormData = {
			  ...formData,
			  dressItems: updatedDressItems
			};
			setFormData(updatedFormData);
			
			console.log("Saving order data:")
			console.log(updatedFormData);
			console.log(advancePaid + ',' + payStatus)

			let totalAmt = updatedFormData.dressItems
			  .map(it => {
				// Get stitching amount
				const stitchingAmount = parseInt(it.stitchingAmt) || 0;
				
				// Calculate sum of all extraOptions values
				let extraOptionsSum = 0;
				if (it.extraOptions && typeof it.extraOptions === 'object') {
				  extraOptionsSum = Object.values(it.extraOptions).reduce((sum, value) => {
					return sum + (parseInt(value) || 0);
				  }, 0);
				}
				
				return stitchingAmount + extraOptionsSum;
			  })
			  .reduce((acc, curr) => acc + curr, 0);

				let adv = parseInt(advancePaid);
			  	let payStatusLocal = payStatus;
			  const { error } = await supabase
				  .from('OrderItems')
				  .update({ orderAmt: totalAmt, paymentStatus: payStatusLocal, advance: adv, paymentMode: paymentMode })
				  .eq('orderNo', item.orderNo)
				
				if(orderAmtChanged) {
					eventEmitter.emit('transactionAdded');
					eventEmitter.emit('payStatusChanged');
				}

			  if(error) {
				  console.log(error);
				  throw error;
			  }
			  
						const jsonCacheValue = storage.getString(cacheKey);
						const cacheValue = jsonCacheValue ? JSON.parse(jsonCacheValue) : null;
						
						let egVal = cacheValue?.filter(order => {
								return order.orderNo === item.orderNo;
							});
						let updVal = egVal[0]
						console.log(updVal)
						updVal['orderAmt'] = parseInt(totalAmt);
						updVal['paymentStatus'] = payStatusLocal;
						updVal['advance'] = parseInt(adv);
						updVal['paymentMode'] = paymentMode;
				
				  const dressItemsLocal = updatedFormData.dressItems;
				  let dueDateChanged = false;
					for (const ditem of dressItemsLocal) {
						console.log('ditem: ')
						console.log(ditem)
						let ind = updVal.dressItemId.indexOf(ditem.dressItemId)
						console.log(ind)
				    
					  let updateData = {};
					  let finalDurationVal = null;
					  for (const key in ditem) {
						  if (Object.prototype.hasOwnProperty.call(ditem, key)) {
							if (['dressPics', 'patternPics','measurementPics'].includes(key)) {
								let picsDbFinal = await uploadOrderImages(key, ditem[key]);
								updateData[key] = picsDbFinal;
								updVal[key][ind] = picsDbFinal?.split(',') || null;
							} else if (key === 'deletedPics') {
								const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(ditem.deletedPics.map(filename => `dressImages/${filename}`))
								if(errorRemove) {
									throw errorRemove;
								}
							} else if (key === 'deletedPatternPics' || key === 'deletedMeasPics') {
								let imgFolderName = key === 'deletedPatternPics' ? 'patternImages' : 'measurementImages';
								const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(ditem[key].map(filename => `${imgFolderName}/${filename}`))
								if(errorRemove) {
									throw errorRemove;
								}
							} else if(['frontNeckDesignFile', 'backNeckDesignFile', 'sleeveDesignFile'].includes(key)) {
								console.log('uploading ' + key)
								let aa = await uploadDesignFile(ditem, key)
								console.log(aa)
								updateData[key] = aa;
								updVal[key][ind] = aa;
							} else if (!['measurementsObj', 'dressItemId', 'dressType', 'dressSubType', 'slotsDiff'].includes(key)) {
								console.log(key)
								console.log(ditem[key])
								updateData[key] = ditem[key];
								if(key !== 'slotDates') {
									updVal[key][ind] = ditem[key];
								}
							}
							if(key === 'dueDate' && !dueDateChanged) {
								console.log('setting dueDateChanged')
								dueDateChanged = true;
							}
							if(key === 'slots') {
								finalDurationVal = summarizeExpressDuration(ditem[key]);
								updateData['expressDuration'] = finalDurationVal;
								updVal['expressDuration'][ind] = finalDurationVal;
							}
							if(key === 'slotsDiff') {
								const rowsToInsert = Object.entries(ditem[key]).map(([slot_date, { regular, express, total }]) => ({
								  slot_date,
								  regular_slots_booked: regular,
								  express_slots_booked: express,
								  total_slots_booked: total,
								}));
								const { data: dataSlots, error: errorSlots } = await supabase
									.rpc('upsert_delivery_slots', { 
										rows_data: rowsToInsert 
									});
								if (errorSlots) {
								  console.error("Insert error:", errorSlots);
								} else {
								  console.log("Inserted slots:", dataSlots);
								}
							}
						  }
					  }
					  
					  const { data, error } = await supabase
						.from('DressItems')
					    .update(updateData)
						.eq('id', ditem.dressItemId)
						.select();
						if(error) {
							throw error;
						}
						
					  if (ditem.measurementsObj) {
						  console.log('in ditem measurementsObj')
						  /*let cacheValueMeas = null;
						  if(!item['associateCustName'][ind]) {
							  let jsonCacheValueMeas = storage.getString(item.phoneNo +'_'+ ditem.dressType)
							  cacheValueMeas = jsonCacheValueMeas ? JSON.parse(jsonCacheValueMeas) : null
							  console.log(cacheValueMeas)
						  }*/
						  
						  console.log('edit measurementsObj save')
						  updVal['measurementData'][ind] = {...updVal['measurementData'][ind], ...ditem.measurementsObj, ...ditem.extraMeasurements};
						  	if(ditem.newExtraMeas) {
								const rowsToInsert = ditem.newExtraMeas.map(fieldKey => ({
										username: currentUser.username,
										dress_type: fieldKey.dressType,
										field_key: fieldKey.value
									  }));

									  const {error: error2} = await supabase
										.from('dress_extra_measurement_fields')
										.upsert(rowsToInsert);
										
									  await refresh();
										
									  if (error2) {
										console.error('Error inserting extra measurements:', error2);
									  }
							}
						  
						  /*for (const key in ditem.measurements) {
							console.log(key)
							console.log(ditem.measurements[key])
							if (Object.prototype.hasOwnProperty.call(ditem.measurements, key)) {
								console.log(key)
								console.log(ditem.measurements[key])
								let val = ditem.measurements[key];
								if(key !== 'extraMeasurements') {
									val = parseInt(ditem.measurements[key] ? ditem.measurements[key] : 0);
								}
							  updateData1[key] = val;
							  if(!item['associateCustName'][ind] && cacheValueMeas) {
								cacheValueMeas[key] = val;
							  } else if(!cacheValueMeas) {
								  cacheValueMeas = {};
								  cacheValueMeas[key] = val;
							  }
							  if(updVal[key]) {
								  updVal[key][ind] = val;
							  } else {
								updVal[key] = [];
								updVal[key][ind] = val;
							  }
							}
						  }
						  console.log(updateData1)*/
						  console.log('updVal meas', {...updVal['measurementData'][ind], ...ditem.measurementsObj});
						  const { error: error1 } = await supabase
							  .from('measurements_new')
							  .update({measurement_data: {...updVal['measurementData'][ind], ...ditem.measurementsObj} })
							  .eq('dress_type', ditem.dressType)
							  .eq('customer_id', item.customerId)
							  .eq('dress_item_id', ditem.dressItemId);
						  if(error1) {
							  throw error1;
						  }
						  console.log(`Updated Measurements: ${ditem.dressItemId}`);
					  }
					}
					
					console.log('updVal:')
					console.log(updVal)
					
					updateCache('UPDATE_ORDER', updVal, cacheKey);    
					await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updVal);
					
					console.log('All updates complete.');
					showSuccessMessage('Order saved!')
					eventEmitter.emit('newOrderAdded');
					if(dueDateChanged) {
						console.log('firing event emitter')
						eventEmitter.emit('storageUpdated');
					}
					navigation.navigate('OrderDetailsMain', {screen: 'OrderDetails',
						params: {
							item: updVal,
							userType: userType,
							orderDate: orderDate,
							shopName: shopName,
							shopAddress: shopAddress,
							shopPhNo: shopPhNo,
							isShareIntent: isShareIntent
						}
					});
				
			} catch (error) {
				console.error('Error while updating dress items:', error);
				showErrorMessage('Error while updating dress items:' + error);
			} finally {
				setLoading(false);
			}
		}
  }
  
  function isValidPhoneNumber(phoneNo) {
		  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
		  return phoneRegex.test(phoneNo);
	}
  
  const saveCustDetails = async() => {
	try {
		const isValid = isValidPhoneNumber(phoneNo)
		if(!phChanged && !isValid) setEditCust(false);
		let custId = null;
		let ph = phoneNo.includes('+91') ? phoneNo : '+91'+phoneNo;
		const { data, error } = await supabase
					.from("Customer")
					.select("id")
					.eq('phoneNo', ph)
					.maybeSingle();
		console.log(custName, ph);
		if(!data) {
			const {data: dataUser, error: errorUser } = await supabase
			  .from('Customer')
			  .insert({ custName: custName || item.custName, phoneNo: ph })
			  .select().single();

			if(errorUser) {
				throw errorUser;
			}
										
			console.log(dataUser)
			custId = dataUser.id;
		} else {
			custId = data.id;
		}
		const { error: error1 } = await supabase
					  .from('OrderItems')
					  .update({ customerId: custId })
					  .eq('orderNo', item.orderNo);
			if(error1) {
				throw error1;
			}
			await Promise.all(
			  item.dressItemId.map(async (id) => {
				const { error: error2 } = await supabase
				  .from('measurements_new')
				  .update({ customer_id: custId })
				  .eq('dress_item_id', id);
				if (error2) {
				  throw error2;
				}
			  })
			);
		setCustomerId(custId);
		let updVal = {...item, custName: custName, phoneNo: ph, customerId: custId};
		updateCache('UPDATE_ORDER', updVal, cacheKey);
		await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updVal);
		eventEmitter.emit('newOrderAdded');

		showSuccessMessage('Saved customer details successfully!')
		setEditCust(false);
		setPhChanged(false);
		console.log('saved cust details', custName, phoneNo);
	} catch(error) {
		showErrorMessage('Error saving customer details: ' + error);
		console.error(error)
	}
  }
  
  const EditIcon = (props) => <Icon {...props} name="edit-outline" />;
  
  return (
  <ScrollView keyboardShouldPersistTaps="handled">
    <View style={styles.container}>
		<View style={styles.sectionHeader1}>
			<View style={styles.sectionHeader}>
				<Icon style={styles.icon} fill={theme['color-primary-500']} name="person-outline" />
				<Text category="h6" style={styles.headerText}>
				  Customer Details
				</Text>
			  </View>
			<Button
					size='medium'
					appearance='ghost'
					accessoryLeft={EditIcon}
					onPress={() => setEditCust(true)}
				/>
		</View>
			  <Card style={styles.cardFinal}>
				<View style={styles.detailRow}>
				  <Text category="label">
					Name
				  </Text>
				  {editCust ? <Input
					value={custName}
					onChangeText={(text) => {
						setCustName(text);
					}}
				  /> : <Text category="s2">{custName}</Text>}
				</View>
				<View style={styles.detailRow}>
				  <Text category="label">
					Phone No
				  </Text>
				  {editCust ? <Input
					value={phoneNo}
					onChangeText={(text) => {
						setPhoneNo(text);
						setPhChanged(true);
					}}
					keyboardType='phone-pad'
					maxLength={13}
				  /> : <Text category="s2">{phoneNo}</Text>}
				</View>
				<View style={styles.detailRow}>
				  <Text category="label">
					Order Date
				  </Text>
				  <Text category="s2">{orderDate}</Text>
				</View>
				{editCust && (
				<View style={{flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 5, marginHorizontal: 75}}>
					<Button size='small' onPress={saveCustDetails}>Save</Button>
					<Button size='small' onPress={() => setEditCust(false)}>Cancel</Button>
				</View>
				)}
			  </Card>
			
		<Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
				<Icon style={styles.icon} fill={theme['color-primary-500']} name="shopping-bag-outline" />
				<Text category="h6" style={styles.headerText}>
				  Order Details
				</Text>
		</View>
	  
		<List
		  data={item.dressType}
		  renderItem={renderEditOrderDetailsItem}
		  keyExtractor={(dress, index) => index.toString()}
		  style={{ flex: 1 }}
		/>
		
		<Divider style={styles.divider} />
      <View style={styles.sectionHeader}>
        <Icon style={styles.icon} fill={theme['color-primary-500']} name="credit-card-outline" />
        <Text category="h6" style={styles.headerText}>
          Payment Details
        </Text>
      </View>
      <Card style={styles.cardFinal}>
        <View style={styles.detailRow}>
          <Text category="label">
            Total Order Amount
          </Text>
          <Text category="label">Rs. {item.orderAmt}</Text>
        </View>
        <View>
          <Text category="label">
            Payment Status
          </Text>
            <RadioGroup
					selectedIndex={payStatusIndex}
					onChange={handlePayStatusSelect}
					style={{ flexDirection: 'row', marginLeft: 3 }}  
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
				  value={advancePaid.toString()}
				  keyboardType='numeric'
				  textStyle={{ textAlign: 'right' }}
				  onChangeText={(text) => {setAdvancePaid(text); handleInputChange('componentA', 'advance', text);}}
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
        </View>
      </Card>  
		
			<View style={{alignItems: 'center'}}>
				<Button
					  style={{width: 150, marginTop: 10}}
					  size='medium'
					  onPress={saveEditedOrder}
					  disabled={!isConnected}
				>
							Save Order
				</Button>
			</View>
	</View>
			<Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
			</Modal>
	</ScrollView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
	backgroundColor: '#fff'
  },
  content: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    marginBottom: 8,
	fontWeight: 'bold',
  },
  table: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    alignItems: 'center',
    padding: 5,
  },
  poweredBy: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
  },
  topHalf: {
	height: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: {
	  width: 120,
	  textAlign: 'center',
    borderWidth: 1, // Thickness of the border
    borderColor: 'black', // Color of the border
    padding: 5, // Optional: Add padding for space inside the border
    borderRadius: 4, // Optional: Rounds the corners of the border
    color: 'black', // Text color (optional, for better contrast)
  },
  bottomHalf: {
	  height: 100,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    padding: 5,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 5,
  },
  carouselImage: {
    width: 300,
    height: 300,
    marginTop: 50,
  },
separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  additionalTextContainer: {
    marginBottom: 10,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  additionalText: {
    flex: 1,
    marginHorizontal: 5,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'grey',
    borderRadius: 5,
    padding: 5,
    color: 'white',
  },
  innerMargin: {
        height: 10
    },
	list: {
    paddingVertical: 24,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
	marginBottom: 10,
  },
  
  header: {
	  flexDirection: 'row',
	  justifyContent: 'space-between',
	  fontWeight: 'bold',
	  paddingLeft: 120,
	  paddingRight: 10
  },
  buttonTextContainer: {
    flexDirection: "row", // Place button and text in a row
    alignItems: "center", // Align items vertically in the center
    marginLeft: -15, // Move it closer to the left (you can adjust this value)
  },
  buttonText: {
    fontSize: 16,
    marginLeft: -10, // Reduce the space between button and text
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  endButton: {marginHorizontal: 100, marginTop: 10, borderRadius: 8},
    divider: {
    marginVertical: 8,
    backgroundColor: '#E4E9F2',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
	marginTop: 5
  },
  sectionHeader1: {
    flexDirection: 'row',
    alignItems: 'center',
	justifyContent: 'space-between'
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
  dropdownContainer: {
	flex: 1,
	padding: 10,
	marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Adjust border color as needed
    borderRadius: 5,
  },
  formInput: {
    marginTop: 16,
  },
  navButton: {
	  marginLeft: 20
  },
  radioButton: 
	{ marginLeft: -5, transform: [
      { scaleX: 0.9 }, // shrink horizontally
      { scaleY: 0.9 }  // shrink vertically (track + thumb)
    ],
 }
});

export default EditOrderDetails;
