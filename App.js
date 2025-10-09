import "react-native-gesture-handler";
import React, { useEffect, useState, createRef, useRef, useMemo, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { StatusBar, Alert, TouchableOpacity, View, StyleSheet, ImageStyle, AppState } from "react-native";
import SplashScreen from './src/views/auth/SplashScreen';
import AnalyticsScreen from './src/views/main/AnalyticsScreen';
import IncomeExpenseHistoryScreen from './src/views/main/IncomeExpenseHistoryScreen';
import AddExpenseScreen from './src/views/main/AddExpenseScreen';
import { NetworkProvider } from './src/views/main/NetworkContext';
import { PubSubProvider } from './src/views/main/SimplePubSub';
import * as Network from 'expo-network';
import ProfileScreen from './src/views/auth/ProfileScreen';
import OrderBagScreen from './src/views/main/OrderBagScreen';
import HomeScreen from "./src/views/main/HomeScreen";
import HomeScreenNew from "./src/views/main/HomeScreenNew";
import ImportCustomerScreen from "./src/views/main/ImportCustomerScreen";
import HomeScreenTabView from "./src/views/main/HomeScreenTabView";
import ProductionDetailsScreen from "./src/views/main/ProductionDetailsScreen";
import ProductionDetailsViewScreen from "./src/views/main/ProductionDetailsViewScreen";
import OrderDetails from "./src/views/main/OrderDetails";
import WelcomeLoginScreen from "./src/views/auth/WelcomeLoginScreen";
import SlotBookingScreen from "./src/views/main/SlotBookingScreen";
import EditOrderDetails from "./src/views/main/EditOrderDetails";
import NotificationsScreen from "./src/views/main/NotificationsScreen";
import ShareIntentScreenTailor from "./src/views/main/ShareIntentScreenTailor";
import AttachImagesScreen from "./src/views/main/AttachImagesScreen";
import CustomDesign from "./src/views/main/CustomDesign";
import TestScreen from "./src/views/main/TestScreen";
import EmployeeOnboardingForm from "./src/views/auth/EmployeeOnboardingForm";
import EmployeeList from "./src/views/auth/EmployeeList";
import EmployeeDetail from "./src/views/auth/EmployeeDetail";
import { ArrowIosBackIcon, RefreshIcon, SettingsIcon } from "./src/views/extra/icons";
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
import { UserProvider, useUser } from "./src/views/main/UserContext";
import { PermissionsProvider, usePermissions } from "./src/views/main/PermissionsContext";
import { OrderItemsProvider } from "./src/views/main/OrderItemsContext";
import { NotificationProvider, useNotification } from './src/views/main/NotificationContext';
import { SlotBookingProvider } from './src/views/main/SlotBookingContext';
import { ReadOrderItemsProvider } from "./src/views/main/ReadOrderItemsContext";
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
import { usePubSub } from './src/views/main/SimplePubSub';
import useDressConfig from './src/views/main/useDressConfig';
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
              name="MainScreen"
			  component={DrawerNavigator}
              options={{headerShown: false}}
          />
      </Stack.Navigator>
	</NavigationContainer>
  )
}

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
					  name="EmployeeOnboardingForm"
					  component={EmployeeOnboardingForm}
					  options={({ navigation, route }) => ({
						headerTitle: getHeaderTitle(route),
						headerLeft: () => (
										  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
											onPress={() => navigation.goBack()} />
										),
					  })}
				/>
				<Stack.Screen
					  name="EmployeeList"
					  component={EmployeeList}
					  options={({ navigation, route }) => ({
						headerTitle: getHeaderTitle(route),
						headerLeft: () => (
										  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
											onPress={() => navigation.goBack()} />
										),
					  })}
				/>
				<Stack.Screen
					  name="EmployeeDetail"
					  component={EmployeeDetail}
					  options={({ navigation, route }) => ({
						headerTitle: getHeaderTitle(route),
						headerRight: () => (
							<MaterialCommunityIcons
							  name={"pencil"}
							  size={25}
							  style={{ marginRight: 20, marginLeft: -10 }}
							/>
						),
						headerLeft: () => (
										  <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}
											onPress={() => navigation.goBack()} />
										),
					  })}
				/>
		  </Stack.Navigator>
	  )
	}

const DrawerNavigator = ({ route }) => {
	
	const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  console.log(`🚪 NEW DrawerNavigator Instance: ${instanceId.current}`);

	const { currentUser, updateCurrentUser } = useUser();
	const { requestCameraPermission, requestMediaPermission } = usePermissions();
	const { startListening } = usePubSub();
	let currentUserLocal = currentUser;
	const { fetchNotifications } = useNotification();
  const [initialRoute, setInitialRoute] = useState(null);
      const appStateManager = useRef(AppStateManager.getInstance());
  	
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
  
	const activatePubSubCallback = useCallback(async(isActive) => {
				  console.log('Starting PubSub for user:', currentUserLocal.id);
				  const subscription = startListening(currentUserLocal.id, isActive);
	}, [currentUserLocal?.id]);
	
	  useEffect(() => {
		if (!currentUserLocal) return;

		console.log('Setting up AppState listener for instance:', instanceId.current);
		
		// Define callbacks for the AppState manager
		const callbacks = {
		  activatePubSub: activatePubSubCallback
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
					<Stack.Screen 
						  name="SplashScreen"
						  component={SplashScreen}
						  options={{ headerShown: false }}
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
              name="ProductionDetails"
              component={ProductionDetailsScreen}
              options={({ navigation, route }) => ({
                headerTitle: getHeaderTitle(route),
                headerLeft: () => <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => navigation.goBack()}/>,
              })}
            />
			<Stack.Screen
              name="ProductionDetailsView"
              component={ProductionDetailsViewScreen}
              options={({ navigation, route }) => ({
                headerTitle: getHeaderTitle(route),
                headerLeft: () => <TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon} onPress={() => navigation.goBack()}/>
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
					  	<MaterialCommunityIcons
						  name={"pencil"}
						  size={25}
						  style={{ marginRight: 20, marginLeft: -10 }}
						  onPress={() => {
							navigation.navigate('EditOrderDetails', { ...route.params });
						  }}
						/>
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
						headerRight: () => ( <TopNavigationAction icon={RefreshIcon} onPress={() => {navigation.setParams({ triggerSync: true });}} style={{marginRight: 20}}/>
						),
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
			
			<Stack.Screen name="SlotBooking" component={SlotBookingScreen}
						options={({ route }) => ({
						  headerTitle: getHeaderTitle(route),
						  headerLeft: () => (
							<TopNavigationAction style={styles.navButton} icon={ArrowIosBackIcon}/>
						  ),
						  headerRight: () => ( <TopNavigationAction style={{marginRight: 20}} icon={SettingsIcon}/>
						  ),
						  headerTitleStyle: {
								textTransform: 'capitalize'
							},
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

function getHeaderTitle(route) {
  const routeName = route ? route.name : 'Home';
  console.log("route:");
  console.log(route);
  switch (routeName) {
	case 'ProfileSettings':
	  return 'Profile Settings';
	case 'CustomDesign':
      return 'Draw custom design';
	case 'ImportCustomerScreen':
      return 'Select customer';
	case 'SlotBooking':
	  return 'Select Slots';
	case 'ProductionDetails':
	  return 'Assign Production Details';
	case 'ProductionDetailsView':
	  return 'Production Details';
	case 'EmployeeOnboardingForm':
		return 'Employee Onboarding';
	case 'EmployeeList':
		return 'Employee List';
	case 'EmployeeDetail':
		return 'Employee Details';	
  }
}

function getOrderDetailsTitle(route) {
	return route.params ? 'Order #' + route.params.item.orderNo: 'Order Summary';
}

function getEditOrderDetailsTitle(route) {
	return route.params ? 'Edit Order #' + route.params.item.orderNo: 'Edit Order';
}

function getHeaderTitleDress(route) {
  return route.params ? route.params.itemName: 'Select dress type';
}

export default function App() {

	  const [sessionLocal, setSessionLocal] = useState(null)
	const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(false)
	const { loadDressConfig, isDressConfigLoading } = useDressConfig();
	  
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
									.select(`*`)
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
							console.warn('calling loadDressConfig from App.js');
							await loadDressConfig(data1);
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

  const navigationComponent = useMemo(() => {
    console.log('Creating navigation component for user:', currentUser?.id);
    if (!currentUser) {
      return <AuthNavigator key="auth-register" />;
    }
	return <DrawerNavigator key="drawer-main" route={{ params: { data1: currentUser } }} />;
  }, [currentUser?.id]); // Only depend on specific properties
  
  const providerTree = useMemo(() => {
    return (
      <UserProvider currentUser={currentUser}>
        <PermissionsProvider>
          <NetworkProvider>
              <NotificationProvider>
                  <PubSubProvider>
                    <ReadOrderItemsProvider>
                      <OrderItemsProvider>
					    <SlotBookingProvider>
							{navigationComponent}
						</SlotBookingProvider>
                      </OrderItemsProvider>
                    </ReadOrderItemsProvider>
                  </PubSubProvider>
              </NotificationProvider>
          </NetworkProvider>
        </PermissionsProvider>
      </UserProvider>
    );
  }, [currentUser, navigationComponent]);
  
  if (loading || isDressConfigLoading) {
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
