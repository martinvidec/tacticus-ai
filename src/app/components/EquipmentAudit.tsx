'use client';

import React, { useMemo } from 'react';
import { Card, Title, DonutChart } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';
import { Unit, Item, Rarity } from '@/lib/types';

interface EquipmentAuditProps {
  units: Unit[] | undefined;
  inventoryItems: Item[] | undefined;
}

interface UnitEquipmentIssue {
  unitId: string;
  unitName: string;
  rank: number;
  emptySlots: number;
  underleveledItems: { name: string; level: number }[];
  avgItemLevel: number;
}

const rarityColors: Record<string, string> = {
  Common: 'gray',
  Uncommon: 'green',
  Rare: 'blue',
  Epic: 'purple',
  Legendary: 'amber',
};

export default function EquipmentAudit({ units, inventoryItems }: EquipmentAuditProps) {
  const { issues, rarityDistribution, inventorySummary } = useMemo(() => {
    if (!units) return { issues: [], rarityDistribution: [], inventorySummary: [] };

    const issues: UnitEquipmentIssue[] = [];
    const rarityCounts: Record<string, number> = {};

    for (const unit of units) {
      const emptySlots = 3 - unit.items.length;
      const underleveledItems = unit.rank > 9
        ? unit.items.filter(item => item.level < 5).map(item => ({ name: item.name || item.id, level: item.level }))
        : [];
      const avgItemLevel = unit.items.length > 0
        ? Math.round((unit.items.reduce((sum, i) => sum + i.level, 0) / unit.items.length) * 10) / 10
        : 0;

      // Count rarities
      for (const item of unit.items) {
        const rarity = item.rarity || 'Unknown';
        rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1;
      }

      if (emptySlots > 0 || underleveledItems.length > 0) {
        issues.push({
          unitId: unit.id,
          unitName: unit.name || unit.id,
          rank: unit.rank,
          emptySlots,
          underleveledItems,
          avgItemLevel,
        });
      }
    }

    // Sort by severity: empty slots first, then by rank (higher rank = more critical)
    issues.sort((a, b) => {
      if (a.emptySlots !== b.emptySlots) return b.emptySlots - a.emptySlots;
      return b.rank - a.rank;
    });

    const rarityDistribution = Object.entries(rarityCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Inventory summary
    const inventorySummary = inventoryItems
      ? [{ name: 'Unequipped Items', value: inventoryItems.reduce((sum, i) => sum + i.amount, 0) }]
      : [];

    return { issues, rarityDistribution, inventorySummary };
  }, [units, inventoryItems]);

  if (!units || units.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Equipment Audit
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Unit Data Available ++</p>
      </div>
    );
  }

  const unitsWithEmptySlots = issues.filter(i => i.emptySlots > 0).length;
  const unitsWithUnderlevel = issues.filter(i => i.underleveledItems.length > 0).length;

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Armoury Equipment Audit
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Summary */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Audit Summary</Title>
          <div className="mt-2 space-y-1 text-sm">
            <p className={unitsWithEmptySlots > 0 ? 'text-red-400' : 'text-green-400'}>
              {unitsWithEmptySlots > 0
                ? `${unitsWithEmptySlots} unit${unitsWithEmptySlots !== 1 ? 's' : ''} with empty slots`
                : 'All units fully equipped'}
            </p>
            <p className={unitsWithUnderlevel > 0 ? 'text-yellow-400' : 'text-green-400'}>
              {unitsWithUnderlevel > 0
                ? `${unitsWithUnderlevel} high-rank unit${unitsWithUnderlevel !== 1 ? 's' : ''} with underleveled items`
                : 'No underleveled items detected'}
            </p>
          </div>
        </Card>

        {/* Rarity Distribution */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Equipped Item Rarities</Title>
          {rarityDistribution.length > 0 ? (
            <DonutChart
              className="mt-2 h-32"
              data={rarityDistribution}
              category="value"
              index="name"
              colors={rarityDistribution.map(d => rarityColors[d.name] || 'gray')}
              showLabel={true}
              showAnimation={false}
            />
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">No items equipped</p>
          )}
        </Card>

        {/* Inventory Count */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Unequipped Inventory</Title>
          <p className="text-2xl font-bold text-[rgb(var(--primary-color))] mt-2">
            {inventoryItems ? inventoryItems.reduce((sum, i) => sum + i.amount, 0).toLocaleString() : 0}
          </p>
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)]">items in storage</p>
        </Card>
      </div>

      {/* Issue List */}
      {issues.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border-color))]">
                <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Unit</th>
                <th className="px-2 py-1.5 text-center text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Rank</th>
                <th className="px-2 py-1.5 text-center text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Empty Slots</th>
                <th className="px-2 py-1.5 text-center text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Avg Item Lv</th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Issues</th>
              </tr>
            </thead>
            <tbody>
              {issues.slice(0, 20).map(issue => (
                <tr key={issue.unitId} className="border-b border-[rgb(var(--border-color),0.2)]">
                  <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.9)]">{issue.unitName}</td>
                  <td className="px-2 py-1.5 text-center text-[rgb(var(--foreground-rgb),0.7)]">{issue.rank}</td>
                  <td className="px-2 py-1.5 text-center">
                    {issue.emptySlots > 0 ? (
                      <span className="text-red-400 font-bold">{issue.emptySlots}</span>
                    ) : (
                      <span className="text-[rgb(var(--foreground-rgb),0.4)]">0</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center text-[rgb(var(--foreground-rgb),0.7)]">{issue.avgItemLevel}</td>
                  <td className="px-2 py-1.5 text-xs">
                    {issue.emptySlots > 0 && (
                      <span className="inline-flex items-center gap-0.5 mr-2 text-red-400">
                        <AlertTriangle className="h-3 w-3" /> Missing gear
                      </span>
                    )}
                    {issue.underleveledItems.length > 0 && (
                      <span className="text-yellow-400">
                        {issue.underleveledItems.length} low-level item{issue.underleveledItems.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
