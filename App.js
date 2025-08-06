import "react-native-gesture-handler";
import React, { useEffect, useState, createRef, useRef, useMemo, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { StatusBar, Alert, TouchableOpacity, View, StyleSheet, ImageStyle, AppState } from "react-native";
import SplashScreen from './src/views/auth/SplashScreen';
import RegisterScreen from './src/views/auth/RegisterScreen';
import PersonalDetailsScreen from './src/views/auth/PersonalDetailsScreen';
import ShopDetailsScreen from './src/views/auth/ShopDetailsScreen';
import AddressInputScreen from './src/views/auth/AddressInputScreen';
import PaymentSettingsScreen from './src/views/auth/PaymentSettingsScreen';
import DigitalPortfolioScreen from './src/views/auth/DigitalPortfolioScreen';
import AnalyticsScreen from './src/views/main/AnalyticsScreen';
import IncomeExpenseHistoryScreen from './src/views/main/IncomeExpenseHistoryScreen';
import AddExpenseScreen from './src/views/main/AddExpenseScreen';
import LinkAccountScreen from './src/views/auth/LinkAccountScreen';
import SubscriptionsScreen from './src/views/auth/SubscriptionsScreen';
import PaywallScreen from './src/views/main/PaywallScreen';
import CreateAdScreen from './src/views/main/CreateAdScreen';
import AdPreviewScreen from './src/views/main/AdPreviewScreen';
import SupportScreen from './src/views/auth/SupportScreen';
import { NetworkProvider } from './src/views/main/NetworkContext';
import { PubSubProvider } from './src/views/main/SimplePubSub';
import * as Network from 'expo-network';
import OrderBagScreen from './src/views/main/OrderBagScreen';
import HomeScreen from "./src/views/main/HomeScreen";
import HomeScreenNew from "./src/views/main/HomeScreenNew";
import ImportCustomerScreen from "./src/views/main/ImportCustomerScreen";
import HomeScreenTabView from "./src/views/main/HomeScreenTabView";
import OrderDetails from "./src/views/main/OrderDetails";
import WelcomeLoginScreen from "./src/views/auth/WelcomeLoginScreen";
import EditOrderDetails from "./src/views/main/EditOrderDetails";
import NotificationsScreen from "./src/views/main/NotificationsScreen";
import ProfileScreen from "./src/views/auth/ProfileScreen";
import ShareIntentScreenTailor from "./src/views/main/ShareIntentScreenTailor";
import AttachImagesScreen from "./src/views/main/AttachImagesScreen";
import CustomDesign from "./src/views/main/CustomDesign";
import TestScreen from "./src/views/main/TestScreen";
import { ArrowIosBackIcon, RefreshIcon } from "./src/views/extra/icons";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer, getStateFromPath, DefaultTheme } from '@react-navigation/native';
import Colors from "./src/constants/Colors";
import { FontAwesome } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import {
  addStateListener,
  getScheme,
  getShareExtensionKey,
  hasShareIntent,
} from "expo-share-intent";
import { useShareIntentContext } from "expo-share-intent";
import { ShareIntentProvider } from "expo-share-intent";
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { UserProvider, useUser } from "./src/views/main/UserContext";
import { PermissionsProvider, usePermissions } from "./src/views/main/PermissionsContext";
import { OrderItemsProvider } from "./src/views/main/OrderItemsContext";
import { NotificationProvider, useNotification } from './src/views/main/NotificationContext';
import { WalkthroughProvider } from './src/views/main/WalkthroughContext';
import { ReadOrderItemsProvider } from "./src/views/main/ReadOrderItemsContext";
import { RevenueCatProvider, useRevenueCat } from "./src/views/main/RevenueCatContext";
import { storage } from './src/views/extra/storage';
import * as Notifications from "expo-notifications";
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry, TopNavigationAction, Icon, Text, Button} from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { default as theme } from './theme.json';
import { default as mapping } from './mapping.json';
import * as Font from 'expo-font';
import NotificationsButton from './src/views/extra/NotificationsButton';
import { Session } from '@supabase/supabase-js'
import FlashMessage from 'react-native-flash-message';
import { supabase } from './src/constants/supabase';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Purchases from 'react-native-purchases';
import firebase from '@react-native-firebase/app';
import * as Application from 'expo-application';
import mobileAds from 'react-native-google-mobile-ads';
import { usePubSub } from './src/views/main/SimplePubSub';
import AppStateManager from './src/components/AppStateManager'; // Adjust path as needed

const Stack = createStackNavigator()

const Drawer = createDrawerNavigator();

const BottomTab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

const firebaseConfig = {
  apiKey: 'AIzaSyBfpPgFkdxanQzcL-VQWecvsow7LOSzwV4',
  authDomain: 'tailor-app-ed4b3.firebaseapp.com',
  projectId: 'tailor-app-ed4b3',
  appId: '1:368569675717:android:ab71d7b47f46f6bc6425ac'
};
if (!firebase.apps.length) {
	console.log('initing firebase')
	firebase.initializeApp(firebaseConfig);
}
if (__DEV__) {
  firebase.analytics().setAnalyticsCollectionEnabled(true);
  firebase.analytics().setSessionTimeoutDuration(1000); // Short timeout for testing
}

const PREFIX = Linking.createURL("/");
const PACKAGE_NAME =
  Constants.expoConfig?.android?.package ||
  Constants.expoConfig?.ios?.bundleIdentifier;

export const navigationRef = createRef();
const routeNameRef = createRef();

const linking = {
  prefixes: [
    `${Constants.expoConfig?.scheme}://`,
    `${PACKAGE_NAME}://`,
    PREFIX,
  ],
  config: {
    initialRouteName: "ShareIntent",
    screens: {
      ShareIntent: "shareintent"
    },
  },
  getStateFromPath(path, config) {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      console.debug(
        "react-navigation[getStateFromPath] redirect to ShareIntent screen"
      );
      return {
        routes: [
          {
            name: "ShareIntent",
          },
        ],
      };
    }
    return getStateFromPath(path, config);
  },
  subscribe(listener) {
    console.debug("react-navigation[subscribe]", PREFIX, PACKAGE_NAME);
    const onReceiveURL = ({ url }) => {
      if (url.includes(getShareExtensionKey())) {
        console.debug(
          "react-navigation[onReceiveURL] Redirect to ShareIntent Screen",
          url
        );
        listener(`${getScheme()}://shareintent`);
      } else {
        console.debug("react-navigation[onReceiveURL] OPEN URL", url);
        listener(url);
      }
    };
    const shareIntentEventSubscription = addStateListener((event) => {
      console.debug(
        "react-navigation[subscribe] shareIntentStateListener",
        event.value
      );
      if (event.value === "pending") {
        listener(`${getScheme()}://shareintent`);
      }
    });
    const urlEventSubscription = Linking.addEventListener("url", onReceiveURL);
    return () => {
      shareIntentEventSubscription.remove();
      urlEventSubscription.remove();
    };
  },
  async getInitialURL() {
	const needRedirect = hasShareIntent(getShareExtensionKey());
    console.debug(
      "react-navigation[getInitialURL] redirect to ShareIntent screen:",
      needRedirect
    );
    if (needRedirect) {
      return `${Constants.expoConfig?.scheme}://shareintent`;
    }
    const url = await Linking.getInitialURL();
	return url;
  },
};

const AuthNavigator = ({ initialRoute = "WelcomeLoginScreen" }) => {
  return (
  <NavigationContainer
      independent={true}
      fallback={
        <SplashScreen />
      }
    >
      <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen 
              name="WelcomeLoginScreen"
              component={WelcomeLoginScreen}
              options={{headerShown: false}}
          />
		  <Stack.Screen 
              name="RegisterScreen"
              component={RegisterScreen}
              options={{headerShown: false}}
          />
          <Stack.Screen
              name="MainScreen"
			  component={DrawerNavigator}
              options={{headerShown: false}}
          />
		  <Stack.Screen
              name="AddressInputScreen"
              component={AddressInputScreen}
              options={{headerShown: false}}
          />
      </Stack.Navigator>
	</NavigationContainer>
  )
}

const DrawerNavigator = ({ route }) => {
	
	const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  console.log(`🚪 NEW DrawerNavigator Instance: ${instanceId.current}`);

	const { updateCurrentUser, currentUser, handleUILogout, updateProfileCompleted } = useUser();
	const { getUserDetails } = useRevenueCat();
	const { requestCameraPermission, requestMediaPermission } = usePermissions();
	const { startListening } = usePubSub();
	let currentUserLocal = currentUser;
	//let fList = storage.getString(currentUser.username + '_Freelancers')
	//let freelancers = fList ? JSON.parse(fList) : [];
  const { fetchNotifications } = useNotification();
  const [initialRoute, setInitialRoute] = useState(null);
      const appStateManager = useRef(AppStateManager.getInstance());
  
	const [deviceChecked, setDeviceChecked] = useState(false);
	
  console.log("DrawerNavigator route.params: ", route?.params);
  
  // Handle current user setup once on mount
  useEffect(() => {
    if (route?.params?.data1) {
		console.log('setting from route.params.data1');
		const userData = route.params.data1;
		currentUserLocal = userData;
		updateCurrentUser(userData);
    }
  }, [route?.params?.data1]);
  
  const checkDeviceCallback = useCallback(async(isActive, gracePeriodActive) => {
	  console.log('inside checkDevice1')
		  const { data: dataD, error: errorD } = await supabase
									.from('user_last_device_v2')
									.select(`device_id`)
									.eq('user_id', currentUserLocal.id);
			if(errorD) {
				console.error(errorD);
			}
			console.log(dataD)			
			let dd = Application.getAndroidId();
			console.log(dd)
			console.log(isActive + ',' + gracePeriodActive)
			if(dataD.length > 0 && dataD[0].device_id !== dd && !isActive && !gracePeriodActive) {
				console.log('logging out in ui')
				await handleUILogout();
			}
	  }, [currentUserLocal?.id]);
	
	const activatePubSubCallback = useCallback(async(isActive) => {
				  console.log('Starting PubSub for user:', currentUserLocal.id);
				  const subscription = startListening(currentUserLocal.id, isActive);
	}, [currentUserLocal?.id]);
	
	const checkProfileCompletionCallback = useCallback(() => {
		console.log('in checkProfileCompletionCallback')
		console.log(currentUserLocal)
		if(!currentUserLocal.yearsOfExp || !currentUserLocal.upiQRCode_url || !currentUserLocal.ShopDetails.shopPics || currentUserLocal.ShopDetails.shopPics.length === 0 || !currentUserLocal.ShopDetails.socialMediaAcct) {
			console.log('setting profile completed to false')
			updateProfileCompleted(false);
		} else {
			console.log('setting profile completed')
			updateProfileCompleted(true);
		}
	}, [currentUserLocal])
	
	  useEffect(() => {
		if (!currentUserLocal) return;

		console.log('Setting up AppState listener for instance:', instanceId.current);
		
		// Define callbacks for the AppState manager
		const callbacks = {
		  getUserDetails,
		  checkDevice: checkDeviceCallback,
		  activatePubSub: activatePubSubCallback,
		  checkProfileCompletion: checkProfileCompletionCallback
		};

		appStateManager.current.updateUser(currentUserLocal, callbacks);

		// Start listening (will only actually start if not already listening)
		appStateManager.current.startListening(currentUserLocal, callbacks);

		// Cleanup function
		return () => {
		  console.log('DrawerNavigator unmounting, instance:', instanceId.current);
		  // Note: We don't stop listening here because other instances might still need it
		  // The singleton will handle this automatically
		};
	  }, [currentUserLocal?.id]);


  // Handle notifications fetch
  useEffect(() => {
    const getNotifs = async () => {
      if (!currentUserLocal) return; // Guard clause if no user

	  await requestCameraPermission();
	  await requestMediaPermission();
      await fetchNotifications(currentUserLocal, route?.params?.newUser)
    };

    getNotifs();
	
  }, [currentUserLocal?.id, route?.params?.newUser]);
  
  const navigationContainer = useMemo(() => (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
	  independent={true}
      fallback={
        <SplashScreen />
      }
	  onReady={() => {
        routeNameRef.current = navigationRef.current.getCurrentRoute().name;
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRoute = navigationRef.current.getCurrentRoute();
        const currentRouteName = currentRoute.name;

        if (previousRouteName !== currentRouteName) {
          // The line below is the most important - it sends the screen name to Firebase
          firebase.analytics().logScreenView({
            screen_name: currentRouteName,
			screen_class: currentRouteName
          });
        }
        
        // Save the current route name for later comparison
        routeNameRef.current = currentRouteName;
      }}
    >
        <BottomTab.Navigator initialRouteName='HomeMain' screenOptions={({ route }) => ({
			tabBarStyle: {
			  display: route.name === 'AuthScreen' ? 'none' : 'flex', // Hide tab bar for AuthScreen
			  paddingTop: 10, // Add spacing at the top of the tab bar
			  paddingBottom: 10, // Add spacing at the bottom of the tab bar
			  height: 70, // Adjust height slightly to accommodate padding
			},
      tabBarIcon: ({ color, size, focused }) => {
        let iconName;
        switch (route.name) {
          case 'HomeMain':
            iconName = 'home-outline';
            break;
          case 'CreateAdMain':
            iconName = 'plus-square-outline';
            break;
		  case 'Dashboard':
            iconName = 'activity-outline';
            break;
          case 'OrderDetailsMain':
            iconName = 'file-text-outline';
            break;
		  case 'Add Income/Expense':
            iconName = 'trending-up-outline';
            break;
          default:
            iconName = 'grid-outline';
        }
        return <Icon name={iconName} style={{ width: size, height: size, color }} fill={focused ? theme['color-primary-500'] : '#ccc'} />;
      },
	  tabBarLabel: ({ color, size, focused }) => {
        let name;
        switch (route.name) {
          case 'HomeMain':
            name = 'Home';
            break;
		  case 'CreateAdMain':
            name = 'Create Ad';
            break;
		  case 'Dashboard':
            name = 'Reports';
            break;
          case 'OrderDetailsMain':
            name = 'My Orders';
            break;
		  case 'Add Income/Expense':
            name = 'Income/Expense';
            break;
          default:
            name = 'grid-outline';
        }
        return (
			<Text category="s2" style={{ fontSize: 12, color: focused ? theme['color-primary-500'] : '#ccc' }}>
              {name}
            </Text>
		);
      },
		tabBarActiveTintColor: theme['color-primary-500'],
        tabBarInactiveTintColor: '#ccc',
        tabBarIndicatorStyle: {
          backgroundColor: theme['color-primary-500']
        },
    })}>
      <BottomTab.Screen
        name="HomeMain"
        options={{ headerShown: false }}
      >
        {({ navigation }) => (
          <Stack.Navigator>
					<Stack.Screen name="HomeNew" component={HomeScreenNew} initialParams={{ isNewUser: route?.params?.newUser }}
						options={{
						  headerShown: false
						}}
					/>
					<Stack.Screen name="Test" component={TestScreen}
						options={({ route }) => ({
						  headerTitle: getHeaderTitleDress(route),
						  headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}/>
						  ),
						  headerRight: () => (
							<Icon name="shopping-bag-outline" style={{ width: 25, height: 25, marginRight: 20 }} onPress={() => {navigation.navigate('OrderBagScreen')}} fill={theme['color-primary-500']}/>
						  ),
						  headerTitleStyle: {
								textTransform: 'capitalize'
							}
						})}
					/>
          </Stack.Navigator>
        )}
      </BottomTab.Screen>
	  
	  <BottomTab.Screen
        name="OrderDetailsMain"
        options={{ headerShown: false }}
      >
        {({ navigation: bottomTabNavigation }) => (
          <Stack.Navigator>
			<Stack.Screen name="Home" component={HomeScreenTabView}
						options={({ navigation, route }) => ({
						  headerTitle: 'Orders',
						  headerLeft: () => <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => navigation.navigate('HomeMain')} />,
						  headerRight: () => ( <TopNavigationAction style={styles.navButton} icon={RefreshIcon} style={{ marginRight: 20 }} onPress={() => {navigation.setParams({ triggerSync: true });}}/>
						  ),
						})}
					/>
            <Stack.Screen
              name="OrderDetails"
              component={OrderDetails}
              options={({ navigation, route }) => ({
                headerTitle: getOrderDetailsTitle(route),
                headerRight: () => (
					<View style={{flexDirection: 'row'}}>
					  <Icon name="share-outline" style={{ width: 25, height: 25, marginRight: 20 }} onPress={() => {navigation.setParams({ triggerShare: true });}}/>
					  {(!['Requested'].includes(route.params.item.orderStatus)) && (
						<MaterialCommunityIcons
						  name={"pencil"}
						  size={25}
						  style={{ marginRight: 20, marginLeft: -10 }}
						  onPress={() => {
							navigation.navigate('EditOrderDetails', { ...route.params });
						  }}
						/>
					  )}
					</View>
                ),
                headerLeft: () => <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} />,
              })}
            />
            <Stack.Screen name="EditOrderDetails" component={EditOrderDetails} options={({ navigation, route }) => ({
					headerTitle: getEditOrderDetailsTitle(route),
					headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} />
						)
				  })}/>
          </Stack.Navigator>
        )}
      </BottomTab.Screen>

	  <BottomTab.Screen
        name="CreateAdMain"
        options={{ headerShown: false, unmountOnBlur: true }}
      >
        {({ navigation }) => (
          <Stack.Navigator>
			<Stack.Screen
              name="CreateAdScreen"
              component={CreateAdScreen}
              options={{
                headerTitle: 'Create Ad',
				headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} />
						)
              }}
            />
			<Stack.Screen
              name="AdPreview"
              component={AdPreviewScreen}
              options={{
                headerTitle: 'Preview Ad',
				headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} />
						)
              }}
            />
          </Stack.Navigator>
        )}
      </BottomTab.Screen>


	  <BottomTab.Screen
        name="Dashboard"
        options={{ headerShown: false, unmountOnBlur: true }}
      >
        {({ navigation }) => (
          <Stack.Navigator>
			<Stack.Screen
						  name="AnalyticsScreen"
						  component={AnalyticsScreen}
						  options={({ navigation, route }) => ({
						headerTitle: 'Dashboard',
						headerLeft: () => (
										  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
											onPress={() => navigation.goBack()} />
										),
						})}
			  />
		</Stack.Navigator>
        )}
      </BottomTab.Screen>
	  
	  
	  <BottomTab.Screen
        name="Add Income/Expense"
        options={{ headerShown: false, unmountOnBlur: true }}
      >
        {({ navigation }) => (
          <Stack.Navigator>
			<Stack.Screen
						  name="IncomeExpenseHistoryScreen"
						  component={IncomeExpenseHistoryScreen}
						  options={({ navigation, route }) => ({
						headerTitle: 'Other Income/Expense History',
						headerLeft: () => (
										  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
											onPress={() => navigation.goBack()} />
										),
						})}
			/>
			<Stack.Screen
						  name="AddExpenseScreen"
						  component={AddExpenseScreen}
						  options={({ navigation, route }) => ({
						headerTitle: 'Add Income/Expense',
						headerLeft: () => (
										  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
											onPress={() => navigation.goBack()} />
										),
						})}
			  />
		</Stack.Navigator>
        )}
      </BottomTab.Screen>
	

      <Stack.Screen
        name="ShareIntent"
        options={{ headerShown: false, tabBarButton: () => null }}
      >
        {({ navigation: bottomTabNavigation }) => (
          <Stack.Navigator>
            <Stack.Screen
              name="ShareIntentMain"
              component={ShareIntentScreenTailor}
              options={{
                headerTitle: 'Select order to share'
              }}
            />
            <Stack.Screen name="AttachImages" component={AttachImagesScreen} options={({ navigation, route }) => ({
						headerTitle: 'Attach image as pattern pic',
						headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
								onPress={() => navigation.goBack()} />
						  )
						})}/>
          </Stack.Navigator>
        )}
      </Stack.Screen>

      	<Stack.Screen name="ProfileSettings" component={ProfileNavigator} options={{
					headerShown: false,
					headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
								onPress={() => navigation.goBack()} />
						),
					tabBarButton: () => null
				}}
			/>
		
			<Stack.Screen
              name="NotificationsScreen"
              component={NotificationsScreen}
              options={({ navigation }) => ({
					headerTitle: 'Notifications',
					headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
								onPress={() => navigation.goBack()} />
						),
					tabBarButton: () => null
			  })}
			/>
			
		<Stack.Screen name="OrderBagScreen" component={OrderBagScreen}
						options={({ navigation }) => ({
						  headerTitle: 'Order Summary',
						  headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} />
							),
							headerRight: () => (
								<Icon name="trash-2-outline" fill="#FF0000" />
							),
						  tabBarButton: () => null
						})}
					/>
							
		<Stack.Screen 
						  name="ImportCustomerScreen"
						  component={ImportCustomerScreen}
						  options={({ navigation, route }) => ({
							headerTitle: 'Select contact',
							headerLeft: () => (
							  <TopNavigationAction
								style={styles.navButton} 
								icon={ArrowIosBackIcon}
								onPress={() => {
								  if(route.params.screenName === 'EditOrderDetails') {
									navigation.navigate('EditOrderDetails', { ...route.params });
								  } else if(route.params.screenName === 'OrderBagScreen') {
									navigation.navigate('OrderBagScreen');
								  } else {
									navigation.goBack();
								  }
								}}
							  />
							),
							tabBarButton: () => null
						  })}
					  />
		<Stack.Screen 
						  name="CustomDesign"
						  component={CustomDesign}
						options={({ navigation }) => ({
							headerTitle: 'Draw design',
							headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} />
							),
							tabBarButton: () => null
						  })}
					  />
				  
		<Stack.Screen
				  name="Paywall"
				  component={PaywallScreen}
				  options={({ navigation, route }) => ({
						headerTitle: getHeaderTitle(route),
						headerLeft: () => (
						  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
							onPress={() => navigation.goBack()} />
						),
						tabBarButton: () => null
					})}
			  />

		<Stack.Screen
              name="AuthScreen"
              component={AuthNavigator}
			  options={{
				headerShown: false,
				tabBarButton: () => null
			  }}
          />
	  
    </BottomTab.Navigator>
	</NavigationContainer>
  ), [currentUserLocal?.id, initialRoute]);
  return navigationContainer;
};

function ProfileNavigator() {
const navigation = useNavigation();
  return (
      <Stack.Navigator>
			<Stack.Screen
				  name="ProfileScreen"
				  component={ProfileScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
	/>
			  
			  <Stack.Screen
				  name="PersonalDetailsScreen"
				  component={PersonalDetailsScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
			  />
			  
			  <Stack.Screen
				  name="ShopDetailsScreen"
				  component={ShopDetailsScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
			  />
			  
			  
		  <Stack.Screen
              name="DigitalPortfolioScreen"
              component={DigitalPortfolioScreen}
              options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
          />
			  
			  <Stack.Screen
				  name="PaymentSettingsScreen"
				  component={PaymentSettingsScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
			  />
			  
			  <Stack.Screen
				  name="LinkAccountScreen"
				  component={LinkAccountScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
			  />
			  
			  <Stack.Screen
				  name="SubscriptionsScreen"
				  component={SubscriptionsScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
			  />
			  <Stack.Screen
				  name="SupportScreen"
				  component={SupportScreen}
				  options={({ navigation, route }) => ({
    headerTitle: getHeaderTitle(route),
	headerLeft: () => (
					  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
						onPress={() => navigation.goBack()} />
					),
  })}
			  />
			
			  </Stack.Navigator>
  )
}

function getHeaderTitle(route) {
  const routeName = route ? route.name : 'Home';
  console.log("route:");
  console.log(route);
  switch (routeName) {
	case 'CustomDesign':
      return 'Draw custom design';
	case 'ProfileSettings':
      return 'Profile Settings';
	case 'ProfileScreen':
      return 'Profile';  
	case 'AddressInputScreen':
      return 'Shop Details';
	case 'DigitalPortfolioScreen':
      return 'Digital Portfolio Webpage';
	case 'ImportCustomerScreen':
      return 'Select customer';
	case 'PersonalDetailsScreen':
      return 'Personal Settings';
	case 'ShopDetailsScreen':
      return 'Shop Settings';
	case 'LinkAccountScreen':
      return 'Link bank account';
	case 'SupportScreen':
      return 'Help';
	case 'SubscriptionsScreen':
      return 'Subscriptions';
	case 'PaywallScreen':
      return 'Subscribe';
	case 'PaymentSettingsScreen':
      return 'Payment Settings';
  }
}

function getOrderDetailsTitle(route) {
	return route.params ? 'Order #' + route.params.item.tailorOrderNo: 'Order Summary';
}

function getEditOrderDetailsTitle(route) {
	return route.params ? 'Edit Order #' + route.params.item.tailorOrderNo: 'Edit Order';
}

function getHeaderTitleDress(route) {
  return route.params ? route.params.itemName: 'Select dress type';
}

export default function App() {

	  const [sessionLocal, setSessionLocal] = useState(null)
	const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(false)
	
	//const [fontsLoaded, setFontsLoaded] = useState(false);

	  // Load fonts when component mounts
	  /*useEffect(() => {
		async function loadFonts() {
			console.warn('in loadFonts')
		  await Font.loadAsync({
			'PlayfairDisplay-Regular': require('./assets/Playfair_Display/static/PlayfairDisplay-Regular.ttf')
		  });
		  setFontsLoaded(true);
		}
		
		loadFonts();
	  }, []);*/
	  
	useEffect(() => {
		const initializeGoogleMobileAds = async () => {
		  try {
			await mobileAds()
			  .initialize()
			  .then(adapterStatuses => {
				console.log('Initialization complete!');
			  });
		  } catch (error) {
			console.error('Failed to initialize Google Mobile Ads:', error);
		  }
		};

		initializeGoogleMobileAds();
	}, []);

	  
    const fetchSession = useCallback(async () => {
		console.log("in fetchSession");
		console.log(currentUser)
        try {
			setLoading(true)
			const networkState = await Network.getNetworkStateAsync();
			const isConnected = networkState.isConnected;
			if(!isConnected) {
				console.log("No internet connection. Retrieving session from local storage.");
				const localSession = storage.getString('session');
				if (localSession) {
					console.log("Using local session");
					const parsedSession = JSON.parse(localSession);
					setSessionLocal(parsedSession);
					setCurrentUser(parsedSession.userData);
					await Purchases.logIn(parsedSession.user.id);
				} else {
					console.log("No session exists locally");
					setSessionLocal(null);
				}
			} else {
				const { data: { session }, error } = await supabase.auth.getSession()
				if(error) {
					throw error;
				}
				console.log(session)
			    setSessionLocal(session)
				if(session) {
					console.log('session found in App.js')
					const { data: data1, error: error1, status } = await supabase
									.from('profiles')
									.select(`*, ShopDetails(id, shopName, shopPhNo, shopAddress, shopRating, shopPics, adPic, homeMeasurement, socialMediaAcct, noOfEmp, topServices, websiteConsent, maps_place_id, pincode, slug)`)
									.eq('id', session.user.id)
									.maybeSingle()
					if (error1 && status !== 406) {
						console.log(error1)
						return false;
					} else {
						console.log(data1)
						if(data1) {
							  setCurrentUser(data1);
							storage.set(
								'session',
								JSON.stringify({
									session,
									userData: data1,
								})
							);
						}
											
					}
				} else {
					console.log('no session exists')
				}
				supabase.auth.onAuthStateChange((_event, session) => {
					setSessionLocal(session)
				})
			}
        } catch (error) {
            Alert.alert("Error!", error.message)
        } finally {
            setLoading(false)
        }
    }, []);
	
	useEffect(() => {
		fetchSession()
		console.log(sessionLocal)
		console.log(currentUser)
	}, []);
	
	/*useEffect(() => {
		const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
		  console.log('Notification received in foreground:', notification);
		  // Handle the notification data here, e.g., update state, show an alert
		});

		return () => {
		  notificationSubscription.remove();
		};
	}, []);*/
	
  const navigationComponent = useMemo(() => {
    console.log('Creating navigation component for user:', currentUser?.id, 'signupStep:', currentUser?.signupStep);
    
    if (!currentUser) {
      return <AuthNavigator key="auth-register" initialRouteName="RegisterScreen" />;
    }
    
    if (currentUser.signupStep === 1) {
      return <AuthNavigator key="auth-address" initialRouteName="AddressInputScreen" />;
    }
    
    return <DrawerNavigator key="drawer-main" route={{ params: { data1: currentUser } }} />;
  }, [currentUser?.id, currentUser?.signupStep]); // Only depend on specific properties
  
  const providerTree = useMemo(() => {
    return (
      <UserProvider currentUser={currentUser}>
        <PermissionsProvider>
          <NetworkProvider>
            <WalkthroughProvider>
              <NotificationProvider>
                <RevenueCatProvider>
                  <PubSubProvider>
                    <ReadOrderItemsProvider>
                      <OrderItemsProvider>
                        {navigationComponent}
                      </OrderItemsProvider>
                    </ReadOrderItemsProvider>
                  </PubSubProvider>
                </RevenueCatProvider>
              </NotificationProvider>
            </WalkthroughProvider>
          </NetworkProvider>
        </PermissionsProvider>
      </UserProvider>
    );
  }, [currentUser, navigationComponent]);
  
  if (loading) {
    return <SplashScreen />;
  }

    return (
		<ShareIntentProvider
		  options={{
			debug: true,
			onResetShareIntent: () => {
			  // Handle potential navigationRef being null
			  if (navigationRef.current) {
				//navigationRef.current.navigate("HomeMain", {screen: 'HomeNew'} );
				navigationRef.current.reset({
				  index: 0,
				  routes: [{ 
					name: 'HomeMain',
					params: {
					  screen: 'HomeNew'
					}
				  }],
				});

			  } else {
				console.warn("navigationRef is not yet available. Ignoring onResetShareIntent.");
			  }
			},
		  }}
		>
            <StatusBar barStyle={'dark-content'} backgroundColor='white' />
			    <IconRegistry icons={EvaIconsPack} />
				<ApplicationProvider {...eva} customMapping={mapping} theme={{ ...eva.light, ...theme }}>
					{providerTree}
				</ApplicationProvider>
			<FlashMessage position="bottom"/>
        </ShareIntentProvider>
    )
}

const styles = StyleSheet.create({
	navButton: {marginLeft: 20}
});
