import React, { useState, useEffect } from 'react';
import { Modal, Card, Text, Input, Radio, RadioGroup, Button, Spinner } from '@ui-kitten/components';
import { View, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { storage } from '../extra/storage';

const PaymentModal = ({ visible, onClose, onSave, orderNo, orderAmt, paymentStatus, advance, paymentMode, paymentNotes, noCache }) => {
  const [payStatus, setPayStatus] = useState(paymentStatus); 
  	const [payMode, setPayMode] = useState(paymentMode);
	const [payNotes, setPayNotes] = useState(paymentNotes);
  const payModes = ['Cash', 'Credit/Debit Card', 'UPI', 'Net-banking', 'Other'];
  const [payModeIndex, setPayModeIndex] = useState(paymentMode ? payModes.indexOf(paymentMode) : 0);
  const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
  const [payStatusIndex, setPayStatusIndex] = useState(paymentStatus ? payStatuses.indexOf(paymentStatus) : 0); 
  const [advanceAmount, setAdvanceAmount] = useState(advance);
  const [advanceError, setAdvanceError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handlePayStatusSelect = (index) => {
		console.log('in handlePayStatusSelect')
		setPayStatusIndex(index);
		setPayStatus(payStatuses[index]);
		if(index < 2) {
			setAdvanceAmount(0);
		}
	};
	
	const handlePayModeSelect = (index) => {
		console.log('in handlePayModeSelect', index)
		setPayModeIndex(index);
		setPayMode(payModes[index]);
		if(index < 4) {
			setPayNotes(null);
		}
	};
	
	const savePaymentDetails = async () => {
		try {
			setLoading(true);
		  if(payStatus === "Partially paid" && (advanceAmount === 0 || !advanceAmount)) {
			  showErrorMessage('Please enter an advance amount!')
			  setAdvanceError(true);
			  return;
		  } else {
			let am = parseInt(advanceAmount ? advanceAmount : 0);
			if(!noCache) {
				const { data, error } = await supabase
				  .from('OrderItems')
				  .update({ paymentStatus: payStatus, advance: am, paymentMode: payMode, paymentNotes: payNotes })
				  .eq('orderNo', orderNo)
				  .select(`*`)
				  .single();

				if(error) {
					throw error;
				} else {
					showSuccessMessage('Payment updated!')
				}
				console.log(data)
				let st = data.orderStatus === 'Completed' ? 'true' : 'false';
				const cacheKey = 'Completed_'+st;
				console.log('cacheKey', cacheKey)
				  const jsonCacheValue = storage.getString(cacheKey);
				  const cacheValue = jsonCacheValue ? JSON.parse(jsonCacheValue) : null;
				  console.log(cacheValue)
				  console.log('orderNo ', orderNo)
					if (cacheValue) {
					  const orderIndex = cacheValue?.findIndex(order => order.orderNo === orderNo);
					  console.log(orderIndex)
					  if (orderIndex !== -1) {
						cacheValue[orderIndex].paymentStatus = payStatus;
						cacheValue[orderIndex].advance = am;
						cacheValue[orderIndex].paymentMode = payMode;
						cacheValue[orderIndex].paymentNotes = payNotes;
						storage.set(cacheKey, JSON.stringify(cacheValue));
						console.log("Updated cacheValue stored successfully.");
					  } else {
						console.error("Order not found in cacheValue.");
					  }
					} else {
					  console.error("Cache value is null or undefined.");
					}
			}

				const updatedPaymentData = {
					paymentStatus: payStatus,
					advance: am,
					paymentMode: payMode,
					paymentNotes: payNotes
				  };
				onSave(updatedPaymentData);
				onClose();
		  }
		} catch(error) { 
			console.error(error);
			showErrorMessage('Error updating payment details!' + error.message)
		} finally {
			setLoading(false);
		}
	}

  return (
	<>
		<Modal
		  visible={visible}
		  backdropStyle={styles.backdrop}
		  onBackdropPress={onClose}
		>
		  <Card disabled={true} style={styles.card}>
			{/* Row for Payment Amount */}
			<View style={styles.row}>
			  <Text category="h6">Payment Amount</Text>
			  <Text style={styles.spacing}>Rs. {orderAmt}</Text>
			</View>

			<View>
					  <Text category='label' style={styles.dateText}>						
						Payment Status
					  </Text>
					  <RadioGroup
						selectedIndex={payStatusIndex}
						onChange={handlePayStatusSelect}
						style={{ flexDirection: 'row' }}  
					  >
						{payStatuses.map((paySt, index) => (
						  <Radio key={index}>{paySt}</Radio>
						))}
					  </RadioGroup>
				</View>
				{payStatuses[payStatusIndex] === "Partially paid" && (
				  <View style={styles.row}>
					<Text category='label' style={styles.advancePaidLabel}>Advance paid *</Text>
					<Input
					  status={advanceError ? 'danger' : 'basic'}
					  placeholder="Amount (Rs.)"
					  value={advanceAmount}
					  keyboardType='numeric'
					  textStyle={{ textAlign: 'right' }}
					  onChangeText={(text) => {
						  setAdvanceAmount(text);
						  setAdvanceError(false);
					  }}
					  style={styles.advanceInput}
					/>
				  </View>
				)}
				<View>
					  <Text category='label' style={styles.dateText}>						
						Payment Modes
					  </Text>
					    <View style={styles.radioWrap}>
							{payModes.map((paySt, index) => (
							  <Radio
								key={index}
								checked={payModeIndex === index}
								onChange={() => handlePayModeSelect(index)}
								style={styles.radioItem}
							  >
								{paySt}
							  </Radio>
							))}
					  </View>
					  {payMode === 'Other' && (
						<Input
						  style={{width: 80}}
						  value={payNotes}
						  onChangeText={(text) => setPayNotes(text)}
						/>
					  )}
				</View>

			<Button style={styles.button} size='small' appearance='outline' onPress={savePaymentDetails}>
			  Save
			</Button>
		  </Card>
		</Modal>
		<Modal
						visible={loading}
						backdropStyle={styles.backdrop}
					  >
							<Spinner size="large" status="primary" />
		</Modal>
	</>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  spacing: {
    marginLeft: 16,
  },
  radioLabel: {
    marginTop: 16,
  },
  radioGroup: {
    marginVertical: 8,
  },
  advanceInput: {
    marginLeft: 16,
    flex: 1,
  },
  button: {
    marginTop: 16,
	marginHorizontal: 100
  },
  card:{
	width: 350
  },
  radioWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',        // ✅ allows wrapping
    marginTop: 8,
  },
  radioItem: {
    marginRight: 10,
    marginBottom: 8,         // spacing between rows
  },
});

export default PaymentModal;
