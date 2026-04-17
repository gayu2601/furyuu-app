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
	const { clearAllBookings, addBooking } = useSlotBooking();
	const { measurementFields } = useDressConfig();
	const [expandedItems, setExpandedItems] = useState(new Set());
	let aroute = {...route?.params};
	const {currentUser} = useUser();
	const {isConnected} = useNetwork();
	const { item, userType, orderDate, shopName, shopAddress, shopPhNo, isShareIntent } = route.params;
	console.log('item in editorderdetails:');
	console.log(item);

	// Local item state to reflect deletions without mutating route params
	const [itemState, setItemState] = useState(item);

	const [loading, setLoading] = useState(false);
	const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
	const payModes = ['Cash', 'Credit/Debit Card', 'UPI', 'Net-banking', 'Other'];
	const [payStatusIndex, setPayStatusIndex] = useState(item.paymentStatus ? payStatuses.indexOf(item.paymentStatus) : 0);
	const [payStatus, setPayStatus] = useState(item.paymentStatus || 'Pending');
	const [advancePaid, setAdvancePaid] = useState(item.advance || 0);
	const itemRefs = useRef({});
	const [orderAmtChanged, setOrderAmtChanged] = useState(false);
	const [paymentMode, setPaymentMode] = useState(item.paymentMode || 'Cash');
	const [paymentNotes, setPaymentNotes] = useState(item.paymentNotes);
	const [payModeIndex, setPayModeIndex] = useState(item.paymentMode ? payModes.indexOf(item.paymentMode) : 0);
	const [editCust, setEditCust] = useState(false);
	const [phChanged, setPhChanged] = useState(false);
	const [orderNoLocal, setOrderNoLocal] = useState(item.orderNo);
	const [orderNoChanged, setOrderNoChanged] = useState(false);
	const [custName, setCustName] = useState(item.custName);
	const [phoneNo, setPhoneNo] = useState(item.phoneNo);
	const [customerId, setCustomerId] = useState(item.customerId);
	const cacheKey = item.orderStatus === 'Completed' ? 'Completed_true' : 'Completed_false';

	useEffect(() => {
		navigation.setOptions({
			headerLeft: () => (
				<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
					clearAllBookings();
					let ph = phoneNo.includes('+91') ? phoneNo : '+91'+phoneNo;
					const updatedItem = {
						...itemState,
						custName: custName,
						phoneNo: ph,
						customerId: customerId,
						orderNo: orderNoLocal
					};
					console.log('updatedItem', updatedItem);
					console.log(route.params);
					navigation.navigate('OrderDetails', {...route.params, item: updatedItem });
				}}/>
			),
		});
	}, [navigation, custName, phoneNo, customerId, orderNoLocal, itemState]);

	useEffect(() => {
		const backAction = () => {
			clearAllBookings();
			console.log('inside backAction');
			let ph = phoneNo.includes('+91') ? phoneNo : '+91'+phoneNo;
			console.log(custName, ph);
			const updatedItem = {
				...itemState,
				custName: custName,
				phoneNo: ph,
				customerId: customerId,
				orderNo: orderNoLocal
			};
			console.log('updatedItem', updatedItem);
			console.log(route.params);
			navigation.replace('OrderDetails', {...route.params, item: updatedItem });
			return true;
		};

		const backHandler = BackHandler.addEventListener(
			"hardwareBackPress",
			backAction
		);

		return () => backHandler.remove();
	}, [custName, phoneNo, customerId, orderNoLocal, itemState]);

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
		if(index < 4) {
			setPaymentNotes(null);
		}
	};

	const DateIcon = (style) => {
		const theme = useTheme();
		return (
			<Icon {...style} name='calendar-outline' fill={theme['color-primary-100']}/>
		);
	};

	const handleInputChange = (dressItemId, fieldName, value) => {
		console.log(fieldName);
		console.log(value);
		setFormData((prevData) => {
			if (dressItemId === 'componentA') {
				return {
					...prevData,
					[fieldName]: value
				};
			} else {
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
					if (fieldName.includes('_measurement')) {
						const newDress = {
							dressItemId: dressItemId,
							dressType: itemState.dressType[index1],
							dressSubType: itemState.dressSubType[index1],
							measurements: {
								[fieldName]: value
							}
						};

						updatedDressItems = [...prevData.dressItems, newDress];
					} else {
						const index1 = itemState.dressItemId?.findIndex(
							(id) => id === dressItemId
						);
						console.log('index1:');
						console.log(index1);
						const newDress = {
							dressItemId: dressItemId,
							dressType: itemState.dressType[index1],
							dressSubType: itemState.dressSubType[index1],
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
		if (!str || typeof str !== 'string') {
			return true;
		}
		const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
		return !base64Regex.test(str);
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
	};

	const uploadOrderImages = async(picType, pics) => {
		console.log('in uploadOrderImages');
		console.log(pics);
		let orderPicsString = null;
		const folderName = getPicFolder(picType);
		let uploadedImages = [];
		await Promise.all(
			pics.map(async(pic, index) => {
				if(startsWithFile(pic)) {
					const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer());
					const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg';
					const path = `${Date.now()}.${fileExt}`;
					orderPicsString += path + ',';
					const { data, error: uploadError } = await supabase.storage
						.from('order-images/' + folderName)
						.upload(path, arraybuffer, {
							contentType: 'image/jpeg',
						});

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
			orderPicsString = uploadedImages.join(',');
		}
		console.log('orderPicsString:');
		console.log(orderPicsString);
		return orderPicsString;
	};

	const uploadDesignFile = async(itemLocal, fileType) => {
		let path = null;
		if(itemLocal[fileType]) {
			const arraybuffer = await fetch(itemLocal[fileType]).then((res) => res.arrayBuffer());
			const fileExt = itemLocal[fileType]?.split('.').pop()?.toLowerCase() ?? 'jpeg';
			path = `${Date.now()}.${fileExt}`;
			const { data, error: uploadError } = await supabase.storage
				.from('design-files/' + fileType)
				.upload(path, arraybuffer, {
					contentType: 'image/jpeg',
				});

			if (uploadError) {
				console.log(uploadError);
				return null;
			}
		}
		const { dataRemove, errorRemove } = await supabase
			.storage
			.from('design-files')
			.remove([`${fileType}/${item[fileType]}`]);
		if(errorRemove) {
			throw errorRemove;
		}
		return path;
	};

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

	// ─── DELETE DRESS ITEM ────────────────────────────────────────────────────────
	const deleteDressItem = useCallback((index) => {
		Alert.alert(
			'Delete Dress Item',
			`Are you sure you want to delete "${itemState.dressType[index]}"? This cannot be undone.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						if (!isConnected) {
							showErrorMessage('No Internet Connection');
							return;
						}
						try {
							setLoading(true);
							const dressItemId = itemState.dressItemId[index];

							// 1. Delete order images from storage
							const dressPicsToDelete = (itemState.dressPics?.[index] || []).filter(Boolean);
							const patternPicsToDelete = (itemState.patternPics?.[index] || []).filter(Boolean);
							const measPicsToDelete = (itemState.measurementPics?.[index] || []).filter(Boolean);

							if (dressPicsToDelete.length > 0) {
								await supabase.storage.from('order-images')
									.remove(dressPicsToDelete.map(f => `dressImages/${f}`));
							}
							if (patternPicsToDelete.length > 0) {
								await supabase.storage.from('order-images')
									.remove(patternPicsToDelete.map(f => `patternImages/${f}`));
							}
							if (measPicsToDelete.length > 0) {
								await supabase.storage.from('order-images')
									.remove(measPicsToDelete.map(f => `measurementImages/${f}`));
							}

							// 2. Delete design files from storage
							const fnFile = itemState.frontNeckDesignFile?.[index];
							const bnFile = itemState.backNeckDesignFile?.[index];
							const slFile = itemState.sleeveDesignFile?.[index];
							if (fnFile) {
								await supabase.storage.from('design-files').remove([`frontNeckDesignFile/${fnFile}`]);
							}
							if (bnFile) {
								await supabase.storage.from('design-files').remove([`backNeckDesignFile/${bnFile}`]);
							}
							if (slFile) {
								await supabase.storage.from('design-files').remove([`sleeveDesignFile/${slFile}`]);
							}

							// 5. If this was the last dress item, prompt to cancel the order instead of deleting
							if (itemState.dressItemId.length === 1) {
								Alert.alert(
									'Last Dress Item',
									'This is the only dress item in the order. Would you like to mark the order as Cancelled?',
									[
										{
											text: 'No, Keep Order',
											style: 'cancel',
										},
										{
											text: 'Mark as Cancelled',
											style: 'destructive',
											onPress: async () => {
												try {
													const { error: cancelError } = await supabase
														.from('OrderItems')
														.update({ orderStatus: 'Cancelled' })
														.eq('orderNo', itemState.orderNo);
													if (cancelError) throw cancelError;

													const updatedItem = {
														...itemState,
														orderStatus: 'Cancelled',
														dressItemId: [],
														dressType: [],
													};

													updateCache('UPDATE_ORDER', updatedItem, cacheKey);
													await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updatedItem);
													eventEmitter.emit('newOrderAdded');
													showSuccessMessage('Order marked as Cancelled!');
													navigation.navigate('Home'); // adjust route name as needed
												} catch (error) {
													console.error('Error cancelling order:', error);
													showErrorMessage('Error cancelling order: ' + error.message);
												} finally {
													setLoading(false);
												}
											},
										},
									]
								);
								setLoading(false); // stop spinner while user decides
								return;
							} else {
								console.log('dressItemId', dressItemId);
								const { error: deleteError } = await supabase
								  .rpc('safe_delete_dress_item', { p_dress_item_id: dressItemId });
								if (deleteError) throw deleteError;
							}

							// 6. Remove the deleted index from all array fields
							const arrayFields = [
								'dressItemId', 'dressType', 'dressSubType', 'alterDressType',
								'associateCustName', 'backNeckDesignFile', 'backNeckType',
								'dressGiven', 'dressPics', 'dueDate', 'expressDuration',
								'extraOptions', 'frontNeckDesignFile', 'frontNeckType',
								'measurementData', 'measurementPics', 'notes', 'patternPics',
								'sleeveDesignFile', 'sleeveLength', 'sleeveType', 'slots',
								'stitchingAmt',
							];

							const updatedItem = { ...itemState };
							for (const field of arrayFields) {
								if (Array.isArray(updatedItem[field])) {
									updatedItem[field] = updatedItem[field].filter((_, i) => i !== index);
								}
							}

							// 7. Recalculate total order amount from remaining items
							const newTotalAmt = updatedItem.stitchingAmt.reduce((sum, amt) => {
								return sum + (parseInt(amt) || 0);
							}, 0);
							updatedItem.orderAmt = newTotalAmt;

							// 8. Persist new total to DB
							const { error: amtError } = await supabase
								.from('OrderItems')
								.update({ orderAmt: newTotalAmt })
								.eq('orderNo', itemState.orderNo);
							if (amtError) throw amtError;

							// 9. Update cache and notify
							updateCache('UPDATE_ORDER', updatedItem, cacheKey);
							await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updatedItem);
							eventEmitter.emit('newOrderAdded');

							// 10. Clean up ref for deleted item and update local state
							delete itemRefs.current[dressItemId];
							setItemState(updatedItem);

							showSuccessMessage('Dress item deleted!');
						} catch (error) {
							console.error('Error deleting dress item:', error);
							showErrorMessage('Error deleting dress item: ' + error.message);
						} finally {
							setLoading(false);
						}
					},
				},
			]
		);
	}, [itemState, isConnected, cacheKey, currentUser]);
	// ─────────────────────────────────────────────────────────────────────────────

	const renderEditOrderDetailsItem = useCallback(({ item: dress, index }) => {
		console.log('in renderOrderDetailsItem');
		console.log(itemState);
		const transformedItem = {
			dressItemId: itemState.dressItemId?.[index],
			custId: itemState.customerId,
			orderStatus: itemState.orderStatus,
			dressPics: itemState.dressPics?.[index],
			patternPics: itemState.patternPics?.[index],
			measurementPics: itemState.measurementPics?.[index],
			dressType: dress,
			dressSubType: dress === 'Alteration' ?
				itemState.alterDressType[index] :
				(itemState.dressSubType?.[index] ? `${itemState.dressSubType[index]} ` : ''),
			stitchingAmt: itemState.stitchingAmt?.[index] || 0,
			dueDate: itemState.dueDate?.[index] || new Date(),
			dressGiven: itemState.dressGiven?.[index] || false,
			frontNeckType: itemState.frontNeckType?.[index] || null,
			backNeckType: itemState.backNeckType?.[index] || null,
			sleeveType: itemState.sleeveType?.[index] || null,
			sleeveLength: itemState.sleeveLength?.[index] || null,
			frontNeckDesignFile: itemState.frontNeckDesignFile?.[index] || null,
			backNeckDesignFile: itemState.backNeckDesignFile?.[index] || null,
			sleeveDesignFile: itemState.sleeveDesignFile?.[index] || null,
			notes: itemState.notes?.[index] || '',
			measurementsObj: itemState.measurementData?.[index] || {},
			defaultSource: require('../../../assets/empty_dress.png'),
			orderFor: itemState.associateCustName?.[index] || itemState.custName,
			oldData: itemState.oldData,
			extraOptions: itemState.extraOptions?.[index] || {},
			slots: itemState.slots?.[index] || {},
			orderNo: itemState.orderNo
		};
		console.log(transformedItem);

		return (
			<View>
				<View style={styles.itemHeader}>
				  <Text category="s1" style={styles.heading}>{`Dress ${index + 1}`}</Text>

				  <TouchableOpacity onPress={() => deleteDressItem(index)}>
					<Icon name="trash-2-outline" width={20} height={20} fill="#FF3D71" />
				  </TouchableOpacity>
				</View>

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
				<Divider style={styles.divider1}/>
			</View>
		);
	}, [itemState, expandedItems, measurementFields, deleteDressItem]);

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

	const getCountKey = (key) => {
		switch(key) {
			case 'deletedPics':
				return 'dressImages';
			case 'deletedPatternPics':
				return 'patternImages';
			case 'deletedMeasPics':
				return 'measurementImages';
			case 'deletedFnImg':
				return 'frontNeckDesignFile';
			case 'deletedBnImg':
				return 'backNeckDesignFile';
			case 'deletedSleeveImg':
				return 'sleeveDesignFile';
		}
	};

	const saveEditedOrder = async() => {
		if(!isConnected) {
			showErrorMessage("No Internet Connection");
		} else {
			try {
				setLoading(true);
				console.log(itemRefs);
				const dressItemIds = Object.keys(itemRefs.current);
				console.log(dressItemIds);
				const updatedDressItems = dressItemIds.map(dressItemId => {
					const ref = itemRefs.current[dressItemId];
					console.log(ref);
					if (ref && typeof ref.getSaveData === 'function') {
						let aa = ref.getSaveData();
						console.log('aa:');
						console.log(aa);
						return aa;
					}
					return null;
				}).filter(Boolean);

				console.log("Updated dress items:", updatedDressItems);

				const updatedFormData = {
					...formData,
					dressItems: updatedDressItems
				};
				setFormData(updatedFormData);

				console.log("Saving order data:");
				console.log(updatedFormData);
				console.log(advancePaid + ',' + payStatus);

				let totalAmt = updatedFormData.dressItems
					.map(it => {
						const stitchingAmount = parseInt(it.stitchingAmt) || 0;

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
					.update({ orderAmt: totalAmt, paymentStatus: payStatusLocal, advance: adv, paymentMode: paymentMode, paymentNotes: paymentNotes})
					.eq('orderNo', itemState.orderNo);

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
					return order.orderNo === itemState.orderNo;
				});
				let updVal = egVal[0];
				console.log(updVal);
				updVal['custName'] = custName;
				updVal['phoneNo'] = phoneNo.includes('+91') ? phoneNo : '+91' + phoneNo;
				updVal['customerId'] = customerId;

				updVal['orderAmt'] = parseInt(totalAmt);
				updVal['paymentStatus'] = payStatusLocal;
				updVal['advance'] = parseInt(adv);
				updVal['paymentMode'] = paymentMode;
				updVal['paymentNotes'] = paymentNotes;

				const dressItemsLocal = updatedFormData.dressItems;
				let dueDateChanged = false;
				for (const ditem of dressItemsLocal) {
					console.log('ditem: ');
					console.log(ditem);
					let ind = updVal.dressItemId.indexOf(ditem.dressItemId);
					console.log(ind);

					let updateData = {};
					let finalDurationVal = null;
					for (const key in ditem) {
						if (Object.prototype.hasOwnProperty.call(ditem, key)) {
							if (['dressPics', 'patternPics','measurementPics'].includes(key)) {
								let picsDbFinal = await uploadOrderImages(key, ditem[key]);
								updateData[key] = picsDbFinal;
								updVal[key][ind] = picsDbFinal?.split(',') || null;
							} else if (['deletedPics', 'deletedPatternPics', 'deletedMeasPics'].includes(key)) {
								let imgFolderName = getCountKey(key);

								const { dataRemove, errorRemove } = await supabase
									.storage
									.from('order-images')
									.remove(ditem[key].map(filename => `${imgFolderName}/${filename}`));

								if (errorRemove) {
									throw errorRemove;
								}
							} else if (['deletedFnImg', 'deletedBnImg', 'deletedSleeveImg'].includes(key)) {
								let imgFolderName = getCountKey(key);

								const { dataRemove1, errorRemove1 } = await supabase
									.storage
									.from('design-files')
									.remove([`${imgFolderName}/${ditem[key]}`]);

								if (errorRemove1) {
									throw errorRemove1;
								}
							} else if(['frontNeckDesignFile', 'backNeckDesignFile', 'sleeveDesignFile'].includes(key)) {
								console.log('uploading ' + key);
								let aa = await uploadDesignFile(ditem, key);
								console.log(aa);
								updateData[key] = aa;
								updVal[key][ind] = aa;
							} else if (!['measurementsObj', 'dressItemId', 'slotsDiff'].includes(key)) {
								console.log(key);
								console.log(ditem[key]);
								updateData[key] = ditem[key];
								if(key !== 'slotDates') {
									updVal[key][ind] = ditem[key];
								}
							}
							if(key === 'dueDate' && !dueDateChanged) {
								console.log('setting dueDateChanged');
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
								addBooking(ditem[key], undefined);
								console.log('rowsToInsert', rowsToInsert);
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
						console.log('in ditem measurementsObj');
						console.log('edit measurementsObj save');
						updVal['measurementData'][ind] = {...updVal['measurementData'][ind], ...ditem.measurementsObj, ...ditem.extraMeasurements};
						if(ditem.newExtraMeas) {
							const rowsToInsert = ditem.newExtraMeas.map(fieldKey => ({
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

						console.log('updVal meas', {...updVal['measurementData'][ind], ...ditem.measurementsObj});
						const { error: error1 } = await supabase
							.from('measurements_new')
							.update({measurement_data: {...updVal['measurementData'][ind], ...ditem.measurementsObj} })
							.eq('dress_type', ditem.dressType)
							.eq('customer_id', itemState.customerId)
							.eq('dress_item_id', ditem.dressItemId);
						if(error1) {
							throw error1;
						}
						console.log(`Updated Measurements: ${ditem.dressItemId}`);
					}
				}

				console.log('updVal:');
				console.log(updVal);

				updateCache('UPDATE_ORDER', updVal, cacheKey);
				await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updVal);

				console.log('All updates complete.');
				showSuccessMessage('Order saved!');
				eventEmitter.emit('newOrderAdded');
				if(dueDateChanged) {
					console.log('firing event emitter');
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
				//clearAllBookings();
				setLoading(false);
			}
		}
	};

	function isValidPhoneNumber(phoneNo) {
		const phoneRegex = /^(?:\+91|91)?\d{10}$/;
		return phoneRegex.test(phoneNo);
	}

	const saveCustDetails = async() => {
		try {
			const isValid = isValidPhoneNumber(phoneNo);
			if(!phChanged && !orderNoChanged && !isValid) setEditCust(false);
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

				console.log(dataUser);
				custId = dataUser.id;
			} else {
				custId = data.id;
				
				if (custName && custName !== item.custName) {
					const { error: nameError } = await supabase
						.from('Customer')
						.update({ custName: custName })
						.eq('id', custId);

					if (nameError) throw nameError;
					console.log('updated custName for existing customer');
				}
			}

			const orderItemsUpdate = { customerId: custId };
			if(orderNoChanged) {
				const { data: existingOrder } = await supabase
					.from('OrderItems')
					.select('orderNo')
					.eq('orderNo', orderNoLocal)
					.maybeSingle();

				if(existingOrder) throw new Error(`Order number ${orderNoLocal} already exists`);
				orderItemsUpdate.orderNo = orderNoLocal;
			}

			const { error: error1 } = await supabase
				.from('OrderItems')
				.update(orderItemsUpdate)
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
			let updVal = {...itemState, custName: custName, phoneNo: ph, customerId: custId, ...(orderNoChanged && { orderNo: orderNoLocal })};
			updateCache('UPDATE_ORDER', updVal, cacheKey);
			await notify(currentUser.id, 'UPDATE_ORDER', cacheKey, updVal);
			eventEmitter.emit('newOrderAdded');

			showSuccessMessage('Saved customer details successfully!');
			setEditCust(false);
			setPhChanged(false);
			setOrderNoChanged(false);
			console.log('saved cust details', custName, phoneNo);
		} catch(error) {
			showErrorMessage('Error saving customer details: ' + error);
			console.error(error);
		}
	};

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
							Order No
						</Text>
						{editCust ? <Input
							value={orderNoLocal.toString()}
							onChangeText={(text) => {
								setOrderNoLocal(text);
								setOrderNoChanged(true);
							}}
						/> : <Text category="s2">{orderNoLocal}</Text>}
					</View>
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
					data={itemState.dressType}
					renderItem={renderEditOrderDetailsItem}
					keyExtractor={(dress, index) => itemState.dressItemId?.[index]?.toString() ?? index.toString()}
					style={{ flex: 1 }}
				/>

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
						<Text category="label">Rs. {itemState.orderAmt}</Text>
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
						{paymentMode === 'Other' && (
							<Input
								style={{width: 80}}
								value={paymentNotes}
								onChangeText={(text) => {setPaymentNotes(text); handleInputChange('componentA', 'paymentNotes', paymentNotes);}}
							/>
						)}
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
		borderWidth: 1,
		borderColor: 'black',
		padding: 5,
		borderRadius: 4,
		color: 'black',
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
		flexDirection: "row",
		alignItems: "center",
		marginLeft: -15,
	},
	buttonText: {
		fontSize: 16,
		marginLeft: -10,
	},
	backdrop: {
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	endButton: {marginHorizontal: 100, marginTop: 10, borderRadius: 8},
	divider: {
		marginVertical: 8,
		backgroundColor: '#E4E9F2',
	},
	divider1: {backgroundColor: '#E4E9F2', marginBottom: 8},
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
		borderColor: '#e0e0e0',
		borderRadius: 5,
	},
	formInput: {
		marginTop: 16,
	},
	navButton: {
		marginLeft: 20
	},
	radioButton: {
		marginLeft: -5, transform: [
			{ scaleX: 0.9 },
			{ scaleY: 0.9 }
		],
	},
	deleteItemButton: {
		marginHorizontal: 8,
		marginBottom: 12,
		marginTop: 4,
	},
	itemHeader: {
	  flexDirection: 'row',
	  justifyContent: 'space-between',
	  alignItems: 'center',
	  marginVertical: 6,
	},
	heading: {fontWeight: 'bold'}
});

export default EditOrderDetails;