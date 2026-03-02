import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { StyleSheet, View, BackHandler, TouchableOpacity } from "react-native";
import { Text, Layout, List, ListItem, Input, Button, Divider, Icon, useTheme } from '@ui-kitten/components';
import moment from 'moment';
import { useUser } from '../main/UserContext';
import { useReadOrderItems } from '../main/ReadOrderItemsContext';
import { useNotification } from '../main/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../constants/supabase';
import { useNavigation } from '@react-navigation/native';
import { showErrorMessage } from '../main/showAlerts';

const CloseIcon = React.memo((props) => <Icon {...props} name='close-outline'/>);
const SearchIcon = React.memo((props) => <Icon {...props} name='search-outline'/>);

// Memoized NotificationItem component
const NotificationItem = memo(({ item, index, onPress, theme }) => {
  const itemKey = `${index}-${item.notificationRead}`;
  const { navigation } = useNavigation();
  
  return (
    <ListItem 
      key={itemKey} 
      style={{ 
        borderRadius: 8, 
        backgroundColor: 'white', 
        borderLeftWidth: item.notificationRead ? 0 : 4, 
        borderLeftColor: theme['color-primary-500'],
		borderRightWidth: item.notificationRead ? 0 : 4, 
        borderRightColor: theme['color-primary-500'], 
      }} 
      onPress={() => onPress(item, index)}
    >
      <View>
        <Text category='label' style={{ fontSize: 14 }}>
          {item.notificationTitle}
        </Text>
        <View>
          <Text category='s1' style={{ fontSize: 13 }}>
            {item.notificationMsg}
          </Text>
          <View style={{ flexDirection: 'row'}}>
            <Text style={{ fontSize: 11, textAlign: 'right', width: '100%' }}>
               {moment(item.created_at).format('DD-MM-YYYY')}
            </Text>
          </View>
        </View>
      </View>
    </ListItem>
  );
});

const NotificationsScreen = ({ navigation }) => {
  const { notifications, searchQuery, searchNotifications, markNotificationAsRead, hasMore, fetchNotifications } = useNotification();
  const { getOrders } = useReadOrderItems();
  //const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const { currentUser } = useUser();
  const theme = useTheme();
  console.log(notifications)
  const loadMoreNotifs = useCallback(async () => {
	console.log('in loadMoreNotifs')
	if (!hasMore) return;
    queueMicrotask(() => {        
		fetchNotifications(currentUser, false, page, searchQuery);
		setPage(prev => prev + 1);
	});
  }, [hasMore]);

  const ListEmptyComponent = useCallback(() => (
    <Layout style={styles.emptyContainer} level="1">
      <Text category="h6">
        No notifications found
      </Text>
    </Layout>
  ), []);
  
  const ListFooterComponent = useCallback(() => (
    !hasMore && notifications.length > 0 ? (
      <Text category="s1" style={styles.footerText}>
        No more notifications
      </Text>
    ) : null
  ), [hasMore, notifications.length]);

  const handleNotifPress = useCallback(async(notifItem, index) => {
	  console.log('in handleNotifPress')
	  console.log(notifItem);
	  if(!notifItem.notificationRead) {
			markNotificationAsRead(currentUser, notifItem.id)
	  };
	  let oo = notifItem.notificationData.orderNo || notifItem.notificationData.order.orderNo
	  	const allOrders = getOrders('all', null);
		//console.log('allOrders', allOrders);
		const thisOrder = allOrders.find(
		  o => o.orderNo === oo
		);
		console.log(oo);

		console.log(thisOrder);

		if(thisOrder) {
			console.log(thisOrder);
			navigation.navigate('OrderDetailsMain', {screen: 'OrderDetails',
					params: {
						item: thisOrder,
						orderDate: moment(thisOrder.orderDate).format('DD-MM-YYYY'),
						isShareIntent: false
					}
			});
		} else {
			showErrorMessage('No order details found for this order!');
		}
  }, []);

  const renderItem = useCallback(({ item, index }) => {
    return(
		<NotificationItem 
		  item={item}
		  index={index}
		  onPress={handleNotifPress}
		  theme={theme}
		/>
  )}, []);

  const keyExtractor = useCallback((item, index) => 
    `${item.id || index}-${item.notificationRead}`, 
  []);

  const memoizedDivider = useMemo(() => <Divider />, []);

  const onClearSearch = useCallback(() => {
    setSearchQuery('');
	queueMicrotask(() => {
        fetchNotifications(currentUser, false, 0, '');
		setPage(1);
    });
  }, [searchQuery]);
  
  const handleSearch = useCallback(() => {
	queueMicrotask(() => {        
		fetchNotifications(currentUser, false, 0, searchQuery);
	});
  }, [searchQuery]);

  const renderCloseIcon = useCallback((props) => (
    <TouchableOpacity onPress={() => searchNotifications('')}>
      <CloseIcon {...props}/>
    </TouchableOpacity>
  ), [onClearSearch]);
  
  return (
    <Layout style={{ flex: 1, padding: 20 }}>
      <Input
		  placeholder="Search for keywords"
		  value={searchQuery}
		  onChangeText={searchNotifications}
		  accessoryLeft={SearchIcon}
		  accessoryRight={searchQuery ? renderCloseIcon : null}
		/>
      
      <List
        data={notifications}
        renderItem={renderItem}
        ItemSeparatorComponent={memoizedDivider}
		ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
		onEndReached={loadMoreNotifs}
        onEndReachedThreshold={0.7}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
	footerText: {
		textAlign: 'center',
		padding: 16,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	}
});

export default memo(NotificationsScreen);