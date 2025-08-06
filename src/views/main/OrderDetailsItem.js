import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Image, StyleSheet, View, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Button, ListItem, Text, Icon, Modal, Card, List, useTheme, Spinner } from '@ui-kitten/components';
import moment from "moment";
import { useUser } from '../main/UserContext';
import CustomModal from '../main/CustomModal';
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../constants/supabase'

const OrderDetailsItem = React.memo((props) => {
  const { currentUser } = useUser();
  const theme = useTheme();
  
  const { 
    indexList, 
    onDeleteItem, 
	onEditItem,
    style, 
    custId, 
    orderStatus, 
    imageSource1, 
    imageSource2, 
    dressType, 
    dressSubType, 
    amt, 
    dueDate, 
    dressGiven, 
    frontNeckType, 
    backNeckType, 
    sleeveType, 
    sleeveLength, 
    frontNeckDesignFile, 
    backNeckDesignFile, 
    sleeveDesignFile, 
    defaultSource, 
    notes, 
    measurementsObj, 
    extraMeasurements, 
    isBag, 
	orderFor,
    ...listItemProps 
  } = props;
  
  const navigation = useNavigation();
  const formattedDate = useMemo(() => moment(dueDate).format('DD-MM-YYYY'), [dueDate]);
  
  const [measurementsData, setMeasurementsData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [dressImages, setDressImages] = useState([]);
  const [patternImages, setPatternImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const openModal = useCallback((images) => {
    setCurrentImages(images);
    setModalVisible(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);
  
  const downloadPics = useCallback(async(picsDb, picsType) => {
    if (!picsDb || picsDb.length === 0) return [];
    
    const downloadedImgs = [];
	await Promise.all(
		picsDb.map(async (img) => {
			try {
				let folderName = picsType === 'dress' ? 'dressImages' : 'patternImages';
				  
				const { data, error } = await supabase.storage
				  .from('order-images')
				  .getPublicUrl(`${folderName}/${img}`);

				if (error) throw error;

				downloadedImgs.push(data.publicUrl);
			} catch (error) {
			  console.log('Error downloading image: ', error?.message || error);
			  return [];
			}
        })
      );
      return downloadedImgs;
  }, []);
  
  useEffect(() => {
    if (isBag) return;
    
	const loadImages = async () => {
		try {
		  setIsLoading(true);
		  if(imageSource1) {
			  const dressImgs = await downloadPics(imageSource1, 'dress');
			  setDressImages(dressImgs);
		  }
		  if(imageSource2) {
			  const patternImgs = await downloadPics(imageSource2, 'pattern');
			  setPatternImages(patternImgs);
		  }
		} finally {
		  setIsLoading(false);
		}
    };
    
    loadImages();
  }, [isBag, imageSource1, imageSource2, downloadPics]);
  
  const shareImage = useCallback(async (remoteImageUri) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('order-images/dressImages')
        .createSignedUrl(remoteImageUri, 60);

      if (error) throw error;
      const imageUrl = data.signedUrl;

      // Define the local file path
      const localUri = FileSystem.documentDirectory + 'shared-image.jpg';

      // Download the image from the remote URL
      const response = await FileSystem.downloadAsync(imageUrl, localUri);

      // Share the downloaded image
      await Sharing.shareAsync(response.uri);
    } catch (error) {
      console.error('Error sharing image: ', error);
    }
  }, []);
  
  const ShareIcon = useCallback(props => 
    <Icon {...props} name="share-outline" style={{ width: 24, height: 24 }} />, 
  []);
  
  const renderDeleteButton = useMemo(() => {
    if (!isBag) return null;
    return (
      <Button
        appearance="ghost"
        size="tiny"
        accessoryLeft={() => (
          <Icon name="trash-2-outline" fill="#FF0000" style={{ width: 20, height: 20 }} />
        )}
        onPress={() => onDeleteItem(indexList)}
        style={styles.trashButton}
      />
    );
  }, [isBag, onDeleteItem, indexList]);
  
  const renderEditButton = useMemo(() => {
    if (!isBag) return null;
    return (
      <Button
        appearance="ghost"
        size="tiny"
        accessoryLeft={() => (
          <Icon name="edit-outline" fill={theme['color-primary-500']} style={{ width: 22, height: 22 }} />
        )}
        onPress={() => onEditItem(indexList)}
        style={styles.editButton}
      />
    );
  }, [isBag, onEditItem, indexList]);
  
  const renderImageSection = useMemo(() => {
    let imagesToUse = [];
    let sourceImages = [];
    
    if (!isBag) {
      imagesToUse = dressImages;
      sourceImages = dressImages;
    } else {
      imagesToUse = imageSource1;
      sourceImages = imageSource1;
    }
	
	if (imagesToUse && imagesToUse.length > 0) {
      return (
        <TouchableOpacity
          onPress={() => openModal(imagesToUse)}
          style={styles.imageContainer}
        >
          <Image
            style={styles.imageCard}
            source={imagesToUse[0] ? { uri: imagesToUse[0] } : defaultSource}
          />
          
            <View style={[styles.overlay, {marginTop: isBag ? -20 : -30}]}>
              <Text style={styles.overlayText}>View Dress</Text>
            </View>
        </TouchableOpacity>
      );
    } else {
		console.log('inside else')
      return (
        <View style={styles.imageContainerDefault}>
          <View style={[styles.overlayDefault, {marginTop: isBag ? -30 : -40}]}>
            <Text style={styles.overlayText}>No images</Text>
          </View>
        </View>
      );
    }
  }, [isBag, dressImages, imageSource1, defaultSource, openModal]);
  
  return (
    <>
      <ListItem
        {...listItemProps}
        style={[styles.container, style]}
      >
        <Card style={[styles.card, {height: isBag ? 135 : 115}]}>
				{renderEditButton}
				{renderDeleteButton}
          <View style={styles.row}>
            {renderImageSection}
            <View style={styles.content}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text category="label" style={{ textTransform: 'capitalize', marginBottom: 0, marginLeft: -4 }}>
                  {dressSubType} {dressType}
                </Text>
                <Button
                  appearance="ghost"
                  size="medium"
                  status="primary"
                  style={{ marginRight: -45 }}
                  onPress={() => setDetailsModalVisible(true)}
                >
					More Details
				</Button>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, marginTop: -5 }}>
                <Text category="s2">Due on:</Text>
                <Text category="s2" style={styles.dateText}>
                  {formattedDate}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text category="s2">Stitching price:</Text>
                <Text 
                  category='label'
                  style={styles.dateText}
                >
                  {`Rs. ${amt}`}
                </Text>
              </View>
			  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text category="s2">Stitched for:</Text>
                <Text 
                  category='label'
                  style={styles.dateText}
                >
                  {orderFor}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </ListItem>

      <Modal 
        style={styles.fullScreenModal} 
        visible={modalVisible} 
        onBackdropPress={closeModal}
      >
        <Card>
          <List
            data={currentImages}
            renderItem={({ item, index }) => (
              <ListItem>
                <Image source={{ uri: item }} style={styles.carouselImage} />
                <Button
                  style={styles.shareButton}
                  appearance="ghost"
                  accessoryLeft={ShareIcon}
                  onPress={() => shareImage(imageSource1[index])}
                />
              </ListItem>
            )}
            horizontal
            keyExtractor={(item, index) => index.toString()}
          />
        </Card>
      </Modal>
      
      <CustomModal 
        visible={detailsModalVisible}
        setVisible={setDetailsModalVisible}
        frontNeckType={frontNeckType}
        backNeckType={backNeckType}
        sleeveType={sleeveType}
        sleeveLength={sleeveLength}
        frontNeckDesignFile={frontNeckDesignFile}
        backNeckDesignFile={backNeckDesignFile}
        sleeveDesignFile={sleeveDesignFile}
        dressType={dressType}
        measurements={measurementsObj}
        extraMeasurements={extraMeasurements}
        patternImgs={isBag ? imageSource2 : patternImages}
        patternImgsRaw={imageSource2}
        defaultSource={defaultSource}
        dressGiven={dressGiven}
        notes={notes}
        isBag={isBag}
      />
	  <Modal
					visible={isLoading}
					backdropStyle={styles.backdrop}
				  >
						<Spinner size="large" status="primary" />
		</Modal>
    </>
  );
});

const WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 130
  },
  image: {
    width: 95,
    height: 95,
    borderRadius: 5,
  },
  dateButton: {
    width: 150,
    borderRadius: 16,
    marginLeft: -5
  },
  detailsButton: {
    width: 130,
    borderRadius: 16,
    marginLeft: 7
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -25,
    right: 0,
    width: '100%',
    height: '135%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  overlayDefault: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -25,
    right: 0,
    width: '100%',
    height: '135%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  overlayText: {
    color: 'white',
    fontSize: 14
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  carouselImage: {
    width: 320,
    height: 300,
  },
  fullContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10, 
  },
  shareButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 20,
    padding: 5,
  },
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  card: {
    borderRadius: 8,
    padding: 0,
    position: 'relative',
    marginVertical: 10,
    elevation: 3, // For shadow on Android
    shadowColor: '#000', // For shadow on iOS
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    width: WIDTH - 30,
    marginLeft: -10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: 120,
    height: 120,
    marginTop: -10,
  },
  imageContainerDefault: {
    flex: 1,
    width: 120,
    height: 120,
  },
  imageCard: {
    width: '100%',
    height: '120%',
    marginLeft: -25,
    borderRadius: 5,
    marginTop: -10
  },
  content: {
    flex: 2,
    padding: 10,
    marginTop: -50,
    marginHorizontal: 5,
    marginLeft: -20
  },
  trashButton: {
    position: 'absolute',
    bottom: 5,
    right: 10,
    paddingHorizontal: 0,
  },
  editButton: {
	position: 'absolute',
    bottom: 5,
    right: 40,
    paddingHorizontal: 0
  },
  dateText: { textAlign: 'right', marginRight: -20 }
});

export default OrderDetailsItem;