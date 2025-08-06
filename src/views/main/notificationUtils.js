import { supabase } from '../../constants/supabase'

export const schedulePushNotification = async(pushToken, username, notifTitle, notifBody, notifData) => {
		
	  const message = {
		to: pushToken,
		sound: 'default',
		title: notifTitle,
		body: notifBody,
		data: notifData,
	  };
	  
	  console.log(JSON.stringify(message))
	  try {
		  if(notifTitle !== 'New Device Login') {
			const { error } = await supabase
								.from('QueuedNotifications')
								.insert({ username: username, notificationTitle: notifTitle, notificationMsg: notifBody, notificationData: notifData, notificationRead: false })
			if(error) {
				throw error;
			}
		  }
			console.log("sending notif " + pushToken);
			await fetch('https://exp.host/--/api/v2/push/send', {
				method: 'POST',
				headers: {
				  Accept: 'application/json',
				  'Accept-encoding': 'gzip, deflate',
				  'Content-Type': 'application/json',
				},
				body: JSON.stringify(message),
			  });
	  } catch(error) {
		  console.log(error);
	  }
};