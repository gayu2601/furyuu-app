import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Button, Radio, RadioGroup, Text, Calendar, Icon, CalendarViewModes, RangeCalendar } from '@ui-kitten/components';
import moment from "moment";

const DateFilterModal = ({ visible, onClose, onApply }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  const [range, setRange] = useState({});

  const options = [
    { title: 'This year', value: 'this-year' },
    { title: 'This month', value: 'this-month' },
    { title: 'Last year', value: 'last-year' },
    { title: 'Custom date range', value: 'custom' }
  ];

  const handleSelect = (index) => {
    setSelectedIndex(index);
	if(options[index].value === 'custom') {
		setShowDatePicker(true);
	} else {
      if (options[index].value === 'this-year') {
        const currentYear = moment();
		const firstDay = currentYear.startOf("year").utcOffset(5.5).format("YYYY-MM-DD");
		//const lastDay = currentYear.endOf("year").utcOffset(5.5).format("YYYY-MM-DD");
		const lastDay = moment(new Date()).format('YYYY-MM-DD');
		setDateRangeStart(firstDay);
		setDateRangeEnd(lastDay);
        setDateRange(`${firstDay} to ${lastDay}`);
      } else if (options[index].value === 'this-month') {
        const now = moment();
		const firstDay = now.startOf("month").format("YYYY-MM-DD");
		const lastDay = now.endOf("month").format("YYYY-MM-DD");
		setDateRangeStart(firstDay);
		setDateRangeEnd(lastDay);
        setDateRange(`${firstDay} to ${lastDay}`);
      } else {
		const lastYear = moment().subtract(1, "year");
		const firstDay = lastYear.startOf("year").utcOffset(5.5).format("YYYY-MM-DD");
		const lastDay = lastYear.endOf("year").utcOffset(5.5).format("YYYY-MM-DD");
		setDateRangeStart(firstDay);
		setDateRangeEnd(lastDay);
        setDateRange(`${firstDay} to ${lastDay}`);
      }
	}
  };

  const handleDateSelect = () => {
	console.log('in handleDateSelect');
	console.log(range);
	setShowDatePicker(false);
    if(range.startDate && range.endDate) {
		const formattedStartDate = moment(range.startDate).format('YYYY-MM-DD')
		const formattedEndDate = moment(range.endDate).format('YYYY-MM-DD')
		setDateRangeStart(formattedStartDate);
		setDateRangeEnd(formattedEndDate);
		setDateRange(`${formattedStartDate} to ${formattedEndDate}`);
	}
    
  };

  const handleApply = () => {
    onApply({
	  filterTypeStr: options[selectedIndex].title,
	  filterType: options[selectedIndex].value,
      dateRange: dateRange,
	  dateRangeStart: dateRangeStart,
	  dateRangeEnd: dateRangeEnd
    });
    onClose();
  };

  const renderCalendarFooter = () => (
    <View style={styles.footerContainer}>
      <Button 
        size="small" 
        status="danger"
        appearance="outline"
        style={styles.footerButton}
        onPress={onReset}>
        Reset
      </Button>
      <Button 
        size="small"
        style={styles.footerButton}
        onPress={handleDateSelect}>
        Select Range
      </Button>
    </View>
  );
  
  const renderCalendarForDate = () => (
    <View style={styles.calendarContainer}>
      <Text category="h6" style={styles.calendarTitle}>Select Date Range</Text>
      	<RangeCalendar
            range={range}
            onSelect={(nextRange) => setRange(nextRange)}
            renderFooter={renderCalendarFooter}
			min={new Date(1900, 0, 0)}
			max={new Date(2050, 0, 0)}
        />

      <Button onPress={() => setShowDatePicker(false)}>Cancel</Button>
    </View>
  );
  
  const onReset = () => {
		setShowDatePicker(false);
		setRange({});
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {(showDatePicker && renderCalendarForDate()) || (
            <>
              <View style={styles.header}>
                <Text category="h6">Date Filter</Text>
                <TouchableOpacity onPress={onClose}>
                  <Icon name="close-outline" style={styles.modalCloseIcon} />
                </TouchableOpacity>
              </View>
              
              <RadioGroup
                selectedIndex={selectedIndex}
                onChange={index => handleSelect(index)}
                style={styles.radioGroup}
              >
                {options.map((option, index) => (
                  <Radio
                    key={index}
                    style={styles.radioButton}
                  >
                    {option.title}
                  </Radio>
                ))}
              </RadioGroup>
              
              {dateRange && (
                <View style={styles.dateRangeContainer}>
                  <Text style={styles.dateRangeText}>{dateRange}</Text>
                </View>
              )}
              
              <Button
                style={styles.applyButton}
                onPress={handleApply}
              >
                APPLY
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  radioGroup: {
    marginBottom: 16
  },
  radioButton: {
    marginVertical: 8
  },
  dateRangeContainer: {
    padding: 12,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    marginBottom: 16
  },
  dateRangeText: {
    textAlign: 'center'
  },
  applyButton: {
    borderRadius: 8
  },
  calendarContainer: {
    padding: 0
  },
  calendarTitle: {
    textAlign: 'center',
    marginBottom: 16
  },
  modalCloseIcon: {
    width: 30,
    height: 30,
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
});

export default DateFilterModal;