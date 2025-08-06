import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Network from 'expo-network';

// Create a context
const NetworkContext = createContext();

// Network Provider
export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(null);

  useEffect(() => {
    const checkNetworkStatus = async () => {
      const status = await Network.getNetworkStateAsync();
      setIsConnected(status.isConnected);
    };

    checkNetworkStatus();

    // Optionally, set up a polling mechanism or listener to monitor changes
    const interval = setInterval(checkNetworkStatus, 5000);

    return () => clearInterval(interval); // Clean up interval
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
};

// Custom hook to access network status
export const useNetwork = () => useContext(NetworkContext);
