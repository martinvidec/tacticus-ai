import React from 'react';
import { Inventory, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb } from '@/lib/types';
import CollapsibleSection from './CollapsibleSection';
import { Box } from 'lucide-react';

interface ArmouryStoresSectionProps {
  inventory: Inventory | null | undefined;
}

// Helper function moved from page.tsx
const renderInventoryItem = (item: Item | Shard | XpBook | AbilityBadge | Component | ForgeBadge | Orb) => {
  const itemId = ('id' in item && item.id) || ('name' in item && item.name) || 'unknown-id';
  const itemName = ('name' in item && item.name) ? item.name : String(itemId).replace(/_/g, ' ');
  const itemCount = ('amount' in item && item.amount) ? item.amount : 0;
  
  const itemKey = `${itemId}-${'rarity' in item ? item.rarity : ''}-${itemCount}`;

  return (
    <li key={itemKey} className="flex items-center space-x-2 border-b border-[rgba(var(--border-color),0.5)] py-1 last:border-b-0 text-xs">
      <span className="font-medium text-[rgb(var(--primary-color))] capitalize">{itemName !== 'unknown-id' ? itemName : 'Unknown Item'}:</span>
      <span>{itemCount}</span>
    </li>
  );
};


const ArmouryStoresSection: React.FC<ArmouryStoresSectionProps> = ({ inventory }) => {
  if (!inventory) {
    return null;
  }

  // Filter out keys with empty arrays
  const inventoryKeys = (Object.keys(inventory) as Array<keyof Inventory>)
     .filter(key => {
        const value = inventory[key];
        // Check if it's an array and has items, or if it's the resetStones number
        return (Array.isArray(value) && value.length > 0) || key === 'resetStones';
     });

  // Don't render the section if there are no keys with items (excluding potentially zero resetStones)
  if (inventoryKeys.length === 0 || (inventoryKeys.length === 1 && inventoryKeys[0] === 'resetStones' && !inventory.resetStones)) {
    return null;
  }

  return (
    <CollapsibleSection title="Armoury & Stores" icon={<Box size={20} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(inventory) as Array<keyof Inventory>)
           .filter(key => Array.isArray(inventory[key]) && (inventory[key] as any[]).length > 0)
           .map(key => (
            <details key={key} className="mt-1">
                <summary className="cursor-pointer font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} ({(inventory[key] as any[]).length})</summary>
                <ul className="space-y-0 mt-1 max-h-60 overflow-y-auto bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded">
                    {(inventory[key] as any[]).map(renderInventoryItem)}
                </ul>
            </details>
        ))}
       {inventory.resetStones && <p className="text-sm col-span-full"><strong className="text-[rgb(var(--primary-color))]">Reset Stones:</strong> {inventory.resetStones}</p>}
      </div>
    </CollapsibleSection>
  );
};

export default ArmouryStoresSection; 