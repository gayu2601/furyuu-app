import React, { useState, useEffect, memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity, ScrollView,
  Dimensions
} from 'react-native';
import {
  Layout,
  Text,
  Card,
  Button,
  Divider,
  Spinner,
  Icon,
  TopNavigation,
  TopNavigationAction,
  useTheme,
  StyleService,
  useStyleSheet,
  RangeCalendar,
  Modal,
  Card as UIKittenCard,
} from '@ui-kitten/components';
import { supabase } from '../../constants/supabase';
import { useUser } from '../main/UserContext';
import { showErrorMessage } from './showAlerts';
import moment from 'moment';
import eventEmitter from './eventEmitter';
import { storage } from '../extra/storage';

const IncomeExpenseHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date filter states
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [range, setRange] = useState({});
  const [dateFilterActive, setDateFilterActive] = useState(false);
  
  const theme = useTheme();
  const styles = useStyleSheet(themedStyles);
  const { currentUser } = useUser();

	let tt = storage.getString(currentUser.username + '_income_expense_tooltip_shown');
  const [showTooltip, setShowTooltip] = useState(!tt ? true : false);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('IncomeExpense')
        .select('*')
        .eq('username', currentUser.username)
        .order('created_at', { ascending: false });
	  
	  if (dateFilterActive && range.startDate && range.endDate) {
			const formattedStartDate = moment(range.startDate).format('YYYY-MM-DD')
			const formattedEndDate = moment(range.endDate).format('YYYY-MM-DD')
			query = query.gte('created_at', formattedStartDate);
			query = query.lte('created_at', formattedEndDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTransactions(data || []);
	  if(data.length > 0) {
		  const tt = data.reduce((sum, transaction) => {
			return transaction.entryType === 'Income' 
			  ? sum + transaction.amount 
			  : sum - transaction.amount;
		  }, 0);
		  setTotal(tt);
		}
    } catch (error) {
      showErrorMessage('Error fetching transactions: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRealtimeUpdate = (payload) => {
	console.log('in handleRealtimeUpdate');
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setTransactions(prev => {
      let updated;
      switch (eventType) {
        case 'INSERT':
          updated = [newRecord, ...prev];
          break;
        case 'UPDATE':
          updated = prev.map(t => t.id === newRecord.id ? newRecord : t);
          break;
        case 'DELETE':
          updated = prev.filter(t => t.id !== oldRecord.id);
          break;
        default:
          return prev;
      }
      
      // Recalculate total
      const newTotal = updated.reduce((sum, transaction) => {
        return transaction.entryType === 'Income' 
          ? sum + transaction.amount 
          : sum - transaction.amount;
      }, 0);
      setTotal(newTotal);
      
      return updated;
    });
  };

  useEffect(() => {
	eventEmitter.on('transactionAdded', fetchTransactions);
    fetchTransactions();
	const subscription = supabase
	  .channel('income-expense-changes')
	  .on(
		'postgres_changes',
		{
		  event: '*',
		  schema: 'public',
		  table: 'IncomeExpense'
		},
		(payload) => {
		  console.log('in realtime useEffect');
		  const { eventType, new: newRecord, old: oldRecord } = payload;
		  
		  // For UPDATE events, check if amount actually changed
		  if (eventType === 'UPDATE') {
			if (newRecord.amount === oldRecord.amount) {
			  return; // Skip if amount didn't change
			}
		  }
		  
		  // Call your handler for all other cases
		  handleRealtimeUpdate(payload);
		}
	  )
	  .subscribe();
	
	return () => {
        // Cleanup listener
        eventEmitter.off('transactionAdded', fetchTransactions);
		subscription.unsubscribe();
    };
  }, [dateFilterActive, range.startDate, range.endDate, currentUser.username]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const CalendarModal = memo(({ visible, onClose, value, onSelect, onDateChange, onReset }) => {
	  const [localRange, setLocalRange] = useState(value);
	  
	  useEffect(() => {
		if (visible) {
		  setLocalRange(value);
		}
	  }, [visible, value]);
	  
	  const handleLocalDateChange = (nextRange) => {
		// Only update local state, doesn't trigger parent re-render
		setLocalRange(nextRange);
	  };
	  
	  const handleConfirm = () => {
		// Pass the local range directly when confirming to ensure immediate update
		onDateChange(localRange);
		onSelect(localRange);
	  };

	  const renderCalendarFooter = () => (
		<View style={styles.footerContainer}>
		  <Button 
			size="small" 
			appearance="outline"
			style={styles.footerButton}
			onPress={onReset}>
			Reset
		  </Button>
		  <Button 
			size="small"
			style={styles.footerButton}
			onPress={handleConfirm}>
			Select Range
		  </Button>
		</View>
	  );

	  return (
		<Modal
			visible={visible}
			backdropStyle={styles.backdrop}
			onBackdropPress={onClose}>
			<Card disabled={true}>
				<TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
					<Icon name="close-outline" style={styles.modalCloseIcon} />
				</TouchableOpacity>
			  <Text category="h6" style={styles.title}>Select Date Range</Text>
			  <RangeCalendar
				range={localRange}
				onSelect={handleLocalDateChange}
				renderFooter={renderCalendarFooter}
				min={new Date(1900, 0, 0)}
				max={new Date(2050, 0, 0)}
			  />
			</Card>
		  </Modal>
		);
	});

	const handleDelete = async(id) => {
		const response = await supabase
				  .from('IncomeExpense')
				  .delete()
				  .eq('id', id);
			if (response.error) {
				  console.error('Deletion failed:', response.error.message);
				  showErrorMessage('Error deleting transaction');
			}
			eventEmitter.emit('transactionAdded')
	}
	
  const renderItem = ({ item }) => {
    const isIncome = item.entryType === 'Income';
    const amountColor = isIncome ? 'color-success-500' : 'color-danger-500';
    
    return (
      <Card style={styles.card} disabled>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <View style={[styles.typeBadge, { backgroundColor: isIncome ? theme['color-success-100'] : theme['color-danger-100'] }]}>
              <Text style={[styles.typeText, { color: isIncome ? theme['color-success-700'] : theme['color-danger-700'] }]}>
                {item.entryType}
              </Text>
            </View>
            <Text category="h6" style={styles.category}>{item.category}</Text>
          </View>
          <Text style={[styles.amount, { color: theme[amountColor] }]}>
            Rs. {parseFloat(item.amount).toFixed(2)}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.cardFooter}>
          <View>
            {item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}
			<View style={styles.footerContainer1}>
				<Text appearance="hint" style={styles.date}>
				  {formatDate(item.created_at)}
				</Text>
				<Button
					style={styles.footerButtonText}
					appearance='ghost'
					size='small'
					onPress={() => handleDelete(item.id)}
					accessoryLeft={(props) => <Icon name="trash-2-outline" fill="#FF0000" style={{ width: 20, height: 20 }} />}
				/>
			</View>
          </View>
        </View>
      </Card>
    );
  };

  const FilterIcon = (props) => <Icon {...props} name="funnel-outline" />;
  const CalendarIcon = (props) => <Icon {...props} name="calendar-outline" />;
  const CloseIcon = (props) => <Icon {...props} name="close-outline" />;

  const renderDateFilterAction = () => (
    <TopNavigationAction icon={CalendarIcon} onPress={() => setDateFilterVisible(true)} />
  ); 
  
  const renderDateFilterText = () => {
	  if (!dateFilterActive) return (<Text style={styles.dateRangeText}>All transactions</Text>);
	  const startDateStr = range.startDate ? formatDate(range.startDate) : 'Any';
      const endDateStr = range.endDate ? formatDate(range.endDate) : 'Any';
	  return (
	    <Text style={styles.dateRangeText}>{startDateStr} - {endDateStr}</Text>
	  );
  }

  const renderDateFilterBadge = () => {
    if (!dateFilterActive) return null;
    
    const startDateStr = range.startDate ? formatDate(range.startDate) : 'Any';
    const endDateStr = range.endDate ? formatDate(range.endDate) : 'Any';
    
    return (
      <View style={styles.dateFilterBadge}>
        <Text category="label" style={styles.dateFilterText}>
          {startDateStr} - {endDateStr}
        </Text>
        <TouchableOpacity onPress={resetRange} style={styles.dateFilterClear}>
          <Icon name="close" width={16} height={16} fill={theme['color-basic-600']} />
        </TouchableOpacity>
      </View>
    );
  };

  const resetRange = () => {
	if(dateFilterActive) {
		setDateFilterVisible(false);
		setRange({});
		setDateFilterActive(false);
	}
  };
  
  const onDateChange = (nextRange) => {
    setRange(nextRange);
  }
  
  // Updated to accept the current range directly from the calendar modal
  const onConfirmDatePicker = (selectedRange) => {
	setDateFilterVisible(false);
	// Use the directly passed selectedRange to ensure we have the latest value
	if(selectedRange && selectedRange.startDate && selectedRange.endDate) {
		setDateFilterActive(true);
	}
  };
  
  const closeTooltip = () => {
	setShowTooltip(false); 
	storage.set(currentUser.username + '_income_expense_tooltip_shown', 'true');
  }
  
  return (
  <View style={styles.outerContainer}>
  <ScrollView>
    <Layout style={styles.container}>
      <TopNavigation
        title={() => (
			renderDateFilterText()
		)}
        alignment="center"
		accessoryRight={() => (
          <View style={styles.topNavActions}>
            {renderDateFilterAction()}
          </View>
        )}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Spinner size="large" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
				<View style={styles.centerContent}>
				  <Text category="h6">No entries found</Text>
				  <Text appearance="hint" style={styles.descriptionText}>
					{dateFilterActive 
					  ? "No income/expense found in selected date range" 
					  : "Start adding other income/expenses"}
				  </Text>
				</View>
              <Button
                style={styles.addNewButton}
                onPress={() => navigation.navigate('AddExpenseScreen')}
              >
                Add New Income/Expense
              </Button>
            </View>
          )}
        />
      )}

	  <CalendarModal
        visible={dateFilterVisible}
        onClose={() => setDateFilterVisible(false)}
        value={range}
        onSelect={onConfirmDatePicker}
		onDateChange={onDateChange}
		onReset={resetRange}
      />
	  
	  {transactions.length > 0 && <Card style={styles.totalContainer} status='primary'>
          <View style={styles.totalContent}>
            <Text style={styles.totalLabel}>Net Balance</Text>
            <Text style={[
              styles.totalAmount, 
              { color: total >= 0 ? '#2e7d32' : '#c62828' }
            ]}>
			  <Text style={[styles.totalAmountSign, { color: total >= 0 ? '#2e7d32' : '#c62828' }]}>{total < 0 ? '- ' : ''}</Text>
              Rs. {Math.abs(total).toFixed(2)}
            </Text>
          </View>
      </Card>
	  }
    </Layout>
	</ScrollView>
	
	{transactions.length > 0 && (<Button
        style={styles.floatingButton}
        onPress={() => navigation.navigate('AddExpenseScreen')}
        accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
	/>)}
	</View>
  );
};
const HEIGHT = Dimensions.get('window').height;

const themedStyles = StyleService.create({
  outerContainer: {
	flex: 1,
    backgroundColor: '#f7f9fc'
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  category: {
    fontWeight: '600',
  },
  amount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    marginVertical: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  description: {
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
	marginTop: HEIGHT/4,
	alignItems: 'center'
  },
  addNewButton: {
    marginTop: 20,
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'border-basic-color-3',
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  activeFilter: {
    backgroundColor: 'color-primary-500',
  },
  topNavActions: {
    flexDirection: 'row',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dateFilterModal: {
    width: 300,
    borderRadius: 12,
    padding: 16,
  },
  dateFilterTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  dateFilterLabel: {
    marginBottom: 4,
    marginTop: 8,
  },
  datepicker: {
    marginBottom: 8,
  },
  dateFilterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dateFilterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'color-primary-100',
    padding: 8,
    margin: 8,
	marginLeft: 15,
	marginTop: 0,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dateFilterText: {
    color: 'color-primary-700',
    marginRight: 8,
  },
  dateFilterClear: {
    padding: 2,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
	alignItems: 'center',
    marginTop: 16,
	gap: 30
  },
  footerButton: {
    marginLeft: 8,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  modalCloseButton: {
    position: 'absolute', 
    top: -30, 
    right: -30, 
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
    borderRadius: 15, 
    padding: 5, 
  },
  modalCloseIcon: {
    width: 30, 
    height: 30,
  },
  footerContainer1: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: -10, marginBottom: -10},
  footerButtonText: {marginRight: -10},
  totalContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
	marginTop: -15,
	marginBottom: 15,
	shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalAmountSign: {
    fontSize: 22,
    fontWeight: '700',
  },
  dateFilterContainer: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  titleTop: {
	  lineHeight: 22,
	  margin: 16,
	  textAlign: 'justify'
  },
  tooltipContent: {
    padding: 10
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tooltipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
	textAlign: 'justify'
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  nextButton1: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  descriptionText: {
	marginTop: 10,
	textAlign: 'center'
  }
});

export default IncomeExpenseHistoryScreen;