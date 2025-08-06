import React, { useState } from 'react';
import { Modal, Card, Text, Button, List, ListItem, Layout } from '@ui-kitten/components';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { Icon } from '@ui-kitten/components';

const CloseIcon = (props) => (
  <Icon {...props} name='close-outline'/>
);

const ClothingModal = ({ 
  visible, 
  onClose, 
  supabase, 
  orders, 
  userType,
  selectedIndex, 
  navigation,
  shareIntent 
}) => {
	console.log(orders[selectedIndex]);
  const [imageURIs, setImageURIs] = useState({});

  const downloadTitlePic = async(picUri) => {
    let ddImg = null;
    try {
      const { data, error } = await supabase.storage
        .from('order-images')
        .getPublicUrl('dressImages/' + picUri);
        
      if (error) {
        throw error;
      }
      
      ddImg = data.publicUrl;
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error downloading image: ', error.message);
        return null;
      }
    }
    return ddImg;
  };

  const handleCardItemPress = (item, dressTypeShared, dressSubTypeShared, index) => {
    onClose(); // Close modal using the passed onClose prop
    navigation.navigate("AttachImages", {
      item: item,
      shareIntentType: dressTypeShared,
      shareIntentSubType: dressSubTypeShared,
      shareIntent: shareIntent,
      userType: userType,
      shopName: item.shopName,
      shopAddress: item.shopAddress,
      shopPhNo: item.shopPhNo,
      selectedItemIndex: index
    });
  };

  const renderItemModal = ({ item, index }) => {
    const currentOrder = orders[selectedIndex];
    const dressSubTypes = currentOrder.dressSubType;
    const dressPics = currentOrder.dressPics;

    if (dressPics && dressPics[index]) {
      try {
        const imageKey = dressPics[index][0];
        if (!imageURIs[imageKey]) {
			if(imageKey) {
			  downloadTitlePic(imageKey)
				.then((result) => {
				  setImageURIs((prevURIs) => ({
					...prevURIs,
					[imageKey]: result,
				  }));
				})
				.catch((error) => {
				  console.error('Error downloading title pic:', error);
				});
			}
        }
      } catch (error) {
        console.log('Error downloading image:', error);
      }
    }

    return (
      <ListItem
        style={styles.listItem}
        onPress={() => {
          handleCardItemPress(
            currentOrder,
            item,
            dressSubTypes[index],
            index
          )
        }}
        description={() => (
          <View style={styles.itemContainer}>
            <Image 
              source={
                imageURIs[dressPics?.[index]?.[0]]
                  ? { uri: imageURIs[dressPics[index][0]] }
                  : require('../../../assets/img_na.png')
              }
              style={styles.itemImage}
            />
            <Text category='s2' style={{textTransform: 'capitalize'}}>
              {dressSubTypes[index] ? `${dressSubTypes[index]} ${item}` : item}
            </Text>
          </View>
        )}
      />
    );
  };

  const Header = () => (
    <Layout style={styles.header}>
      <Text category='h6'>Select Clothing Type</Text>
      <TouchableOpacity onPress={onClose}>
        <CloseIcon style={styles.closeIcon} fill="#8F9BB3"/>
      </TouchableOpacity>
    </Layout>
  );

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={onClose}
    >
      <Card disabled={true} header={Header} style={styles.card}>
        <List
          data={orders[selectedIndex]?.dressType || []}
          renderItem={renderItemModal}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          style={styles.list}
        />
      </Card>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    margin: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  closeIcon: {
    width: 24,
    height: 24,
  },
  list: {
	marginTop: -15,
    maxHeight: 300,
    backgroundColor: 'transparent',
  },
  listItem: {
    paddingVertical: 10,
    borderRadius: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
	gap: 5
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#EDF1F7',
  }
});

export default ClothingModal;