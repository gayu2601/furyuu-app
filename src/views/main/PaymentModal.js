import React, { useState, useEffect } from 'react';
import { Modal, Card, Text, Input, Radio, RadioGroup, Button, Spinner } from '@ui-kitten/components';
import { View, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { storage } from '../extra/storage';

const PaymentModal = ({ visible, onClose, onSave, orderNo, orderAmt, paymentStatus, advance, noCache }) => {
  const [payStatus, setPayStatus] = useState(paymentStatus); 
  const payStatuses = ['Pending', 'Fully paid', 'Partially paid'];
  const [payStatusIndex, setPayStatusIndex] = useState(paymentStatus ? payStatuses.indexOf(paymentStatus) : 0); 
  const [advanceAmount, setAdvanceAmount] = useState(advance);
  const [advanceError, setAdvanceError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handlePayStatusSelect = (index) => {
		setPayStatusIndex(index);
		setPayStatus(payStatuses[index]);
		if(index < 2) {
			setAdvanceAmount(0);
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
				  .update({ paymentStatus: payStatus, advance: am })
				  .eq('orderNo', orderNo)
				  .select(`*`)
				  .single();

				if(error) {
					throw error;
				} else {
					showSuccessMessage('Payment updated!')
				}
				console.log(data)
				const cacheKey = data.username+'_'+data.orderStatus;
				  const jsonCacheValue = storage.getString(cacheKey);
				  const cacheValue = jsonCacheValue ? JSON.parse(jsonCacheValue) : null;
					if (cacheValue) {
					  const orderIndex = cacheValue?.findIndex(order => order.orderNo === orderNo);
					  if (orderIndex && orderIndex !== -1) {
						cacheValue[orderIndex].paymentStatus = payStatus;
						cacheValue[orderIndex].advance = am;
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
					advance: am
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
  }
});

export default PaymentModal;
