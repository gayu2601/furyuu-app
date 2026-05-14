import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Alert, View, Image, StyleSheet, ScrollView, StatusBar, 
  SafeAreaView, TouchableOpacity, Dimensions, ImageBackground 
} from 'react-native';
import { 
  ApplicationProvider, Layout, Text, Icon, Button, useTheme 
} from '@ui-kitten/components';
import { useUser } from '../main/UserContext';
import { useReadOrderItems } from '../main/ReadOrderItemsContext';
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useNotification } from '../main/NotificationContext';
import { showErrorMessage } from './showAlerts';
import NotificationsButton from "../extra/NotificationsButton";
import OrderBagButton from "../extra/OrderBagButton";
import DashboardCard from "./DashboardCard";
import * as Network from 'expo-network';
import { NotificationWorker } from './NotificationWorker';
import { locationWorkerInstance } from '../extra/LocationWorker';
import { checkAndDeleteSession } from "../extra/sessionUtils";

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_WIDTH = (screenWidth - 40) / 2; // Accounting for padding/margins

const menDress = [
  { title: 'Shirt', value: 'shirt', source: require('../../../assets/men/shirt.jpg') },
  { title: 'Suit', value: 'suit', source: require('../../../assets/men/suit.jpg') },
  { title: 'Pants', value: 'pants', source: require('../../../assets/men/pants.jpg') },
  { title: 'Pyjama-Kurta', value: 'pyjama', source: require('../../../assets/men/pyjama.jpg') },
  { title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg') },
];

const womenDress = [
  { title: 'Party Dresses', value: 'partywear', source: require('../../../assets/women/partywear.jpg') },
  { title: 'Tops', value: 'tops', source: require('../../../assets/women/shirt.jpg') },
  { title: 'Salwar', value: 'salwar', source: require('../../../assets/women/chudithar.jpg') },
  { title: 'Lehenga/Gagra', value: 'lehenga', source: require('../../../assets/women/lehenga.jpg') },
  { title: 'Blouse', value: 'blouse', source: require('../../../assets/women/blouse.jpg') },
  { title: 'Pants', value: 'pants', source: require('../../../assets/women/pants.jpg') },
  { title: 'Long Gown', value: 'longgown', source: require('../../../assets/women/longgown.jpg') },
  { title: 'Saree Pre-pleating', value: 'sareePrePleating', source: require('../../../assets/women/saree.jpg') },
  { title: 'Half Saree', value: 'halfsaree', source: require('../../../assets/women/halfsaree.jpg') },
  { title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg') },
];

const kidsDress = [
  { title: 'Tops', value: 'tops', source: require('../../../assets/kids/tops.jpg') },
  { title: 'Lehenga/Gagra', value: 'lehenga', source: require('../../../assets/kids/gagra.jpg') },
  { title: 'Pants', value: 'pants', source: require('../../../assets/kids/pants.jpg') },
  { title: 'Frock', value: 'frock', source: require('../../../assets/kids/frock.jpg') },
  { title: 'Skirt', value: 'skirt', source: require('../../../assets/kids/skirt.jpg') },
  { title: 'Uniform', value: 'uniform', source: require('../../../assets/kids/uniform.jpg') },
  { title: 'Ethnic Wear', value: 'paavadai', source: require('../../../assets/kids/paavadai.jpg') },
  { title: 'Alteration', value: 'Alteration', source: require('../../../assets/alteration.jpg') },
];

const HeaderSection = React.memo(({ theme, address, navigation }) => {
  let locDenied = locationWorkerInstance.isLocationDenied();
  return (
    <View style={styles.topHeader}>
      <View style={styles.headerContent}>
        <Image source={require('../../../assets/logo.png')} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />
        <View style={{ marginTop: 10 }}>
          <Text category="s1">Hello!</Text>
          {!locDenied && <Text category="c1" style={{ width: 190 }} numberOfLines={1}>{address ? address : 'Loading location...'}</Text>}
        </View>
      </View>
      <View style={{ marginRight: -35, marginBottom: 5 }}>
        <NotificationsButton />
	  </View>
	  <View>
        <OrderBagButton />
	  </View>
	  <View>
        <Button
          appearance="ghost"
          accessoryLeft={(props) => <Icon {...props} name="person-outline" style={{width: 25, height: 25}} fill={theme['color-primary-500']} />}
          onPress={() => navigation.navigate('ProfileSettings')}
          size='small'
		  style={{marginRight: 10 }}
        />
      </View>
    </View>
  );
});

const CategoryButtons = React.memo(({ selIndex, setSelIndex }) => (
  <View style={styles.buttonContainer}>
    {['Women', 'Men', 'Kids'].map((label, index) => (
      <Button
        key={label}
        size="tiny"
        status="basic"
        style={[styles.filterButton, selIndex === index && styles.highlightedButton]}
        onPress={() => setSelIndex(index)}
      >
        {label}
      </Button>
    ))}
  </View>
));

const DressColumn = React.memo(({ data, onPress }) => {
  return (
    <View style={styles.column}>
      {data.map((item, index) => (
        <TouchableOpacity 
          key={`${item.value}-${index}`} // Stable unique key
          style={styles.tileContainer} 
          activeOpacity={0.8} 
          onPress={() => onPress(item)}
        >
          <Image source={item.source} style={styles.tileImage} progressiveRenderingEnabled={true}
              fadeDuration={0}/>
          <View style={styles.tileOverlay}>
            <Text style={styles.tileText}>{item.title}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const HomeScreenNew = ({ navigation }) => {
  const theme = useTheme();
  const [selIndex, setSelIndex] = useState(0);
  const { currentUser } = useUser();
  const { getOrders } = useReadOrderItems();
  const { notificationCount, updateNotificationCount, markNotificationAsRead } = useNotification();
  const [address, setAddress] = useState(null);
  const workerInitialized = useRef(false);
  const { leftCol, rightCol } = useMemo(() => {
    const data = [womenDress, menDress, kidsDress][selIndex] || [];
    return {
      leftCol: data.filter((_, i) => i % 2 === 0),
      rightCol: data.filter((_, i) => i % 2 !== 0),
    };
  }, [selIndex]);

  useEffect(() => {
    const initLocation = async () => {
      try {
        let addressStr = locationWorkerInstance.getLocationAddress();
        if (!addressStr) {
          const result = await locationWorkerInstance.initialize();
          setAddress(result.address);
        } else {
          setAddress(addressStr);
        }
      } catch (e) { console.log(e); }
    };
    initLocation();
  }, []);

  const navigateToTest = useCallback((item) => {
    navigation.navigate('HomeMain', {
      screen: 'Test',
      params: { itemName: item.value, headerImgUri: item.source }
    });
  }, [navigation]);

  const handleRemoteLogout = useCallback(async () => {
    await checkAndDeleteSession();
    navigation.reset({ index: 0, routes: [{ name: 'AuthScreen' }] });
  }, [navigation]);

  useEffect(() => {
    if (workerInitialized.current) return;
    const worker = new NotificationWorker(currentUser, updateNotificationCount, markNotificationAsRead, notificationCount, handleRemoteLogout, navigation, getOrders);
    worker.start();
    workerInitialized.current = true;
    return () => worker.stop();
  }, [currentUser]);

  const filteredDressItems = useMemo(() => {
    const data = [womenDress, menDress, kidsDress][selIndex] || [];
    // Split data into two columns
    const leftCol = data.filter((_, i) => i % 2 === 0);
    const rightCol = data.filter((_, i) => i % 2 !== 0);
    return { leftCol, rightCol };
  }, [selIndex]);

  const DressTile = ({ item }) => (
    <TouchableOpacity 
      style={styles.tileContainer} 
      activeOpacity={0.8} 
      onPress={() => navigateToTest(item)}
    >
      <Image source={item.source} style={styles.tileImage} />
      <View style={styles.tileOverlay}>
        <Text style={styles.tileText}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../../assets/tailor_front.jpg')}
          style={styles.headerBackground}
          imageStyle={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
        >
          <HeaderSection theme={theme} address={address} navigation={navigation} />
		  <View style={styles.dashboardCardWrapper}>
				<DashboardCard />
		  </View>
        </ImageBackground>

        <View style={styles.mainContent}>
          <Text category='h6' style={styles.sectionTitle}>Start New Order</Text>
          <CategoryButtons selIndex={selIndex} setSelIndex={setSelIndex} />

          <View style={styles.gridContainer}>
            <DressColumn data={leftCol} onPress={navigateToTest} />
            <DressColumn data={rightCol} onPress={navigateToTest} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  headerBackground: { width: '100%', height: 400, paddingBottom: 5 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, marginTop: 20, marginBottom: -10 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  mainContent: { marginTop: -30, paddingHorizontal: 15 },
  sectionTitle: { marginBottom: 10, color: '#000', textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', marginBottom: 20, justifyContent: 'space-between' },
  filterButton: { flex: 1, marginHorizontal: 5, borderRadius: 8, borderColor: '#ddd' },
  highlightedButton: { backgroundColor: '#E2E2E2' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: COLUMN_WIDTH },
  tileContainer: {
    width: '100%',
    height: 130, // Fixed height for consistency
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tileText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  dashboardCardWrapper: {
    marginTop: -140,
    paddingHorizontal: 16,
    zIndex: 1,
    top: 160,
    alignItems: 'center',
  },
});

export default React.memo(HomeScreenNew);