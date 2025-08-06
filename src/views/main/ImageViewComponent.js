// ImageViewComponent.js
import React from 'react';
import { View, TouchableOpacity, Image, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ImageViewComponent = ({ imageUri, modalVisible, closeModal }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Icon name="close" size={30} color="#000" />
          </TouchableOpacity>
          <Image source={{ uri: imageUri }} style={styles.fullImage} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    position: 'relative',
    width: '90%',
    height: '80%',
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});

export default ImageViewComponent;
