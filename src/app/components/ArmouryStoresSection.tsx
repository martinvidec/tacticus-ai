import React from 'react';
import { Inventory, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb } from '@/lib/types';
import { Box } from 'lucide-react';
import { BreadcrumbItem } from './Breadcrumbs';

interface ArmouryStoresSectionProps {
  inventory: Inventory | null | undefined;
  updateBreadcrumbs?: (newBreadcrumbs: BreadcrumbItem[]) => void;
  baseBreadcrumb?: BreadcrumbItem;
  selectedCategory: keyof Inventory | 'all';
  onSelectCategory: (category: keyof Inventory | 'all') => void;
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

// Function to format category keys into readable labels
const formatCategoryLabel = (key: string): string => {
    // Add specific handling for known keys if needed
    if (key === 'xpBooks') return 'XP Books';
    // General handling: Insert space before capital letters and capitalize
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
};

const ArmouryStoresSection: React.FC<ArmouryStoresSectionProps> = ({ 
    inventory, 
    updateBreadcrumbs, 
    baseBreadcrumb, 
    selectedCategory,
    onSelectCategory
}) => {
  if (!inventory) {
    return <p>++ No Armoury Data Available ++</p>;
  }

  // Get categories that actually have items
  const availableCategories = (Object.keys(inventory) as Array<keyof Inventory>)
     .filter(key => {
        const value = inventory[key];
        return (Array.isArray(value) && value.length > 0) || key === 'resetStones';
     });

  // Remove resetStones from filterable categories if present
  const filterableCategories = availableCategories.filter(key => key !== 'resetStones');

  // Don't render the section if empty (excluding potentially zero resetStones)
  if (availableCategories.length === 0 || (availableCategories.length === 1 && availableCategories[0] === 'resetStones' && !inventory.resetStones)) {
    return <p>++ Armoury Appears Empty ++</p>;
  }

  // Handler for category selection
  const handleCategorySelect = (category: keyof Inventory | 'all') => {
      onSelectCategory(category);
      // Update breadcrumbs if function and base item are provided
      if (updateBreadcrumbs && baseBreadcrumb) {
          if (category === 'all') {
              updateBreadcrumbs([baseBreadcrumb]);
          } else {
              updateBreadcrumbs([
                  baseBreadcrumb, // Base level
                  { label: formatCategoryLabel(category) } // Category level
              ]);
          }
      }
  };

  // Get items for the selected category
  const itemsToDisplay = selectedCategory === 'all' 
      ? filterableCategories.flatMap(key => inventory[key as keyof Inventory] as any[])
      : inventory[selectedCategory as keyof Inventory] as any[];

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
            Armoury & Stores
        </h3>
        {/* Category Tabs/Buttons */} 
        <div className="flex flex-wrap gap-2 mb-4 border-b border-[rgb(var(--border-color))] pb-2">
            <button 
                onClick={() => handleCategorySelect('all')} 
                className={`px-3 py-1 text-xs rounded-md transition-colors 
                    ${selectedCategory === 'all' 
                        ? 'bg-[rgb(var(--primary-color))] text-[rgb(var(--background-end-rgb))] font-semibold' 
                        : 'bg-[rgb(var(--highlight-bg))] hover:bg-[rgba(var(--primary-color),0.2)] text-[rgb(var(--foreground-rgb))] hover:text-[rgb(var(--primary-color))] '}
                `}
            >
                All Items
            </button>
            {filterableCategories.map(key => (
                <button 
                    key={key} 
                    onClick={() => handleCategorySelect(key)} 
                    className={`px-3 py-1 text-xs rounded-md transition-colors 
                        ${selectedCategory === key 
                            ? 'bg-[rgb(var(--primary-color))] text-[rgb(var(--background-end-rgb))] font-semibold' 
                            : 'bg-[rgb(var(--highlight-bg))] hover:bg-[rgba(var(--primary-color),0.2)] text-[rgb(var(--foreground-rgb))] hover:text-[rgb(var(--primary-color))] '}
                    `}
                >
                    {formatCategoryLabel(key)} ({(inventory[key as keyof Inventory] as any[]).length})
                </button>
            ))}
        </div>

        {/* Item List */} 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0">
           {itemsToDisplay && itemsToDisplay.length > 0 ? (
               <ul className="space-y-0 col-span-full max-h-96 overflow-y-auto">
                   {itemsToDisplay.map(renderInventoryItem)}
               </ul>
           ) : (
               <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)] col-span-full">
                   No items found in the selected category.
               </p>
           )}
        </div>

       {/* Always display reset stones separately if they exist */}
       {inventory.resetStones && (
          <p className="text-sm mt-4 pt-3 border-t border-[rgb(var(--border-color))]">
              <strong className="text-[rgb(var(--primary-color))]">Reset Stones:</strong> {inventory.resetStones}
          </p>
       )}
    </div>
  );
};

export default ArmouryStoresSection; 