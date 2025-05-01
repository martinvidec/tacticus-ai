'use client';

import React from 'react';
import { Card, Grid, Metric, Text, Title } from '@tremor/react';
import { PlayerDataResponse, GuildRaidResponse, Unit } from '@/lib/types';
import { MyMostUsedTeamData, GuildTopTeamData } from '../page';
import AllianceDistribution from './AllianceDistribution';
import BossPerformanceSection from './BossPerformanceSection';
import MostUsedTeamCard from './MostUsedTeamCard';
import GuildTopTeamsCard from './GuildTopTeamsCard';
import PlayerCard from './PlayerCard';

interface DashboardOverviewProps {
    playerData: PlayerDataResponse | null;
    allSeasonsRaidData: Record<number, GuildRaidResponse>;
    tacticusUserId: string | null;
    units: Unit[] | null;
    myMostUsedTeamData: MyMostUsedTeamData | null;
    guildTopTeamsData: GuildTopTeamData[] | null;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    playerData,
    allSeasonsRaidData,
    tacticusUserId,
    units,
    myMostUsedTeamData,
    guildTopTeamsData
}) => {
    const totalPower = playerData?.player?.details?.powerLevel ?? 0;
    const playerName = playerData?.player?.details?.name ?? 'Operative';
    const lastUpdateTimestamp = playerData?.metaData?.lastUpdatedOn;
    const lastUpdateDate = lastUpdateTimestamp ? new Date(lastUpdateTimestamp * 1000).toLocaleString() : 'N/A';
    const activeUnitsCount = units?.length ?? 0;

    // Determine the season - Use the season from the user's data if available
    // Both calculations (myMostUsedTeam and guildTopTeams) are based on the same latest season.
    const displaySeason = myMostUsedTeamData?.season ?? 0; // Fallback to 0 if user data is missing
    // If displaySeason is 0, it likely means neither calculation yielded results for the latest season.
    // Consider passing the latest calculated season number directly from page.tsx if this becomes an issue.

    return (
        <div className="space-y-6">
            <Grid numItemsMd={1} numItemsLg={3} className="gap-6">
                <div className="lg:col-span-2">
                    <PlayerCard 
                        playerName={playerName}
                        totalPower={totalPower}
                        activeUnitsCount={activeUnitsCount}
                        lastUpdateDate={lastUpdateDate}
                    />
                </div>
                <div className="lg:col-span-1">
                    <Card className="h-full bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] shadow-md">
                        <AllianceDistribution units={units ?? []} />
                    </Card>
                </div>
            </Grid>

            <Grid numItemsMd={2} className="gap-6 mt-6">
                {myMostUsedTeamData && (
                    <MostUsedTeamCard teamData={myMostUsedTeamData} />
                )}
                
                {/* Guild Top Teams Card */}
                {guildTopTeamsData && guildTopTeamsData.length > 0 && (
                    <GuildTopTeamsCard 
                        teamsData={guildTopTeamsData} 
                        season={displaySeason}
                    />
                )}
            </Grid>
            
            {/* BossPerformanceSection removed from Dashboard Overview */}
        </div>
    );
};

export default DashboardOverview; 