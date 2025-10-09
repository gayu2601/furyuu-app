import React, { createContext, useState, useContext, useReducer, useCallback, useMemo } from 'react';
import { storage } from '../extra/storage';
import { useUser } from '../main/UserContext';
import { supabase } from '../../constants/supabase';

const ReadOrderItemsContext = createContext();

export const useReadOrderItems = () => {
  const context = useContext(ReadOrderItemsContext);
  if (!context) {
    throw new Error('useReadOrderItems must be used within a ReadOrderItemsProvider');
  }
  return context;
};

const initialState = {
  isDateChanged: false,
  startDate: new Date(),
  endDate: new Date(),
  searchQuery: ''
};

const filterReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_DATE_FILTERS':
      return {
        ...state,
        isDateChanged: true,
        startDate: action.startDate,
        endDate: action.endDate
      };
    case 'UPDATE_SEARCH_FILTER':
      return {
        ...state,
        searchQuery: action.query
      };
    case 'UPDATE_ALL':
      return {
        ...state,
        isDateChanged: action.isDateChanged,
        startDate: action.startDate,
        endDate: action.endDate,
        searchQuery: action.query
      };
    case 'RESET_FILTERS':
      return initialState;
    default:
      return state;
  }
};

const processOrderData = (order) => {
  const dressDet = groupDressTypes(order.dressType);
  const dressPics = order.dressPics.split(';').map(substring => substring.trim() ? substring.split(',') : []);
  const patternPics = order.patternPics.split(';').map(substring => substring.trim() ? substring.split(',') : []);
  const measurementPics = order.measurementPics.split(';').map(substring => substring.trim() ? substring.split(',') : []);
  
  return {
    ...order,
    dressDetails: dressDet,
    dressPics,
    patternPics,
	measurementPics
  };
};
	
const groupDressTypes = (dressTypeArray) => 
  Object.entries(dressTypeArray.reduce((acc, type) => ({
    ...acc,
    [type]: (acc[type] || 0) + 1
  }), {}))
  .map(([type, count]) => `${count} ${type}`)
  .join(', ');

export const ReadOrderItemsProvider = ({ children }) => {
  const [readOrderItems, setReadOrderItems] = useState({});
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const { currentUser } = useUser();
  const [state, dispatch] = useReducer(filterReducer, initialState);
  const [prevOrderNo, setPrevOrderNo] = useState(0);

  const updateHasMoreOrders = useCallback((value) => {
    setHasMoreOrders(value);
  }, []);
  
  const updateOrderPayment = (key, orderNo, updatedPaymentData) => {
    setReadOrderItems(currentOrders => ({
      ...currentOrders,
      [key]: currentOrders[key].map(order => 
        order.orderNo === orderNo 
          ? { ...order, 
              paymentStatus: updatedPaymentData.paymentStatus, 
              advance: updatedPaymentData.advance 
            }
          : order
      )
    }));
  };

  const getOrders = useCallback((orderType, statusCheckType) => {
	const key = `${orderType}_${statusCheckType}`;
    return readOrderItems[key] || [];
  }, [readOrderItems]);

  const getFilters = useCallback(() => state, [state]);
  
  const handleCachedOrders = async (
	  orders,
	  searchQuery
	) => {
	  let filteredOrders = [...orders];
	  console.log('in handleCachedOrders');
	  
	  // Apply search filter
	  if (searchQuery) {
		console.log('in searchQuery')
		filteredOrders = filteredOrders.filter(order => {
		  const searchField = order.custName;
		  return searchField.toLowerCase().includes(searchQuery.toLowerCase());
		});
	  }
	  return filteredOrders;
	};

	const fetchOrdersFromDB = async (
	  searchQuery,
	  isDateChanged,
	  startDate,
	  endDate,
	  from,
	  to,
	  orderType,
	  statusCheckType
	) => {
	  console.log('getting orders from DB')
	  let query;

		query = buildTailorQuery(
		  searchQuery,
		  isDateChanged,
		  startDate,
		  endDate,
		  from,
		  to,
		  orderType,
		  statusCheckType
		);
	  const { data, error } = await query;
	  
	  if (error) {
		console.error('Error fetching orders:', error);
		throw error;
	  }
	  return data || [];
	};

	const buildTailorQuery = (
	  searchQuery,
	  isDateChanged,
	  startDate,
	  endDate,
	  from,
	  to,
	  orderType,
	  statusCheckType
	) => {
	  let baseQuery = supabase.rpc("get_tailor_orders_new", {
		paramStatus: orderType,
		paramStatusEquals: statusCheckType
	  });
	  
	  console.log(orderType + ',' + statusCheckType)

	  // Apply search filter
	  /*if (searchQuery) {
		baseQuery = baseQuery.ilike('custName', `%${searchQuery}%`);
	  }

	  // Apply date filters
	  if (isDateChanged) {
		console.log('date changed')
		baseQuery = baseQuery
		  .gte('orderDate', startDate)
		  .lte('orderDate', endDate);
	  }

	  if(to === null) {
		  return baseQuery;
	  } else 
	  {
		  // Apply pagination
		  return baseQuery.range(from, to);
	  }*/
	  return baseQuery;
	};

	const updateOrderItems = (key, newOrders, limit) => {
		console.warn('in updateOrderItems')
	  setReadOrderItems(prev => {
		if (!limit) {
		  return { ...prev, [key]: newOrders };
		}
		const currentItems = Array.isArray(prev[key]) ? prev[key] : [];
		return { ...prev, [key]: [...currentItems, ...newOrders] };
	  });
	  console.warn('prevOrderNo', prevOrderNo, newOrders[0].orderNo);
	  if (newOrders?.length > 0) {
		const newMax = newOrders[0].orderNo; // since it's desc ordered
		setPrevOrderNo(prev => {
		  if (!prev || newMax > prev) {
			console.warn('setting prevOrderNo', newMax);
			storage.set('prevOrderNo', newMax);
			return newMax;
		  }
		  return prev; // keep the larger one
		});
	  }
	};

	
  const readOrdersGlobal = useCallback(async (
    searchQuery,
    orderType,
	statusCheckType,
    isDateChanged,
    startDate,
    endDate,
    offset,
    limit,
	isReset = false
  ) => {
	console.log('in readOrdersGlobal : '+ offset + ',' + limit)
    const key = `${orderType}_${statusCheckType}`;
    const from = offset;
    const to = offset + limit;

    try {
      // Try to get from cache first
	  console.log('key: ' + key)
      const cachedData = storage.getString(key);
      let cacheValue = cachedData ? JSON.parse(cachedData).slice(from, to) : [];
	  console.log('isDateChanged:' + isDateChanged)
      if (!isDateChanged && !isReset && cacheValue.length > 0) {
        let filteredOrders = await handleCachedOrders(
          cacheValue,
          searchQuery
        );
		updateOrderItems(key, filteredOrders, limit);
      } else {
        // Fetch from database
        const allOrders = await fetchOrdersFromDB(
          searchQuery,
          isDateChanged,
          startDate,
          endDate,
          from,
          to,
		  orderType,
		  statusCheckType
        );
        if (allOrders.length === 0) {
          setHasMoreOrders(false);
        }

        const processedOrders = allOrders.map(processOrderData);
        updateOrderItems(key, processedOrders, limit);

		if ((processedOrders.length > 0 || processedOrders.length === 0 && offset === 0) && !isDateChanged && !searchQuery) {
			console.log('setting updated orders in cache')
          storage.set(key, JSON.stringify(processedOrders));
        }
      }
    } catch (error) {
      console.error('Error in readOrdersGlobal:', error);
    }
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    readOrdersGlobal,
    getOrders,
    ...state,
    dispatch,
    getFilters,
    hasMoreOrders,
    setHasMoreOrders: updateHasMoreOrders,
	updateOrderPayment,
	fetchOrdersFromDB,
	prevOrderNo,
	setPrevOrderNo
  }), [
    readOrdersGlobal,
    getOrders,
    state,
    hasMoreOrders,
    updateHasMoreOrders,
	updateOrderPayment,
	fetchOrdersFromDB,
	prevOrderNo,
	setPrevOrderNo
  ]);

  return (
    <ReadOrderItemsContext.Provider value={contextValue}>
      {children}
    </ReadOrderItemsContext.Provider>
  );
};

export default ReadOrderItemsContext;