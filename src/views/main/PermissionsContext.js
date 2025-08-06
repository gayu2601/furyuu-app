import React, { createContext, useState, useContext } from 'react';
import * as ImagePicker from 'expo-image-picker';

const PermissionsContext = createContext();

export const usePermissions = () => {
  return useContext(PermissionsContext);
};

export const PermissionsProvider = ({ children }) => {
  const [cameraPermission, setCameraPermission] = useState(null);
  const [mediaPermission, setMediaPermission] = useState(null);

  const requestCameraPermission = async () => {
	console.log('in requestCameraPermission')
    const res = await ImagePicker.requestCameraPermissionsAsync();
	console.log(res)
    setCameraPermission(res.status);
  };
  
  const requestMediaPermission = async () => {
	console.log('in requestMediaPermission')
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
	console.log('mediaStatus: ')
	console.log(result);
    setMediaPermission(result.status);
  };

  return (
    <PermissionsContext.Provider value={{ cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
};
