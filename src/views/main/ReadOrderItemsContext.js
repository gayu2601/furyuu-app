import React, { createContext, useRef, useEffect, useState, useContext, useReducer, useCallback, useMemo } from 'react';
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

const ALL_ORDER_CACHE_KEYS = [
  'Completed_false',
  'Completed_true',
  'ALL_ORDERS',
];

// Columns that exist purely in OrderItems — safe to patch without RPC
const ORDER_ITEMS_ONLY_COLS = new Set([
  'orderStatus', 'orderAmt', 'paymentStatus', 'advance',
  'paymentMode', 'paymentNotes', 'expressCharges', 'orderDate',
  'occasion', 'order_started_date', 'order_completed_date',
  'billingMovedDate', 'deliveryOptions', 'associateCustName',
  'orderNo', 'customerId', 'username', 'created_at'
]);

const isShallowUpdate = (updatedRow) =>
  Object.keys(updatedRow).every(k => ORDER_ITEMS_ONLY_COLS.has(k));

export const ReadOrderItemsProvider = ({ children }) => {
  const [readOrderItems, setReadOrderItems] = useState({});
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const { currentUser } = useUser();
  const [state, dispatch] = useReducer(filterReducer, initialState);
  const [prevOrderNo, setPrevOrderNo] = useState(0);
  
  const readOrderItemsRef = useRef({});

	// Keep ref in sync whenever state updates
	useEffect(() => {
	  readOrderItemsRef.current = readOrderItems;
	}, [readOrderItems]);
  
  const updateHasMoreOrders = useCallback((value) => {
    setHasMoreOrders(value);
  }, []);

  const updateOrderPayment = (key, orderNo, updatedPaymentData) => {
    setReadOrderItems(currentOrders => ({
      ...currentOrders,
      [key]: currentOrders[key].map(order =>
        order.orderNo === orderNo
          ? {
              ...order,
              paymentStatus: updatedPaymentData.paymentStatus,
              advance: updatedPaymentData.advance,
              paymentMode: updatedPaymentData.paymentMode,
              paymentNotes: updatedPaymentData.paymentNotes
            }
          : order
      )
    }));
  };

  const getOrders = (orderType, startDateLocal) => {
    if (orderType === 'all') {
      console.log('readOrderItems', readOrderItems);
      let orders = JSON.parse(storage.getString('ALL_ORDERS') ?? '[]');
      if (startDateLocal) {
        console.log('in startDateLocal', startDateLocal);
        const start = new Date(startDateLocal);
        const now = new Date();
        orders = orders.filter(order => {
          const oDate = new Date(order.orderDate);
          return oDate >= start && oDate <= now;
        });
      }
      return orders;
    }
    return readOrderItems[orderType] || [];
  };

  const getFilters = useCallback(() => state, [state]);

  const handleCachedOrders = async (orders, searchQuery) => {
    let filteredOrders = [...orders];
    console.log('in handleCachedOrders');

    if (searchQuery) {
      console.log('in searchQuery');
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
    console.log('getting orders from DB');
    const query = buildTailorQuery(
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
    const baseQuery = supabase.rpc('get_tailor_orders_new', {
      paramStatus: orderType,
      paramStatusEquals: statusCheckType
    });

    console.log(orderType + ',' + statusCheckType);
    return baseQuery;
  };

  const updateOrderItems = (key, newOrders, limit) => {
    console.warn('in updateOrderItems');
    setReadOrderItems(prev => {
      if (!limit) {
        return { ...prev, [key]: newOrders };
      }
      const currentItems = Array.isArray(prev[key]) ? prev[key] : [];
      return { ...prev, [key]: [...currentItems, ...newOrders] };
    });
    console.warn('prevOrderNo', prevOrderNo, newOrders[0]?.orderNo);
    if (newOrders?.length > 0) {
      const newMax = newOrders[0]?.orderNo;
      setPrevOrderNo(prev => {
        if (!prev || newMax > prev) {
          console.warn('setting prevOrderNo', newMax);
          storage.set('prevOrderNo', newMax);
          return newMax;
        }
        return prev;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // fetchEnrichedOrder
  //   Fetches a single order's full enriched data via RPC.
  // ---------------------------------------------------------------------------
  const fetchEnrichedOrder = useCallback(async (orderNo) => {
	  for (const statusEquals of [false, true]) {
		const { data, error } = await supabase
		  .rpc('get_tailor_orders_new', {
			paramStatus: 'Completed',
			paramStatusEquals: statusEquals
		  })
		  .eq('orderNo', orderNo);
		if (error) throw error;
		if (data?.length > 0) return data[0];
	  }
	  return null;
	}, []);


  // ---------------------------------------------------------------------------
  // patchOrderInCache
  //   Called by IncompleteOrders when RealtimeSync fires 'remoteOrderUpdated'.
  //   - If only OrderItems columns changed, patches directly (no RPC).
  //   - If joined columns (DressItems, Customer etc.) may have changed,
  //     fetches the full enriched row via RPC first.
  // ---------------------------------------------------------------------------
  const patchOrderInCache = useCallback(async (updatedRow) => {
	  if (!updatedRow?.orderNo) return;

	  let enriched;

	  if (updatedRow._sourceTable || !isShallowUpdate(updatedRow)) {
		try {
		  const existingOrder = Object.values(readOrderItemsRef.current)
			.flat()
			.find(o => o.orderNo === updatedRow.orderNo);
			console.log('updatedRow', updatedRow)
			console.log(Object.values(readOrderItems).flat())

		  // If we don't even have this order in local state yet, skip —
		  // it'll arrive via prependOrderToCache instead
		  if (!existingOrder) {
			console.warn('[ReadOrderItems] patchOrderInCache: order not in local state yet', updatedRow.orderNo);
			return;
		  }

		  //const orderStatus = updatedRow.orderStatus ?? existingOrder.orderStatus;
		  const match = await fetchEnrichedOrder(updatedRow.orderNo);

		  if (!match) {
			console.warn('[ReadOrderItems] patchOrderInCache: orderNo not found in either bucket', updatedRow.orderNo);
			return;
		  }
		  console.warn(match);
		  enriched = processOrderData(match);
		} catch (e) {
		  console.warn('[ReadOrderItems] patchOrderInCache fetch failed', e);
		  return;
		}
	  } else {
		enriched = updatedRow;
	  }

  ALL_ORDER_CACHE_KEYS.forEach(key => {
    const cached = storage.getString(key);
    if (cached) {
      const orders = JSON.parse(cached);
      const idx = orders.findIndex(o => o.orderNo === enriched.orderNo);
      if (idx !== -1) {
        orders[idx] = { ...orders[idx], ...enriched };
        storage.set(key, JSON.stringify(orders));
      }
    }
  });

  setReadOrderItems(prev => {
    const next = { ...prev };
    ALL_ORDER_CACHE_KEYS.forEach(key => {
      if (!Array.isArray(prev[key])) return;
      const idx = prev[key].findIndex(o => o.orderNo === enriched.orderNo);
      if (idx !== -1) {
        const updated = [...prev[key]];
        updated[idx] = { ...updated[idx], ...enriched };
        next[key] = updated;
      }
    });
    return next;
  });
}, [fetchEnrichedOrder]);

  // ---------------------------------------------------------------------------
  // prependOrderToCache
  //   Called by IncompleteOrders when RealtimeSync fires 'remoteOrderInserted'.
  //   Fetches the full enriched row via RPC and prepends to cache + state.
  //   Idempotent — skips if order already present.
  // ---------------------------------------------------------------------------
  const prependOrderToCache = useCallback(async (newRow) => {
    if (!newRow?.orderNo) return;
    console.log('[ReadOrderItems] prependOrderToCache', newRow.orderNo);

    let processed;
    try {
      const match = await fetchEnrichedOrder(newRow.orderNo);
      if (!match) {
        console.warn('[ReadOrderItems] prependOrderToCache: orderNo not found', newRow.orderNo);
        return;
      }
      processed = processOrderData(match);
    } catch (e) {
      console.warn('[ReadOrderItems] prependOrderToCache fetch failed', e);
      return;
    }

    ALL_ORDER_CACHE_KEYS.forEach(key => {
      const cached = storage.getString(key);
      if (cached) {
        const orders = JSON.parse(cached);
        if (!orders.some(o => o.orderNo === processed.orderNo)) {
          storage.set(key, JSON.stringify([processed, ...orders]));
        }
      }
    });

    setReadOrderItems(prev => {
      const next = { ...prev };
      ALL_ORDER_CACHE_KEYS.forEach(key => {
        if (!Array.isArray(prev[key])) return;
        if (!prev[key].some(o => o.orderNo === processed.orderNo)) {
          next[key] = [processed, ...prev[key]];
        }
      });
      return next;
    });
  }, [fetchEnrichedOrder]);

  const readOrdersGlobal = useCallback(async (
    searchQuery,
    orderType = null,
    statusCheckType = null,
    isDateChanged,
    startDate,
    endDate,
    offset,
    limit,
    isReset = false
  ) => {
    console.log('in readOrdersGlobal : ' + offset + ',' + limit);
    const isAllOrders = !orderType && !statusCheckType;

    const key = isAllOrders
      ? 'ALL_ORDERS'
      : `${orderType}_${statusCheckType}`;

    const from = offset;
    const to = offset + limit;

    try {
      console.log('key: ' + key);
      const cachedData = storage.getString(key);
      let cacheValue = cachedData ? JSON.parse(cachedData).slice(from, to) : [];
      console.log('isDateChanged:' + isDateChanged);

      if (!isDateChanged && !isReset && cacheValue.length > 0) {
        let filteredOrders = await handleCachedOrders(cacheValue, searchQuery);
        updateOrderItems(key, filteredOrders, limit);
      } else {
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
          console.log('setting updated orders in cache');
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
    setPrevOrderNo,
    patchOrderInCache,
    prependOrderToCache,
  }), [
    readOrdersGlobal,
    getOrders,
    state,
    hasMoreOrders,
    updateHasMoreOrders,
    updateOrderPayment,
    fetchOrdersFromDB,
    prevOrderNo,
    setPrevOrderNo,
    patchOrderInCache,
    prependOrderToCache,
  ]);

  return (
    <ReadOrderItemsContext.Provider value={contextValue}>
      {children}
    </ReadOrderItemsContext.Provider>
  );
};

export default ReadOrderItemsContext;