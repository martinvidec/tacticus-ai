'use client';

import React, { useMemo, useState } from 'react';
import { Card, Title, BarChart, Select, SelectItem } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';
import { Unit, GrandAlliance } from '@/lib/types';
import { calculateAbilityCompletion } from '@/lib/statsUtils';

interface AbilityAnalysisProps {
  units: Unit[] | undefined;
}

interface UnitAbilityData {
  unit: Unit;
  completion: number;
  locked: number;
  unlocked: number;
  avgLevel: number;
}

export default function AbilityAnalysis({ units }: AbilityAnalysisProps) {
  const [allianceFilter, setAllianceFilter] = useState<string>('all');

  const abilityData = useMemo<UnitAbilityData[]>(() => {
    if (!units) return [];
    return units
      .map(unit => ({ unit, ...calculateAbilityCompletion(unit) }))
      .sort((a, b) => a.completion - b.completion);
  }, [units]);

  const filteredData = useMemo(() => {
    if (allianceFilter === 'all') return abilityData;
    return abilityData.filter(d => d.unit.grandAlliance === allianceFilter);
  }, [abilityData, allianceFilter]);

  const rosterAvg = useMemo(() => {
    if (abilityData.length === 0) return 0;
    return Math.round((abilityData.reduce((sum, d) => sum + d.avgLevel, 0) / abilityData.length) * 10) / 10;
  }, [abilityData]);

  // Underleveled: high rank but low ability completion
  const underleveled = useMemo(() => {
    return filteredData.filter(d => d.unit.rank > 9 && d.avgLevel < 20);
  }, [filteredData]);

  // Chart data: bottom 10 and top 10
  const bottom10 = filteredData.slice(0, 10).map(d => ({
    Unit: d.unit.name || d.unit.id,
    'Completion %': d.completion,
  }));

  const top10 = [...filteredData].sort((a, b) => b.completion - a.completion).slice(0, 10).map(d => ({
    Unit: d.unit.name || d.unit.id,
    'Completion %': d.completion,
  }));

  if (!units || units.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Ability Doctrine Analysis
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Unit Data Available ++</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Ability Doctrine Analysis
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-36">
          <Select value={allianceFilter} onValueChange={setAllianceFilter}>
            <SelectItem value="all">All Alliances</SelectItem>
            <SelectItem value="Imperial">Imperial</SelectItem>
            <SelectItem value="Xenos">Xenos</SelectItem>
            <SelectItem value="Chaos">Chaos</SelectItem>
          </Select>
        </div>
        <span className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">
          Roster Avg Ability Level: <strong className="text-[rgb(var(--primary-color))]">{rosterAvg}</strong>/50
        </span>
      </div>

      {/* Underleveled Warning */}
      {underleveled.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-sm text-yellow-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            {underleveled.length} high-rank unit{underleveled.length !== 1 ? 's' : ''} with low ability investment:{' '}
            {underleveled.slice(0, 3).map(d => d.unit.name || d.unit.id).join(', ')}
            {underleveled.length > 3 && ` (+${underleveled.length - 3} more)`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bottom 10 */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Lowest Ability Completion</Title>
          {bottom10.length > 0 ? (
            <BarChart
              className="mt-3 h-52"
              data={bottom10}
              index="Unit"
              categories={['Completion %']}
              colors={['red']}
              layout="vertical"
              yAxisWidth={90}
              showLegend={false}
            />
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">No data</p>
          )}
        </Card>

        {/* Top 10 */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Highest Ability Completion</Title>
          {top10.length > 0 ? (
            <BarChart
              className="mt-3 h-52"
              data={top10}
              index="Unit"
              categories={['Completion %']}
              colors={['emerald']}
              layout="vertical"
              yAxisWidth={90}
              showLegend={false}
            />
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">No data</p>
          )}
        </Card>
      </div>

      {/* Summary Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border-color))]">
              <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Unit</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Completion</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Avg Level</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Unlocked</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Locked</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 20).map(d => (
              <tr key={d.unit.id} className="border-b border-[rgb(var(--border-color),0.2)]">
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.9)]">
                  {d.unit.name || d.unit.id}
                  <span className="text-xs text-[rgb(var(--foreground-rgb),0.4)] ml-1">{d.unit.faction}</span>
                </td>
                <td className={`px-2 py-1.5 text-right font-mono ${d.completion < 20 ? 'text-red-400' : d.completion < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {d.completion}%
                </td>
                <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.7)]">{d.avgLevel}</td>
                <td className="px-2 py-1.5 text-right text-green-400">{d.unlocked}</td>
                <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.5)]">{d.locked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
