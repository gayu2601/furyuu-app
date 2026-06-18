// hooks/useEmployees.js
import { useState, useEffect } from 'react';
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';
import eventEmitter from '../main/eventEmitter';

const CACHE_KEY = 'Employees';

export const useEmployees = () => {
  const [workerNameOptions, setWorkerNameOptions] = useState({});
  const [loading, setLoading] = useState(true);

  const loadEmployees = async () => {
    // Show stale cache immediately while fetching
    const cached = storage.getString(CACHE_KEY);
    const cachedMap = cached && cached !== 'null' ? JSON.parse(cached) : null;
    if (cachedMap) {
      setWorkerNameOptions(cachedMap);
      setLoading(false);
    }

    // Always fetch fresh from DB
    try {
      const { data, error } = await supabase
        .from('Employee')
        .select('id, name')
        .order('name');
      if (error) throw error;

      const freshMap = {};
      data.forEach(emp => { freshMap[emp.id] = emp.name; });

      storage.set(CACHE_KEY, JSON.stringify(freshMap));
      setWorkerNameOptions(freshMap);
    } catch (e) {
      console.error('Failed to fetch employees', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();

    // Cross-device sync via Supabase Realtime
    const channel = supabase
      .channel('employee-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Employee' },
        () => {
          console.log('DB change detected, reloading employees');
          loadEmployees();
        }
      )
      .subscribe();

    // Same-device instant update
    const sub = eventEmitter.addListener('employeeUpdated', () => {
      loadEmployees();
    });

    return () => {
      supabase.removeChannel(channel);
      sub.remove();
    };
  }, []);

  return {
    workerNameOptions,
    workerIds: Object.keys(workerNameOptions),
    workerNames: Object.values(workerNameOptions),
    loading,
    refresh: loadEmployees,
  };
};