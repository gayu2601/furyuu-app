import { supabase } from '../../constants/supabase';
import { Linking, AppState } from 'react-native';
import { storage } from './storage';
import moment from 'moment';
import { schedulePushNotification } from '../main/notificationUtils'; // Your existing function

export const checkBillingReminders = async() => {
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
          
          if (shouldSend) {
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
          } else {
            console.log(`⏭️ Already sent reminder today for order ${order.orderNo}`);
          }
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