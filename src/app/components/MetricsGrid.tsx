import React from 'react';
import { PlayerDataResponse, GuildRaidResponse } from '@/lib/types';

// Import the individual metric components
import PowerLevelMetric from './charts/PowerLevelMetric';
import PlayerNameMetric from './charts/PlayerNameMetric';
import RaidDamageMetric from './charts/RaidDamageMetric';
import RaidParticipationMetric from './charts/RaidParticipationMetric';

interface MetricsGridProps {
  playerData: PlayerDataResponse | null;
  allSeasonsRaidData: Record<number, GuildRaidResponse>;
  tacticusUserId: string | null;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ playerData, allSeasonsRaidData, tacticusUserId }) => {
  const hasRaidData = Object.keys(allSeasonsRaidData).length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
      {/* Player-specific metrics */}
      {playerData?.player?.details && (
        <>
          <PlayerNameMetric playerDetails={playerData.player.details} />
          <PowerLevelMetric playerDetails={playerData.player.details} />
        </>
      )}
      {/* Conditionally render Raid metrics only if data and ID are available */}
      {hasRaidData && tacticusUserId && (
        <>
          <RaidDamageMetric allSeasonRaidData={allSeasonsRaidData} tacticusUserId={tacticusUserId} />
          <RaidParticipationMetric allSeasonRaidData={allSeasonsRaidData} tacticusUserId={tacticusUserId} />
        </>
      )}
    </div>
  );
};

export default MetricsGrid; 