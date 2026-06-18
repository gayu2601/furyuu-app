/**
 * RealtimeSync.js
 * 
 * REPLACES: SimplePubSub.js
 * 
 * STRATEGY: Supabase Realtime row-level sync.
 *   - DB is always the single source of truth.
 *   - Local React state is a live view of the DB, not a cache.
 *   - No user_notifications table, no device-id fan-out, no MMKV cache mutations.
 *   - On any INSERT/UPDATE from *any* device, Supabase pushes the changed row
 *     directly to all subscribed devices. Each device updates its in-memory
 *     state from the payload — never from another device's cache snapshot.
 * 
 * WHY THE OLD APPROACH BROKE:
 *   The old SimplePubSub stored orders in MMKV (local storage) and synced by
 *   broadcasting full order arrays via user_notifications. When a new device
 *   logged in it would fetch fresh data from the DB *and* receive stale
 *   BULK_UPDATE_ORDER payloads in-flight, causing those payloads to overwrite
 *   the fresh fetch with outdated/wrong order statuses — cancelling live orders.
 * 
 * HOW TO MIGRATE:
 *   1. Replace `import { usePubSub } from './SimplePubSub'` with
 *      `import { useRealtimeSync } from './RealtimeSync'`
 *   2. Replace `usePubSub()` calls with `useRealtimeSync()`
 *   3. The `notify()` call is no longer needed — remove it from all mutation
 *      functions (updateOrderStatus, updateBulkStatus, handleUpdateOrder, etc.)
 *   4. `updateCache()` is also no longer needed — remove those calls too.
 *   5. Wrap your app root with <RealtimeSyncProvider> instead of <PubSubProvider>.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
// useRef kept — channelRef still needs it
import { supabase } from '../../constants/supabase';
import eventEmitter from './eventEmitter';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RealtimeSyncContext = createContext();

export const useRealtimeSync = () => {
  const ctx = useContext(RealtimeSyncContext);
  if (!ctx) throw new Error('useRealtimeSync must be used within RealtimeSyncProvider');
  return ctx;
};

// ---------------------------------------------------------------------------
// Helper: check whether this user has more than one registered device.
// Re-used from the original eligibility check, but the result no longer gates
// *local cache writes* — it only gates whether we bother subscribing at all.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const RealtimeSyncProvider = ({ children }) => {
  const channelRef = useRef(null);
  const [connected, setConnected] = useState(false);

// Get orderNo from DressItems using dress_item_id
const getOrderNoFromDressItemId = async (dressItemId) => {
  const { data, error } = await supabase
    .from('DressItems')
    .select('orderNo')
    .eq('id', dressItemId)
    .single();
  if (error) throw error;
  return data?.orderNo ?? null;
};

// Get all orderNos linked to a customerId
const getOrderNosFromCustomerId = async (customerId) => {
  const { data, error } = await supabase
    .from('OrderItems')
    .select('orderNo, orderStatus')
    .eq('customerId', customerId);
  if (error) throw error;
  return data ?? [];
};

  // ------------------------------------------------------------------
  // subscribe()
  //   Opens a Supabase Realtime channel scoped to the current user's
  //   OrderItems rows via the `username` column.
  //   No multi-device gate — subscribing on a single device is harmless.
  // ------------------------------------------------------------------

  const subscribe = useCallback(async () => {
    // Tear down any previous channel first
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnected(false);
    }

    const channel = supabase
  .channel(`orders:all`)
  // ── OrderItems ─────────────────────────────────────────────────────
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'OrderItems' },
    (payload) => {
      console.log('[RealtimeSync] OrderItems INSERT', payload.new);
      eventEmitter.emit('remoteOrderInserted', payload.new);
      eventEmitter.emit('storageUpdated');
      eventEmitter.emit('transactionAdded');
    }
  )
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'OrderItems' },
    (payload) => {
      const updated = payload.new;
      console.log('[RealtimeSync] OrderItems UPDATE', updated?.orderNo, updated?.orderStatus);
      eventEmitter.emit('remoteOrderUpdated', updated);
      eventEmitter.emit('newOrderAdded');
      eventEmitter.emit('payStatusChanged');
      if (updated?.orderStatus === 'Cancelled' || updated?.orderStatus === 'New') {
        eventEmitter.emit('storageUpdated');
        eventEmitter.emit('transactionAdded');
      }
    }
  )
  // ── DressItems ──────────────────────────────────────────────────────
	.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'DressItems' },
	  (payload) => {
		console.log('[RealtimeSync] DressItems UPDATE', payload.new);
		// Pass orderNo AND look up existing orderStatus from state on the receiving end
		eventEmitter.emit('remoteOrderUpdated', { 
		  orderNo: payload.new.orderNo,
		  _sourceTable: 'DressItems'        // signals a deep fetch is needed
		});
	  }
	)
	.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'measurements_new' },
	  async (payload) => {
		console.log('[RealtimeSync] measurements_new UPDATE', payload.new);
		const { data, error } = await supabase
		  .from('DressItems')
		  .select('orderNo')
		  .eq('id', payload.new.dress_item_id)
		  .single();
		if (error || !data?.orderNo) return;
		eventEmitter.emit('remoteOrderUpdated', {
		  orderNo: data.orderNo,
		  _sourceTable: 'measurements_new'
		});
	  }
	)
	.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Customer' },
	  async (payload) => {
		console.log('[RealtimeSync] Customer UPDATE', payload.new);
		const { data, error } = await supabase
		  .from('OrderItems')
		  .select('orderNo, orderStatus')
		  .eq('customerId', payload.new.id);
		if (error || !data?.length) return;
		// Emit for every order linked to this customer
		data.forEach(order => {
		  eventEmitter.emit('remoteOrderUpdated', {
			orderNo: order.orderNo,
			orderStatus: order.orderStatus,
			_sourceTable: 'Customer'
		  });
		});
	  }
	)
  .subscribe((status) => {
    console.log('[RealtimeSync] channel status:', status);
    setConnected(status === 'SUBSCRIBED');
  });

    channelRef.current = channel;
  }, []);

  // ------------------------------------------------------------------
  // unsubscribe()
  // ------------------------------------------------------------------

  const unsubscribe = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnected(false);
    }
  }, []);

  // Auto-subscribe when the user is available, auto-clean on unmount
  useEffect(() => {
    subscribe();
    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  // ------------------------------------------------------------------
  // Context value — deliberately minimal. No cache helpers, no notify.
  // ------------------------------------------------------------------

  const value = useMemo(
    () => ({ subscribe, unsubscribe, connected }),
    [subscribe, unsubscribe, connected]
  );

  return (
    <RealtimeSyncContext.Provider value={value}>
      {children}
    </RealtimeSyncContext.Provider>
  );
};