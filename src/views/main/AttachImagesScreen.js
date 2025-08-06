import React, { useState } from "react";
import { Image, StyleSheet, View, Alert, ScrollView, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import { storage } from '../extra/storage';
import { Button, Text, Modal, Spinner } from '@ui-kitten/components';
import { supabase } from '../../constants/supabase';
import { useUser } from '../main/UserContext';

const { width, height } = Dimensions.get('window');

export default function AttachImagesScreen({ route }) {
  const navigation = useNavigation();
  const { currentUser } = useUser();
  const { 
    item, 
    shareIntentType, 
    shareIntentSubType, 
    shareIntent, 
    userType, 
    shopName, 
    shopAddress, 
    shopPhNo, 
    selectedItemIndex 
  } = route.params;
  console.log(item.patternPics)
  
  const [loading, setLoading] = useState(false);
  
  const navigateToOrderDetails = () => {
    navigation.navigate('OrderDetailsMain', {
      screen: 'OrderDetails',
      params: {
        item,
        userType,
        orderDate: item.orderDate,
        shopName,
        shopAddress,
        shopPhNo,
        isShareIntent: true
      }
    });
  };
  
  const updateStorage = (picsArr, replaceMode = false) => {
	  const key = currentUser.username + '_Created';
	  
	  // Process the first cache regardless of conditions
	  console.log(key);
	  const jsonCacheValue = storage.getString(key);
	  const cacheValue = jsonCacheValue ? JSON.parse(jsonCacheValue) : null;
	  
	  if (cacheValue?.length > 0) {
		const updatedCache = cacheValue.map(item1 => {
		  if (item1.orderNo === item.orderNo) {
			console.log(item1);
			if (replaceMode) {
				console.log('in if replaceMode')
			  item1.patternPics[selectedItemIndex] = picsArr;
			  console.log(item1.patternPics)
			} else {
			  item1.patternPics[selectedItemIndex].push(...picsArr);
			  console.log(item1.patternPics)
			}
		  }
		  return item1;
		});
		console.log(updatedCache);
		storage.set(key, JSON.stringify(updatedCache));
	  }
	  
	  // Only process key1 if userType is not 'tailor' OR (userType is 'tailor' AND item.custUsername exists)
	  /*if (item.custUsername) {
		const key1 = item.custUsername + '_Created';
		
		console.log(key1);
		const jsonCacheValue1 = storage.getString(key1);
		const cacheValue1 = jsonCacheValue1 ? JSON.parse(jsonCacheValue1) : null;
		
		if (cacheValue1?.length > 0) {
		  const updatedCache1 = cacheValue1.map(item1 => {
			if (item1.orderNo === item.orderNo) {
			  console.log(item1);
			  if (replaceMode) {
				item1.patternPics[selectedItemIndex] = picsArr;
			  } else {
				item1.patternPics[selectedItemIndex].push(...picsArr);
			  }
			}
			return item1;
		  });
		  console.log(updatedCache1);
		  storage.set(key1, JSON.stringify(updatedCache1));
		}
	  }*/
	};
  
  const processImages = async (replaceMode = false) => {
    try {
      setLoading(true);
      
      if (!shareIntent?.files?.length) {
        throw new Error("No files to process");
      }
      
      // Copy files to local directory
      const uris = await Promise.all(
        shareIntent.files.map(async (file) => {
          const baseUri = FileSystem.documentDirectory + file.fileName;
          await FileSystem.copyAsync({
            from: file.path,
            to: baseUri
          });
          return baseUri;
        })
      );
      
      // Upload to Supabase and get paths
      const picsArr = [];
      await Promise.all(
        uris.map(async(pic) => {
          const arraybuffer = await fetch(pic).then((res) => res.arrayBuffer());
          const fileExt = pic?.split('.').pop()?.toLowerCase() ?? 'jpeg';
          const path = `${Date.now()}.${fileExt}`;
          picsArr.push(path);
          
          const { error: uploadError } = await supabase.storage
            .from('order-images/patternImages')
            .upload(path, arraybuffer, {
              contentType: 'image/jpeg',
            });

          if (uploadError) {
            throw uploadError;
          }
        })
      );
      
      // Update database
      if (replaceMode) {
		  console.log('in replaceMode true')
        // For replace mode
        const { error } = await supabase
          .from('DressItems')
          .update({ patternPics: picsArr.join(',') })
          .eq('orderNo', item.orderNo)
          .eq('dressType', shareIntentType)
          .eq('dressSubType', shareIntentSubType);
        
        if (error) throw error;
        
        item.patternPics[selectedItemIndex] = picsArr;
      } else {
        // For attach to existing mode
		console.log('in replaceMode false')
        item.patternPics[selectedItemIndex].push(...picsArr);
        console.log(item.patternPics);
		console.log(item.patternPics[selectedItemIndex].join(','));
        const { error } = await supabase
          .from('DressItems')
          .update({ patternPics: item.patternPics[selectedItemIndex].join(',') })
          .eq('orderNo', item.orderNo)
          .eq('dressType', shareIntentType)
          .eq('dressSubType', shareIntentSubType);
        
        if (error) throw error;
      }
      
      // Update local storage
      updateStorage(item.patternPics, replaceMode);
      
      // Navigate back
      navigateToOrderDetails();
      
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to process images");
      console.error('Error', error);
    } finally {
      setLoading(false);
    }
  };
  
  const attachAlert = () => {
    Alert.alert(
      "Confirmation", 
      "Do you want to attach to existing images or replace?",
      [
        {
          text: 'Existing',
          onPress: () => processImages(false)
        },
        {
          text: 'Replace',
          onPress: () => processImages(true)
        }
      ],
      {cancelable: true}
    );
  };
  
  return (
    <View style={styles.container}>
      <ScrollView horizontal>
		  <View style={{flexDirection: 'row', gap: -30, position: 'relative', width: '90%', height: '80%',}}>
			  {shareIntent?.files?.map((file) => (
				<Image
				  key={file.path}
				  source={{ uri: file.path }}
				  style={[styles.image, styles.gap]}
				/>
			  ))}
		  </View>
	  </ScrollView>
      <Button onPress={attachAlert}>Attach</Button>
      <Modal
        visible={loading}
        backdropStyle={styles.backdrop}
      >
        <Spinner size="large" status="primary" />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  image: {
    width: width,
    height: '120%',
	flexWrap: 'wrap'
  },
  gap: {
    marginBottom: 20,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});