import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Modal, TouchableOpacity, Image, Alert } from 'react-native';
import { Layout, Text, Input, Icon, Button, Divider, RadioGroup, Radio } from '@ui-kitten/components';
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import { storage } from '../extra/storage';
import { useNavigation } from '@react-navigation/native';
import { saveSupabaseDataToFile } from '../extra/supabaseUtils';
import { Buffer } from 'buffer';
import { MaterialIcons } from '@expo/vector-icons';

const PaymentSettingsScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { updateCurrentUser, currentUser } = useUser();
  const { isConnected } = useNetwork();
  const navigation = useNavigation();
  const acceptUPIStr = 'Accept Order Payments via UPI';
  
  const [upiIndex, setUpiIndex] = useState(null)
  const [checkedUpi, setCheckedUpi] = useState('');
  const [upi, setUpi] = useState('');
  const [upiQRref, setUpiQRref] = useState(null);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [upiImg, setUpiImg] = useState(null);
  const boolOptions = ['Yes', 'No'];
  
  const profileItems = [
  	{ label: acceptUPIStr, value: checkedUpi, icon: 'qr-code-2' },
	{ label: 'Link Bank Account for Card/Net-banking Order Payments', value: checkedUpi, icon: 'link' },
  ];
  
  useEffect(() => {
	  if(!isConnected) {
			 showErrorMessage("No Internet Connection");
	  }
	  
	    const downloadQrCode = async (fileName) => {
		  let result = null;
		  try {
			const cachedPath = storage.getString(currentUser.username + '_upiQrCode');
			console.log(cachedPath)
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
				
				localFileUri = await saveSupabaseDataToFile(data, fileName);
				console.log(localFileUri)
				storage.set(currentUser.username + '_upiQrCode', localFileUri);
				return result;
			}
		  } catch (error) {
			console.error('Error downloading or converting QR code:', error);
			return null;
		  }
		}
	  
    const fetchUserDetails = async () => {
      if (currentUser) {
        setCheckedUpi(currentUser.upiQRCode_url ? 'Yes' : 'No')
		setUpiIndex(currentUser.upiQRCode_url ? 0 : 1)
		if(currentUser.upiQRCode_url) {
			let a = await downloadQrCode(currentUser.upiQRCode_url);
			setUpiImg(a);
		}
      }
    };

    fetchUserDetails();
  }, []);
  
  const openModal = (item) => {
    setModalVisible(true);
  };

  const closeModal = () => {
	setCheckedUpi(currentUser.upiQRCode_url ? 'Yes' : 'No')
	setUpiIndex(currentUser.upiQRCode_url ? 0 : 1)
	if(!currentUser.upiQRCode_url) {
		setUpi('')
		setUpiImg(null)
	}
	setModalVisible(false);
  };
  
  const handleSave = async() => {
	  let finalVal = null;
	  
		if(upiIndex === 1) {
			console.log('upiIndex is 1')
			finalVal = null;
			storage.delete(currentUser.username + '_upiQrCode');
		} else if(upiIndex === 0 && !upiQRref) {
			closeModal();
			showErrorMessage('Enter UPI Id to enable payments via UPI!');
			return;
		} else {
			const fileName = `${Date.now()}_TailorApp_upiqrcode.png`;
			finalVal = fileName;
			setCheckedUpi('Yes');
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
								const { dataRemove, errorRemove } = await supabase
								  .storage
								  .from('upi-qr-code')
								  .remove([currentUser.upiQRCode_url])
								if(errorRemove) {
									throw errorRemove;
								}

							  } catch (error) {
								console.log('Error saving QR code:', error);
							  }
							});
	}
	
		console.log('finalVal: ' + finalVal);
		
			const { error } = await supabase
							.from('profiles')
							.update({ upiQRCode_url: finalVal})
							.eq('id', currentUser.id)
							.select().maybeSingle();

							if(error) {
								throw error;
							}
		
		const { data: data1, error: error1, status } = await supabase
									.from('profiles')
									.select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
									.eq('id', currentUser.id)
									.maybeSingle()
		if (error1 && status !== 406) {
			console.log(error1)
			throw error1;
		}
		console.log(data1)
		updateCurrentUser(data1);
		showSuccessMessage('Updated ' + acceptUPIStr + '!')

	setModalVisible(false);
  };
  
  const saveQrToDisk = async () => {
	  const { status } = await MediaLibrary.requestPermissionsAsync();
	  if (status !== 'granted') {
		alert('Permission to access media library is required!');
		return;
	  }
		let qr = upiQRref || upiImg;
	  if (qr) {
		qr.toDataURL(async (data) => {
			let fileUri = ''
			fileUri = `${FileSystem.cacheDirectory}TailorApp_upiqrcode.png`;
			try {
			  await FileSystem.writeAsStringAsync(fileUri, data, {
				encoding: FileSystem.EncodingType.Base64,
			  });
		  
				const asset = await MediaLibrary.createAssetAsync(fileUri);
				await MediaLibrary.createAlbumAsync('Download', asset, false);
				closeModal();
				showSuccessMessage('QRCode saved to gallery');
			  } catch (error) {
				console.log('Error saving QR code:', error);
			  }
		});
	  }
	};
	
	const saveQrImgToDisk = async () => {
	  const { status } = await MediaLibrary.requestPermissionsAsync();
	  if (status !== 'granted') {
		alert('Permission to access media library is required!');
		return;
	  }
			let fileUri = ''
			fileUri = `${FileSystem.cacheDirectory}TailorApp_upiqrcode.png`;
			const base64data = upiImg.split(',')[1];
			try {
				await FileSystem.writeAsStringAsync(fileUri, base64data, {
					encoding: FileSystem.EncodingType.Base64,
				});
				const asset = await MediaLibrary.createAssetAsync(fileUri);
				await MediaLibrary.createAlbumAsync('Download', asset, false);
				closeModal();
				showSuccessMessage('QRCode saved to gallery');
			  } catch (error) {
				console.log('Error saving QR code:', error);
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
	
	const handleUpiSelect = (index) => {
		setUpiIndex(index);
		setCheckedUpi(boolOptions[index]);
	};
  
  const renderModalContent = () => {
		return (
		  <>
			<RadioGroup
			  selectedIndex={upiIndex}
			  onChange={handleUpiSelect}
			  style={{ flexDirection: 'row', marginRight: 30 }}
			>
			  {boolOptions.map((opt, index) => (
				<Radio key={index}>{opt}</Radio>
			  ))}
			</RadioGroup>

			{upiIndex === 0 && (
			  <View style={{alignItems: 'center'}}>
				{qrCodeVisible && upi !== '' ? (
				  <>
					<QRCode
					  value={generateUPIString(upi)}
					  getRef={(c) => setUpiQRref(c)}
					  logoSize={30}
					  logoBackgroundColor="white"
					  quietZone={20}
					/>
					<Button size="small" appearance="ghost" style={{ marginBottom: 10 }} onPress={saveQrToDisk}>
					  Save QR Code
					</Button>
				  </>
				) : upiImg ? (
					<>
						<Image style={styles.image} source={{ uri: upiImg }} />
						<Button size="small" appearance="ghost" style={{ marginBottom: 10 }} onPress={saveQrImgToDisk}>
						  Save QR Code
						</Button>
					</>
				) : null}

				<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
					<Input
					  style={styles.upiInput}
					  autoCapitalize="none"
					  placeholder="Enter UPI id"
					  value={upi}
					  onChangeText={(text) => setUpi(text)}
					/>
				</View>
			  </View>
			)}
		  </>
		);
  };
  
  const generateQrCode = () => {
	  if(upi !== '') {
		setQrCodeVisible(true);
	  } else {
		showErrorMessage('Enter a valid UPI id!')
	  }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Layout style={styles.container}>
	  <View style={{marginTop: -20}}>
        {profileItems.map((item, index) => (
		  <>
          <TouchableOpacity key={index} style={styles.row} onPress={() => item.label === acceptUPIStr ? openModal(item) : navigation.navigate('LinkAccountScreen')}>
			<MaterialIcons name={item.icon} size={30} color={'#000'} />
            <View style={styles.column}>
              <Text category="label">{item.label}</Text>
			  {item.label === acceptUPIStr && <Text category='s2'>{item.value}</Text>}
            </View>
            <Icon name="chevron-right-outline" style={styles.arrowIcon} fill="#8F9BB3" />
          </TouchableOpacity>
		  </>
        ))}
	  </View>

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text category="h6" style={styles.modalTitle}>
                Edit {acceptUPIStr}
              </Text>
              {renderModalContent()}
              <View style={styles.modalActions}>
                <Button style={styles.button} size='small' onPress={closeModal} appearance="outline">
                  Cancel
                </Button>
				{(upiIndex === 0 && !upiQRref) ? (
					<Button
					  size="small"
					  onPress={generateQrCode}
					>
					  Generate UPI QR Code
					</Button>
				) : (
					<Button style={styles.button} size='small' onPress={handleSave}>
					  Save
					</Button>
				)}
              </View>
            </View>
          </View>
        </Modal>
      </Layout>
	</ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  column: {
    flex: 1,
    marginLeft: 16,
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
	marginTop: 5
  },
  button: {
    marginLeft: 8,
  },
  divider: {
	color: '#ccc',
	marginVertical: 5
  },
  linkStyle: {
    color: '#3366FF', // Link color (you can customize this)
    textDecorationLine: 'underline',
  },
  upiInput: {
    flex: 1,
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
  },
});

export default PaymentSettingsScreen;
