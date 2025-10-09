import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Button, Card, CheckBox, Text } from '@ui-kitten/components';

const DeliveryOptionsModal = ({ visible,
  onClose,
  selectedAddons,
  toggleAddon,
  orderDeliveryOptions,
  onSave
}) => {
  return (
    <View style={styles.container}>
      <Modal
        visible={visible}
        backdropStyle={styles.backdrop}
        onBackdropPress={onClose}
      >
        <Card disabled={true} style={styles.card}>
          <Text category='h6' style={styles.title}>
            Select Delivery Options
          </Text>

          {orderDeliveryOptions.map((addon) => (
            <CheckBox
              key={addon}
              checked={selectedAddons.includes(addon)}
              onChange={() => toggleAddon(addon)}
              style={styles.checkbox}
            >
              {addon}
            </CheckBox>
          ))}
		<View style={styles.buttonContainer}>
          <Button style={styles.closeButton} size='small' onPress={onSave}>
            Done
          </Button>
		  <Button style={styles.closeButton} size='small' onPress={onClose}>
            Cancel
          </Button>
		</View>  
        </Card>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    width: 300,
    borderRadius: 12,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  checkbox: {
    marginVertical: 4,
  },
  closeButton: {
    marginTop: 12,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  buttonContainer: {
	flexDirection: 'row',
	alignItems: 'center',
	gap: 20,
	marginHorizontal: 50
  }
});

export default DeliveryOptionsModal;
