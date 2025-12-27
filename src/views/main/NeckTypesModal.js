import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Card, Modal, Button } from '@ui-kitten/components';
import VNeck from '../../components/necktypes/VNeckComponent.js';
import RoundNeck from '../../components/necktypes/RoundNeckComponent.js';
import SquareNeck from '../../components/necktypes/SquareNeckComponent.js';
import PentagonNeck from '../../components/necktypes/PentagonNeckComponent.js';
import SweetheartNeck from '../../components/necktypes/SweetheartNeckComponent.js';
import CollarNeck from '../../components/necktypes/CollarNeckComponent.js';
import RoundWithVCutNeck from '../../components/necktypes/RoundWithVCutNeckComponent.js';
import TeardropNeck from '../../components/necktypes/TeardropNeckComponent.js';
import QueenNeck from '../../components/necktypes/QueenNeckComponent.js';
import Boatneck from '../../components/necktypes/BoatneckComponent.js';
import KeyholeNeck from '../../components/necktypes/KeyholeNeckComponent.js';
import PlusIcon from '../extra/icons';
import { useNavigation } from "@react-navigation/native";

const NeckTypesModal = ({ visible, onClose, fieldName, updateSelectedItemDesign, setShowDesign, prevScreen, editRouteParams = null, setInCustom = () => {}, saveAllLocalStates = () => {} }) => {
  const neckTypes = [
    { id: '1', name: 'VNeck', Component: VNeck },
    { id: '2', name: 'Round', Component: RoundNeck },
    { id: '3', name: 'Square', Component: SquareNeck },
	{ id: '4', name: 'Boat', Component: Boatneck },
	{ id: '5', name: 'Sweetheart', Component: SweetheartNeck },
	{ id: '6', name: 'Queen', Component: QueenNeck },
	{ id: '7', name: 'Pentagon', Component: PentagonNeck },
	{ id: '8', name: 'Keyhole', Component: KeyholeNeck },
	{ id: '9', name: 'Teardrop', Component: TeardropNeck },
	{ id: '10', name: 'Collar', Component: CollarNeck },
	{ id: '11', name: 'RoundWithVCut', Component: RoundWithVCutNeck }
  ];
  const navigation = useNavigation();
  
  const getDesignFileName = () => {
	  switch(fieldName) {
			  case 'frontNeckType':
				return 'frontNeckDesignFile';
			  case 'backNeckType':
				return 'backNeckDesignFile';
			  default:
				return 'designFile';
	  }
  }
  
  const checkSubscription = () => {
		setInCustom(true);
		onClose();
		if(setShowDesign) {
			setShowDesign(false);
		}
		saveAllLocalStates();
		navigation.navigate('CustomDesign', {
			field: fieldName,
			returnFile: (selectedFile) => {
				updateSelectedItemDesign(getDesignFileName(), selectedFile);
				updateSelectedItemDesign(fieldName, 'Custom'); 
				if(setShowDesign) {
					setShowDesign(true);
				}
			},
			prevScreen: prevScreen,
			editRouteParams: editRouteParams
		});
  };

  return (
    <Modal style={styles.fullScreenModal} backdropStyle={styles.backdrop} visible={visible} onBackdropPress={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select a Neck Type</Text>
          
            <View style={styles.neckTypesContainer} >
              {neckTypes.map(({ id, name, Component }) => (
                <Card key={id} style={styles.neckTypeItem} onPress={() => {updateSelectedItemDesign(fieldName, name); onClose();}}>
                  <Component width={itemWidth} height={150} style={{marginTop: -55}}/>
                  <Text style={styles.neckName}>{name}</Text>
                </Card>
              ))}
			  <Button style={styles.uploadButton} status='control' onPress={checkSubscription}>
				  Draw design
			  </Button>
            </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const itemWidth = width / 3;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  neckTypesContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
	gap: 10,
	flexWrap: 'wrap',
  },
  neckTypeItem: {
    width: itemWidth,
    marginHorizontal: 8,
    alignItems: 'center',
	height: 80,
	marginBottom: 10
  },
  neckName: {
    fontSize: 16,
    textAlign: 'center',
	marginTop: -65
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
    minWidth: 100,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fullScreenModal: {
	justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: itemWidth,
    height: 80,
    marginLeft: 5,
	backgroundColor: '#F7F9FC',
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    width: 32,
    height: 32,
    marginBottom: 4,
	marginLeft: 15
  },
  uploadButtonText: {
    textAlign: 'center',
	fontSize: 12
  },
});

export default NeckTypesModal;
