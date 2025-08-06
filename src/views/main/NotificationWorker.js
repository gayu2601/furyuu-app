import * as Notifications from "expo-notifications";
import { supabase } from '../../constants/supabase';
import { Linking } from 'react-native';


export class NotificationWorker {
  constructor(currentUser, updateNotificationCount, markNotificationAsRead, notificationCount, handleRemoteLogout) {
    this.currentUser = currentUser;
    this.updateNotificationCount = updateNotificationCount;
  	this.notificationCount = notificationCount;
	this.handleRemoteLogout = handleRemoteLogout;
	this.subscriptions = [];
  }

  start() {
	
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
			this.markNotificationAsRead(currentUser, objectId);
			this.updateNotificationCount(this.notificationCount - 1);
				
				if(title && title === 'New Order Alert!') {
				  const {custName, custUsername, shopName, orderDetails, orderNo, orderItem} = notifData || {};
				  const updatedItem = { ...orderItem, username: currentUser.username, shopId: currentUser.ShopDetails.id };
				  const dateFinal = orderItem.orderDate ? orderItem.orderDate : new Date();
				  
				  navigation.navigate('OrderDetailsMain', {
					screen: 'OrderDetails',
					params: { 
					  item: updatedItem, 
					  userType: currentUser.userType, 
					  orderDate: dateFinal, 
					  shopName: currentUser.ShopDetails.shopName, 
					  shopAddress: currentUser.ShopDetails.shopAddress, 
					  shopPhNo: currentUser.ShopDetails.shopPhNo, 
					  isShareIntent: false, 
					  custUsername: custUsername, 
					  orderDetails: orderDetails 
					}
				  });
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
  }

  stop() {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
  }
}
