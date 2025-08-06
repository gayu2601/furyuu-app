// ShopInfoModal.js
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Modal, Card, Input, Button, Text, Layout } from '@ui-kitten/components';

const ShopInfoModal = ({ visible, onClose }) => {
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');

  const handleSave = () => {
    const data = { shopName, shopAddress };
    onClose(data); // Return the data
    setShopName('');
    setShopAddress('');
  };

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={onClose}
    >
      <Card disabled={true} style={styles.card}>
        <Text category="h6" style={styles.title}>Shop Info</Text>
        <Input
          label="Shop Name *"
          placeholder="Enter shop name"
          value={shopName}
          onChangeText={setShopName}
          style={styles.input}
        />
        <Input
          label="Shop Address *"
          placeholder="Enter shop address"
          value={shopAddress}
          onChangeText={setShopAddress}
          style={styles.input}
        />
        <Button onPress={handleSave} disabled={!shopName || !shopAddress} style={styles.button}>
          Save
        </Button>
      </Card>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 16,
  },
  title: {
    marginBottom: 12,
  },
  card:{
	width: 300
  }
});

export default ShopInfoModal;
