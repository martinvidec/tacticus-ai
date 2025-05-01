'use client';

import React from 'react';
import { Card, Title, Text } from '@tremor/react';
import { GuildTopTeamData } from '../page'; // Adjust path if page.tsx moves
import { TrophyIcon, UsersIcon } from '@heroicons/react/24/outline'; // Icons for rank/members

interface GuildTopTeamsCardProps {
  teamsData: GuildTopTeamData[] | null;
  season: number; // Pass the season number for the title
}

const GuildTopTeamsCard: React.FC<GuildTopTeamsCardProps> = ({ teamsData, season }) => {
  if (!teamsData || teamsData.length === 0) {
    return (
        <Card className="bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] shadow-md">
            <Title className="text-[rgb(var(--primary-color))]">Guild Top Teams (Season {season})</Title>
            <Text className="mt-2 text-center text-gray-500">No 5-hero team data found for this season.</Text>
        </Card>
    );
  }

  return (
    <Card className="bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] shadow-md">
      <Title className="text-[rgb(var(--primary-color))]">Guild Top Teams (Season {season})</Title>
      <div className="mt-4 space-y-3">
        {teamsData.map((team) => (
          <div key={team.teamId} className="p-2 border border-[rgb(var(--border-color),0.5)] rounded bg-black/10">
            {/* Rank and Usage Count */}
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                    <TrophyIcon className={`w-4 h-4 mr-1 ${team.rank === 1 ? 'text-yellow-400' : team.rank === 2 ? 'text-gray-300' : 'text-yellow-600'}`} />
                    <Text className="font-semibold text-[rgb(var(--foreground-rgb))]">Rank #{team.rank}</Text>
                </div>
                 <Text className="text-xs text-gray-400">({team.usageCount} uses)</Text>
            </div>
            {/* Member List */}
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center">
              <UsersIcon className="w-3 h-3 text-[rgb(var(--primary-color))] opacity-80 mr-0.5"/>
              <Text className="text-xs text-[rgb(var(--foreground-rgb),0.9)]">
                 {team.members.map(m => m.name).join(', ')}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GuildTopTeamsCard; 