'use client';

import { Card, Metric, Text } from '@tremor/react';
import { PlayerDetails } from '@/lib/types';

interface PowerLevelMetricProps {
  details: PlayerDetails | undefined;
}

export default function PowerLevelMetric({ details }: PowerLevelMetricProps) {
  if (!details) {
    return null; // Or a placeholder/loading state if preferred
  }

  return (
    <Card decoration="top" decorationColor="yellow">
      <Text>Combat Effectiveness</Text>
      <Metric>{details.powerLevel.toLocaleString()}</Metric>
    </Card>
  );
} 