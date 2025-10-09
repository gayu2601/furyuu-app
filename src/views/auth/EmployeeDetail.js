import React, {useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Image,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Modal
} from 'react-native';
import {
  Layout,
  Text,
  Card,
  TopNavigation,
  TopNavigationAction,
  Icon,
  Divider
} from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../constants/supabase';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import eventEmitter from '../main/eventEmitter';

const EmployeeDetail = () => {
  // Icons
  const PersonIcon = (props) => <Icon {...props} name='person-outline' />;
  const PhoneIcon = (props) => <Icon {...props} name='phone-outline' />;
  const CalendarIcon = (props) => <Icon {...props} name='calendar-outline' />;
  const ShieldIcon = (props) => <Icon {...props} name='shield-outline' />;
  const AlertIcon = (props) => <Icon {...props} name='alert-triangle-outline' />;
  const DollarIcon = (props) => <Icon {...props} name='credit-card-outline' />;
  const ArrowBackIcon = (props) => <Icon {...props} name='arrow-back' />;
  const navigation = useNavigation();
  const route = useRoute();
  const { employeeParam } = route.params;
  const [employee, setEmployee] = useState(employeeParam);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imgModalVisible, setImgModalVisible] = useState(false);
  console.log('employee', employee);
  const [dataUpdated, setDataUpdated] = useState(false);
  const [idImgs, setIdImgs] = useState([]);
  const imageScrollRef = React.useRef(null);
  
  useEffect(() => {
	  const downloadPics = async(picsDb) => {
		try {
			const downloadPromises = picsDb.map(async (img) => {
				try {
					const { data, error } = await supabase.storage
					  .from('employee-ids')
					  .getPublicUrl(img);
					if (error) throw error;
					return data.publicUrl;
				} catch (error) {
				  console.log('Error downloading image: ', error?.message || error);
				  return null;
				}
			});
			
			const results = await Promise.all(downloadPromises);
			console.log('results', results);
			setIdImgs(results);
		} catch (error) {
			console.log('Error in downloadPics: ', error?.message || error);
			return [];
		}
	  }
		if(employee.idProofPic?.length > 0 && !dataUpdated) {
			console.log('calling downloadPics')
			downloadPics(employee.idProofPic);
		} 
		console.log('idImgs', idImgs)
	},[employee.phoneNo, dataUpdated]);
	
	useEffect(() => {
		navigation.setOptions({
		  headerRight: () => (
			<MaterialCommunityIcons
						  name={"pencil"}
						  size={25}
						  style={{ marginRight: 20, marginLeft: -10 }}
						  onPress={() => navigation.navigate('EmployeeOnboardingForm', { ...route.params, idImgs, onEditComplete: handleEditComplete })}/>
		  ),
		});
	}, [navigation, idImgs]);
	
	const handleEditComplete = useCallback((updatedData) => {
		console.log('updatedData ', updatedData)
	  setEmployee(updatedData);
	  setIdImgs(updatedData.idProofPic);
	  setDataUpdated(true);
	  eventEmitter.emit('transactionAdded', { onlyEmployeeData: true });
	}, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSalary = (salary, type) => {
    return `$${salary?.toLocaleString()}/${type}`;
  };
  
  const renderImageItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: item }} 
        style={styles.carouselImage}
        resizeMode="contain"
      />
    </View>
  );
  
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Layout style={styles.detailContainer}>
          
          {/* Personal Information Card */}
          <Card style={styles.card} status='primary'>
            <View style={styles.cardHeader}>
              <PersonIcon style={[styles.cardIcon, styles.primaryIcon]} />
              <Text category='h6' style={styles.cardTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{employee.name}</Text>
              </View>
              <Divider style={styles.rowDivider} />
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>{employee.phoneNo}</Text>
              </View>
              <Divider style={styles.rowDivider} />
			  
			  <View style={styles.infoRow}>
                <Text style={styles.label}>Designation</Text>
                <Text style={styles.value}>{employee.designation}</Text>
              </View>
              <Divider style={styles.rowDivider} />
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Date of Birth</Text>
                <Text style={styles.value}>{formatDate(employee.dob)}</Text>
              </View>
              <Divider style={styles.rowDivider} />
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Anniversary</Text>
                <Text style={styles.value}>{formatDate(employee.anniversary)}</Text>
              </View>
            </View>
          </Card>

          {/* ID Proof Card */}
          <Card style={styles.card} status='success'>
            <View style={styles.cardHeader}>
              <ShieldIcon style={[styles.cardIcon, styles.successIcon]} />
              <Text category='h6' style={styles.cardTitle}>ID Proof</Text>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Type</Text>
                <Text style={styles.value}>{employee.idProofType}</Text>
              </View>
              <Divider style={styles.rowDivider} />
              
              <View style={styles.imageSection}>
                <Text style={styles.label}>Document</Text>
                  {idImgs?.length > 0 ? (
					  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
						{idImgs.map((imageUri, index) => {
							console.log('imageUri', imageUri);
							return (
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
						)})}
					  </ScrollView>
					) : (
					  <View style={styles.noImagesContainer}>
						<MaterialIcons name="image" size={32} color="#8F9BB3" />
						<Text style={styles.noImagesText}>No images uploaded</Text>
					  </View>
					)}
              </View>
            </View>
          </Card>

          {/* Emergency Contacts Card */}
          <Card style={styles.card} status='danger'>
            <View style={styles.cardHeader}>
              <AlertIcon style={[styles.cardIcon, styles.dangerIcon]} />
              <Text category='h6' style={styles.cardTitle}>Emergency Contacts</Text>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.emergencyContact}>
                <View style={styles.emergencyHeader}>
                  <Text style={styles.emergencyTitle}>Contact 1</Text>
                  <View style={styles.relationBadge}>
                    <Text style={styles.emergencyRelation}>{employee.emergencyRelation1}</Text>
                  </View>
                </View>
                <Text style={styles.emergencyPhone}>{employee.emergencyPhNo1}</Text>
              </View>
              
              <Divider style={styles.rowDivider} />
              
              <View style={styles.emergencyContact}>
                <View style={styles.emergencyHeader}>
                  <Text style={styles.emergencyTitle}>Contact 2</Text>
                  <View style={styles.relationBadge}>
                    <Text style={styles.emergencyRelation}>{employee.emergencyRelation2}</Text>
                  </View>
                </View>
                <Text style={styles.emergencyPhone}>{employee.emergencyPhNo2}</Text>
              </View>
            </View>
          </Card>

          {/* Salary Information Card */}
          <Card style={styles.card} status='warning'>
            <View style={styles.cardHeader}>
              <DollarIcon style={[styles.cardIcon, styles.warningIcon]} />
              <Text category='h6' style={styles.cardTitle}>Salary Information</Text>
            </View>
            
            <View style={styles.salarySection}>
              <View style={styles.salaryContainer}>
                <Text style={styles.salaryAmount}>
                  ₹{employee.salary?.toLocaleString()}
                </Text>
                <Text style={styles.salaryType}>{employee.salaryType}</Text>
              </View>
            </View>
          </Card>
          
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
					Image {selectedImageIndex + 1} of {idImgs.length || 0}
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
				  data={idImgs || []}
				  renderItem={renderImageItem}
				  keyExtractor={(item, index) => index.toString()}
				  horizontal
				  pagingEnabled
				  showsHorizontalScrollIndicator={false}
				  onMomentumScrollEnd={onImageScroll}
				  initialScrollIndex={selectedImageIndex}
				  getItemLayout={(data, index) => ({
					length: 300,
					offset: 300 * index,
					index,
				  })}
				/>

				{/* Image indicators */}
				{idImgs && idImgs.length > 1 && (
				  <View style={styles.indicators}>
					{idImgs.map((_, index) => (
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
		  
        </Layout>
      </ScrollView>
    </SafeAreaView>
  );
};

const { screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNavigation: {
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
  },
  subtitle: {
    fontSize: 14,
    color: '#8F9BB3',
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  detailContainer: {
    padding: 16,
    backgroundColor: '#F7F9FC',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  cardIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  primaryIcon: {
    tintColor: '#3366FF',
  },
  successIcon: {
    tintColor: '#00E096',
  },
  dangerIcon: {
    tintColor: '#FF3D71',
  },
  warningIcon: {
    tintColor: '#FFAA00',
  },
  cardTitle: {
    color: '#222B45',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8F9BB3',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222B45',
    flex: 2,
    textAlign: 'right',
  },
  rowDivider: {
    marginVertical: 4,
    backgroundColor: '#EDF1F7',
  },
  imageSection: {
    paddingVertical: 12,
  },
  idProofImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#EDF1F7',
  },
  emergencyContact: {
    paddingVertical: 12,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3D71',
  },
  relationBadge: {
    backgroundColor: '#FFE4E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyRelation: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF3D71',
  },
  emergencyPhone: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222B45',
  },
  salarySection: {
    marginTop: 8,
  },
  salaryContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    marginTop: 8,
  },
  salaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFAA00',
    marginBottom: 6,
  },
  salaryType: {
    fontSize: 16,
    color: '#FFAA00',
    fontWeight: '500',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: 300,
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
    width: 300,
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
});

export default EmployeeDetail;