import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { StyleSheet, View, BackHandler, TouchableOpacity } from "react-native";
import { Text, Layout, List, ListItem, Input, Button, Divider, Icon, useTheme } from '@ui-kitten/components';
import moment from 'moment';
import { useUser } from '../main/UserContext';
import { useNotification } from '../main/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../constants/supabase';

const CloseIcon = React.memo((props) => <Icon {...props} name='close-outline'/>);
const SearchIcon = React.memo((props) => <Icon {...props} name='search-outline'/>);

// Memoized NotificationItem component
const NotificationItem = memo(({ item, index, onPress, theme }) => {
  const itemKey = `${index}-${item.notificationRead}`;
  
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

    if(notifItem.notificationTitle === 'New Order Alert!') {
      const jsonItem = notifItem.notificationData;
      const {objectId, custName, custUsername, shopName, orderDetails, orderNo, orderItem} = jsonItem || {};
      const updatedItem = { ...orderItem, username: currentUser.username, shopId: currentUser.ShopDetails.id };
      const dateFinal = orderItem.orderDate ? orderItem.orderDate : new Date();
      
      navigation.navigate('OrderDetailsMain', {
        screen: 'OrderDetails',
        params: { 
          item: updatedItem, 
          userType: currentUser.userType, 
          orderDate: dateFinal, 
          shopName: currentUser.ShopDetails.shopName, 
          shopAddress: currentUser.ShopDetails.shopAddress, 
          shopPhNo: currentUser.ShopDetails.shopPhNo, 
          isShareIntent: false, 
          custUsername: custUsername, 
          orderDetails: orderDetails 
        }
      });
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