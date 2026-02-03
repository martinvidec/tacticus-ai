'use client';

import React, { useMemo, useState } from 'react';
import { Select, SelectItem } from '@tremor/react';
import { Unit, Shard, GrandAlliance } from '@/lib/types';
import { getShardsToNextStar, getRarityFromProgressionIndex } from '@/lib/gameConstants';

interface ShardFarmingPriorityProps {
  units: Unit[] | undefined;
  inventoryShards: Shard[] | undefined;
}

interface ShardProgressData {
  unit: Unit;
  currentShards: number;
  shardsNeeded: number | null;
  progressPercent: number;
  currentRarity: string;
  nextRarity: string;
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return 'bg-[rgb(185,160,110)]';
  if (pct >= 50) return 'bg-green-500';
  if (pct >= 25) return 'bg-yellow-500';
  return 'bg-gray-500';
}

function getProgressTextColor(pct: number): string {
  if (pct >= 80) return 'text-[rgb(185,160,110)]';
  if (pct >= 50) return 'text-green-400';
  if (pct >= 25) return 'text-yellow-400';
  return 'text-[rgb(var(--foreground-rgb),0.5)]';
}

export default function ShardFarmingPriority({ units, inventoryShards }: ShardFarmingPriorityProps) {
  const [allianceFilter, setAllianceFilter] = useState<string>('all');

  // Build inventory shard lookup
  const inventoryShardMap = useMemo(() => {
    const map = new Map<string, number>();
    if (inventoryShards) {
      for (const shard of inventoryShards) {
        map.set(shard.id, (map.get(shard.id) || 0) + shard.amount);
      }
    }
    return map;
  }, [inventoryShards]);

  const shardData = useMemo<ShardProgressData[]>(() => {
    if (!units) return [];

    return units
      .map(unit => {
        const shardsNeeded = getShardsToNextStar(unit.progressionIndex);
        if (shardsNeeded === null) {
          return {
            unit,
            currentShards: unit.shards + (inventoryShardMap.get(unit.id) || 0),
            shardsNeeded: null,
            progressPercent: 100,
            currentRarity: getRarityFromProgressionIndex(unit.progressionIndex),
            nextRarity: 'MAX',
          };
        }

        const totalShards = unit.shards + (inventoryShardMap.get(unit.id) || 0);
        const progressPercent = Math.min(Math.round((totalShards / shardsNeeded) * 100), 100);
        const nextIndex = unit.progressionIndex + 1;

        return {
          unit,
          currentShards: totalShards,
          shardsNeeded,
          progressPercent,
          currentRarity: getRarityFromProgressionIndex(unit.progressionIndex),
          nextRarity: getRarityFromProgressionIndex(nextIndex),
        };
      })
      .filter(d => d.shardsNeeded !== null) // exclude maxed units
      .sort((a, b) => b.progressPercent - a.progressPercent);
  }, [units, inventoryShardMap]);

  const filteredData = useMemo(() => {
    if (allianceFilter === 'all') return shardData;
    return shardData.filter(d => d.unit.grandAlliance === allianceFilter);
  }, [shardData, allianceFilter]);

  if (!units || units.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Shard Requisition Priority
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Unit Data Available ++</p>
      </div>
    );
  }

  // Ready for upgrade count
  const readyCount = filteredData.filter(d => d.progressPercent >= 100).length;

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Shard Requisition Priority
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
        {readyCount > 0 && (
          <span className="text-xs text-[rgb(185,160,110)]">
            {readyCount} unit{readyCount !== 1 ? 's' : ''} ready for promotion!
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {filteredData.slice(0, 30).map(d => (
          <div
            key={d.unit.id}
            className="flex items-center gap-2 p-2 bg-[rgba(var(--background-start-rgb),0.6)] border border-[rgba(var(--border-color),0.3)] rounded text-xs"
          >
            <span className="w-28 truncate font-medium text-[rgb(var(--foreground-rgb),0.9)]" title={d.unit.name || d.unit.id}>
              {d.unit.name || d.unit.id}
            </span>
            <span className="w-16 text-[rgb(var(--foreground-rgb),0.5)]">{d.currentRarity}</span>
            <div className="flex-1 h-3 bg-[rgba(var(--border-color),0.3)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getProgressColor(d.progressPercent)}`}
                style={{ width: `${d.progressPercent}%` }}
              />
            </div>
            <span className={`w-20 text-right font-mono ${getProgressTextColor(d.progressPercent)}`}>
              {d.currentShards}/{d.shardsNeeded}
            </span>
            <span className="w-10 text-right text-[rgb(var(--foreground-rgb),0.5)]">
              {d.progressPercent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
