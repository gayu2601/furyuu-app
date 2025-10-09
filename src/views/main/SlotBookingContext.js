import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Create Booking Context
const SlotBookingContext = createContext();

// 2. Context Provider
export const SlotBookingProvider = ({ children }) => {
  // Structure: { date: { regular: count, express: count } }
  const [slotBookings, setSlotBookings] = useState({});

  const addBooking = (slotsToUpsert, itemId) => {
	  console.log('addBooking');
	  console.log(slotsToUpsert);
	  console.log('itemId:', itemId);
	  
	  setSlotBookings(prev => {
		const newBookings = { ...prev };
		
		// Loop through keys of the object
		Object.entries(slotsToUpsert).forEach(([slot_date, { regular = 0, express = 0, total = 0 }]) => {
		  console.log(slot_date, regular, express, total);
		  
		  // Initialize the slot_date if it doesn't exist
		  if (!newBookings[slot_date]) {
			newBookings[slot_date] = {};
		  }
		  
		  // Add or update the booking for this itemId under slot_date
		  newBookings[slot_date][itemId] = {
			regular: regular,
			express: express,
			total: total
		  };
		  
		  console.log(newBookings);
		});
		
		return newBookings;
	  });
	};

	// Modified getAllBookings function - much simpler now!
	const getAllBookings = () => {
	  const allBookings = {};
	  console.log('in getAllBookings')
	  console.log(slotBookings)
	  // Single loop through all dates
	  Object.entries(slotBookings).forEach(([slotDate, itemBookings]) => {
		let dateTotal = { regular: 0, express: 0, total: 0 };
		
		// Sum up all items for this date
		Object.values(itemBookings).forEach(booking => {
		  dateTotal.regular += booking.regular;
		  dateTotal.express += booking.express;
		  dateTotal.total += booking.total;
		});
		
		allBookings[slotDate] = dateTotal;
	  });
	  
	  return allBookings;
	};

  // Remove bookings for multiple slot dates
  const removeBooking = (slotsToRemove) => {
    setSlotBookings(prev => {
      const newBookings = { ...prev };
      
      slotsToRemove.forEach(slot => {
        const { slot_date, regular_slots = 0, express_slots = 0 } = slot;
        
        if (newBookings[slot_date]) {
          newBookings[slot_date] = {
            regular: Math.max(0, (newBookings[slot_date].regular || 0) - regular_slots),
            express: Math.max(0, (newBookings[slot_date].express || 0) - express_slots)
          };
          
          // Remove the date if both counts are 0
          if (newBookings[slot_date].regular === 0 && newBookings[slot_date].express === 0) {
            delete newBookings[slot_date];
          }
        }
      });
      
      return newBookings;
    });
  };
  
  const removeItemBooking = (itemId, slotDates) => {
	  console.log('removeBooking');
	  console.log('slotDates:', slotDates);
	  console.log('itemId:', itemId);
	  
	  setSlotBookings(prev => {
		const newBookings = { ...prev };
		
		// Loop through each slot date to remove
		slotDates.forEach(slotDate => {
		  if (newBookings[slotDate] && newBookings[slotDate][itemId]) {
			// Remove the specific item from this date
			delete newBookings[slotDate][itemId];
			
			// If no items left for this date, remove the date entirely
			if (Object.keys(newBookings[slotDate]).length === 0) {
			  delete newBookings[slotDate];
			}
			
			console.log(`Removed item ${itemId} from date ${slotDate}`);
		  }
		});
		
		console.log('Updated bookings:', newBookings);
		return newBookings;
	  });
  }

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    return slotBookings[date] || null;
  };

  // Clear all bookings (when order is placed)
  const clearAllBookings = () => {
    setSlotBookings({});
  };

  return (
    <SlotBookingContext.Provider value={{
      slotBookings,
      addBooking,
      removeBooking,
      getAllBookings,
      getBookingsForDate,
      clearAllBookings,
	  removeItemBooking
    }}>
      {children}
    </SlotBookingContext.Provider>
  );
};

// 3. Custom hook to use the context
export const useSlotBooking = () => {
  const context = useContext(SlotBookingContext);
  if (!context) {
    throw new Error('useSlotBooking must be used within SlotBookingProvider');
  }
  return context;
};