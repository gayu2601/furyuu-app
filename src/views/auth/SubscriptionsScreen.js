import React, { useState, useEffect } from 'react';
import { StyleSheet, BackHandler, Alert } from 'react-native';
import {
  Layout,
  Text,
  Card,
  Spinner,
  List,
  ListItem,
  Button,
} from '@ui-kitten/components';
import { useRevenueCat } from "../main/RevenueCatContext";
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';

const SubscriptionsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubs, setActiveSubs] = useState(null);
  const { user, cancelSub, subscriptionActive, trialSubStartDate, trialSubEndDate } = useRevenueCat();
  const navigation = useNavigation();
  const trialActivePeriod = `${moment(trialSubStartDate).format('DD-MM-YYYY')} to ${moment(trialSubEndDate).format('DD-MM-YYYY')}`
  
  useEffect(() => {
		const backAction = () => {
			  navigation.navigate('ProfileScreen')
			  return true;
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, []);

  useEffect(() => {
    fetchSubscriptionDetails();  
  }, []);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get customer info from RevenueCat
      const customerInfo = user;
	  console.log('customerInfo: ')
	  console.log(user);
      if (customerInfo?.entitlements?.active['premium']) {
			let subs = customerInfo?.entitlements?.active['premium'];
			console.log(subs)
          const purchaseDate = new Date(subs.latestPurchaseDate);
          const expirationDate = new Date(subs.expirationDate);
          
          let activeSubscriptions = {
            id: subs.identifier,
            purchaseDate: purchaseDate.toLocaleDateString(),
            expirationDate: expirationDate.toLocaleDateString(),
            status: 'Active',
          };
        
		  console.log('activeSubscriptions:')
		  console.log(activeSubscriptions)

		  setActiveSubs(activeSubscriptions)
      }
    } catch (err) {
      setError('Failed to fetch subscription details. Please try again.');
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" />
        <Text category="s1" style={styles.loadingText}>
          Loading subscription details...
        </Text>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={styles.errorContainer}>
        <Text category="s1" status="danger">
          {error}
        </Text>
        <Button onPress={fetchSubscriptionDetails} style={styles.retryButton}>
          Retry
        </Button>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <Text category="h6" style={styles.sectionTitle}>
        Active Subscriptions
      </Text>
      {subscriptionActive ? (
		  activeSubs ? (
			<>
			  <Card style={styles.subscriptionCard} status="primary">
				<Text category="s1" style={styles.boldText}>Subscription ID: {activeSubs.id}</Text>
				<Text category="s1" style={styles.dateText}>
				  Purchase Date: {activeSubs.purchaseDate}
				</Text>
				<Text category="s1" style={styles.dateText}>
				  Expiration Date: {activeSubs.expirationDate}
				</Text>
				<Text category="s1" style={styles.statusText} status="success">
				  Status: {activeSubs.status}
				</Text>
			  </Card>
			  <Button appearance='outline' size='small' onPress={cancelSub}>Cancel Subscription</Button>
			</>
		  ) : (
			trialSubEndDate ? (
			  <>
				<Text category="s1" style={styles.trialText}>
				  You're currently using a free trial – valid from {trialActivePeriod}. After the trial, subscribe to continue enjoying premium features.
				</Text>
			  </>
			) : (
			  <>
				<Text category="s1" appearance="hint" style={styles.noDataText}>
				  No active subscriptions found
				</Text>
			  </>
			)
		  )
		) : (
		  <>
			<Text category="s1" appearance="hint" style={styles.noDataText}>
			  No active subscriptions found
			</Text>
		  </>
		)}
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  list: {
    marginBottom: 24,
  },
  subscriptionCard: {
    marginBottom: 16,
    padding: 16,
  },
  dateText: {
    marginTop: 8,
  },
  statusText: {
    marginTop: 8,
  },
  noDataText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  boldText: {
	fontWeight: 'bold'
  },
  trialText: {
	  textAlign: 'justify',
	  lineHeight: 24
	}
});

export default SubscriptionsScreen;