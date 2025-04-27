import React from 'react';
import { Unit, Ability, UnitItem, GrandAlliance, Faction } from '@/lib/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card } from '@tremor/react';
import HeroRaidTimelineChart from './charts/HeroRaidTimelineChart';
import { useOpenUnit } from '../page'; // Adjust path if context is defined elsewhere

// Types moved/copied from page.tsx
type SortKey = 'name' | 'xpLevel' | 'rank' | 'shards' | 'progressionIndex' | 'upgradesCount';
type SortDirection = 'asc' | 'desc';
interface SortCriterion {
  key: SortKey | null;
  direction: SortDirection;
}

interface CombatUnitsSectionProps {
  filteredAndSortedUnits: Unit[];
  totalUnitsCount: number;
  availableAlliances: GrandAlliance[];
  availableFactions: string[]; // Faction is just string in Unit type
  selectedAlliances: string[];
  setSelectedAlliances: (value: string[]) => void;
  selectedFactions: string[];
  setSelectedFactions: (value: string[]) => void;
  primarySort: SortCriterion;
  setPrimarySort: (value: SortCriterion) => void;
  secondarySort: SortCriterion;
  setSecondarySort: (value: SortCriterion) => void;
  heroPerformanceData: Map<string, { time: Date; power: number; totalDamage: number }[]>;
}

// Helper functions moved from page.tsx
const getSortValueDisplay = (unit: Unit, sortKey: SortKey | null): { label: string; value: string | number } | null => {
    if (!sortKey || sortKey === 'name') return null; 

    let label = '';
    let value: string | number | undefined;

    switch (sortKey) {
        case 'xpLevel':
            label = 'Lvl';
            value = unit.xpLevel;
            break;
        case 'rank':
            label = 'Rank';
            value = unit.rank;
            break;
        case 'shards':
            label = 'Shards';
            value = unit.shards;
            break;
        case 'progressionIndex':
            label = 'Stars';
            value = unit.progressionIndex;
            break;
        case 'upgradesCount':
            label = 'Upgrades';
            value = unit.upgrades?.length ?? 0;
            break;
        default: return null; 
    }

    if (value !== undefined && value !== null) { 
        return { label, value: typeof value === 'number' ? value.toLocaleString() : value };
    }
    return null;
}

const renderAbility = (ability: Ability) => {
    const abilityId = ability.id ?? 'unknown-ability';
    const abilityLevel = ability.level !== undefined ? ability.level : 'N/A';
    return (
        <li key={abilityId} className="text-xs">
            <span className="font-semibold">{abilityId.replace(/_/g, ' ')}:</span> Lvl {abilityLevel}
        </li>
    );
};

const renderUnitItem = (item: UnitItem) => {
    const itemName = item.name ?? item.id ?? 'Unknown Item';
    const itemLevel = item.level ?? 'N/A';
    const itemRarity = item.rarity ?? 'N/A';
    const itemSlot = item.slotId ?? 'N/A';
    const itemKey = item.id ? `${item.id}-${itemSlot}` : `unknown-${itemSlot}-${Math.random()}`;

    return (
        <li key={itemKey} className="text-xs">
            {itemName} ({itemSlot}, Lvl {itemLevel}, {itemRarity})
        </li>
    );
};


const CombatUnitsSection: React.FC<CombatUnitsSectionProps> = ({
  filteredAndSortedUnits,
  totalUnitsCount,
  availableAlliances,
  availableFactions,
  selectedAlliances,
  setSelectedAlliances,
  selectedFactions,
  setSelectedFactions,
  primarySort,
  setPrimarySort,
  secondarySort,
  setSecondarySort,
  heroPerformanceData,
}) => {
  // Use the context hook
  const { openUnitIds, toggleUnitOpen } = useOpenUnit();

  if (totalUnitsCount === 0) {
    return null; // Don't render if there are no units at all
  }

  return (
    <div className="space-y-1 text-sm">
      <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Total Units:</strong> {totalUnitsCount}</p>
      <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Filtered Units:</strong> {filteredAndSortedUnits.length}</p>

      {/* UNIT FILTER/SORT/DISPLAY CODE */} 
      <Card className="mt-4 mb-4 p-3 bg-[rgba(var(--background-start-rgb),0.6)] border border-[rgb(var(--border-color))] shadow-sm">
        <div className="space-y-3">
          {/* Filter Row */} 
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="filterAlliance" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Alliance Filter</label>
              <MultiSelect id="filterAlliance" placeholder="All Alliances..." value={selectedAlliances} onValueChange={setSelectedAlliances}>
                {availableAlliances.map(alliance => <MultiSelectItem key={alliance} value={alliance}>{alliance}</MultiSelectItem>)}
              </MultiSelect>
            </div>
            <div>
              <label htmlFor="filterFaction" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Faction Filter</label>
              <MultiSelect id="filterFaction" placeholder="All Factions..." value={selectedFactions} onValueChange={setSelectedFactions}>
                {availableFactions.map(faction => <MultiSelectItem key={faction} value={faction}>{faction}</MultiSelectItem>)}
              </MultiSelect>
            </div>
          </div>
          {/* Sorting Row */} 
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t border-[rgb(var(--border-color))] pt-3 mt-3">
            <div>
              <label htmlFor="sortKey1" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Sort By (Primary)</label>
              <Select id="sortKey1" value={primarySort.key ?? ''} onValueChange={(value) => setPrimarySort({ key: value as SortKey, direction: primarySort.direction })}> 
                <SelectItem value="xpLevel">Level</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="progressionIndex">Stars</SelectItem>
                <SelectItem value="shards">Shards</SelectItem>
                <SelectItem value="upgradesCount">Upgrades</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </Select>
            </div>
            <div>
              <label htmlFor="sortDir1" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Direction</label>
              <Select id="sortDir1" value={primarySort.direction} onValueChange={(value) => setPrimarySort({ key: primarySort.key, direction: value as SortDirection })}> 
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </Select>
            </div>
            <div>
              <label htmlFor="sortKey2" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Then By (Secondary)</label>
              <Select id="sortKey2" value={secondarySort.key ?? 'none'} onValueChange={(value) => setSecondarySort({ key: value === 'none' ? null : value as SortKey, direction: secondarySort.direction })}> 
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="xpLevel">Level</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="progressionIndex">Stars</SelectItem>
                <SelectItem value="shards">Shards</SelectItem>
                <SelectItem value="upgradesCount">Upgrades</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </Select>
            </div>
            <div>
              <label htmlFor="sortDir2" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Direction</label>
              <Select id="sortDir2" value={secondarySort.direction} onValueChange={(value) => setSecondarySort({ key: secondarySort.key, direction: value as SortDirection })} disabled={!secondarySort.key}> 
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {filteredAndSortedUnits.length > 0 ? (
          filteredAndSortedUnits.map((unit: Unit) => {
            // --- Build Dynamic Summary --- 
            const primarySortDisplay = getSortValueDisplay(unit, primarySort.key);
            const secondarySortDisplay = getSortValueDisplay(unit, secondarySort.key);

            const sortParts = [];
            if (primarySortDisplay) {
              sortParts.push(`${primarySortDisplay.label}: ${primarySortDisplay.value}`);
            }
            if (secondarySortDisplay && secondarySort.key !== primarySort.key) { 
              sortParts.push(`${secondarySortDisplay.label}: ${secondarySortDisplay.value}`);
            }

            const summaryDetails = sortParts.length > 0 ? `(${sortParts.join(', ')})` : '';
            // --- End Build Dynamic Summary ---
            
            // Get performance data for this specific unit
            const performanceData = heroPerformanceData.get(unit.id);

            // Determine if the current unit section should be open based on context
            const isOpen = openUnitIds.has(unit.id);

            return (
              <div 
                key={unit.id} 
                id={`hero-timeline-${unit.id}`} 
                className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)] scroll-mt-4"
              >
                {/* Clickable Header */}
                <div 
                  className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-sm text-[rgb(var(--foreground-rgb),0.95)] list-none"
                  onClick={(e) => {
                    toggleUnitOpen(unit.id);
                  }}
                >
                  <span>{`${unit.name || unit.id} ${summaryDetails}`.trim()}</span> 
                  {/* Show appropriate chevron based on state */}
                  {isOpen ? <ChevronUp size={18} className="opacity-70" /> : <ChevronDown size={18} className="opacity-70" />}
                </div>

                {/* Conditionally rendered content */}
                {isOpen && (
                  <div className="p-3 border-t border-[rgb(var(--border-color))] space-y-1 text-xs text-[rgb(var(--foreground-rgb),0.85)]">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <p><strong>ID:</strong> {unit.id}</p>
                      <p><strong>Faction:</strong> {unit.faction ?? 'N/A'}</p>
                      <p><strong>Alliance:</strong> {unit.grandAlliance ?? 'N/A'}</p>
                      <p><strong>XP:</strong> {unit.xp ?? 'N/A'}</p>
                      <p><strong>Stars:</strong> {unit.progressionIndex ?? 'N/A'}</p>
                      <p><strong>Shards:</strong> {unit.shards ?? 'N/A'}</p>
                      <p><strong>Upgrades:</strong> {unit.upgrades?.join(', ') ?? 'None'}</p>
                    </div>
                    {unit.abilities && unit.abilities.length > 0 && (
                      <div className="mt-2"><strong>Abilities:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {unit.abilities.map(renderAbility)}
                        </ul>
                      </div>
                    )}
                    {unit.items && unit.items.length > 0 && (
                      <div className="mt-2"><strong>Wargear:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {unit.items.map(renderUnitItem)}
                        </ul>
                      </div>
                    )}
                    {/* Render the performance chart if data exists */}
                    {performanceData && performanceData.length > 0 && (
                      <HeroRaidTimelineChart 
                         heroId={unit.name || unit.id} 
                         data={performanceData} 
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-sm text-[rgb(var(--foreground-rgb),0.7)] py-4">No units match the current filters.</p>
        )}
      </div>
      {/* END UNIT CODE */}
    </div>
  );
};

export default CombatUnitsSection; 