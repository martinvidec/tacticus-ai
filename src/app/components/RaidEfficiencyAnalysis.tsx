'use client';

import React, { useMemo, useState } from 'react';
import { Card, Title, BarChart, Select, SelectItem } from '@tremor/react';
import { Unit, GuildRaidResponse, RaidEntry } from '@/lib/types';

interface RaidEfficiencyAnalysisProps {
  allSeasonsRaidData: Record<number, GuildRaidResponse>;
  tacticusUserId: string | null;
  units: Unit[] | undefined;
}

interface UnitEfficiencyData {
  unitId: string;
  unitName: string;
  avgEfficiency: number;
  totalDamage: number;
  totalPower: number;
  raidCount: number;
}

interface EfficiencyEntry {
  efficiency: number;
  damageDealt: number;
  totalPower: number;
  damageType: 'Bomb' | 'Battle';
  encounterType: string;
  bossType: string;
}

export default function RaidEfficiencyAnalysis({ allSeasonsRaidData, tacticusUserId, units }: RaidEfficiencyAnalysisProps) {
  const [filterDamageType, setFilterDamageType] = useState<'all' | 'Battle' | 'Bomb'>('all');
  const [filterSeason, setFilterSeason] = useState<'all' | string>('all');

  const unitNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (units) {
      for (const u of units) {
        map.set(u.id, u.name || u.id);
      }
    }
    return map;
  }, [units]);

  const seasons = useMemo(() => Object.keys(allSeasonsRaidData).map(Number).sort((a, b) => b - a), [allSeasonsRaidData]);

  const { unitEfficiency, bombVsBattle, bossEfficiency } = useMemo(() => {
    const unitMap = new Map<string, { totalDamage: number; totalPower: number; count: number }>();
    const bombStats = { totalDamage: 0, totalPower: 0, count: 0 };
    const battleStats = { totalDamage: 0, totalPower: 0, count: 0 };
    const bossMap = new Map<string, { totalDamage: number; totalPower: number; count: number }>();

    const relevantSeasons = filterSeason === 'all'
      ? Object.values(allSeasonsRaidData)
      : [allSeasonsRaidData[Number(filterSeason)]].filter(Boolean);

    for (const seasonData of relevantSeasons) {
      if (!seasonData?.entries) continue;

      const entries = tacticusUserId
        ? seasonData.entries.filter(e => e.userId === tacticusUserId)
        : seasonData.entries;

      for (const entry of entries) {
        if (!entry.heroDetails || entry.heroDetails.length === 0) continue;
        if (filterDamageType !== 'all' && entry.damageType !== filterDamageType) continue;

        const totalPower = entry.heroDetails.reduce((sum, h) => sum + (h.power || 0), 0);
        if (totalPower === 0) continue;

        const damageDealt = typeof entry.damageDealt === 'string' ? parseInt(entry.damageDealt, 10) : entry.damageDealt;
        if (isNaN(damageDealt)) continue;

        const efficiency = damageDealt / totalPower;

        // Per-unit tracking
        for (const hero of entry.heroDetails) {
          if (!hero.unitId) continue;
          const existing = unitMap.get(hero.unitId) || { totalDamage: 0, totalPower: 0, count: 0 };
          existing.totalDamage += damageDealt / entry.heroDetails.length; // distribute damage equally
          existing.totalPower += hero.power || 0;
          existing.count += 1;
          unitMap.set(hero.unitId, existing);
        }

        // Bomb vs Battle
        if (entry.damageType === 'Bomb') {
          bombStats.totalDamage += damageDealt;
          bombStats.totalPower += totalPower;
          bombStats.count++;
        } else {
          battleStats.totalDamage += damageDealt;
          battleStats.totalPower += totalPower;
          battleStats.count++;
        }

        // Boss efficiency
        const bossKey = entry.type || entry.unitId || 'Unknown';
        const bossExisting = bossMap.get(bossKey) || { totalDamage: 0, totalPower: 0, count: 0 };
        bossExisting.totalDamage += damageDealt;
        bossExisting.totalPower += totalPower;
        bossExisting.count++;
        bossMap.set(bossKey, bossExisting);
      }
    }

    // Convert unit map to sorted array
    const unitEfficiency: UnitEfficiencyData[] = Array.from(unitMap.entries())
      .map(([unitId, data]) => ({
        unitId,
        unitName: unitNameMap.get(unitId) || unitId,
        avgEfficiency: Math.round((data.totalDamage / data.totalPower) * 100) / 100,
        totalDamage: Math.round(data.totalDamage),
        totalPower: data.totalPower,
        raidCount: data.count,
      }))
      .filter(d => d.raidCount >= 2) // minimum 2 raids
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency);

    const bombVsBattle = [
      {
        Type: 'Battle',
        'Avg Efficiency': battleStats.count > 0 ? Math.round((battleStats.totalDamage / battleStats.totalPower) * 100) / 100 : 0,
        Raids: battleStats.count,
      },
      {
        Type: 'Bomb',
        'Avg Efficiency': bombStats.count > 0 ? Math.round((bombStats.totalDamage / bombStats.totalPower) * 100) / 100 : 0,
        Raids: bombStats.count,
      },
    ];

    const bossEfficiency = Array.from(bossMap.entries())
      .map(([boss, data]) => ({
        Boss: boss.replace(/([A-Z])/g, ' $1').trim(), // camelCase to readable
        'Avg Efficiency': data.count > 0 ? Math.round((data.totalDamage / data.totalPower) * 100) / 100 : 0,
        Raids: data.count,
      }))
      .filter(d => d.Raids >= 2)
      .sort((a, b) => b['Avg Efficiency'] - a['Avg Efficiency'])
      .slice(0, 10);

    return { unitEfficiency, bombVsBattle, bossEfficiency };
  }, [allSeasonsRaidData, tacticusUserId, filterDamageType, filterSeason, unitNameMap]);

  if (!allSeasonsRaidData || Object.keys(allSeasonsRaidData).length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Raid Efficiency Analysis
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Raid Data Available ++</p>
      </div>
    );
  }

  // Top 15 chart data
  const topUnitsChartData = unitEfficiency.slice(0, 15).map(d => ({
    Unit: d.unitName,
    'Dmg/Power': d.avgEfficiency,
    'Deployments': d.raidCount,
  }));

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Raid Efficiency Analysis
      </h3>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="w-36">
          <Select value={filterDamageType} onValueChange={(v) => setFilterDamageType(v as typeof filterDamageType)}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Battle">Battle Only</SelectItem>
            <SelectItem value="Bomb">Bomb Only</SelectItem>
          </Select>
        </div>
        <div className="w-36">
          <Select value={filterSeason} onValueChange={setFilterSeason}>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(s => (
              <SelectItem key={s} value={String(s)}>Season {s}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Unit Efficiency Ranking */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Top Units by Damage/Power Ratio</Title>
          {topUnitsChartData.length > 0 ? (
            <BarChart
              className="mt-3 h-64"
              data={topUnitsChartData}
              index="Unit"
              categories={['Dmg/Power']}
              colors={['amber']}
              layout="vertical"
              yAxisWidth={100}
              showLegend={false}
            />
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">Not enough data (min. 2 raids per unit)</p>
          )}
        </Card>

        {/* Bomb vs Battle + Boss Efficiency */}
        <div className="space-y-4">
          <Card className="bg-transparent border border-[rgb(var(--border-color))]">
            <Title className="text-sm text-[rgb(var(--primary-color))]">Battle vs Bomb Efficiency</Title>
            <BarChart
              className="mt-3 h-24"
              data={bombVsBattle}
              index="Type"
              categories={['Avg Efficiency']}
              colors={['cyan']}
              showLegend={false}
              yAxisWidth={50}
            />
          </Card>

          <Card className="bg-transparent border border-[rgb(var(--border-color))]">
            <Title className="text-sm text-[rgb(var(--primary-color))]">Boss Efficiency Ranking</Title>
            {bossEfficiency.length > 0 ? (
              <BarChart
                className="mt-3 h-44"
                data={bossEfficiency}
                index="Boss"
                categories={['Avg Efficiency']}
                colors={['rose']}
                layout="vertical"
                yAxisWidth={120}
                showLegend={false}
              />
            ) : (
              <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">Not enough data</p>
            )}
          </Card>
        </div>
      </div>

      {/* Efficiency Table */}
      {unitEfficiency.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border-color))]">
                <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">#</th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Unit</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Dmg/Power</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Total Dmg</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Deployments</th>
              </tr>
            </thead>
            <tbody>
              {unitEfficiency.slice(0, 20).map((d, i) => (
                <tr key={d.unitId} className="border-b border-[rgb(var(--border-color),0.2)]">
                  <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.5)]">{i + 1}</td>
                  <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.9)]">{d.unitName}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-[rgb(var(--primary-color))]">{d.avgEfficiency.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.7)]">{d.totalDamage.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.7)]">{d.raidCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
