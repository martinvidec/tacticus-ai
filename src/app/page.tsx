'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useDebug } from '@/lib/contexts/DebugContext';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction, Player, GuildMember } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords, KeyRound, AlertTriangle, ArrowUp, ArrowDown, SettingsIcon, RefreshCw } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card, Title, Button, TextInput, Metric, Grid } from '@tremor/react';
import { getUserApiKeyStatus } from '@/lib/actions';

// Import new component
import PageHeader from './components/PageHeader';

// Import Metrics using relative path from src/app/
import MetricsGrid from './components/MetricsGrid';
// Other charts...
// Removed import BossCompositionPerformance from './components/charts/BossCompositionPerformance';
// Import new component
import AllianceDistribution from './components/AllianceDistribution';
// Import refactored components
import CollapsibleSection from './components/CollapsibleSection';
import PlayerVitalsSection from './components/PlayerVitalsSection';
// Import new component
import GuildAffiliationSection from './components/GuildAffiliationSection';
// Import new component
import GuildRaidIntelSection from './components/GuildRaidIntelSection';
// Import new component
import ArmouryStoresSection from './components/ArmouryStoresSection';
// Import new component
import MissionProgressSection from './components/MissionProgressSection';
// Import new component
import CombatUnitsSection from './components/CombatUnitsSection';

// Helper type for sorting
type SortKey = 'name' | 'xpLevel' | 'rank' | 'shards' | 'progressionIndex' | 'upgradesCount';
type SortDirection = 'asc' | 'desc';
interface SortCriterion {
  key: SortKey | null;
  direction: SortDirection;
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

  // Helper function to render token sections
  const renderTokens = (tokenData: { current?: number; max?: number; regenDelayInSeconds?: number } | null | undefined, name: string) => {
    if (!tokenData) return null;
    return (
      <p className="text-sm"><strong className="text-[rgb(var(--primary-color))] font-semibold">{name} Tokens:</strong> {tokenData.current ?? '-'}/{tokenData.max ?? '-'} (Regen: {tokenData.regenDelayInSeconds ?? '-'}s)</p>
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
     return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[rgb(var(--primary-color))]"></div></div>;
  }

  return (
    <main className="flex flex-col items-center p-4 md:p-8">
      {/* Header - Replaced with component */}
      <PageHeader 
        user={user} 
        isLoading={isLoading}
        isManualRefreshing={isManualRefreshing}
        handleManualRefresh={handleManualRefresh} 
      />

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
             {/* Grid with metrics - Replaced with component */}
             <MetricsGrid 
                playerData={playerData}
                allSeasonsRaidData={allSeasonsRaidData}
                tacticusUserId={tacticusUserId}
             />
 
             {/* Alliance Distribution - Replaced with component */}
             <AllianceDistribution units={playerData?.player?.units} />
 
             {/* Season Selector and Boss Performance are now INSIDE GuildRaidIntelSection */}
  
             <h2 className="text-2xl font-semibold text-[rgb(var(--primary-color))] mb-4 border-b border-[rgb(var(--border-color))] pb-2">Detailed Intel</h2>
 
             {/* Player Vitals - Replaced with component */}
             <PlayerVitalsSection playerData={playerData} user={user} />
 
             {/* Guild Affiliation - Replaced with component */}
             <GuildAffiliationSection guildData={guildData} />
 
             {/* Guild Raid Intel - Replaced with component */}
             <GuildRaidIntelSection 
                raidDataForDisplay={raidDataForDisplay} 
                selectedSeason={selectedSeason} 
                availableSeasons={availableSeasons}
                setSelectedSeason={setSelectedSeason}
                playerData={playerData}
             />
 
             {/* Armoury & Stores - Replaced with component */}
             <ArmouryStoresSection inventory={playerData?.player?.inventory} />
 
             {/* Mission Progress & Resources - Replaced with component */}
             <MissionProgressSection progress={playerData?.player?.progress} renderTokens={renderTokens} />
 
             {/* Combat Units - Replaced with component */}
             <CombatUnitsSection 
                filteredAndSortedUnits={filteredAndSortedUnits}
                totalUnitsCount={playerData?.player?.units?.length ?? 0}
                availableAlliances={availableAlliances}
                availableFactions={availableFactions}
                selectedAlliances={selectedAlliances}
                setSelectedAlliances={setSelectedAlliances}
                selectedFactions={selectedFactions}
                setSelectedFactions={setSelectedFactions}
                primarySort={primarySort}
                setPrimarySort={setPrimarySort}
                secondarySort={secondarySort}
                setSecondarySort={setSecondarySort}
             />
            </div>
         )}

         {/* Show loading indicator inside if manual refresh is happening */} 
         {isManualRefreshing && (
             <div className="flex justify-center items-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[rgb(var(--primary-color))]"></div></div>
         )}

         {/* Fallback if user is loaded but no player data (e.g., API key missing AFTER initial load or fetch failed) */} 
         {user && !isLoading && !fetchError && !playerData?.player && (
             <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)] text-center mt-10">++ No Valid Player Data Feed Received ++</p>
         )}
    </main>
  );
}
