import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { storage } from '../extra/storage';
import { supabase } from '../../constants/supabase';
import { useUser } from '../main/UserContext';

const PAGE_SIZE = 50;
const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  
  const getCachedNotifications = useCallback((username, startIndex, endIndex) => {
    const cacheKey = `${username}_Notifications`;
    const cachedData = storage.getString(cacheKey);
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      
      // Check if we have all requested items in cache
      if (parsed.notifications.length >= endIndex) {
        return parsed.notifications.slice(startIndex, endIndex);
      }
    }
    return null;
  }, []);
  
  const updateNotificationCount = useCallback((newCount) => {
    console.log("in updateNotificationCount: " + newCount);
    setNotificationCount(newCount);
  }, []);

  const fetchNotifications = useCallback(async (currentUser1, isNewUser, page = 0) => {
    try {
      const startIndex = page * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      
      // First check cache for requested range
      const cachedNotifications = getCachedNotifications(
        currentUser1.username, 
        startIndex, 
        endIndex
      );

      if (cachedNotifications) {
        if (page === 0) {
          setNotifications(cachedNotifications);
        } else {
          setNotifications(prev => [...prev, ...cachedNotifications]);
        }
        return;
      }

      // If not in cache or incomplete, fetch from DB
      const queryBuilder = supabase
        .from('QueuedNotifications')
        .select(`id, created_at, notificationMsg, notificationTitle, notificationData, notificationRead`)
		.order('created_at', { ascending: false });

      const queryBuilderCount = supabase
        .from('QueuedNotifications')
        .select('*', { count: 'exact', head: true })
        .eq('notificationRead', false);

      // Add user-specific filter
      if (isNewUser) {
        queryBuilder.eq('phoneNo', currentUser1.phoneNo);
        queryBuilderCount.eq('phoneNo', currentUser1.phoneNo);
      } else {
        queryBuilder.eq('username', currentUser1.username);
        queryBuilderCount.eq('username', currentUser1.username);
      }

      // Add pagination
      queryBuilder.range(startIndex, endIndex - 1);

      const [{ data, error }, { count, error: error1 }] = await Promise.all([
        queryBuilder,
        queryBuilderCount
      ]);

      if (error || error1) {
        console.error('Error fetching notifications:', error || error1);
        return;
      }

      // Update hasMore flag
      setHasMore(data?.length === PAGE_SIZE);

      // Update notification count
      setNotificationCount(count);

      // Update state based on whether this is first page or subsequent
      if (page === 0) {
        setNotifications(data || []);
      } else {
        setNotifications(prev => [...prev, ...(data || [])]);
      }

      // Update cache with all notifications we have
      const cacheKey = `${currentUser1.username}_Notifications`;
      const existingCache = storage.getString(cacheKey);
      let allCachedNotifications = [];
      
      if (existingCache) {
        const parsed = JSON.parse(existingCache);
        allCachedNotifications = parsed.notifications;
      }

      // Merge new data with existing cache, avoiding duplicates
      const mergedNotifications = [...allCachedNotifications];
      data?.forEach(notification => {
        const index = mergedNotifications.findIndex(n => n.id === notification.id);
        if (index === -1) {
          mergedNotifications[startIndex + mergedNotifications.length] = notification;
        } else {
          mergedNotifications[index] = notification;
        }
      });

      storage.set(cacheKey, JSON.stringify({
        notifications: mergedNotifications,
        count
      }));

      // Update username if new user
      if (isNewUser) {
        await supabase
          .from('QueuedNotifications')
          .update({ username: currentUser1.username })
          .eq('phoneNo', currentUser1.phoneNo);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  }, [getCachedNotifications]);
  
  const searchNotifications = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Get the filtered notifications based on search query
  const getFilteredNotifications = useCallback(() => {
    if (!searchQuery.trim()) {
      return notifications;
    }

    const lowercaseQuery = searchQuery.toLowerCase();
    return notifications.filter(notification => 
      notification.notificationTitle?.toLowerCase().includes(lowercaseQuery) || 
      notification.notificationMsg?.toLowerCase().includes(lowercaseQuery) ||
      JSON.stringify(notification.notificationData)?.toLowerCase().includes(lowercaseQuery)
    );
  }, [notifications, searchQuery]);

  const markNotificationAsRead = useCallback(async (currentUser1, notificationId) => {
    try {
      const { error } = await supabase
        .from('QueuedNotifications')
        .update({ notificationRead: true })
        .eq('id', notificationId);
	
	  if(error) {
		  throw error;
	  }

      const cacheKey = `${currentUser1.username}_Notifications`;
      const cachedData = storage.getString(cacheKey);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
		const updatedNotifications = parsed.notifications.map(notification => 
          notification.id === notificationId
            ? { ...notification, notificationRead: true }
            : notification
        );
        
        storage.set(cacheKey, JSON.stringify({
          ...parsed,
          notifications: updatedNotifications
        }));
      }

      // Update local state
      setNotificationCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, notificationRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);
  
  const contextValue = useMemo(() => ({
    notifications: getFilteredNotifications(),
        notificationCount,
        hasMore,
		searchQuery,
        searchNotifications,
        fetchNotifications,
        markNotificationAsRead,
		updateNotificationCount
  }), [getFilteredNotifications,
    notificationCount,
    hasMore,
    searchQuery,
    searchNotifications,
    fetchNotifications,
    markNotificationAsRead,
    updateNotificationCount
]);

  return (
    <NotificationContext.Provider
      value={contextValue}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
export { NotificationProvider };