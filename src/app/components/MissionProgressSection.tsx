import React from 'react';
import { Progress, CampaignProgress, CampaignLevel } from '@/lib/types';

interface MissionProgressSectionProps {
  progress: Progress | null | undefined;
  renderTokens: (tokenData: any, name: string) => React.ReactNode;
}

const MissionProgressSection: React.FC<MissionProgressSectionProps> = ({ progress, renderTokens }) => {
  if (!progress) {
    return <p>++ No Mission Progress Data Available ++</p>;
  }

  const renderCampaign = (campaign: CampaignProgress) => (
    <details key={campaign.id} className="mb-2 bg-[rgba(var(--background-start-rgb),0.6)] p-2 border border-[rgba(var(--border-color),0.5)] rounded">
      <summary className="cursor-pointer text-xs font-medium">{campaign.name} ({campaign.type})</summary>
      <ul className="list-disc list-inside pl-4 mt-1 text-[10px]">
        {campaign.battles?.map((battle: CampaignLevel, idx: number) => (
          <li key={`${campaign.id}-${idx}`}>Battle {battle.battleIndex}: {battle.attemptsUsed} used, {battle.attemptsLeft} left</li>
        ))}
      </ul>
    </details>
  );

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Mission Progress & Resources
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="text-base font-semibold text-[rgb(var(--primary-color))] mb-2">Resource Tokens</h4>
          {renderTokens(progress.arena?.tokens, 'Arena')}
          {renderTokens(progress.guildRaid?.tokens, 'Guild Raid')}
          {renderTokens(progress.guildRaid?.bombTokens, 'Raid Bomb')}
          {renderTokens(progress.onslaught?.tokens, 'Onslaught')}
          {renderTokens(progress.salvageRun?.tokens, 'Salvage Run')}
        </div>

        <div>
          <h4 className="text-base font-semibold text-[rgb(var(--primary-color))] mb-2">Campaign Progress</h4>
          {progress.campaigns && progress.campaigns.length > 0 ? (
            <div className="max-h-60 overflow-y-auto pr-2">
              {progress.campaigns.map(renderCampaign)}
            </div>
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.7)]">No campaign data found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionProgressSection; 