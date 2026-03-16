import { supabase } from '../../constants/supabase';
import moment from 'moment';
import { schedulePushNotification } from '../main/notificationUtils';

export const checkBillingReminders = async() => {
    try {
      console.log('Checking for billing reminders...');
      
      const { data: billingOrders, error } = await supabase
        .from('OrderItems')
        .select('orderNo, orderStatus, orderDate, billingMovedDate, created_at')
        .eq('orderStatus', 'Billing');
      
      if (error) throw error;

      // Fetch existing billing reminders
      const { data: existingReminders } = await supabase
        .from('QueuedNotifications')
        .select('id, notificationData, created_at')
        .eq('notificationTitle', '⏰ Pending Payment Reminder');

      // Build map of { orderNo -> { id, created_at } }
      const lastSentMap = {};
      if (existingReminders) {
        for (const reminder of existingReminders) {
          const orderNo = reminder.notificationData?.orderNo;
          if (orderNo) {
            if (!lastSentMap[orderNo] || moment(reminder.created_at).isAfter(lastSentMap[orderNo].created_at)) {
              lastSentMap[orderNo] = { id: reminder.id, created_at: reminder.created_at };
            }
          }
        }
      }

      // 🗑️ Wipe reminders ONLY for orders no longer in Billing
      const activeBillingOrderNos = new Set((billingOrders || []).map(o => o.orderNo));
	  	  
	  console.log('activeBillingOrderNos', activeBillingOrderNos, billingOrders, lastSentMap, activeBillingOrderNos.has("192"))

      const staleOrderNos = Object.keys(lastSentMap).filter(orderNo => !activeBillingOrderNos.has(Number(orderNo)));
      
      if (staleOrderNos.length > 0) {
        const staleIds = staleOrderNos.map(orderNo => lastSentMap[orderNo].id);
        await supabase
          .from('QueuedNotifications')
          .delete()
          .in('id', staleIds);
        console.log(`🗑️ Wiped stale reminders for orders: ${staleOrderNos.join(', ')}`);
      }

      if (!billingOrders || billingOrders.length === 0) {
        console.log('No orders in Billing status');
        return 0;
      }

      const { data: staffDevices, error: deviceError } = await supabase
        .from('user_last_device_v2')
        .select('device_push_token');
      if (deviceError) throw deviceError;

      const tokens = staffDevices?.map(d => d.device_push_token).filter(Boolean) || [];
      if (tokens.length === 0) return 0;

      const now = moment();

      // Filter orders that need a reminder
      const ordersNeedingReminder = billingOrders.filter(order => {
        const hoursSinceBilling = now.diff(moment(order.billingMovedDate || order.created_at), 'hours');
        if (hoursSinceBilling < 24) return false;

        const lastSent = lastSentMap[order.orderNo];
        return !lastSent || moment().diff(moment(lastSent.created_at), 'days') >= 1;
      });

      if (ordersNeedingReminder.length === 0) {
        console.log('No reminders needed at this time');
        return 0;
      }

      for (const order of ordersNeedingReminder) {
        const hoursSinceBilling = now.diff(moment(order.billingMovedDate || order.created_at), 'hours');
        const daysInBilling = Math.floor(hoursSinceBilling / 24);
        const existingId = lastSentMap[order.orderNo]?.id;

        // ✅ Update existing row if present, insert only if new order
        if (existingId) {
          await supabase
            .from('QueuedNotifications')
            .update({
              notificationMsg: `Order #${order.orderNo} has been in Billing for ${daysInBilling} day(s). Please complete the order.`,
              notificationData: { orderNo: order.orderNo, type: 'billing_reminder', daysInBilling },
              notificationRead: false,
              created_at: now.toISOString() // ✅ bump timestamp so lastSentMap is fresh next run
            })
            .eq('id', existingId);

          // Still push notify
          for (const token of tokens) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: token,
                sound: 'default',
                title: '⏰ Pending Payment Reminder',
                body: `Order #${order.orderNo} has been in Billing for ${daysInBilling} day(s). Please complete the order.`,
                data: { orderNo: order.orderNo, type: 'billing_reminder', daysInBilling }
              })
            });
          }
        } else {
          // Brand new billing order, use schedulePushNotification to insert + push
          await schedulePushNotification(
            tokens,
            '⏰ Pending Payment Reminder',
            `Order #${order.orderNo} has been in Billing for ${daysInBilling} day(s). Please complete the order.`,
            { orderNo: order.orderNo, type: 'billing_reminder', daysInBilling }
          );
        }

        console.log(`✅ Sent billing reminder for order ${order.orderNo}`);
      }

      console.log(`📨 Sent ${ordersNeedingReminder.length} billing reminder(s)`);
      return ordersNeedingReminder.length;
      
    } catch (error) {
      console.error('❌ Error checking billing reminders:', error);
      return 0;
    }
  }