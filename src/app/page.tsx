'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useDebug } from '@/lib/contexts/DebugContext';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction, Player, GuildMember } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords, KeyRound, AlertTriangle, ArrowUp, ArrowDown, SettingsIcon } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card, Title, Button, TextInput, Metric, Grid } from '@tremor/react';

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
  
  // States for data
  const [playerData, setPlayerData] = useState<PlayerDataResponse | null>(null);
  const [guildData, setGuildData] = useState<GuildResponse | null>(null);
  const [allSeasonsRaidData, setAllSeasonsRaidData] = useState<Record<number, GuildRaidResponse>>({});
  const [isFetchingBaseData, setIsFetchingBaseData] = useState<boolean>(false);
  const [isFetchingSeasonData, setIsFetchingSeasonData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  // State for selected season view
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');

  // --- State for Sorting & Filtering --- 
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'xpLevel', direction: 'desc' });
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: null, direction: 'asc' });
  const [selectedAlliances, setSelectedAlliances] = useState<string[]>([]);
  const [selectedFactions, setSelectedFactions] = useState<string[]>([]);

  // --- Find Player's Tacticus ID (Runtime Extraction) --- 
  const currentPlayerTacticusId = useMemo<string | null>(() => {
    console.log("[page.tsx] Attempting to extract Tacticus ID from raid data...");
    if (!allSeasonsRaidData || Object.keys(allSeasonsRaidData).length === 0) {
      console.log("[page.tsx] Extraction skipped: No raid data available yet.");
      return null;
    }

    // Find the first season with entries
    const seasonKeyWithEntries = Object.keys(allSeasonsRaidData).find(
      (key) => {
        const seasonData = allSeasonsRaidData[Number(key)];
        return Array.isArray(seasonData?.entries) && seasonData.entries.length > 0;
      }
    );

    if (seasonKeyWithEntries) {
      const firstEntry = allSeasonsRaidData[Number(seasonKeyWithEntries)].entries[0];
      if (firstEntry?.userId) {
        const extractedId = firstEntry.userId;
        console.log(`[page.tsx] Extracted Tacticus ID from first entry of Season ${seasonKeyWithEntries}: ${extractedId}`);
        return extractedId;
      } else {
          console.warn(`[page.tsx] First entry in Season ${seasonKeyWithEntries} has no userId.`);
      }
    } else {
      console.warn("[page.tsx] Could not find any season with raid entries to extract Tacticus ID.");
    }

    return null;
  }, [allSeasonsRaidData]); // Depends only on raid data now

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

  // --- Effect 1: Fetch Player and Guild Data (to get seasons) ---
  useEffect(() => {
    const fetchBaseData = async () => {
      if (!user) return;

      console.log("[Effect1] Fetching Player & Guild data...");
      setIsFetchingBaseData(true);
      setFetchError(null);
      setPlayerData(null); 
      setGuildData(null); 
      setAvailableSeasons([]); // Reset seasons before fetch
      setAllSeasonsRaidData({}); // Reset raid data too

      let idToken: string | null = null;
      try { idToken = await user.getIdToken(); }
      catch (error) { /* ... */ setFetchError("Token Error"); setIsFetchingBaseData(false); return; }
      if (!idToken) { /* ... */ setFetchError("Token Error"); setIsFetchingBaseData(false); return; }
      
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
            // REMOVED: console.log("[Effect1] Raw PlayerData received:", JSON.stringify(rawPlayerData, null, 2));
            setPlayerData(rawPlayerData);
         } catch (e) { baseFetchErrors.push("player:PARSE_ERROR"); }
      } else {
         // Handle player error (check for API Key missing)
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
                console.log("[Effect1] Found seasons:", seasons);
                setAvailableSeasons(seasons.sort((a, b) => b - a));
            }
         } catch (e) { baseFetchErrors.push("guild:PARSE_ERROR"); }
      } else {
        // Handle guild error (check for API Key missing, ignore 404)
         let errorType = 'guild:FETCH_ERROR';
         if (guildResult.status === 'fulfilled') {
             if (guildResult.value.status !== 404) { // Ignore 'not in guild' as a hard error
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

      // Set final error state for this phase
      if (apiKeyIsMissing) {
        setFetchError('API_KEY_REQUIRED');
      } else if (baseFetchErrors.length > 0) {
        setFetchError(baseFetchErrors.join('; '));
      }
      setIsFetchingBaseData(false);
      console.log("[Effect1] Finished Player & Guild fetch.");
    };

    if (user && !authLoading) {
      fetchBaseData();
    } else if (!user && !authLoading) {
      // Clear state on logout
      setPlayerData(null); setGuildData(null); setAllSeasonsRaidData({});
      setAvailableSeasons([]); setFetchError(null); setIsFetchingBaseData(false);
      setIsFetchingSeasonData(false);
    }
  }, [user, authLoading]); // Trigger only on user/auth change

  // --- Effect 2: Fetch All Season Raid Data (when availableSeasons is set) ---
  useEffect(() => {
    const fetchSeasonData = async () => {
       if (!user || availableSeasons.length === 0) {
            // console.log("[Effect2] Skipping season fetch: No user or no seasons.");
            return; 
       }

       console.log(`[Effect2] Starting fetch for seasons: ${availableSeasons.join(', ')}`);
       setIsFetchingSeasonData(true);
       setAllSeasonsRaidData({}); 

       let idToken: string | null = null;
       try { 
           idToken = await user.getIdToken(); 
           console.log("[Effect2] Got ID Token for season fetch.");
       }
       catch (error) { 
           console.error("[Effect2] Error getting ID token:", error);
           setFetchError(prev => [prev, "Token Error (S)"].filter(Boolean).join('; ')); 
           setIsFetchingSeasonData(false); 
           return; 
       }
       if (!idToken) { 
           console.error("[Effect2] ID Token is null.");
           setFetchError(prev => [prev, "Token Error (S)"].filter(Boolean).join('; ')); 
           setIsFetchingSeasonData(false); 
           return; 
       }
       
       const fetchOptions = { headers: { 'Authorization': `Bearer ${idToken}` } };
       let seasonFetchErrors: string[] = [];
       const fetchedSeasonsData: Record<number, GuildRaidResponse> = {};

       // --- Log URL before fetch --- 
       console.log("[Effect2] Preparing to fetch season URLs:");
       const seasonPromises = availableSeasons.map(season => {
            const url = `/api/tacticus/guildRaid/${season}`; // Construct URL
            console.log(`[Effect2]   - Fetching: ${url}`); // Log specific URL
            return fetch(url, fetchOptions);
       });
       // --- End Log URL --- 
       
       const seasonResults = await Promise.allSettled(seasonPromises);
       console.log("[Effect2] Season fetch results received."); // Log after fetches complete

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
       console.log("[Effect2] Final allSeasonsRaidData state:", fetchedSeasonsData);
       setAllSeasonsRaidData(fetchedSeasonsData);
       
       if (seasonFetchErrors.length > 0) {
          console.error("[Effect2] Errors during season fetch:", seasonFetchErrors);
          setFetchError(prev => [prev, ...seasonFetchErrors].filter(Boolean).join('; '));
       }
       
       setIsFetchingSeasonData(false);
       console.log("[Effect2] Finished processing season data.");
    };

    fetchSeasonData();

  }, [availableSeasons, user]); // Trigger when availableSeasons changes (and user exists)

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

  // --- Render Logic --- 
  const isLoading = authLoading || isFetchingBaseData || isFetchingSeasonData; // Combined loading

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[rgb(var(--primary-color))]"></div></div>;
  }

  if (!user) {
    return <div className="text-center mt-10 text-lg text-[rgb(var(--foreground-rgb),0.8)]">++ Authentication Required: Transmit Identification via Google Relay ++</div>;
  }

  if (fetchError && !isLoading) {
    if (fetchError === 'API_KEY_REQUIRED') {
      return (
        <div className="my-4 p-4 border border-yellow-500/50 rounded-lg bg-yellow-900/30 text-yellow-300 w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <KeyRound className="text-yellow-400 flex-shrink-0" size={24} />
          <div className='text-center sm:text-left'>
            <p className="font-semibold text-yellow-200 text-lg">++ API Schlüssel Konfiguration erforderlich ++</p>
            <p className="text-sm mt-1">Dein Tacticus API Schlüssel fehlt oder ist nicht korrekt. Bitte gehe zu den <Link href="/settings" className="font-bold underline hover:text-yellow-100">Einstellungen</Link>, um ihn hinzuzufügen oder zu aktualisieren.</p>
        </div>
        </div>
      );
    }
    return (
      <div className="my-4 p-4 border border-red-500/50 rounded-lg bg-red-900/30 text-red-300 w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
        <div className='text-center sm:text-left'>
          <p className="font-semibold text-red-200 text-lg">++ Datenabruf fehlgeschlagen ++</p>
          <p className="text-sm mt-1">Fehler beim Abrufen der Daten: {fetchError}. Versuche, die Seite neu zu laden oder überprüfe die Debug-Konsole.</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !fetchError && !playerData) {
    return (
      <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)] text-center mt-10">++ No Valid Data Feed Received or Still Loading ++</p>
    );
  }

  // Log right before returning JSX
  console.log("[Render] Final check before return:", { isLoading, fetchError, hasPlayerData: !!playerData, raidDataKeys: Object.keys(raidDataForDisplay) });

  return (
    <main className="flex flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-[rgb(var(--primary-color))] uppercase tracking-wider">Tacticus Player Intel</h1>

      {isLoading && (
        <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)]">Retrieving Data Feed...</p>
      )}

      {!isLoading && !fetchError && playerData?.player && (
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            {playerData && (
              <>
                {/* Pass player details to player-specific metrics */}
                <PlayerNameMetric playerDetails={playerData.player.details} />
                <PowerLevelMetric playerDetails={playerData.player.details} />
              </>
            )}
            {/* Render Raid Metrics if data is available and Tacticus ID found */}
            {playerData && Object.keys(allSeasonsRaidData).length > 0 && currentPlayerTacticusId && (
              <>
                <RaidDamageMetric allSeasonRaidData={allSeasonsRaidData} tacticusUserId={currentPlayerTacticusId} />
                <RaidParticipationMetric allSeasonRaidData={allSeasonsRaidData} tacticusUserId={currentPlayerTacticusId} />
              </>
            )}
          </div>

          {/* Re-add AllianceBarList here, checking for necessary data */}
          {playerData?.player?.units && (
            <div className="mb-6">
               <AllianceBarList units={playerData.player.units} />
            </div>
          )}

          {/* --- Season Selector --- */}
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

          {/* --- Boss Composition Performance --- */}
          {(console.log("[Page] Checking BossComp render:", 
              {
                  hasPlayerData: !!playerData, 
                  selectedSeason: selectedSeason,
                  raidDataKeys: Object.keys(raidDataForDisplay),
                  shouldRender: !!playerData && Object.keys(raidDataForDisplay).length > 0 
              }
          ), null)}
          {playerData && Object.keys(raidDataForDisplay).length > 0 && (
              <div className="mb-6">
                 <BossCompositionPerformance playerData={playerData} allGuildRaidData={raidDataForDisplay} />
              </div>
           )}

          <h2 className="text-2xl font-semibold text-[rgb(var(--primary-color))] mb-4 border-b border-[rgb(var(--border-color))] pb-2">Detailed Intel</h2>

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

          <CollapsibleSection 
               title={`Combat Units (${filteredAndSortedUnits.length} / ${playerData?.player?.units?.length ?? 0})`} 
               icon={<Target size={20} />}
              >
               <Card className="mb-4 p-3 bg-[rgba(var(--background-start-rgb),0.6)] border border-[rgb(var(--border-color))] shadow-sm">
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
                        
                        return (
                            <details key={unit.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)]">
                                <summary className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-sm text-[rgb(var(--foreground-rgb),0.95)]">
                                    <span>{`${unit.name || unit.id} ${summaryDetails}`.trim()}</span> 
                                    <ChevronDown size={18} className="opacity-70" />
                                </summary>
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
                                </div>
                            </details>
                        );
                    })
                 ) : (
                   <p className="text-center text-sm text-[rgb(var(--foreground-rgb),0.7)] py-4">No units match the current filters.</p>
                 )}
               </div>
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
    </main>
  );
}
