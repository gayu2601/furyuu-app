import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Alert,
  Linking,
  Vibration,
  Animated,
  Modal,
  TouchableOpacity
} from 'react-native';
import {
  Layout,
  Text,
  Card,
  Button,
  Icon,
  Divider,
  TopNavigation,
  TopNavigationAction,
} from '@ui-kitten/components';
import * as Clipboard from 'expo-clipboard';
import { useRevenueCat } from '../main/RevenueCatContext';
import { useUser } from '../main/UserContext';
import PaywallScreen from '../main/PaywallScreen';
import { supabase } from '../../constants/supabase';
import { logFirebaseEvent } from '../extra/firebaseUtils';
import moment from 'moment';

const DigitalPortfolioScreen = ({ navigation, route }) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { subscriptionActive, trialSubStartDate, trialSubEndDate, user } = useRevenueCat();
  console.log(trialSubStartDate + ',' + trialSubEndDate)
  const { currentUser } = useUser();
  const [isTrial, setIsTrial] = useState(true);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
const [portfolioData, setPortfolioData] = useState({});;
  
  useEffect(() => {
	if (user?.entitlements?.active['premium']) {
		setIsTrial(false);
	}
	const now = moment();
			const endDate = trialSubEndDate;
			const daysRemainingLocal = endDate ? moment(endDate).diff(now, 'days') : 0;
	if(trialSubEndDate) {
		setPortfolioData({
					url: "https://thaiyalapp.in/" + currentUser.ShopDetails.slug, 
					status: subscriptionActive ? "active" : "expired",
					subscriptionType: isTrial ? 'free_trial' : 'subscription',
					expiryDate: trialSubEndDate,
					daysRemaining:  daysRemainingLocal
		});
	}
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
	logFirebaseEvent('subscribe', {from_screen: 'digital_portfolio'});
    setPaywallVisible(true);
  };


  // Icons
  const BackIcon = (props) => <Icon {...props} name='arrow-back' />;
  const GlobeIcon = (props) => <Icon {...props} name='globe-2-outline' />;
  const CopyIcon = (props) => <Icon {...props} name='copy-outline' />;
  const ShareIcon = (props) => <Icon {...props} name='share-outline' />;
  const EyeIcon = (props) => <Icon {...props} name='eye-outline' />;
  const ClockIcon = (props) => <Icon {...props} name='clock-outline' />;
  const CheckIcon = (props) => <Icon {...props} name='checkmark-circle-2' />;
  const AlertIcon = (props) => <Icon {...props} name='alert-triangle-outline' />;
  const StopIcon = (props) => <Icon {...props} name='stop-circle-outline' />;
  const BarChartIcon = (props) => <Icon {...props} name='bar-chart-outline' />;
  const CreditCardIcon = (props) => <Icon {...props} name='credit-card-outline' />;

  // Navigation
  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
  );

  // Utility functions
  const getStatusColor = () => {
    switch (portfolioData.status) {
      case 'active': return '#00C896';
      case 'expiring': return '#FFAA00';
      case 'expired': return '#FF3D71';
      default: return '#8F9BB3';
    }
  };

  const getStatusIcon = () => {
    switch (portfolioData.status) {
      case 'active': return CheckIcon;
      case 'expiring': return AlertIcon;
      case 'expired': return StopIcon;
      default: return ClockIcon;
    }
  };

  const getStatusText = () => {
    const { status, expiryDate, daysRemaining, subscriptionType } = portfolioData;
    
    if (status === 'active') {
      const typeText = subscriptionType === 'free_trial' ? 'Free Trial' : 'Subscription';
      return `Active until ${formatDate(expiryDate)} (${typeText}: ${daysRemaining} days remaining)`;
    } else if (status === 'expiring') {
      return `Expiring soon - ${daysRemaining} days remaining`;
    } else {
      return `Expired on ${formatDate(expiryDate)}`;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Action handlers
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(portfolioData.url);
      setCopied(true);
      Vibration.vibrate(50);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('Copied!', 'Portfolio URL copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy URL');
    }
  };

  const handleShare = () => {
    Alert.alert(
      'Share Portfolio',
      'Share your digital portfolio with clients and collaborators',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy Link', onPress: handleCopy },
      ]
    );
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const supported = await Linking.canOpenURL(portfolioData.url);
      
      if (supported) {
        await Linking.openURL(portfolioData.url);
      } else {
        Alert.alert('Error', 'Cannot open portfolio URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open portfolio');
    } finally {
      setLoading(false);
    }
  };

  // Portfolio URL Card
  const PortfolioUrlCard = () => {
    const StatusIcon = getStatusIcon();
	const statusColor = getStatusColor();
    
	return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <GlobeIcon style={styles.cardIcon} fill='#3366FF' />
        <Text category='h6' style={styles.cardTitle}>
          Your Portfolio Website
        </Text>
      </View>
      
      <View style={styles.urlContainer}>
        <Text category='s2' style={styles.urlText}>
          {portfolioData.url}
        </Text>
      </View>
      
      <View style={styles.actionButtons}>
        <Button
          size='small'
          appearance='outline'
          accessoryLeft={copied ? CheckIcon : CopyIcon}
          onPress={handleCopy}
          style={styles.actionButton}
          status={copied ? 'success' : 'primary'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        
        <Button
          size='small'
          appearance='outline'
          accessoryLeft={ShareIcon}
          onPress={handleShare}
          style={styles.actionButton}
        >
          Share
        </Button>
        
        <Button
          size='small'
          appearance='filled'
          accessoryLeft={EyeIcon}
          onPress={handlePreview}
          style={styles.actionButton}
          disabled={loading || portfolioData.status === 'expired'}
        >
          {loading ? 'Opening...' : 'Preview'}
        </Button>
      </View>
      
      <Text category='s2' appearance='hint' style={styles.cardDescription}>
        Share your digital portfolio with clients and collaborators
      </Text>
	  
		<View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <StatusIcon style={styles.statusIcon} fill={statusColor} />
            <Text category='s1' style={[styles.statusText, { color: statusColor }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        
        <Text category='s2' appearance='hint' style={styles.cardDescription1}>
          {portfolioData.status === 'expired' 
            ? 'Renew your subscription to reactivate your portfolio'
            : 'Your portfolio will remain live until your free trial / subscription expires'
          }
        </Text>
        
        {portfolioData.status === 'expired' && (
          <View style={styles.actionButtons1}>
            <Button
              size='small'
              appearance='filled'
              status='primary'
              accessoryLeft={CreditCardIcon}
              onPress={() => setPaywallVisible(true)}
              style={[styles.actionButton, { flex: 1 }]}
            >
              Subscribe to Reactivate Portfolio
            </Button>
          </View>
        )}
    </Card>
  )};
  
  const PlaceholderCard = () => (
  <Card style={styles.placeholderCard}>
    <View style={styles.placeholderContent}>
      <Icon 
        name="link-outline" 
        fill="#8F9BB3" 
        style={styles.placeholderIcon} 
      />
      <Text category='h6' style={styles.placeholderTitle}>
        No Portfolio URL Available
      </Text>
      <Text category='s1' style={styles.placeholderDescription}>
        Activate your free trial to create and share your digital portfolio
      </Text>
      <Button
        style={styles.activateButton}
        onPress={() => setPaywallVisible(true)}
        appearance='filled'
        status='primary'
      >
        Activate Free Trial
      </Button>
    </View>
  </Card>
);



  return (
    <Layout style={styles.container} level='2'>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {portfolioData?.url ? (
		  <PortfolioUrlCard />
		) : (
		  <PlaceholderCard />
		)}

      </ScrollView>
	  <Modal
		  visible={paywallVisible}
		  animationType="slide"
		  transparent={true}
		  onRequestClose={() => setPaywallVisible(false)} // Handle Android back press
		>
		  <View style={styles.modalContainer1}>
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
		</Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardDescription: {
    marginTop: 12,
    lineHeight: 16,
  },
  cardDescription1: {
    lineHeight: 16,
	marginRight: -10
  },
  urlContainer: {
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  urlText: {
    color: '#8F9BB3',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButtons1: {
    marginBottom: 8,
	marginTop: 16
  },
  actionButton: {
    flex: 1,
    borderRadius: 6,
  },
  statusContainer: {
    marginVertical: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontWeight: '500',
  },
  analyticsContainer: {
    gap: 8,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyticsText: {
    flex: 1,
  },
  modalContainer1: {
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
  placeholderCard: {
    margin: 16,
    borderRadius: 12,
  },
  placeholderContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#222B45',
  },
  placeholderDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#8F9BB3',
    lineHeight: 20,
  },
  activateButton: {
    minWidth: 160,
    borderRadius: 8,
  },

});

export default DigitalPortfolioScreen;