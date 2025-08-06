import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, FlatList, ScrollView, Dimensions } from 'react-native';
import { Layout, Text } from '@ui-kitten/components';

const AdCarousel = ({ adImgs }) => {
	  const listRef = useRef(null);
	  const [currentIndex, setCurrentIndex] = useState(0);
	  
	  // Auto-scroll logic
	  useEffect(() => {
		if(adImgs && adImgs.length > 0) {
			const interval = setInterval(() => {
			  setCurrentIndex((prevIndex) => {
				const nextIndex = (prevIndex + 1) % adImgs.length;
				listRef.current?.scrollToIndex({ index: nextIndex });
				return nextIndex;
			  });
			}, 10000);
			return () => clearInterval(interval);
		}
	  }, [adImgs]);

	  const renderItem = ({ item }) => (
		<View style={styles.slide}>
		  <Image 
			source={{ uri: item }} 
			style={styles.image} 
			resizeMode="contain"
		  />
		</View>
	  );
	  
	  const onViewableItemsChanged = useRef(({ viewableItems }) => {
		if (viewableItems.length > 0) {
		  setCurrentIndex(viewableItems[0].index);
		}
	  }).current;
	  
	  return (
		<Layout style={styles.adsContainer}>
		
		<>
		    <FlatList
				ref={listRef}
				data={adImgs}
				renderItem={renderItem}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onViewableItemsChanged={onViewableItemsChanged}
				viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
			/>

		  <View style={styles.indicatorContainer}>
			{adImgs.map((_, index) => (
			  <View
				key={index}
				style={[
				  styles.indicator,
				  currentIndex === index && styles.activeIndicator,
				]}
			  />
			))}
		  </View>
		</>
		
		</Layout>
	  );
	}
	
export default AdCarousel;

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  slide: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
	width: '90%',
    height: '98%',
    borderRadius: 15,
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: '#3366FF',
  },
  adsContainer: {
    width: '100%',
    aspectRatio: 16/9, // Set a fixed aspect ratio for the container
    backgroundColor: 'transparent', // No background color to avoid showing white space
	alignItems: 'center',
	marginTop: 20,
	borderRadius: 20,
	marginLeft: -10
  }
});