import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Layout, List, ListItem, Modal, Card, Text, Button, Icon, useTheme, Divider } from '@ui-kitten/components';
import moment from 'moment';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../constants/supabase'
import { usePermissions } from './PermissionsContext';
import * as MediaLibrary from 'expo-media-library';
import { showSuccessMessage, showErrorMessage } from './showAlerts';

const ShareIcon = (props) => <Icon {...props} name='share-outline' />;
const DownloadIcon = (props) => <Icon {...props} name='download-outline' style={styles.downloadIcon}/>;
const ChevronDownIcon = (props) => <Icon {...props} name='chevron-down-outline' />;
const ChevronUpIcon = (props) => <Icon {...props} name='chevron-up-outline' />;
const PlusIcon = (props) => <Icon {...props} name='plus-outline' />;
const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' />;
const ShirtIcon = (props) => <Icon {...props} name='person-outline' />;
const RulerIcon = (props) => <Icon {...props} name='maximize-outline' />;
const CameraIcon = (props) => <Icon {...props} name='camera-outline' />;

const OrderItemComponent = ({ 
  item, 
  index, 
  expandedItems, 
  toggleItemExpansion,
  measurementFields,
  isBag,
  handleEdit,
  deleteAlert
}) => {
  const [dressImages, setDressImages] = useState([]);
  const [patternImages, setPatternImages] = useState([]);
  const [measImages, setMeasImages] = useState([]);
  const [fnFile, setFNFile] = useState(null);
  const [bnFile, setBNFile] = useState(null);
  const [sleeveFile, setSleeveFile] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    addons: true,
    slots: false,
    neckSleeve: false,
    measurements: false
  });
  const [downloading, setDownloading] = useState(false);
  const { cameraPermission, mediaPermission, requestCameraPermission, requestMediaPermission } = usePermissions();
  
  const theme = useTheme();
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openModal = useCallback((images) => {
    setCurrentImages(images);
    setModalVisible(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);
  
  const openFullscreen = (imageUrl) => {
    setFullscreenImage(imageUrl);
    setImgModalVisible(true);
  };

  const closeFullscreen = () => {
    setImgModalVisible(false);
    setFullscreenImage(null);
  };
  
  const getPicFolder = (type) => {
    switch(type) {
      case 'dress':
        return 'dressImages';
      case 'pattern':
        return 'patternImages';
      case 'measurements':
        return 'measurementImages';		
    }
  }
  
  const downloadPics = useCallback(async(picsDb, picsType) => {
    if (!picsDb || picsDb.length === 0) return [];
    
    try {
        const downloadPromises = picsDb.map(async (img) => {
            try {
                let folderName = getPicFolder(picsType);
                
                const { data, error } = await supabase.storage
                  .from('order-images')
                  .getPublicUrl(`${folderName}/${img}`);
                if (error) throw error;
                return data.publicUrl;
            } catch (error) {
              console.log('Error downloading image: ', error?.message || error);
              return null;
            }
        });
        
        const results = await Promise.all(downloadPromises);
        return results.filter(url => url !== null);
    } catch (error) {
        console.log('Error in downloadPics: ', error?.message || error);
        return [];
    }
}, []);

const downloadDesignPics = useCallback(async(picsDb, picsType) => {
    if (!picsDb) return null;
    console.log('in downloadDesignPics ' + picsDb)
    try {
                const { data, error } = await supabase.storage
                  .from('design-files')
                  .getPublicUrl(`${picsType}/${picsDb}`);
                if (error) throw error;
                return data.publicUrl;
        } catch (error) {
			console.log('Error downloading design image:', error?.message || error);
			return null;
		}
}, []);

	useEffect(() => {
		if (isBag) {
			setDressImages(item.dressPics);
			setPatternImages(item.patternPics);
			setMeasImages(item.measurementPics);
			return;
		}
		
		const loadImages = async () => {
			try {
				setIsLoading(true);
				console.log('in loadImages')
				console.log(item)
				const downloadTasks = [];
				
				if (item.dressPics) {
					downloadTasks.push(
						downloadPics(item.dressPics, 'dress').then(imgs => ({ type: 'dress', images: imgs }))
					);
				}
				if (item.patternPics) {
					downloadTasks.push(
						downloadPics(item.patternPics, 'pattern').then(imgs => ({ type: 'pattern', images: imgs }))
					);
				}
				if (item.measurementPics) {
					downloadTasks.push(
						downloadPics(item.measurementPics, 'measurements').then(imgs => ({ type: 'measurements', images: imgs }))
					);
				}
				
				if(item.frontNeckDesignFile) {
					downloadTasks.push(
						downloadDesignPics(item.frontNeckDesignFile, 'frontNeckDesignFile')
							  .then(img => ({ type: 'frontNeckDesignFile', images: img }))
					);
				}
				
				if(item.backNeckDesignFile) {
					downloadTasks.push(
						downloadDesignPics(item.backNeckDesignFile, 'backNeckDesignFile')
							  .then(img => ({ type: 'backNeckDesignFile', images: img }))
					);
				}
				
				if(item.sleeveDesignFile) {
					downloadTasks.push(
						downloadDesignPics(item.sleeveDesignFile, 'sleeveDesignFile')
							  .then(img => ({ type: 'sleeveDesignFile', images: img }))
					);
				}
				
				if (downloadTasks.length > 0) {
					const results = await Promise.all(downloadTasks);
					console.log(results)
					results.forEach(result => {
						switch(result.type) {
							case 'dress':
								setDressImages(result.images);
								break;
							case 'pattern':
								setPatternImages(result.images);
								break;
							case 'measurements':
								setMeasImages(result.images);
								break;
							case 'frontNeckDesignFile':
								setFNFile(result.images);
								break;
							case 'backNeckDesignFile':
								setBNFile(result.images);
								break;
							case 'sleeveDesignFile':
								setSleeveFile(result.images);
								break;
						}
					});
				}
			} catch (error) {
				console.log('Error loading images: ', error?.message || error);
			} finally {
				setIsLoading(false);
			}
		};
		
		loadImages();
	}, [isBag, item.dressPics, item.patternPics, item.measurementPics]);

  const SectionHeader = ({ title, icon: IconComponent, isExpanded, onToggle }) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={onToggle}
    >
      <View style={styles.sectionHeaderContent}>
        <IconComponent style={styles.sectionIcon} />
        <Text category='s1' style={styles.sectionTitle}>{title}</Text>
      </View>
      {isExpanded ? 
        <ChevronUpIcon style={styles.chevronIcon} /> : 
        <ChevronDownIcon style={styles.chevronIcon} />
      }
    </TouchableOpacity>
  );

  const renderExtraOptions = (extraOptions) => {
	const hasAddons = Object.keys(extraOptions || {}).length > 0;

	return (
    <View style={styles.sectionContainer}>
      <SectionHeader 
        title="Add-ons" 
        icon={PlusIcon}
        isExpanded={expandedSections.addons}
        onToggle={() => toggleSection('addons')}
      />
      {expandedSections.addons && (
        <View style={styles.sectionContent}>
          {hasAddons ? (
		  Object.entries(extraOptions).map(([option, price]) => (
            <View key={option} style={styles.addonItem}>
              <Text category='s2' style={styles.addonName}>{option}</Text>
              <Text category='s2' style={styles.addonPrice}>₹{price}</Text>
            </View>
          ))) : (
			    <View style={styles.emptyStateContainer}>
					<Text style={styles.emptyStateText}>No Add-ons Selected</Text>
				</View>
		  )}
          <View style={styles.totalSection}>
            <Text category='s1' style={styles.totalLabel}>Total Add-ons:</Text>
            <Text category='s1' style={styles.totalAmount}>
              ₹{Object.values(extraOptions).reduce((sum, price) => sum + Number(price || 0), 0)}
            </Text>
          </View>
        </View>
      )}
    </View>
  )};

  const renderSlotSummary = (slots) => {
    const data = Object.entries(slots).map(([date, { regular, express, total, expressDuration }]) => ({
      date,
      regular,
      express,
      total,
	  expressDuration: expressDuration?.label || ''
    }));
	
	const hasSlots = data.length > 0;

    return (
      <View style={styles.sectionContainer}>
        <SectionHeader 
          title="Selected Slots" 
          icon={CalendarIcon}
          isExpanded={expandedSections.slots}
          onToggle={() => toggleSection('slots')}
        />
        {expandedSections.slots && (
          <View style={styles.sectionContent}>
		    {hasSlots ? (
            <>
            <View style={styles.tableContainer}>
              {/* Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableHeaderCell}>Date</Text>
                <Text style={[styles.tableHeaderCell, styles.centerText]}>Regular</Text>
                <Text style={[styles.tableHeaderCell, styles.centerText]}>Express</Text>
				<Text style={[styles.tableHeaderCell, styles.centerText]}>Express Duration</Text>
              </View>

              {/* Data Rows */}
              {data.map((row, idx) => (
                <View key={idx} style={styles.tableDataRow}>
                  <Text style={styles.tableDataCell}>{row.date}</Text>
                  <View style={[styles.tableDataCell, styles.centerAlign]}>
                    <View style={styles.slotBadge}>
                      <Text style={styles.slotBadgeText}>{row.regular}</Text>
                    </View>
                  </View>
                  <View style={[styles.tableDataCell, styles.centerAlign]}>
                    <View style={styles.expressSlotBadge}>
                      <Text style={styles.slotBadgeText}>{row.express}</Text>
                    </View>
                  </View>
				  <View style={[styles.tableDataCell, styles.centerAlign]}>
                    <View >
                      <Text style={styles.slotBadgeText}>{row.expressDuration}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
			</>
			  ) : (
				<View style={styles.emptyStateContainer}>
				  <Text style={styles.emptyStateText}>No Slots Selected</Text>
				</View>
			  )}
          </View>
        )}
      </View>
    );
  };

  const renderDesignPictures = (designPics) => (
    <View style={styles.sectionContainer}>
      <SectionHeader 
        title="Design Pictures" 
        icon={CameraIcon}
        isExpanded={expandedSections.designPics}
        onToggle={() => toggleSection('designPics')}
      />
      {expandedSections.designPics && (
        <View style={styles.sectionContent}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {designPics && designPics.length > 0 ? (
              designPics.map((imageUrl, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.designImageContainer}
                  onPress={() => openFullscreen(imageUrl)}
                >
                  <Image 
                    source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/100' }} 
                    style={styles.designImageItem} 
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noContentPlaceholder}>
                <CameraIcon style={styles.placeholderIcon} />
                <Text category='c1' appearance='hint'>No design pictures added</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderNeckSleeveDetails = (neckAndSleeve) => (
    <View style={styles.sectionContainer}>
      <SectionHeader 
        title="Neck & Sleeve Details" 
        icon={ShirtIcon}
        isExpanded={expandedSections.neckSleeve}
        onToggle={() => toggleSection('neckSleeve')}
      />
      {expandedSections.neckSleeve && (
        <View style={styles.sectionContent}>
          {/* Front Neck */}
          <View style={styles.neckSleeveDetailItem}>
            <View style={styles.detailValueContainer}>
			  <Text category='label'>Front Neck Type</Text>
              <View style={styles.customBadge}>
                <Text category='s2'>{neckAndSleeve.frontNeckType || 'Not specified'}</Text>
              </View>
			</View>
              {fnFile && (
                <View style={styles.customImageContainer}>
                  <Image source={{ uri: fnFile }} style={styles.customImage} />
                </View>
              )}
          </View>

          {/* Back Neck */}
          <View style={styles.neckSleeveDetailItem}>
            <View style={styles.detailValueContainer}>
			  <Text category='label'>Back Neck Type</Text>
              <View style={styles.customBadge}>
                <Text category='s2'>{neckAndSleeve.backNeckType || 'Not specified'}</Text>
              </View>
			</View>
              {bnFile && (
                <View style={styles.customImageContainer}>
                  <Image source={{ uri: bnFile }} style={styles.customImage} />
                </View>
              )}
          </View>

          {/* Sleeve Type */}
          <View style={styles.neckSleeveDetailItem}>
            <View style={styles.detailValueContainer}>
			  <Text category='label'>Sleeve Type</Text>
              <View style={styles.customBadge}>
                <Text category='s2'>{neckAndSleeve.sleeveType || 'Not specified'}</Text>
              </View>
			</View>
              {sleeveFile && (
                <View style={styles.customImageContainer}>
                  <Image source={{ uri: sleeveFile }} style={styles.customImage} />
                </View>
              )}
          </View>

          {/* Sleeve Length */}
          <View style={styles.neckSleeveDetailItem}>
            <View style={styles.detailValueContainer}>
			  <Text category='label'>Sleeve Length</Text>
              <View style={styles.customBadge}>
                <Text category='s2'>{neckAndSleeve.sleeveLength || 'Not specified'}</Text>
              </View>
			</View>
          </View>
        </View>
      )}
    </View>
  );
  
  const getDisplayFields = (dressType) => {
    if (!dressType) return [];
    let dtFinal = dressType.toLowerCase(); 
    const fields = dtFinal ? measurementFields[dtFinal] || [] : [];
    return fields.sort((a, b) => a.order - b.order);
  };
  
  const shareImage = useCallback(async (remoteImageUri) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('order-images/dressImages')
        .createSignedUrl(remoteImageUri, 60);

      if (error) throw error;
      const imageUrl = data.signedUrl;
      const localUri = FileSystem.documentDirectory + 'shared-image.jpg';
      const response = await FileSystem.downloadAsync(imageUrl, localUri);
      await Sharing.shareAsync(response.uri);
    } catch (error) {
      console.error('Error sharing image: ', error);
    }
  }, []);

  const renderMeasurements = (measurements, measurementImages = [], notes = '', dressType) => {
	  const displayFields = getDisplayFields(dressType);
	  console.log('in renderMeasurements')
	  console.log(displayFields)
	  console.log(measurements)
	  let entries = Object.entries(measurements);
		let [firstKey] = entries[1] || [];

		// check only the first key
		let isCodeStyle = firstKey && (firstKey === firstKey.toUpperCase() || firstKey.includes("_"));
		console.log('isCodeStyle', isCodeStyle, firstKey);

		let measurementsFinal = Object.fromEntries(
		  isCodeStyle
			? entries // keep as is
			: entries.map(([key, value]) => [
				key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
				value
			  ])
		);
		console.log(measurementsFinal);
	  
	  // Determine if measurement dress was given (you can adjust this logic based on your data structure)
	  const measurementDressGiven = measurementImages && measurementImages.length > 0 ? 'Yes' : 'No';
	  
	  return (
		<View style={styles.sectionContainer}>
		  <SectionHeader 
			title="Measurements" 
			icon={RulerIcon}
			isExpanded={expandedSections.measurements}
			onToggle={() => toggleSection('measurements')}
		  />
		  {expandedSections.measurements && (
			<View style={styles.sectionContent1}>
			  {/* Measurement Dress Given Status */}
			  <View style={styles.measurementStatusContainer}>
				<View style={styles.measurementStatusRow}>
				  <Text category='c1' style={styles.measurementStatusLabel}>Measurement dress given:</Text>
				  <Text 
					category='s1' 
					style={[
					  styles.measurementStatusValue, 
					  measurementDressGiven === 'Yes' ? styles.statusYes : styles.statusNo
					]}
				  >
					{measurementDressGiven}
				  </Text>
				</View>
			  </View>

			  {/* Measurement Images Horizontal Scroll */}
			  {measurementImages && measurementImages.length > 0 ? (
				<View style={styles.measurementImagesContainer}>
				  <Text category='c1' style={styles.measurementImagesTitle}>Measurement Images:</Text>
				  <ScrollView 
					horizontal 
					showsHorizontalScrollIndicator={false}
					style={styles.measurementImagesScroll}
					contentContainerStyle={styles.measurementImagesScrollContent}
				  >
					{measurementImages.map((imageUri, index) => (
					  <TouchableOpacity 
						key={index} 
						style={styles.measurementImageContainer}
						onPress={() => openFullscreen(imageUri)}
					  >
						<Image 
						  source={{ uri: imageUri }} 
						  style={styles.measurementImage}
						  resizeMode="cover"
						/>
					  </TouchableOpacity>
					))}
				  </ScrollView>
				</View>
			  ) : (
                <View style={styles.noImageContainer1}>
                  <CameraIcon style={styles.noImageIcon1} />
                  <Text category='c2' style={styles.noImageText1}>No measurement images</Text>
                </View>
              )}

			  {/* Measurement Grid */}
			  <Text category='label' style={styles.measText}>Measurements:</Text>
			  <View style={styles.measurementGrid}>
				{isBag ? displayFields.map((field) => {
				  const value = measurements[field.key];
				  const displayValue = value.toString();
				  
				  return (
					<View key={field.key} style={styles.measurementGridItem}>
					  <View style={styles.measurementGridItemInner}>
						<Text category='c1' style={styles.measurementGridLabel}>{field.key}</Text>
						<Text category='s1' style={styles.measurementGridValue}>{displayValue}</Text>
					  </View>
					</View>
				  );
				}) : 
				  Object.entries(measurementsFinal).map(([key, value]) => {
					return (
					  <View key={key} style={styles.measurementGridItem}>
						<View style={styles.measurementGridItemInner}>
						  <Text category='c1' style={styles.measurementGridLabel}>{key}</Text>
						  <Text category='s1' style={styles.measurementGridValue}>{value}</Text>
						</View>
					  </View>
					);
				  }).filter(Boolean) 
				}
				{isBag && item.extraMeasurements && Object.entries(item.extraMeasurements).map(([key, value]) => (
				  <View key={key} style={styles.measurementGridItem}>
					<View style={styles.measurementGridItemInner}>
					  <Text category='c1' style={styles.measurementGridLabel}>{key}</Text>
					  <Text category='s1' style={styles.measurementGridValue}>{value}</Text>
					</View>
				  </View>
				))}
			  </View>
			</View>
		  )}
		</View>
	  );
	};
  if (isLoading) {
    return (
      <Card style={styles.itemCard}>
        <View style={styles.loadingContainer}>
          <Text category='s1'>Loading images...</Text>
        </View>
      </Card>
    );
  }
  
  const downloadImage = async(publicUrl, filename = null) => {
	try {
      setDownloading(true);
      
      // Request permissions
      if (!mediaPermission || mediaPermission === 'denied' ) {
		  requestMediaPermission();
	  }

      // Generate filename if not provided
      if (!filename) {
        const urlParts = publicUrl.split('/');
        filename = urlParts[urlParts.length - 1] || `image_${Date.now()}.jpg`;
      }

      // Ensure filename has an extension
      if (!filename.includes('.')) {
        filename += '.jpg';
      }

      // Download the image to the app's cache directory
      const downloadResult = await FileSystem.downloadAsync(
        publicUrl,
        FileSystem.cacheDirectory + filename
      );

      if (downloadResult.status === 200) {
        // Save to device's photo library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('MyApp', asset, false);
        setModalVisible(false);
        showSuccessMessage('Image saved to your photo library!');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      showErrorMessage('Failed to download image: ' + error.message);
    } finally {
      setDownloading(false);
    }
  }
  
  const EditIcon = (props) => <Icon {...props} name='edit-outline' style={styles.editIcon} fill={theme['color-primary-500']}/>;
  const DeleteIcon = (props) => <Icon {...props} name='trash-2-outline' style={styles.deleteIcon} fill={'red'}/>;
  
  const isExpanded = expandedItems.has(index);
  const extraOptionsTotal = Object.values(item.extraOptions).reduce((sum, price) => sum + Number(price || 0), 0);
  const itemTotal = Number(item.stitchingAmt || 0) + extraOptionsTotal;
  const formattedDate = moment(item.dueDate).format('DD-MM-YYYY');
  
  return (
    <View style={styles.topView}>
	  <Text category='s1' style={styles.heading}>Dress {index + 1}</Text>
      <View style={styles.orderContainer}>
        {/* Garment Info Card */}
        <TouchableOpacity 
		  style={styles.garmentCard} 
		  onPress={() => toggleItemExpansion(index)}
		  activeOpacity={0.7}
		>
		  <View>
			{/* Main Item Header */}
			<View style={styles.itemHeader}>
			  {/* Left Section - Image and Info */}
			  <View style={styles.itemLeft}>
				{/* Image Section */}
				<View style={styles.garmentImageSection}>
				  {dressImages?.length > 0 ? (
					<TouchableOpacity
					  onPress={() => openModal(dressImages)}
					  style={styles.garmentImageContainer}
					>
					  <Image
						style={styles.garmentImage}
						source={dressImages[0] ? { uri: dressImages[0] } : item.defaultSource}
					  />
					</TouchableOpacity>
				  ) : (
					<View style={styles.noImageContainer}>
					  <CameraIcon style={styles.noImageIcon} />
					  <Text category='c2' style={styles.noImageText}>No images</Text>
					</View>
				  )}
				</View>
				
				{/* Item Info */}
				<View style={styles.garmentInfoSection}>
				  <Text category='s1' style={styles.garmentTitle}>
					  {item.dressType === 'salwar' 
						? `${item.dressSubType.split('_')[0]} ${item.dressType}${item.dressSubType.split('_')[1] ? ` (${item.dressSubType.split('_')[1]} Pants)` : ''}`
						: `${item.dressSubType} ${item.dressType}`
					  }
				  </Text>
				  <Text category='c1' style={styles.itemDue}>
					Due: {formattedDate}
				  </Text>
				</View>
			  </View>
			  
			  {/* Right Section - Price and Expand Icon */}
			  <View style={styles.itemRight}>
				<View style={styles.itemPrice}>
				  <Text category='c1' style={styles.priceLabel}>Price</Text>
				  <Text category='s1' style={styles.priceValue}>Rs. {item.stitchingAmt}</Text>
				</View>
				<View style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}>
				    <ChevronDownIcon 
					  style={{width: 30, height: 30}} 
					  color="#666"
					/>
				</View>
			  </View>
			</View>
			
		  </View>
		  <Divider/>
		  {isBag && <View style={styles.expandedActions}>
					  <Button
						size='small'
						appearance='outline'
						accessoryLeft={EditIcon}
						onPress={() => handleEdit(index)}
					  >
						Edit
					  </Button>
					  <Button
						size='small'
						appearance='outline'
						status='danger'
						style={{borderColor: 'transparent'}}
						accessoryLeft={DeleteIcon}
						onPress={() => deleteAlert(index, `${item.dressSubType ?? ''} ${item.dressType}_${item.id}`, item.slotDates)}
					  >
						Delete
					  </Button>
					</View>
		  }	
		</TouchableOpacity>

        {/* Expandable Details */}
        {isExpanded && (
          <View style={styles.expandedDetails}>
            {Object.keys(item.extraOptions).length > 0 && renderExtraOptions(item.extraOptions)}
            {renderSlotSummary(item.slots)}
            {renderDesignPictures(patternImages)}
            {renderNeckSleeveDetails(item)}
            {renderMeasurements(item.measurementData, measImages, item.notes, item.dressType)}
          </View>
        )}
      </View>

      <Modal 
        style={styles.fullScreenModal} 
        visible={modalVisible} 
		backdropStyle={styles.backdrop}
        onBackdropPress={closeModal}
      >
        <Card>
          <List
            data={currentImages}
            renderItem={({ item, index }) => (
              <ListItem>
				<TouchableOpacity 
					style={styles.closeButton} 
					onPress={() => setModalVisible(false)}
				  >
					<Icon style={styles.closeIcon} name="close-outline" color={theme["color-primary-500"]}/>
				</TouchableOpacity>
                <Image source={{ uri: item }} style={styles.carouselImage} />
                {!isBag && <Button
                  style={styles.shareButton}
                  appearance="ghost"
                  accessoryLeft={DownloadIcon}
                  onPress={() => downloadImage(item)}
                />}
              </ListItem>
            )}
            horizontal
            keyExtractor={(item, index) => index.toString()}
          />
        </Card>
      </Modal>
	      <Modal
			visible={imgModalVisible}
			backdropStyle={styles.backdrop}
			onBackdropPress={closeFullscreen}
			style={styles.fullScreenModal}
		  >
			<Card>
			    <TouchableOpacity 
					style={styles.closeButton} 
					onPress={closeFullscreen}
				  >
					<Icon style={styles.closeIcon} name="close-outline" color={theme["color-primary-500"]}/>
				</TouchableOpacity>
			  {fullscreenImage && (
				<>
					<Image
					  source={{ uri: fullscreenImage }}
					  style={styles.carouselImage}
					  resizeMode="contain"
					/>
					{!isBag && <Button
					  style={styles.shareButton}
					  appearance="ghost"
					  accessoryLeft={DownloadIcon}
					  onPress={() => downloadImage(fullscreenImage)}
					/>}
				</>
			  )}
			</Card>
		  </Modal>
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Main container styles
  orderContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  // Header styles
  orderHeader: {
    backgroundColor: 'linear-gradient(90deg, #2563eb, #4338ca)', // Fallback to single color
    backgroundColor: '#2563eb',
    padding: 24,
    alignItems: 'center',
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  orderNumber: {
    color: '#bfdbfe',
    marginTop: 4,
    textAlign: 'center',
  },
  statusContainer: {
    marginTop: 12,
  },
  statusBadge: {
    backgroundColor: '#eab308',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#713f12',
    fontSize: 14,
    fontWeight: '500',
  },

  // Garment card styles
  garmentCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 12,
	marginHorizontal: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  
  garmentImageSection: {
    width: 50,
    height: 50,
  },
  
  garmentImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  
  noImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageContainer1: {
    width: 120,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignSelf: 'center',
	alignItems: 'center',
    justifyContent: 'center',
  },
  
  noImageIcon: {
    width: 16,
    height: 16,
    tintColor: '#999',
  },
  noImageIcon1: {
    width: 20,
    height: 20,
    tintColor: '#999',
  },
  
  noImageText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  noImageText1: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  
  garmentInfoSection: {
    flex: 1,
	marginLeft: 10
  },
  
  garmentTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
	textTransform: 'capitalize'
  },
  
  itemDue: {
    fontSize: 12,
    color: '#666',
  },
  
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  itemPrice: {
    alignItems: 'flex-end',
  },
  
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  
  priceValue: {
    fontWeight: '600',
    color: '#333',
  },
  
  expandIcon: {
    transform: [{ rotate: '0deg' }],
    transition: 'transform 0.2s ease',
  },
  
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  
  expandIconText: {
    fontSize: 16,
    color: '#666',
  },
  
  itemDetails: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  
  detailsContent: {
    padding: 16,
  },
  
  expandedDetailsText: {
    color: '#666',
    marginBottom: 12,
  },
  
  expandedActions: {
    flexDirection: 'row',
	justifyContent: 'flex-end',
    gap: 12,
	marginVertical: 5,
	marginRight: 20
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  editIcon: {
    width: 20,
    height: 20,
  },
  deleteIcon: {
    width: 20,
    height: 20,
  },
  // Expand button
  expandButton: {
    marginBottom: 8,
    borderTopLeftRadius: 0, // Remove top border radius to connect with card
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 0, // Remove top border to connect with card
  },

  // Expandable details
  expandedDetails: {
    backgroundColor: '#fff',
  },

  // Section styles
  sectionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 20,
    height: 20,
    tintColor: '#2563eb',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  chevronIcon: {
    width: 20,
    height: 20,
    tintColor: '#6b7280',
  },
  sectionContent: {
    padding: 16,
  },
  sectionContent1: {
    padding: 16,
  },


  // Add-ons styles
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  addonName: {
    color: '#374151',
    flex: 1,
  },
  addonPrice: {
    fontWeight: '600'
  },
  totalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold'
  },

  // Table styles
  tableContainer: {
    backgroundColor: '#fff',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  tableDataCell: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  centerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expressSlotBadge: {
    backgroundColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },

  // Design pictures styles
  horizontalScrollContent: {
    paddingRight: 16,
	flexGrow: 1
  },
  designImageContainer: {
    width: 96,
    height: 96,
    marginRight: 12,
  },
  designImageItem: {
    width: 96,
    height: 96,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  noContentPlaceholder: {
	alignItems: 'center',
    justifyContent: 'center',
	width: '100%'            
  },
  placeholderIcon: {
    width: 24,
    height: 24,
    tintColor: '#9ca3af',
    marginBottom: 8,
  },

  // Neck & Sleeve Details styles
  neckSleeveDetailItem: {
    marginBottom: 16,
  },
  detailValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
	alignItems: 'center'
  },
  customBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  customBadgeText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '500',
  },
  standardBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  standardBadgeText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
  },
  sleeveBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  sleeveBadgeText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '500',
  },
  lengthBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lengthBadgeText: {
    color: '#4338ca',
    fontSize: 14,
    fontWeight: '500',
  },
  customImageContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    resizeMode: 'cover',
  },

  // Measurements styles
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  measurementGridItem: {
    width: '50%',
    padding: 6,
  },
  measurementGridItemInner: {
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  measurementGridLabel: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
  measurementGridValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },

  // Loading styles
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    margin: 16,
  },

  // Modal styles
  fullScreenModal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  carouselImage: {
    width: 300,
    height: screenHeight * 0.9,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  shareButton: {
    position: 'absolute',
	top: 0,
	right: 45,
	backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  downloadIcon: {
	  width: 20,
	  height: 20
  },
  measurementStatusContainer: {
    marginBottom: 16,
  },
  measurementStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  measurementStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  measurementStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusYes: {
    color: '#28a745', // Green for Yes
  },
  statusNo: {
    color: '#dc3545', // Red for No
  },

  // Measurement images styles
  measurementImagesContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  measurementImagesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  measurementImagesScroll: {
    flexGrow: 0,
  },
  measurementImagesScrollContent: {
    paddingRight: 16,
  },
  measurementImageContainer: {
    marginRight: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    backgroundColor: '#fff',
  },
  measurementImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 25,
  },
  closeIcon: {
	width: 20,
	height: 20
  },
  fullscreenImage: {
    width: 300,
    height: 300,
  },
  emptyStateContainer: {
	  alignItems: 'center',
	},

	emptyStateText: {
	  fontSize: 14,
	  color: '#999',
	  fontStyle: 'italic',
	},
	measText: {marginBottom: 5, marginTop: 10},
	heading: {marginBottom: 10, fontWeight: 'bold'},
	topView: {marginTop: 5}
});

export default OrderItemComponent;