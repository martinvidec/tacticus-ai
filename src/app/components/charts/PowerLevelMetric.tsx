'use client';

import { Card, Metric, Text } from '@tremor/react';
import { PlayerDetails } from '@/lib/types';

interface PowerLevelMetricProps {
  playerDetails: PlayerDetails | undefined;
}

export default function PowerLevelMetric({ playerDetails }: PowerLevelMetricProps) {
  if (!playerDetails) {
    return null; // Or a placeholder/loading state if preferred
  }

  return (
    <Card decoration="top" decorationColor="yellow">
      <Text>Combat Effectiveness</Text>
      <Metric>{playerDetails.powerLevel.toLocaleString()}</Metric>
    </Card>
  );
} 