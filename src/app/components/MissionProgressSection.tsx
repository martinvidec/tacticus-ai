import React from 'react';
import { Progress, CampaignProgress, CampaignLevel } from '@/lib/types';
import CollapsibleSection from './CollapsibleSection';
import { TrendingUp, ChevronDown } from 'lucide-react';

interface MissionProgressSectionProps {
  progress: Progress | null | undefined;
  renderTokens: (tokenData: { current?: number; max?: number; regenDelayInSeconds?: number } | null | undefined, name: string) => React.ReactNode;
}

const MissionProgressSection: React.FC<MissionProgressSectionProps> = ({ progress, renderTokens }) => {
  if (!progress) {
    return null;
  }

  // Check if there is any token data or campaign data to display
  const hasTokenData = progress.arena?.tokens || progress.guildRaid?.tokens || progress.guildRaid?.bombTokens || progress.onslaught?.tokens || progress.salvageRun?.tokens;
  const hasCampaignData = progress.campaigns && progress.campaigns.length > 0;

  if (!hasTokenData && !hasCampaignData) {
    return null; // Don't render the section if there's nothing to show
  }

  return (
    <CollapsibleSection title="Mission Progress & Resources" icon={<TrendingUp size={20} />}>
      {hasTokenData && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mb-3">
             {renderTokens(progress.arena?.tokens, 'Arena')}
             {renderTokens(progress.guildRaid?.tokens, 'Guild Raid')}
             {renderTokens(progress.guildRaid?.bombTokens, 'Guild Raid Bomb')}
             {renderTokens(progress.onslaught?.tokens, 'Onslaught')}
             {renderTokens(progress.salvageRun?.tokens, 'Salvage Run')}
         </div>
      )}
      {hasCampaignData && (
          <>
             <h3 className="font-semibold text-base text-[rgb(var(--primary-color))] mt-2 mb-1">Campaign Logs</h3>
             <div className="space-y-1">
             {progress.campaigns.map((campaign: CampaignProgress) => (
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
  );
};

export default MissionProgressSection; 