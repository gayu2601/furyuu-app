import { supabase } from '../../constants/supabase'
import {
  GoogleSignin
} from '@react-native-google-signin/google-signin'
import keys from "../../constants/Keys";

export const checkAndDeleteSession = async() => {
			GoogleSignin.configure({
					scopes: ['profile','email'],
					webClientId: keys.google_webClientId,
				  });

		  await GoogleSignin.signOut();
		  const { data: { session }, error } = await supabase.auth.getSession()
				if(error) {
					throw error;
				}
				if(session) {
					const { error: error1 } = await supabase.auth.signOut({scope: 'local'});
					if (error1) {
					  console.error('Error signing out:', error1.message);
					}
				}
		}
	