import React, { useEffect, useState, useRef } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Tab, TabBar, Text, useTheme } from '@ui-kitten/components';
import HomeScreen from "../main/HomeScreen";
import { useUser } from '../main/UserContext';
import { StyleSheet } from 'react-native';

const HomeTabBar = ({ navigation, state }) => {
	const theme = useTheme();
  const onTabSelect = (index) => {
    navigation.navigate(state.routeNames[index]);
  };

  const renderTab = (route, index) => {
    const isFocused = state.index === index;
	return (
		<Tab
		  key={route}
		  title={(evaProps) => <Text {...evaProps} style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', color: isFocused ? theme['color-primary-500'] : '#ccc' }}>{route.toUpperCase()}</Text>}
		/>
  )};
  
  const shouldLoadComponent = (index) => index === state.index;

  return (
    <TabBar
      selectedIndex={state.index}
	  shouldLoadComponent={shouldLoadComponent}
	  style={styles.tabBar}
      onSelect={onTabSelect}>
      {state.routeNames.map((route, index) => renderTab(route, index))}
    </TabBar>
  );
};

const TopTab = createMaterialTopTabNavigator();

export default ({ navigation, route }) => {
	const { currentUser } = useUser();
	const userType = currentUser.userType;
	const homeScreenRef = useRef(null);
	
  useEffect(() => {
		console.log('in useEffect route.params')
		console.log(route.params)
		if (route.params?.triggerSync) {
		  handleRefreshPress();
		  route.params.triggerSync = false;
		}
	}, [route.params?.triggerSync]);
	
	const handleRefreshPress = () => {
		console.log('in handleRefreshPress')
		// Call the child's refresh method using ref
		if (homeScreenRef.current) {
		  homeScreenRef.current.onRefresh(true);
		}
	  };
	
	return (
	  <TopTab.Navigator screenOptions={{ tabBarScrollEnabled: true,
    swipeEnabled: true,
    animationEnabled: true,
    tabBarAnimationDuration: 200 }} tabBar={(props) => <HomeTabBar {...props} />}>
		<TopTab.Screen
		  name='New'
		  children={() => {
			if (route.params?.custName) {
			  return <HomeScreen orderType={'Created'} custName={route.params.custName} ref={homeScreenRef}/>;
			} else {
			  return <HomeScreen orderType={'Created'} ref={homeScreenRef}/>;
			}
		  }}
		/>
		<TopTab.Screen
		  name='In Progress'
		  children={() => {
			if (route.params?.custName) {
			  return <HomeScreen orderType={'InProgress'} custName={route.params.custName} ref={homeScreenRef}/>;
			} else {
			  return <HomeScreen orderType={'InProgress'} ref={homeScreenRef}/>;
			}
		  }}
		/>
		<TopTab.Screen
		  name='Completed'
		  children={() => {
			if (route.params?.custName) {
			  return <HomeScreen orderType={'Completed'} custName={route.params.custName} ref={homeScreenRef}/>;
			} else {
			  return <HomeScreen orderType={'Completed'} ref={homeScreenRef}/>;
			}
		  }}
		/>
	  </TopTab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 45,
  },
});