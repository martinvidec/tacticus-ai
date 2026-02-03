'use client';

import React from 'react';
import { Card, Title } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';
import { Progress, Token } from '@/lib/types';

interface TokenManagementProps {
  progress: Progress | undefined | null;
}

interface TokenCardData {
  name: string;
  token: Token | undefined;
}

function formatTime(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return 'Ready';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function TokenCard({ name, token }: TokenCardData) {
  if (!token) {
    return (
      <Card className="bg-transparent border border-[rgb(var(--border-color))] p-3">
        <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">{name}</p>
        <p className="text-sm text-[rgb(var(--foreground-rgb),0.4)] mt-1">Not available</p>
      </Card>
    );
  }

  const isFull = token.current >= token.max;
  const fillPercent = token.max > 0 ? Math.round((token.current / token.max) * 100) : 0;

  return (
    <Card className={`bg-transparent border ${isFull ? 'border-red-500/50' : 'border-[rgb(var(--border-color))]'} p-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">{name}</p>
        {isFull && (
          <span className="flex items-center gap-0.5 text-[10px] text-red-400">
            <AlertTriangle className="h-3 w-3" /> Wasted regen
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`text-xl font-bold ${isFull ? 'text-red-400' : 'text-[rgb(var(--primary-color))]'}`}>
          {token.current}
        </span>
        <span className="text-sm text-[rgb(var(--foreground-rgb),0.5)]">/ {token.max}</span>
      </div>
      {/* Progress bar */}
      <div className="mt-1.5 h-1.5 bg-[rgba(var(--border-color),0.3)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-[rgb(185,160,110)]'}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      {/* Regen timer */}
      {!isFull && token.nextTokenInSeconds !== undefined && token.nextTokenInSeconds > 0 && (
        <p className="text-[10px] text-[rgb(var(--foreground-rgb),0.5)] mt-1">
          Next: {formatTime(token.nextTokenInSeconds)}
        </p>
      )}
    </Card>
  );
}

export default function TokenManagement({ progress }: TokenManagementProps) {
  if (!progress) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Token Allocation Status
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Progress Data Available ++</p>
      </div>
    );
  }

  const tokens: TokenCardData[] = [
    { name: 'Arena', token: progress.arena?.tokens },
    { name: 'Guild Raid', token: progress.guildRaid?.tokens },
    { name: 'Raid Ordnance', token: progress.guildRaid?.bombTokens },
    { name: 'Onslaught', token: progress.onslaught?.tokens },
    { name: 'Salvage Run', token: progress.salvageRun?.tokens },
  ];

  const wastedCount = tokens.filter(t => t.token && t.token.current >= t.token.max).length;

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Token Allocation Status
        {wastedCount > 0 && (
          <span className="ml-2 text-sm text-red-400 font-normal">
            ({wastedCount} at capacity)
          </span>
        )}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {tokens.map(t => (
          <TokenCard key={t.name} name={t.name} token={t.token} />
        ))}
      </div>
    </div>
  );
}
