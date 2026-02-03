'use client';

import { createContext, useContext } from 'react';

export interface OpenUnitContextType {
  openUnitIds: Set<string>;
  toggleUnitOpen: (unitId: string) => void;
  openCombatUnitsSection: () => void;
}

export const OpenUnitContext = createContext<OpenUnitContextType | null>(null);

export const useOpenUnit = () => {
  const context = useContext(OpenUnitContext);
  if (!context) {
    throw new Error('useOpenUnit must be used within an OpenUnitProvider');
  }
  return context;
};
