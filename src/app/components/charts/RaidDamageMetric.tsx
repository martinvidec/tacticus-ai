'use client';

import { GuildRaidResponse, RaidEntry } from '@/lib/types';
import { Card, Metric, Text } from '@tremor/react';

interface RaidDamageMetricProps {
  // Expect data for all seasons
  allSeasonRaidData?: Record<number, GuildRaidResponse> | null;
  // Expect player's Tacticus UUID
  tacticusUserId?: string | null;
}

export default function RaidDamageMetric({ allSeasonRaidData, tacticusUserId }: RaidDamageMetricProps) {
  let totalDamage = 0;

  if (allSeasonRaidData && tacticusUserId) {
    // Iterate over all seasons
    Object.values(allSeasonRaidData).forEach(seasonData => {
      if (seasonData?.entries) {
        // Filter entries for the specific player and sum damage
        seasonData.entries.forEach((entry: RaidEntry) => {
            // Check if the entry belongs to the current player using Tacticus ID
            if (entry.userId === tacticusUserId) { 
                totalDamage += entry.damageDealt || 0;
             }
        });
      }
    });
  }

  const displayDamage = allSeasonRaidData && tacticusUserId ? totalDamage.toLocaleString() : 'N/A';

  return (
    <Card decoration="top" decorationColor="red"> 
      <Text>Total Raid Damage (All Seasons)</Text>
      <Metric>{displayDamage}</Metric>
    </Card>
  );
} 