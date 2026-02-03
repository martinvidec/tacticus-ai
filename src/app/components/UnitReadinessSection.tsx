'use client';

import React, { useMemo, useState } from 'react';
import { Card, Title, BarChart } from '@tremor/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Unit } from '@/lib/types';
import {
  calculateReadinessScore,
  getReadinessColor,
  getReadinessBgColor,
  ReadinessBreakdown,
} from '@/lib/statsUtils';

interface UnitReadinessData {
  unit: Unit;
  breakdown: ReadinessBreakdown;
}

interface UnitReadinessSectionProps {
  units: Unit[] | undefined;
}

type SortField = 'total' | 'rankScore' | 'xpScore' | 'starScore' | 'abilityScore' | 'itemScore';

export default function UnitReadinessSection({ units }: UnitReadinessSectionProps) {
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortAsc, setSortAsc] = useState(true); // lowest first = most improvement potential
  const [showAll, setShowAll] = useState(false);

  const readinessData = useMemo<UnitReadinessData[]>(() => {
    if (!units || units.length === 0) return [];
    return units.map(unit => ({
      unit,
      breakdown: calculateReadinessScore(unit),
    }));
  }, [units]);

  const sortedData = useMemo(() => {
    return [...readinessData].sort((a, b) => {
      const aVal = a.breakdown[sortField];
      const bVal = b.breakdown[sortField];
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [readinessData, sortField, sortAsc]);

  const displayData = showAll ? sortedData : sortedData.slice(0, 20);

  // Summary stats
  const avgReadiness = readinessData.length > 0
    ? Math.round((readinessData.reduce((sum, d) => sum + d.breakdown.total, 0) / readinessData.length) * 10) / 10
    : 0;

  // Top 3 investment candidates (lowest readiness with rank > 3)
  const investmentCandidates = useMemo(() => {
    return [...readinessData]
      .filter(d => d.unit.rank >= 3) // at least Iron rank
      .sort((a, b) => a.breakdown.total - b.breakdown.total)
      .slice(0, 3)
      .map(d => {
        // Find lowest sub-score to suggest improvement area
        const scores = [
          { area: 'Rank', score: d.breakdown.rankScore, max: 25 },
          { area: 'XP', score: d.breakdown.xpScore, max: 20 },
          { area: 'Stars', score: d.breakdown.starScore, max: 20 },
          { area: 'Abilities', score: d.breakdown.abilityScore, max: 20 },
          { area: 'Items', score: d.breakdown.itemScore, max: 15 },
        ];
        const weakest = scores.sort((a, b) => (a.score / a.max) - (b.score / b.max))[0];
        const potentialGain = Math.round((weakest.max - weakest.score) * 10) / 10;
        return {
          name: d.unit.name || d.unit.id,
          total: d.breakdown.total,
          suggestion: `+${potentialGain}% via ${weakest.area}`,
        };
      });
  }, [readinessData]);

  // Chart data for distribution
  const distributionData = useMemo(() => {
    const buckets = [
      { bucket: '0-30%', count: 0 },
      { bucket: '30-60%', count: 0 },
      { bucket: '60-90%', count: 0 },
      { bucket: '90-100%', count: 0 },
    ];
    for (const d of readinessData) {
      if (d.breakdown.total < 30) buckets[0].count++;
      else if (d.breakdown.total < 60) buckets[1].count++;
      else if (d.breakdown.total < 90) buckets[2].count++;
      else buckets[3].count++;
    }
    return buckets;
  }, [readinessData]);

  if (!units || units.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Unit Readiness Assessment
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Unit Data Available ++</p>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)] cursor-pointer hover:text-[rgb(var(--primary-color))] select-none"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Unit Readiness Assessment
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Average Readiness */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Roster Avg Readiness</Title>
          <p className={`text-2xl font-bold mt-1 ${getReadinessColor(avgReadiness)}`}>
            {avgReadiness}%
          </p>
        </Card>

        {/* Distribution Chart */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Readiness Distribution</Title>
          <BarChart
            className="h-20 mt-1"
            data={distributionData}
            index="bucket"
            categories={['count']}
            colors={['amber']}
            showLegend={false}
            showYAxis={false}
            showXAxis={true}
          />
        </Card>

        {/* Investment Recommendations */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Priority Investments</Title>
          <div className="mt-1 space-y-1">
            {investmentCandidates.map((c, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-[rgb(var(--foreground-rgb),0.8)] truncate mr-2">{c.name}</span>
                <span className="text-green-400 whitespace-nowrap">{c.suggestion}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Readiness Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border-color))]">
              <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Unit</th>
              <SortHeader field="total" label="Total" />
              <SortHeader field="rankScore" label="Rank" />
              <SortHeader field="xpScore" label="XP" />
              <SortHeader field="starScore" label="Stars" />
              <SortHeader field="abilityScore" label="Abilities" />
              <SortHeader field="itemScore" label="Items" />
            </tr>
          </thead>
          <tbody>
            {displayData.map(({ unit, breakdown }) => (
              <tr key={unit.id} className={`border-b border-[rgb(var(--border-color),0.2)] ${getReadinessBgColor(breakdown.total)}`}>
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.9)]">
                  <div>
                    <span className="font-medium">{unit.name || unit.id}</span>
                    <span className="text-xs text-[rgb(var(--foreground-rgb),0.4)] ml-1">{unit.faction}</span>
                  </div>
                </td>
                <td className={`px-2 py-1.5 font-bold ${getReadinessColor(breakdown.total)}`}>
                  {breakdown.total}%
                </td>
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.7)]">{breakdown.rankScore}</td>
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.7)]">{breakdown.xpScore}</td>
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.7)]">{breakdown.starScore}</td>
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.7)]">{breakdown.abilityScore}</td>
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.7)]">{breakdown.itemScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-[rgb(var(--primary-color))] hover:underline"
        >
          {showAll ? `Show Top 20` : `Show All ${sortedData.length} Units`}
        </button>
      )}
    </div>
  );
}
