import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Animated, Modal as ModalRN } from 'react-native';
import { Layout, Text, Icon, List, ListItem, Button, Modal, Card, Spinner } from '@ui-kitten/components';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../constants/supabase'
import { useUser } from '../main/UserContext';
import { useNetwork } from '../main/NetworkContext';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { usePermissions } from '../main/PermissionsContext';
import { storage } from '../extra/storage';
import keys from '../../constants/Keys';
import { Buffer } from 'buffer';
import * as Application from 'expo-application';
import { useOrderItems } from '../main/OrderItemsContext';
import { resetIdCounter } from '../main/generateUniqueId';
import { checkAndDeleteSession } from "../extra/sessionUtils";

const ProfileScreen = () => {
	const navigation = useNavigation();
	const {currentUser} = useUser();
	const [loading, setLoading] = useState(false);
	const { isConnected } = useNetwork();
	const { saveOrder, resetItemsForLabel } = useOrderItems();
	const data = [
	  { title: 'New Employee Onboarding', icon: 'person-outline', key: 'newEmployee', onPress: () => navigation.navigate('EmployeeOnboardingForm') },
	  { title: 'Employee List', icon: 'list-outline', key: 'employeeList', onPress: () => navigation.navigate('EmployeeList') },
	  { title: 'Log Out', icon: 'log-out-outline', key: 'logout', onPress: () => logoutAlert() }
	];

	useEffect(() => {
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		}
	}, [])
	
	const logout = async () => {
		if(!isConnected) {
			 showErrorMessage("No Internet Connection");
		} else {
			try {
				setLoading(true);

				saveOrder([], {custName: '', phoneNo: '', occasion: ''});
				resetItemsForLabel();
				resetIdCounter();
				
				await checkAndDeleteSession();
				const {error: error3} = await supabase
						.from('profiles')
						.update({pushToken: null})
						.eq('id', currentUser.id);
				if(error3) {
					throw error3;
				}
				const {error: error2} = await supabase
						.from('user_last_device_v2')
						.delete()
						.eq('user_id', currentUser.id)
						.eq('device_id', Application.getAndroidId());
				if(error2) {
					throw error2;
				}
					navigation.reset({
						index: 0,
						routes: [{ name: 'AuthScreen' }],
					  });

					return true
			}catch(error) {
				console.error(error);
				showErrorMessage("Error: " + error.message)
				return false
			} finally {
				setLoading(false);
			}
		}
    }

    const logoutAlert = () => {
        Alert.alert(
            "Confirmation", "Do you want to logout?",
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log("Cancel"),
                    style: "cancel",
                },
                {
                    text: 'OK',
                    onPress: () => logout()
                }
            ],
            {cancelable: true}
        )
    }
	
  const renderItem = ({ item }) => (
    <View style={styles.listItemContainer} onTouchEnd={item.onPress}>
      <View style={styles.listItemContent}>
        {/* Left Icon */}
        <Icon name={item.icon} style={styles.icon} fill="#2F80ED" />
        
        {/* Title Text */}
        <Text style={styles.itemText}>{item.title}</Text>
      </View>
      
      {/* Chevron Icon */}
      <Icon name="chevron-right" style={styles.chevron} fill="#BDBDBD" />
    </View>
  );
  
  return (
    <Layout style={styles.container}>
      <List
        style={styles.list}
        data={data}
        renderItem={renderItem}
      />
    </Layout>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  list: {
    marginTop: 10,
    backgroundColor: '#ffffff',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    marginLeft: 15,
    color: '#333333',
    fontSize: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
  chevron: {
    width: 24,
    height: 24,
  }
});
