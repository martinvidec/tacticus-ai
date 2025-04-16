'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { PlayerDataResponse, ApiError, Unit, Inventory, Progress, CampaignProgress, CampaignLevel, UnitItem, Ability, Item, Shard, XpBook, AbilityBadge, Component, ForgeBadge, Orb } from '@/lib/types';
import { ChevronDown, ChevronUp, Skull, Target, ShieldCheck, Box, TrendingUp, BookOpen } from 'lucide-react'; // Added more icons

// Helper component for collapsible sections - Themed
const CollapsibleSection: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    // Use thematic colors and border
    <details className="border border-[rgb(var(--border-color))] rounded-lg mb-4 overflow-hidden bg-[rgb(var(--highlight-bg))] shadow-md" onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex justify-between items-center p-3 md:p-4 bg-gradient-to-b from-[rgba(var(--border-color),0.5)] to-[rgba(var(--border-color),0.2)] hover:from-[rgba(var(--border-color),0.6)] hover:to-[rgba(var(--border-color),0.3)] cursor-pointer font-semibold text-lg text-[rgb(var(--primary-color))]">
        <div className="flex items-center space-x-2">
          {icon} 
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </summary>
      {/* Lighter text color inside details for contrast */}
      <div className="p-4 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.9)]">
        {children}
      </div>
    </details>
  );
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [playerData, setPlayerData] = useState<PlayerDataResponse | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
              {/* Player Details and Meta Data (Collapsible) - Use Icon */}
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

              {/* Units Section (Collapsible) - Use Icon */}
              <CollapsibleSection title={`Combat Units (${playerData.player.units.length})`} icon={<Target size={20} />}>
                <div className="space-y-3">
                  {playerData.player.units.map((unit: Unit) => (
                    // Themed details/summary for units
                    <details key={unit.id} className="border border-[rgb(var(--border-color))] rounded-md overflow-hidden bg-[rgba(var(--background-end-rgb),0.5)]">
                      <summary className="p-2 flex justify-between items-center bg-[rgba(var(--border-color),0.1)] hover:bg-[rgba(var(--border-color),0.2)] cursor-pointer font-medium text-[rgb(var(--foreground-rgb),0.95)]">
                        <span>{unit.name || unit.id} (Lvl {unit.xpLevel}, Rank {unit.rank}, {unit.shards} Shards)</span>
                        <ChevronDown size={18} className="opacity-70" />
                      </summary>
                      <div className="p-3 border-t border-[rgb(var(--border-color))] space-y-1 text-sm text-[rgb(var(--foreground-rgb),0.85)]">
                        {/* Use grid for better alignment */}
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
                  ))}
                </div>
              </CollapsibleSection>

              {/* Inventory Section (Collapsible) - Use Icon */}
              <CollapsibleSection title="Armoury & Stores" icon={<Box size={20} />}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Reset Stones:</strong> {playerData.player.inventory.resetStones}</p>
                    {playerData.player.inventory.requisitionOrders && (
                        <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Requisition Orders:</strong> Reg: {playerData.player.inventory.requisitionOrders.regular}, Bless: {playerData.player.inventory.requisitionOrders.blessed}</p>
                    )}
                 </div>
                 {/* Sub-sections for items, shards, etc. - Use Pre for raw data */}
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

              {/* Progress Section (Collapsible) - Use Icon */}
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
