import * as Notifications from "expo-notifications";
import { supabase } from '../../constants/supabase';
import { Linking, AppState } from 'react-native';
import { storage } from '../extra/storage';
import moment from 'moment';
import { schedulePushNotification } from './notificationUtils'; // Your existing function

export class NotificationWorker {
  constructor(currentUser, updateNotificationCount, markNotificationAsRead, notificationCount, handleRemoteLogout) {
    this.currentUser = currentUser;
    this.updateNotificationCount = updateNotificationCount;
    this.notificationCount = notificationCount;
    this.handleRemoteLogout = handleRemoteLogout;
    this.subscriptions = [];
    this.appStateSubscription = null;
    this.billingCheckInterval = null;
  }

  start() {
    console.log('NotificationWorker started');
    
    // Response listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (notification) => {
        console.log('in notification response received');
        let title = notification?.notification?.request?.content?.title;
        const notifData = notification?.notification?.request?.content?.data;
        const { objectId } = notifData || {};

        if(title && title === 'New Device Login') {
          console.log("User tapped on logout notification");
          this.handleRemoteLogout();
          return;
        }
        
        this.markNotificationAsRead(this.currentUser, objectId);
        this.updateNotificationCount(this.notificationCount - 1);
        
        if(title && title === 'New Order Alert!') {
          const {custName, custUsername, shopName, orderDetails, orderNo, orderItem} = notifData || {};
          const updatedItem = { ...orderItem, username: this.currentUser.username };
          const dateFinal = orderItem.orderDate ? orderItem.orderDate : new Date();
          
          navigation.navigate('OrderDetailsMain', {
            screen: 'OrderDetails',
            params: { 
              item: updatedItem, 
              userType: this.currentUser.userType, 
              orderDate: dateFinal,
              isShareIntent: false, 
              custUsername: custUsername, 
              orderDetails: orderDetails 
            }
          });
        }
        
        // Handle billing reminder tap
        if(title && title.includes('Pending Payment Reminder')) {
          const { orderNo } = notifData || {};
          if (orderNo) {
            // Navigate to order details
            navigation.navigate('OrderDetailsMain', {
              screen: 'OrderDetails',
              params: { orderNo }
            });
          }
        }
      }
    );

    // Received listener
    const notificationSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('in notification received');
        const title = notification?.request?.content?.title;
        
        if (title && title === 'New Device Login') {
          this.handleRemoteLogout();
        }
      }
    );

    this.subscriptions.push(responseSubscription, notificationSubscription);
    
    // ✅ CHECK BILLING REMINDERS ON START
    this.checkBillingReminders();
    
    // ✅ CHECK WHEN APP BECOMES ACTIVE
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App became active, checking billing reminders...');
        this.checkBillingReminders();
      }
    });
    
    // ✅ OPTIONAL: CHECK PERIODICALLY (every hour)
    this.startBillingCheckInterval();
  }

  stop() {
    console.log('NotificationWorker stopped');
    
    // Remove notification subscriptions
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
    
    // Remove app state subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Clear interval
    if (this.billingCheckInterval) {
      clearInterval(this.billingCheckInterval);
      this.billingCheckInterval = null;
    }
  }

  /**
   * Start periodic billing check (every hour)
   */
  startBillingCheckInterval() {
    // Check every hour (3600000 ms)
    this.billingCheckInterval = setInterval(() => {
      console.log('Periodic billing check...');
      this.checkBillingReminders();
    }, 3600000); // 1 hour
  }

  /**
   * Check billing orders and send reminders if 1 day has passed
   */
  async checkBillingReminders() {
    try {
      console.log('Checking for billing reminders...');
      
      // Get all orders in Billing status
      const { data: billingOrders, error } = await supabase
        .from('OrderItems')
        .select('orderNo, orderStatus, orderDate, billingMovedDate, created_at')
        .eq('orderStatus', 'Billing');
      
      if (error) throw error;
      
      if (!billingOrders || billingOrders.length === 0) {
        console.log('No orders in Billing status');
        return;
      }
      
      console.log(`Found ${billingOrders.length} orders in Billing status`);
      
      // Get all staff push tokens
      const { data: staffDevices, error: deviceError } = await supabase
        .from('user_last_device_v2')
        .select('device_push_token');
      
      if (deviceError) throw deviceError;
      console.log('staffDevices', staffDevices);
      const tokens = staffDevices?.map(d => d.device_push_token).filter(Boolean) || [];
      
      if (tokens.length === 0) {
        console.log('No push tokens found for reminders');
        return;
      }
      
      console.log(`Will send reminders to ${tokens.length} device(s)`);
      
      const now = moment();
      let remindersSent = 0;
      
      // Check each billing order
      for (const order of billingOrders) {
        const dateToCheck = order.billingMovedDate || order.created_at;
        const movedToBilling = moment(dateToCheck);
		const hoursSinceBilling = now.diff(movedToBilling, 'hours');
        console.log(dateToCheck, movedToBilling, hoursSinceBilling);
        
        console.log(`Order ${order.orderNo}: ${hoursSinceBilling} hours in Billing`);
        
        // If 24+ hours have passed
        if (hoursSinceBilling >= 24) {
          // Check if we already sent a reminder today
          const lastReminderKey = `billing_reminder_${order.orderNo}`;
          const lastReminderDate = storage.getString(lastReminderKey);
          
          const shouldSend = !lastReminderDate || 
                            moment().diff(moment(lastReminderDate), 'days') >= 1;
          
          //if (shouldSend) {
            const daysInBilling = Math.floor(hoursSinceBilling / 24);
            
            // Send reminder to all devices
            await schedulePushNotification(
              tokens,
              '⏰ Pending Payment Reminder',
              `Order #${order.orderNo} has been in Billing for ${daysInBilling} day(s). Please complete the order.`,
              { 
                orderNo: order.orderNo,
                type: 'billing_reminder',
                screen: 'OrderDetails',
                daysInBilling
              }
            );
            
            // Mark that we sent a reminder today
            storage.set(lastReminderKey, moment().toISOString());
            
            remindersSent++;
            console.log(`✅ Sent billing reminder for order ${order.orderNo}`);
          /*} else {
            console.log(`⏭️ Already sent reminder today for order ${order.orderNo}`);
          }*/
        }
      }
      
      if (remindersSent > 0) {
        console.log(`📨 Sent ${remindersSent} billing reminder(s)`);
      } else {
        console.log('No reminders needed at this time');
      }
      
      return remindersSent;
      
    } catch (error) {
      console.error('❌ Error checking billing reminders:', error);
      return 0;
    }
  }

  /**
   * Manually trigger billing check (can be called from UI)
   */
  async triggerBillingCheck() {
    console.log('Manual billing check triggered');
    return await this.checkBillingReminders();
  }
}