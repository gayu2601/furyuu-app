import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
  FlatList,
  Alert
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from "@react-navigation/native";
import { showSuccessMessage, showErrorMessage } from './showAlerts';
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';
import moment from 'moment';
import {
  TopNavigationAction
} from '@ui-kitten/components';
import { ArrowIosBackIcon } from "../extra/icons";
import eventEmitter from './eventEmitter';

const ProductionDetailsViewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { order } = route.params || {};

  const [selectedDressIndex, setSelectedDressIndex] = useState(0);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [tempStageStates, setTempStageStates] = useState({});

  const [allData, setAllData] = useState({
    dressId: {
		dressType: '',
		dressSubType: '',
		cuttingWorker: '',
		cuttingDate: null,
		stitchingWorker: '',
		stitchingDate: null,
		finishingWorker: '',
		finishingDate: null,
		checkingWorker: '',
		checkingDate: null,
		checkingPic: [],
		cuttingDone: false,
		stitchingDone: false,
		finishingDone: false,
		checkingDone: false
	}
  });

  useEffect(() => {
	  const loadValues = async () => {
		try {
		  const { data, error } = await supabase
			.from("ProdDetails")
			.select(
			  `dressItemNo, dressType, dressSubType, cuttingWorker, cuttingDate, stitchingWorker, stitchingDate, finishingWorker, finishingDate, checkingWorker, checkingDate, checkingPic, cuttingDone, stitchingDone, finishingDone, checkingDone`
			)
			.eq("orderNo", order.orderNo);

		  if (error) {
			throw error;
		  }
		  console.log("raw supabase data:", data);

		  const dataMap = new Map(data?.map((item) => [item.dressItemNo, item]) || []);
		  const currentDate = new Date();
		  console.log('dataMap', dataMap);

		  const mappedEntries = await Promise.all(
			order.dressItemId.map(async (id, idx) => {
			  const existing = dataMap?.get(id);
			  const dressType = existing?.dressType || order.dressType[idx] || "";
			  const dressSubType = existing?.dressSubType || order.dressSubType[idx] || "";

			  let checkingPicUrls = [];
			  if (existing?.checkingPic && Array.isArray(existing.checkingPic)) {
				checkingPicUrls = existing.checkingPic.map((imageUri) => {
				  const { data: urlData } = supabase.storage
					.from("order-images/prodDetails")
					.getPublicUrl(imageUri);
				  return urlData?.publicUrl || null;
				});
			  }
			  console.log('existing', existing);
			  
			  const cached = storage.getString('Employees');
			  const employeeCache = cached ? JSON.parse(cached) : {};
			  console.log('employeeCache', employeeCache);

			  return [
				id,
				{
				  dressType,
				  dressSubType,
				  cuttingWorker: employeeCache?.[existing?.cuttingWorker] || "",
				  cuttingDate: existing?.cuttingDate
					? new Date(existing.cuttingDate)
					: null,
				  stitchingWorker: employeeCache?.[existing?.stitchingWorker] || "",
				  stitchingDate: existing?.stitchingDate
					? new Date(existing.stitchingDate)
					: null,
				  finishingWorker: employeeCache?.[existing?.finishingWorker] || "",
				  finishingDate: existing?.finishingDate
					? new Date(existing.finishingDate)
					: null,
				  checkingWorker: employeeCache?.[existing?.checkingWorker] || "",
				  checkingDate: existing?.checkingDate
					? new Date(existing.checkingDate)
					: null,
				  checkingPic: checkingPicUrls.filter(Boolean),
				  cuttingDone: existing?.cuttingDone,
				  stitchingDone: existing?.stitchingDone,
				  finishingDone: existing?.finishingDone,
				  checkingDone: existing?.checkingDone
				},
			  ];
			})
		  );

		  const mapped = Object.fromEntries(mappedEntries);

		  console.log("mapped:", mapped);
		  setAllData(mapped);
		} catch (error) {
		  console.log(error);
		  showErrorMessage("Error loading production details");
		}
	  };
	  loadValues();
	}, []);
  
  const dressType = order?.dressType || [];
  const dressSubType = order?.dressSubType || [];

  const dressTypes = dressSubType.length > 0 
	  ? dressType.map((type, i) => `${dressSubType[i]} ${type}`)
	  : dressType;

  const dressIds = order?.dressItemId;
  const selectedDressId = dressIds[selectedDressIndex];
  console.log('selectedDressId' , selectedDressId);
  console.log('allData', allData)
  let currentData = allData[selectedDressId] || {};

	const handleEditComplete = useCallback((updatedData) => {
		console.log('updatedData ', updatedData, selectedDressIndex)
		let finalData = updatedData.reduce((acc, row) => {
			const { dressItemNo, ...restData } = row;
			acc[dressItemNo] = restData;
			return acc;
		  }, {});
		console.log('finalData', finalData)
	  setAllData(finalData);
	}, []);

  const handleMarkStageCompletion = () => {
    setEditMode(true);
    // Initialize temp states with current values
    const tempStates = {};
    dressIds.forEach(id => {
      const data = allData[id] || {};
      tempStates[id] = {
        cuttingDone: data.cuttingDone || false,
        stitchingDone: data.stitchingDone || false,
        finishingDone: data.finishingDone || false,
        checkingDone: data.checkingDone || false,
		dressType: data.dressType,
		dressSubType: data.dressSubType
      };
    });
    setTempStageStates(tempStates);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setTempStageStates({});
  };

  const handleStageToggle = (stage) => {
    const updatedStates = { ...tempStageStates };
    if (!updatedStates[selectedDressId]) {
      updatedStates[selectedDressId] = {};
    }
    updatedStates[selectedDressId][stage] = !updatedStates[selectedDressId][stage];
    setTempStageStates(updatedStates);
  };

  const handleSave = async () => {
    try {
      const updates = [];
      
      // Prepare updates for all modified items
      Object.keys(tempStageStates).forEach(dressId => {
        const stages = tempStageStates[dressId];
        const originalData = allData[dressId] || {};
        
        // Check if any stage changed
        const hasChanges = Object.keys(stages).some(stage => 
          stages[stage] !== originalData[stage]
        );
        
        if (hasChanges) {
          updates.push({
            dressItemNo: dressId,
            ...stages
          });
        }
      });

      if (updates.length === 0) {
        showErrorMessage("No changes to save");
        return;
      }
	  console.log('updates', updates);

      // Update database
      for (const update of updates) {
        const { error } = await supabase
			.from('ProdDetails')
			.upsert({
			  orderNo: order.orderNo,
			  dressItemNo: update.dressItemNo,
			  cuttingDone: update.cuttingDone,
			  stitchingDone: update.stitchingDone,
			  finishingDone: update.finishingDone,
			  checkingDone: update.checkingDone,
			  dressType: update.dressType,
			  dressSubType: update.dressSubType
			}, {
			  onConflict: 'dressItemNo'
			});

        if (error) {
          console.error(error);
		  showErrorMessage('Error saving prod details info!');
        }
      }

      // Update local state
      const updatedAllData = { ...allData };
      Object.keys(tempStageStates).forEach(dressId => {
        if (updatedAllData[dressId]) {
          updatedAllData[dressId] = {
            ...updatedAllData[dressId],
            ...tempStageStates[dressId]
          };
        }
      });
      
      setAllData(updatedAllData);
      
      // Check if checking stage was completed for current item
      const currentItemStages = tempStageStates[selectedDressId];
	  if (currentItemStages?.checkingDone && !currentData.checkingDone) {
		markCheckingDone(selectedDressId);
      } else if(!currentItemStages?.checkingDone && currentData.checkingDone) {
		unmarkCheckingDone(selectedDressId);
	  }
      
      setEditMode(false);
      setTempStageStates({});
      showSuccessMessage("Stage completion updated successfully");
      
    } catch (error) {
      console.error('Error updating stage completion:', error);
      showErrorMessage("Error updating stage completion");
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return moment(date).format('YYYY-MM-DD');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#00E096';
      case 'Pending': return '#8F9BB3';
      default: return '#8F9BB3';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Completed': return '#E8F5E8';
      case 'Pending': return '#F7F9FC';
      default: return '#F7F9FC';
    }
  };

  const CheckboxComponent = ({ checked, onToggle, label }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkedBox]}>
        {checked && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const SectionCard = ({ title, iconName, iconType = 'MaterialIcons', iconColor, data, statusText, stage }) => {
    const isCurrentItemInEditMode = editMode && tempStageStates[selectedDressId];
    const stageCompleted = isCurrentItemInEditMode 
      ? tempStageStates[selectedDressId]?.[stage] 
      : data.statusText === 'Completed';

    return (
      <View style={styles.card}>
        <View style={styles.sectionHeader1}>
          <View style={styles.innerHeader}>
            {iconType === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={iconName} size={24} color={iconColor} style={styles.sectionIcon} />
            ) : (
              <MaterialIcons name={iconName} size={24} color={iconColor} style={styles.sectionIcon} />
            )}
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          
          {isCurrentItemInEditMode ? (
            <CheckboxComponent
              checked={stageCompleted}
              onToggle={() => handleStageToggle(stage)}
              label="Completed"
            />
          ) : (
		    <View
			  style={{
				backgroundColor: data.statusText === "Completed" ? "#FF9800" : "#dc3545",
				borderRadius: 20,
				paddingHorizontal: 12,
				paddingVertical: 4,
			  }}
			>
				<Text style={styles.statusText1}>{data.statusText}</Text>
			</View>
          )}
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Worker:</Text>
          <Text style={styles.value}>{data.worker || 'Not assigned'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={16} color="#8F9BB3" style={styles.calendarIcon} />
          <Text style={styles.value}>{formatDate(data.date)}</Text>
        </View>
      </View>
    );
  };
  
  const markCheckingDone = (dressNo) => {
		console.log('in markCheckingDone ', order.dressItemId.indexOf(Number(dressNo)));
		eventEmitter.emit('productionStageUpdated', {
			orderNo: order.orderNo,
			index: order.dressItemId.indexOf(Number(dressNo)),
			shouldMark: true
		  });
	}
	
	const unmarkCheckingDone = (dressNo) => {
		console.log('in markCheckingDone ', order.dressItemId.indexOf(Number(dressNo)));
		eventEmitter.emit('productionStageUpdated', {
			orderNo: order.orderNo,
			index: order.dressItemId.indexOf(Number(dressNo)),
			shouldMark: false
		  });
	}

  const openImageModal = (index = 0) => {
    setSelectedImageIndex(index);
    setImgModalVisible(true);
  };

  const onImageScroll = (event) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const currentIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    setSelectedImageIndex(currentIndex);
  };

  const scrollToImage = (index) => {
    if (imageScrollRef.current) {
      imageScrollRef.current.scrollToIndex({ index, animated: true });
    }
  };

  const imageScrollRef = React.useRef(null);

  const ItemTab = ({ item, index, isSelected, onPress }) => {
	return (
    <TouchableOpacity
      style={[styles.itemTab, isSelected && styles.selectedItemTab]}
      onPress={() => onPress(index)}
      disabled={editMode}
    >
	  {item.checkingDone && (
        <View style={styles.tickContainer}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
        </View>
      )}
      <Text style={[
        styles.itemTabText,
        isSelected && styles.selectedItemTabText
      ]}>
        {item.dressSubType} {item.dressType}
      </Text>
    </TouchableOpacity>
  )};

  const renderImageItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: item }} 
        style={styles.carouselImage}
        resizeMode="contain"
      />
    </View>
  );
  console.log('currentData', currentData)
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Details Section */}
        <View style={styles.card}>
          <View style={styles.orderHeaderSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#3366FF" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Order Details</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Order ID</Text>
              <Text style={styles.value1}>{`ORD_${order.orderNo}`}</Text>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Customer Name</Text>
              <Text style={styles.value1}>{order.custName}</Text>
            </View>
          </View>

          {/* Item Selector */}
          <Text style={styles.label}>Select Item to View</Text>
          <View style={styles.itemSelector}>
            {dressIds.map((id, index) => (
              <ItemTab
                key={id}
                item={allData[id] || { dressSubType: '', dressType: `Item ${index + 1}` }}
                index={index}
                isSelected={selectedDressIndex === index}
                onPress={setSelectedDressIndex}
              />
            ))}
          </View>
        </View>
		
		<View style={styles.buttonRow}>
			{!editMode && (
              <TouchableOpacity 
                style={styles.markCompletionButton}
                onPress={handleMarkStageCompletion}
              >
                <Text style={styles.markCompletionButtonText}>Mark Stage Completion</Text>
              </TouchableOpacity>
			)}
			  <TouchableOpacity 
                style={styles.markCompletionButton}
                onPress={() => navigation.navigate('ProductionDetails', { ...route.params, onEditComplete: handleEditComplete })}
              >
                <Text style={styles.markCompletionButtonText}>Edit Details</Text>
              </TouchableOpacity>
		</View>

        {/* Production Stages */}
        <SectionCard
          title="Cutting"
          iconName="content-cut"
          iconColor="#FF9500"
          stage="cuttingDone"
          data={{
            worker: currentData.cuttingWorker,
            date: currentData.cuttingDate,
            statusText: currentData.cuttingDone ? 'Completed' : 'Pending'
          }}
        />

        <SectionCard
          title="Stitching"
          iconName="flash-on"
          iconColor="#8F00FF"
          stage="stitchingDone"
          data={{
            worker: currentData.stitchingWorker,
            date: currentData.stitchingDate,
            statusText: currentData.stitchingDone ? 'Completed' : 'Pending'
          }}
        />

        <SectionCard
          title="Finishing"
          iconName="check-circle"
          iconColor="#00E096"
          stage="finishingDone"
          data={{
            worker: currentData.finishingWorker,
            date: currentData.finishingDate,
            statusText: currentData.finishingDone ? 'Completed' : 'Pending'
          }}
        />

        {/* Quality Checking Section with Images */}
        <View style={styles.card}>
          <View style={styles.sectionHeader1}>
		    <View style={styles.innerHeader}>
				<MaterialIcons name="visibility" size={24} color="#3366FF" style={styles.sectionIcon} />
				<Text style={styles.sectionTitle}>Quality Checking</Text>
			</View>
			
			{editMode && tempStageStates[selectedDressId] ? (
              <CheckboxComponent
                checked={tempStageStates[selectedDressId]?.checkingDone}
                onToggle={() => handleStageToggle('checkingDone')}
                label="Completed"
              />
            ) : (
			<View
			  style={{
				backgroundColor: currentData.checkingDone ? "#FF9800" : "#dc3545",
				borderRadius: 20,
				paddingHorizontal: 12,
				paddingVertical: 4,
			  }}
			>
              <Text style={styles.statusText1}>{currentData.checkingDone ? 'Completed' : 'Pending'}</Text>
			</View>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Worker:</Text>
            <Text style={styles.value}>{currentData.checkingWorker || 'Not assigned'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color="#8F9BB3" style={styles.calendarIcon} />
            <Text style={styles.value}>{formatDate(currentData.checkingDate)}</Text>
          </View>

          {/* Images Section */}
          <View style={styles.imagesSection}>
            <Text style={styles.label}>Quality Check Images</Text>
            {currentData.checkingPic && currentData.checkingPic.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                {currentData.checkingPic.map((imageUri, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => openImageModal(index)}
                    style={styles.thumbnailContainer}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noImagesContainer}>
                <MaterialIcons name="image" size={32} color="#8F9BB3" />
                <Text style={styles.noImagesText}>No images uploaded</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Save/Cancel Buttons */}
      {editMode && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelEdit}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
          >
            <MaterialIcons name="save" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Image Modal */}
      <Modal
        visible={imgModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImgModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Header with close button */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Image {selectedImageIndex + 1} of {currentData.checkingPic?.length || 0}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setImgModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#2E3A59" />
              </TouchableOpacity>
            </View>

            {/* Image Carousel */}
            <FlatList
              ref={imageScrollRef}
              data={currentData.checkingPic || []}
              renderItem={renderImageItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onImageScroll}
              initialScrollIndex={selectedImageIndex}
              getItemLayout={(data, index) => ({
                length: screenWidth * 0.95,
                offset: screenWidth * 0.95 * index,
                index,
              })}
            />

            {/* Image indicators */}
            {currentData.checkingPic && currentData.checkingPic.length > 1 && (
              <View style={styles.indicators}>
                {currentData.checkingPic.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.indicator,
                      selectedImageIndex === index && styles.activeIndicator
                    ]}
                    onPress={() => scrollToImage(index)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
	gap: -150,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader1: {
    flexDirection: 'row',
    alignItems: 'center',
	gap: -100,
	marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    flex: 1,
  },
  markCompletionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  markCompletionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#3366FF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  checkedBox: {
    backgroundColor: '#3366FF',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#2E3A59',
    fontWeight: '500',
  },
  statusText1: {
    fontSize: 14,
	color: "white", 
	fontWeight: "bold"
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  halfWidth: {
    flex: 0.48,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8F9BB3',
    marginBottom: 4,
  },
  value: {
    color: '#2E3A59',
    fontWeight: '500',
	marginTop: -3,
	marginLeft: 5
  },
  value1: {
    color: '#2E3A59',
    fontWeight: '500'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarIcon: {
    marginRight: 8,
  },
  itemSelector: {
    marginTop: 8,
    marginBottom: -5,
	flexDirection: 'row',
	flexWrap: 'wrap',
  },
  itemTab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E4E9F2',
	marginBottom: 10
  },
  selectedItemTab: {
    backgroundColor: '#3366FF',
    borderColor: '#3366FF',
  },
  itemTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8F9BB3',
  },
  selectedItemTabText: {
    color: '#FFFFFF',
  },
  imagesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
  },
  imageScroll: {
    marginTop: 8,
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F7F9FC',
  },
  noImagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    marginTop: 8,
  },
  noImagesText: {
    fontSize: 14,
    color: '#8F9BB3',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8F9BB3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#8F9BB3',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3366FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: screenWidth * 0.95,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
  },
  closeButton: {
    padding: 8,
  },
  imageContainer: {
    width: screenWidth * 0.95,
    height: 400,
    backgroundColor: '#000',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4E9F2',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#3366FF',
  },
  navButton: {
	  marginLeft: 20
  },
  innerHeader: { flexDirection: 'row', alignItems: 'center' },
  buttonRow: {
	flexDirection: 'row', alignItems: 'center', gap: 30, marginBottom: 15
  },
  tickContainer: {
	  position: "absolute",
	  top: -6,
	  right: -6,
	  backgroundColor: "white",
	  borderRadius: 10,
	}
});

export default ProductionDetailsViewScreen;