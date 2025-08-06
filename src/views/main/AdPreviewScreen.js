import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Alert, View, Image, StyleSheet, FlatList, ScrollView, StatusBar, SafeAreaView, TouchableOpacity, Dimensions, LayoutAnimation, ImageBackground } from 'react-native';
import { ApplicationProvider, Layout, Input, Avatar, Text, Icon, Button, Autocomplete, AutocompleteItem, OverflowMenu, MenuItem, useTheme, Divider, List, ListItem, Modal } from '@ui-kitten/components';
import MasonryList from 'react-native-masonry-list';
import { useRoute } from "@react-navigation/native";
import NotificationsButton from "../extra/NotificationsButton";
import Feather from "react-native-vector-icons/Feather";
import { AntDesign } from '@expo/vector-icons';
import AdCarousel from './AdCarousel';
import * as ImageManipulator from 'expo-image-manipulator';

const AdPreviewScreen = ({ adImgs }) => {
	const theme = useTheme();
	const [resizedUri, setResizedUri] = useState(adImgs);
	
	useEffect(() => {
		const resizeAdImg = async() => {
			const manipResult = await ImageManipulator.manipulateAsync(
				  adImgs,
				  [{ resize: { width: 1080, height: 600 } }],
				  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
				);
			setResizedUri(manipResult.uri);
		}
		resizeAdImg();
	}, [adImgs]);

	const renderIcon = (props) => (
		<Icon {...props} name='search'/>
	);
	
	const MoreIcon = (props) => (
		  <AntDesign {...props} name='filter' size={24} style={{marginRight: 5, marginLeft: 10}} color={theme['color-primary-500']}/>
	);
	
	const womenDress = [
		{ title: 'Party Dresses', value: 'partywear', source: require('../../../assets/women/partywear.jpg'), width: 1080, height: 1920 },
		{ title: 'Tops', value: 'tops', source: require('../../../assets/women/shirt.jpg'), width: 1080, height: 1920 },
		{ title: 'Chudithar', value: 'chudithar', source: require('../../../assets/women/chudithar.jpg'), width: 1080, height: 1920 },
		{ title: 'Lehenga/Gagra', value: 'lehenga', source: require('../../../assets/women/lehenga.jpg'), width: 1080, height: 1920 },
		{ title: 'Blouse', value: 'blouse', source: require('../../../assets/women/blouse.jpg'), width: 1080, height: 1920 },
		{ title: 'Pants', value: 'pants', source: require('../../../assets/women/pants.jpg'), width: 1080, height: 1920 },
		{ title: 'Half Saree', value: 'halfsaree', source: require('../../../assets/women/halfsaree.jpg'), width: 1080, height: 1920 },
		{ title: 'Nightie', value: 'nightie', source: require('../../../assets/women/nightie.jpg'), width: 1080, height: 1920 },
		{ title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg'), width: 1080, height: 1920 },
	];
	  
	return (
      <ScrollView style={styles.container}>
	      <ImageBackground
			source={require('../../../assets/tailor_front.jpg')}
			style={styles.headerBackground}
			resizeMode="cover"
			imageStyle={{
				borderBottomLeftRadius: 30, 
				borderBottomRightRadius: 30,
			}} 
		  >

        {/* Header Section */}
		  <View style={styles.topHeader}>
			{/* Logo and Location */}
			<View style={styles.headerContent}>
			  <Image source={require('../../../assets/logo.jpeg')} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />
			  <View>
				  <Text category="s1" >Hi, Customer!</Text>
				  <Text category="c1" >Location</Text>
			  </View>
			</View>

			{/* Notification and Bag Icons */}
			<View style={styles.headerContent}>
				<View style={{marginRight: -40, marginBottom: 5 }}>
			      <NotificationsButton />
				</View>
				  <Button
					appearance="ghost"
					accessoryLeft={(props) => <Icon {...props} name="shopping-bag-outline" />}
					size='giant'
					style={{marginLeft: 5, marginRight: -15 }}
				  />
				  <Button
					appearance="ghost"
					accessoryLeft={(props) => <Icon {...props} name="person-outline" />}
					size='giant'
					style={{marginLeft: -20, marginRight: -10 }}
				  />

			</View>
		  </View>

			  <View style={{flexDirection: 'row', paddingLeft: 10, alignItems: 'center', marginTop: 10}}
			  >
				<Input
				  status='basic'
				  style={styles.searchInput}
				  placeholder="Search for Tailor Shops"
				  placement="inner top"
				  accessoryLeft={renderIcon}
				/>

			    <Button
					appearance="ghost"
					accessoryLeft={MoreIcon}
					size='giant'
					style={{marginLeft: -15, marginRight: -15 }}
				  />
				  <Button
					appearance="ghost"
					accessoryLeft={(props) => <Feather name='sliders' size={20} color={theme['color-primary-500']} />}
					size='giant'
					style={{marginLeft: -15 }}
				  />
				</View>
	  </ImageBackground>

			<View style={styles.customerContent}>
				<AdCarousel adImgs={[resizedUri]}/>
			</View>
		
		
        <Text category='h6' style={styles.sectionTitleOrder}>Create Order</Text>
		
		<View style={styles.buttonContainer}>
				{/* Filter Buttons */}
				<Button
					size="tiny"
					style={styles.filterButtonTop}
					status="basic"
				  >
					Women
				  </Button>
				  
				<Button
				  size='tiny'
				  status='basic'
				  style={styles.filterButtonTopYear}
				>
				  Men
				</Button>
				
				<Button
				  size='tiny'
				  status='basic'
				  style={styles.filterButtonTopYear}
				>
					Kids
				</Button>
		</View>
		
        <View style={styles.masonryContainer}>
          <MasonryList
		    images={womenDress}
			columns={2}
			spacing={5}
			renderIndividualHeader={(data) => (
              <View style={styles.masonryHeader}>
                <Text style={styles.masonryText}>{data.title}</Text>
              </View>
            )}
			imageContainerStyle={styles.masonryImageContainer}
          />
        </View>
      </ScrollView>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
	flex: 1,
	backgroundColor: '#fff'
  },
  adsContainer: {
    width: '100%',
    aspectRatio: 16/9, // Set a fixed aspect ratio for the container
    backgroundColor: 'transparent', // No background color to avoid showing white space
	alignItems: 'center',
	marginTop: 20
  },
  container1: {
    marginTop: -140, // Pull the DashboardCard up by half its height
    zIndex: 1, // Ensure the card appears above the background
	top: 160,
  },
  searchInput: {
    width: screenWidth - 90, 
	paddingLeft: 10,
  },
  sectionTitle: {
    marginLeft: 20,
    marginTop: 20,
  },
  sectionTitleOrder: {
	marginBottom: 10,
	marginLeft: 20,
	marginTop: 40
  },
  horizontalList: {
    paddingHorizontal: 10,
    marginVertical: 15,
  },
  tailorCard: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  tailorName: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  serviceCard: {
    width: 80, // adjust the width based on your layout
    height: 80,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F7FA', // background color for the card
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    position: 'relative', // Required for overlay positioning
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: 'contain',
  },
  serviceText: {
    position: 'absolute',
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background for better readability
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 5,
    top: '80%',
    transform: [{ translateY: -10 }], // To center the text vertically over the icon
  },
  masonryContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  masonryImageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
	width: screenWidth/2.5,
    height: 100,
  },
  masonryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  masonryHeader: {
        position: "absolute",
        zIndex: 10,
        flexDirection: "row",
        padding: 5,
		bottom: 10,
		right: 10,
        alignItems: "center",
        backgroundColor: "rgba(150,150,150,0.4)"
    },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, marginTop: 0 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconButton: {
    marginHorizontal: 4, // Reduced horizontal margin for closer positioning
    padding: 0, // Adjust padding if necessary to control button size
  },
  advancedSearchButton: {
    alignSelf: 'flex-end',
  },
  customDivider: {
	  backgroundColor: '#ccc',
	  height: 2,
	  marginTop: -10
  },
  modalContainer: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  textSpacing: {
	  padding: 5,
  },
  imageScrollView: {
    marginVertical: 20,
  },
  shopImage: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
  },
  ratingContainer: {
    marginBottom: 20,
    alignSelf: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#E5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
  },
  moreButton: {
	paddingLeft: -15
  },
  headerBackground: {
    width: '100%',
    paddingBottom: 16,
	height: 200,
	marginBottom: 120,
  },
  dashboardCardWrapper: {
    marginTop: -150, // Pull the DashboardCard up by half its height
    paddingHorizontal: 16, // Padding around the card content
    zIndex: 1, // Ensure the card appears above the background
	top: 160,
	alignItems: 'center'
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
	marginLeft: 10,
	marginRight: 10,
	marginTop: 10
  },
  filterButtonTop: {
    marginVertical: 10,
	borderWidth: 1,
	borderColor: '#ccc',
	borderRadius: 8,
	width: 80,
	marginLeft: 20
  },
  filterButtonTopYear: {
    marginVertical: 10,
	borderWidth: 1,
	borderColor: '#ccc',
	borderRadius: 8,
	width: 80,
	marginLeft: 40
  },
  highlightedButton: {
    backgroundColor: '#d3d3d3',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  customerContent: {
	  marginTop: -120
  },
  previewContent: {
	  width: '100%',
	  height: '100%',
	},
});

export default AdPreviewScreen;