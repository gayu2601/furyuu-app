import React, {useState} from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import {
  Icon, Layout, Text, TopNavigationAction
} from '@ui-kitten/components';

const { width } = Dimensions.get('window');

const CloseIcon = (props) => <Icon {...props} name='close-outline' />;
const BackIcon = (props) => <Icon {...props} name='arrow-back-outline' />;
const ForwardIcon = (props) => <Icon {...props} name='arrow-forward-outline' />;
  
const MoveOrderModal = ({
  showMoveOrder,
  orderToMove,
  closeModal,
  getDaysInMonth,
  getSlotCount,
  isSlotFull,
  formatDate,
  selectedSlotDate,
  moveOrderToDate,
}) => {
  if (!showMoveOrder || !orderToMove) return null;
console.log('orderToMove:')
console.log(orderToMove)

const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
const [currentMonth, setCurrentMonth] = useState(new Date());
const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
};

const moveOrderAlert = (dateKey) => {
        Alert.alert(
            "Confirmation", `Do you want to move order #${orderToMove.orderNo} (${orderToMove.dressSubType} ${orderToMove.dressType}) to ${dateKey}?`,
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => moveOrderToDate(dateKey)
                }
            ],
            {cancelable: true}
        )
    }
  
  return (
    <Modal
      visible={showMoveOrder}
      transparent={true}
      animationType="slide"
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Move Order</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <CloseIcon style={styles.closeIcon}/>
              </TouchableOpacity>
            </View>
            
            {/* Order Details */}
            <View style={styles.orderDetails}>
              <Text style={styles.orderNumber}>{orderToMove.orderNo}</Text>
              <Text style={styles.customerName}>{orderToMove.custName}</Text>
              <Text style={styles.itemText}>{orderToMove.dressSubType} {orderToMove.dressType}</Text>
              <View style={[
                styles.deliveryBadge,
                orderToMove.slots?.express > 0 
                  ? styles.expressBadge 
                  : styles.regularBadge
              ]}>
                <Text style={[
                  styles.badgeText,
                  orderToMove.slots?.express > 0
                    ? styles.expressBadgeText
                    : styles.regularBadgeText
                ]}>
                  {orderToMove.slots?.express > 0 ? 'Express' : 'Regular'} Delivery
                </Text>
              </View>
            </View>
            
            <Text style={styles.selectDateTitle}>Select New Date:</Text>
            <Layout style={styles.monthNavigation}>
				<TopNavigationAction
				  icon={BackIcon}
				  onPress={() => navigateMonth(-1)}
				/>
				<Text category='h6' style={styles.monthTitle}>
				  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
				</Text>
				<TopNavigationAction
				  icon={ForwardIcon}
				  onPress={() => navigateMonth(1)}
				/>
			</Layout>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <View key={index} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {getDaysInMonth(currentMonth).map((day, index) => {
                if (!day) return <View key={index} style={[styles.calendarCell, styles.emptyDay]} />;
                
                const slots = getSlotCount(day, currentMonth);
                const isFull = isSlotFull(day, currentMonth);
                const dateKey = formatDate(day, currentMonth);
                
                return (
                  <View key={index} style={styles.calendarCell}>
                    <TouchableOpacity
                      onPress={() => moveOrderAlert(dateKey)}
                      style={[
                        styles.dateButton,
                        isFull && styles.fullDateButton,
                        !isFull && slots.total > 0 && styles.bookedDateButton,
                        !isFull && slots.total === 0 && styles.availableDateButton,
                      ]}
                    >
                      <Text style={[
                        styles.dateText,
                        isFull && styles.fullDateText,
                        !isFull && slots.total > 0 && styles.bookedDateText,
                        !isFull && slots.total === 0 && styles.availableDateText,
                      ]}>
                        {day}
                      </Text>
                      <View style={styles.slotIndicatorContainer}>
						{slots.regular > 0 && (
							<View style={styles.slotIndicator}>
							  <Text style={styles.slotText}>
								{slots.regular}
							  </Text>
							</View>
						)}
						{slots.express > 0 && (
							<View style={styles.slotIndicator1}>
							  <Text style={styles.slotText}>
								{slots.express}
							  </Text>
							</View>
						)}
					  </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            
            {/* Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                <Text style={styles.noteTextBold}>Note:</Text> Gray date is the current date. Red dates are fully booked. Click on any available date to move the order.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
  },
  scrollView: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
	marginTop: -5
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  orderDetails: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  deliveryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expressBadge: {
    backgroundColor: '#fed7aa',
  },
  regularBadge: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
  },
  expressBadgeText: {
    color: '#ea580c',
  },
  regularBadgeText: {
    color: '#16a34a',
  },
  selectDateTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    padding: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarCell: {
    width: `${100/7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  emptyDay: {
    backgroundColor: '#ccc',
  },
  dateButton: {
    flex: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  currentDateButton: {
    backgroundColor: '#e5e7eb',
  },
  fullDateButton: {
    backgroundColor: '#fecaca',
  },
  bookedDateButton: {
    backgroundColor: '#dbeafe',
  },
  availableDateButton: {
    backgroundColor: '#dcfce7',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
	marginTop: -30
  },
  currentDateText: {
    color: '#9ca3af',
  },
  fullDateText: {
    color: '#ef4444',
  },
  bookedDateText: {
    color: '#2563eb',
  },
  availableDateText: {
    color: '#16a34a',
  },
  slotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeText: {
    color: 'white',
    fontSize: 10,
  },
  noteContainer: {
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 8
  },
  noteText: {
    fontSize: 12,
    color: '#a16207',
  },
  noteTextBold: {
    fontWeight: 'bold',
  },
  closeIcon: {width: 25, height: 25},
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  slotIndicatorContainer: {
	  position: 'absolute',
	  bottom: 6,
	  right: 0,
	  flexDirection: 'row'
	},

	slotIndicator: {
	  minWidth: 20,
	  height: 20,
	  borderRadius: 6,
	  justifyContent: 'center',
	  alignItems: 'center',
	  paddingHorizontal: 4,
	  backgroundColor: '#2563EB',
	  marginRight: 4, // use this if gap is not supported
	},

	slotIndicator1: {
	  minWidth: 20,
	  height: 20,
	  borderRadius: 6,
	  justifyContent: 'center',
	  alignItems: 'center',
	  paddingHorizontal: 4,
	  backgroundColor: '#EA580C',
	},

	  slotText: {
		fontSize: 10,
		fontWeight: '600',
		color: 'white'
	  },
});

export default MoveOrderModal;