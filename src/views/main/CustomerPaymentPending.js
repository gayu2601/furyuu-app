import React, { useState, useEffect } from 'react';
import { supabase } from '../../constants/supabase';
import {
  StyleSheet,
  ScrollView,
  View,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  Layout,
  Text,
  Card,
  Input,
  Button,
  Divider,
  List,
  ListItem,
  TopNavigation,
  TopNavigationAction,
  Icon,
  Toggle,
  Datepicker,
  Select,
  SelectItem,
  IndexPath,
  Spinner,
} from '@ui-kitten/components';
import { LinearGradient } from 'expo-linear-gradient';
import eventEmitter from './eventEmitter';

const { width, height } = Dimensions.get('window');

const FilterIcon = (props) => (
  <Icon {...props} name='funnel-outline'/>
);

const CalendarIcon = (props) => (
  <Icon {...props} name='calendar'/>
);

const SearchIcon = (props) => (
  <Icon {...props} name='search-outline'/>
);

const CloseIcon = (props) => (
  <Icon {...props} name='close-outline'/>
);

const ArrowDownIcon = (props) => (
  <Icon {...props} name='arrow-ios-downward'/>
);

const ArrowUpIcon = (props) => (
  <Icon {...props} name='arrow-ios-upward'/>
);

const EmptyIcon = (props) => (
  <Icon {...props} name='inbox-outline'/>
);

const CustomerPaymentPending = () => {
  const [orders, setOrders] = useState(null);
  const [filteredOrders, setFilteredOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const [fromDate, setFromDate] = useState(new Date('2025-01-01'));
  const [toDate, setToDate] = useState(new Date('2025-12-31'));
	
	useEffect(() => {
		const getPaymentStatus = async() => {
			try {
				setLoading(true);  
				const {data, error} = await supabase
				  .rpc('get_cust_payments');
				if(error) {
					throw error;
				}
				//console.log(data);
				if(data) {
					setOrders(data);
					setFilteredOrders(data);
				} else {
					setOrders([]);
					setFilteredOrders([]);
				}
			} catch(error) {
				console.error(error);
				setOrders([]);
				setFilteredOrders([]);
			} finally {
				setLoading(false);
			}
		}
		getPaymentStatus();
		
		eventEmitter.once('payStatusChanged', getPaymentStatus);
	}, []);

  // Calculate summary statistics
  const calculateSummary = (ordersList) => {
    if (!ordersList || ordersList.length === 0) {
      return { totalOrders: 0, totalAmount: 0, totalPending: 0 };
    }
    
    const totalOrders = ordersList.length;
    const totalAmount = ordersList.reduce((sum, order) => sum + order.orderAmt, 0);
    const totalPending = ordersList.reduce((sum, order) => sum + order.pendingAmt, 0);
    
    return { totalOrders, totalAmount, totalPending };
  };

  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0, totalPending: 0 });

  // Apply filters
  const applyFilters = () => {
	  console.log('applyFilters');
    if (!orders || orders.length === 0) {
		console.log('if')
      setFilteredOrders([]);
      setSummary({ totalOrders: 0, totalAmount: 0, totalPending: 0 });
      return;
    }
    
    let filtered = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const matchesCustomer = customerFilter === '' || 
        order.custName?.toLowerCase().includes(customerFilter?.toLowerCase());
      const matchesFromDate = orderDate >= fromDate;
      const matchesToDate = orderDate <= toDate;
      
      return matchesCustomer && matchesFromDate && matchesToDate;
    });
	
	console.log(filtered)
    
    setFilteredOrders(filtered);
    setSummary(calculateSummary(filtered));
  };

  const clearFilters = () => {
    setCustomerFilter('');
    setFromDate(new Date('2024-01-01'));
    setToDate(new Date('2024-12-31'));
    setFilteredOrders(orders || []);
    setSummary(calculateSummary(orders || []));
  };

  useEffect(() => {
    if (orders) {
      applyFilters();
    }
  }, [customerFilter, fromDate, toDate, orders]);

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#059669';
      case 'Partial': return '#d97706';
      case 'Pending': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusBackgroundColor = (status) => {
    switch (status) {
      case 'Paid': return '#d1fae5';
      case 'Partial': return '#fef3c7';
      case 'Pending': return '#fed7d7';
      default: return '#f3f4f6';
    }
  };

  const renderOrderCard = ({ item }) => (
    <Card style={styles.orderCard} status='basic'>
      <View style={styles.orderHeader}>
		<Text style={styles.orderNo}>#{item.orderNo}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusBackgroundColor(item.paymentStatus) }
        ]}>
          <Text style={[
            styles.statusText, 
            { color: getStatusColor(item.paymentStatus) }
          ]}>
            {item.paymentStatus?.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.customerName}>{item.custName}</Text>
      <Text style={styles.orderDate}>📅 {formatDate(item.orderDate)}</Text>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>ORDER AMOUNT</Text>
            <Text style={[styles.detailValue, styles.amountText]}>
              {formatCurrency(item.orderAmt)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>ADVANCE</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.advance)}
            </Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>PENDING AMOUNT</Text>
            <Text style={[
              styles.detailValue, 
              item.pendingAmt > 0 ? styles.pendingText : styles.detailValue
            ]}>
              {formatCurrency(item.pendingAmt)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderSummary = () => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>TOTAL ORDERS</Text>
          <Text style={[styles.summaryValue, styles.totalOrdersText]}>
            {summary.totalOrders}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>TOTAL AMOUNT</Text>
          <Text style={[styles.summaryValue, styles.totalAmountText]}>
            {formatCurrency(summary.totalAmount)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>PENDING</Text>
          <Text style={[styles.summaryValue, styles.totalPendingText]}>
            {formatCurrency(summary.totalPending)}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleContainer}>
          <FilterIcon style={styles.filterIcon} fill='#000099' />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <Button
          appearance='ghost'
          accessoryLeft={showFilters ? ArrowUpIcon : ArrowDownIcon}
          onPress={() => setShowFilters(!showFilters)}
        />
      </View>
      
      {showFilters && (
        <View style={styles.filterContent}>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.filterLabel}>FROM DATE</Text>
              <Datepicker
                date={fromDate}
                onSelect={setFromDate}
                accessoryRight={CalendarIcon}
                style={styles.datePicker}
                size='small'
              />
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.filterLabel}>TO DATE</Text>
              <Datepicker
                date={toDate}
                onSelect={setToDate}
                accessoryRight={CalendarIcon}
                style={styles.datePicker}
                size='small'
              />
            </View>
          </View>
          
          <View style={styles.customerFilterContainer}>
            <Text style={styles.filterLabel}>CUSTOMER NAME</Text>
            <Input
              placeholder='Search customer...'
              value={customerFilter}
              onChangeText={setCustomerFilter}
              accessoryRight={SearchIcon}
              style={styles.customerInput}
              size='small'
            />
          </View>
          
          <View style={styles.filterActions}>
            <Button
              appearance='outline'
              onPress={clearFilters}
              style={styles.clearButton}
              size='small'
            >
              Clear All
            </Button>
            <Button
              onPress={applyFilters}
              style={styles.applyButton}
              size='small'
            >
              Apply Filters
            </Button>
          </View>
        </View>
      )}
    </Card>
  );

  const renderLoadingState = () => (
    <Card style={styles.emptyStateCard}>
      <View style={styles.emptyStateContainer}>
        <Spinner size='large' />
        <Text style={styles.emptyStateTitle}>Loading Customer Payments</Text>
        <Text style={styles.emptyStateText}>
          Please wait while we fetch your payment data...
        </Text>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyStateCard}>
      <View style={styles.emptyStateContainer}>
        <EmptyIcon style={styles.emptyStateIcon} fill='#cbd5e0' />
        <Text style={styles.emptyStateTitle}>No Customer Payments Found</Text>
        <Text style={styles.emptyStateText}>
          {orders && orders.length === 0 
            ? "You don't have any customer payment records yet. Once you start receiving payments, they will appear here."
            : "No payments match your current filter criteria. Try adjusting your filters to see more results."
          }
        </Text>
        {filteredOrders && filteredOrders.length === 0 && orders && orders.length > 0 && (
          <Button
            appearance='outline'
            onPress={clearFilters}
            style={styles.clearFiltersButton}
            size='small'
          >
            Clear Filters
          </Button>
        )}
      </View>
    </Card>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderFilters()}
          {renderSummary()}
          {renderLoadingState()}
        </ScrollView>
      );
    }

    if (!orders || orders.length === 0) {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSummary()}
          {renderEmptyState()}
        </ScrollView>
      );
    }
	
	console.log(orders)
	console.log(filteredOrders)

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderFilters()}
        {renderSummary()}
        
        <Card style={styles.ordersCard}>
          {filteredOrders && filteredOrders.length > 0 ? (
            <List
              data={filteredOrders}
              renderItem={renderOrderCard}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            renderEmptyState()
          )}
        </Card>
      </ScrollView>
    );
  };

  return (
    <Layout style={styles.container}>
      {renderContent()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 5,
  },
  userInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000099',
  },
  filterContent: {
    marginTop: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateItem: {
    flex: 0.48,
  },
  filterLabel: {
    fontSize: 11,
    color: '#718096',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  datePicker: {
    backgroundColor: 'white',
  },
  customerFilterContainer: {
    marginBottom: 16,
  },
  customerInput: {
    backgroundColor: 'white',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    flex: 0.48,
    borderColor: '#e2e8f0',
  },
  applyButton: {
    flex: 0.48,
    backgroundColor: '#000099',
    borderColor: '#000099',
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#718096',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalOrdersText: {
    color: '#000099',
  },
  totalAmountText: {
    color: '#059669',
  },
  totalPendingText: {
    color: '#dc2626',
  },
  ordersCard: {
    borderRadius: 16,
    marginBottom: 20,
  },
  ordersTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#2d3748',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  orderCard: {
    marginBottom: 0,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    flex: 1
  },
  customerName: {
	fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    flex: 1,
	marginBottom: 5,
	marginTop: -5
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 12,
    color: '#667eea',
    marginBottom: 12,
    fontWeight: '500',
  },
  orderDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 0.48,
  },
  detailLabel: {
    fontSize: 11,
    color: '#718096',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  amountText: {
    color: '#059669',
  },
  pendingText: {
    color: '#dc2626',
  },
  separator: {
    height: 12,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // New empty state styles
  emptyStateCard: {
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearFiltersButton: {
    borderColor: '#000099',
    borderWidth: 1,
  },
});

export default CustomerPaymentPending;