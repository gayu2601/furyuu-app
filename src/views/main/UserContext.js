import React, { createContext, useState, useContext, useRef, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { navigationRef } from '../../../App.js';
import keys from "../../constants/Keys";
import { checkAndDeleteSession } from "../extra/sessionUtils";

const UserContext = createContext();

export const UserProvider = ({ currentUser: initialUser, children }) => {
    const [currentUser, setCurrentUser] = useState(initialUser);
	const [newDeviceLogin, setNewDeviceLogin] = useState(false);
	const [profileCompleted, setProfileCompleted] = useState(true);
	
	const  updateCurrentUser = (updatedUser) => {
		console.log("in updateCurrentUser")
		console.log(updatedUser);
		setCurrentUser(updatedUser);
	  };
	  
	const updateProfileCompleted = (boolVal) => {
		setProfileCompleted(boolVal);
	};
	  
	const updateNewDeviceLogin = (val) => {
		setNewDeviceLogin(val);
	}
	
	const getNewDeviceLogin = () => {
		return newDeviceLogin;
	}
	
	const handleUILogout = async() => {
		await checkAndDeleteSession();
		Alert.alert(
		  "Logged Out",
		  "You have been logged out because your account was signed in on another device.",
		  [{ 
			text: "OK", 
			onPress: () => navigationRef?.current?.reset({
			  index: 0,
			  routes: [{ name: 'AuthScreen' }],
			})
		  }]
		);
	};
  const contextVal = useMemo(() => ({ currentUser, setCurrentUser, updateCurrentUser, updateNewDeviceLogin, newDeviceLogin, handleUILogout, updateProfileCompleted, profileCompleted, getNewDeviceLogin }), [currentUser, newDeviceLogin, profileCompleted]);
    return (
        <UserContext.Provider value={contextVal}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    return useContext(UserContext);
};
