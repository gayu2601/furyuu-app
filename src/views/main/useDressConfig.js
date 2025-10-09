// useDressConfig.js
import { useState, useEffect } from 'react';
import { supabase } from '../../constants/supabase';
import { storage } from '../extra/storage';

// Singleton data store
const dressConfigStore = {
  measurementFields: null,
  loadPromise: null, // This serves as both loading state and deduplication
  isInitialized: false
};

const loadDressConfig = async (sessionUserIdParam) => {
	console.log('loadDressConfig')
  // Return existing promise if already loading
  /*if (dressConfigStore.loadPromise) {
	  console.log('inside loadDressConfig if1')
    return dressConfigStore.loadPromise;
  }*/

  // Return immediately if already loaded
  if (dressConfigStore.measurementFields && dressConfigStore.isInitialized) {
	  console.log('inside loadDressConfig if2')
    return;
  }

  dressConfigStore.loadPromise = (async () => {
    try {
      let sessionUserId = null;
      
      // Use parameter if provided, otherwise get from storage
      if (sessionUserIdParam) {
        console.log('Using sessionUserIdParam:', sessionUserIdParam);
        sessionUserId = sessionUserIdParam;
      } else {
        console.log('Getting session from storage');
        const sessionVar = storage.getString('session');
        const sessionVarJson = sessionVar ? JSON.parse(sessionVar) : null;
        
        if (sessionVarJson) {
          sessionUserId = sessionVarJson.userData;
        }
      }
	  if(sessionUserId) {
		  console.warn(sessionUserId.username);
		  const { data: fields, error: fieldsError } = await supabase.rpc("get_all_measurement_fields");
		  
		  if (fieldsError) throw fieldsError;
		  
		  // Process data
		  const fieldsMap = {};
		  console.warn('fields from useDressConfig', fields)
		  
		  fields.forEach(field => {
			const dressType = field.dress_type;
			if (!fieldsMap[dressType]) {
			  fieldsMap[dressType] = [];
			}
			fieldsMap[dressType].push({
			  key: field.field_key,
			  order: field.display_order
			});
		  });
		  
		  console.log(fieldsMap)
		  
		  // Store data
		  dressConfigStore.measurementFields = fieldsMap;
		  dressConfigStore.isInitialized = true;
		  console.log('Dress type configuration loaded from database');
      }
    } catch (error) {
      console.error('Error loading dress type configuration:', error);
	  dressConfigStore.isInitialized = true;
    } finally {
      dressConfigStore.loadPromise = null; // Clear promise when done
    }
  })();

  await dressConfigStore.loadPromise;
};

const useDressConfig = () => {
  const [data, setData] = useState({
    measurementFields: dressConfigStore.measurementFields,
    isDressConfigLoading: !dressConfigStore.isInitialized || !!dressConfigStore.loadPromise
  });

  useEffect(() => {
    const initialize = async () => {
      //await loadDressConfig();
      setData({
        measurementFields: dressConfigStore.measurementFields,
        isDressConfigLoading: false
      });
    };

    initialize();
  }, []);

  const refresh = async () => {
    // Clear store and cache
    dressConfigStore.measurementFields = null;
    dressConfigStore.loadPromise = null;
	dressConfigStore.isInitialized = false;
    
    // Reload
    setData(prev => ({ ...prev, isDressConfigLoading: true }));
    await loadDressConfig();
    setData({
      measurementFields: dressConfigStore.measurementFields,
      isDressConfigLoading: false
    });
  };

  const clearCache = () => {
    dressConfigStore.measurementFields = null;
    dressConfigStore.loadPromise = null;
	dressConfigStore.isInitialized = false;
    setData({
      measurementFields: null,
      isDressConfigLoading: false
    });
  };

  return {
    measurementFields: data.measurementFields,
    isDressConfigLoading: data.isDressConfigLoading,
    refresh,
    clearCache,
	loadDressConfig
  };
};

// Initialize immediately when module loads
//loadDressConfig();

export default useDressConfig;