'use client';

import { PlayerDetails } from '@/lib/types';
import { Card, Metric, Text } from '@tremor/react';

interface PlayerNameMetricProps {
  playerDetails?: PlayerDetails;
}

export default function PlayerNameMetric({ playerDetails }: PlayerNameMetricProps) {
  const name = playerDetails ? playerDetails.name : 'Loading...';

  return (
    <Card decoration="top" decorationColor="teal"> 
      <Text>Player</Text>
      <Metric>{name}</Metric>
    </Card>
  );
} 