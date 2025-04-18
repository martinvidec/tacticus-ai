'use client';

import { GuildRaidResponse } from '@/lib/types';
import { Card, Metric, Text } from '@tremor/react';

interface RaidParticipationMetricProps {
  raidData?: GuildRaidResponse;
}

export default function RaidParticipationMetric({ raidData }: RaidParticipationMetricProps) {
  // TODO: Calculate participation (e.g., attacks used / total attacks)
  const participation = raidData ? 'TBD' : 'Loading...'; // Placeholder logic

  return (
    <Card decoration="top" decorationColor="blue">
      <Text>Raid Participation</Text>
      <Metric>{participation}</Metric>
      {/* Optional: Add subtitle or additional info with another Text component */}
    </Card>
  );
} 