import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { Layout, Text, Icon, useTheme, Button } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useWalkthrough } from '../main/WalkthroughContext';

const SupportScreen = () => {
	const navigation = useNavigation();
  const theme = useTheme();
  const phoneNumber = '+918754537013';
  const email = 'thaiyalapp@gmail.com';
  const whatsappNumber = '918754537013';
  const displayNo = '87545 37013';
  const { start } = useWalkthrough();

  useEffect(() => {
		const backAction = () => {
			  navigation.navigate('ProfileScreen')
			  return true;
		};

		const backHandler = BackHandler.addEventListener(
		  "hardwareBackPress",
		  backAction
		);

		return () => backHandler.remove(); // Clean up the back handler
	}, []);
  
  const openWhatsApp = () => {
    const message = 'Hello Support';
    Linking.openURL(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`).catch((err) =>
      console.error('Failed to open WhatsApp:', err)
    );
  };
  
  return (
    <Layout style={styles.container}>
		<View style={{alignItems: 'center'}}>
			<MaterialIcons name='live-help' size={150} color={theme['color-primary-500']} style={{marginHorizontal: 5}}/>
		</View>
      {/* Header */}
      <Text category="s1" style={styles.subtitle}>
        We’re here to help! Reach out via WhatsApp, phone, or email.
      </Text>

	    <View style={styles.linkRow}>
		    <TouchableOpacity onPress={openWhatsApp}>
			  <Icon style={styles.icon} fill={theme['color-primary-500']} name="message-circle-outline" />
			</TouchableOpacity>
		  <Text category="p1">
			WhatsApp us on {displayNo}
		  </Text>
		</View>

		<View style={styles.linkRow}>
		<TouchableOpacity onPress={() => Linking.openURL(`tel:${phoneNumber}`)}>
			  <Icon style={styles.icon} fill={theme['color-primary-500']} name="phone-outline" />
			</TouchableOpacity>
		  <Text category="p1">
			Call us at {displayNo}
		  </Text>
		</View>

		<View style={styles.linkRow}>
		<TouchableOpacity onPress={() => Linking.openURL(`mailto:${email}`)}>
			  <Icon style={styles.icon} fill={theme['color-primary-500']} name="email-outline" />
			</TouchableOpacity>
		  <Text category="p1">
			Email us at {email}
		  </Text>
		</View>

      {/* Footer */}
      <View style={styles.footer}>
		  <Text>
			We will get back to you as early as possible
		  </Text>
		  <Button onPress={() => start(navigation)} size='small' style={{marginTop: 16}}>Start tutorial for app usage</Button>
	  </View>
	  <Text appearance='hint' category='c1' style={styles.footerText}>Powered by Thaiyal Business</Text>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  subtitle: {
	marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  linkText: {
    fontSize: 16,
    marginRight: 5,
  },
  icon: {
    width: 24,
    height: 24,
	marginRight: 10
  },
  link: {
    fontSize: 16,
    color: '#3366FF',
    textDecorationLine: 'underline',
    marginVertical: 10,
  },
  footer: {
	marginTop: 10,  
    alignItems: 'center',
  },
  footerText: {
	marginTop: 16,
	textAlign: 'center'
  }
});

export default SupportScreen;
