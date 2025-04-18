'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDebug } from '@/lib/contexts/DebugContext';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb, GrandAlliance, Faction, Player, GuildMember } from '@/lib/types';
import { ChevronDown, ChevronUp, Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords, KeyRound, AlertTriangle, ArrowUp, ArrowDown, SettingsIcon } from 'lucide-react';
import { Select, SelectItem, MultiSelect, MultiSelectItem, Card, Title, Button, TextInput, Metric } from '@tremor/react';

// Import Chart Components
import PowerLevelMetric from './components/charts/PowerLevelMetric';
import AllianceBarList from './components/charts/AllianceBarList';
import PlayerNameMetric from './components/charts/PlayerNameMetric';
import RaidDamageMetric from './components/charts/RaidDamageMetric';
import RaidParticipationMetric from './components/charts/RaidParticipationMetric';

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

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { setLastApiResponse, setIsPopupOpen } = useDebug();
  
  // --- State for API Data --- 
  const [playerData, setPlayerData] = useState<PlayerDataResponse | null>(null);
  const [guildData, setGuildData] = useState<GuildResponse | null>(null);
  const [guildRaidData, setGuildRaidData] = useState<GuildRaidResponse | null>(null);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // --- Fetch Logic --- 
  const fetchAllData = useCallback(async () => {
    if (!user) {
      setPlayerData(null); setGuildData(null); setGuildRaidData(null);
      setFetchError(null);
      setLastApiResponse(null);
      return;
    }
    let idToken = null;
    try {
      idToken = await user.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      setFetchError("Fehler beim Abrufen des Authentifizierungs-Tokens.");
      setIsFetchingData(false); return;
    }
    if (!idToken) {
      console.error("Failed to get ID token, cannot fetch data.");
      setFetchError("Authentifizierungs-Token konnte nicht abgerufen werden.");
      setIsFetchingData(false); return;
    }
    
    setIsFetchingData(true); setFetchError(null);
    setPlayerData(null); setGuildData(null); setGuildRaidData(null);
    setLastApiResponse(null);
    
    let combinedError: string | null = null;
    const fetchOptions = { headers: { 'Authorization': `Bearer ${idToken}` } };

    const results = await Promise.allSettled([
      fetch('/api/tacticus/player', fetchOptions),
      fetch('/api/tacticus/guild', fetchOptions),
      fetch('/api/tacticus/guildRaid', fetchOptions)
    ]);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const endpoint = ['player', 'guild', 'guildRaid'][i];
      let errorType = `${endpoint.toUpperCase()}_FETCH_FAILED`;
      let errorData: ApiError | null = null;
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (!response.ok) {
          try { errorData = response.status === 404 ? null : await response.json(); } catch (e) {}
          errorType = errorData?.type || (response.status === 404 ? `${endpoint.toUpperCase()}_NOT_FOUND` : errorType);
          if (response.status === 403 && errorType === 'API_KEY_NOT_SET') {
            combinedError = 'API_KEY_REQUIRED';
            setLastApiResponse({ endpoint, status: response.status, error: { type: errorType } });
          } else if (response.status === 404) {
            setLastApiResponse({ endpoint, status: 404, data: { message: `No data found for ${endpoint}.` } });
            if (endpoint === 'guild') setGuildData(null);
            if (endpoint === 'guildRaid') setGuildRaidData(null);
          } else {
            if (response.status === 401) errorType = 'UNAUTHORIZED';
            setLastApiResponse({ endpoint, status: response.status, error: errorData || { type: errorType } });
            combinedError = combinedError ? `${combinedError}; ${endpoint}: ${errorType}` : `${endpoint}: ${errorType}`;
          }
        } else {
          try {
            const data = await response.json();
            if (endpoint === 'player') setPlayerData(data as PlayerDataResponse);
            if (endpoint === 'guild') setGuildData(data as GuildResponse);
            if (endpoint === 'guildRaid') setGuildRaidData(data as GuildRaidResponse);
            setLastApiResponse({ endpoint, data });
          } catch (e: any) {
            console.error(`Error parsing JSON for ${endpoint}:`, e);
            combinedError = combinedError ? `${combinedError}; ${endpoint}: PARSE_ERROR` : `${endpoint}: PARSE_ERROR`;
            setLastApiResponse({ endpoint, error: { type: 'PARSE_ERROR', reason: e.message } });
          }
        }
      } else {
        console.error(`Fetch error for ${endpoint} data:`, result.reason);
        combinedError = combinedError ? `${combinedError}; ${endpoint}: FETCH_ERROR` : `${endpoint}: FETCH_ERROR`;
        setLastApiResponse({ endpoint, error: { type: 'FETCH_ERROR', reason: result.reason?.message } });
      }
    }
    if (combinedError) {
      setFetchError(combinedError);
    }
    setIsFetchingData(false);
  }, [user, setLastApiResponse]);

  useEffect(() => {
    if (!authLoading && user) { fetchAllData(); }
    if (authLoading || !user) {
      setPlayerData(null); setGuildData(null); setGuildRaidData(null);
      setFetchError(null);
      setLastApiResponse(null);
    }
  }, [user, authLoading, fetchAllData, setLastApiResponse]);

  const renderTokens = (tokenData: { current?: number; max?: number; regenDelayInSeconds?: number } | null, name: string) => {
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

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[rgb(var(--primary-color))]"></div></div>;
  }

  if (!user) {
    return <div className="text-center mt-10 text-lg text-[rgb(var(--foreground-rgb),0.8)]">++ Authentication Required: Transmit Identification via Google Relay ++</div>;
  }

  if (fetchError && !isFetchingData) {
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

  if (!isFetchingData && !fetchError && !playerData) {
    return (
      <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)] text-center mt-10">++ No Valid Data Feed Received ++</p>
    );
  }

  return (
    <main className="flex flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-[rgb(var(--primary-color))] uppercase tracking-wider">Tacticus Player Intel</h1>

      {isFetchingData && (
        <p className="text-lg text-[rgb(var(--foreground-rgb),0.8)]">Retrieving Data Feed...</p>
      )}

      {!isFetchingData && !fetchError && playerData?.player && (
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            {playerData && (
              <>
                {/* Pass player details to player-specific metrics */}
                <PlayerNameMetric playerDetails={playerData.player.details} />
                <PowerLevelMetric playerDetails={playerData.player.details} />
              </>
            )}
            {guildRaidData && (
              <>
                {/* Pass the full guild raid data to raid-specific metrics */}
                {/* We also need the player name to filter raid entries */}
                <RaidDamageMetric 
                  raidData={guildRaidData} 
                  playerName={playerData?.player.details.name} 
                />
                <RaidParticipationMetric raidData={guildRaidData} />
              </>
            )}
          </div>

          <h2 className="text-2xl font-semibold text-[rgb(var(--primary-color))] mb-4 border-b border-[rgb(var(--border-color))] pb-2">Detailed Intel</h2>

          <CollapsibleSection title="Player Identification & Vitals" icon={<ShieldCheck size={20}/>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Designation:</strong> {playerData.player?.details?.playerName ?? 'N/A'}</div>
              <div><strong className="text-[rgb(var(--primary-color))] font-semibold">ID:</strong> {playerData.player?.details?.playerId ?? 'N/A'}</div>
              <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Combat Effectiveness (Power):</strong> {playerData.player?.powerLevel ?? 'N/A'}</div>
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
               {guildRaidData ? ( 
                  <div className="space-y-1 text-sm">
                   <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Season/ID:</strong> {guildRaidData?.raidDefinitionId ?? 'N/A'}</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Status:</strong> {guildRaidData?.status ?? 'N/A'}</p>
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Ends In:</strong> {guildRaidData?.endsIn ? new Date(guildRaidData.endsIn * 1000).toLocaleString() : 'N/A'}</p>
                   {guildRaidData.bosses && guildRaidData.bosses.length > 0 && (
                       <details className="mt-2">
                           <summary className="cursor-pointer font-medium text-xs">Bosses ({guildRaidData.bosses.length})</summary>
                           <div className="space-y-1 mt-1">
                           {guildRaidData.bosses.map(boss => (
                               <div key={boss.bossDefinitionId} className="p-2 border border-[rgb(var(--border-color))] rounded bg-[rgba(var(--background-start-rgb),0.8)] text-xs">
                                   <p className="font-semibold capitalize">{boss.bossDefinitionId.replace(/_/g, ' ')}</p>
                                   <p>HP Remaining: {boss?.hpRemaining?.toLocaleString() ?? 'N/A'}</p>
                                   <p>Level: {boss?.level ?? 'N/A'}</p>
                               </div>
                           ))}
                           </div>
                       </details>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No current guild raid data found.</p>
                )}
          </CollapsibleSection>

          <CollapsibleSection 
               title={`Combat Units (${filteredAndSortedUnits.length} / ${playerData.player.units?.length ?? 0})`} 
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
                    filteredAndSortedUnits.map((unit: Unit) => (
                     <details key={unit.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)]">
                       <summary className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-sm text-[rgb(var(--foreground-rgb),0.95)]">
                          <span>{unit.name || unit.id} (Lvl {unit.xpLevel ?? '-'}, Rank {unit.rank ?? '-'})</span>
                         <ChevronDown size={18} className="opacity-70" />
                       </summary>
                       <div className="p-3 border-t border-[rgb(var(--border-color))] space-y-1 text-xs text-[rgb(var(--foreground-rgb),0.85)]">
                         <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                             <p><strong>ID:</strong> {unit.id}</p>
                             <p><strong>Faction:</strong> {unit.faction ?? 'N/A'}</p>
                             <p><strong>Alliance:</strong> {unit.grandAlliance ?? 'N/A'}</p>
                             <p><strong>XP:</strong> {unit.xp ?? 'N/A'}</p>
                             <p><strong>Stars:</strong> {unit.progressionIndex ?? 'N/A'}</p>
                             <p><strong>Rarity:</strong> {unit.rarity ?? 'N/A'}</p>
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
                          {unit.stats && (
                               <details className="mt-2">
                                   <summary className="cursor-pointer font-medium text-xs">Stats</summary>
                                   <pre className="text-xs bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded mt-1 max-h-48 overflow-auto">{JSON.stringify(unit.stats, null, 2)}</pre>
                               </details>
                          )}
                       </div>
                     </details>
                   ))
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
