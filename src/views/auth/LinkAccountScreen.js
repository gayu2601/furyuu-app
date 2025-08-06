import React, { useRoute, useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Alert, BackHandler, Modal as ModalRN, TouchableOpacity, Animated } from 'react-native';
import { useUser } from '../main/UserContext';
import { Button, Layout, Text, Input, Modal, Spinner, Select, SelectItem, Icon, CheckBox, Card } from '@ui-kitten/components';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { supabase } from '../../constants/supabase'
import { KeyboardAvoidingView } from '../extra/3rd-party';
import { logFirebaseEvent } from '../extra/firebaseUtils';
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useRevenueCat } from '../main/RevenueCatContext';
import { useNetwork } from '../main/NetworkContext';
import PaywallScreen from '../main/PaywallScreen';
import PremiumOverlay from '../main/PremiumOverlay';

const CheckIcon = (props) => (
  <Icon {...props} name='checkmark-circle-2-outline' fill='#3366FF' width={64} height={64}/>
);

const LinkAccountScreen = ({ navigation }) => {
  const [businessName, setBusinessName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [stateAddr, setStateAddr] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false)
  const [acctLinkedNow, setAcctLinkedNow] = useState(false)
  const { subscriptionActive } = useRevenueCat();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState(false);
  const [editDetails, setEditDetails] = useState(false);
  const [linkedStep, setLinkedStep] = useState(0);
  const [linkedAcctId, setLinkedAcctId] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { isConnected } = useNetwork();
  
  const states = [
		'ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHHATTISGARH','GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JHARKHAND','KARNATAKA','KERALA','MADHYA PRADESH','MAHARASHTRA','MANIPUR','MEGHALAYA','MIZORAM','NAGALAND','ODISHA','PUNJAB','RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA','UTTAR PRADESH','UTTARAKHAND','WEST BENGAL','ANDAMAN AND NICOBAR ISLANDS','CHANDIGARH','DADRA AND NAGAR HAVELI AND DAMAN AND DIU','DELHI','JAMMU AND KASHMIR','LADAKH','LAKSHADWEEP','PUDUCHERRY'
	];
  
  const { currentUser, updateCurrentUser } = useUser();
  
  useEffect(() => {
	  if(!isConnected) {
			 showErrorMessage("No Internet Connection");
	  }
  }, []);
  
  useEffect(() => {
		const unsubscribe = navigation.addListener('focus', () => {
			  setStreet1("")
			  setStreet2("")
			  setCity("")
			  setStateAddr("")
			  setPincode("")
			  setBusinessName("")
			  setPanNumber("")
			  setAcctNo("")
			  setIfsc("")
		});
		return () => unsubscribe();
	}, [navigation]);
	
	useEffect(() => {
	  const fetchFromDb = async() => {
		try {
			setLoading(true);
			const { data, error } = await supabase
					.from('profiles')
					.select(`linkaccount_step, linkedAccountId`)
					.eq('id', currentUser.id)
					.single();
			if (error) throw new Error('Failed to fetch step from the database');
			setLinkedStep(data.linkaccount_step);
			setLinkedAcctId(data.linkedAccountId);
			if(data.linkaccount_step === 2) {
				console.log('getting editinputs')
				await editInputs();
			}
		} catch(error) {
			console.log('Error fetching linked account details from db ' + error.message)
			showErrorMessage('Error fetching linked account details from db!')
		} finally {
			setLoading(false);
		}
	  }
	  fetchFromDb();
	}, []);
	
	const handleClose = () => {
		Animated.timing(fadeAnim, {
		  toValue: 0,
		  duration: 300,
		  useNativeDriver: true,
		}).start(() => {
		  setPaywallVisible(false);
		});
	};

	const handleSubscribeClick = () => {
		logFirebaseEvent('subscribe', {from_screen: 'link_account'});
		setPaywallVisible(true);
	};
	
	const handleSelect = (index) => {
		setSelectedIndex(index);
		setStateAddr(states[index.row]);
	};
  
  const createLinkedAccount = async (email, phNo) => {
	try {  
		const { data, error } = await supabase.functions.invoke('create-razorpay-linked-account', {
		  body: {
			  email: email,
			  phone: phNo,
			  type: 'route',
			  legal_business_name: businessName,
			  business_type: 'individual',
			  profile:{
				  category: "services",
				  subcategory: "tailors",
				  addresses: {
					 registered: {
						street1:street1,
						street2:street2,
						city:city,
						state:stateAddr,
						postal_code:pincode,
						country:"IN"
					 }
				  }
			  },
			  legal_info: { pan: panNumber.toUpperCase }
		},
		})
		if (error && error instanceof FunctionsHttpError) {
		  const errorMessage = await error.context.json()
		  console.log('Function returned an error', errorMessage)
		  showErrorMessage(errorMessage.error?.description);
		  return null;
		} else {
			console.log('Account created successfully:');
			console.log(data);
			return JSON.parse(data).id;
		}
	} catch(error) {
		console.log('Error!', error.message);
		throw error;
	}
  };
  
const createStakeholder = async (accountId, name, email) => {
    try {
        const { data, error } = await supabase.functions.invoke('create-razorpay-stakeholder', {
		  body: { accountId: accountId, name: name, email: email },
		})
		if (error && error instanceof FunctionsHttpError) {
		  const errorMessage = await error.context.json()
		  console.log('Function returned an error', errorMessage)
		  showErrorMessage(errorMessage.error?.description);
		  return null;
		} else {
			console.log('Stakeholder created successfully:');
			console.log(data);
			return JSON.parse(data).id;
		}
    } catch (error) {
        console.error('Error creating stakeholder:', error);
        throw error;
    }
	await requestProductConfiguration();
};

const requestProductConfiguration = async (accountId) => {
    try {
		const { data, error } = await supabase.functions.invoke('create-razorpay-product-config', {
		  body: { accountId: accountId },
		})
		if (error && error instanceof FunctionsHttpError) {
		  const errorMessage = await error.context.json()
		  console.log('Function returned an error', errorMessage)
		  showErrorMessage(errorMessage.error?.description);
		  return null;
		} else {
			console.log('Product configuration requested successfully:');
			console.log(data);
			return JSON.parse(data).id;
		}
    } catch (error) {
        console.error('Error requesting product configuration:', error);
        throw error;
    }
};

const updateProductConfiguration = async (accountId, productId, name) => {
	try {
		const { data, error } = await supabase.functions.invoke('update-razorpay-product-config', {
		  body: { accountId: accountId, productId: productId, accountNo: acctNo, ifscCode: ifsc.toUpperCase(), name: name },
		})
		if (error && error instanceof FunctionsHttpError) {
		  const errorMessage = await error.context.json()
		  console.log('Function returned an error', errorMessage)
		  showErrorMessage(errorMessage.error?.description);
		  return null;
		} else {
			console.log('Product configuration updated successfully:');
			console.log(data);
			return JSON.parse(data);
		}
    } catch (error) {
        console.error('Error updating product configuration:', error);
        throw error;
    }
};

const saveAcctId = async (accountId) => {
	
		try {
			const { error } = await supabase
			  .from('profiles')
			  .update({ linkedAccountId: accountId })
			  .eq('id', currentUser.id)
			if(error) {
				throw error;
			}
			console.log('User updated with linked account id:', accountId);
			showSuccessMessage('Account linked successfully!');
		} catch (error) {
			console.error('Error updating user with linked account id:', error);
		}
	
}
  
  const createAccountFlow = async () => {
    if(!businessName || !panNumber || !ifsc || !acctNo || !street1 || !street2 || !city || !stateAddr || !pincode) {
		showErrorMessage('Please fill all the fields!')
		return;
	} else if(pincode.trim() === '' || pincode.length < 6) {
		showErrorMessage('Please enter a valid pincode!');
		return;
	} else {
		let dbstep, step, acctId;
		try {
			setLoading(true);
			logFirebaseEvent('link_account');
			step = linkedStep;

			let stakeholderId, productId, productConfig;

			if (step === 0) {
				acctId = await createLinkedAccount(currentUser.email, currentUser.phoneNo);
				console.log("acctId: " + acctId);
				if (!acctId) throw new Error('Account creation failed');
				step = 1;
			} else {
				acctId = linkedAcctId;
			}

			if (step === 1) {
				stakeholderId = await createStakeholder(acctId, currentUser.name, currentUser.email);
				console.log("stakeholderId: " + stakeholderId);
				if(!stakeholderId) throw new Error('Stakeholder creation failed');
				step = 2;
			}

			if (step === 2) {
				if(acctNo.length < 5 || acctNo.length > 35) {
					showErrorMessage('The bank account number must be between 5 and 35 characters')
				} else {
					productId = await requestProductConfiguration(acctId);
					console.log("productId: " + productId);
					if(!productId) throw new Error('Product creation failed');
					productConfig = await updateProductConfiguration(acctId, productId, currentUser.name);
					console.log("productConfig: " + productConfig);
					if(!productConfig) throw new Error('Product update failed');
					step = 3;
				}
			}

			if (step === 3) {
				await saveAcctId(acctId);
				const updatedUser = {
				  ...currentUser,
				  linkedAccountId: acctId
				};
				updateCurrentUser(updatedUser)
				
				const { error: insertError } = await supabase
				  .from('razorpay_acct_details')
				  .insert({ user_id: currentUser.id, street1: street1, street2: street2, city: city, state: stateAddr, pincode: pincode, business_name: businessName, acct_no: acctNo, ifsc_code: ifsc, pan_no: panNumber })
				if(insertError) {
					console.error('Failed to insert details in database: ' + insertError.message);
				}
  
				console.log("Account ID saved");
				showSuccessMessage('Account linked successfully!')
				setAcctLinkedNow(true)
				step = 4;
			}

		} catch (error) {
			console.error('Error: ' + error.message);
			throw error;
		} finally {
			if (step !== undefined && acctId) {
				const { error: updateError } = await supabase
					.from('profiles')
					.update({ linkaccount_step: step, linkedAccountId: acctId })
					.eq('id', currentUser.id);

				if (updateError) {
					console.error('Failed to update step in database: ' + updateError.message);
				}
			}
			//Function returned an error {"error": {"code": "BAD_REQUEST_ERROR", "description": "Merchant email already exists for account - OANVdRvfOan6lP", "field": "email", "metadata": {}, "reason": "NA", "source": "NA", "step": "NA"}}
			setLoading(false);
			navigation.goBack();
		}
	}
};

	const editInputs = async() => {
		try {
			setLoading(true);
			const { data, error } = await supabase
			  .from('razorpay_acct_details')
			  .select(`*`)
			  .eq('user_id', currentUser.id).single();
			if(error) {
				throw error;
			}
			
			/*const { error: updateError } = await supabase
			  .from('profiles')
			  .update({ linkaccount_step: 2 })
			  .eq('id', currentUser.id)
			if(updateError) {
				throw updateError;
			}*/
			
			setStreet1(data.street1)
			setStreet2(data.street2)
			setCity(data.city)
			setStateAddr(data.state)
			setPincode(data.pincode)
			setBusinessName(data.business_name)
			setPanNumber(data.pan_no)
			setAcctNo(data.acct_no)
			setIfsc(data.ifsc_code)
			setEditDetails(true);
		} catch(error) {
			console.log('link account edit error: ' + error);
			showErrorMessage('Error editing details! ' + error.message)
		} finally {
			setLoading(false);
		}
	}

  return (
	<View style={styles.container}>
		{currentUser.linkedAccountId && !acctLinkedNow && linkedStep === 4 && !editDetails? (
		    <Layout style={styles.contentContainer}>
				<Card style={styles.card} disabled={true}>
				  <Layout style={styles.iconContainer}>
					<CheckIcon />
				  </Layout>
				  
				  <Text category='h4' style={styles.title}>
					Bank account already linked
				  </Text>
				  
				  <Text category='p1' style={styles.description}>
					Your bank account is successfully linked to your profile.
				  </Text>
				  {subscriptionActive ? (
					<View style={styles.subscribeSection}>
					  <Button onPress={editInputs} style={styles.editButton}>Edit details</Button>
					</View>
				  ) : (
					  <View style={styles.subscribeSection}>
						<Text category='p1' style={styles.description}>Subscribe now to edit your account details or start accepting payments</Text>
						<Button onPress={() => setPaywallVisible(true)} style={styles.cardButton}>Subscribe</Button>
					  </View>
				  )}
				</Card>
			</Layout>
		) : (
			subscriptionActive ? (
		<ScrollView keyboardShouldPersistTaps="handled">
		  <Text style={styles.text}>
			{editDetails ? 'Edit your bank account details' : 'Link your bank account to start receiving payments from customers'}
		  </Text>
		  <Text category='p2' style={styles.text}>
			* All fields are mandatory
		  </Text>
		  {editDetails && (
			  <Button 
				  appearance='ghost'
				  onPress={() => setEditDetails(false)}
				  style={styles.backButton}
			  >
				  ← Back to Account Status
			  </Button>
		  )}

			<Text category='s1' style={styles.label}>Address *</Text>
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='Street 1'
				value={street1}
				disabled={editDetails}
				onChangeText={text => setStreet1(text)}
			  />
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='Street 2'
				value={street2}
				disabled={editDetails}
				onChangeText={text => setStreet2(text)}
			  />
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='City'
				value={city}
				disabled={editDetails}
				onChangeText={text => setCity(text)}
			  />
			  <Select
					style={styles.formInput}
					placeholder='Select State'
					selectedIndex={selectedIndex}
					onSelect={handleSelect}
					disabled={editDetails}
					value={stateAddr}
				>
					{states.map((option, index) => (
						<SelectItem title={option} key={index} />
					))}
				</Select>
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='Pincode'
				maxLength={6}
				keyboardType='numeric'
				value={pincode}
				disabled={editDetails}
				onChangeText={text => setPincode(text)}
			  />
		  
			<Text category='s1' style={styles.label}>Bank Details *</Text>
			<Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='Legal Business Name'
				value={businessName}
				disabled={editDetails}
				onChangeText={text => setBusinessName(text)}
			  />
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='PAN Number'
				maxLength={10}
				value={panNumber}
				disabled={editDetails}
				onChangeText={text => setPanNumber(text)}
			  />
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='Bank Account Number'
				value={acctNo}
				maxLength={35}
				keyboardType='numeric'
				onChangeText={text => setAcctNo(text)}
			  />
			  <Input
				style={styles.formInput}
				autoCapitalize='none'
				placeholder='IFSC Code'
				maxLength={11}
				value={ifsc}
				onChangeText={text => setIfsc(text)}
			  />
			  <CheckBox
				  checked={confirmDetails}
				  onChange={nextChecked => setConfirmDetails(nextChecked)}
				  style={{marginTop: 20}}
			  >
				  By proceeding, you confirm your banking details are accurate and understand that Thaiyal Business is not liable for any failed transactions
			  </CheckBox>
			  
			<Button
			  style={styles.button}
			  status='info'
			  disabled={!confirmDetails || !street1 || !street2 || !city || !stateAddr || !pincode || !businessName || !panNumber || !acctNo || !ifsc}
			  onPress={createAccountFlow}
			  >
			  	{editDetails ? 'Update Account' : 'Link Account'}
			</Button>
		</ScrollView>
		) : (
			<PremiumOverlay onUpgrade={handleSubscribeClick}/>
		))}
		<ModalRN
		  visible={paywallVisible}
		  animationType="slide"
		  transparent={true}
		  onRequestClose={() => setPaywallVisible(false)} // Handle Android back press
		>
		  <View style={styles.modalContainer}>
			<Layout style={styles.modalContent}>
			  <TouchableOpacity
				style={styles.closeButton}
				onPress={handleClose}
			  >
				<Icon name="close-outline" fill="#555" style={styles.closeIcon} />
			  </TouchableOpacity>

			  <PaywallScreen setPaywallVisible={setPaywallVisible}/>
			</Layout>
		  </View>
		</ModalRN>
		
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
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  text: {
	marginTop: 5,
  },
  button: {
    marginTop: 20,
	marginHorizontal: 100,
	marginBottom: 20
  },
  formInput: {
	  marginTop: 16
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  label: {
	marginTop: 10,
	marginBottom: -5,
	fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: '90%'
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 15,
    zIndex: 10,
  },
  closeIcon: {
    width: 28,
    height: 28,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent'
  },
  card: {
    width: '100%',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent'
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
  },
  cardButton: {
	  marginTop: 16,
	  width: 120,
  },
  subscribeSection: {
	marginTop: 25,
	alignItems: 'center'
  },
  editButton: {
	width: 120,
  },
  backButton: {
	marginLeft: -180
  }
});

export default LinkAccountScreen;
