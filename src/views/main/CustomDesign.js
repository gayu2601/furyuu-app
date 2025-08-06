import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Button, TopNavigationAction } from "@ui-kitten/components";
import SignatureScreen from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowIosBackIcon } from "../extra/icons";

const CustomDesign = () => {
    const ref = useRef();
	const route = useRoute();
	const { field, returnFile, prevScreen, editRouteParams } = route.params
	console.log('route.params in CustomDesign:')
	console.log(route.params);
	const navigation = useNavigation();
	const [uriC, setUriC] = useState(null);
	const { width, height } = Dimensions.get('window');
	
	useEffect(() => {
		navigation.setOptions({
		  headerLeft: () => (
			<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => {
				console.log('in custom design top nav action')
				if (prevScreen === 'Edit') {
				  navigation.navigate('EditOrderDetails', editRouteParams);
				} else {
					navigation.goBack();
				}
			}}/>
		  ),
		});
	  }, [navigation, prevScreen]);
	
  const handleOK = (signature) => {
    //console.log(signature);
	console.log('in handleOK')
	const uniqueName = `sign_${Date.now()}.png`;
		const path = FileSystem.cacheDirectory + uniqueName;
		  FileSystem.writeAsStringAsync(
			path,
			signature.replace("data:image/png;base64,", ""),
			{ encoding: FileSystem.EncodingType.Base64 }
		  )
			.then(() => {
			  FileSystem.getInfoAsync(path).then((fileInfo) => {
				console.log('File Info:', fileInfo);
				setUriC(path); // Set uriC here
			  });
			})
			.catch(console.error);
		console.log('uriC: ' + uriC)
		  if (returnFile) {
			console.log(path)
            returnFile(path);
          }
		if(prevScreen === 'Edit') {
			navigation.navigate('EditOrderDetails', editRouteParams)
		} else {
			navigation.goBack(); 
		}
	//onOK(signature); // Callback from Component props
  };
  
  const handleConfirm = () => {
    console.log("end");
	ref.current.readSignature();
  };

  // Called after ref.current.clearSignature()
  const handleClear = () => {
	ref.current.clearSignature();
    console.log("clear success!");
  };
  
  useEffect(() => {
	console.log('in clearSignature useEffect');
	ref.current.clearSignature();  
	setUriC(null);
  }, [field]);
  
  useEffect(() => {
	  if (uriC) {
		console.log('Updated uriC:', uriC);
	  }
	}, [uriC]);
	
	//const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;
	const style = ` body,html { width: 100%; height: 600px; }`;


  return (
    <View style={styles.container}>
		<View style={styles.signscreen}>
			<SignatureScreen
			  ref={ref}
			  onOK={handleOK}
			  webStyle={style}
			/>
		</View>

		<View style={styles.buttons}>
			<Button appearance='outline' onPress={handleClear}>Clear</Button>
			<Button appearance='outline' onPress={handleConfirm}>Save</Button>
		  </View>
	</View>
  );
};

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  container: {
	backgroundColor: 'white', flex: 1
  },
  signscreen: {
	height: 550, marginBottom: 10
  },
  navButton: {
	  marginLeft: 20
  }
});

export default CustomDesign;