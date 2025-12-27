import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import {
  Modal,
  Card,
  Text,
  Input,
  Button,
  Layout,
  Icon,
  Spinner
} from '@ui-kitten/components';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import { useUser } from './UserContext';
import { storage } from '../extra/storage';
import { Buffer } from 'buffer';
import { supabase } from '../../constants/supabase'
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';

const UPIQRModal = ({ visible, onCloseUpi, currentUser, handleInputChange }) => {
  const [upiId, setUpiId] = useState('');
  const [qrData, setQrData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [upiQRref, setUpiQRref] = useState(null);
  const [errors, setErrors] = useState({});
  const { updateCurrentUser } = useUser();

  // Validate UPI ID format
  const validateUPIId = (id) => {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(id);
  };

  // Generate QR Code
  const handleGenerateQR = async () => {
    // Reset errors
    setErrors({});

    if (!validateUPIId(upiId.trim())) {
      setErrors({ upiId: 'Please enter a valid UPI ID (e.g., user@paytm)' });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate UPI payment URL
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId.trim())}`;
      setQrData(upiUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setUpiId('');
    setQrData('');
    setErrors({});
    setIsGenerating(false);
    onCloseUpi();
  };

  const CloseIcon = (props) => (
    <Icon {...props} name='close-outline' />
  );

  const renderCaption = () => {
    if (errors.upiId) {
      return (
        <Text status='danger' category='c1'>
          {errors.upiId}
        </Text>
      );
    }
    return (
      <Text status='basic' category='c1'>
        Enter your UPI ID (e.g., yourname@paytm)
      </Text>
    );
  };
  
  const handleModalSave = async() => {
	  let upiPath = null;
	  const fileName = `${Date.now()}_TailorApp_upiqrcode.png`;
	  upiPath = fileName;
	  
	  try {
		// Wrap the callback-based toDataURL in a Promise
		const data = await new Promise((resolve, reject) => {
		  upiQRref.toDataURL((dataUrl) => {
			if (dataUrl) {
			  resolve(dataUrl);
			} else {
			  reject(new Error('Failed to generate QR code data URL'));
			}
		  });
		});

		// Now handle the data URL
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
		storage.set('upiQrCode', fileUri);
		
		console.log('upiPath:', upiPath);
		
		// This code will now run AFTER the QR code processing is complete
		if (!handleInputChange) {
		  console.log('no handleInputChange');
		  const { error: error1 } = await supabase
			.from('profiles')
			.update({ 
			  upiQRCode_url: upiPath ? upiPath : ''
			});
			
		  if (error1) {
			console.log('insert error:', error1);
			return false;
		  }
		  const updatedUser = {
				  ...currentUser,
				  upiQRCode_url: upiPath ? upiPath : ''
				};
			updateCurrentUser(updatedUser);
			currentUser.upiQRCode_url = upiPath
		} else {
		  console.log('calling handleInputChange');
		  handleInputChange('upiQRCode_url', upiPath);
		}

		onCloseUpi();
		
	  } catch (error) {
		console.log('Error saving QR code:', error);
		// Handle error appropriately - maybe show user feedback
	  }
	}

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={handleClose}
      style={styles.modal}
    >
      <Card disabled={true} style={styles.card}>
        <Layout style={styles.header}>
          <Text category='h5' style={styles.title}>
            Generate UPI QR Code
          </Text>
          <Button
            appearance='ghost'
            status='basic'
            accessoryLeft={CloseIcon}
            onPress={handleClose}
            style={styles.closeButton}
          />
        </Layout>

        <Layout style={styles.content}>
          <Text category='s1' style={styles.description}>
            Add your UPI ID to show a UPI QR code in the bill for payments
          </Text>
		<View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Input
            placeholder="example@paytm"
            value={upiId}
            onChangeText={setUpiId}
			caption={renderCaption}
            style={styles.input}
            status={errors.upiId ? 'danger' : 'basic'}
            autoCapitalize='none'
            autoCorrect={false}
            keyboardType='email-address'
            disabled={isGenerating}
          />
		  
		  {qrData && 
				<Button appearance='ghost' size='small' style={{marginTop: -35, marginLeft: -5}} onPress={handleGenerateQR}>
				  Change QR
				</Button>
			}
		</View>

		{qrData ? (
				<View style={{justifyContent: 'center', alignItems: 'center'}}>
					  <Text style={styles.qrCodeText}>UPI QR Code</Text>
					  	<QRCode
							value={qrData}
							getRef={(c) => setUpiQRref(c)}
							logoSize={30}
							logoBackgroundColor='white'
							quietZone={20}
						/>
						<Button
							size='small'
							onPress={handleModalSave}
						  style={styles.saveButton}
						>
						  Save
						</Button>
				</View>
			) : (
				<Layout style={styles.buttonContainer}>
				<Button
				  style={[styles.button, styles.cancelButton]}
				  appearance='outline'
				  status='basic'
				  onPress={handleClose}
				  disabled={isGenerating}
				  size='small'
				>
				  Skip
				</Button>
				<Button
				  style={styles.button}
				  size='small'
				  onPress={handleGenerateQR}
				  disabled={!upiId || isGenerating}
				>
				  {isGenerating ? 'Generating...' : 'Generate QR'}
				</Button>
			  </Layout>
			)}
        </Layout>
      </Card>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '90%',
    maxWidth: 400,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
  },
  content: {
	flex: 1
  },
  description: {
    marginBottom: 20,
    opacity: 0.8,
  },
  input: {
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  qrLabel: {
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    borderColor: '#e4e9f2',
  },
});

export default UPIQRModal;