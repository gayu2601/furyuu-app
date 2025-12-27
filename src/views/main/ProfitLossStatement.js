import React, { useEffect, useState, memo, useRef, forwardRef, useImperativeHandle } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Layout, Text, Divider, Card, Modal, Spinner, Button, useTheme, Datepicker, Icon, RangeCalendar } from '@ui-kitten/components';
import { supabase } from '../../constants/supabase';
import XLSX from "xlsx";
import * as FileSystem from 'expo-file-system';
import moment from 'moment';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { StorageAccessFramework } from 'expo-file-system';
import { showSuccessMessage, showErrorMessage } from './showAlerts';

const ProfitLossStatement = forwardRef((props, ref) => {
	const theme = useTheme();
	const [orderRev, setOrderRev] = useState(0);
	const [incomeRev, setIncomeRev] = useState(0);
	const [exp, setExp] = useState({});
	const [totalExp, setTotalExp] = useState(0);
	const [loadExcel, setLoadExcel] = useState(false);
	let a = moment('2025-01-01').format('YYYY-MM-DD');
	  let b = moment('2025-12-31').format('YYYY-MM-DD');
	  const [fromDate, setFromDate] = useState(a);
	  const [toDate, setToDate] = useState(b);
	  const [datePickerVisible, setDatePickerVisible] = useState(false);
	  let rangeJson = {startDate: new Date(a), endDate: new Date(b)};
	  const [range, setRange] = useState(rangeJson);
	  const [isDateChanged, setIsDateChanged] = useState(false);

	useEffect(() => {
		getFinancialSummary(range.startDate, range.endDate);
	}, [range]);
	
	const getFinancialSummary = async (startDate, endDate) => {
		  try {
			const { data, error } = await supabase.rpc('get_financial_summary', {
			  p_start_date: startDate,
			  p_end_date: endDate
			});

			if (error) throw error;
			console.log('data', data);
			setOrderRev(data.total_orders || 0);
			setIncomeRev(data.total_income || 0);
			setExp(data.expenses_by_category || {});
			setTotalExp(Object.values(data.expenses_by_category).reduce((sum, value) => sum + value, 0));
		  } catch (error) {
			console.error('Error fetching financial summary:', error);
			throw error;
		  }
	};
		
	useImperativeHandle(ref, () => ({
		getFinancialSummary
	  }));
	
	const CalendarModal = memo(({ visible, onClose, value, onSelect, onDateChange, onReset, isFilter }) => {
	   const [tempRange, setTempRange] = useState(value);
	   
	   useEffect(() => {
		if (visible) {
		  console.log('in useEffect', value);
		  setTempRange(value);
		}
	   }, [visible, value]);
	   
	   const handleReset = () => {
		setTempRange(rangeJson);
		onReset();
	   };
	   
	   const handleSelect = () => {
		onDateChange(tempRange);
		onSelect(tempRange);
	   };
		const renderCalendarFooter = () => (
		  <View style={styles.footerContainer}>
		   <Button
			 size="small"
			 appearance="outline"
			 style={styles.footerButton}
			 onPress={handleReset}>
			 Reset
		   </Button>
		   <Button
			 size="small"
			 style={styles.footerButton}
			 onPress={handleSelect}>
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
				range={tempRange}
				onSelect={setTempRange}
				renderFooter={renderCalendarFooter}
				min={new Date(1900, 0, 0)}
				max={new Date(2050, 0, 0)}
			  />
			 </Card>
		   </Modal>
		  );
	   });
	
	const exportToExcel = async () => {
		console.log('in exportToExcel')
		try {
		  setLoadExcel(true);
			const {data, error} = await supabase.rpc('get_transactions_summary', {p_start_date: range.startDate, p_end_date: range.endDate});
		  if (error) throw error;
		  console.log(data)
		  
		  const formattedData = data.map((item, index) => ({
			"S.No.": index + 1,
			"Date": item.date,
			"Amount": item.sum,
			"Type": item.entryType,
			"Category": item.category
		  }));

		  // Create and save Excel file
		  const worksheet = XLSX.utils.json_to_sheet(formattedData);
		  const workbook = XLSX.utils.book_new();
		  XLSX.utils.book_append_sheet(workbook, worksheet, "List Data");
		  
		  const excelFile = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

		  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
		  if (!permissions.granted) return;

		  await StorageAccessFramework.createFileAsync(
			permissions.directoryUri,
			`Furyuu_PnL_${moment().format('DD_MM_YYYY')}`,
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		  ).then(async (fileUri) => {
			await FileSystem.writeAsStringAsync(fileUri, excelFile, { 
			  encoding: FileSystem.EncodingType.Base64 
			});
		  });

		  showSuccessMessage("File saved to Downloads folder!");
		} catch (error) {
		  showErrorMessage(error.message);
		} finally {
		  setLoadExcel(false);
		}
	  }
	
  const formatIndianCurrency = (amount) => {
	  if (!amount && amount !== 0) return '';
	  
	  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	  
	  return `₹${numAmount.toLocaleString('en-IN', {
		maximumFractionDigits: 0
	  })}`;
	};
  
  const StatementRow = ({ label, value, bold = false, marginTop = false }) => (
    <View style={[styles.row, marginTop && styles.marginTop]}>
      <Text
        style={[styles.label, bold && styles.boldText]}
        category={bold ? 'h6' : 's1'}
      >
        {label}
      </Text>
      <Text
        style={[styles.value, bold && styles.boldText]}
        category={bold ? 'h6' : 's1'}
      >
        {formatIndianCurrency(value)}
      </Text>
    </View>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader} category="h6" appearance="hint">
      {title}
    </Text>
  );
  
  const resetRange = () => {
      setDatePickerVisible(false);
      setRange(rangeJson);
      setIsDateChanged(false);
	  setFromDate(a);
      setToDate(b);
	 };
	 
	 const onDateChange = (nextRange) => {
	   console.log(nextRange);
	  setRange(nextRange);
	 }
	 
	 const onConfirmDatePicker = (selRange) => {
	   setDatePickerVisible(false);
	   const formattedStartDate = moment(selRange.startDate).format('YYYY-MM-DD');
	   const formattedEndDate = moment(selRange.endDate).format('YYYY-MM-DD');
	   console.log('formattedStartDate', formattedStartDate + formattedEndDate);
	   setFromDate(formattedStartDate);
	   setToDate(formattedEndDate);
	   setIsDateChanged(true);
	 };

  return (
    <Layout style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <View style={styles.dateRow}>
            <Text style={styles.filterLabel}>DATE RANGE</Text>
			  <TouchableOpacity
				style={styles.dateRangeButton}
				onPress={() => setDatePickerVisible(true)}
			  >
				<Text style={styles.dateRangeText}>
				 {fromDate} - {toDate}
				</Text>
				<Icon
				 name='chevron-down-outline'
				 style={styles.chevronIcon}
				 fill='#718096'
				/>
			  </TouchableOpacity>
          </View>
		  
		  <SectionHeader title="Revenue" />
		  
		  <StatementRow label="Sales Revenue (Orders)" value={orderRev} />
          <StatementRow label="Other Income" value={incomeRev} />
          <StatementRow label="Total Revenue" value={Number(orderRev || 0) + Number(incomeRev || 0)} bold />

          <Divider style={styles.divider} />

          <SectionHeader title="Operating expenses" />

          <StatementRow label="Salaries" value={exp['Salary'] || 0} />
          <StatementRow label="Rent" value={exp['Rent'] || 0} />
          <StatementRow label="EB" value={exp['EB'] || 0} />
          <StatementRow label="Purchase" value={exp['Purchase'] || 0} />
		  <StatementRow label="Marketing" value={exp['Marketing'] || 0} />
		  <StatementRow label="Miscellaneous" value={exp['Miscellaneous'] || 0} />
		  <StatementRow label="Total operating expenses" value={totalExp} bold />
          
          <Divider style={styles.divider} />

          <StatementRow label="Operating profit" value={Number(orderRev || 0) + Number(incomeRev || 0) - Number(totalExp || 0)} bold marginTop/>
          
        </Card>
      </ScrollView>
	  
	  <Button
			appearance='ghost'
			size='large'
			accessoryLeft={<MaterialCommunityIcons name="microsoft-excel" color='white' size={25}/>}
			onPress={exportToExcel}
			style={[styles.fab, {backgroundColor: theme['color-primary-500']}]}
			status='control'
		/>
		
		
		<Modal
					visible={loadExcel}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
		</Modal>
		
		<CalendarModal
			visible={datePickerVisible}
			onClose={() => setDatePickerVisible(false)}
			value={range}
			onSelect={onConfirmDatePicker}
			  onDateChange={onDateChange}
			  onReset={resetRange}
			  isFilter={true}
		/>
    </Layout>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#5E7B94',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  marginTop: {
    marginTop: 8,
  },
  label: {
    flex: 1,
  },
  value: {
    textAlign: 'right',
  },
  boldText: {
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8
  },
  divider: {
    marginVertical: 16,
  },
  netIncomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  netIncomeLabel: {
    color: '#5E7B94',
  },
  netIncomeValue: {
    color: '#3366FF',
    fontWeight: 'bold',
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  fab: {
        alignItems: 'center',
        justifyContent: 'center',
		flexDirection: 'row',
        height: 50,
		width: 50,
        position: 'absolute',
		borderRadius: 10,
        bottom: 45,
        left: 35,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    },
  dateRow: {
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
  dateRangeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
   },
   dateRangeText: {
    fontSize: 14,
    color: '#2D3748'
   },
   chevronIcon: {
    width: 20,
    height: 20,
   },
  datePicker: {
    backgroundColor: 'white',
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
	  position: 'absolute', // Absolute positioning for the button
	  top: -30, // Adjust vertical position
	  right: -30, // Adjust horizontal position
	  backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background for better visibility
	  borderRadius: 15, // Make the button circular
	  padding: 5, // Add padding to increase touch area
	 },
	 modalCloseIcon: {
	  width: 30, // Size of the icon
	  height: 30,
	 },
	 backdrop: {
	  backgroundColor: "rgba(0, 0, 0, 0.5)",
	 },
});

export default ProfitLossStatement;