'use client';

import React, { useMemo, useState } from 'react';
import { Card, Title } from '@tremor/react';
import { Unit } from '@/lib/types';

interface UpgradeProgressProps {
  units: Unit[] | undefined;
}

interface UnitUpgradeData {
  unit: Unit;
  upgradeCount: number;
  completion: number; // 0-100
  hasGap: boolean; // high rank but low upgrades
}

export default function UpgradeProgress({ units }: UpgradeProgressProps) {
  const [showAll, setShowAll] = useState(false);

  const upgradeData = useMemo<UnitUpgradeData[]>(() => {
    if (!units) return [];
    return units
      .map(unit => {
        const upgradeCount = unit.upgrades?.length ?? 0;
        const completion = Math.round((upgradeCount / 6) * 100);
        const hasGap = unit.rank > 9 && upgradeCount < 4;
        return { unit, upgradeCount, completion, hasGap };
      })
      .sort((a, b) => a.completion - b.completion);
  }, [units]);

  const avgCompletion = upgradeData.length > 0
    ? Math.round(upgradeData.reduce((sum, d) => sum + d.completion, 0) / upgradeData.length)
    : 0;

  const gapCount = upgradeData.filter(d => d.hasGap).length;
  const displayData = showAll ? upgradeData : upgradeData.slice(0, 20);

  if (!units || units.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Upgrade Manifest
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Unit Data Available ++</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Upgrade Manifest
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Avg Upgrade Completion</p>
          <p className="text-xl font-bold text-[rgb(var(--primary-color))]">{avgCompletion}%</p>
        </Card>
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Fully Upgraded</p>
          <p className="text-xl font-bold text-green-400">{upgradeData.filter(d => d.completion === 100).length}</p>
        </Card>
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">High-Rank Gaps</p>
          <p className={`text-xl font-bold ${gapCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{gapCount}</p>
        </Card>
      </div>

      <div className="space-y-1">
        {displayData.map(d => (
          <div
            key={d.unit.id}
            className={`flex items-center gap-2 p-1.5 rounded text-xs ${d.hasGap ? 'bg-yellow-900/10 border border-yellow-500/20' : 'bg-[rgba(var(--background-start-rgb),0.4)]'}`}
          >
            <span className="w-28 truncate font-medium text-[rgb(var(--foreground-rgb),0.9)]">
              {d.unit.name || d.unit.id}
            </span>
            {/* 2x3 Grid visualization */}
            <div className="grid grid-cols-3 grid-rows-2 gap-0.5 w-14">
              {[0, 1, 2, 3, 4, 5].map(slot => {
                const filled = d.unit.upgrades?.includes(slot);
                return (
                  <div
                    key={slot}
                    className={`h-2.5 rounded-sm ${filled ? 'bg-[rgb(185,160,110)]' : 'bg-[rgba(var(--border-color),0.3)]'}`}
                  />
                );
              })}
            </div>
            <span className="w-8 text-right text-[rgb(var(--foreground-rgb),0.5)]">{d.upgradeCount}/6</span>
            <div className="flex-1 h-2 bg-[rgba(var(--border-color),0.2)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${d.completion === 100 ? 'bg-[rgb(185,160,110)]' : d.completion >= 50 ? 'bg-green-500' : 'bg-gray-500'}`}
                style={{ width: `${d.completion}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {upgradeData.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-[rgb(var(--primary-color))] hover:underline"
        >
          {showAll ? 'Show Top 20' : `Show All ${upgradeData.length} Units`}
        </button>
      )}
    </div>
  );
}
