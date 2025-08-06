import React, { useState, useEffect, useRef } from 'react';
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
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import EditOrderDetailsItem from '../main/EditOrderDetailsItem';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import {
  PhoneIcon,
} from '../extra/icons';
import { ArrowIosBackIcon } from "../extra/icons";
import eventEmitter from './eventEmitter';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { useRevenueCat } from './RevenueCatContext';
import { usePubSub } from './SimplePubSub';

const EditOrderDetails = ({ navigation }) => {
	const route = useRoute();
	const theme = useTheme();
	const { subscriptionActive, gracePeriodActive } = useRevenueCat();
		const { notify, updateCache, eligible } = usePubSub();
	  const [formData, setFormData] = useState({
    dressItems: [],
  });
  let aroute = {...route?.params};
  const {currentUser} = useUser();
  const {isConnected} = useNetwork();
	const { item, userType, orderDate, shopName, shopAddress, shopPhNo, isShareIntent } = route.params
	console.log('item in editorderdetails:')
	console.log(item)
    const [loading, setLoading] = useState(false)
  const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
	const [payStatusIndex, setPayStatusIndex] = useState(item.paymentStatus ? payStatuses.indexOf(item.paymentStatus) : 0); 
  const [payStatus, setPayStatus] = useState(item.paymentStatus || 'Pending'); 
  const [advancePaid, setAdvancePaid] = useState(item.advance || 0)
const [workerIndex, setWorkerIndex] = useState(item.workerType && item.workerType !== 'Select worker type' ? 0 : 1);
  const workerSelected = ['Yes', 'No'];
	const itemRefs = useRef({});
	const formattedWorkerDueDate = item.workerDueDate ? new Date(item.workerDueDate) : null;
	const useDatepickerState = (initialDate = null) => {
	    const [date, setDate] = useState(formattedWorkerDueDate || initialDate);
		const resetDate = () => setDate(null);
		const onSelEdit = (nextDate) => {
			setDate(nextDate);
			handleInputChange('componentA', 'workerDueDate', nextDate);
		}
		console.log('date:' + date)
		return { date, onSelect: onSelEdit, resetDate };
	};
	const filterPickerState = useDatepickerState();
	
	const formattedWorkerDueDateSub = item.subTailorDueDate ? new Date(item.subTailorDueDate) : null;
	const useDatepickerStateSub = (initialDate = null) => {
	    const [date, setDate] = useState(formattedWorkerDueDateSub || initialDate);
		const resetDate = () => setDate(null);
		const onSelEdit = (nextDate) => {
			setDate(nextDate);
			handleInputChange('componentA', 'subTailorDueDate', nextDate);
		}
		return { date, onSelect: onSelEdit, resetDate };
	};
	const filterPickerStateSub = useDatepickerStateSub();
	const [inCustom, setInCustom] = useState(false);
	const [subName, setSubName] = useState(item.subTailorName)
	const [subPhNo, setSubPhNo] = useState(item.subTailorPhNo?.includes('+91') ? item.subTailorPhNo?.substring(3) : item.subTailorPhNo)
	const [subPhoneErrorValid, setSubPhoneErrorValid] = useState(false)
	const [workerName, setWorkerName] = useState(item.workerName)
	const [workerPhNo, setWorkerPhNo] = useState(item.workerPhNo?.includes('+91') ? item.workerPhNo?.substring(3) : item.workerPhNo);
	const [workerNameError, setWorkerNameError] = useState(false)
	const [workerPhoneErrorValid, setWorkerPhoneErrorValid] = useState(false)
	const data = [
	  'Tailor',
	  'Embroiderer',
	];
	const [userTypeSelectedIndex, setUserTypeSelectedIndex] = useState(item.workerType ? data.indexOf(item.workerType) : 0);
	const [userTypeWorker, setUserTypeWorker] = useState(item.workerType)
	const [orderAmtChanged, setOrderAmtChanged] = useState(false);
	
	useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				if (inCustom) {
					console.log('inCustom true');
				  navigation.navigate('EditOrderDetails', {...route.params});
				  setInCustom(false);
				} else {
					navigation.navigate('OrderDetails', {...route.params})
				}
			}}/>
		  ),
		});
	  }, [navigation, inCustom]);
	
	useEffect(() => {
		const backAction = () => {
			if (inCustom) {
				console.log('inCustom true');
			  navigation.navigate('EditOrderDetails', {...route.params});
			  setInCustom(false);
			  return true; // Prevent further back action
			} else {
			  navigation.navigate('OrderDetails', {...route.params})
			  return true;
			}
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, [inCustom]);
	
  useEffect(() => {
	  if(!isConnected) {
			 showErrorMessage("No Internet Connection");
	  }
	}, []);
	
	useEffect(() => {
		   if(route.params?.workerNameImp) {
			  if(route.params?.contactType === 'worker') {
				  setWorkerName(route.params.workerNameImp)
				  handleInputChange('componentA', 'workerName', route.params.workerNameImp);
				  let ph = route.params.workerPhNoImp?.includes('+91') ? route.params.workerPhNoImp?.substring(3) : route.params.workerPhNoImp
				  setWorkerPhNo(ph)
				  handleInputChange('componentA', 'workerPhNo', ph);
			  } else {
				  setSubName(route.params.workerNameImp)
				  handleInputChange('componentA', 'subTailorName', route.params.workerNameImp);
				  let ph = route.params.workerPhNoImp?.includes('+91') ? route.params.workerPhNoImp?.substring(3) : route.params.workerPhNoImp
				  setSubPhNo(ph)
				  handleInputChange('componentA', 'subTailorPhNo', ph);
			  }
		  }
	  },[route.params?.workerNameImp])
  
  const handlePayStatusSelect = (index) => {
		setPayStatusIndex(index);
		setPayStatus(payStatuses[index]);
		if(index < 2) {
			setAdvancePaid(0);
		}
		handleInputChange('componentA', 'paymentStatus', payStatuses[index]);
	};
	
	const handleUserTypeSelect = (index) => {
		console.log('in handleUserTypeSelect')
		setUserTypeSelectedIndex(index);
		setUserTypeWorker(data[index]);
		handleInputChange('componentA', 'workerType', data[index]);
	};
	
	/*const handleNewItemAdd = async () => {
		navigation.navigate('AddOrderScreen', {screen: 'AddOrder',
					params: { orderNo: item.orderNo, customerId: item.customerId, custName: item.custName, phoneNo: item.phoneNo }
		});
	}*/
	
	const DateIcon = (style: ImageStyle): IconElement => {
	  const theme = useTheme();
	  return (
		<Icon {...style} name='calendar-outline' fill={theme['color-primary-100']}/>
	  )
	};
	
	const showAdAfterAction = () => {
		// Use test ad unit IDs in development
		const adUnitID = __DEV__ 
		  ? TestIds.INTERSTITIAL 
		  : Platform.select({
			  ios: 'ca-app-pub-3653760421436075/9615373788',
			  android: 'ca-app-pub-3653760421436075/9615373788',
			});
			
		// Create and load the interstitial ad
		const interstitialAd = InterstitialAd.createForAdRequest(adUnitID, {
		  requestNonPersonalizedAdsOnly: false,
		  keywords: ['productivity', 'business'],
		});
		
		// Add event listeners
		const unsubscribeLoaded = interstitialAd.addAdEventListener(
		  AdEventType.LOADED,
		  () => {
			console.log('Post-action ad loaded, showing now');
			interstitialAd.show();
		  }
		);
		
		const unsubscribeError = interstitialAd.addAdEventListener(
		  AdEventType.ERROR,
		  (error) => {
			console.error('Failed to load post-action ad:', error);
			// Clean up event listeners on error
			cleanup();
		  }
		);
		
		const unsubscribeClosed = interstitialAd.addAdEventListener(
		  AdEventType.CLOSED,
		  () => {
			console.log('Post-action ad closed');
			// Clean up event listeners after ad is closed
			cleanup();
		  }
		);
		
		// Function to clean up event listeners
		const cleanup = () => {
		  unsubscribeLoaded();
		  unsubscribeError();
		  unsubscribeClosed();
		};
		
		// Set a timeout to clean up if ad never loads
		const timeoutId = setTimeout(() => {
		  console.log('Ad load timeout - cleaning up');
		  cleanup();
		}, 10000); // 10 seconds timeout
		
		// Start loading the ad
		console.log('Loading post-action ad...');
		interstitialAd.load();
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

	const uploadOrderImages = async(picType, pics) => {
		console.log('in uploadOrderImages')
		console.log(pics)
		let orderPicsString = null;
		const folderName = picType === 'dress' ? 'dressImages' : 'patternImages'
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
	
	function isValidPhoneNumber(phoneNo) {
	  const phoneRegex = /^(?:\+91|91)?\d{10}$/;
	  return phoneRegex.test(phoneNo);
	}
  
  const saveEditedOrder = async() => {
	    if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		} else {
		  try {
			  setLoading(true);
			// Loop through refs to get data from each item component
			console.log(itemRefs)
			const dressItemIds = Object.keys(itemRefs.current);
			const updatedDressItems = dressItemIds.map(dressItemId => {
			  const ref = itemRefs.current[dressItemId];
			  if (ref && typeof ref.getItemData === 'function') {
				return ref.getItemData();
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
			
			// Process the save action (API call, etc.)
			console.log("Saving order data:")
			console.log(updatedFormData);
			console.log(advancePaid + ',' + payStatus)

				let totalAmt = updatedFormData.dressItems
				  .map(it => parseInt(it.stitchingAmt))
				  .reduce((acc, curr) => acc + curr, 0);
				let adv = parseInt(advancePaid);
			  	let payStatusLocal = payStatus;
				let workerIdLocal = item.workerId;
				if(workerIndex === 1) {
					workerIdLocal = null;
					setUserTypeWorker(null);
				} else if(workerIndex === 0 || workerName !== item.workerName || workerPhNo !== item.workerPhNo) {
					const isValid = workerPhNo ? isValidPhoneNumber(workerPhNo) : false;		
								  if(!workerName) {
										setWorkerNameError(true)
										showErrorMessage('Enter Outsourcing ' + userTypeWorker + ' name!');
										return;
								  } else if (!isValid) {
									    setWorkerPhoneErrorValid(true)
										showErrorMessage('Enter a valid phone number for outsourcing ' + userTypeWorker + '!');
										return;
								  } else {
									let wPh = '+91' + workerPhNo.trim();
									const { data: datawp, error: errorwp } = await supabase
									  .from('profiles')
									  .select(`username`)
									  .eq('phoneNo', wPh)
									if(errorwp) {
										console.log(errorwp)
										throw errorwp
									}
									console.log(datawp)
									const { data: dataw, error: errorw } = await supabase
										.from('Worker')
										.upsert({ workerName: workerName.trim(), workerPhNo: wPh, username: datawp && datawp.length > 0 ? datawp[0].username : null },
										{ onConflict: ['workerName', 'workerPhNo'] })
										.eq('workerName', workerName.trim())
										.eq('workerPhNo', wPh)
										.select().single()
									  if (errorw) {
										console.log(errorw)
										throw errorw;
									  }
									console.log(dataw);
									workerIdLocal = dataw.id;
								  }
				}
				console.log(filterPickerState.date)
				console.log(filterPickerStateSub.date)
				let formattedWorkerDate = filterPickerState.date ? moment(filterPickerState.date).format('YYYY-MM-DD') : filterPickerState.date
				console.log(formattedWorkerDate)
				let formattedWorkerDateSub = filterPickerStateSub.date ? moment(filterPickerStateSub.date).format('YYYY-MM-DD') : null
				console.log(formattedWorkerDateSub)
			  const { error } = await supabase
				  .from('OrderItems')
				  .update({ orderAmt: totalAmt, paymentStatus: payStatusLocal, advance: adv, workerType: workerIndex === 1 ? null : userTypeWorker,  workerId: workerIdLocal, workerDueDate: workerIndex === 0 ? formattedWorkerDate : null, subTailorName: subName, subTailorPhNo: subPhNo, subTailorDueDate: subName ? formattedWorkerDateSub : null })
				  .eq('orderNo', item.orderNo)
				
				if(orderAmtChanged) {
					eventEmitter.emit('transactionAdded');
				}

			  if(error) {
				  console.log(error);
				  throw error;
			  }
			  
						const cacheKey = currentUser.username+'_'+item.orderStatus;
						const jsonCacheValue = storage.getString(cacheKey);
						const cacheValue = jsonCacheValue ? JSON.parse(jsonCacheValue) : null;
						console.log(cacheValue)
				
						let egVal = cacheValue.filter(order => {
								return order.orderNo === item.orderNo;
							});
						let updVal = egVal[0]
						console.log(updVal)
						updVal['orderAmt'] = parseInt(totalAmt);
						updVal['paymentStatus'] = payStatusLocal;
						updVal['advance'] = parseInt(adv);
						updVal['workerType'] = workerIndex === 1 ? null : userTypeWorker;
						updVal['workerName'] = workerName;
						updVal['workerPhNo'] = workerPhNo;
						updVal['workerDueDate'] = formattedWorkerDate;
						updVal['subTailorDueDate'] = formattedWorkerDateSub;
						updVal['subTailorName'] = subName;
						updVal['subTailorPhNo'] = subPhNo;
				
				  const dressItemsLocal = updatedFormData.dressItems;
				  let grouped = {};
				  let dueDateChanged = false;
					for (const ditem of dressItemsLocal) {
						console.log('ditem: ')
						console.log(ditem)
						let ind = updVal.dressItemId.indexOf(ditem.dressItemId)
						console.log(ind)
				    
					  let updateData = {};
					  for (const key in ditem) {
						  if (Object.prototype.hasOwnProperty.call(ditem, key)) {
							if (key === 'dressPics') {
								let dressPicsDb = await uploadOrderImages('dress', ditem.dressPics);
								updateData[key] = dressPicsDb;
								updVal[key][ind] = dressPicsDb?.split(',') || null;
							} else if (key === 'patternPics') {
								let patternPicsDb = await uploadOrderImages('pattern', ditem.patternPics);
								updateData[key] = patternPicsDb;
								updVal[key][ind] = patternPicsDb?.split(',') || null;
							} else if (key === 'deletedPics') {
								const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(ditem.deletedPics.map(filename => `dressImages/${filename}`))
								if(errorRemove) {
									throw errorRemove;
								}
							} else if (key === 'deletedPatternPics') {
								const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('order-images')
								  .remove(ditem.deletedPatternPics.map(filename => `patternImages/${filename}`))
								if(errorRemove) {
									throw errorRemove;
								}
							} else if(['frontNeckDesignFile', 'backNeckDesignFile', 'sleeveDesignFile'].includes(key)) {
								console.log('uploading ' + key)
								let aa = await uploadDesignFile(ditem, key)
								console.log(aa)
								updateData[key] = aa;
								updVal[key][ind] = aa;
							} else if (!['measurements', 'dressItemId', 'dressType', 'dressSubType'].includes(key)) {
								console.log(key)
								console.log(ditem[key])
								updateData[key] = ditem[key];
								updVal[key][ind] = ditem[key];
							}
							if(key === 'dueDate' && !dueDateChanged) {
								console.log('setting dueDateChanged')
								dueDateChanged = true;
							}								
						  }
					  }
					  
						const gkey = ditem.dressSubType + "" + ditem.dressType;
						console.log(gkey)
						if (grouped[gkey]) {
							grouped[gkey].count += 1;
							grouped[gkey].groupedAmt = parseInt(grouped[gkey].groupedAmt) + parseInt(ditem.stitchingAmt);
						} else {
							grouped[gkey] = { count: 1, groupedAmt: parseInt(ditem.stitchingAmt) };
						}
					  const { data, error } = await supabase
						.from('DressItems')
					    .update(updateData)
						.eq('id', ditem.dressItemId)
						.select();
						if(error) {
							throw error;
						}
						
					  if (ditem.measurements) {
						  console.log('in ditem measurements')
						  let updateData1 = {};
						  let cacheValueMeas = null;
						  if(!item['associateCustName'][ind]) {
							  let jsonCacheValueMeas = storage.getString(item.phoneNo +'_'+ ditem.dressType)
							  cacheValueMeas = jsonCacheValueMeas ? JSON.parse(jsonCacheValueMeas) : null
							  console.log(cacheValueMeas)
						  }
						  
						  console.log('edit measurements save')
						  for (const key in ditem.measurements) {
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
						  console.log(updateData1)
						  const { error: error1 } = await supabase
							  .from('Measurements')
							  .update(updateData1)
							  .eq('dressType', ditem.dressType)
							  .eq('customerId', item.customerId)
							  .eq('dressItemNo', ditem.dressItemId);
						  if(error1) {
							  throw error1;
						  }
						  if(!item['associateCustName'][ind]) {
							  console.log(cacheValueMeas)
							  //storage.set(item.phoneNo +'_'+ ditem.dressType, JSON.stringify(cacheValueMeas));
							  updateCache('UPDATE_MEAS', cacheValueMeas, item.phoneNo, ditem.dressType);    
							  await notify(subscriptionActive || gracePeriodActive, currentUser.id, 'UPDATE_MEAS', item.phoneNo, ditem.dressType, cacheValueMeas);
						  }
						  console.log(`Updated Measurements: ${ditem.dressItemId}`);
					  }
					}
					
					console.log('grouped:')
					console.log(grouped)
					  const detailsAmt = Object.entries(grouped).map(([key, value]) => ({
							  key,
							  ...value
							}));
					console.log('detailsAmt:')
					console.log(detailsAmt)
					updVal.dressDetailsAmt = detailsAmt;
					console.log('updVal:')
					console.log(updVal)
					  /*const orderIndex = cacheValue?.findIndex(order => order.orderNo === item.orderNo);
					  if (orderIndex !== -1) {
						cacheValue[orderIndex] = updVal;
						storage.set(cacheKey, JSON.stringify(cacheValue));
						console.log("Updated cacheValue stored successfully.");
					  } else {
						console.error("Order not found in cacheValue.");
					  }*/
					
					updateCache('UPDATE_ORDER', updVal, currentUser.username, item.orderStatus);    
					await notify(subscriptionActive || gracePeriodActive, currentUser.id, 'UPDATE_ORDER', currentUser.username, item.orderStatus, updVal);
					
					console.log('All updates complete.');
					showSuccessMessage('Order saved!')
					eventEmitter.emit('newOrderAdded');
					if(dueDateChanged) {
						console.log('firing event emitter')
						eventEmitter.emit('storageUpdated');
					}
					
					if(!subscriptionActive) {
						showAdAfterAction();
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
  
	const navigateToContacts = async(contactType) => {
		  navigation.navigate('ImportCustomerScreen', {screenName: 'EditOrderDetails', item: item, userType: userType, orderDate: orderDate, shopName: shopName, shopAddress: shopAddress, shopPhNo: shopPhNo, isShareIntent: isShareIntent, contactType: contactType});
	  }
	  
	  const renderContactsIcon = (props) => (
	    <TouchableOpacity onPress={() => navigateToContacts('subTailor')}>
			<Icon {...props} name='person-done-outline' fill={theme['color-primary-500']}/>
		</TouchableOpacity>
	  );
	  
	  const renderContactsIconWorker = (props) => (
	    <TouchableOpacity onPress={() => navigateToContacts('worker')}>
			<Icon {...props} name='person-done-outline' fill={theme['color-primary-500']}/>
		</TouchableOpacity>
	  );
	  
	const handleWorkerSelect = (index) => {
		setWorkerIndex(index);
		if(index === 1) {
			handleInputChange('componentA', 'workerType', null);
		} else {
			setUserTypeWorker('Tailor');
			handleInputChange('componentA', 'workerType', 'Tailor');
		}
	};
	
	const renderEditOrderDetailsItem = ({ item: dress, index }) => {
			let measurementsObj = {frontNeck: item.frontNeck[index], backNeck: item.backNeck[index], shoulder: item.shoulder[index], sleeve: item.sleeve[index], AHC: item.AHC?.[index], shoulderToWaist: item.shoulderToWaist?.[index], chest: item.chest[index], waist: item.waist[index], hip: item.hip[index], leg: item.leg[index], topLength: item.topLength[index], bottomLength: item.bottomLength[index]}
			const currentDressItemId = item.dressItemId[index];
			return (
				<EditOrderDetailsItem style={styles.item}
								key={currentDressItemId}
								ref={el => itemRefs.current[currentDressItemId] = el}
								onInputChange={handleInputChange}
								inCustom={inCustom}
								setInCustom={setInCustom}
								editRouteParams={aroute}
								dressItemId={currentDressItemId}
								custId={item.custId}
								custName={item.custName}
								custPhNo={item.phoneNo}
								imageSource1={ item.dressPics ? item.dressPics[index] : null}
								imageSource2={ item.patternPics ? item.patternPics[index] : null}
								dressType={dress}
								dressSubType={dress === 'Alteration' ? item.alterDressType[index] : (item.dressSubType && item.dressSubType[index] ? item.dressSubType[index] : '')}
								amt={item.stitchingAmt && item.stitchingAmt[index] ? item.stitchingAmt[index] : 0}
								dueDate={item.dueDate && item.dueDate[index] ? item.dueDate[index] : new Date()}
								dressGiven={item.dressGiven && item.dressGiven[index] ? item.dressGiven[index] : false}
								frontNeckType={item.frontNeckType && item.frontNeckType[index] ? item.frontNeckType[index] : null}
								backNeckType={item.backNeckType && item.backNeckType[index] ? item.backNeckType[index] : null}
								sleeveType={item.sleeveType && item.sleeveType[index] ? item.sleeveType[index] : null}
								sleeveLength={item.sleeveLength && item.sleeveLength[index] ? item.sleeveLength[index] : null}
								frontNeckDesignFile={item.frontNeckDesignFile && item.frontNeckDesignFile[index] ? item.frontNeckDesignFile[index] : null}
								backNeckDesignFile={item.backNeckDesignFile && item.backNeckDesignFile[index] ? item.backNeckDesignFile[index] : null}
								sleeveDesignFile={item.sleeveDesignFile && item.sleeveDesignFile[index] ? item.sleeveDesignFile[index] : null}
								notes={(item.notes && item.notes[index]) ? item.notes[index] : ''}
								measurementsObj={measurementsObj}
								extraMeasurements={item.extraMeasurements ? item.extraMeasurements[index] : null}
								setOrderAmtChanged={setOrderAmtChanged}
								defaultSource={require('../../../assets/empty_dress.png')}
				/>
			);
	};

  return (
  <ScrollView keyboardShouldPersistTaps="handled">
    <View style={styles.container}>
		<View style={styles.sectionHeader}>
				<Icon style={styles.icon} fill={theme['color-primary-500']} name="person-outline" />
				<Text category="s1" style={styles.headerText}>
				  Customer Details
				</Text>
			  </View>
			  <Card style={styles.cardFinal}>
				<View style={styles.detailRow}>
				  <Text category="label">
					Name
				  </Text>
				  <Text category="s2">{item.custName}</Text>
				</View>
				<View style={styles.detailRow}>
				  <Text category="label">
					Phone No
				  </Text>
				  <Text category="s2">{item.phoneNo}</Text>
				</View>
				<View style={styles.detailRow}>
				  <Text category="label">
					Order Date
				  </Text>
				  <Text category="s2">{orderDate}</Text>
				</View>
			  </Card>
			
		<Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
				<Icon style={styles.icon} fill={theme['color-primary-500']} name="shopping-bag-outline" />
				<Text category="s1" style={styles.headerText}>
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
        <Text category="s1" style={styles.headerText}>
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
					  <Radio key={index} style={{ marginLeft: -5 }}>{paySt}</Radio>
					))}
			</RadioGroup>
        </View>
        {payStatuses[payStatusIndex] === "Partially paid" && (
			<View style={styles.generalField}>
			  <Text category="label">
				Advance paid
			  </Text>
			  <View style={{flexDirection: 'row', alignItems: 'center', marginHorizontal: 100}}>
				<Text category='s2'>Rs. </Text>
			    <Input
				  style={{width: 80}}
				  value={advancePaid}
				  keyboardType='numeric'
				  textStyle={{ textAlign: 'right' }}
				  onChangeText={(text) => {setAdvancePaid(text); handleInputChange('componentA', 'advance', text);}}
				/>
			  </View>
			</View>
		)}
      </Card>
	  <Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
			<Icon style={styles.icon} fill={theme['color-primary-500']} name="credit-card-outline" />
			<Text category="s1" style={styles.headerText}>
			  Order assigned to
			</Text>
		  </View>
		<Card style={styles.cardFinal}>
			<View style={styles.dropdownContainer}>
					<Input
							style={styles.formInput}
							autoCapitalize='none'
							label='Worker Name'
							accessoryRight={renderContactsIcon}
							value={subName}
							onChangeText={text => {
								setSubName(text)
							}}
						  />
						  
						  <Input
						    status={subPhoneErrorValid ? 'danger' : 'basic'}
							label='Worker Phone'
							style={styles.formInput}
							accessoryRight={PhoneIcon}
							keyboardType="phone-pad"
							maxLength={10}
							value={subPhNo}
							onChangeText={(text) => {
								setSubPhNo(text);
								setSubPhoneErrorValid(false);
							}}
						  />
						  {subPhoneErrorValid && <Text status='danger'>Please enter a valid phone number</Text>}
						  
						<Datepicker
							style={styles.formInput}
							label='Worker to complete order by'
							min={new Date()}
							accessoryRight={DateIcon}
							{...filterPickerStateSub}
						  />
			</View>
      </Card>
	  
	  <Divider style={styles.divider} />
		<View style={styles.sectionHeader}>
			<Icon style={styles.icon} fill={theme['color-primary-500']} name="credit-card-outline" />
			<Text category="s1" style={styles.headerText}>
			  External tailors/embroiderers working on order
			</Text>
		  </View>
		  <View>
				  <Text category='label' style={styles.dateText}>						
					Any tailor/embroiderer working on this order?
				  </Text>
				  <RadioGroup
					selectedIndex={workerIndex}
					onChange={handleWorkerSelect}
					style={{ flexDirection: 'row' }}  
				  >
					{workerSelected.map((sel, index) => (
					  <Radio key={index}>{sel}</Radio>
					))}
				  </RadioGroup>
			</View>
		{workerIndex === 0 && (	
			<Card style={styles.cardFinal}>
				<View style={styles.dropdownContainer}>
					  <Text category="label" style={{color: '#878683', fontSize: 12}}>
						Select worker type *
					  </Text>
					<RadioGroup
						selectedIndex={userTypeSelectedIndex}
						onChange={handleUserTypeSelect}
						style={{ flexDirection: 'row', marginLeft: 3, marginTop: 3, marginBottom: -5 }}  
					  >
						{data.map((op, index) => (
						  <Radio key={index} style={{ marginLeft: -5 }}>{op}</Radio>
						))}
					</RadioGroup>
					<Input
							status={workerNameError ? 'danger' : 'basic'}
							style={styles.formInput}
							autoCapitalize='none'
							label='Name *'
							accessoryRight={renderContactsIconWorker}
							value={workerName}
							onChangeText={text => {
								setWorkerName(text)
								setWorkerNameError(false)
							}}
						  />
						  
						  <Input
							status={workerPhoneErrorValid ? 'danger' : 'basic'}
							label='Phone *'
							style={styles.formInput}
							accessoryRight={PhoneIcon}
							keyboardType="phone-pad"
							maxLength={10}
							value={workerPhNo}
							onChangeText={(text) => {
								setWorkerPhNo(text);
								setWorkerPhoneErrorValid(false);
							}}
						  />
						  
						<Datepicker
							style={styles.formInput}
							label='Due date'
							min={new Date()}
							accessoryRight={DateIcon}
							{...filterPickerState}
						  />
					</View>
			</Card>
		)}  
		
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
    paddingVertical: 24,
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
    backgroundColor: '#F7F9FC',
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
  }
});

export default EditOrderDetails;
