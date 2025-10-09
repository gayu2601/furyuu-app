import React, { useEffect, useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import {
  Layout,
  Card,
  Input,
  Icon,
  Divider,
  Button,
  RangeCalendar,
  Modal
} from '@ui-kitten/components';
import { storage } from '../extra/storage';
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { supabase } from '../../constants/supabase';
import moment from 'moment';

const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' />;
const FilterIcon = (props) => <Icon {...props} name='funnel-outline' />;

const CalendarModal = memo(({ visible, onClose, value, onSelect, onDateChange, onReset }) => {
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
        onPress={onSelect}>
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
		  <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text category="h6" style={styles.title}>Select Date Range</Text>
			<TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
				<Icon name="close-outline" style={styles.modalCloseIcon} />
			</TouchableOpacity>
		  </View>
          <RangeCalendar
            range={value}
            onSelect={onDateChange}
            renderFooter={renderCalendarFooter}
			min={new Date(1900, 0, 0)}
			max={new Date(2050, 0, 0)}
          />
        </Card>
      </Modal>
	);
});

const OrdersByDressType = () => {
  const [selectedRange, setSelectedRange] = useState({});
  const a = moment(new Date()).format('YYYY-MM-DD');
  const b = moment().startOf('year').format('YYYY-MM-DD');
  const [fromDate, setFromDate] = useState(b);
  const [toDate, setToDate] = useState(a);
  const [items, setItems] = useState([]);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  useEffect(() => {
	const getData = async() => {
	  const {data, error} = await supabase.rpc("get_all_products_revenue", {
		parameter1: fromDate,
		parameter2: toDate
	  });
	  if(error) {
		console.log(error)
		showErrorMessage('Error fetching model-wise data: ' + error);
	  }
	  console.log(data)
	  setItems(data);
	}
	getData();
  }, [selectedRange]);
  console.log('items:')
  console.log(items)
  
  const handleRangeSelect = (range) => {
    setSelectedRange(range);
  };
  
  const openCalendar = () => {
    setIsCalendarVisible(true);
  };

  const closeCalendar = () => {
    setIsCalendarVisible(false);
  };

  const totals = useMemo(() => {
    const totalPieces = items?.reduce((sum, item) => sum + item.count, 0) || 0;
    const totalRevenue = items?.reduce((sum, item) => sum + item.sum, 0) || 0;
    return { totalPieces, totalRevenue };
  }, [items]);

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, { flex: 2 }]}>Model</Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Pieces</Text>
      <Text style={[styles.headerText, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
    </View>
  );

  const renderTableRow = (item, index) => (
    <View key={index} style={styles.tableRow}>
      <View style={{ flex: 2 }}>
        <Text style={styles.modelText}>{item.dressType}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={styles.piecesChip}>
          <Text style={styles.piecesText}>{item.count?.toLocaleString()}</Text>
        </View>
      </View>
      <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
        <Text style={styles.revenueText}>₹{item.sum?.toLocaleString()}</Text>
      </View>
    </View>
  );
  
  const resetRange = () => {
	setSelectedRange({});
	setFromDate(b);
	setToDate(a);
	closeCalendar();
  };

  const onConfirmDatePicker = () => {
	closeCalendar();
	const formattedStartDate = moment(selectedRange.startDate).format('YYYY-MM-DD')
	const formattedEndDate = moment(selectedRange.endDate).format('YYYY-MM-DD')
	setFromDate(formattedStartDate);
	setToDate(formattedEndDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <ScrollView style={styles.content}>
        {/* Date Range Filters */}
        <Card style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <FilterIcon style={styles.filterIcon} />
            <Text style={styles.filterTitle}>Date Range</Text>
          </View>
		  
		<TouchableOpacity onPress={openCalendar}>
		  <View style={styles.selectedRangeContainer}>
            <Text style={styles.selectedRangeText}>
              {fromDate} - {toDate}
            </Text>
          </View>
        </TouchableOpacity>
        </Card>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Pieces</Text>
            <Text style={styles.summaryValue}>{totals.totalPieces?.toLocaleString()}</Text>
          </Card>
          
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValueRevenue}>₹{totals.totalRevenue?.toLocaleString()}</Text>
          </Card>
        </View>

        {/* Data Table */}
        <Card style={styles.tableCard}>
          <Text style={styles.tableTitle}>Sales by Model</Text>
          <Divider style={styles.divider} />
          
          {renderTableHeader()}
          
          {items?.length > 0 ? (
            items.map((item, index) => renderTableRow(item, index))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No data found for the selected date range</Text>
            </View>
          )}
        </Card>
		
			  <CalendarModal
				visible={isCalendarVisible}
				onClose={closeCalendar}
				value={selectedRange}
				onSelect={onConfirmDatePicker}
				onDateChange={handleRangeSelect}
				onReset={resetRange}
			  />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterCard: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterIcon: {
    width: 16,
    height: 16,
    tintColor: '#6b7280',
    marginRight: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedRangeContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  selectedRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0369a1',
    textAlign: 'center',
  },
  calendar: {
    backgroundColor: 'transparent',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryValueRevenue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  tableCard: {
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
	textTransform: 'capitalize'
  },
  piecesChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  piecesText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e40af',
  },
  revenueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  noDataContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: '#6b7280',
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
	flex: 1
  },
  modalCloseButton: {
    position: 'absolute', // Absolute positioning for the button
    top: -10, // Adjust vertical position
    right: -10, // Adjust horizontal position
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background for better visibility
    borderRadius: 15, // Make the button circular
    padding: 5, // Add padding to increase touch area
  },
  modalCloseIcon: {
    width: 24, // Size of the icon
    height: 24,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default OrdersByDressType;