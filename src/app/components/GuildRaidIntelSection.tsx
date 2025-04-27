import React from 'react';
import { GuildRaidResponse, PublicHeroDetail } from '@/lib/types';
import CollapsibleSection from './CollapsibleSection';
import { Swords, User, Target as TargetIcon, Bomb, Calendar } from 'lucide-react';

interface GuildRaidIntelSectionProps {
  raidDataForDisplay: Record<number, GuildRaidResponse>;
  selectedSeason: number | 'all';
}

const GuildRaidIntelSection: React.FC<GuildRaidIntelSectionProps> = ({ raidDataForDisplay, selectedSeason }) => {
  const title = `Guild Raid Intel (${selectedSeason === 'all' ? 'All Selected' : `Season ${selectedSeason}`})`;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <CollapsibleSection title={title} icon={<Swords size={20} />}>
      {Object.keys(raidDataForDisplay).length > 0 ? (
        <div className="space-y-4 text-sm">
          {Object.entries(raidDataForDisplay).map(([season, data]) => {
            const entries: GuildRaidResponse['entries'] = (data && typeof data === 'object' && 'entries' in data && Array.isArray(data.entries)) ? data.entries : [];
            const entryCount = entries.length;
            return (
              <div key={season} className="border-b border-[rgba(var(--border-color),0.5)] pb-3 last:border-b-0">
                <p className="mb-2"><strong className="text-[rgb(var(--primary-color))] font-semibold">Season {season}:</strong> {entryCount} Entries</p>
                {entries.length > 0 && (
                  <ul className="space-y-2 pl-2 max-h-96 overflow-y-auto pr-1">
                    {entries.map((entry: GuildRaidResponse['entries'][number], index: number) => (
                      <li key={`${season}-${index}-${entry.userId}-${entry.startedOn}`} className="border border-[rgba(var(--border-color),0.3)] p-2 rounded bg-[rgba(var(--background-start-rgb),0.5)] text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                          <div className="flex items-center space-x-1">
                              <User size={12} className="text-[rgb(var(--primary-color))] opacity-80"/> 
                              <span>{entry.userId?.substring(0, 8) ?? 'N/A'}...</span>
                          </div>
                          <div className="flex items-center space-x-1">
                              <TargetIcon size={12} className="text-[rgb(var(--primary-color))] opacity-80"/> 
                              <span>{entry.unitId?.replace('GuildBoss','').split('Boss')[1] ?? entry.unitId ?? 'N/A'} ({entry.encounterType})</span>
                          </div>
                          <div className="flex items-center space-x-1">
                              <strong className="text-[rgb(var(--primary-color))] font-semibold">Dmg:</strong> 
                              <span>{entry.damageDealt?.toLocaleString() ?? 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                              {entry.damageType === 'Bomb' ? <Bomb size={12} className="text-orange-400"/> : <Swords size={12} className="text-red-400"/>}
                              <span>{entry.damageType ?? 'N/A'}</span>
                          </div>
                           <div className="flex items-center space-x-1 col-span-full sm:col-span-1">
                              <Calendar size={12} className="text-[rgb(var(--primary-color))] opacity-80"/>
                              <span>{formatDate(entry.startedOn)}</span>
                          </div>
                        </div>
                        {entry.heroDetails && entry.heroDetails.length > 0 && (
                          <details className="mt-1.5">
                            <summary className="text-[10px] cursor-pointer text-[rgba(var(--foreground-rgb),0.7)]">Hero Details ({entry.heroDetails.length})</summary>
                            <ul className="list-disc list-inside pl-3 text-[10px]">
                              {entry.heroDetails.map((hero: PublicHeroDetail) => 
                                <li key={hero.unitId}>{hero.unitId}: {hero.power?.toLocaleString()} Power</li>
                              )}
                            </ul>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
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