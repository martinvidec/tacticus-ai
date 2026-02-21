'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useDebug } from '@/lib/contexts/DebugContext';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction, Player, GuildMember } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords, KeyRound, AlertTriangle, ArrowUp, ArrowDown, SettingsIcon, RefreshCw } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card, Title, Button, TextInput, Metric, Grid, LineChart } from '@tremor/react';
import { getUserApiKeyStatus } from '@/lib/actions';
import PageHeader from './components/PageHeader';
import AuthButton from './components/AuthButton';

// Import new component
// import PageHeader from './components/PageHeader';

// Import Metrics using relative path from src/app/
// Removed import MetricsGrid from './components/MetricsGrid';
// Other charts...
// Removed import BossCompositionPerformance from './components/charts/BossCompositionPerformance';
// Import new component
// Removed import AllianceDistribution from './components/AllianceDistribution';
// Import refactored components
// import CollapsibleSection from './components/CollapsibleSection';
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
import RosterStrengthAnalysis from './components/RosterStrengthAnalysis';
import UnitReadinessSection from './components/UnitReadinessSection';
import RaidEfficiencyAnalysis from './components/RaidEfficiencyAnalysis';
import CampaignAnalysis from './components/CampaignAnalysis';
import ShardFarmingPriority from './components/ShardFarmingPriority';
import EquipmentAudit from './components/EquipmentAudit';
import AbilityAnalysis from './components/AbilityAnalysis';
import GuildActivityMonitor from './components/GuildActivityMonitor';
import ResourceBudget from './components/ResourceBudget';
import TokenManagement from './components/TokenManagement';
import UpgradeProgress from './components/UpgradeProgress';
import RaidSeasonTrends from './components/RaidSeasonTrends';
// Import the new Dashboard component
import DashboardOverview from './components/DashboardOverview';
// Import Cogitator (AI Chat) component
import CogitatorSection from './components/CogitatorSection';

// Import necessary icons for SideNavMenu
import {
    UserCircleIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    ArchiveBoxIcon,
    ClipboardDocumentListIcon,
    AdjustmentsHorizontalIcon,
    Squares2X2Icon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// Import new components
import SideNavMenu from './components/SideNavMenu';
// Import Breadcrumbs
import Breadcrumbs, { BreadcrumbItem } from './components/Breadcrumbs';
import { OpenUnitContext } from '@/lib/contexts/OpenUnitContext';

// Helper type for sorting
type SortKey = 'name' | 'xpLevel' | 'rank' | 'shards' | 'progressionIndex' | 'upgradesCount';
type SortDirection = 'asc' | 'desc';
interface SortCriterion {
  key: SortKey | null;
  direction: SortDirection;
}

// Define Sections for SideNavMenu with Dashboard
const sections = [
  { id: 'dashboard', title: 'Dashboard', icon: <Squares2X2Icon className="h-5 w-5" /> },
  { id: 'cogitator', title: 'Cogitator', icon: <ChatBubbleLeftRightIcon className="h-5 w-5" /> },
  { id: 'vitals', title: 'Player Vitals', icon: <UserCircleIcon className="h-5 w-5" /> },
  { id: 'guild', title: 'Guild Affiliation', icon: <ShieldCheckIcon className="h-5 w-5" /> },
  { id: 'raidIntel', title: 'Guild Raid Intel', icon: <ChartBarIcon className="h-5 w-5" /> },
  { id: 'armoury', title: 'Armoury & Stores', icon: <ArchiveBoxIcon className="h-5 w-5" /> },
  { id: 'missions', title: 'Mission Progress', icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
  { id: 'roster', title: 'Combat Roster', icon: <AdjustmentsHorizontalIcon className="h-5 w-5" /> }
];

// Interface for the USER'S processed team data
export interface MyMostUsedTeamData {
    season: number;
    members: { 
        id: string; 
        name: string; 
        rank: number; 
        stars: number; // progressionIndex
    }[];
    powerData: { 
        time: Date; 
        totalPower: number; 
        heroPowers: { [unitId: string]: number }; 
    }[];
    usageCount: number;
}

// Interface for ONE of the Guild's Top Teams
export interface GuildTopTeamData {
    rank: number; // 1, 2, or 3
    teamId: string; // Comma-separated sorted IDs
    usageCount: number;
    members: { 
        id: string; 
        name: string; 
    }[];
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
  // State for managing open units
  const [openUnitIds, setOpenUnitIds] = useState<Set<string>>(new Set());
  // State for managing Combat Units collapsible section itself
  // const [isCombatUnitsOpen, setIsCombatUnitsOpen] = useState(false);

  // --- NEW State for UI Structure ---
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0].id);
  // State for breadcrumbs 
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]); 
  // Add state for Armoury category (needed for reset)
  const [selectedArmouryCategory, setSelectedArmouryCategory] = useState<keyof Inventory | 'all'>('all'); 

  // Function to toggle a unit's open state
  const toggleUnitOpen = useCallback((unitId: string) => {
      setOpenUnitIds(prevOpenIds => {
          const newOpenIds = new Set(prevOpenIds);
          if (newOpenIds.has(unitId)) {
              newOpenIds.delete(unitId);
          } else {
              newOpenIds.add(unitId);
          }
          return newOpenIds;
      });
  }, []);

  // Function to explicitly open the Combat Units section
  const openCombatUnitsSection = useCallback(() => {
      setSelectedSectionId('roster');
  }, [setSelectedSectionId]);

  // --- Function to reset Raid Intel view (used by breadcrumb onClick) ---
  const resetRaidIntelView = useCallback(() => {
      setSelectedSeason('all');
      const section = sections.find(sec => sec.id === 'raidIntel');
      if (section) {
          setBreadcrumbs([{ label: section.title, onClick: resetRaidIntelView }]);
      }
  }, []); 

  const resetArmouryView = useCallback(() => {
      // Reset the category state in page.tsx
      setSelectedArmouryCategory('all'); 
      // Explicitly reset the breadcrumbs to the base level for Armoury
      const section = sections.find(sec => sec.id === 'armoury');
      if (section) {
          // Create the base breadcrumb item again, ensuring onClick is set
          setBreadcrumbs([{ label: section.title, onClick: resetArmouryView }]);
      }
  }, []); // Dependencies are likely still empty, adjust if section data changes

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

  // --- Memoized Hero Raid Performance Data --- 
  const heroPerformanceData = useMemo(() => {
    console.log("[Memo] Calculating heroPerformanceData");
    const performanceMap = new Map<string, { time: Date; power: number; totalDamage: number }[]>();

    if (!allSeasonsRaidData) {
      return performanceMap;
    }

    Object.values(allSeasonsRaidData).forEach(seasonData => {
      if (!seasonData || !seasonData.entries) return;

      seasonData.entries.forEach(entry => {
        // Ensure damageDealt is treated as number early
        const damageDealtNum = typeof entry.damageDealt === 'string' ? parseInt(entry.damageDealt, 10) : entry.damageDealt;

        // Ensure startedOn is treated as number (Unix seconds) early
        const startedOnNum = typeof entry.startedOn === 'string' ? parseInt(entry.startedOn, 10) : entry.startedOn;
        
        if (!entry.heroDetails || startedOnNum === undefined || startedOnNum === null || isNaN(startedOnNum) || damageDealtNum === undefined || damageDealtNum === null || isNaN(damageDealtNum)) return;

        // Convert Unix seconds to milliseconds for Date constructor
        const entryTime = new Date(startedOnNum * 1000); 
        
        if (isNaN(entryTime.getTime())) return; // Skip if date is invalid
        
        entry.heroDetails.forEach(hero => {
          if (!hero.unitId || hero.power === undefined || hero.power === null) return;

          const heroData = performanceMap.get(hero.unitId) || [];
          heroData.push({
            time: entryTime,
            power: hero.power,
            totalDamage: damageDealtNum as number, // Cast after checking for undefined/null
          });
          performanceMap.set(hero.unitId, heroData);
        });
      });
    });

    // Optional: Sort each hero's data by time - already done in chart component, but can be done here too
    // performanceMap.forEach(data => data.sort((a, b) => a.time.getTime() - b.time.getTime()));

    console.log(`[Memo] Finished calculating heroPerformanceData. Map size: ${performanceMap.size}`);
    return performanceMap;
  }, [allSeasonsRaidData]);

  // --- Memoized Hero Name Lookup Map --- 
  const heroNameMap = useMemo(() => {
      console.log("[Memo] Creating heroNameMap");
      const map = new Map<string, string>();
      if (playerData?.player?.units) {
          playerData.player.units.forEach(unit => {
              if (unit.id && unit.name) { // Ensure both id and name exist
                  map.set(unit.id, unit.name);
              }
          });
      }
      console.log(`[Memo] Finished creating heroNameMap. Map size: ${map.size}`);
      return map;
  }, [playerData]); // Depends only on playerData

  // --- Memoized Unit Details Lookup Map --- 
  const unitDetailsMap = useMemo(() => {
      console.log("[Memo] Creating unitDetailsMap");
      const map = new Map<string, { name?: string, faction?: string, grandAlliance?: string }>();
      if (playerData?.player?.units) {
          playerData.player.units.forEach(unit => {
              if (unit.id) { 
                  map.set(unit.id, { 
                      name: unit.name, 
                      faction: unit.faction, 
                      grandAlliance: unit.grandAlliance
                  });
              }
          });
      }
      console.log(`[Memo] Finished creating unitDetailsMap. Map size: ${map.size}`);
      return map;
  }, [playerData]);

  // Provide the context value - MOVED UP before conditional returns
  const openUnitContextValue = useMemo(() => ({ 
      openUnitIds, 
      toggleUnitOpen, 
      openCombatUnitsSection
  }), [openUnitIds, toggleUnitOpen, openCombatUnitsSection]);

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

  // --- Manual Refresh Handler ---
  const handleManualRefresh = useCallback(async () => {
      // Check against current state values
      if (isManualRefreshing || isFetchingBaseData || isFetchingSeasonData) return; 
      console.log("Manual refresh triggered...");
      setIsManualRefreshing(true);
      try {
          // Call the memoized fetch function
          await handleFetchBaseData();
          // Season data fetch is triggered by useEffect dependency change
      } catch (error) {
          console.error("Error during manual refresh:", error);
          // Error state is likely set within handleFetchBaseData
      } finally {
          setIsManualRefreshing(false); 
          console.log("Manual refresh finished.");
      }
  }, [isManualRefreshing, isFetchingBaseData, isFetchingSeasonData, handleFetchBaseData]); // Correct dependencies

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
  
  // --- NEW Memo: MY Most Used Team Last Season (Filtered by User) ---
  const myMostUsedTeamLastSeason = useMemo((): MyMostUsedTeamData | null => {
      console.log("[Memo] Calculating myMostUsedTeamLastSeason");
      // Ensure we have the user ID to filter by!
      if (!tacticusUserId || !allSeasonsRaidData || Object.keys(allSeasonsRaidData).length === 0 || !playerData?.player?.units) {
          console.log("[Memo] Insufficient data for myMostUsedTeamLastSeason (missing userId, raidData, or playerData)");
          return null;
      }

      const latestSeason = Math.max(...Object.keys(allSeasonsRaidData).map(Number));
      const latestSeasonData = allSeasonsRaidData[latestSeason];

      if (!latestSeasonData || !latestSeasonData.entries || latestSeasonData.entries.length === 0) {
          console.log(`[Memo] No entries found for latest season ${latestSeason}`);
          return null;
      }

      const teamCounts = new Map<string, number>();
      const teamPowerSamples = new Map<string, { time: Date; totalPower: number; heroPowers: { [unitId: string]: number } }[]>();

      // *** Filter entries by tacticusUserId ***
      const myEntries = latestSeasonData.entries.filter(entry => entry.userId === tacticusUserId);

      if (myEntries.length === 0) {
          console.log(`[Memo] No entries found for user ${tacticusUserId} in season ${latestSeason}`);
          return null;
      }

      // Process only MY entries
      for (const entry of myEntries) { 
          if (entry.heroDetails && entry.heroDetails.length === 5) {
              const unitIds = entry.heroDetails.map(h => h.unitId).sort();
              const teamIdentifier = unitIds.join(',');
              
              teamCounts.set(teamIdentifier, (teamCounts.get(teamIdentifier) || 0) + 1);

              const startedOnNum = typeof entry.startedOn === 'string' ? parseInt(entry.startedOn, 10) : entry.startedOn;
              if (startedOnNum && !isNaN(startedOnNum)) {
                  const entryTime = new Date(startedOnNum * 1000);
                  if (!isNaN(entryTime.getTime())) {
                      let totalPower = 0;
                      const currentHeroPowers: { [unitId: string]: number } = {};
                      entry.heroDetails.forEach(hero => {
                          const power = hero.power || 0;
                          totalPower += power;
                          if (hero.unitId) { 
                              currentHeroPowers[hero.unitId] = power;
                          }
                      });
                      
                      const samples = teamPowerSamples.get(teamIdentifier) || [];
                      samples.push({ time: entryTime, totalPower, heroPowers: currentHeroPowers }); 
                      teamPowerSamples.set(teamIdentifier, samples);
                  }
              }
          }
      }

      if (teamCounts.size === 0) {
          console.log(`[Memo] No 5-hero teams found for user ${tacticusUserId} in season ${latestSeason}`);
          return null;
      }

      let mostFrequentIdentifier = '';
      let maxCount = 0;
      teamCounts.forEach((count, identifier) => { 
          if (count > maxCount) {
              maxCount = count;
              mostFrequentIdentifier = identifier;
          }
      });

      if (!mostFrequentIdentifier) {
          console.log(`[Memo] No valid team identifier found for user ${tacticusUserId} in season ${latestSeason}`);
          return null;
      }

      const teamUnitIds = mostFrequentIdentifier.split(',');
      const members = teamUnitIds.map(id => {
          const unitData = playerData.player.units.find(u => u.id === id);
          return {
              id: id,
              name: unitData?.name || id,
              rank: unitData?.rank ?? 0,
              stars: unitData?.progressionIndex ?? 0
          };
      });

      const powerData = teamPowerSamples.get(mostFrequentIdentifier) || [];
      powerData.sort((a, b) => a.time.getTime() - b.time.getTime());

      console.log(`[Memo] Finished myMostUsedTeamLastSeason for user ${tacticusUserId}, season ${latestSeason}. Found team: ${mostFrequentIdentifier} used ${maxCount} times.`);
      return {
          season: latestSeason,
          members,
          powerData,
          usageCount: maxCount
      };

  }, [allSeasonsRaidData, playerData, tacticusUserId]); // Added tacticusUserId dependency

  // --- NEW Memo: Guild Top 3 Most Used Teams Last Season (All Users) ---
  const guildTopTeamsLastSeason = useMemo((): GuildTopTeamData[] | null => {
      console.log("[Memo] Calculating guildTopTeamsLastSeason");
      if (!allSeasonsRaidData || Object.keys(allSeasonsRaidData).length === 0 || !playerData?.player?.units) {
          console.log("[Memo] Insufficient data for guildTopTeamsLastSeason");
          return null;
      }

      const latestSeason = Math.max(...Object.keys(allSeasonsRaidData).map(Number));
      const latestSeasonData = allSeasonsRaidData[latestSeason];

      if (!latestSeasonData || !latestSeasonData.entries || latestSeasonData.entries.length === 0) {
          console.log(`[Memo] No entries found for latest season ${latestSeason} (guild-wide)`);
          return null;
      }

      const teamCounts = new Map<string, number>();

      // Iterate through ALL entries (no user filter)
      for (const entry of latestSeasonData.entries) {
          if (entry.heroDetails && entry.heroDetails.length === 5) {
              const unitIds = entry.heroDetails.map(h => h.unitId).sort();
              const teamIdentifier = unitIds.join(',');
              teamCounts.set(teamIdentifier, (teamCounts.get(teamIdentifier) || 0) + 1);
          }
      }

      if (teamCounts.size === 0) {
          console.log(`[Memo] No 5-hero teams found in season ${latestSeason} (guild-wide)`);
          return null;
      }

      // Convert map to array, sort by count descending, take top 3
      const sortedTeams = Array.from(teamCounts.entries())
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 3);

      // Map to the desired output structure, fetching member names
      const topTeamsData = sortedTeams.map(([teamId, count], index): GuildTopTeamData => {
          const teamUnitIds = teamId.split(',');
          const members = teamUnitIds.map(id => {
              const unitData = playerData.player.units.find(u => u.id === id);
              return {
                  id: id,
                  name: unitData?.name || id,
              };
          });
          return {
              rank: index + 1,
              teamId,
              usageCount: count,
              members,
          };
      });

      console.log(`[Memo] Finished guildTopTeamsLastSeason for season ${latestSeason}. Found ${topTeamsData.length} top teams.`);
      return topTeamsData;

  }, [allSeasonsRaidData, playerData]); // Depends on raid data and player data (for names)

  // --- Render Logic --- 
  const isLoading = authLoading || apiKeyStatusLoading || isFetchingBaseData || isFetchingSeasonData || isManualRefreshing;

  // --- Effect to update breadcrumbs when top-level section changes --- 
  useEffect(() => {
    const currentSection = sections.find(sec => sec.id === selectedSectionId);
    if (currentSection) {
        let baseOnClick: (() => void) | undefined = undefined;
        if (selectedSectionId === 'raidIntel') {
            baseOnClick = resetRaidIntelView;
        } else if (selectedSectionId === 'armoury') {
            baseOnClick = resetArmouryView;
        }
        // No onClick needed for Dashboard base breadcrumb
        setBreadcrumbs([{ label: currentSection.title, onClick: baseOnClick }]);
    }
    // Reset scroll position when changing main sections
    const mainContentArea = document.querySelector('main.flex-1.overflow-y-auto');
    if (mainContentArea) {
        mainContentArea.scrollTop = 0;
    }
  }, [selectedSectionId, resetRaidIntelView, resetArmouryView]); 

  // --- Conditional Rendering Logic --- 

  // 1. Initial Loading State (Auth Loading)
  if (authLoading) {
     return (
         <div className="flex justify-center items-center h-screen">
             <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[rgb(var(--primary-color))]" title="Initializing Interface..."></div>
         </div>
     );
  }

  // 2. Logged Out State
  if (!user) { // No need to check authLoading here, it's false if we reached this point
    return (
        // Centered Auth Button (Sign In)
        <div className="flex flex-col justify-center items-center min-h-screen p-4">
            <h1 className="text-3xl font-bold text-[rgb(var(--primary-color))] mb-6 text-center">TACTICUS INTEL FEED</h1>
            <p className="text-center text-[rgb(var(--foreground-rgb),0.8)] mb-8">++ Authentication Required ++</p>
            <AuthButton />
        </div>
    );
  }

  // 3. Logged In State (but possibly still loading data)
  //    OR Error State
  //    OR Ready State

  // We need user to be defined to proceed here
  
  return (
    // Outer container to manage vertical layout of Header, Breadcrumbs, and Content
    <div className="flex flex-col h-screen">
        {/* PageHeader remains at the top */}
        <PageHeader 
            user={user}
            isLoading={isLoading}
            isManualRefreshing={isManualRefreshing}
            handleManualRefresh={handleManualRefresh} 
        />
        
        {/* Breadcrumb Row - Added between Header and Main Content */}
        {/* Only show breadcrumbs if user is logged in and data might be available */}
        {user && (
            <div className="border-t border-b border-[rgb(var(--border-color))] px-6 py-1 flex-shrink-0">
                <Breadcrumbs items={breadcrumbs} />
            </div>
        )}

        {/* Container for Sidebar + Main Content Area */}
        {/* This takes the remaining height */}
        <div className="flex flex-1 overflow-hidden"> 
            {/* Sidebar */} 
            <SideNavMenu 
                 sections={sections}
                 selectedSectionId={selectedSectionId}
                 onSelectSection={(id) => {
                    const previousSectionId = selectedSectionId;
                    setSelectedSectionId(id);
                    // Reset specific section states when navigating away
                    if (previousSectionId === 'raidIntel' && id !== 'raidIntel') { resetRaidIntelView(); }
                 }}
            />

            {/* Main Content Area - disable scroll for cogitator (has own scroll) */}
            <main className={`relative flex-1 p-4 md:p-8 pt-4 ${selectedSectionId === 'cogitator' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {/* Loading indicator for manual refresh (inside main content) */}
                {isManualRefreshing && (
                    <div className="absolute inset-0 flex justify-center items-center bg-[rgba(var(--background-end-rgb),0.8)] backdrop-blur-sm z-40 rounded-md">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[rgb(var(--primary-color))]" title="Refreshing Data Stream..."></div>
                    </div>
                )}
                
                {/* Error Display */} 
                {fetchError && !isManualRefreshing && !isFetchingBaseData && !isFetchingSeasonData && (
                     <div className="mb-4 p-4 border border-red-500/50 rounded-lg bg-red-900/30 text-red-300 w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          {fetchError === 'API_KEY_REQUIRED' ? <KeyRound className="text-yellow-400 flex-shrink-0 h-6 w-6" /> : <AlertTriangle className="text-red-400 flex-shrink-0 h-6 w-6" />}
                          <div className='text-center sm:text-left'>
                              {fetchError === 'API_KEY_REQUIRED' ? (
                                  <>
                                      <p className="font-semibold text-yellow-200 text-lg">++ Astropathic Link Severed: Vox Key Configuration Required ++</p>
                                      <p className="text-sm mt-1">Operative Vox Key missing or invalid. Proceed to <Link href="/settings" className="font-bold underline hover:text-yellow-100">Interface Calibration</Link> to establish connection.</p>
                                  </> 
                              ) : (
                                  <>
                                      <p className="font-semibold text-red-200 text-lg">++ Data Feed Corruption Detected ++</p>
                                      <p className="text-sm mt-1">Error acquiring data stream: {fetchError}. Attempting re-transmission or consult Cogitator Log.</p>
                                  </> 
                              )}
                          </div>
                     </div>
                 )}

                {/* Render content only if logged in and potentially loaded */}
                {/* Login check is already done above, focus on data loading/error here */}
                {!isLoading && !fetchError && playerData?.player && (
                     <OpenUnitContext.Provider value={openUnitContextValue}> 
                         {/* Breadcrumbs - REMOVED from here */}
                         {/* <div className="mb-4"> <Breadcrumbs items={breadcrumbs} /> </div> */}
                         
                         {/* Cogitator uses full height, render outside max-width wrapper */}
                         {selectedSectionId === 'cogitator' && (
                             <div className="w-full max-w-4xl mx-auto h-full">
                                 <CogitatorSection
                                     playerData={playerData}
                                     guildData={guildData}
                                     allSeasonsRaidData={allSeasonsRaidData}
                                     tacticusUserId={tacticusUserId}
                                 />
                             </div>
                         )}

                         {/* Other sections use standard wrapper */}
                         {selectedSectionId !== 'cogitator' && (
                         <div className="w-full max-w-6xl mx-auto">
                            {selectedSectionId === 'dashboard' && <DashboardOverview
                                playerData={playerData}
                                allSeasonsRaidData={allSeasonsRaidData}
                                tacticusUserId={tacticusUserId}
                                units={playerData?.player?.units}
                                myMostUsedTeamData={myMostUsedTeamLastSeason}
                                guildTopTeamsData={guildTopTeamsLastSeason}
                            />}
                            {selectedSectionId === 'vitals' && <PlayerVitalsSection playerData={playerData} user={user} />}
                            {selectedSectionId === 'guild' && (
                                <>
                                    <GuildAffiliationSection guildData={guildData} />
                                    <div className="mt-4">
                                        <GuildActivityMonitor guild={guildData?.guild} />
                                    </div>
                                </>
                            )}
                            {selectedSectionId === 'raidIntel' && (
                                <>
                                    <GuildRaidIntelSection
                                        raidDataForDisplay={raidDataForDisplay}
                                        selectedSeason={selectedSeason}
                                        availableSeasons={availableSeasons}
                                        setSelectedSeason={setSelectedSeason}
                                        playerData={playerData}
                                        heroNameMap={heroNameMap}
                                        unitDetailsMap={unitDetailsMap}
                                        updateBreadcrumbs={setBreadcrumbs}
                                        baseBreadcrumb={breadcrumbs.length > 0 && breadcrumbs[0].onClick ? breadcrumbs[0] : { label: 'Raid Intel' /* Fallback */, onClick: resetRaidIntelView }}
                                    />
                                    <div className="mt-4">
                                        <RaidEfficiencyAnalysis
                                            allSeasonsRaidData={allSeasonsRaidData}
                                            tacticusUserId={tacticusUserId}
                                            units={playerData?.player?.units}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <RaidSeasonTrends
                                            allSeasonsRaidData={allSeasonsRaidData}
                                            tacticusUserId={tacticusUserId}
                                        />
                                    </div>
                                </>
                            )}
                            {selectedSectionId === 'armoury' && (
                                <>
                                    <ArmouryStoresSection
                                        inventory={playerData?.player?.inventory}
                                        updateBreadcrumbs={setBreadcrumbs}
                                        baseBreadcrumb={breadcrumbs.length > 0 && breadcrumbs[0].onClick ? breadcrumbs[0] : { label: 'Armoury & Stores', onClick: resetArmouryView }}
                                        selectedCategory={selectedArmouryCategory}
                                        onSelectCategory={setSelectedArmouryCategory}
                                    />
                                    <div className="mt-4">
                                        <EquipmentAudit
                                            units={playerData?.player?.units}
                                            inventoryItems={playerData?.player?.inventory?.items}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <ResourceBudget inventory={playerData?.player?.inventory} />
                                    </div>
                                </>
                            )}
                            {selectedSectionId === 'missions' && (
                                <>
                                    <TokenManagement progress={playerData?.player?.progress} />
                                    <div className="mt-4">
                                        <MissionProgressSection progress={playerData?.player?.progress} renderTokens={renderTokens} />
                                    </div>
                                    <div className="mt-4">
                                        <CampaignAnalysis progress={playerData?.player?.progress} />
                                    </div>
                                </>
                            )}
                            {selectedSectionId === 'roster' && (
                                <>
                                    <RosterStrengthAnalysis units={playerData?.player?.units} />
                                    <div className="mt-4">
                                        <UnitReadinessSection units={playerData?.player?.units} />
                                    </div>
                                    <div className="mt-4">
                                        <ShardFarmingPriority
                                            units={playerData?.player?.units}
                                            inventoryShards={playerData?.player?.inventory?.shards}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <AbilityAnalysis units={playerData?.player?.units} />
                                    </div>
                                    <div className="mt-4">
                                        <UpgradeProgress units={playerData?.player?.units} />
                                    </div>
                                    <div className="mt-4">
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
                                            heroPerformanceData={heroPerformanceData}
                                        />
                                    </div>
                                </>
                            )}
                         </div>
                         )}
                     </OpenUnitContext.Provider> 
                )}
                
                {/* Data Loading Spinner (Initial Data Load, different from manual refresh) */}
                {isLoading && !isManualRefreshing && !fetchError && user && (
                     <div className="flex justify-center items-center py-10">
                         <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[rgb(var(--primary-color))]" title="Acquiring Data Feed..."></div>
                     </div> 
                )}
                
                {/* Fallback message if logged in but no player data */}
                {!isLoading && !fetchError && !playerData?.player && user && (
                     <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)] text-center mt-10">++ No Valid Operative Data Received - Check Vox Key Configuration ++</p>
                )}
            </main>
        </div>
    </div>
  );
}
