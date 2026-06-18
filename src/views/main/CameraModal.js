import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  BackHandler,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera/next';
import * as ImageManipulator from 'expo-image-manipulator';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const PREVIEW_SIZE = SCREEN_W;

// ─────────────────────────────────────────────────────────────
// Free Cropper
// ─────────────────────────────────────────────────────────────

const FreeCropper = ({ imageUri, onCropComplete, onCancel, onClose }) => {
  const [imgLayout, setImgLayout] = useState(null);
  const imgLayoutRef = useRef(null);

  const [rotation, setRotation] = useState(0);
const [displayUri, setDisplayUri] = useState(imageUri);

  const [box, setBox] = useState({
    x: 20,
    y: 20,
    w: 200,
    h: 200,
  });

  const boxRef = useRef(box);
  boxRef.current = box;

  const startRef = useRef(null);

  // Initialize crop box AFTER image layout known
  useEffect(() => {
    if (!imgLayout) return;

    setBox({
      x: imgLayout.offsetX + 20,
      y: imgLayout.offsetY + 20,
      w: imgLayout.dispW - 40,
      h: imgLayout.dispH - 40,
    });
  }, [imgLayout]);
  
  const updateImgLayout = (layout) => {
	  imgLayoutRef.current = layout;
	  setImgLayout(layout);
	};

  // ----------------------------------------------------------
  // Pan handlers
  // ----------------------------------------------------------

  const makePan = (type) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,

        onPanResponderGrant: (_, gs) => {
          startRef.current = {
            x: gs.x0,
            y: gs.y0,
            box: { ...boxRef.current },
          };
        },

        onPanResponderMove: (_, gs) => {
          if (!imgLayoutRef.current) return;

          const dx = gs.moveX - startRef.current.x;
          const dy = gs.moveY - startRef.current.y;

          const b = startRef.current.box;

          const MIN = 60;

          const { offsetX, offsetY, dispW, dispH } = imgLayoutRef.current;

          const maxRight = offsetX + dispW;
          const maxBottom = offsetY + dispH;

          let next = { ...b };

          switch (type) {
            case 'move': {
              next.x = b.x + dx;
              next.y = b.y + dy;

              next.x = Math.max(
                offsetX,
                Math.min(maxRight - b.w, next.x)
              );

              next.y = Math.max(
                offsetY,
                Math.min(maxBottom - b.h, next.y)
              );

              break;
            }

            case 'tl': {
              next.x = Math.min(b.x + b.w - MIN, b.x + dx);
              next.y = Math.min(b.y + b.h - MIN, b.y + dy);

              next.x = Math.max(offsetX, next.x);
              next.y = Math.max(offsetY, next.y);

              next.w = b.w - (next.x - b.x);
              next.h = b.h - (next.y - b.y);

              break;
            }

            case 'tr': {
              next.y = Math.min(b.y + b.h - MIN, b.y + dy);
              next.y = Math.max(offsetY, next.y);

              next.w = Math.max(
                MIN,
                Math.min(maxRight - b.x, b.w + dx)
              );

              next.h = b.h - (next.y - b.y);

              break;
            }

            case 'bl': {
              next.x = Math.min(b.x + b.w - MIN, b.x + dx);
              next.x = Math.max(offsetX, next.x);

              next.w = b.w - (next.x - b.x);

              next.h = Math.max(
                MIN,
                Math.min(maxBottom - b.y, b.h + dy)
              );

              break;
            }

            case 'br': {
              next.w = Math.max(
                MIN,
                Math.min(maxRight - b.x, b.w + dx)
              );

              next.h = Math.max(
                MIN,
                Math.min(maxBottom - b.y, b.h + dy)
              );

              break;
            }
          }

          setBox(next);
        },
      });  

	const handleRotate = async () => {
	  try {
		const nextRotation = (rotation + 90) % 360;

		const rotated =
		  await ImageManipulator.manipulateAsync(
			displayUri,
			[
			  {
				rotate: 90,
			  },
			],
			{
			  compress: 1,
			  format: ImageManipulator.SaveFormat.JPEG,
			}
		  );
		  console.log('[Rotate] new URI:', rotated.uri);
			console.log('[Rotate] new size:', rotated.width, rotated.height);
 

		setRotation(nextRotation);
		setDisplayUri(rotated.uri);

		// reset layout so it recalculates
		imgLayoutRef.current = null;
		setImgLayout(null);
		
		setBox({
		  x: 20,
		  y: 20,
		  w: 200,
		  h: 200,
		});

	  } catch (e) {
		console.error('Rotate error:', e);
	  }
	};

  // ----------------------------------------------------------
  // Crop
  // ----------------------------------------------------------

  const handleCrop = async () => {
  if (!imgLayout) return;

  try {
    const {
      dispW,
      dispH,
      offsetX,
      offsetY,
    } = imgLayout;

    // --------------------------------------------------
    // STEP 1: Normalize image first
    // This fixes OEM/device bitmap scaling issues
    // --------------------------------------------------

    const normalized =
      await ImageManipulator.manipulateAsync(
        displayUri,
        [],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

    // --------------------------------------------------
    // STEP 2: Get REAL bitmap dimensions
    // --------------------------------------------------

    const { width: realW, height: realH } =
      normalized;

    console.log(
      '[Normalized Size]',
      realW,
      realH
    );

    // --------------------------------------------------
    // STEP 3: Compute scale using REAL bitmap size
    // --------------------------------------------------

    const scaleX = realW / dispW;
    const scaleY = realH / dispH;

    // --------------------------------------------------
    // STEP 4: Convert crop box to image coords
    // --------------------------------------------------

    const relX = box.x - offsetX;
    const relY = box.y - offsetY;

    const originX = Math.max(
      0,
      Math.floor(relX * scaleX)
    );

    const originY = Math.max(
      0,
      Math.floor(relY * scaleY)
    );

    const width = Math.min(
      realW - originX,
      Math.floor(box.w * scaleX)
    );

    const height = Math.min(
      realH - originY,
      Math.floor(box.h * scaleY)
    );

    console.log('[Crop Input]', {
      box,
      imgLayout,
      realW,
      realH,
      scaleX,
      scaleY,
      originX,
      originY,
      width,
      height,
    });

    // --------------------------------------------------
    // STEP 5: Crop normalized image
    // --------------------------------------------------

    const result =
      await ImageManipulator.manipulateAsync(
        normalized.uri,
        [
          {
            crop: {
              originX,
              originY,
              width,
              height,
            },
          },
        ],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

    console.log('[Crop Output]', {
      width: result.width,
      height: result.height,
      uri: result.uri,
    });

    onCropComplete(result.uri);

  } catch (e) {
    console.error('Crop error:', e);
  }
};

  // ----------------------------------------------------------
  // Corner handle
  // ----------------------------------------------------------

  const corner = (type, style) => (
    <View
      key={type}
      style={[styles.handle, style]}
      {...makePan(type).panHandlers}
    />
  );

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.darkBg} />

      {/* IMPORTANT:
          image + crop box INSIDE SAME CONTAINER
      */}
      <View style={styles.previewContainer}>
        <Image
		  source={{ uri: displayUri }}
		  style={styles.preview}
		  resizeMode="contain"
		  onLoad={(e) => {
			const natW = e.nativeEvent.source.width;
			const natH = e.nativeEvent.source.height;

			// Container size is always PREVIEW_SIZE × PREVIEW_SIZE
			const containerW = PREVIEW_SIZE;
			const containerH = PREVIEW_SIZE;

			const imageAspect = natW / natH;
			const containerAspect = containerW / containerH;

			let dispW, dispH;
			if (imageAspect > containerAspect) {
			  dispW = containerW;
			  dispH = containerW / imageAspect;
			} else {
			  dispH = containerH;
			  dispW = containerH * imageAspect;
			}

			const offsetX = (containerW - dispW) / 2;
			const offsetY = (containerH - dispH) / 2;

			console.log('[onLoad] natW/H:', natW, natH);
			console.log('[onLoad] disp:', dispW, dispH, 'offset:', offsetX, offsetY);

			updateImgLayout({ dispW, dispH, natW, natH, offsetX, offsetY });
		  }}
		/>

        {/* Crop Box */}
        <View
			key={imgLayout ? `${imgLayout.offsetX}-${imgLayout.dispW}` : 'init'}  
          style={[
            styles.cropBox,
            {
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
            },
          ]}
          {...makePan('move').panHandlers}
        >
          {/* Grid */}
          <View
            style={[
              styles.grid,
              { top: '33%', left: 0, right: 0, height: 1 },
            ]}
          />

          <View
            style={[
              styles.grid,
              { top: '66%', left: 0, right: 0, height: 1 },
            ]}
          />

          <View
            style={[
              styles.grid,
              { left: '33%', top: 0, bottom: 0, width: 1 },
            ]}
          />

          <View
            style={[
              styles.grid,
              { left: '66%', top: 0, bottom: 0, width: 1 },
            ]}
          />

          {corner('tl', {
            top: -10,
            left: -10,
          })}

          {corner('tr', {
            top: -10,
            right: -10,
          })}

          {corner('bl', {
            bottom: -10,
            left: -10,
          })}

          {corner('br', {
            bottom: -10,
            right: -10,
          })}
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
		  <TouchableOpacity
			style={styles.btn}
			onPress={onCancel}
		  >
			<Text style={styles.btnText}>
			  Retake
			</Text>
		  </TouchableOpacity>

		  <TouchableOpacity
			style={styles.btn}
			onPress={handleRotate}
		  >
			<Text style={styles.btnText}>
			  Rotate
			</Text>
		  </TouchableOpacity>

		  <TouchableOpacity
			style={[styles.btn, styles.btnPrimary]}
			onPress={handleCrop}
		  >
			<Text
			  style={[
				styles.btnText,
				{ color: '#000' },
			  ]}
			>
			  Use Photo
			</Text>
		  </TouchableOpacity>
		  
		  <TouchableOpacity
			style={styles.btn}
			onPress={() => {onCancel(); onClose();}}
		  >
			<Text style={styles.btnText}>
			  Cancel
			</Text>
		  </TouchableOpacity>
		</View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Camera Modal
// ─────────────────────────────────────────────────────────────

const CameraModal = ({
  visible,
  onClose,
  onCapture,
}) => {
  const cameraRef = useRef(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [isCropping, setIsCropping] =
    useState(false);

  const [capturedUri, setCapturedUri] =
    useState(null);

  const [isCapturing, setIsCapturing] =
    useState(false);

  useEffect(() => {
    if (!isCropping) return;

    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleCropCancel();
        return true;
      }
    );

    return () => sub.remove();
  }, [isCropping]);

  useEffect(() => {
    if (
      visible &&
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !cameraRef.current) return;

    setIsCapturing(true);

    try {
      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.7,
          //skipProcessing: true,
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

  const handleCropComplete = useCallback(
    async (uri) => {
      onClose();

      setIsCropping(false);
      setCapturedUri(null);

      await onCapture(uri);
    },
    [onClose, onCapture]
  );

  const handleCropCancel = useCallback(() => {
    setIsCropping(false);
    setCapturedUri(null);
  }, []);

  if (!visible) return null;
  if (!permission?.granted) return null;

  return (
    <Modal visible={visible} transparent>
      {isCropping && capturedUri && (
        <FreeCropper
          imageUri={capturedUri}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
		  onClose={onClose}
        />
      )}

      <CameraView
        ref={cameraRef}
        style={[
          styles.camera,
          isCropping && styles.hidden,
        ]}
        facing="back"
        autofocus="on"
      >
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.captureBtn,
              isCapturing &&
                styles.captureBtnDisabled,
            ]}
            onPress={handleCapture}
            disabled={isCropping || isCapturing}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  darkBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    alignSelf: 'center',
    marginTop:
      (SCREEN_H - PREVIEW_SIZE - 100) / 2,
    position: 'relative',
  },

  preview: {
    width: '100%',
    height: '100%',
  },

  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },

  grid: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  handle: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 4,
  },

  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 20,
    paddingVertical: 24,

    backgroundColor: 'rgba(0,0,0,0.7)',
  },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },

  btnPrimary: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },

  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  camera: {
    flex: 1,
  },

  hidden: {
    display: 'none',
  },

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

  captureBtnDisabled: {
    opacity: 0.5,
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