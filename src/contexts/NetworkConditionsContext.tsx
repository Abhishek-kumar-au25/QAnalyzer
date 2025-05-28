
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useContext } from 'react';

export type NetworkSpeed = 'online' | 'slow-3g' | 'fast-3g' | 'offline';

interface NetworkConditionsContextType {
  currentSpeed: NetworkSpeed;
  setNetworkSpeed: (speed: NetworkSpeed) => void;
  isSimulating: boolean; // True if not 'online'
}

const NetworkConditionsContext = createContext<NetworkConditionsContextType | undefined>(undefined);

export const NetworkConditionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSpeed, setCurrentSpeed] = useState<NetworkSpeed>('online');

  const setNetworkSpeed = (speed: NetworkSpeed) => {
    setCurrentSpeed(speed);
  };

  const isSimulating = currentSpeed !== 'online';

  return (
    <NetworkConditionsContext.Provider value={{ currentSpeed, setNetworkSpeed, isSimulating }}>
      {children}
    </NetworkConditionsContext.Provider>
  );
};

export const useNetworkConditions = (): NetworkConditionsContextType => {
  const context = useContext(NetworkConditionsContext);
  if (context === undefined) {
    throw new Error('useNetworkConditions must be used within a NetworkConditionsProvider');
  }
  return context;
};
