import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── ZoomableImage ────────────────────────────────────────────────────────────

const ZoomableImage = ({ imageUri }) => (
  <ImageViewer
    imageUrls={[{ url: imageUri }]}
    enableSwipeDown
    backgroundColor="#fff"
  />

);

// ─── ImageViewComponent ───────────────────────────────────────────────────────

const ImageViewComponent = ({
  imageUri,
  modalVisible = false,
  closeModal,
  useInternalModal = false,
  downloadImage,
}) => {
  const isPng = imageUri?.toLowerCase()?.endsWith('.png');

  const content = (
    <View style={styles.container}>
      <ZoomableImage imageUri={imageUri} />

      {closeModal && (
        <>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {!isPng && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => { closeModal(); downloadImage(imageUri); }}
            >
              <Icon name="download" size={30} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  if (useInternalModal) {
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        {content}
      </Modal>
    );
  }

  return content;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  editorContainer: {
    flex: 1,
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  shareButton: {
    position: 'absolute',
    top: 40,
    right: 60,
    zIndex: 10,
  },
});

export default ImageViewComponent;