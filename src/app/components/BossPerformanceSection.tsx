import React from 'react';
import { PlayerDataResponse, GuildRaidResponse } from '@/lib/types';
import BossCompositionPerformance from './charts/BossCompositionPerformance';

interface BossPerformanceSectionProps {
  playerData: PlayerDataResponse | null;
  raidDataForDisplay: Record<number, GuildRaidResponse>; // Renamed from allGuildRaidData for clarity
}

const BossPerformanceSection: React.FC<BossPerformanceSectionProps> = ({ playerData, raidDataForDisplay }) => {
  // Only render if necessary data exists
  if (!playerData || Object.keys(raidDataForDisplay).length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <BossCompositionPerformance playerData={playerData} allGuildRaidData={raidDataForDisplay} />
    </div>
  );
};

export default BossPerformanceSection; 