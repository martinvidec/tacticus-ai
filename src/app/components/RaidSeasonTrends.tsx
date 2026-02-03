'use client';

import React, { useMemo } from 'react';
import { Card, Title, LineChart, BarChart } from '@tremor/react';
import { GuildRaidResponse } from '@/lib/types';

interface RaidSeasonTrendsProps {
  allSeasonsRaidData: Record<number, GuildRaidResponse>;
  tacticusUserId: string | null;
}

interface SeasonSummary {
  Season: string;
  'Total Guild Damage': number;
  'My Damage': number;
  'My Raids': number;
  'Guild Raids': number;
  'Max Tier': number;
}

export default function RaidSeasonTrends({ allSeasonsRaidData, tacticusUserId }: RaidSeasonTrendsProps) {
  const seasonSummaries = useMemo<SeasonSummary[]>(() => {
    if (!allSeasonsRaidData) return [];

    return Object.entries(allSeasonsRaidData)
      .map(([seasonStr, data]) => {
        if (!data?.entries) return null;

        const season = Number(seasonStr);
        let totalGuildDamage = 0;
        let myDamage = 0;
        let myRaids = 0;
        let maxTier = 0;

        for (const entry of data.entries) {
          const dmg = typeof entry.damageDealt === 'string' ? parseInt(entry.damageDealt, 10) : entry.damageDealt;
          if (!isNaN(dmg)) {
            totalGuildDamage += dmg;
            if (tacticusUserId && entry.userId === tacticusUserId) {
              myDamage += dmg;
              myRaids++;
            }
          }
          if (entry.tier > maxTier) maxTier = entry.tier;
        }

        return {
          Season: `S${season}`,
          'Total Guild Damage': totalGuildDamage,
          'My Damage': myDamage,
          'My Raids': myRaids,
          'Guild Raids': data.entries.length,
          'Max Tier': maxTier,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aNum = parseInt(a!.Season.slice(1));
        const bNum = parseInt(b!.Season.slice(1));
        return aNum - bNum;
      }) as SeasonSummary[];
  }, [allSeasonsRaidData, tacticusUserId]);

  if (seasonSummaries.length < 2) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Cross-Season Raid Trends
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ Requires 2+ seasons of raid data for trend analysis ++</p>
      </div>
    );
  }

  // Damage trend data
  const damageTrend = seasonSummaries.map(s => ({
    Season: s.Season,
    'Guild Total': s['Total Guild Damage'],
    'My Contribution': s['My Damage'],
  }));

  // Participation trend
  const participationTrend = seasonSummaries.map(s => ({
    Season: s.Season,
    'My Raids': s['My Raids'],
    'Guild Raids': s['Guild Raids'],
  }));

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Cross-Season Raid Trends
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Damage Trend */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Damage Output Over Seasons</Title>
          <LineChart
            className="mt-3 h-52"
            data={damageTrend}
            index="Season"
            categories={['Guild Total', 'My Contribution']}
            colors={['amber', 'cyan']}
            yAxisWidth={60}
            showLegend={true}
          />
        </Card>

        {/* Participation Trend */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Raid Participation</Title>
          <BarChart
            className="mt-3 h-52"
            data={participationTrend}
            index="Season"
            categories={['My Raids', 'Guild Raids']}
            colors={['cyan', 'amber']}
            yAxisWidth={40}
            showLegend={true}
          />
        </Card>
      </div>

      {/* Season Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border-color))]">
              <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Season</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Guild Dmg</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">My Dmg</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">My Raids</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Max Tier</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">My %</th>
            </tr>
          </thead>
          <tbody>
            {seasonSummaries.map(s => {
              const myPercent = s['Total Guild Damage'] > 0
                ? Math.round((s['My Damage'] / s['Total Guild Damage']) * 100)
                : 0;
              return (
                <tr key={s.Season} className="border-b border-[rgb(var(--border-color),0.2)]">
                  <td className="px-2 py-1.5 font-medium text-[rgb(var(--primary-color))]">{s.Season}</td>
                  <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.7)]">{s['Total Guild Damage'].toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right text-cyan-400">{s['My Damage'].toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.7)]">{s['My Raids']}</td>
                  <td className="px-2 py-1.5 text-right text-[rgb(var(--foreground-rgb),0.7)]">{s['Max Tier']}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-[rgb(185,160,110)]">{myPercent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
