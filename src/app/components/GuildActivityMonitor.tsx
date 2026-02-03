'use client';

import React, { useMemo } from 'react';
import { Card, Title, DonutChart, BarChart } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';
import { Guild, GuildMember } from '@/lib/types';

interface GuildActivityMonitorProps {
  guild: Guild | undefined | null;
}

interface MemberActivity {
  member: GuildMember;
  daysInactive: number | null; // null = unknown
}

function getActivityColor(days: number | null): string {
  if (days === null) return 'text-[rgb(var(--foreground-rgb),0.4)]';
  if (days > 7) return 'text-red-400';
  if (days > 3) return 'text-yellow-400';
  return 'text-green-400';
}

function getActivityLabel(days: number | null): string {
  if (days === null) return 'Unknown';
  if (days > 7) return `${days}d inactive`;
  if (days > 3) return `${days}d ago`;
  if (days > 0) return `${days}d ago`;
  return 'Today';
}

export default function GuildActivityMonitor({ guild }: GuildActivityMonitorProps) {
  const memberActivities = useMemo<MemberActivity[]>(() => {
    if (!guild?.members) return [];

    const now = Date.now();

    return guild.members
      .map(member => {
        let daysInactive: number | null = null;

        if (member.lastActivityOn) {
          const lastActivity = new Date(
            typeof member.lastActivityOn === 'string' && !isNaN(Number(member.lastActivityOn))
              ? Number(member.lastActivityOn) * 1000
              : member.lastActivityOn
          );
          if (!isNaN(lastActivity.getTime())) {
            daysInactive = Math.floor((now - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        return { member, daysInactive };
      })
      .sort((a, b) => {
        // Unknown last, then most inactive first
        if (a.daysInactive === null && b.daysInactive === null) return 0;
        if (a.daysInactive === null) return 1;
        if (b.daysInactive === null) return -1;
        return b.daysInactive - a.daysInactive;
      });
  }, [guild]);

  const { roleDistribution, activitySummary, levelBuckets } = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    let active24h = 0;
    let inactive3d = 0;
    let inactive7d = 0;
    let unknown = 0;
    const levelBucketMap: Record<string, number> = {};

    for (const { member, daysInactive } of memberActivities) {
      // Roles
      roleCounts[member.role] = (roleCounts[member.role] || 0) + 1;

      // Activity
      if (daysInactive === null) unknown++;
      else if (daysInactive <= 1) active24h++;
      else if (daysInactive > 7) inactive7d++;
      else if (daysInactive > 3) inactive3d++;

      // Level buckets
      const bucket = `${Math.floor(member.level / 10) * 10}-${Math.floor(member.level / 10) * 10 + 9}`;
      levelBucketMap[bucket] = (levelBucketMap[bucket] || 0) + 1;
    }

    const roleDistribution = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
    const activitySummary = {
      active24h,
      inactive3d,
      inactive7d,
      unknown,
      total: memberActivities.length,
    };
    const levelBuckets = Object.entries(levelBucketMap)
      .map(([Level, Members]) => ({ Level, Members }))
      .sort((a, b) => a.Level.localeCompare(b.Level));

    return { roleDistribution, activitySummary, levelBuckets };
  }, [memberActivities]);

  if (!guild || !guild.members || guild.members.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Guild Activity Monitor
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Guild Data Available ++</p>
      </div>
    );
  }

  const avgLevel = Math.round(guild.members.reduce((sum, m) => sum + m.level, 0) / guild.members.length);

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Guild Activity Monitor
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Members</p>
          <p className="text-xl font-bold text-[rgb(var(--primary-color))]">{activitySummary.total}</p>
        </Card>
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Avg Level</p>
          <p className="text-xl font-bold text-[rgb(var(--foreground-rgb),0.9)]">{avgLevel}</p>
        </Card>
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Active (24h)</p>
          <p className="text-xl font-bold text-green-400">{activitySummary.active24h}</p>
        </Card>
        <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Inactive (&gt;7d)</p>
          <p className={`text-xl font-bold ${activitySummary.inactive7d > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {activitySummary.inactive7d}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Role Distribution */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Role Distribution</Title>
          <DonutChart
            className="mt-2 h-36"
            data={roleDistribution}
            category="value"
            index="name"
            colors={['amber', 'cyan', 'blue', 'gray']}
            showLabel={true}
            showAnimation={false}
          />
        </Card>

        {/* Level Distribution */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Member Level Distribution</Title>
          {levelBuckets.length > 0 ? (
            <BarChart
              className="mt-2 h-36"
              data={levelBuckets}
              index="Level"
              categories={['Members']}
              colors={['amber']}
              showLegend={false}
              yAxisWidth={30}
            />
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">No data</p>
          )}
        </Card>
      </div>

      {/* Activity Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border-color))]">
              <th className="px-2 py-1.5 text-left text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Member</th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Role</th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Level</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-[rgb(var(--primary-color),0.8)]">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {memberActivities.map(({ member, daysInactive }) => (
              <tr
                key={member.userId}
                className={`border-b border-[rgb(var(--border-color),0.2)] ${daysInactive !== null && daysInactive > 7 ? 'bg-red-900/10' : daysInactive !== null && daysInactive > 3 ? 'bg-yellow-900/10' : ''}`}
              >
                <td className="px-2 py-1.5 text-[rgb(var(--foreground-rgb),0.9)] font-mono text-xs truncate max-w-[120px]">
                  {member.userId.substring(0, 8)}...
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${member.role === 'LEADER' ? 'bg-amber-900/30 text-[rgb(185,160,110)]' : member.role === 'CO_LEADER' ? 'bg-blue-900/30 text-blue-300' : member.role === 'OFFICER' ? 'bg-purple-900/30 text-purple-300' : 'bg-gray-800/30 text-[rgb(var(--foreground-rgb),0.6)]'}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-center text-[rgb(var(--foreground-rgb),0.7)]">{member.level}</td>
                <td className={`px-2 py-1.5 text-right ${getActivityColor(daysInactive)}`}>
                  {daysInactive !== null && daysInactive > 7 && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {getActivityLabel(daysInactive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
