// ImageViewComponent.js
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const ZoomableImage = ({ imageUri }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      } else if (scale.value > 4) {
        scale.value = withTiming(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });

	const singleTapGesture = Gesture.Tap()
		.numberOfTaps(1)
		.onEnd(() => {
		  console.log('Single tap');
	});

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, singleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.Image
        source={{ uri: imageUri }}
        style={[styles.image, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
};

const ImageViewComponent = ({
  imageUri,
  modalVisible = false,
  closeModal,
  useInternalModal = false,
  downloadImage = downloadImage
}) => {
	console.log('imageUri', imageUri);
	const isPng = imageUri?.toLowerCase().endsWith('.png');
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, useInternalModal && {backgroundColor: 'white'}]}>
        {closeModal && (
		<>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Icon name="close" size={30} color="#000" />
          </TouchableOpacity>
		  {!isPng && <TouchableOpacity style={styles.shareButton} onPress={() => {closeModal(); downloadImage(imageUri);}}>
            <Icon name="download" size={30} color="#000" />
          </TouchableOpacity>}
		</>
        )}
        <ZoomableImage imageUri={imageUri} />
      </View>
    </GestureHandlerRootView>
  );

  // 🔹 Standalone fullscreen mode
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

  // 🔹 Embedded mode (carousel / parent modal)
  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
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