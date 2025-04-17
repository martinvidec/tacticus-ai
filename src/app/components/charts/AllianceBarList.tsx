'use client';

import {
  Card,
  Title,
  BarList,
  Bold,
  Flex,
  Text,
  Metric
} from '@tremor/react';
import { Unit, GrandAlliance } from '@/lib/types';

interface AllianceBarListProps {
  units: Unit[] | undefined;
}

// Map alliances to colors for consistency, Tremor might pick these up
const allianceColorMap: Record<string, string> = {
    Imperial: 'blue',
    Xenos: 'purple',
    Chaos: 'red',
    Unknown: 'gray'
};

export default function AllianceBarList({ units }: AllianceBarListProps) {
  if (!units || units.length === 0) {
    return (
      <Card>
        <Title>Unit Allegiance</Title>
         <div className="flex justify-center items-center h-28">
            <p className="text-tremor-content-subtle dark:text-dark-tremor-content-subtle">No unit data</p>
        </div>
      </Card>
    );
  }

  const allianceCounts = units.reduce((acc, unit) => {
    const alliance = unit.grandAlliance || 'Unknown';
    acc[alliance] = (acc[alliance] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Prepare data for BarList: [{ name: string, value: number, color?: string }] 
  const chartData = Object.entries(allianceCounts)
    .map(([name, value]) => ({
      name: name,
      value: value,
      color: allianceColorMap[name] // Assign color based on map
    }))
    .sort((a, b) => b.value - a.value); // Sort descending by value

  return (
    <Card>
      <Title>Unit Allegiance</Title>
      <Flex className="mt-4">
        <Text><Bold>Alliance</Bold></Text>
        <Text><Bold>Count</Bold></Text>
      </Flex>
      <BarList data={chartData} className="mt-2" />
    </Card>
  );
} 