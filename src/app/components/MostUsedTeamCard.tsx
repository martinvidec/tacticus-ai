'use client';

import React, { useMemo } from 'react';
import { MyMostUsedTeamData } from '../page'; // Assuming page.tsx exports this
import { BarChart, Card, Title } from '@tremor/react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline'; // For rank

// Define the type for a member within MyMostUsedTeamData for clarity
type TeamMember = MyMostUsedTeamData['members'][number];

interface MostUsedTeamCardProps {
    teamData: MyMostUsedTeamData;
}

// Helper to get rank name (adjust based on your game's ranks)
const getRankName = (rank: number): string => {
    // Example mapping - replace with actual Tacticus ranks
    if (rank >= 15) return `Diamond ${rank - 14}`;
    if (rank >= 12) return `Gold ${rank - 11}`;
    if (rank >= 9) return `Silver ${rank - 8}`;
    if (rank >= 6) return `Bronze ${rank - 5}`;
    if (rank >= 3) return `Iron ${rank - 2}`;
    if (rank >= 0) return `Stone ${rank + 1}`;
    return 'Unknown';
};

// Helper to get star count (progressionIndex)
const getStarCount = (progressionIndex: number): number => {
    // Example: 0 = Common (1 star?), 3 = Uncommon (2 stars?), etc. Adjust logic!
    if (progressionIndex >= 12) return 5; // Legendary
    if (progressionIndex >= 9) return 4; // Epic
    if (progressionIndex >= 6) return 3; // Rare
    if (progressionIndex >= 3) return 2; // Uncommon
    if (progressionIndex >= 0) return 1; // Common
    return 0;
};

// Adjusted formatter for percentage
const percentageFormatter = (number: number) => `${number.toFixed(1)}%`;

const MostUsedTeamCard: React.FC<MostUsedTeamCardProps> = ({ teamData }) => {

    // Calculate Percentage Gain Data
    const percentageGainData = useMemo(() => {
        if (!teamData || !teamData.powerData || teamData.powerData.length < 2) {
            return []; // Not enough data to calculate gain
        }

        const firstEntry = teamData.powerData[0];
        const lastEntry = teamData.powerData[teamData.powerData.length - 1];

        return teamData.members.map((member: TeamMember) => {
            const firstPower = firstEntry.heroPowers[member.id] ?? 0;
            const lastPower = lastEntry.heroPowers[member.id] ?? 0;

            let percentageGain = 0;
            if (firstPower > 0) { // Avoid division by zero
                percentageGain = ((lastPower - firstPower) / firstPower) * 100;
            }

            return {
                name: member.name,
                'Power Gain (%)': percentageGain, // Category name for the bar chart
            };
        });
    }, [teamData]);

    // Define colors for the bars (can use a single color or cycle if needed)
    const barColors: string[] = ['emerald']; 

    return (
        <Card className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] shadow-md">
            <Title className="text-[rgb(var(--primary-color))]">
                My Most Used Team (Season {teamData.season}) 
                <span className="text-xs font-normal text-gray-400 ml-2">({teamData.usageCount} uses)</span>
            </Title>

            {/* Team Member Display */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4 mb-4 text-xs border-b border-[rgb(var(--border-color))] pb-3">
                {teamData.members.map((member: TeamMember) => (
                    <div key={member.id} className="flex flex-col items-center text-center p-1 rounded bg-black/20">
                        <p className="font-semibold text-[rgb(var(--foreground-rgb))] truncate w-full" title={member.name}>{member.name}</p>
                        <div className="flex items-center text-[rgb(var(--foreground-rgb),0.8)] mt-0.5">
                            <ShieldCheckIcon className="w-3 h-3 mr-0.5 text-gray-400" />
                            <span title={`Rank: ${member.rank}`}>{getRankName(member.rank)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Power Gain Chart */}
            {percentageGainData.length > 0 ? (
                <BarChart
                    className="h-48 mt-4"
                    data={percentageGainData}
                    index="name"              // Hero names on the category axis
                    categories={['Power Gain (%)']} // The value we are plotting
                    colors={barColors}        // Colors for the bars
                    valueFormatter={percentageFormatter} // Format value as percentage
                    yAxisWidth={48}
                    showLegend={false}      // Legend not really needed for single category
                />
            ) : (
                <p className="text-sm text-center text-gray-500 mt-4">Not enough data points (first/last raid entry) to calculate power gain percentage.</p>
            )}
        </Card>
    );
};

export default MostUsedTeamCard; 