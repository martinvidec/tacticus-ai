import React from 'react';
import { GuildRaidResponse, PublicHeroDetail, PlayerDataResponse } from '@/lib/types';
import CollapsibleSection from './CollapsibleSection';
import { Swords, User, Target as TargetIcon, Bomb, Calendar } from 'lucide-react';
import SeasonSelector from './SeasonSelector';
import BossPerformanceSection from './BossPerformanceSection';
import { useOpenUnit } from '../page'; // Adjust path if context is defined elsewhere
import HeroPowerRankingChart from './charts/HeroPowerRankingChart';
import { BreadcrumbItem } from './Breadcrumbs'; // Import BreadcrumbItem type

interface GuildRaidIntelSectionProps {
  raidDataForDisplay: Record<number, GuildRaidResponse>;
  selectedSeason: number | 'all';
  availableSeasons: number[];
  setSelectedSeason: (value: number | 'all') => void;
  playerData: PlayerDataResponse | null;
  heroNameMap: Map<string, string>;
  unitDetailsMap: Map<string, { name?: string, faction?: string, grandAlliance?: string }>;
  updateBreadcrumbs: (newBreadcrumbs: BreadcrumbItem[]) => void;
  baseBreadcrumb: BreadcrumbItem; // Pass the base breadcrumb item for this section
}

const GuildRaidIntelSection: React.FC<GuildRaidIntelSectionProps> = ({
  raidDataForDisplay,
  selectedSeason,
  availableSeasons,
  setSelectedSeason,
  playerData,
  heroNameMap,
  unitDetailsMap,
  updateBreadcrumbs,
  baseBreadcrumb, // Receive the base breadcrumb
}) => {
  const title = `Guild Raid Intel & Performance`;
  const { toggleUnitOpen, openCombatUnitsSection } = useOpenUnit();

  // Define the handler outside the loops, accepting the unitId
  const handleHeroLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, unitId: string) => {
      event.preventDefault(); // Prevent default anchor jump
      // FIRST, ensure the parent Combat Units section is open
      openCombatUnitsSection();
      // THEN, toggle the specific unit's details
      toggleUnitOpen(unitId); // Use the passed unitId
      // Optional: Programmatic scroll after a short delay
      setTimeout(() => {
        const targetElement = document.getElementById(`hero-timeline-${unitId}`); // Use the passed unitId
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // Small delay
  };

  const formatDate = (dateStringOrUnixSeconds: string | number | undefined) => {
    if (dateStringOrUnixSeconds === undefined || dateStringOrUnixSeconds === null) return 'N/A';

    let timestampInMillis: number;

    // Check if it's a number (likely Unix seconds) or a string
    if (typeof dateStringOrUnixSeconds === 'number') {
        timestampInMillis = dateStringOrUnixSeconds * 1000; 
    } else if (typeof dateStringOrUnixSeconds === 'string') {
        const parsedNum = parseInt(dateStringOrUnixSeconds, 10);
        if (!isNaN(parsedNum)) {
            // Assume it's a string representation of Unix seconds
            timestampInMillis = parsedNum * 1000;
        } else {
            // Try parsing as a date string directly (fallback)
            timestampInMillis = Date.parse(dateStringOrUnixSeconds);
        }
    } else {
        return 'Invalid Input'; // Should not happen based on input type
    }

    try {
      // Check if the resulting timestamp is valid
      if (isNaN(timestampInMillis)) {
          return 'Invalid Date';
      }
      return new Date(timestampInMillis).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Handler for season change that also updates breadcrumbs
  const handleSeasonChange = (newSeason: number | 'all') => {
      // Call the original state setter from page.tsx
      setSelectedSeason(newSeason);

      // Update breadcrumbs based on the new selection
      if (newSeason === 'all') {
          // Reset to base breadcrumb when 'all' is selected
          updateBreadcrumbs([baseBreadcrumb]);
      } else {
          // Add the selected season as a new breadcrumb level
          updateBreadcrumbs([
              baseBreadcrumb, // Keep the clickable base level
              { label: `Season ${newSeason}` } // Add the non-clickable season level
          ]);
      }
  };

  return (
    <CollapsibleSection title={title} icon={<Swords size={20} />}>
      <SeasonSelector 
        availableSeasons={availableSeasons}
        selectedSeason={selectedSeason}
        setSelectedSeason={handleSeasonChange}
      />

      <BossPerformanceSection 
        playerData={playerData} 
        raidDataForDisplay={raidDataForDisplay} 
      />

      <h4 className="text-base font-semibold text-[rgb(var(--primary-color))] mt-4 mb-2 border-t border-[rgb(var(--border-color))] pt-3">Detailed Raid Entries ({selectedSeason === 'all' ? 'All Selected' : `Season ${selectedSeason}`})</h4>
      {Object.keys(raidDataForDisplay).length > 0 ? (
        <div className="space-y-4 text-sm">
          {Object.entries(raidDataForDisplay).map(([season, data]) => {
            const entries: GuildRaidResponse['entries'] = (data && typeof data === 'object' && 'entries' in data && Array.isArray(data.entries)) ? data.entries : [];
            const entryCount = entries.length;

            const shouldRenderSeasonHeader = selectedSeason === 'all' && entryCount > 0;

            return (
              <div key={season} className={`${shouldRenderSeasonHeader ? 'border-b border-[rgba(var(--border-color),0.5)] pb-3 last:border-b-0 mb-3' : ''}`}>
                {shouldRenderSeasonHeader && (
                  <p className="mb-2"><strong className="text-[rgb(var(--primary-color))] font-semibold">Season {season}:</strong> {entryCount} Entries</p>
                )}
                {entries.length > 0 ? (
                  <ul className="space-y-2 pl-2 max-h-96 overflow-y-auto pr-1">
                    {entries.map((entry: GuildRaidResponse['entries'][number], index: number) => {
                      // Calculate average power and faction counts for this entry
                      let totalPower = 0;
                      let heroCount = 0;
                      const factionCounts: Record<string, number> = {};

                      if (entry.heroDetails) {
                        entry.heroDetails.forEach(hero => {
                          if (hero.power !== undefined && hero.power !== null) {
                            totalPower += hero.power;
                            heroCount++;
                          }
                          // Get faction from the map
                          const details = unitDetailsMap.get(hero.unitId);
                          const faction = details?.faction || 'Unknown';
                          factionCounts[faction] = (factionCounts[faction] || 0) + 1;
                        });
                      }

                      const averagePower = heroCount > 0 ? Math.round(totalPower / heroCount) : 0;
                      const factionSummary = Object.entries(factionCounts)
                        .map(([faction, count]) => `${faction.substring(0,3)}: ${count}`)
                        .join(', ');

                      // Prepare data for the new charts
                      const powerRankingData = entry.heroDetails?.map(hero => ({
                          name: heroNameMap.get(hero.unitId) || hero.unitId, // Use name from map
                          Power: hero.power || 0,
                          alliance: unitDetailsMap.get(hero.unitId)?.grandAlliance || 'Unknown',
                      })) || [];

                      return (
                        <li key={`${season}-${index}-${entry.userId}-${entry.startedOn}`} className="border border-[rgba(var(--border-color),0.3)] p-2 rounded bg-[rgba(var(--background-start-rgb),0.5)] text-xs">
                          {/* Part 1: Raid Info & Metrics */}
                          <div>
                             {/* Raid Info Flexbox */}
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1">
                                 {/* User */}
                                 <span className="flex items-center space-x-1">
                                   <User size={12} className="text-[rgb(var(--primary-color))] opacity-80"/> 
                                   <span>{entry.userId?.substring(0, 8) ?? 'N/A'}...</span>
                                 </span>
                                 <span className="text-[rgb(var(--border-color))] text-[10px]">|</span>
                                 {/* Boss */}
                                 <span className="flex items-center space-x-1">
                                   <TargetIcon size={12} className="text-[rgb(var(--primary-color))] opacity-80"/> 
                                   <span>{entry.unitId?.replace('GuildBoss','').split('Boss')[1] ?? entry.unitId ?? 'N/A'} ({entry.encounterType})</span>
                                 </span>
                                 <span className="text-[rgb(var(--border-color))] text-[10px]">|</span>
                                 {/* Damage */}
                                 <span className="flex items-center space-x-1">
                                   <strong className="text-[rgb(var(--primary-color))] font-semibold">Dmg:</strong> 
                                   <span>{entry.damageDealt?.toLocaleString() ?? 'N/A'}</span>
                                 </span>
                                 <span className="text-[rgb(var(--border-color))] text-[10px]">|</span>
                                 {/* Damage Type */}
                                 <span className="flex items-center space-x-1">
                                   {entry.damageType === 'Bomb' ? <Bomb size={12} className="text-orange-400"/> : <Swords size={12} className="text-red-400"/>}
                                   <span>{entry.damageType ?? 'N/A'}</span>
                                 </span>
                                 <span className="text-[rgb(var(--border-color))] text-[10px]">|</span>
                                 {/* Date */}
                                 <span className="flex items-center space-x-1">
                                   <Calendar size={12} className="text-[rgb(var(--primary-color))] opacity-80"/>
                                   <span>{formatDate(entry.startedOn)}</span>
                                 </span>
                             </div>
                             {/* Calculated Metrics */}
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 pt-1 border-t border-[rgba(var(--border-color),0.2)] text-[10px]">
                                 {averagePower > 0 && (
                                     <span className="font-medium">Avg Power: {averagePower.toLocaleString()}</span>
                                 )}
                                 {factionSummary && averagePower > 0 && (
                                    <span className="text-[rgb(var(--border-color))] text-[10px]">|</span>
                                 )}
                                 {factionSummary && (
                                     <span>Factions: {factionSummary}</span>
                                 )}
                             </div>
                          </div>

                          {/* Part 2: Hero List & Charts (placed below Part 1) */}
                          {entry.heroDetails && entry.heroDetails.length > 0 && (
                              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-2 border-t border-[rgba(var(--border-color),0.2)] pt-2 w-full">
                                  {/* Hero List */}
                                  <div className="w-full sm:w-1/3 md:w-1/3 lg:w-auto">
                                      <p className="text-[11px] font-medium text-[rgb(var(--primary-color),0.9)] mb-0.5">Heroes:</p>
                                      <ul className="list-none pl-1 space-y-0.5 text-[10px] max-h-28 md:max-h-full overflow-y-auto pr-1">
                                        {entry.heroDetails.map((hero: PublicHeroDetail) => (
                                          <li key={hero.unitId}>
                                            <a 
                                              href={`#hero-timeline-${hero.unitId}`} 
                                              className="text-[rgb(var(--primary-color))] hover:underline cursor-pointer"
                                              title={`Scroll to ${heroNameMap.get(hero.unitId) || hero.unitId}'s timeline`}
                                              onClick={(e) => handleHeroLinkClick(e, hero.unitId)}
                                            >
                                              {heroNameMap.get(hero.unitId) || hero.unitId}
                                            </a>
                                            : <span className="text-[rgba(var(--foreground-rgb),0.8)]">{hero.power?.toLocaleString()} P</span>
                                          </li>
                                        ))}
                                      </ul>
                                  </div>

                                  {/* Power Ranking Chart - Adjust width to take remaining space */}
                                  <div className="w-full sm:w-2/3 md:w-2/3 lg:flex-grow"> {/* Let it grow */}
                                      <HeroPowerRankingChart data={powerRankingData} />
                                  </div>
                              </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  selectedSeason === 'all' && <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)] pl-2">No entries for Season {season}.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No raid data available for the selected season(s).</p>
      )}
    </CollapsibleSection>
  );
};

export default GuildRaidIntelSection; 