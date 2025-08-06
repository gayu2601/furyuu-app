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
  const dressAmtDet = groupDressTypesWithAmounts(order.dressType, order.stitchingAmt);
  const dressPics = order.dressPics.split(';').map(substring => substring.trim() ? substring.split(',') : []);
  const patternPics = order.patternPics.split(';').map(substring => substring.trim() ? substring.split(',') : []);

  return {
    ...order,
    dressDetails: dressDet,
    dressDetailsAmt: dressAmtDet,
    dressPics,
    patternPics
  };
};
	
const groupDressTypes = (dressTypeArray) => 
  Object.entries(dressTypeArray.reduce((acc, type) => ({
    ...acc,
    [type]: (acc[type] || 0) + 1
  }), {}))
  .map(([type, count]) => `${count} ${type}`)
  .join(', ');

const groupDressTypesWithAmounts = (dressTypeArray, stitchingAmtArray) => 
  Object.entries(dressTypeArray.reduce((acc, type, index) => ({
    ...acc,
    [type]: {
      count: (acc[type]?.count || 0) + 1,
      totalAmount: (acc[type]?.totalAmount || 0) + parseFloat(stitchingAmtArray[index])
    }
  }), {}))
  .map(([type, { count, totalAmount }]) => ({
    count,
    groupedAmt: totalAmount.toString(),
    key: type,
  }));

export const ReadOrderItemsProvider = ({ children }) => {
  const [readOrderItems, setReadOrderItems] = useState({});
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const { currentUser } = useUser();
  const [state, dispatch] = useReducer(filterReducer, initialState);

  const updateHasMoreOrders = useCallback((value) => {
    setHasMoreOrders(value);
  }, []);
  
  const updateOrderPayment = (orderType, orderNo, updatedPaymentData) => {
    setReadOrderItems(currentOrders => ({
      ...currentOrders,
      [orderType]: currentOrders[orderType].map(order => 
        order.orderNo === orderNo 
          ? { ...order, 
              paymentStatus: updatedPaymentData.paymentStatus, 
              advance: updatedPaymentData.advance 
            }
          : order
      )
    }));
  };

  const getOrders = useCallback((orderType, startDateLocal) => {
    return readOrderItems[orderType] || [];
  }, [readOrderItems]);

  const getFilters = useCallback(() => state, [state]);
  
  const handleCachedOrders = async (
	  orders,
	  orderFromIndex,
	  searchQuery,
	  userType
	) => {
	  let filteredOrders = [...orders];
	  console.log('in handleCachedOrders');
	  // Filter by worker assignment if needed
	  if (orderFromIndex === 1) {
		filteredOrders = filteredOrders.filter(order => 
		  !order.workerName || order.workerName !== currentUser.name
		);
	  } else if (orderFromIndex === 2) {
		filteredOrders = filteredOrders.filter(order => 
		  order.workerName === currentUser.name
		);
	  }

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
	  userType,
	  orderFromIndex,
	  searchQuery,
	  isDateChanged,
	  startDate,
	  endDate,
	  from,
	  to,
	  orderType
	) => {
	  console.log('getting orders from DB')
	  let query;

		query = buildTailorQuery(
		  orderFromIndex,
		  searchQuery,
		  isDateChanged,
		  startDate,
		  endDate,
		  from,
		  to,
		  orderType
		);
	  
	  const { data, error } = await query;
	  
	  if (error) {
		console.error('Error fetching orders:', error);
		throw error;
	  }

	  return data || [];
	};

	const buildTailorQuery = (
	  orderFromIndex,
	  searchQuery,
	  isDateChanged,
	  startDate,
	  endDate,
	  from,
	  to,
	  orderType
	) => {
	  let baseQuery = supabase.rpc("get_tailor_orders", {
		paramusername: currentUser.username,
		paramstatus: orderType
	  });

	  // Apply worker filters
	  if (orderFromIndex === 1) {
		baseQuery = baseQuery.or(`workerPhNo.neq.${currentUser.phoneNo},workerName.is.null`);
	  } else if (orderFromIndex === 2) {
		baseQuery = baseQuery.eq('workerPhNo', currentUser.phoneNo);
	  }

	  // Apply search filter
	  if (searchQuery) {
		baseQuery = baseQuery.ilike('custName', `%${searchQuery}%`);
	  }

	  // Apply date filters
	  if (isDateChanged) {
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
	  }
	};

	const updateOrderItems = (orderType, newOrders, offset) => {
	  setReadOrderItems(prev => {
		if (offset === 0) {
		  return { ...prev, [orderType]: newOrders };
		}
		const currentItems = Array.isArray(prev[orderType]) ? prev[orderType] : [];
		return { ...prev, [orderType]: [...currentItems, ...newOrders] };
	  });
	};

	
  const readOrdersGlobal = useCallback(async (
    searchQuery,
    orderType,
    isDateChanged,
    startDate,
    endDate,
    userType,
    offset,
    limit,
    orderFromIndex = null,
	isReset = false
  ) => {
    const key = `${currentUser.username}_${orderType}`;
    const from = offset;
    const to = offset + limit;

    try {
      // Try to get from cache first
	  console.log('key: ' + key)
      const cachedData = storage.getString(key);
      let cacheValue = cachedData ? JSON.parse(cachedData).slice(from, to) : [];

      if (!isDateChanged && !isReset && cacheValue.length > 0) {
        let filteredOrders = await handleCachedOrders(
          cacheValue,
          orderFromIndex,
          searchQuery,
          userType
        );
		updateOrderItems(orderType, filteredOrders, offset);
      } else {
        // Fetch from database
        const allOrders = await fetchOrdersFromDB(
          userType,
          orderFromIndex,
          searchQuery,
          isDateChanged,
          startDate,
          endDate,
          from,
          to,
		  orderType
        );
        if (allOrders.length === 0) {
          setHasMoreOrders(false);
        }

        const processedOrders = allOrders.map(processOrderData);
        updateOrderItems(orderType, processedOrders, offset);

		if ((processedOrders.length > 0 || processedOrders.length === 0 && offset === 0) && !isDateChanged && !searchQuery && !orderFromIndex) {
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
	fetchOrdersFromDB
  }), [
    readOrdersGlobal,
    getOrders,
    state,
    hasMoreOrders,
    updateHasMoreOrders,
	updateOrderPayment,
	fetchOrdersFromDB
  ]);

  return (
    <ReadOrderItemsContext.Provider value={contextValue}>
      {children}
    </ReadOrderItemsContext.Provider>
  );
};

export default ReadOrderItemsContext;