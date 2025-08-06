import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';
import * as Application from 'expo-application';
import eventEmitter from './eventEmitter';
import { useUser } from '../main/UserContext';
import { useRevenueCat } from '../main/RevenueCatContext';

// Create the PubSub Context
const PubSubContext = createContext();

// Custom hook to use PubSub context
export const usePubSub = () => {
  const context = useContext(PubSubContext);
  if (!context) {
    throw new Error('usePubSub must be used within a PubSubProvider');
  }
  return context;
};

// PubSub Provider Component
export const PubSubProvider = ({ children }) => {
  const deviceIdRef = useRef(Application.getAndroidId());
  const subscriptionRef = useRef(null);
  const [eligible, setEligible] = useState(false);
  const { currentUser } = useUser();
  
  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const checkPubSubEligibility = async (userId, isActive) => {
    try {
      const { data: devices, error: devicesError } = await supabase
        .from('user_last_device_v2')
        .select('device_id')
        .eq('user_id', userId);
		
      const multipleDevices = devices && devices.length > 1;
	  
	  console.log(multipleDevices + ',' + isActive);

      if (devicesError || !multipleDevices || !isActive) {
		 return false;
      }
	  return true;
    } catch (error) {
      console.error('Error checking PubSub eligibility:', error);
      return false;
    }
  };
  
  const getOrders = useCallback((currentUsername, orderStatus) => {
    const cached = storage.getString(`${currentUsername}_${orderStatus}`);
    return cached ? JSON.parse(cached) : [];
  }, []);

  const saveOrders = useCallback((orders, currentUsername, orderStatus) => {
	  console.log(`${currentUsername}_${orderStatus}`)
	  console.log(JSON.stringify(orders))
	storage.set(`${currentUsername}_${orderStatus}`, JSON.stringify(orders));
  }, []);

  const updateCache = useCallback((type, orderData = null, prefix, suffix, itemOrderNo = null, custInserted = false) => {
	  console.log('in updateCache ' + custInserted)
    const orders = getOrders(prefix, suffix);

    if (type === 'NEW_ORDER') {
        orders.unshift(orderData);
        saveOrders(orders, prefix, suffix);
		if(custInserted) {
			console.log('inside custInserted')
			const customers = storage.getString(prefix+'_Customers');
			let customersArray = customers ? JSON.parse(customers) : [];
			customersArray.push({custName: orderData.custName, phoneNo: orderData.phoneNo});
			storage.set(prefix+'_Customers', JSON.stringify(customersArray, ['custName', 'phoneNo'])); 
		}
    } else if (type === 'UPDATE_ORDER') {
		console.log('in UPDATE_ORDER')
      const updated = orders.map(o => o.orderNo === orderData.orderNo ? orderData : o);
	  saveOrders(updated, prefix, suffix);
    } else if (type === 'DELETE_ORDER') {
      const filtered = orders.filter(o => o.orderNo !== itemOrderNo);
      saveOrders(filtered, prefix, suffix);
    } else if (type === 'UPDATE_MEAS') {
		saveOrders(orderData, prefix, suffix);
	}
  }, [getOrders, saveOrders]);
  
  const subscriptionListener = (userId) => {
	setEligible(true);
	// Unsubscribe from previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const sub = supabase
      .channel(`user_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
		  console.log('user_notifications Change received!', payload);
        const notification = payload.new;
		console.log('notification')
        if (notification.device_id === deviceIdRef.current) return;
		if(notification.type === 'DELETE_ORDER') {
			updateCache(notification.type, null, notification.username, notification.orderStatus, notification.data);
		} else {
			updateCache(notification.type, notification.data, notification.username, notification.orderStatus, null, notification.newCustomer);
		}
		console.log('emitting events')
		if(notification.type === 'NEW_ORDER' || notification.type === 'DELETE_ORDER') {
			eventEmitter.emit('storageUpdated');
		}
		eventEmitter.emit('newOrderAdded');
		eventEmitter.emit('transactionAdded');
      })
      .subscribe();

    subscriptionRef.current = sub;
  }

  const startListening = useCallback(async (userId, isActive) => {
	  console.log('in startListening')
    const isEligible = await checkPubSubEligibility(userId, isActive);
    if (!isEligible) {
      console.log('User not eligible for PubSub - either not subscribed or single device');
	  setEligible(false);
      return false;
    }

    subscriptionListener(userId);
	return true;
  }, [checkPubSubEligibility, updateCache]);

  const stopListening = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
	  setEligible(false);
    }
  }, []);

  const notify = useCallback(async (isActive, userId, type, username, orderStatus, orderData = null, itemOrderNo = null, custInserted) => {
	const isEligible = await checkPubSubEligibility(userId, isActive);
	console.log('in notify ' + eligible + isEligible)
	console.log(orderData + ',' + itemOrderNo)
	if (!isEligible) {
      console.log('User not eligible for notifications - skipping');
	  if(eligible) {
		stopListening();  
		setEligible(false);
	  }
      return;
    }

    try {
      const { error } = await supabase.from('user_notifications').insert([{
        user_id: userId,
        device_id: deviceIdRef.current,
        type: type,
        data: orderData || itemOrderNo,
		orderStatus: orderStatus,
		username: username,
		newCustomer: custInserted
      }]);
	  if(error) {
		throw error;
	  }
	  	  
		if(isEligible && !eligible) {
			subscriptionListener(userId);
		}
    } catch (error) {
      console.error('Notification failed:', error);
    }
  }, [eligible]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    startListening,
    stopListening,
    notify,
    getOrders,
    saveOrders,
	updateCache,
	eligible,
    deviceId: deviceIdRef.current
  }), [
    startListening,
    stopListening,
    notify,
    getOrders,
    saveOrders,
    updateCache,
    eligible
  ]);

  return (
    <PubSubContext.Provider value={contextValue}>
      {children}
    </PubSubContext.Provider>
  );
};