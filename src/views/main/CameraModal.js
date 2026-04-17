import { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, BackHandler } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera/next';
import { ImageEditor } from 'expo-crop-image';

const CameraModal = ({ visible, onClose, onCapture }) => {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCropping, setIsCropping] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);

  // Intercept Android back button during cropping
  useEffect(() => {
    if (!isCropping) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCropCancel();
      return true; // prevent default back behaviour
    });
    return () => sub.remove();
  }, [isCropping]);

  if (!visible) return null;
  if (!permission?.granted) {
    requestPermission();
    return null;
  }

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setCapturedUri(photo.uri);
      setIsCropping(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCropComplete = async (image) => {
    // Close the modal FIRST so the camera view never flashes
    onClose();
    // Then clean up state and deliver the result
    setIsCropping(false);
    setCapturedUri(null);
    await onCapture(image.uri);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setCapturedUri(null);
    // returns to camera view, modal stays open
  };

  return (
    <Modal visible={visible} transparent style={{ width: '100%', height: '100%' }}>
      {isCropping && capturedUri ? (
        <ImageEditor
          imageUri={capturedUri}
          onEditingCancel={handleCropCancel}
          onEditingComplete={handleCropComplete}
          fixedAspectRatio={undefined}
          minimumCropDimensions={{ width: 50, height: 50 }}
          allowedTransformOperations={['crop']}
          mode="full"
        />
      ) : (
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={handleCapture}
              disabled={isCropping}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </Modal>
  );
};

// ... styles unchanged

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default CameraModal;