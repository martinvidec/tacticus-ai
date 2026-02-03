'use client';

import React, { useMemo } from 'react';
import { Card, Title, BarChart, CategoryBar } from '@tremor/react';
import { Inventory, GrandAlliance } from '@/lib/types';

interface ResourceBudgetProps {
  inventory: Inventory | undefined | null;
}

export default function ResourceBudget({ inventory }: ResourceBudgetProps) {
  const { xpData, componentData, badgeSummary, orbSummary, requisitionData } = useMemo(() => {
    if (!inventory) return { xpData: [], componentData: [], badgeSummary: [], orbSummary: [], requisitionData: null };

    // XP Books
    const xpData = inventory.xpBooks
      .map(b => ({ Rarity: b.rarity, Amount: b.amount }))
      .sort((a, b) => {
        const order = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        return order.indexOf(a.Rarity) - order.indexOf(b.Rarity);
      });

    // Components by Alliance
    const componentData = inventory.components.map(c => ({
      Alliance: c.grandAlliance,
      Amount: c.amount,
    }));

    // Ability Badges flattened
    const badgeSummary: { name: string; amount: number }[] = [];
    for (const [alliance, badges] of Object.entries(inventory.abilityBadges)) {
      for (const badge of badges) {
        badgeSummary.push({ name: `${alliance} ${badge.rarity}`, amount: badge.amount });
      }
    }

    // Forge Badges
    for (const badge of inventory.forgeBadges) {
      badgeSummary.push({ name: `Forge ${badge.rarity}`, amount: badge.amount });
    }

    // Orbs flattened
    const orbSummary: { name: string; amount: number }[] = [];
    for (const [alliance, orbs] of Object.entries(inventory.orbs)) {
      for (const orb of orbs) {
        orbSummary.push({ name: `${alliance} ${orb.rarity}`, amount: orb.amount });
      }
    }

    const requisitionData = inventory.requisitionOrders || null;

    return { xpData, componentData, badgeSummary, orbSummary, requisitionData };
  }, [inventory]);

  if (!inventory) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Resource Requisition Budget
        </h3>
        <p className="text-[rgb(var(--foreground-rgb),0.6)]">++ No Inventory Data Available ++</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Resource Requisition Budget
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* XP Books */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">XP Tomes</Title>
          {xpData.length > 0 ? (
            <BarChart
              className="mt-3 h-36"
              data={xpData}
              index="Rarity"
              categories={['Amount']}
              colors={['amber']}
              showLegend={false}
              yAxisWidth={45}
            />
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">No XP books</p>
          )}
        </Card>

        {/* Components by Alliance */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-sm text-[rgb(var(--primary-color))]">Alliance Components</Title>
          {componentData.length > 0 ? (
            <>
              <BarChart
                className="mt-3 h-28"
                data={componentData}
                index="Alliance"
                categories={['Amount']}
                colors={['cyan']}
                showLegend={false}
                yAxisWidth={45}
              />
              {/* Balance indicator */}
              {componentData.length === 3 && (() => {
                const amounts = componentData.map(c => c.Amount);
                const max = Math.max(...amounts);
                const min = Math.min(...amounts);
                const imbalance = max > 0 ? Math.round(((max - min) / max) * 100) : 0;
                return imbalance > 50 ? (
                  <p className="text-xs text-yellow-400 mt-1">Component imbalance detected ({imbalance}% spread)</p>
                ) : null;
              })()}
            </>
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-4">No components</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Requisition Orders */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Requisition Orders</Title>
          {requisitionData ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>Regular: <strong className="text-[rgb(var(--primary-color))]">{requisitionData.regular}</strong></p>
              <p>Blessed: <strong className="text-[rgb(185,160,110)]">{requisitionData.blessed}</strong></p>
            </div>
          ) : (
            <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-2">N/A</p>
          )}
          <p className="text-xs text-[rgb(var(--foreground-rgb),0.5)] mt-2">
            Reset Stones: <strong>{inventory.resetStones}</strong>
          </p>
        </Card>

        {/* Badges Summary */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Badges</Title>
          <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-0.5">
            {badgeSummary.map((b, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[rgb(var(--foreground-rgb),0.7)]">{b.name}</span>
                <span className={`font-mono ${b.amount < 10 ? 'text-red-400' : 'text-[rgb(var(--foreground-rgb),0.9)]'}`}>{b.amount}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Orbs Summary */}
        <Card className="bg-transparent border border-[rgb(var(--border-color))]">
          <Title className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Orbs</Title>
          <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-0.5">
            {orbSummary.map((o, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[rgb(var(--foreground-rgb),0.7)]">{o.name}</span>
                <span className={`font-mono ${o.amount < 10 ? 'text-red-400' : 'text-[rgb(var(--foreground-rgb),0.9)]'}`}>{o.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
