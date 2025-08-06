import { firebase } from '@react-native-firebase/analytics';

export const logFirebaseEvent = async(eventName, params = undefined) => {
	firebase.analytics().logEvent(eventName, params)
}