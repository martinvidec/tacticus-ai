'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useDebug } from '@/lib/contexts/DebugContext';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction, Player, GuildMember } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords, KeyRound, AlertTriangle, ArrowUp, ArrowDown, SettingsIcon, RefreshCw } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card, Title, Button, TextInput, Metric, Grid } from '@tremor/react';
import { getUserApiKeyStatus } from '@/lib/actions';

// Import Metrics using relative path from src/app/
import PowerLevelMetric from './components/charts/PowerLevelMetric';
import PlayerNameMetric from './components/charts/PlayerNameMetric';
import RaidDamageMetric from './components/charts/RaidDamageMetric';
import RaidParticipationMetric from './components/charts/RaidParticipationMetric';
// Other charts...
import AllianceBarList from './components/charts/AllianceBarList';
import BossCompositionPerformance from './components/charts/BossCompositionPerformance';

// Helper component for collapsible sections - Themed
const CollapsibleSection: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details className="border border-[rgb(var(--border-color))] rounded-lg mb-4 overflow-hidden bg-[rgba(var(--background-end-rgb),0.4)] shadow-md" onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex justify-between items-center p-3 md:p-4 bg-gradient-to-b from-[rgba(var(--border-color),0.3)] to-[rgba(var(--border-color),0.1)] hover:from-[rgba(var(--border-color),0.4)] hover:to-[rgba(var(--border-color),0.2)] cursor-pointer font-semibold text-base md:text-lg text-[rgb(var(--primary-color))]">
        <div className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
      </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </summary>
      <div className="p-3 md:p-4 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.9)]">
        {children}
      </div>
    </details>
  );
};

// Helper type for sorting
type SortKey = 'name' | 'xpLevel' | 'rank' | 'shards' | 'progressionIndex' | 'upgradesCount';
type SortDirection = 'asc' | 'desc';
interface SortCriterion {
  key: SortKey | null;
  direction: SortDirection;
}

// Helper function to get display string for a sort key
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

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { setLastApiResponse, setIsPopupOpen } = useDebug();
  
  // States for data - Initial values handle the reset on mount/remount
  const [playerData, setPlayerData] = useState<PlayerDataResponse | null>(null);
  const [guildData, setGuildData] = useState<GuildResponse | null>(null);
  const [allSeasonsRaidData, setAllSeasonsRaidData] = useState<Record<number, GuildRaidResponse>>({});
  const [isFetchingBaseData, setIsFetchingBaseData] = useState<boolean>(false);
  const [isFetchingSeasonData, setIsFetchingSeasonData] = useState<boolean>(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false); 
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [tacticusUserId, setTacticusUserId] = useState<string | null>(null);
  const [apiKeyStatusLoading, setApiKeyStatusLoading] = useState<boolean>(true);

  // --- State for Sorting & Filtering --- 
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'xpLevel', direction: 'desc' });
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: null, direction: 'asc' });
  const [selectedAlliances, setSelectedAlliances] = useState<string[]>([]);
  const [selectedFactions, setSelectedFactions] = useState<string[]>([]);

  // --- Memoized Data for Display --- 
  const { filteredAndSortedUnits, availableAlliances, availableFactions } = useMemo(() => {
    if (!playerData?.player?.units) {
      return { filteredAndSortedUnits: [], availableAlliances: [], availableFactions: [] };
    }
    
    const units = playerData.player.units;
    
    const allAlliances = Array.from(new Set(units.map(u => u.grandAlliance).filter((a): a is GrandAlliance => !!a)));
    const allFactions = Array.from(new Set(units.map(u => u.faction).filter((f): f is string => !!f)));
    
    const filtered = units.filter(unit => 
      (selectedAlliances.length === 0 || (unit.grandAlliance && selectedAlliances.includes(unit.grandAlliance))) &&
      (selectedFactions.length === 0 || (unit.faction && selectedFactions.includes(unit.faction)))
    );

    const sorted = [...filtered].sort((a, b) => {
      // Explicitly type criteria based on the filter type guard
      const criteria: (SortCriterion & { key: SortKey })[] = [primarySort, secondarySort]
        .filter((c): c is SortCriterion & { key: SortKey } => c.key !== null);
      
      for (const criterion of criteria) {
          // Now criterion.key is guaranteed to be non-null by the filter
          const key = criterion.key; 
          let valA: string | number | undefined;
          let valB: string | number | undefined;

          if (key === 'name') {
              valA = a.name ?? a.id ?? ''; 
              valB = b.name ?? b.id ?? '';
          } else if (key === 'upgradesCount') {
              valA = a.upgrades?.length ?? 0; 
              valB = b.upgrades?.length ?? 0;
          } else {
              valA = key in a ? a[key as keyof Unit] as number | undefined : undefined;
              valB = key in b ? b[key as keyof Unit] as number | undefined : undefined;
              valA = valA ?? 0;
              valB = valB ?? 0;
          }

          let comparison = 0;
          if (typeof valA === 'string' && typeof valB === 'string') {
              comparison = valA.localeCompare(valB);
          } else if (typeof valA === 'number' && typeof valB === 'number') {
             comparison = valA - valB;
          }
          else if (valA !== undefined && valB !== undefined) {
             comparison = String(valA).localeCompare(String(valB));
          } else {
             comparison = valA === undefined ? (valB === undefined ? 0 : -1) : 1;
          }

          if (comparison !== 0) {
            return criterion.direction === 'desc' ? comparison * -1 : comparison;
          }
      }
      return 0;
    });
    return { filteredAndSortedUnits: sorted, availableAlliances: allAlliances, availableFactions: allFactions };
  }, [playerData, primarySort, secondarySort, selectedAlliances, selectedFactions]);

  // --- Refactored Fetch Logic --- 
  const handleFetchBaseData = useCallback(async () => {
    if (!user) return;
    console.log("[FetchFn] Fetching Player & Guild data for user:", user.uid);
    setIsFetchingBaseData(true);
    setFetchError(null); 

    // Fetch Key Status *before* fetching player/guild data
    // This ensures we know if a key is configured before attempting data fetches
    setApiKeyStatusLoading(true);
    let keyStatusResult: Awaited<ReturnType<typeof getUserApiKeyStatus>> | null = null;
    try {
        keyStatusResult = await getUserApiKeyStatus(user.uid);
        setTacticusUserId(keyStatusResult.tacticusUserId || null);
        console.log("[FetchFn] Fetched Key Status. HasKey:", keyStatusResult.hasKey, "TacticusID:", keyStatusResult.tacticusUserId);
        if (!keyStatusResult.hasKey) {
            setFetchError('API_KEY_REQUIRED');
            setIsFetchingBaseData(false); // Stop base data fetch if no key
            setApiKeyStatusLoading(false);
            return; // Don't proceed to fetch Tacticus data
        }
    } catch (err) {
        console.error("[FetchFn] Error fetching API key status:", err);
        setFetchError('Failed to check API key status.');
        setIsFetchingBaseData(false);
        setApiKeyStatusLoading(false);
        return;
    }
    setApiKeyStatusLoading(false);
    // --- End Key Status Fetch ---

    // Now proceed with fetching Tacticus data only if key exists
    let idToken: string | null = null;
    try { idToken = await user.getIdToken(); }
    catch (error) { 
        console.error("[FetchFn] Token Error:", error);
        setFetchError("Token Error"); 
        setIsFetchingBaseData(false); 
        return; 
    }
    if (!idToken) { 
        console.error("[FetchFn] Token is null.");
        setFetchError("Token Error"); 
        setIsFetchingBaseData(false); 
        return; 
    }
    
    const fetchOptions = { headers: { 'Authorization': `Bearer ${idToken}` } };
    let apiKeyIsMissing = false;
    let baseFetchErrors: string[] = [];

    const results = await Promise.allSettled([
      fetch('/api/tacticus/player', fetchOptions),
      fetch('/api/tacticus/guild', fetchOptions),
    ]);

    // Process Player
    const playerResult = results[0];
    if (playerResult.status === 'fulfilled' && playerResult.value.ok) {
      try { 
          const rawPlayerData = await playerResult.value.json();
          setPlayerData(rawPlayerData);
       } catch (e) { baseFetchErrors.push("player:PARSE_ERROR"); }
    } else {
       let errorType = 'player:FETCH_ERROR';
       if (playerResult.status === 'fulfilled') {
           try { 
               const errorData: ApiError | null = await playerResult.value.json();
               errorType = `player:${errorData?.type || playerResult.value.status + '_ERROR'}`;
               if (playerResult.value.status === 403 && errorData?.type?.includes('API Key not configured')) apiKeyIsMissing = true;
           } catch(e) {}
       } 
       baseFetchErrors.push(errorType); 
    }
    
    // Process Guild
    const guildResult = results[1];
    if (guildResult.status === 'fulfilled' && guildResult.value.ok) {
      try { 
          const data = await guildResult.value.json();
          setGuildData(data as GuildResponse);
          const seasons = data?.guild?.guildRaidSeasons;
          if (Array.isArray(seasons)) {
              console.log("[FetchFn] Found seasons:", seasons);
              setAvailableSeasons(seasons.sort((a, b) => b - a));
          }
       } catch (e) { baseFetchErrors.push("guild:PARSE_ERROR"); }
    } else {
       let errorType = 'guild:FETCH_ERROR';
       if (guildResult.status === 'fulfilled') {
           if (guildResult.value.status !== 404) { // Ignore 'not in guild'
               try { 
                   const errorData: ApiError | null = await guildResult.value.json();
                   errorType = `guild:${errorData?.type || guildResult.value.status + '_ERROR'}`;
                   if (guildResult.value.status === 403 && errorData?.type?.includes('API Key not configured')) apiKeyIsMissing = true;
               } catch(e) {}
               baseFetchErrors.push(errorType);
           }
       }
       else { baseFetchErrors.push(errorType); }
    }

    if (apiKeyIsMissing) {
      setFetchError('API_KEY_REQUIRED');
    } else if (baseFetchErrors.length > 0) {
      setFetchError(baseFetchErrors.join('; '));
    }

    setIsFetchingBaseData(false);
    console.log("[FetchFn] Finished Player & Guild fetch.");
  }, [user]);

  const handleFetchSeasonData = useCallback(async () => {
    if (!user || availableSeasons.length === 0) return; 

    console.log(`[FetchFn] Starting fetch for seasons: ${availableSeasons.join(', ')}`);
    setIsFetchingSeasonData(true);
    setAllSeasonsRaidData({}); 

    let idToken: string | null = null;
    try { 
        idToken = await user.getIdToken(); 
        console.log("[FetchFn] Got ID Token for season fetch.");
    }
    catch (error) { 
        console.error("[FetchFn] Error getting ID token for seasons:", error);
        setFetchError(prev => [prev, "Token Error (S)"].filter(Boolean).join('; ')); 
        setIsFetchingSeasonData(false); 
        return; 
    }
    if (!idToken) { 
        console.error("[FetchFn] ID Token is null for seasons.");
        setFetchError(prev => [prev, "Token Error (S)"].filter(Boolean).join('; ')); 
        setIsFetchingSeasonData(false); 
        return; 
    }
    
    const fetchOptions = { headers: { 'Authorization': `Bearer ${idToken}` } };
    let seasonFetchErrors: string[] = [];
    const fetchedSeasonsData: Record<number, GuildRaidResponse> = {};

    console.log("[FetchFn] Preparing to fetch season URLs:");
    const seasonPromises = availableSeasons.map(season => {
         const url = `/api/tacticus/guildRaid/${season}`; 
         console.log(`[FetchFn]   - Fetching: ${url}`);
         return fetch(url, fetchOptions);
    });
    
    const seasonResults = await Promise.allSettled(seasonPromises);
    console.log("[FetchFn] Season fetch results received.");

    for (let i = 0; i < seasonResults.length; i++) {
        const result = seasonResults[i];
        const season = availableSeasons[i];
        if (result.status === 'fulfilled' && result.value.ok) {
            try { fetchedSeasonsData[season] = await result.value.json(); } 
            catch(e) { seasonFetchErrors.push(`S${season}:PARSE_ERROR`); }
        } else {
            let errorType = `S${season}:FETCH_ERROR`;
            if(result.status === 'fulfilled') {
               errorType = `S${season}:${result.value.status}_ERROR`; 
               console.warn(`Failed fetch S${season}: Status ${result.value.status}`);
            } else {
                console.error(`Fetch rejected S${season}:`, result.reason);
            }
            seasonFetchErrors.push(errorType);
        }
    }
    console.log("[FetchFn] Final allSeasonsRaidData state:", fetchedSeasonsData);
    setAllSeasonsRaidData(fetchedSeasonsData);
    
    if (seasonFetchErrors.length > 0) {
       console.error("[FetchFn] Errors during season fetch:", seasonFetchErrors);
       // Append season errors to any existing base errors
       setFetchError(prev => [prev, ...seasonFetchErrors].filter(Boolean).join('; '));
    }
    
    setIsFetchingSeasonData(false);
    console.log("[FetchFn] Finished processing season data.");
}, [user, availableSeasons]); // Depends on user and availableSeasons

  // --- Effects --- 
  useEffect(() => {
    if (user && !authLoading) {
      handleFetchBaseData();
    } 
  }, [user, authLoading, handleFetchBaseData]);

  useEffect(() => {
    if (availableSeasons.length > 0 && user && tacticusUserId) {
        handleFetchSeasonData();
    }
    if (availableSeasons.length === 0) {
        setAllSeasonsRaidData({});
    }
  }, [availableSeasons, user, tacticusUserId, handleFetchSeasonData]); 
  
  // --- Prepare Raid Data based on Selection --- 
  const raidDataForDisplay = useMemo(() => {
      console.log(`[Memo] Preparing raidDataForDisplay. Selected: ${selectedSeason}`);
      let dataToReturn = {};
      if (selectedSeason === 'all') {
          dataToReturn = allSeasonsRaidData;
      } else if (allSeasonsRaidData && allSeasonsRaidData[selectedSeason]) {
          dataToReturn = { [selectedSeason]: allSeasonsRaidData[selectedSeason] };
      }
      console.log("[Memo] Returning raidDataForDisplay with keys:", Object.keys(dataToReturn));
      return dataToReturn;
  }, [selectedSeason, allSeasonsRaidData]);

  const renderTokens = (tokenData: { current?: number; max?: number; regenDelayInSeconds?: number } | null | undefined, name: string) => {
    if (!tokenData) return null;
    return (
      <p className="text-sm"><strong className="text-[rgb(var(--primary-color))] font-semibold">{name} Tokens:</strong> {tokenData.current ?? '-'}/{tokenData.max ?? '-'} (Regen: {tokenData.regenDelayInSeconds ?? '-'}s)</p>
    );
  };

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

  // --- Manual Refresh Handler ---
  const handleManualRefresh = async () => {
      if (isManualRefreshing || isFetchingBaseData || isFetchingSeasonData) return; // Prevent multiple refreshes
      console.log("Manual refresh triggered...");
      setIsManualRefreshing(true);
      try {
          await handleFetchBaseData();
          // handleFetchSeasonData will be triggered automatically by the useEffect
      } catch (error) {
          console.error("Error during manual refresh:", error);
          // Error state is set within handleFetchBaseData
      } finally {
          setIsManualRefreshing(false); 
          console.log("Manual refresh finished.");
      }
  };
  
  // --- Render Logic --- 
  const isLoading = authLoading || apiKeyStatusLoading || isFetchingBaseData || isFetchingSeasonData || isManualRefreshing;

  if (!user && !authLoading) {
    return <div className="text-center mt-10 text-lg text-[rgb(var(--foreground-rgb),0.8)]">++ Authentication Required: Transmit Identification via Google Relay ++</div>;
  }

  if (authLoading || (user && isFetchingBaseData && !playerData)) {
     return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[rgb(var(--primary-color))]" /></div>;
  }

  return (
    <main className="flex flex-col items-center p-4 md:p-8">
      {/* Header */} 
      <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
         <div className="flex flex-col items-center sm:items-start">
             <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--primary-color))] uppercase tracking-wider">Tacticus Player Intel</h1>
             {/* Display Username and Email */} 
             {user && (
                 <span className="text-sm text-[rgb(var(--primary-color),0.7)] mt-1">
                     ++ Identified Operator: {user.displayName || 'Unknown'} {user.email ? `[${user.email}]` : ''} ++
                 </span>
             )}
         </div>
         {user && (
             <Button 
                 icon={RefreshCw}
                 onClick={handleManualRefresh}
                 disabled={isLoading} 
                 loading={isManualRefreshing}
                 variant="secondary"
                 className="text-[rgb(var(--primary-color))] border-[rgb(var(--primary-color))] hover:bg-[rgba(var(--primary-color-rgb),0.1)] disabled:opacity-50"
             >
                 Refresh Data
             </Button>
         )}
      </div>

      {/* Display errors regardless of other states if fetchError exists */} 
      {fetchError && !isManualRefreshing && !isFetchingBaseData && !isFetchingSeasonData && (
           <div className="my-4 p-4 border border-red-500/50 rounded-lg bg-red-900/30 text-red-300 w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
               {fetchError === 'API_KEY_REQUIRED' ? (
                   <KeyRound className="text-yellow-400 flex-shrink-0" size={24} />
               ) : (
                   <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
               )}
               <div className='text-center sm:text-left'>
                  {fetchError === 'API_KEY_REQUIRED' ? (
                      <>
                         <p className="font-semibold text-yellow-200 text-lg">++ API Schlüssel Konfiguration erforderlich ++</p>
                         <p className="text-sm mt-1">Dein Tacticus API Schlüssel fehlt oder ist nicht korrekt. Bitte gehe zu den <Link href="/settings" className="font-bold underline hover:text-yellow-100">Einstellungen</Link>, um ihn hinzuzufügen oder zu aktualisieren.</p>
                      </>
                  ) : (
                      <>
                          <p className="font-semibold text-red-200 text-lg">++ Datenabruf fehlgeschlagen ++</p>
                          <p className="text-sm mt-1">Fehler beim Abrufen der Daten: {fetchError}. Versuche, die Daten neu zu laden oder überprüfe die Debug-Konsole.</p>
                     </>
                  )}
                </div>
            </div>
      )}

      {/* Render content only if user is loaded, not loading, no critical error, and player data exists */} 
      {user && !isLoading && !fetchError && playerData?.player && (
        <div key={user.uid} className="w-full max-w-6xl"> 
             {/* Grid with metrics */} 
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
               {playerData && (
                 <>
                   <PlayerNameMetric playerDetails={playerData.player.details} />
                   <PowerLevelMetric playerDetails={playerData.player.details} />
                 </>
               )}
               {playerData && Object.keys(allSeasonsRaidData).length > 0 && tacticusUserId && (
                 <>
                   <RaidDamageMetric allSeasonRaidData={allSeasonsRaidData} tacticusUserId={tacticusUserId} />
                   <RaidParticipationMetric allSeasonRaidData={allSeasonsRaidData} tacticusUserId={tacticusUserId} />
                 </>
               )}
             </div>
 
            {/* AllianceBarList */} 
             {playerData?.player?.units && (
               <div className="mb-6">
                  <AllianceBarList units={playerData.player.units} />
               </div>
             )}
 
             {/* Season Selector */} 
             {availableSeasons.length > 0 && (
                 <div className="mb-4 flex items-center space-x-2">
                      <label htmlFor="season-select" className="text-sm font-medium text-[rgb(var(--foreground-rgb),0.8)]">Select Season:</label>
                      <Select 
                         id="season-select"
                         value={String(selectedSeason)} 
                         onValueChange={(value) => setSelectedSeason(value === 'all' ? 'all' : Number(value))}
                         className="max-w-xs"
                      >
                         <SelectItem value="all">All Seasons</SelectItem>
                         {availableSeasons.map(season => (
                             <SelectItem key={season} value={String(season)}>
                                 Season {season}
                             </SelectItem>
                         ))}
                     </Select>
                 </div>
             )}
 
             {/* Boss Composition Performance */} 
             {playerData && Object.keys(raidDataForDisplay).length > 0 && (
                 <div className="mb-6">
                    <BossCompositionPerformance playerData={playerData} allGuildRaidData={raidDataForDisplay} />
                 </div>
              )}
 
             <h2 className="text-2xl font-semibold text-[rgb(var(--primary-color))] mb-4 border-b border-[rgb(var(--border-color))] pb-2">Detailed Intel</h2>
 
             {/* Collapsible Sections */} 
             <CollapsibleSection title="Player Identification & Vitals" icon={<ShieldCheck size={20}/>}> 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Designation:</strong> {playerData.player?.details?.name ?? 'N/A'}</div>
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">ID (User):</strong> {user?.uid ?? 'N/A'}</div>
                  <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Combat Effectiveness (Power):</strong> {playerData.player?.details?.powerLevel?.toLocaleString() ?? 'N/A'}</div>
                  {playerData.metaData && (
                      <>
                          <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Last Sync:</strong> {new Date(playerData.metaData.lastUpdatedOn * 1000).toLocaleString()}</div>
                          <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Clearance Scopes:</strong> {playerData.metaData.scopes?.join(', ') ?? 'N/A'}</div>
                          {playerData.metaData.apiKeyExpiresOn && <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Key Deactivation:</strong> {new Date(playerData.metaData.apiKeyExpiresOn * 1000).toLocaleString()}</div>}
                          <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Config Hash:</strong> <span className="text-xs break-all">{playerData.metaData.configHash ?? 'N/A'}</span></div>
                       </>
                  )}
                </div>
             </CollapsibleSection>
 
             <CollapsibleSection title="Guild Affiliation" icon={<Users size={20} />}> 
                 {guildData?.guild ? (
                    <div className="space-y-1 text-sm">
                      <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Name:</strong> {guildData.guild.name} {guildData.guild.guildTag ? `[${guildData.guild.guildTag}]` : ''}</p>
                      <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Level:</strong> {guildData.guild.level ?? 'N/A'}</p>
                      <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Members:</strong> {guildData.guild.members?.length ?? 'N/A'}</p>
                      {guildData.guild.guildRaidSeasons && <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Available Raid Seasons:</strong> {guildData.guild.guildRaidSeasons.join(', ')}</p>}
                      {guildData.guild.members && guildData.guild.members.length > 0 && (
                          <details className="mt-2">
                              <summary className="cursor-pointer font-medium text-xs">Members List ({guildData.guild.members.length})</summary>
                              <ul className="text-xs list-disc list-inside pl-4 mt-1 max-h-48 overflow-auto bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded">
                                  {guildData.guild.members.map((member: GuildMember) => <li key={member?.userId}>{member?.userId ?? 'Unknown'} ({member?.role ?? 'Unknown'})</li>)}
                              </ul>
                          </details>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No guild data found (Player might not be in a guild).</p>
                  )}
             </CollapsibleSection>
 
             <CollapsibleSection title="Guild Raid Intel (Current Season)" icon={<Swords size={20} />}> 
                 {playerData && Object.keys(allSeasonsRaidData).length > 0 && (
                    <div className="space-y-1 text-sm">
                     <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Season:</strong> {playerData.player.details.name} (Current)</p>
                     <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Season Config ID:</strong> {playerData.player.details.name} (Current)</p>
                     {playerData.player.progress.campaigns && (
                         <>
                            <h3 className="font-semibold text-base text-[rgb(var(--primary-color))] mt-2 mb-1">Campaign Logs</h3>
                            <div className="space-y-1">
                            {playerData.player.progress.campaigns.map((campaign: CampaignProgress) => (
                                <details key={campaign.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)] text-xs">
                                    <summary className="p-1 px-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-[rgb(var(--foreground-rgb),0.95)]">
                                    <span>{campaign.name} ({campaign.type})</span>
                                    <ChevronDown size={16} className="opacity-70" />
                                    </summary>
                                    <div className="p-2 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.85)]">
                                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                                        {campaign.battles.map((battle: CampaignLevel) => (
                                        <li key={battle.battleIndex}>Battle {battle.battleIndex}: {battle.attemptsUsed} used, {battle.attemptsLeft} left</li>
                                        ))}
                                    </ul>
                                    </div>
                                </details>
                            ))}
                            </div>
                         </>
                     )}
                    </div>
                  )}
             </CollapsibleSection>

          {playerData.player.inventory && (
                <CollapsibleSection title="Armoury & Stores" icon={<Box size={20} />}>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(playerData.player.inventory) as Array<keyof Inventory>)
                       .filter(key => Array.isArray(playerData.player.inventory[key]) && (playerData.player.inventory[key] as any[]).length > 0)
                       .map(key => (
                        <details key={key} className="mt-1">
                            <summary className="cursor-pointer font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} ({(playerData.player.inventory[key] as any[]).length})</summary>
                            <ul className="space-y-0 mt-1 max-h-60 overflow-y-auto bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded">
                                {(playerData.player.inventory[key] as any[]).map(renderInventoryItem)}
                            </ul>
                        </details>
                    ))}
                   {playerData.player.inventory.resetStones && <p className="text-sm col-span-full"><strong className="text-[rgb(var(--primary-color))]">Reset Stones:</strong> {playerData.player.inventory.resetStones}</p>} 
      </div>
             </CollapsibleSection>
          )}

          {playerData.player.progress && (
                <CollapsibleSection title="Mission Progress & Resources" icon={<TrendingUp size={20} />}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mb-3">
                   {renderTokens(playerData.player.progress.arena?.tokens, 'Arena')}
                   {renderTokens(playerData.player.progress.guildRaid?.tokens, 'Guild Raid')}
                   {renderTokens(playerData.player.progress.guildRaid?.bombTokens, 'Guild Raid Bomb')}
                   {renderTokens(playerData.player.progress.onslaught?.tokens, 'Onslaught')}
                   {renderTokens(playerData.player.progress.salvageRun?.tokens, 'Salvage Run')}
        </div>
               {playerData.player.progress.campaigns && (
                   <>
                      <h3 className="font-semibold text-base text-[rgb(var(--primary-color))] mt-2 mb-1">Campaign Logs</h3>
                      <div className="space-y-1">
                      {playerData.player.progress.campaigns.map((campaign: CampaignProgress) => (
                          <details key={campaign.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)] text-xs">
                              <summary className="p-1 px-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-[rgb(var(--foreground-rgb),0.95)]">
                              <span>{campaign.name} ({campaign.type})</span>
                              <ChevronDown size={16} className="opacity-70" />
                              </summary>
                              <div className="p-2 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.85)]">
                              <ul className="list-disc list-inside ml-2 space-y-0.5">
                                  {campaign.battles.map((battle: CampaignLevel) => (
                                  <li key={battle.battleIndex}>Battle {battle.battleIndex}: {battle.attemptsUsed} used, {battle.attemptsLeft} left</li>
                                  ))}
                              </ul>
        </div>
                          </details>
                      ))}
        </div>
                   </>
               )}
             </CollapsibleSection>
          )}
        </div>
      )}

      {/* Show loading indicator inside if manual refresh is happening */} 
      {isManualRefreshing && (
          <div className="flex justify-center items-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[rgb(var(--primary-color))]" /></div>
      )}

      {/* Fallback if user is loaded but no player data (e.g., API key missing AFTER initial load or fetch failed) */} 
      {user && !isLoading && !fetchError && !playerData?.player && (
          <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)] text-center mt-10">++ No Valid Player Data Feed Received ++</p>
      )}
    </main>
  );
}
