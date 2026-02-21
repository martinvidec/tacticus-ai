import { PlayerDataResponse, GuildResponse, GuildRaidResponse, Unit, GrandAlliance } from './types';
import { calculateAllianceStrength, calculateReadinessScore, identifyWeaknesses } from './statsUtils';
import { SHARD_COSTS_PER_STAR, RANK_TIER_NAMES } from './gameConstants';

/**
 * Stats export format for Claude context
 */
export interface StatsExport {
  overview: {
    playerName: string;
    powerLevel: number;
    totalUnits: number;
    guildName?: string;
    guildMemberCount?: number;
  };
  rosterAnalysis: {
    allianceStrength: {
      alliance: GrandAlliance;
      unitCount: number;
      avgRank: number;
      avgXpLevel: number;
      strongUnits: number;
    }[];
    topUnits: {
      name: string;
      rank: string;
      xpLevel: number;
      readinessScore: number;
      faction: string;
    }[];
    weaknesses: string[];
  };
  resourceStatus: {
    xpBooks: { rarity: string; amount: number }[];
    components: { alliance: string; amount: number }[];
    resetStones: number;
  };
  raidPerformance?: {
    avgDamage: number;
    avgEfficiency: number;
    topPerformers: {
      unitName: string;
      avgDamage: number;
      usageCount: number;
    }[];
    recentSeason?: number;
  };
  priorities: {
    unitsNearPromotion: {
      name: string;
      currentStars: number;
      shardsOwned: number;
      shardsNeeded: number;
      percentComplete: number;
    }[];
    underequipped: {
      name: string;
      emptySlots: number;
      avgItemLevel: number;
    }[];
    lowAbilityUnits: {
      name: string;
      unlockedAbilities: number;
      avgAbilityLevel: number;
    }[];
  };
}

/**
 * Generates a comprehensive stats export for Claude context.
 * This creates a structured summary of the player's game state.
 */
export function generateStatsExport(
  playerData: PlayerDataResponse | null,
  guildData: GuildResponse | null,
  allSeasonsRaidData: Record<number, GuildRaidResponse>,
  tacticusUserId: string | null
): StatsExport | null {
  if (!playerData?.player) {
    return null;
  }

  const player = playerData.player;
  const units = player.units || [];
  const inventory = player.inventory;

  // Overview
  const overview = {
    playerName: player.details?.name || 'Unknown Commander',
    powerLevel: player.details?.powerLevel || 0,
    totalUnits: units.length,
    guildName: guildData?.guild?.name,
    guildMemberCount: guildData?.guild?.members?.length,
  };

  // Roster Analysis
  const allianceStrength = calculateAllianceStrength(units);
  const weaknessData = identifyWeaknesses(allianceStrength);

  const unitsWithReadiness = units.map(unit => ({
    unit,
    readiness: calculateReadinessScore(unit),
  }));

  const topUnits = unitsWithReadiness
    .sort((a, b) => b.readiness.total - a.readiness.total)
    .slice(0, 10)
    .map(({ unit, readiness }) => ({
      name: unit.name || unit.id,
      rank: RANK_TIER_NAMES[unit.rank] || `Rank ${unit.rank}`,
      xpLevel: unit.xpLevel,
      readinessScore: readiness.total,
      faction: unit.faction || 'Unknown',
    }));

  const rosterAnalysis = {
    allianceStrength: allianceStrength.map(a => ({
      alliance: a.alliance,
      unitCount: a.unitCount,
      avgRank: a.avgRank,
      avgXpLevel: a.avgXpLevel,
      strongUnits: a.strongUnits,
    })),
    topUnits,
    weaknesses: weaknessData.map(w => `${w.alliance}: ${w.reason}`),
  };

  // Resource Status
  const xpBooks = inventory?.xpBooks?.map(book => ({
    rarity: book.rarity,
    amount: book.amount,
  })) || [];

  const componentsByAlliance = new Map<string, number>();
  for (const comp of inventory?.components || []) {
    const current = componentsByAlliance.get(comp.grandAlliance) || 0;
    componentsByAlliance.set(comp.grandAlliance, current + comp.amount);
  }

  const resourceStatus = {
    xpBooks,
    components: Array.from(componentsByAlliance.entries()).map(([alliance, amount]) => ({
      alliance,
      amount,
    })),
    resetStones: inventory?.resetStones || 0,
  };

  // Raid Performance
  let raidPerformance: StatsExport['raidPerformance'] = undefined;
  const seasonNumbers = Object.keys(allSeasonsRaidData).map(Number).sort((a, b) => b - a);

  if (seasonNumbers.length > 0 && tacticusUserId) {
    const latestSeason = seasonNumbers[0];
    const raidData = allSeasonsRaidData[latestSeason];

    if (raidData?.entries) {
      const userEntries = raidData.entries.filter(e => e.userId === tacticusUserId);
      const unitDamageMap = new Map<string, { totalDamage: number; count: number }>();

      let totalDamage = 0;
      let totalPower = 0;

      for (const entry of userEntries) {
        totalDamage += entry.damageDealt || 0;
        // Calculate total team power from heroDetails
        const teamPower = entry.heroDetails?.reduce((sum, h) => sum + (h.power || 0), 0) || 1;
        totalPower += teamPower;

        // Track damage per unit from heroDetails
        for (const hero of entry.heroDetails || []) {
          const existing = unitDamageMap.get(hero.unitId) || { totalDamage: 0, count: 0 };
          existing.totalDamage += entry.damageDealt || 0;
          existing.count += 1;
          unitDamageMap.set(hero.unitId, existing);
        }
      }

      const topPerformers = Array.from(unitDamageMap.entries())
        .map(([unitId, data]) => {
          const unit = units.find(u => u.id === unitId);
          return {
            unitName: unit?.name || unitId,
            avgDamage: Math.round(data.totalDamage / data.count),
            usageCount: data.count,
          };
        })
        .sort((a, b) => b.avgDamage - a.avgDamage)
        .slice(0, 5);

      raidPerformance = {
        avgDamage: userEntries.length > 0 ? Math.round(totalDamage / userEntries.length) : 0,
        avgEfficiency: totalPower > 0 ? Math.round((totalDamage / totalPower) * 100) / 100 : 0,
        topPerformers,
        recentSeason: latestSeason,
      };
    }
  }

  // Priorities
  const unitsNearPromotion = units
    .filter(unit => {
      const nextStarCost = SHARD_COSTS_PER_STAR[unit.progressionIndex + 1];
      return nextStarCost && unit.shards >= nextStarCost * 0.5;
    })
    .map(unit => {
      const nextStarCost = SHARD_COSTS_PER_STAR[unit.progressionIndex + 1] || 0;
      return {
        name: unit.name || unit.id,
        currentStars: unit.progressionIndex,
        shardsOwned: unit.shards,
        shardsNeeded: nextStarCost,
        percentComplete: nextStarCost > 0 ? Math.round((unit.shards / nextStarCost) * 100) : 0,
      };
    })
    .sort((a, b) => b.percentComplete - a.percentComplete)
    .slice(0, 5);

  const underequipped = units
    .filter(unit => unit.items.length < 3 || unit.items.some(item => item.level < 5))
    .map(unit => {
      const avgItemLevel = unit.items.length > 0
        ? Math.round((unit.items.reduce((sum, i) => sum + i.level, 0) / unit.items.length) * 10) / 10
        : 0;
      return {
        name: unit.name || unit.id,
        emptySlots: 3 - unit.items.length,
        avgItemLevel,
      };
    })
    .sort((a, b) => b.emptySlots - a.emptySlots || a.avgItemLevel - b.avgItemLevel)
    .slice(0, 5);

  const lowAbilityUnits = units
    .map(unit => {
      const unlockedAbilities = unit.abilities.filter(a => a.level > 0);
      const avgLevel = unlockedAbilities.length > 0
        ? Math.round((unlockedAbilities.reduce((sum, a) => sum + a.level, 0) / unlockedAbilities.length) * 10) / 10
        : 0;
      return {
        name: unit.name || unit.id,
        unlockedAbilities: unlockedAbilities.length,
        avgAbilityLevel: avgLevel,
      };
    })
    .filter(u => u.unlockedAbilities > 0 && u.avgAbilityLevel < 20)
    .sort((a, b) => a.avgAbilityLevel - b.avgAbilityLevel)
    .slice(0, 5);

  return {
    overview,
    rosterAnalysis,
    resourceStatus,
    raidPerformance,
    priorities: {
      unitsNearPromotion,
      underequipped,
      lowAbilityUnits,
    },
  };
}

/**
 * Converts stats export to a formatted string for Claude context.
 */
export function statsExportToString(stats: StatsExport): string {
  const lines: string[] = [];

  lines.push('=== PLAYER OVERVIEW ===');
  lines.push(`Commander: ${stats.overview.playerName}`);
  lines.push(`Power Level: ${stats.overview.powerLevel.toLocaleString()}`);
  lines.push(`Total Units: ${stats.overview.totalUnits}`);
  if (stats.overview.guildName) {
    lines.push(`Guild: ${stats.overview.guildName} (${stats.overview.guildMemberCount} members)`);
  }

  lines.push('\n=== ROSTER ANALYSIS ===');
  for (const alliance of stats.rosterAnalysis.allianceStrength) {
    lines.push(`${alliance.alliance}: ${alliance.unitCount} units, Avg Rank: ${alliance.avgRank}, Strong Units: ${alliance.strongUnits}`);
  }

  if (stats.rosterAnalysis.weaknesses.length > 0) {
    lines.push('\nWeaknesses:');
    for (const w of stats.rosterAnalysis.weaknesses) {
      lines.push(`- ${w}`);
    }
  }

  lines.push('\nTop 10 Units by Readiness:');
  for (const unit of stats.rosterAnalysis.topUnits) {
    lines.push(`- ${unit.name} (${unit.faction}): ${unit.rank}, Lvl ${unit.xpLevel}, Score: ${unit.readinessScore}`);
  }

  lines.push('\n=== RESOURCES ===');
  if (stats.resourceStatus.xpBooks.length > 0) {
    lines.push('XP Books: ' + stats.resourceStatus.xpBooks.map(b => `${b.rarity}: ${b.amount}`).join(', '));
  }
  if (stats.resourceStatus.components.length > 0) {
    lines.push('Components: ' + stats.resourceStatus.components.map(c => `${c.alliance}: ${c.amount}`).join(', '));
  }
  lines.push(`Reset Stones: ${stats.resourceStatus.resetStones}`);

  if (stats.raidPerformance) {
    lines.push(`\n=== RAID PERFORMANCE (Season ${stats.raidPerformance.recentSeason}) ===`);
    lines.push(`Avg Damage: ${stats.raidPerformance.avgDamage.toLocaleString()}`);
    lines.push(`Avg Efficiency: ${stats.raidPerformance.avgEfficiency}`);
    if (stats.raidPerformance.topPerformers.length > 0) {
      lines.push('Top Performers:');
      for (const p of stats.raidPerformance.topPerformers) {
        lines.push(`- ${p.unitName}: Avg ${p.avgDamage.toLocaleString()} dmg (${p.usageCount} raids)`);
      }
    }
  }

  lines.push('\n=== UPGRADE PRIORITIES ===');
  if (stats.priorities.unitsNearPromotion.length > 0) {
    lines.push('Near Promotion:');
    for (const u of stats.priorities.unitsNearPromotion) {
      lines.push(`- ${u.name}: ${u.currentStars}* -> ${u.currentStars + 1}* (${u.shardsOwned}/${u.shardsNeeded} shards, ${u.percentComplete}%)`);
    }
  }
  if (stats.priorities.underequipped.length > 0) {
    lines.push('\nUnderequipped:');
    for (const u of stats.priorities.underequipped) {
      lines.push(`- ${u.name}: ${u.emptySlots} empty slots, Avg Item Lvl: ${u.avgItemLevel}`);
    }
  }
  if (stats.priorities.lowAbilityUnits.length > 0) {
    lines.push('\nLow Ability Levels:');
    for (const u of stats.priorities.lowAbilityUnits) {
      lines.push(`- ${u.name}: ${u.unlockedAbilities} abilities, Avg Lvl: ${u.avgAbilityLevel}`);
    }
  }

  return lines.join('\n');
}
