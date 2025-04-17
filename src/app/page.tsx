'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { PlayerDataResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card, Title } from '@tremor/react';

// Import Chart Components
import PowerLevelMetric from './components/charts/PowerLevelMetric';
import AllianceBarList from './components/charts/AllianceBarList';

// Helper component for collapsible sections - Themed
const CollapsibleSection: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details className="border border-[rgb(var(--border-color))] rounded-lg mb-4 overflow-hidden bg-[rgb(var(--highlight-bg))] shadow-md" onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex justify-between items-center p-3 md:p-4 bg-gradient-to-b from-[rgba(var(--border-color),0.5)] to-[rgba(var(--border-color),0.2)] hover:from-[rgba(var(--border-color),0.6)] hover:to-[rgba(var(--border-color),0.3)] cursor-pointer font-semibold text-lg text-[rgb(var(--primary-color))]">
        <div className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </summary>
      <div className="p-4 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.9)]">
        {children}
      </div>
    </details>
  );
};

// Helper type for sorting
type SortKey = 'name' | 'xpLevel' | 'rank' | 'shards' | 'progressionIndex';
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [playerData, setPlayerData] = useState<PlayerDataResponse | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- State for Sorting & Filtering --- 
  const [sortKey, setSortKey] = useState<SortKey>('xpLevel');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedAlliances, setSelectedAlliances] = useState<string[]>([]);
  const [selectedFactions, setSelectedFactions] = useState<string[]>([]);

  // --- Memoized Data for Display --- 
  const { filteredAndSortedUnits, availableAlliances, availableFactions } = useMemo(() => {
    if (!playerData?.player?.units) {
      return { filteredAndSortedUnits: [], availableAlliances: [], availableFactions: [] };
    }

    const units = playerData.player.units;

    // Extract unique alliances and factions for filter dropdowns
    const allAlliances = Array.from(new Set(units.map(u => u.grandAlliance).filter(Boolean))) as GrandAlliance[];
    const allFactions = Array.from(new Set(units.map(u => u.faction).filter(Boolean))) as string[]; // Assuming Faction is string

    // Apply Filters
    const filtered = units.filter(unit => {
        const allianceMatch = selectedAlliances.length === 0 || (unit.grandAlliance && selectedAlliances.includes(unit.grandAlliance));
        const factionMatch = selectedFactions.length === 0 || (unit.faction && selectedFactions.includes(unit.faction));
        return allianceMatch && factionMatch;
    });

    // Apply Sorting
    const sorted = [...filtered].sort((a, b) => {
      const key = sortKey; // Explicitly type key if needed, but SortKey works
      let valA: string | number | undefined;
      let valB: string | number | undefined;

      // Assign values with fallbacks for comparison
      if (key === 'name') {
          valA = a.name || a.id || ''; // Fallback to id or empty string
          valB = b.name || b.id || ''; // Fallback to id or empty string
      } else {
          // Provide 0 as fallback for numeric keys
          valA = a[key as keyof Unit] !== undefined ? a[key as keyof Unit] as number : 0; 
          valB = b[key as keyof Unit] !== undefined ? b[key as keyof Unit] as number : 0; 
      }

      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }

      return sortDirection === 'desc' ? comparison * -1 : comparison;
    });

    return { 
        filteredAndSortedUnits: sorted,
        availableAlliances: allAlliances,
        availableFactions: allFactions 
    };
  }, [playerData, sortKey, sortDirection, selectedAlliances, selectedFactions]);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!user) {
        setPlayerData(null);
        setFetchError(null);
        return;
      }

      setIsFetchingData(true);
      setFetchError(null);

      try {
        // Call the internal API route
        const response = await fetch('/api/tacticus/player');

        if (!response.ok) {
          let errorType = 'UNKNOWN_ERROR';
          try {
            const errorData: ApiError = await response.json();
            errorType = errorData.type || errorType;
          } catch (e) {
            console.error('Failed to parse error response', e);
          }
          throw new Error(`API Error: ${errorType} (Status: ${response.status})`);
        }

        const data: PlayerDataResponse = await response.json();
        setPlayerData(data);
      } catch (error) {
        console.error('Failed to fetch player data:', error);
        setFetchError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsFetchingData(false);
      }
    };

    // Fetch data only when auth is no longer loading and user exists
    if (!authLoading) {
        fetchPlayerData();
    }

    // Optional: Clear data when user logs out or auth state is still loading
    if(authLoading || !user) {
        setPlayerData(null);
        setFetchError(null);
    }

  }, [user, authLoading]); // Re-run effect when user or authLoading changes

  const renderTokens = (tokens: any, name: string) => (
    tokens && (
      // Use thematic text color
      <p className="text-sm"><strong className="text-[rgb(var(--primary-color))] font-semibold">{name} Tokens:</strong> {tokens.current}/{tokens.max} (Regen: {tokens.regenDelayInSeconds}s)</p>
    )
  );

  return (
    <main className="flex flex-col items-center p-4 md:p-8">
      {/* Thematic title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-[rgb(var(--primary-color))] uppercase tracking-wider">Tacticus Player Intel</h1>

      {authLoading ? (
        <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)]">Acquiring Servo-Skull Lock...</p>
      ) : !user ? (
        <p className="text-lg text-center text-[rgb(var(--foreground-rgb),0.8)]">++ Authentication Required: Transmit Identification via Google Relay ++</p>
      ) : (
        <div className="w-full max-w-4xl">
          {isFetchingData ? (
            <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)]">Retrieving Data Feed...</p>
          ) : fetchError ? (
            <div className="p-4 border border-red-500/50 rounded-lg bg-red-900/30 text-red-300">
               <p className="font-semibold text-red-200">++ Data Feed Corruption Detected ++</p>
               <p className="text-sm mt-1">Error: {fetchError}</p>
            </div>
          ) : playerData ? (
            <div>
              {/* REMOVED Overview Title */}
              {/* <h2 className="text-2xl font-semibold text-[rgb(var(--primary-color))] mb-4 border-b border-[rgb(var(--border-color))] pb-2">Overview</h2> */}
              
              {/* Make grid gap smaller */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                <PowerLevelMetric details={playerData.player.details} />
                <AllianceBarList units={playerData.player.units} />
                {/* Add more charts here, e.g., RankBarChart */}
              </div>

              {/* Detailed Collapsible Sections */}
              <h2 className="text-2xl font-semibold text-[rgb(var(--primary-color))] mb-4 border-b border-[rgb(var(--border-color))] pb-2">Detailed Intel</h2>

              <CollapsibleSection title="Player Identification & Vitals" icon={<ShieldCheck size={20}/>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Designation:</strong> {playerData.player.details.name}</div>
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Combat Effectiveness (Power):</strong> {playerData.player.details.powerLevel}</div>
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Last Sync:</strong> {new Date(playerData.metaData.lastUpdatedOn * 1000).toLocaleString()}</div>
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Clearance Scopes:</strong> {playerData.metaData.scopes.join(', ')}</div>
                  {playerData.metaData.apiKeyExpiresOn && <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Key Deactivation:</strong> {new Date(playerData.metaData.apiKeyExpiresOn * 1000).toLocaleString()}</div>}
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Config Hash:</strong> <span className="text-xs break-all">{playerData.metaData.configHash}</span></div>
                </div>
              </CollapsibleSection>

              {/* --- Units Section with Controls --- */}
              <CollapsibleSection 
                title={`Combat Units (${filteredAndSortedUnits.length} / ${playerData.player.units.length})`} 
                icon={<Target size={20} />}
               >
                {/* Filter & Sort Controls */}
                <Card className="mb-4 p-3 bg-[rgba(var(--background-start-rgb),0.6)] border border-[rgb(var(--border-color))] shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                     {/* Sort Key */}
                    <div>
                       <label htmlFor="sortKey" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Sort By</label>
                       <Select id="sortKey" value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                          <SelectItem value="xpLevel">Level</SelectItem>
                          <SelectItem value="rank">Rank</SelectItem>
                          <SelectItem value="progressionIndex">Stars</SelectItem>
                          <SelectItem value="shards">Shards</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                       </Select>
                    </div>
                    {/* Sort Direction */}
                    <div>
                        <label htmlFor="sortDir" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Direction</label>
                        <Select id="sortDir" value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                            <SelectItem value="desc">Descending</SelectItem>
                            <SelectItem value="asc">Ascending</SelectItem>
                        </Select>
                    </div>
                    {/* Filter Alliance */}
                    <div>
                        <label htmlFor="filterAlliance" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Alliance Filter</label>
                        <MultiSelect 
                            id="filterAlliance" 
                            placeholder="All Alliances..."
                            value={selectedAlliances}
                            onValueChange={setSelectedAlliances}
                        >
                           {availableAlliances.map(alliance => (
                              <MultiSelectItem key={alliance} value={alliance}>{alliance}</MultiSelectItem>
                           ))}
                        </MultiSelect>
                    </div>
                    {/* Filter Faction */}
                     <div>
                        <label htmlFor="filterFaction" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Faction Filter</label>
                        <MultiSelect 
                            id="filterFaction" 
                            placeholder="All Factions..."
                            value={selectedFactions}
                            onValueChange={setSelectedFactions}
                        >
                           {availableFactions.map(faction => (
                              <MultiSelectItem key={faction} value={faction}>{faction}</MultiSelectItem>
                           ))}
                        </MultiSelect>
                    </div>
                  </div>
                </Card>

                {/* Units List - Now uses filteredAndSortedUnits */}
                <div className="space-y-3">
                  {filteredAndSortedUnits.length > 0 ? (
                     filteredAndSortedUnits.map((unit: Unit) => (
                      <details key={unit.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)]">
                        <summary className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-[rgb(var(--foreground-rgb),0.95)]">
                          {/* Display sorted property clearly if not name */}
                          <span>{unit.name || unit.id} {sortKey !== 'name' ? `(${sortKey}: ${unit[sortKey]})` : `(Lvl ${unit.xpLevel})`}</span>
                          <ChevronDown size={18} className="opacity-70" />
                        </summary>
                        <div className="p-3 border-t border-[rgb(var(--border-color))] space-y-1 text-sm text-[rgb(var(--foreground-rgb),0.85)]">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <p><strong>ID:</strong> {unit.id}</p>
                              <p><strong>Faction:</strong> {unit.faction}</p>
                              <p><strong>Alliance:</strong> {unit.grandAlliance}</p>
                              <p><strong>XP:</strong> {unit.xp}</p>
                              <p><strong>Stars:</strong> {unit.progressionIndex}</p>
                              <p><strong>Upgrades:</strong> {unit.upgrades.join(', ')}</p>
                          </div>
                           <div className="mt-2"><strong>Abilities:</strong>
                            <ul className="list-disc list-inside ml-4 text-xs">
                              {unit.abilities.map((ability: Ability) => (
                                <li key={ability.id}>{ability.id} (Lvl {ability.level})</li>
                              ))}
                            </ul>
                          </div>
                          <div className="mt-2"><strong>Wargear:</strong>
                            <ul className="list-disc list-inside ml-4 text-xs">
                              {unit.items.map((item: UnitItem) => (
                                <li key={item.id}>{item.name || item.id} ({item.slotId}, Lvl {item.level}, {item.rarity})</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </details>
                    ))
                  ) : (
                    <p className="text-center text-sm text-[rgb(var(--foreground-rgb),0.7)] py-4">No units match the current filters.</p>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Armoury & Stores" icon={<Box size={20} />}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Reset Stones:</strong> {playerData.player.inventory.resetStones}</p>
                    {playerData.player.inventory.requisitionOrders && (
                        <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Requisition Orders:</strong> Reg: {playerData.player.inventory.requisitionOrders.regular}, Bless: {playerData.player.inventory.requisitionOrders.blessed}</p>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     <details><summary className="cursor-pointer font-medium text-sm">Items ({playerData.player.inventory.items.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.items, null, 2)}</pre>
                     </details>
                     <details><summary className="cursor-pointer font-medium text-sm">Shards ({playerData.player.inventory.shards.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.shards, null, 2)}</pre>
                     </details>
                     <details><summary className="cursor-pointer font-medium text-sm">XP Books ({playerData.player.inventory.xpBooks.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.xpBooks, null, 2)}</pre>
                     </details>
                     <details><summary className="cursor-pointer font-medium text-sm">Upgrades ({playerData.player.inventory.upgrades.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.upgrades, null, 2)}</pre>
                     </details>
                     <details><summary className="cursor-pointer font-medium text-sm">Components ({playerData.player.inventory.components.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.components, null, 2)}</pre>
                     </details>
                     <details><summary className="cursor-pointer font-medium text-sm">Forge Badges ({playerData.player.inventory.forgeBadges.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.forgeBadges, null, 2)}</pre>
                     </details>
                      <details><summary className="cursor-pointer font-medium text-sm">Ability Badges</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.abilityBadges, null, 2)}</pre>
                     </details>
                     <details><summary className="cursor-pointer font-medium text-sm">Orbs</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(playerData.player.inventory.orbs, null, 2)}</pre>
                     </details>
                 </div>
              </CollapsibleSection>

              <CollapsibleSection title="Mission Progress & Resources" icon={<TrendingUp size={20} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {renderTokens(playerData.player.progress.arena?.tokens, 'Arena')}
                    {renderTokens(playerData.player.progress.guildRaid?.tokens, 'Guild Raid')}
                    {renderTokens(playerData.player.progress.guildRaid?.bombTokens, 'Guild Raid Bomb')}
                    {renderTokens(playerData.player.progress.onslaught?.tokens, 'Onslaught')}
                    {renderTokens(playerData.player.progress.salvageRun?.tokens, 'Salvage Run')}
                </div>
                <hr className="my-4 border-[rgb(var(--border-color))]" />
                <h3 className="font-semibold text-lg text-[rgb(var(--primary-color))] mt-2 mb-2">Campaign Logs</h3>
                <div className="space-y-2">
                 {playerData.player.progress.campaigns.map((campaign: CampaignProgress) => (
                    <details key={campaign.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)]">
                       <summary className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-[rgb(var(--foreground-rgb),0.95)]">
                         <span>{campaign.name} ({campaign.type})</span>
                         <ChevronDown size={18} className="opacity-70" />
                       </summary>
                       <div className="p-3 border-t border-[rgb(var(--border-color))] text-sm text-[rgb(var(--foreground-rgb),0.85)]">
                          <ul className="list-disc list-inside ml-4 text-xs space-y-1">
                           {campaign.battles.map((battle: CampaignLevel) => (
                             <li key={battle.battleIndex}>Battle {battle.battleIndex}: {battle.attemptsUsed} used, {battle.attemptsLeft} left</li>
                           ))}
                          </ul>
                       </div>
                    </details>
                  ))}
                </div>
              </CollapsibleSection>

            </div>
          ) : (
            <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)]">++ No Valid Data Feed Received ++</p>
          )}
        </div>
      )}
    </main>
  );
}
