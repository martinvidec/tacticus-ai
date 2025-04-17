'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDebug } from '@/lib/contexts/DebugContext';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords } from 'lucide-react';
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
type SortKey = 'name' | 'xpLevel' | 'rank' | 'shards' | 'progressionIndex' | 'upgradesCount';
type SortDirection = 'asc' | 'desc';
interface SortCriterion {
  key: SortKey | null; // Allow null for secondary sort
  direction: SortDirection;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { setLastApiResponse, setIsPopupOpen } = useDebug();
  
  // --- State for API Data --- 
  const [playerData, setPlayerData] = useState<PlayerDataResponse | null>(null);
  const [guildData, setGuildData] = useState<GuildResponse | null>(null);
  const [guildRaidData, setGuildRaidData] = useState<GuildRaidResponse | null>(null);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false); // Single fetching state for simplicity
  const [fetchError, setFetchError] = useState<string | null>(null); // Combined error state

  // --- State for Sorting & Filtering --- 
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'xpLevel', direction: 'desc' });
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: null, direction: 'asc' }); // Default: no secondary sort
  
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

    // Apply Sorting with multi-level support
    const sorted = [...filtered].sort((a, b) => {
      const criteria: SortCriterion[] = [primarySort, secondarySort].filter(c => c.key !== null) as SortCriterion[];
      
      for (const criterion of criteria) {
          const key = criterion.key!;
          let valA: string | number | undefined;
          let valB: string | number | undefined;

          if (key === 'name') {
              valA = a.name || a.id || ''; 
              valB = b.name || b.id || ''; 
          } else if (key === 'upgradesCount') {
              valA = a.upgrades?.length ?? 0;
              valB = b.upgrades?.length ?? 0;
          } else {
              valA = a[key as keyof Omit<Unit, 'upgradesCount'>] !== undefined 
                    ? a[key as keyof Omit<Unit, 'upgradesCount'>] as number 
                    : 0; 
              valB = b[key as keyof Omit<Unit, 'upgradesCount'>] !== undefined 
                    ? b[key as keyof Omit<Unit, 'upgradesCount'>] as number 
                    : 0; 
          }

          let comparison = 0;
          if (valA > valB) {
            comparison = 1;
          } else if (valA < valB) {
            comparison = -1;
          }

          if (comparison !== 0) {
            // If a difference is found at this level, return the comparison result
            return criterion.direction === 'desc' ? comparison * -1 : comparison;
          }
          // If comparison is 0, continue to the next criterion (if any)
      }
      
      // If all criteria result in a tie, return 0 (keep original order relative to each other)
      return 0; 
    });

    return { 
        filteredAndSortedUnits: sorted,
        availableAlliances: allAlliances,
        availableFactions: allFactions 
    };
  }, [playerData, primarySort, secondarySort, selectedAlliances, selectedFactions]);

  // --- Fetch Logic --- 
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) {
        setPlayerData(null);
        setGuildData(null);
        setGuildRaidData(null);
        setFetchError(null);
        setLastApiResponse(null); 
        return;
      }
      
      setIsFetchingData(true);
      setFetchError(null);
      // Clear previous data before fetching new
      setPlayerData(null); 
      setGuildData(null);
      setGuildRaidData(null);
      setLastApiResponse(null); 
      
      let combinedError: string | null = null;

      // Use Promise.allSettled to fetch all endpoints concurrently and handle individual errors
      const results = await Promise.allSettled([
          fetch('/api/tacticus/player'),
          fetch('/api/tacticus/guild'),
          fetch('/api/tacticus/guildRaid')
      ]);

      // Process Player Data
      const playerResult = results[0];
      if (playerResult.status === 'fulfilled') {
          const response = playerResult.value;
          if (!response.ok) {
              let errorType = 'PLAYER_FETCH_FAILED';
              let errorData: ApiError | null = null;
              try { errorData = await response.json(); errorType = errorData?.type || errorType; } catch (e) {}
              setLastApiResponse({ endpoint:'player', status: response.status, error: errorData || { type: errorType } });
              combinedError = combinedError ? `${combinedError}; Player: ${errorType}` : `Player: ${errorType}`;
          } else {
              const data: PlayerDataResponse = await response.json();
              setPlayerData(data);
              setLastApiResponse({ endpoint: 'player', data }); // Store successful response
          }
      } else {
          console.error('Fetch error for player data:', playerResult.reason);
          combinedError = combinedError ? `${combinedError}; Player: FETCH_ERROR` : `Player: FETCH_ERROR`;
          setLastApiResponse({ endpoint: 'player', error: { type: 'FETCH_ERROR', reason: playerResult.reason?.message } });
      }

      // Process Guild Data
      const guildResult = results[1];
      if (guildResult.status === 'fulfilled') {
           const response = guildResult.value;
           // Guild endpoint returns 404 if not in guild, treat as non-fatal
           if (response.status === 404) { 
               setGuildData(null); 
               setLastApiResponse({ endpoint: 'guild', status: 404, data: { message: 'Player not in a guild.' } });
           } else if (!response.ok) {
              let errorType = 'GUILD_FETCH_FAILED';
              let errorData: ApiError | null = null;
              try { errorData = await response.json(); errorType = errorData?.type || errorType; } catch (e) {}
              setLastApiResponse({ endpoint: 'guild', status: response.status, error: errorData || { type: errorType } });
              combinedError = combinedError ? `${combinedError}; Guild: ${errorType}` : `Guild: ${errorType}`;
           } else {
              const data: GuildResponse = await response.json();
              setGuildData(data);
              setLastApiResponse({ endpoint: 'guild', data }); 
           }
      } else {
          console.error('Fetch error for guild data:', guildResult.reason);
          combinedError = combinedError ? `${combinedError}; Guild: FETCH_ERROR` : `Guild: FETCH_ERROR`;
          setLastApiResponse({ endpoint: 'guild', error: { type: 'FETCH_ERROR', reason: guildResult.reason?.message } });
      }

      // Process Guild Raid Data
      const raidResult = results[2];
      if (raidResult.status === 'fulfilled') {
            const response = raidResult.value;
            // Raid endpoint also returns 404 if not in guild/no raid data
            if (response.status === 404) {
                setGuildRaidData(null); 
                setLastApiResponse({ endpoint: 'guildRaid', status: 404, data: { message: 'No current raid data found.' } });
            } else if (!response.ok) {
              let errorType = 'RAID_FETCH_FAILED';
              let errorData: ApiError | null = null;
              try { errorData = await response.json(); errorType = errorData?.type || errorType; } catch (e) {}
              setLastApiResponse({ endpoint: 'guildRaid', status: response.status, error: errorData || { type: errorType } });
              combinedError = combinedError ? `${combinedError}; Raid: ${errorType}` : `Raid: ${errorType}`;
           } else {
              const data: GuildRaidResponse = await response.json();
              setGuildRaidData(data);
              setLastApiResponse({ endpoint: 'guildRaid', data }); 
           }
      } else {
          console.error('Fetch error for guild raid data:', raidResult.reason);
          combinedError = combinedError ? `${combinedError}; Raid: FETCH_ERROR` : `Raid: FETCH_ERROR`;
          setLastApiResponse({ endpoint: 'guildRaid', error: { type: 'FETCH_ERROR', reason: raidResult.reason?.message } });
      }

      // Set combined error message if any fetch failed seriously (excluding 404s handled)
      if (combinedError) {
          setFetchError(combinedError);
      }
      
      setIsFetchingData(false);
    };

    if (!authLoading) { fetchAllData(); }
    
    // Cleanup on unmount or when auth is loading
    if(authLoading) { 
        setPlayerData(null);
        setGuildData(null);
        setGuildRaidData(null);
        setFetchError(null);
        setLastApiResponse(null);
    }
  // Removed fetchError from dependencies to avoid potential loops if error setting logic has issues
  }, [user, authLoading, setLastApiResponse]); 

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

              {/* --- Guild Section --- */}
              <CollapsibleSection title="Guild Affiliation" icon={<Users size={20} />}>
                {guildData?.guild ? (
                  <div className="space-y-2 text-sm">
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Name:</strong> {guildData.guild.name} [{guildData.guild.guildTag}]</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Level:</strong> {guildData.guild.level}</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Members:</strong> {guildData.guild.members.length}</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Available Raid Seasons:</strong> {guildData.guild.guildRaidSeasons.join(', ')}</p>
                    <details className="mt-2">
                        <summary className="cursor-pointer font-medium">Members List ({guildData.guild.members.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(guildData.guild.members, null, 2)}</pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No guild data found (Player might not be in a guild).</p>
                )}
              </CollapsibleSection>

               {/* --- Guild Raid Section (Current Season) --- */}
              <CollapsibleSection title="Guild Raid Intel (Current Season)" icon={<Swords size={20} />}>
                {guildRaidData?.entries ? (
                   <div className="space-y-2 text-sm">
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Season:</strong> {guildRaidData.season}</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Config ID:</strong> {guildRaidData.seasonConfigId}</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Recorded Entries:</strong> {guildRaidData.entries.length}</p>
                    <details className="mt-2">
                        <summary className="cursor-pointer font-medium">Raid Entries ({guildRaidData.entries.length})</summary>
                        <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-60 overflow-auto">{JSON.stringify(guildRaidData.entries, null, 2)}</pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No current guild raid data found.</p>
                )}
              </CollapsibleSection>

              {/* --- Units Section with Controls --- */}
              <CollapsibleSection 
                title={`Combat Units (${filteredAndSortedUnits.length} / ${playerData.player.units.length})`} 
                icon={<Target size={20} />}
               >
                {/* Filter & Sort Controls */}
                <Card className="mb-4 p-3 bg-[rgba(var(--background-start-rgb),0.6)] border border-[rgb(var(--border-color))] shadow-sm">
                  {/* Split controls into two rows: Filters first, then Sorting */}
                  <div className="space-y-3">
                    {/* Filter Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {/* Sorting Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t border-[rgb(var(--border-color))] pt-3 mt-3">
                         {/* Primary Sort Key */}
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
                        {/* Primary Sort Direction */}
                        <div>
                            <label htmlFor="sortDir1" className="block text-xs font-medium text-[rgb(var(--foreground-rgb),0.7)] mb-1">Direction</label>
                            <Select id="sortDir1" value={primarySort.direction} onValueChange={(value) => setPrimarySort({ key: primarySort.key, direction: value as SortDirection })}>
                                <SelectItem value="desc">Descending</SelectItem>
                                <SelectItem value="asc">Ascending</SelectItem>
                            </Select>
                        </div>
                         {/* Secondary Sort Key */}
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
                        {/* Secondary Sort Direction */}
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

                {/* Units List - Now uses filteredAndSortedUnits */}
                <div className="space-y-3">
                  {filteredAndSortedUnits.length > 0 ? (
                     filteredAndSortedUnits.map((unit: Unit) => (
                      <details key={unit.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)]">
                        <summary className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-[rgb(var(--foreground-rgb),0.95)]">
                          {/* Display primary sorted property clearly */}
                          <span>{unit.name || unit.id} { 
                              primarySort.key === 'name' ? `(Lvl ${unit.xpLevel})` :
                              primarySort.key === 'upgradesCount' ? `(Upgrades: ${unit.upgrades?.length ?? 0})` : 
                               primarySort.key ? `(${primarySort.key}: ${unit[primarySort.key as keyof Unit]})` : '' // Check if primary key exists
                          }</span>
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
