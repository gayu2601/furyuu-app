// OrderItemsContext.js
import React, { createContext, useContext, useReducer, useMemo, useState, useCallback } from 'react';

// Define action types
const ADD_ITEM = 'ADD_ITEM';
const ADD_ITEM_BATCH = 'ADD_ITEM_BATCH';
const UPDATE_ITEM_ATTRIBUTE = 'UPDATE_ITEM_ATTRIBUTE';
const DELETE_ITEM = 'DELETE_ITEM';
const ADD_PIC_ITEM = 'ADD_PIC_ITEM';
const RESET_ITEMS = 'RESET_ITEMS';
const UPDATE_ITEM_BATCH = 'UPDATE_ITEM_BATCH';

// Initial state
const initialState = {
  items: {}
};

// Reducer for handling state updates
const itemsReducer = (state, action) => {
  switch (action.type) {
    case ADD_ITEM: {
      const { itemKey, item } = action.payload;
      const existingItems = state.items[itemKey] || [];
      
      return {
        ...state,
        items: {
          ...state.items,
          [itemKey]: [...existingItems, item]
        }
      };
    }
	
	case ADD_ITEM_BATCH: {
      const { itemKey, newItems } = action.payload;
      
      return {
        ...state,
        items: {
          ...state.items,
          [itemKey]: [...newItems]
        }
      };
    }
    
    case UPDATE_ITEM_ATTRIBUTE: {
      const { id, itemKey, field, value } = action.payload;
      const existingItems = state.items[itemKey] || [];
      console.log('starting UPDATE_ITEM_ATTRIBUTE')
      const updatedItems = existingItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      console.log('ending UPDATE_ITEM_ATTRIBUTE')
      return {
        ...state,
        items: {
          ...state.items,
          [itemKey]: updatedItems
        }
      };
    }
	
	case UPDATE_ITEM_BATCH: {
		const { id, itemKey, propertiesToUpdate } = action.payload;
		  const existingItems = state.items[itemKey] || [];
		  console.log('starting UPDATE_ITEM_BATCH')
		  const updatedItems = existingItems.map(item => 
			item.id === id ? { ...item, ...propertiesToUpdate } : item
		  );
		  console.log('ending UPDATE_ITEM_BATCH')
		  return {
			...state,
			items: {
			  ...state.items,
			  [itemKey]: updatedItems
			}
		};
	}
    
    case DELETE_ITEM: {
      const { itemKey, id } = action.payload;
      const existingItems = state.items[itemKey] || [];
      
      const filteredItems = existingItems.filter(item => item.id !== id);
      
      return {
        ...state,
        items: {
          ...state.items,
          [itemKey]: filteredItems
        }
      };
    }
    
    case ADD_PIC_ITEM: {
      const { id, itemKey, field, uri } = action.payload;
      const existingItems = state.items[itemKey] || [];
      
      const updatedItems = existingItems.map(item => {
        if (item.id === id) {
          return { ...item, [field]: item[field].concat(uri) };
        }
        return item;
      });
      
      return {
        ...state,
        items: {
          ...state.items,
          [itemKey]: updatedItems
        }
      };
    }
    
    case RESET_ITEMS: {
		console.log('in reset items')
      const { itemKey } = action.payload;
      
      if (itemKey) {
		console.log('in itemKey if')
        const { [itemKey]: _, ...restItems } = state.items;
		console.log(restItems)
        return {
          ...state,
          items: restItems
        };
      }
	  console.log('in itemKey outside')
      return {
        ...state,
        items: {}
      };
    }
    
    default:
      return state;
  }
};

// Create context
const OrderItemsContext = createContext();

// Provider component
export const OrderItemsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(itemsReducer, initialState);
  const [orderItemsNew, setOrderItemsNew] = useState([]);
  const [newOrderCust, setNewOrderCust] = useState(null);
  const [orderItemsCount, setOrderItemsCount] = useState(0);
  
  const saveOrder = useCallback((orderData, custDetails, isDelete) => {
    if (isDelete) {
      setOrderItemsNew(orderData);
	  setOrderItemsCount(prev => Math.max(0, prev - 1));
      return;
    }

    if (orderData.length > 0 && custDetails.custName) {
      setOrderItemsNew(prev => [...prev, ...orderData]);
      setNewOrderCust(custDetails);
	  setOrderItemsCount(prev => prev + orderData.length);
    } else {
      setOrderItemsNew([]);
      setNewOrderCust(null);
	  setOrderItemsCount(0);
    }
  }, []);
  
  // Create memoized value object to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return {
      // Methods to interact with state
      addItemContext: (itemKey, item) => {
        dispatch({ 
          type: ADD_ITEM, 
          payload: { itemKey, item } 
        });
      },
	  
	  addItemBatchContext: (itemKey, newItems) => {
        dispatch({ 
          type: ADD_ITEM_BATCH, 
          payload: { itemKey, newItems } 
        });
      },
      
      updateItemAttribute: (id, itemKey, field, value) => {
        dispatch({ 
          type: UPDATE_ITEM_ATTRIBUTE, 
          payload: { id, itemKey, field, value } 
        });
      },
	  
	  updateItemAttributeBatch: (id, itemKey, propertiesToUpdate) => {
        dispatch({ 
          type: UPDATE_ITEM_BATCH, 
          payload: { id, itemKey, propertiesToUpdate } 
        });
      },
      
      deleteItemAttribute: (itemKey, id) => {
        dispatch({ 
          type: DELETE_ITEM, 
          payload: { itemKey, id } 
        });
      },
      
      addPicItem: (id, itemKey, field, uri) => {
        dispatch({ 
          type: ADD_PIC_ITEM, 
          payload: { id, itemKey, field, uri } 
        });
      },
      
      resetItemsForLabel: (itemKey) => {
        dispatch({ 
          type: RESET_ITEMS, 
          payload: { itemKey } 
        });
      },
      
      // Selector functions
      getItems: (itemKey) => {
		console.log('in getItems ' + itemKey)
		return state.items[itemKey] || [];
      },
	  
	    getNewOrder: () => orderItemsNew,
		getNewOrderCount: () => orderItemsCount,
		getNewOrderCust: () => newOrderCust,
		saveOrder,
		setNewOrderCust
    };
  }, [state, orderItemsNew, orderItemsCount, newOrderCust, saveOrder, setNewOrderCust]);
  
  return (
    <OrderItemsContext.Provider value={contextValue}>
      {children}
    </OrderItemsContext.Provider>
  );
};

// Custom hook for using the context
export const useOrderItems = () => {
  const context = useContext(OrderItemsContext);
  if (!context) {
    throw new Error('useOrderItems must be used within an OrderItemsProvider');
  }
  return context;
};