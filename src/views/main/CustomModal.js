import React, { useState, useEffect } from 'react';
import { Modal, Card, Button, Layout, Text, Input, Tab, TabBar } from '@ui-kitten/components';
import { View, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../constants/supabase'
import ImageViewComponent from '../main/ImageViewComponent';
import VNeck from '../../components/necktypes/VNeckComponent.js';
import RoundNeck from '../../components/necktypes/RoundNeckComponent.js';
import SquareNeck from '../../components/necktypes/SquareNeckComponent.js';
import PentagonNeck from '../../components/necktypes/PentagonNeckComponent.js';
import SweetheartNeck from '../../components/necktypes/SweetheartNeckComponent.js';
import CollarNeck from '../../components/necktypes/CollarNeckComponent.js';
import RoundWithVCutNeck from '../../components/necktypes/RoundWithVCutNeckComponent.js';
import QueenNeck from '../../components/necktypes/QueenNeckComponent.js';
import Boatneck from '../../components/necktypes/BoatneckComponent.js';
import KeyholeNeck from '../../components/necktypes/KeyholeNeckComponent.js';
import TeardropNeck from '../../components/necktypes/TeardropNeckComponent.js';

const CustomModal = ({ visible, setVisible, frontNeckType, backNeckType, sleeveType, sleeveLength, frontNeckDesignFile, backNeckDesignFile, sleeveDesignFile, dressType, measurements, extraMeasurements, patternImgs, patternImgsRaw, dressGiven, notes, defaultSource, isBag }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
const [selectedTab, setSelectedTab] = useState('');
const [selImg, setSelImg] = useState(null)
const [imgModalVisible, setImgModalVisible] = useState(false);
const [fnImg, setFnImg] = useState(null);
const [bnImg, setBnImg] = useState(null);
const [sleeveImg, setSleeveImg] = useState(null);
const neckTypeSVGs = {
  'Round': RoundNeck,
  'VNeck': VNeck,
  'Square': SquareNeck,
  'Pentagon': PentagonNeck,
  'Sweetheart': SweetheartNeck,
  'Queen': QueenNeck,
  'Keyhole': KeyholeNeck,
  'Boat': Boatneck,
  'Teardrop': TeardropNeck,
  'RoundWithVCut': RoundWithVCutNeck,
  'Collar': CollarNeck
};

  const openImgModal = () => {
    setImgModalVisible(true);
  };

  const closeImgModal = () => {
    setImgModalVisible(false);
  };
  
  useEffect(() => {
		const downloadPic = async(imageUri, folderName) => {
			  try {
					  const { data, error } = await supabase.storage.from('design-files').getPublicUrl(folderName + '/' + imageUri)

					  if (error) {
						throw error
					  }
					return data.publicUrl;
				} catch (error) {
					console.error('Error downloading image: ', error.message)
					return null;
				}
		}
		const getDesignFiles = async() => {
			if(frontNeckDesignFile) {
				let a = await downloadPic(frontNeckDesignFile, 'frontNeckDesignFile')
				setFnImg(a);
			}
			if(backNeckDesignFile) {
				let b = await downloadPic(backNeckDesignFile, 'backNeckDesignFile')
				setBnImg(b);
			}
			if(sleeveDesignFile) {
				let c = await downloadPic(sleeveDesignFile,'sleeveDesignFile')
				setSleeveImg(c);
			}
		}
		
		getDesignFiles();
	},[frontNeckDesignFile, backNeckDesignFile, sleeveDesignFile]);
  
	const handleTabSelect = (index) => {
	  const tabTitle = tabs[index].title; // Get the title of the selected tab
	  setSelectedTab(tabTitle); // Set the selected tab title
	  setSelectedIndex(index);  // Set the selected index for the TabBar
	};


  const handleCloseModal = () => {
    setVisible(false);
  };
  
  const shareImage = async (remoteImageUri, picType) => {
    try {
		let folderPic = '';
		if(picType === 'pattern') {
			folderPic = 'order-images/patternImages';
		} else {
			folderPic = 'design-files/' + picType;
		}
		const { data, error } = await supabase
			.storage
			.from(folderPic)
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
  };
  
  const keysToDisplay = {
    Bottom: ['waist', 'hip', 'leg', 'bottomLength'],
    Full: ['frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'waist', 'hip', 'leg', 'topLength', 'bottomLength'],
    Top: ['frontNeck', 'backNeck', 'shoulder', 'sleeve', 'AHC', 'shoulderToWaist', 'chest', 'topLength'],
  };

  const dressTypeToKeysMapping = {
    shirt: 'Top',
	tops: 'Top',
    chudithar: 'Full',
    lehenga: 'Full',
    frock: 'Full',
    skirt: 'Bottom',
	suit: 'Full',
    pants: 'Bottom',
    blouse: 'Top',
    nightie: 'Full',
    pyjama: 'Full',
	partywear: 'Full',
	uniform: 'Full',
	nightdress: 'Full',
	halfsaree: 'Full',
	paavadai: 'Full'
  };
  const keyGroup = dressTypeToKeysMapping[dressType.toLowerCase()];
  const displayKeys = keysToDisplay[keyGroup] || [];
  displayKeysLabel = {
	    frontNeck: 'Front Neck',
	    backNeck: 'Back Neck',
		shoulder: 'Shoulder',
		sleeve: 'Sleeve',
		AHC: 'Arm Hole Curve',
		shoulderToWaist: 'Shoulder to Waist Length',
		chest: 'Chest',
		waist: 'Waist',
		hip: 'Hip',
		leg: 'Leg',
		topLength: 'Top Length',
		bottomLength: 'Bottom Length'
	}
  
  const renderTabContent = (index) => {
    switch (index) {
      case 0:
        return (
          <Layout style={styles.tabContent}>
			<View style={styles.fieldContainer}>
				<Text category='label' >Measurement Dress Given</Text>
				<Text category='s2'>{dressGiven ? 'Yes' : 'No'}</Text>
			</View>
		      {displayKeys.map((key) => {
				  return (
				<View key={key} style={styles.fieldContainer}>
				  <Text category='label'>{displayKeysLabel[key]}</Text>
				  <Text category='s2'>{measurements[key]}</Text>
				</View>
				)
			  })}
			  {extraMeasurements && Object.entries(extraMeasurements).map(([key, value]) => {
								  return (
								<View key={key} style={styles.fieldContainer}>
								  <Text category='label' style={{textTransform: 'capitalize'}}>{key}</Text>
								  <Text category='s2'>{value}</Text>
								</View>
								)
							  })}
			  <Card>
					<Text category='s2' style={{marginLeft: -10}}>
					  <Text category='label' style={{ fontWeight: 'bold' }}>Notes:</Text> {notes}
					</Text>
				  
				</Card>
          </Layout>
        );
      case 1:
        return (
          <Layout style={styles.tabContent}>
            <View style={styles.imageContainer}>
              <ScrollView horizontal>
                {patternImgs.length > 0 && patternImgs.map((imageUrl, index) => {
					return (
					<View style={{alignItems: 'center'}}>
						<Button
						  style={styles.image}
						  appearance='ghost'
						  accessoryLeft={() => (
							<Image source={imageUrl ? { uri: imageUrl } : defaultSource} key={imageUrl} style={styles.image} />
						  )}
						  onPress={() => {
									setSelImg(imageUrl); 
									openImgModal();
						  }}
						/>
						  {!isBag && (<Button
							  style={styles.shareButton}
							  size='tiny'
							  onPress={() => shareImage(patternImgsRaw[index], 'pattern')}
						  >Share</Button>)}
					</View>
                ) })}
              </ScrollView>
            </View>
			{selImg && (
						<ImageViewComponent
							imageUri={selImg}
							modalVisible={imgModalVisible}
							closeModal={closeImgModal}
						  />
			)}
          </Layout>
        );
	  case 2:
	    return (
          <Layout style={styles.tabContent}>
            <View style={styles.fieldContainerNeck}>
              <Text category='label'>Front Neck:</Text>
                  {(() => {
					const NeckSVGComponent = neckTypeSVGs[frontNeckType];
					return NeckSVGComponent && (
					  <NeckSVGComponent width={150} height={150} style={styles.neckDesign}/>
					);
				  })()}
            </View>
			{frontNeckType === 'Custom' && fnImg && (
				<View style={styles.designFile}>
				  <Image source={{ uri: fnImg }} style={styles.imageDesign} />
				</View>	
			)}
            <View style={styles.fieldContainerNeck}>
              <Text category='label'>Back Neck:</Text>
              {(() => {
					const NeckSVGComponent = neckTypeSVGs[backNeckType];
					return NeckSVGComponent && (
					  <NeckSVGComponent width={150} height={150} style={styles.neckDesign}/>
					)
			  })()}
            </View>
			{backNeckType === 'Custom' && bnImg && (
				<View style={styles.designFile}>
				  <Image source={{ uri: bnImg }} style={styles.imageDesign} />
				</View>
			)}
            <View style={styles.fieldContainer1}>
              <Text category='label'>Sleeve:</Text>
              <Text category='s2'>{sleeveType}</Text>
            </View>
			{sleeveType === 'Custom' && sleeveImg && (
				<View style={styles.designFile}>
				  <Image source={{ uri: sleeveImg }} style={styles.imageDesign} />
				</View>
			)}
			<View style={styles.fieldContainer1}>
              <Text category='label'>Sleeve Length:</Text>
			  <Text category='s2'>{sleeveLength}</Text>
            </View>
          </Layout>
        );
      default:
        return null;
    }
  };
  
  const tabs = [
	  { title: "Measurements" },
	  { title: "Design Pics" },
	  { title: "Neck & Sleeve" }
	];

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={handleCloseModal}
    >
      <Card disabled={true} style={styles.modalCard}>
		{dressType !== 'pants' ? (
			<TabBar
			  selectedIndex={selectedIndex}
			  onSelect={setSelectedIndex}
			>
				<Tab title="Measurements" />
				<Tab title="Design Pics" />
				<Tab title="Neck & Sleeve" />
			</TabBar>
		  ) : (
			<TabBar
			  selectedIndex={selectedIndex}
			  onSelect={setSelectedIndex}
			>
			  <Tab title="Measurements" />
			  <Tab title="Design Pics" />
			</TabBar>
		  )}
        <ScrollView style={styles.scrollView}>
          {renderTabContent(selectedIndex)}
        </ScrollView>
        <Button onPress={handleCloseModal} style={styles.closeButton} size='small'>
          Close
        </Button>
      </Card>
    </Modal>
  );
};

const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalCard: {
    width: 350,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldContainer1: {
    flexDirection: 'row',
	gap: 10,
    marginBottom: 16,
  },
  fieldContainerNeck: {
    marginBottom: 16,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
  },
  closeButton: {
	marginHorizontal: 100,
  },
  imageDesign: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
	marginBottom: 15,
	marginTop: -40
  },
  shareButton: {
	width: 50,
	marginTop: 10
  },
  
  designButton: {
	marginBottom: 10,
	width: 50
  },
  neckDesign: {
	marginTop: -20,
	marginBottom: -80
  },
  designFile: {
	marginLeft: 10
  }
});

export default CustomModal;
