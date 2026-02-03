'use client';

import React, { useMemo, useState } from 'react';
import { Card, Title, BarChart, Select, SelectItem } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';
import { Progress, CampaignProgress } from '@/lib/types';
import { analyzeCampaign, CampaignAnalysisData } from '@/lib/statsUtils';

interface CampaignAnalysisProps {
  progress: Progress | null | undefined;
}

const typeColors: Record<string, string> = {
  Standard: 'bg-blue-500',
  Mirror: 'bg-purple-500',
  Elite: 'bg-amber-500',
  EliteMirror: 'bg-red-500',
};

const typeOrder = ['Standard', 'Mirror', 'Elite', 'EliteMirror'];

export default function CampaignAnalysis({ progress }: CampaignAnalysisProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const analysisData = useMemo<CampaignAnalysisData[]>(() => {
    if (!progress?.campaigns) return [];
    return progress.campaigns.map(c => analyzeCampaign(c));
  }, [progress]);

  const filteredData = useMemo(() => {
    if (typeFilter === 'all') return analysisData;
    return analysisData.filter(d => d.type === typeFilter);
  }, [analysisData, typeFilter]);

  // Group by type
  const groupedByType = useMemo(() => {
    const groups: Record<string, CampaignAnalysisData[]> = {};
    for (const d of filteredData) {
      const type = d.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(d);
    }
    return groups;
  }, [filteredData]);

  // Overall stats
  const overallStats = useMemo(() => {
    if (analysisData.length === 0) return null;
    const totalProgress = analysisData.reduce((sum, d) => sum + d.progressPercent, 0);
    const avgProgress = Math.round(totalProgress / analysisData.length);
    const totalWalls = analysisData.reduce((sum, d) => sum + d.walls.length, 0);
    const totalAttempts = analysisData.reduce((sum, d) => sum + d.totalAttemptsUsed, 0);

    // Per-type average progress
    const typeStats = typeOrder
      .map(type => {
        const campaigns = analysisData.filter(d => d.type === type);
        if (campaigns.length === 0) return null;
        return {
          Type: type,
          'Avg Progress %': Math.round(campaigns.reduce((s, c) => s + c.progressPercent, 0) / campaigns.length),
          Campaigns: campaigns.length,
        };
      })
      .filter(Boolean) as { Type: string; 'Avg Progress %': number; Campaigns: number }[];

    return { avgProgress, totalWalls, totalAttempts, typeStats, totalCampaigns: analysisData.length };
  }, [analysisData]);

  if (!progress?.campaigns || progress.campaigns.length === 0) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Campaign Tactical Analysis
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Campaign Data Available ++</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Campaign Tactical Analysis
      </h3>

      {/* Overall Stats */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Overall Progress</p>
            <p className="text-xl font-bold text-[rgb(var(--primary-color))]">{overallStats.avgProgress}%</p>
          </Card>
          <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Total Campaigns</p>
            <p className="text-xl font-bold text-[rgb(var(--foreground-rgb),0.9)]">{overallStats.totalCampaigns}</p>
          </Card>
          <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Total Attempts</p>
            <p className="text-xl font-bold text-[rgb(var(--foreground-rgb),0.9)]">{overallStats.totalAttempts.toLocaleString()}</p>
          </Card>
          <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Identified Walls</p>
            <p className={`text-xl font-bold ${overallStats.totalWalls > 0 ? 'text-red-400' : 'text-green-400'}`}>{overallStats.totalWalls}</p>
          </Card>
        </div>
      )}

      {/* Type Comparison Chart */}
      {overallStats && overallStats.typeStats.length > 0 && (
        <Card className="bg-transparent border border-[rgb(var(--border-color))] mb-4">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Progress by Campaign Type</Title>
          <BarChart
            className="mt-3 h-32"
            data={overallStats.typeStats}
            index="Type"
            categories={['Avg Progress %']}
            colors={['amber']}
            yAxisWidth={40}
            showLegend={false}
          />
        </Card>
      )}

      {/* Filter */}
      <div className="mb-4 w-40">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectItem value="all">All Types</SelectItem>
          {typeOrder.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Campaign Details */}
      <div className="space-y-2">
        {Object.entries(groupedByType)
          .sort(([a], [b]) => typeOrder.indexOf(a) - typeOrder.indexOf(b))
          .map(([type, campaigns]) => (
            <div key={type}>
              <h4 className="text-sm font-semibold text-[rgb(var(--primary-color),0.9)] mb-1 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${typeColors[type] || 'bg-gray-500'}`} />
                {type}
              </h4>
              <div className="space-y-1">
                {campaigns
                  .sort((a, b) => a.progressPercent - b.progressPercent)
                  .map(campaign => (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-3 p-2 bg-[rgba(var(--background-start-rgb),0.6)] border border-[rgba(var(--border-color),0.3)] rounded text-xs"
                    >
                      <span className="w-32 truncate font-medium text-[rgb(var(--foreground-rgb),0.9)]" title={campaign.name}>
                        {campaign.name}
                      </span>
                      {/* Progress bar */}
                      <div className="flex-1 h-3 bg-[rgba(var(--border-color),0.3)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${campaign.progressPercent >= 90 ? 'bg-[rgb(185,160,110)]' : campaign.progressPercent >= 50 ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(campaign.progressPercent, 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[rgb(var(--foreground-rgb),0.7)]">
                        {campaign.progressPercent}%
                      </span>
                      <span className="w-16 text-right text-[rgb(var(--foreground-rgb),0.5)]" title="Attempts used">
                        {campaign.totalAttemptsUsed} att.
                      </span>
                      {campaign.walls.length > 0 && (
                        <span className="flex items-center gap-0.5 text-red-400" title={`Walls at: ${campaign.walls.map(w => `Battle ${w.battleIndex}`).join(', ')}`}>
                          <AlertTriangle className="h-3 w-3" />
                          {campaign.walls.length}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
