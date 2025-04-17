'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface DebugContextType {
  lastApiResponse: any | null;
  setLastApiResponse: (data: any | null) => void;
  isPopupOpen: boolean;
  setIsPopupOpen: Dispatch<SetStateAction<boolean>>;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [lastApiResponse, setLastApiResponse] = useState<any | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <DebugContext.Provider value={{ lastApiResponse, setLastApiResponse, isPopupOpen, setIsPopupOpen }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
} 