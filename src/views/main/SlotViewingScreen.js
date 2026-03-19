import React, { useEffect, useState } from 'react';
import { supabase } from '../../constants/supabase';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import {
  Layout,
  Text,
  Button,
  Card,
  Modal,
  TopNavigation,
  TopNavigationAction,
  Divider,
  Icon,
} from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import { ArrowIosBackIcon, SettingsIcon } from "../extra/icons";

const { width } = Dimensions.get('window');

const SlotViewingScreen = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlotDate, setSelectedSlotDate] = useState(null);
  const [bookedSlotsState, setBookedSlotsState] = useState({});
  const [ordersForDate, setOrdersForDate] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  
  const route = useRoute();
  const navigation = useNavigation();
  const todayDate = moment().format("YYYY-MM-DD");

  // Icons
  const BackIcon = (props) => <Icon {...props} name='arrow-back-outline' />;
  const ForwardIcon = (props) => <Icon {...props} name='arrow-forward-outline' />;
  const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' />;
  const CloseIcon = (props) => <Icon {...props} name='close-outline' />;

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TopNavigationAction 
          style={styles.navButton} 
          icon={ArrowIosBackIcon} 
          onPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Fetch booked slots from database
  useEffect(() => {
    const getBookedSlots = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('v_daily_slot_summary')
          .select('*');
        
        if (error) {
          throw error;
        }

        const dbSlots = data.reduce((acc, slot) => {
          acc[slot.slot_date] = {
            regular: slot.regular_slots_booked,
            express: slot.express_slots_booked,
            total: slot.total_slots_booked
          };
          return acc;
        }, {});

        setBookedSlotsState(dbSlots);
      } catch (error) {
        console.error('Error fetching daily slots:', error);
      } finally {
        setLoading(false);
      }
    };

    getBookedSlots();
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDay.getUTCDate();
    const firstDayOfWeek = firstDay.getUTCDay();

    const days = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDate = (day, monthName) => {
    let mn = monthName || currentMonth;
    const year = mn.getFullYear();
    const month = String(mn.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getSlotCount = (day, monthName) => {
    if (!day) return { regular: 0, express: 0, total: 0 };
    let mn = monthName || currentMonth;
    const dateKey = formatDate(day, mn);
    return bookedSlotsState[dateKey] || { regular: 0, express: 0, total: 0 };
  };

  const isSlotFull = (day, monthName) => {
    const slots = getSlotCount(day, monthName);
    return slots.total >= 11;
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const handleDateClick = async (day) => {
    if (!day) return;

    const dateKey = formatDate(day);
    const slots = getSlotCount(day);

    // Only show modal if there are slots booked
    if (slots.total === 0) {
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_slot_orders', { due_date_param: dateKey, order_no_param: null, dress_ids: [] });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrdersForDate(data || []);
      setSelectedSlotDate(dateKey);
      setShowOrdersModal(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const closeModal = () => {
    setShowOrdersModal(false);
    setSelectedSlotDate(null);
    setOrdersForDate([]);
  };

  const renderOrderItem = ({ item, index }) => (
    <Card style={styles.orderCard} key={index}>
      <Layout style={styles.orderContent}>
        <Layout>
          <Text category='s1' style={styles.orderNumber}>#{item.orderNo}</Text>
          <Text category='p2' appearance='hint'>{item.custName}</Text>
          <Text category='c1' appearance='hint'>{item.dressSubType} {item.dressType}</Text>
          <View style={styles.buttonContainer}>
            <View style={styles.roundedButton}>
              <Text category='c1' appearance='hint'>Regular: {item.slots.regular}</Text>
            </View>
            {item.slots.express > 0 && (
              <View style={styles.roundedButtonExpress}>
                <Text category='c1' appearance='hint'>Express: {item.slots.express}</Text>
              </View>
            )}
          </View>
        </Layout>
      </Layout>
    </Card>
  );

  const renderCalendarDay = (day, index) => {
    if (!day) return <View key={index} style={[styles.dayCell, styles.emptyDay]} />;

    const slots = getSlotCount(day);
    const isFull = isSlotFull(day);
    const dateKey = formatDate(day);

    let dayStyle = styles.availableDay;
    let textColor = '#10B981';

    if (isFull) {
      dayStyle = styles.fullDay;
      textColor = '#DC2626';
    } else if (slots.total > 0) {
      dayStyle = styles.bookedDay;
      textColor = '#2563EB';
    }

    return (
      <TouchableOpacity
        key={index}
        style={[styles.dayCell, dayStyle]}
        onPress={() => handleDateClick(day)}
        disabled={slots.total === 0}
      >
        <View style={styles.dayCellContent}>
          <View style={styles.dayNumberContainer}>
            <Text style={[
              styles.dayNumber,
              { color: textColor }
            ]}>
              {day}
            </Text>
          </View>

          {slots.total > 0 && (
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
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Layout style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={styles.spinner} />
      ) : (
        <>
          <ScrollView style={styles.scrollView}>
            {/* Calendar Card */}
            <Card style={{ marginLeft: -20, marginRight: -25 }}>
              {/* Calendar Navigation */}
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
                  style={{ marginRight: 20 }}
                />
              </Layout>

              {/* Day headers */}
              <Layout style={styles.weekHeadersContainer}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <View key={index} style={styles.weekHeaderCell}>
                    <Text style={styles.weekHeaderText}>{day}</Text>
                  </View>
                ))}
              </Layout>

              {/* Calendar days */}
              <Layout style={styles.daysGrid}>
                {getDaysInMonth(currentMonth).map((day, index) => renderCalendarDay(day, index))}
              </Layout>
            </Card>

            {/* Legend */}
            <Card style={styles.legendCard}>
              <Text category='s1' style={styles.legendTitle}>Legend:</Text>
              <Layout style={styles.legendItems}>
                {[
                  { color: '#D1FAE5', border: '#10B981', text: 'No slots booked' },
                  { color: '#DBEAFE', border: '#2563EB', text: 'Regular delivery slots' },
                  { color: '#FED7AA', border: '#EA580C', text: 'Express delivery slots' },
                  { color: '#FEE2E2', border: '#DC2626', text: 'Fully Booked (11+ slots)' }
                ].map((legend, index) => (
                  <Layout key={index} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: legend.color, borderColor: legend.border }]} />
                    <Text category='c1' style={styles.legendText}>{legend.text}</Text>
                  </Layout>
                ))}
              </Layout>
            </Card>

            {/* Info Card */}
            <Card style={styles.infoCard}>
              <Text category='c2' appearance='hint'>
                Click on any date with booked slots to view the orders
              </Text>
            </Card>
          </ScrollView>

          {/* Orders Modal */}
          <Modal
            visible={showOrdersModal}
            backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onBackdropPress={closeModal}
          >
            <Card style={styles.ordersModalCard} disabled>
              {/* Header */}
              <Layout style={styles.ordersModalHeader}>
                <Layout>
                  <Text category='h5'>Orders for {selectedSlotDate}</Text>
                  <Layout style={styles.ordersModalHeaderDate}>
                    <CalendarIcon style={styles.ordersModalCalendarIcon} />
                    <Text category='c1' style={styles.ordersModalHeaderDateText}>
                      {selectedSlotDate}
                    </Text>
                  </Layout>
                </Layout>
                <TopNavigationAction
                  icon={(props) => <CloseIcon {...props} style={styles.ordersModalCloseIcon} />}
                  onPress={closeModal}
                  style={styles.ordersModalCloseButton}
                />
              </Layout>

              {/* Orders List */}
              <ScrollView
                style={styles.ordersScrollView}
                contentContainerStyle={styles.ordersScrollContent}
                showsVerticalScrollIndicator={true}
              >
                {ordersForDate && ordersForDate.length > 0 ? (
                  ordersForDate.map((order, index) => renderOrderItem({ item: order, index }))
                ) : (
                  <Text appearance='hint' style={styles.noOrdersText}>
                    No orders found for this date
                  </Text>
                )}
              </ScrollView>

              {/* Close Button */}
              <Button
                style={styles.ordersModalCloseButtonBottom}
                size='small'
                appearance='outline'
                onPress={closeModal}
              >
                {(evaProps) => (
                  <Text {...evaProps} style={styles.ordersModalButtonText}>
                    Close
                  </Text>
                )}
              </Button>
            </Card>
          </Modal>
        </>
      )}
    </Layout>
  );
};

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
    marginLeft: 5
  },
  dayCell: {
    width: `${100 / 7.5}%`,
    height: 80,
    padding: 2,
    margin: 1
  },
  dayCellContent: {
    flex: 1,
    width: '100%',
    padding: 8,
    marginLeft: 10
  },
  emptyDay: {
    backgroundColor: '#F3F4F6',
  },
  availableDay: {
    backgroundColor: '#D1FAE5',
  },
  bookedDay: {
    backgroundColor: '#DBEAFE',
  },
  fullDay: {
    backgroundColor: '#FEE2E2',
  },
  dayNumberContainer: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  slotIndicatorContainer: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  slotIndicator: {
    minWidth: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#2563EB',
    marginRight: 4,
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
  weekHeadersContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    padding: 4,
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  legendCard: {
    margin: 16,
    marginTop: 16,
  },
  legendTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#F3F4F6'
  },
  orderCard: {
    marginBottom: 12,
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5
  },
  roundedButton: {
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  roundedButtonExpress: {
    borderRadius: 12,
    backgroundColor: '#FFD9C2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  navButton: {
    marginLeft: 20
  },
  ordersModalCard: {
    width: '95%',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    marginLeft: 10,
    alignSelf: 'center',
  },
  ordersModalHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginTop: 5,
    marginBottom: -5
  },
  ordersModalHeaderDate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  ordersModalCalendarIcon: {
    width: 14,
    height: 14,
    tintColor: '#C7D2FE',
  },
  ordersModalHeaderDateText: {
    marginLeft: 6,
  },
  ordersModalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  ordersModalCloseIcon: {
    tintColor: '#FFFFFF',
    width: 24,
    height: 24
  },
  ordersScrollView: {
    maxHeight: 400,
    marginVertical: 16
  },
  ordersScrollContent: {
    paddingBottom: 20
  },
  noOrdersText: {
    textAlign: 'center',
    marginVertical: 20
  },
  ordersModalCloseButtonBottom: {
    borderRadius: 12,
    borderColor: '#E5E7EB',
    borderWidth: 2,
  },
  ordersModalButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  spinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default SlotViewingScreen;