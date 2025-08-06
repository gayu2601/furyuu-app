import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  Linking,
  Vibration,
} from 'react-native';
import {
  Modal,
  Card,
  Text,
  Button,
  Input,
  Layout,
  Icon,
  Divider,
} from '@ui-kitten/components';
import * as Clipboard from 'expo-clipboard';

const SubscriptionSuccessModal = ({ 
  visible, 
  onClose, 
  userUrl = "https://myapp.com/user/john-doe-12345"
}) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Icons
  const CheckIcon = (props) => (
    <Icon {...props} name='checkmark-circle-2' />
  );

  const CopyIcon = (props) => (
    <Icon {...props} name='copy-outline' />
  );

  const ExternalLinkIcon = (props) => (
    <Icon {...props} name='external-link-outline' />
  );

  const ShareIcon = (props) => (
    <Icon {...props} name='share-outline' />
  );

  const GlobeIcon = (props) => (
    <Icon {...props} name='globe-2-outline' />
  );

  const CloseIcon = (props) => (
    <Icon {...props} name='close-outline' />
  );

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(userUrl);
      setCopied(true);
      
	  Vibration.vibrate(50);
	  
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
      
      Alert.alert('Copied!', 'Your webpage URL has been copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy URL to clipboard');
    }
  };

  // Handle opening URL
  const handleOpenUrl = async () => {
    try {
      setLoading(true);
	  onClose();
	  const supported = await Linking.canOpenURL(userUrl);
      
      if (supported) {
        await Linking.openURL(userUrl);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL');
    } finally {
      setLoading(false);
    }
  };

  // Handle share (you can implement native sharing here)
  const handleShare = () => {
	onClose();
    Alert.alert(
      'Share Your Page',
      'Share your digital portfolio webpage with friends and family!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy Link', onPress: handleCopy },
      ]
    );
  };

  const Header = () => (
    <Layout style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.successIconContainer}>
          <CheckIcon style={styles.successIcon} fill='#00C896' />
        </View>
        <Text category='h5' style={styles.headerTitle}>
          Welcome Aboard!
        </Text>
        <Text category='s1' appearance='hint' style={styles.headerSubtitle}>
          Your subscription is now active
        </Text>
      </View>
      <Button
		status='basic'
        appearance='ghost'
        accessoryLeft={CloseIcon}
        onPress={onClose}
		size='large'
        style={styles.closeButton}
      />
    </Layout>
  );

  const UrlSection = () => (
    <Layout style={styles.urlSection}>
      <View style={styles.urlHeader}>
        <GlobeIcon style={styles.urlIcon} fill='#3366FF' />
        <Text category='s1' style={styles.urlLabel}>
          Your Digital Portfolio Page
        </Text>
      </View>
      
      <View style={styles.urlInputContainer}>
        <Input
          value={userUrl}
          editable={false}
          textStyle={styles.urlInput}
          style={styles.urlInputField}
        />
        <Button
          appearance='filled'
          status={copied ? 'success' : 'primary'}
          accessoryLeft={copied ? CheckIcon : CopyIcon}
          onPress={handleCopy}
          style={styles.copyButton}
          size='small'
        />
      </View>
    </Layout>
  );

  const ActionButtons = () => (
    <Layout style={styles.actionButtons}>
      <Button
        appearance='filled'
        status='primary'
        accessoryLeft={ExternalLinkIcon}
        onPress={handleOpenUrl}
        style={styles.primaryButton}
        disabled={loading}
      >
        {loading ? 'Opening...' : 'Visit Page'}
      </Button>
      
      <Button
        appearance='outline'
        accessoryLeft={ShareIcon}
        onPress={handleShare}
        style={styles.shareButton}
      />
    </Layout>
  );

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <Card disabled={true} style={styles.card}>
        <Header />
        
        <Divider style={styles.divider} />
        <Layout style={styles.infoSection}>
            <Text category='s2' appearance='hint' style={styles.infoText}>
              * This page will remain active during your free trial or subscription period only.
            </Text>
          </Layout>
        <Layout style={styles.content}>
          <UrlSection />
          
          <ActionButtons />
          
          {/* Optional: Additional info */}
          <Layout style={styles.infoSection}>
            <Text category='s2' appearance='hint' style={styles.infoText}>
              You can access the above webpage url anytime from your profile settings.
            </Text>
          </Layout>
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
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  closeButton: {
	position: 'absolute',
	right: -30,
	top: -15
  },
  divider: {
    marginVertical: 8,
  },
  content: {
    paddingTop: 16,
  },
  urlSection: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  urlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  urlIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  urlLabel: {
    fontWeight: '600',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInputField: {
    flex: 1,
  },
  urlInput: {
    fontSize: 12,
    color: '#8F9BB3',
  },
  copyButton: {
    paddingHorizontal: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
  },
  shareButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  infoSection: {
    paddingTop: 8,
  },
  infoText: {
    lineHeight: 16,
  },
});

export default SubscriptionSuccessModal;