'use client';

import { GuildRaidResponse } from '@/lib/types';
import { Card, Metric, Text } from '@tremor/react';

interface RaidDamageMetricProps {
  raidData?: GuildRaidResponse;
  playerName?: string;
}

export default function RaidDamageMetric({ raidData, playerName }: RaidDamageMetricProps) {
  // TODO: Calculate total damage dealt by the specific player
  let totalDamage = 0;
  if (raidData && playerName) {
    // Filter entries for the player and sum damageDealt
    // Placeholder logic
    totalDamage = raidData.entries
      // .filter(entry => entry.userId === playerName) // Needs mapping userId to name or vice-versa
      .reduce((sum, entry) => sum + entry.damageDealt, 0);
  }

  const displayDamage = raidData && playerName ? totalDamage.toLocaleString() : 'Loading...';

  return (
    <Card decoration="top" decorationColor="red"> 
      <Text>Total Raid Damage</Text>
      <Metric>{displayDamage}</Metric>
      {/* Optional: Add subtitle like "Season X" */}
    </Card>
  );
} 