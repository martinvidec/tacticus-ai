'use client';

import React from 'react';
import { PlayerDataResponse, GuildRaidResponse, Unit } from '@/lib/types';
import MetricsGrid from './MetricsGrid';
import AllianceDistribution from './AllianceDistribution';

interface DashboardOverviewProps {
    playerData: PlayerDataResponse | null;
    allSeasonsRaidData: Record<number, GuildRaidResponse>;
    tacticusUserId: string | null;
    units: Unit[] | null | undefined;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    playerData,
    allSeasonsRaidData,
    tacticusUserId,
    units
}) => {
    return (
        <div className="space-y-6">
            <MetricsGrid 
                playerData={playerData}
                allSeasonsRaidData={allSeasonsRaidData}
                tacticusUserId={tacticusUserId}
            />
            <AllianceDistribution units={units} />
        </div>
    );
};

export default DashboardOverview; 