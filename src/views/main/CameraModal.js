import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal, View, TouchableOpacity, Text, StyleSheet,
  BackHandler, Image, PanResponder, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera/next';
import * as ImageManipulator from 'expo-image-manipulator';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const PREVIEW_SIZE = SCREEN_W;

// ─── Free Crop Editor ────────────────────────────────────────────────────────
const FreeCropper = ({ imageUri, onCropComplete, onCancel }) => {
  const [box, setBox] = useState({
    x: 40, y: 40,
    w: PREVIEW_SIZE - 80,
    h: PREVIEW_SIZE - 80,
  });
  const [imgLayout, setImgLayout] = useState(null);
  const startRef = useRef(null);
  const boxRef = useRef(box);
  boxRef.current = box;

  const makePan = useCallback((type) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        startRef.current = { x: gs.x0, y: gs.y0, box: { ...boxRef.current } };
      },
      onPanResponderMove: (_, gs) => {
        const dx = gs.moveX - startRef.current.x;
        const dy = gs.moveY - startRef.current.y;
        const b = startRef.current.box;
        const MIN = 60;

        setBox(() => {
          switch (type) {
            case 'move': return { ...b, x: b.x + dx, y: b.y + dy };
            case 'tl':   return { x: b.x+dx, y: b.y+dy, w: Math.max(MIN, b.w-dx), h: Math.max(MIN, b.h-dy) };
            case 'tr':   return { x: b.x,    y: b.y+dy, w: Math.max(MIN, b.w+dx), h: Math.max(MIN, b.h-dy) };
            case 'bl':   return { x: b.x+dx, y: b.y,    w: Math.max(MIN, b.w-dx), h: Math.max(MIN, b.h+dy) };
            case 'br':   return { x: b.x,    y: b.y,    w: Math.max(MIN, b.w+dx), h: Math.max(MIN, b.h+dy) };
            default:     return b;
          }
        });
      },
    }), []);

  const handleCrop = async () => {
    if (!imgLayout) return;
    const scaleX = imgLayout.natW / imgLayout.dispW;
    const scaleY = imgLayout.natH / imgLayout.dispH;

    // Clamp box so it never exceeds actual image dimensions
    const originX = Math.max(0, box.x * scaleX);
    const originY = Math.max(0, box.y * scaleY);
    const width   = Math.min(imgLayout.natW - originX, box.w * scaleX);
    const height  = Math.min(imgLayout.natH - originY, box.h * scaleY);

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop: { originX, originY, width, height } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    onCropComplete(result.uri);
  };

  const corner = (type, posStyle) => (
    <View
      key={type}
      style={[cropStyles.handle, posStyle]}
      {...makePan(type).panHandlers}
    />
  );

  return (
    <View style={cropStyles.container}>
      {/* Dark background */}
      <View style={cropStyles.darkBg} />

      <Image
        source={{ uri: imageUri }}
        style={cropStyles.preview}
        resizeMode="contain"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          Image.getSize(imageUri, (natW, natH) =>
            setImgLayout({ dispW: width, dispH: height, natW, natH })
          );
        }}
      />

      {/* Crop box */}
      <View
        style={[cropStyles.cropBox, { left: box.x, top: box.y, width: box.w, height: box.h }]}
        {...makePan('move').panHandlers}
      >
        {/* Rule-of-thirds grid */}
        <View style={[cropStyles.grid, { top: '33%', left: 0, right: 0, height: 1 }]} />
        <View style={[cropStyles.grid, { top: '66%', left: 0, right: 0, height: 1 }]} />
        <View style={[cropStyles.grid, { left: '33%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[cropStyles.grid, { left: '66%', top: 0, bottom: 0, width: 1 }]} />

        {/* Corner handles */}
        {corner('tl', { top: -8,    left: -8   })}
        {corner('tr', { top: -8,    right: -8  })}
        {corner('bl', { bottom: -8, left: -8   })}
        {corner('br', { bottom: -8, right: -8  })}
      </View>

      {/* Toolbar */}
      <View style={cropStyles.toolbar}>
        <TouchableOpacity style={cropStyles.btn} onPress={onCancel}>
          <Text style={cropStyles.btnText}>Retake</Text>
        </TouchableOpacity>
        <Text style={cropStyles.hint}>Drag corners to crop</Text>
        <TouchableOpacity style={[cropStyles.btn, cropStyles.btnPrimary]} onPress={handleCrop}>
          <Text style={[cropStyles.btnText, { color: '#000' }]}>Use Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const cropStyles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  darkBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  preview:    { width: PREVIEW_SIZE, height: PREVIEW_SIZE, marginTop: (SCREEN_H - PREVIEW_SIZE - 100) / 2 },
  cropBox:    { position: 'absolute', borderWidth: 2, borderColor: '#fff' },
  grid:       { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)' },
  handle:     { position: 'absolute', width: 20, height: 20, backgroundColor: '#fff', borderRadius: 3 },
  toolbar:    {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 24, backgroundColor: 'rgba(0,0,0,0.7)',
  },
  btn:        { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  btnPrimary: { backgroundColor: '#fff', borderColor: '#fff' },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  hint:       { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});

// ─── Camera Modal ─────────────────────────────────────────────────────────────
const CameraModal = ({ visible, onClose, onCapture }) => {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCropping, setIsCropping] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isCropping) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCropCancel();
      return true;
    });
    return () => sub.remove();
  }, [isCropping]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
        exif: false,
        shutterSound: false,
      });
      setCapturedUri(photo.uri);
      setIsCropping(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const handleCropComplete = useCallback(async (uri) => {
    onClose();
    setIsCropping(false);
    setCapturedUri(null);
    await onCapture(uri);
  }, [onClose, onCapture]);

  const handleCropCancel = useCallback(() => {
    setIsCropping(false);
    setCapturedUri(null);
  }, []);

  if (!visible) return null;
  if (!permission?.granted) return null;

  return (
    <Modal visible={visible} transparent style={{ width: '100%', height: '100%' }}>

      {/* Crop editor — rendered on top when cropping */}
      {isCropping && capturedUri && (
        <FreeCropper
          imageUri={capturedUri}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Camera — always mounted, hidden during crop to avoid remount lag */}
      <CameraView
        ref={cameraRef}
        style={[styles.camera, isCropping && styles.hidden]}
        facing="back"
        autofocus="on"
        onCameraReady={() => {
          cameraRef.current?.focusAsync?.({ x: 0.5, y: 0.5 });
        }}
      >
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={isCropping || isCapturing}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

    </Modal>
  );
};

const styles = StyleSheet.create({
  camera: { flex: 1 },
  hidden: { display: 'none' },
  controls: {
    position: 'absolute',
    bottom: 48, left: 0, right: 0,
    alignItems: 'center',
    gap: 16,
  },
  captureBtn: {
    width: 72, height: 72,
    borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnInner: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  cancelBtn:  { paddingHorizontal: 24, paddingVertical: 10 },
  cancelText: { color: '#fff', fontSize: 16 },
});

export default CameraModal;