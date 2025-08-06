import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, ImageStyle, Alert, StatusBar, TouchableOpacity, BackHandler, ImageBackground, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { PersonIcon } from '../extra/icons';
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import {
  Button,
  CheckBox,
  Input,
  StyleService,
  useStyleSheet,
  Text, Layout, Select, SelectItem, IndexPath,
  Icon, useTheme, Spinner, Toggle, Modal, Card,
} from '@ui-kitten/components';
import { KeyboardAvoidingView } from '../extra/3rd-party';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Buffer } from 'buffer';
import { useUser } from '../main/UserContext';

const TailorDetailsScreen = ({ navigation }) => {
	const route = useRoute();
	const { session, shopPhNo } = route.params;
  const [loading, setLoading] = useState(false)
  const [exp, setExp] = useState('');
  const [expError, setExpError] = useState(false);
  const [emp, setEmp] = useState('');
  const [empError, setEmpError] = useState(false);
  const [smAcct, setSmAcct] = useState('');
  const [upi, setUpi] = useState('');
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
    const [checked, setChecked] = useState(false);
	const [checkedFree, setCheckedFree] = useState(false);
	const [checkedUpi, setCheckedUpi] = useState(false);
	const [upiQRref, setUpiQRref] = useState(null);
	const { currentUser } = useUser();
	const theme = useTheme();
	
	const [spIndex, setSpIndex] = useState([]);
	const [sp, setSp] = useState(null); 
	const [spArr, setSpArr] = useState(null); 
	const [spError, setSpError] = useState(false);
	const spServices = ['None', 'Wedding', 'Bridal', 'Suits', 'Casual-wear', 'Kids', 'Ethnic', 'Western', 'Alterations'];
  
	useEffect(() => {
		const backAction = async() => {
			const {error: error2} = await supabase
						.from('profiles')
						.delete()
						.eq('id', session.user.id)
		  navigation.navigate('RegisterScreen', {session});
		  return true;
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove();
	  }, [navigation]);
  
	useEffect(() => {
		const unsubscribe = navigation.addListener('focus', () => {
					setExp('')
					setEmp('')
					setUpi('')
					setSmAcct('')
					setQrCodeVisible(false)
					setChecked(false)
					setCheckedFree(false)
					setCheckedUpi(false)
					setUpiQRref(null)
		});
		return () => unsubscribe();
	}, [navigation]);
  
const onCheckedChange = (isChecked) => {
    setChecked(isChecked);
  };
  
  const handleSelectSp = (index) => {
		setSpIndex(index);
		const selectedServices = index.map(i => spServices[i.row]);
		const commaSeparatedSp = selectedServices.join(', ');
		setSpArr(selectedServices);
		setSp(commaSeparatedSp);
		setSpError(false);
	};
  
  const onCheckedChangeFree = (isChecked) => {
    if (isChecked) {
		Alert.alert(
		  "Consent Required",
		  "By selecting 'Yes,' you consent to sharing your contact information with registered tailors on this app.",
		  [
			{ text: "Cancel", onPress: () => setCheckedFree(false), style: "cancel" },
			{ text: "Yes", onPress: () => setCheckedFree(true) }
		  ]
		);
	} else {
		setCheckedFree(false);
	}
  };
  
  const onCheckedChangeUpi = (isChecked) => {
    setCheckedUpi(isChecked);
  };
  
  const styles = useStyleSheet(themedStyles);

  const saveDetails = async function () {
		if(exp ===  '') {
			setExpError(true);
			showErrorMessage('Please enter years of experience!')
			return;
		} else if(emp === ''){
			setEmpError(true);
			showErrorMessage('Please enter no. of employees in your shop!')
			return;
		} else if(!sp){
			setSpError(true);
			showErrorMessage('Please select a specialization!')
			return;
		} else {
			try {
					setLoading(true);
						
						let upiPath = null;
						  if (upiQRref) {
							  const fileName = `${Date.now()}_TailorApp_upiqrcode.png`;
							  upiPath = fileName;
							upiQRref.toDataURL(async (data) => {
							  try {
								const buffer = Buffer.from(data, 'base64');
								const { data: upiUploadData, error: upiUploadError } = await supabase.storage
								  .from('upi-qr-code')
								  .upload(fileName, buffer, {
									contentType: 'image/png',
								  });

								if (upiUploadError) {
								  console.log('Error uploading file:', upiUploadError.message);
								  throw upiUploadError;
								}
								console.log('File uploaded successfully:', upiUploadData);
								
								const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
								const base64Data = data.replace(/^data:image\/png;base64,/, '');

								await FileSystem.writeAsStringAsync(fileUri, base64Data, {
									  encoding: FileSystem.EncodingType.Base64,
								});

								console.log('QR code saved locally at:', fileUri);
								storage.set(currentUser.username + '_upiQrCode', fileUri);
							  } catch (error) {
								console.log('Error saving QR code:', error);
							  }
							});
						  }
						  console.log('upiPath:')
						  console.log(upiPath)
						
							const { data: data1, error: error1 } = await supabase
							  .from('profiles')
							  .update({ 
								yearsOfExp: parseInt(exp),
								freelancer: checkedFree,
								upiQRCode_url: upiPath ? upiPath : ''
							  })
							  .eq('id', session.user.id)
							  .select().maybeSingle();
						  if(error1) {
							  console.log('insert error:');
							  console.log(error1);
							  return false;
						  }
						  console.log(data1)
						  if(data1) {
							navigation.navigate('AddressInputScreen', {session: session, homeMeasurement: checked, socialMediaAcct: smAcct, noOfEmp: emp, shopPhNo: shopPhNo, topServices: spArr});
							return true;
						  }  else {
								showErrorMessage('Unable to update details!')
							}						
			} catch (error) {
			  showErrorMessage('Error: ' + error.message);
			  return false;
			} finally {
					setExp('')
					setEmp('')
					setUpi('')
					setSmAcct('')
					setQrCodeVisible(false)
					setChecked(false)
					setCheckedFree(false)
					setCheckedUpi(false)
					setUpiQRref(null)
                    setLoading(false)
            }
		}
  };

	const WorkIcon = (style: ImageStyle): IconElement => {
	  return (
		<Icon {...style} name='briefcase-outline' fill={theme['color-primary-100']}/>
	  )
	};
	
	const SmIcon = () => {
	  return (
		<FontAwesome name='instagram' size={22} style={{marginRight: 10}} color={theme['color-primary-100']}/>
	  )
	};

const saveQrToDisk = async () => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Permission to access media library is required!');
    return;
  }

  if (upiQRref) {
    upiQRref.toDataURL(async (data) => {
		let fileUri = ''
		fileUri = `${FileSystem.cacheDirectory}TailorApp_upiqrcode.png`;
		try {
		  await FileSystem.writeAsStringAsync(fileUri, data, {
			encoding: FileSystem.EncodingType.Base64,
		  });
      
			const asset = await MediaLibrary.createAssetAsync(fileUri);
			await MediaLibrary.createAlbumAsync('Download', asset, false);
			showSuccessMessage('QRCode saved to gallery');
		  } catch (error) {
			console.log('Error saving QR code:', error);
		  }
    });
  }
};
	  
const generateUPIString = (upiVal) => {
    const baseUrl = 'upi://pay';
    const params = [
      `pa=${upiVal}`,
      //payeeName ? `pn=${encodeURIComponent(payeeName)}` : '',
      'cu=INR'
    ].join('&');

    return `${baseUrl}?${params}`;
  };

	
  return (
  <ScrollView keyboardShouldPersistTaps="handled">
	<StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content" // Use "dark-content" if your image is bright
      />
    <Layout style={styles.container}>
        {/* Profile Image */}
		<ImageBackground
			source={require('../../../assets/carousel_img2.jpg')}
			style={styles.background}
		/>
		  
		<View style={styles.popup}>
			<Text style={{textAlign: 'center', marginTop: -25, marginBottom: -20, fontSize: 20, fontWeight: 'bold'}}>Tailor Profile Details</Text>
			<View style={styles.formContainer}>
				  <Input
					status={expError ? 'danger' : 'basic'}
					style={styles.formInput}
					autoCapitalize='none'
					label='Years of Experience *'
					keyboardType='numeric'
					accessoryRight={WorkIcon}
					value={exp}
					onChangeText={(val) => {setExp(val); setExpError(false);}}
				  />
				  <Input
				    status={empError ? 'danger' : 'basic'}
					style={styles.formInput}
					autoCapitalize='none'
					label='No. of employees in shop *'
					keyboardType='numeric'
					accessoryRight={PersonIcon}
					value={emp}
					onChangeText={(val) => {setEmp(val); setEmpError(false);}}
				  />
				  <Input
					style={styles.formInput}
					autoCapitalize='none'
					label='Instagram Id'
					accessoryRight={SmIcon}
					value={smAcct}
					onChangeText={setSmAcct}
				  />
				  
				  <Select
				    status={spError ? 'danger' : 'basic'}
				    multiSelect={true}
					style={styles.formInput}
					label='Specialization *'
					selectedIndex={spIndex}
					onSelect={handleSelectSp}
					value={sp}
				  >
					{spServices.map((option, index) => (
					  <SelectItem title={option} key={index} />
					))}
				  </Select>
				  
					<View style={styles.toggleRow}>
						<Text style={styles.toggleText} >Willing to take home measurements for customers?</Text>
						  <Toggle
							  checked={checked}
							  onChange={onCheckedChange}
							  style={{ transform: [{ scale: 0.8 }] }}
							>
							</Toggle>
					</View>
					
						<View>
							<View style={styles.toggleRow}>
								<Text style={styles.toggleText} >Willing to work on orders from other tailors?</Text>
								  <Toggle
									  checked={checkedFree}
									  onChange={onCheckedChangeFree}
									  style={{ transform: [{ scale: 0.8 }] }}
									>
									</Toggle>
							</View>
							<View style={styles.toggleRow}>
								<Text style={styles.toggleText} >Accept order payments from customers via UPI?</Text>
								  <Toggle
									  checked={checkedUpi}
									  onChange={onCheckedChangeUpi}
									  style={{ transform: [{ scale: 0.8 }] }}
									>
									</Toggle>
							</View>
							{checkedUpi && (
								<View style={{marginBottom: 10}}>
								  <View style={styles.upiInputContainer}>
									<Input
										style={styles.upiInput}
										autoCapitalize='none'
										label='UPI id'
										value={upi}
										onChangeText={(text) => setUpi(text)}
									  />
								  </View>
								  {qrCodeVisible && upi !== '' && (
										<View style={{width: 200, justifyContent: 'center'}}>
											<Text style={styles.qrCodeText}>UPI QR Code</Text>
											<View style={{marginHorizontal: 80}}>
											<QRCode
												value={generateUPIString(upi)}
												getRef={(c) => setUpiQRref(c)}
												logoSize={30}
												logoBackgroundColor='white'
												quietZone={20}
											  />
											  <Button
												  style={styles.saveQrButton}
												  size='small'
												  appearance='ghost'
												  onPress={saveQrToDisk}
												>
												  Save QR Code
												</Button>
											</View>
											<Text style={styles.qrCodeText}>Above QR Code will be included in the customer's bill</Text>
										</View>
									)}
								</View>
							)}
						</View>
						
			</View>
			<View style={{alignItems: 'center'}}>
				{(checkedUpi && !upiQRref) ? (
					<Button
					  size="small"
					  onPress={() => setQrCodeVisible(true)}
					>
					  Generate UPI QR Code
					</Button>
				) : (
					<Button onPress={saveDetails}>
					  Save
					</Button>
				)}
			</View>
		</View>
			  
			      <Modal
					visible={loading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
				  </Modal>

    </Layout>
	</ScrollView>
  );
};

const { width, height } = Dimensions.get("window");

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    marginBottom: 10,
	marginTop: 40
  },
  formInput: {
	marginBottom: 20
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleText: {
    flex: 1,
    marginRight: 15,
  },
  upiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  upiInput: {
    flex: 1,
    marginRight: 10,
  },
  saveQrButton: {
    width: 120,
	marginTop: -10,
	marginLeft: -10
  },
  qrCodeText: {
    textAlign: 'center',
	width: 270,
  },
  signInButton: {
	 marginTop: 10,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: 18,
	marginBottom: 10,
  },
  modalOption: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    margin: 5,
  },
  modalOptionText: {
    fontSize: 16,
	marginTop: 5
  },
  modalIcon: {
    marginRight: 10,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end', // Align modal content to bottom
    margin: 0, // Remove default margin
  },
  modalOptionRow: {
    flexDirection: 'row', // Arrange options horizontally in a row
    justifyContent: 'space-between', // Distribute options evenly
    marginBottom: -20, // Add spacing between options row and cancel button
  },
  background: {
	width: width,
    height: height * 0.35,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    overflow: 'hidden',
  },
  popup: {
    width: width,
    padding: 40,
    backgroundColor: "#fff",
  },
  text: {
    color: 'white',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: width - 20,
    borderRadius: 15,
    padding: 10,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  qrCodeContainer: {
    padding: 20, // Adjust padding as needed
    backgroundColor: 'white', // Optional, ensure contrast around the QR code
    alignSelf: 'center', // Center the QR code container
  },
  link: {
    color: '#3366FF', // Link color (you can customize this)
    textDecorationLine: 'underline',
  },
  headerText: {
	position: 'absolute',
	top: 50,
	left: 100,
  }
});

export default TailorDetailsScreen;