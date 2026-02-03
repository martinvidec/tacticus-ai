'use client';

import React, { useMemo } from 'react';
import { Card, Title, BarChart, BarList, Bold, Flex, Text } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';
import { Unit } from '@/lib/types';
import {
  calculateAllianceStrength,
  calculateFactionStrength,
  identifyWeaknesses,
  AllianceStrengthData,
  FactionStrengthData,
  AllianceWeakness,
} from '@/lib/statsUtils';

interface RosterStrengthAnalysisProps {
  units: Unit[] | undefined;
}

const allianceColors: Record<string, string> = {
  Imperial: 'blue',
  Xenos: 'purple',
  Chaos: 'red',
};

const rankLabel = (rank: number): string => {
  if (rank >= 15) return 'Diamond';
  if (rank >= 12) return 'Gold';
  if (rank >= 9) return 'Silver';
  if (rank >= 6) return 'Bronze';
  if (rank >= 3) return 'Iron';
  return 'Stone';
};

export default function RosterStrengthAnalysis({ units }: RosterStrengthAnalysisProps) {
  const { allianceData, factionData, weaknesses } = useMemo(() => {
    if (!units || units.length === 0) {
      return { allianceData: [], factionData: [], weaknesses: [] };
    }
    const ad = calculateAllianceStrength(units);
    const fd = calculateFactionStrength(units);
    const w = identifyWeaknesses(ad);
    return { allianceData: ad, factionData: fd, weaknesses: w };
  }, [units]);

  if (!units || units.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Roster Strength Analysis
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Unit Data Available ++</p>
      </div>
    );
  }

  // Prepare bar chart data for alliance comparison
  const allianceChartData = allianceData.map(d => ({
    Alliance: d.alliance,
    'Avg Rank': d.avgRank,
    'Avg XP Level': d.avgXpLevel,
    'Unit Count': d.unitCount,
    'Strong Units (>Bronze)': d.strongUnits,
  }));

  // Prepare faction bar list data
  const factionBarData = factionData.slice(0, 15).map(d => ({
    name: `${d.faction} (${d.unitCount})`,
    value: d.avgRank,
    color: allianceColors[d.alliance] || 'gray',
  }));

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Roster Strength Analysis
      </h3>

      {/* Weakness Warnings */}
      {weaknesses.length > 0 && (
        <div className="mb-4 space-y-1">
          {weaknesses.map((w, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span><strong>{w.alliance}:</strong> {w.reason}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alliance Comparison Chart */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Alliance Force Comparison</Title>
          <BarChart
            className="mt-4 h-52"
            data={allianceChartData}
            index="Alliance"
            categories={['Avg Rank', 'Avg XP Level']}
            colors={['amber', 'cyan']}
            yAxisWidth={30}
            showLegend={true}
          />
          {/* Alliance detail cards */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {allianceData.map(d => (
              <div key={d.alliance} className="text-center p-2 bg-[rgba(var(--highlight-bg),0.3)] rounded border border-[rgb(var(--border-color),0.3)]">
                <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">{d.alliance}</p>
                <p className="text-lg font-bold text-[rgb(var(--primary-color))]">{d.unitCount}</p>
                <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)]">
                  ~{rankLabel(d.avgRank)} | Lv.{d.avgXpLevel}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Faction Breakdown */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Faction Strength (by Avg Rank)</Title>
          <Flex className="mt-4">
            <Text><Bold>Faction (Count)</Bold></Text>
            <Text><Bold>Avg Rank</Bold></Text>
          </Flex>
          <BarList data={factionBarData} className="mt-2" />
        </Card>
      </div>
    </div>
  );
}
