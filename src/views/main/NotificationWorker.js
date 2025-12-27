import * as Notifications from "expo-notifications";

export class NotificationWorker {
  constructor(currentUser, updateNotificationCount, markNotificationAsRead, notificationCount, handleRemoteLogout) {
    this.currentUser = currentUser;
    this.updateNotificationCount = updateNotificationCount;
    this.notificationCount = notificationCount;
    this.handleRemoteLogout = handleRemoteLogout;
    this.subscriptions = [];
	this.markNotificationAsRead = markNotificationAsRead;
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
        
        this.markNotificationAsRead(this.currentUser, objectId);
        this.updateNotificationCount(this.notificationCount - 1);
        
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