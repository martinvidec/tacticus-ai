'use client';

import { GuildRaidResponse, RaidEntry } from '@/lib/types';
import { Card, Metric, Text } from '@tremor/react';

interface RaidParticipationMetricProps {
  // Expect data for all seasons
  allSeasonRaidData?: Record<number, GuildRaidResponse> | null;
  // Expect player's Tacticus UUID
  tacticusUserId?: string | null;
}

export default function RaidParticipationMetric({ allSeasonRaidData, tacticusUserId }: RaidParticipationMetricProps) {
  let attacksUsed = 0;
  let totalPossibleAttacks = 0; // Placeholder

  if (allSeasonRaidData && tacticusUserId) {
     // Iterate over all seasons
     Object.values(allSeasonRaidData).forEach(seasonData => {
       if (seasonData?.entries) {
         // Filter entries for the specific player and count
         seasonData.entries.forEach((entry: RaidEntry) => {
             // Check if the entry belongs to the current player using Tacticus ID
             if (entry.userId === tacticusUserId) {
               attacksUsed += 1;
             }
         });
       }
     });
     // Placeholder for total possible attacks - needs defining
     totalPossibleAttacks = attacksUsed > 0 ? attacksUsed + 10 : 0; // Example placeholder
  }

  // Calculate percentage or display attacks used
  const participationText = (allSeasonRaidData && tacticusUserId) 
      ? `${attacksUsed} Attacks Used`
      : 'N/A';

  return (
    <Card decoration="top" decorationColor="blue">
      <Text>Raid Attacks (All Seasons)</Text>
      <Metric>{participationText}</Metric>
    </Card>
  );
} 