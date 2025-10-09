import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';
import * as Application from 'expo-application';
import eventEmitter from './eventEmitter';
import { useUser } from '../main/UserContext';

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

  const checkPubSubEligibility = async (userId) => {
    try {
      const { data: devices, error: devicesError } = await supabase
        .from('user_last_device_v2')
        .select('device_id')
        .eq('user_id', userId);
		
      const multipleDevices = devices && devices.length > 1;
	  
	  console.log(multipleDevices);

      if (devicesError || !multipleDevices) {
		 return false;
      }
	  return true;
    } catch (error) {
      console.error('Error checking PubSub eligibility:', error);
      return false;
    }
  };
  
  const getOrders = useCallback((key) => {
    const cached = storage.getString(key);
    return cached ? JSON.parse(cached) : [];
  }, []);

  const saveOrders = useCallback((orders, key) => {
	  console.log(key)
	  console.log(JSON.stringify(orders))
	storage.set(key, JSON.stringify(orders));
  }, []);

  const updateCache = useCallback((type, orderData = null, prefix, itemOrderNo = null, custInserted = false) => {
	  console.log('in updateCache ' + custInserted)
    const orders = getOrders(prefix);
	console.log('orders', orders)

    if (type === 'NEW_ORDER') {
        orders.unshift(orderData);
        saveOrders(orders, prefix);
		if(custInserted) {
			console.log('inside custInserted')
			const customers = storage.getString('Customers');
			let customersArray = customers ? JSON.parse(customers) : [];
			customersArray.push({custName: orderData.custName, phoneNo: orderData.phoneNo});
			storage.set('Customers', JSON.stringify(customersArray, ['custName', 'phoneNo'])); 
		}
    } else if (type === 'UPDATE_ORDER') {
		console.log('in UPDATE_ORDER')
      const updated = orders.map(o => o.orderNo === orderData.orderNo ? orderData : o);
	  console.log('updated', updated);
	  saveOrders(updated, prefix);
    } else if (type === 'DELETE_ORDER') {
      const filtered = orders.filter(o => o.orderNo !== itemOrderNo);
      saveOrders(filtered, prefix);
    } else if (type === 'UPDATE_MEAS') {
		saveOrders(orderData, prefix);
	} else if (type === 'BULK_UPDATE_ORDER') {
		console.log('in BULK_UPDATE_ORDER')
      saveOrders(orderData, prefix);
    } else if (type === 'UPDATE_SLOTS') {
		console.log('in UPDATE_SLOTS')
		const updated = orders.map(o => o.orderNo === orderData.orderNo ? { ...o, slots: {regular: orderData.regular, express: orderData.express, total: orderData.total} } : o);
	  console.log('updated', updated);
      saveOrders(updated, prefix);
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
		console.warn('notification')
        if (notification.device_id === deviceIdRef.current) return;
		if(notification.type === 'DELETE_ORDER') {
			updateCache(notification.type, null, notification.orderStatus, notification.data);
		} else {
			updateCache(notification.type, notification.data, notification.orderStatus, null, notification.newCustomer);
		}
		console.log('emitting events')
		if(notification.type === 'NEW_ORDER' || notification.type === 'DELETE_ORDER') {
			eventEmitter.emit('storageUpdated');
		}
		eventEmitter.emit('newOrderAdded');
		eventEmitter.emit('transactionAdded');
		eventEmitter.emit('payStatusChanged');
      })
      .subscribe();

    subscriptionRef.current = sub;
  }

  const startListening = useCallback(async (userId) => {
	  console.log('in startListening')
    const isEligible = await checkPubSubEligibility(userId);
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

  const notify = useCallback(async (userId, type, orderStatus, orderData = null, itemOrderNo = null, custInserted) => {
	const isEligible = await checkPubSubEligibility(userId);
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