import * as Notifications from "expo-notifications";

export class NotificationWorker {
  constructor(currentUser, updateNotificationCount, markNotificationAsRead, notificationCount, handleRemoteLogout, navigation, getOrders) {
    this.currentUser = currentUser;
    this.updateNotificationCount = updateNotificationCount;
    this.notificationCount = notificationCount;
    this.handleRemoteLogout = handleRemoteLogout;
    this.subscriptions = [];
	this.markNotificationAsRead = markNotificationAsRead;
	this.navigation = navigation;
	this.getOrders = getOrders;
  }

  start() {
    console.log('NotificationWorker started');
    
    // Response listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (notification) => {
        console.log('in notification response received');
        let title = notification?.notification?.request?.content?.title;
        const notifData = notification?.notification?.request?.content?.data;
        const { objectId, order } = notifData || {};
        
        this.markNotificationAsRead(this.currentUser, objectId);
        this.updateNotificationCount(this.notificationCount - 1);
        
		const allOrders = this.getOrders('all', '2025-01-01');
		console.log('allOrders', allOrders);
		const thisOrder = allOrders.find(
		  o => o.orderNo === notifItem.notificationData.orderNo
		);

		console.log(thisOrder);

		if(thisOrder) {
			console.log(thisOrder);
			this.navigation.navigate('OrderDetailsMain', {screen: 'OrderDetails',
					params: {
						item: thisOrder,
						orderDate: moment(thisOrder.orderDate).format('DD-MM-YYYY'),
						isShareIntent: false
					}
			});
		} else {
			showErrorMessage('No order details found for this order!');
		}
      }
    );

    // Received listener
    const notificationSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('in notification received');
        const title = notification?.request?.content?.title;
      }
    );

    this.subscriptions.push(responseSubscription, notificationSubscription);
  }

  stop() {
    console.log('NotificationWorker stopped');
    
    // Remove notification subscriptions
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
  }
}