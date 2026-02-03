import { Unit, GrandAlliance } from './types';

// --- Roster Strength Analysis ---

export interface AllianceStrengthData {
  alliance: GrandAlliance;
  unitCount: number;
  avgRank: number;
  avgXpLevel: number;
  avgProgressionIndex: number;
  strongUnits: number; // units with rank > 6
}

export interface FactionStrengthData {
  faction: string;
  alliance: GrandAlliance | 'Unknown';
  unitCount: number;
  avgRank: number;
  avgXpLevel: number;
}

export function calculateAllianceStrength(units: Unit[]): AllianceStrengthData[] {
  const alliances: GrandAlliance[] = ['Imperial', 'Xenos', 'Chaos'];

  return alliances.map(alliance => {
    const allianceUnits = units.filter(u => u.grandAlliance === alliance);
    const count = allianceUnits.length;

    if (count === 0) {
      return { alliance, unitCount: 0, avgRank: 0, avgXpLevel: 0, avgProgressionIndex: 0, strongUnits: 0 };
    }

    return {
      alliance,
      unitCount: count,
      avgRank: Math.round((allianceUnits.reduce((sum, u) => sum + u.rank, 0) / count) * 10) / 10,
      avgXpLevel: Math.round((allianceUnits.reduce((sum, u) => sum + u.xpLevel, 0) / count) * 10) / 10,
      avgProgressionIndex: Math.round((allianceUnits.reduce((sum, u) => sum + u.progressionIndex, 0) / count) * 10) / 10,
      strongUnits: allianceUnits.filter(u => u.rank > 6).length,
    };
  });
}

export function calculateFactionStrength(units: Unit[]): FactionStrengthData[] {
  const factionMap = new Map<string, Unit[]>();

  for (const unit of units) {
    const faction = unit.faction || 'Unknown';
    const list = factionMap.get(faction) || [];
    list.push(unit);
    factionMap.set(faction, list);
  }

  return Array.from(factionMap.entries())
    .map(([faction, factionUnits]) => ({
      faction,
      alliance: (factionUnits[0]?.grandAlliance || 'Unknown') as GrandAlliance | 'Unknown',
      unitCount: factionUnits.length,
      avgRank: Math.round((factionUnits.reduce((sum, u) => sum + u.rank, 0) / factionUnits.length) * 10) / 10,
      avgXpLevel: Math.round((factionUnits.reduce((sum, u) => sum + u.xpLevel, 0) / factionUnits.length) * 10) / 10,
    }))
    .sort((a, b) => b.avgRank - a.avgRank);
}

export interface AllianceWeakness {
  alliance: GrandAlliance;
  reason: string;
}

export function identifyWeaknesses(allianceData: AllianceStrengthData[]): AllianceWeakness[] {
  const weaknesses: AllianceWeakness[] = [];

  for (const data of allianceData) {
    if (data.strongUnits < 5) {
      weaknesses.push({
        alliance: data.alliance,
        reason: `Only ${data.strongUnits} unit${data.strongUnits !== 1 ? 's' : ''} above Bronze rank`,
      });
    }
    if (data.unitCount < 3) {
      weaknesses.push({
        alliance: data.alliance,
        reason: `Only ${data.unitCount} unit${data.unitCount !== 1 ? 's' : ''} total`,
      });
    }
  }

  return weaknesses;
}

// --- Unit Readiness Score ---

export interface ReadinessBreakdown {
  rankScore: number;       // 0-25
  xpScore: number;         // 0-20
  starScore: number;       // 0-20
  abilityScore: number;    // 0-20
  itemScore: number;       // 0-15
  total: number;           // 0-100
}

export function calculateReadinessScore(unit: Unit): ReadinessBreakdown {
  const rankScore = (unit.rank / 17) * 25;
  const xpScore = (unit.xpLevel / 50) * 20;
  const starScore = (unit.progressionIndex / 15) * 20;

  // Abilities: only count unlocked ones (level > 0)
  const unlockedAbilities = unit.abilities.filter(a => a.level > 0);
  const abilityScore = unlockedAbilities.length > 0
    ? (unlockedAbilities.reduce((sum, a) => sum + a.level, 0) / (unlockedAbilities.length * 50)) * 20
    : 0;

  // Items: count equipped items and their levels
  const equippedCount = unit.items.length;
  const avgItemLevel = equippedCount > 0
    ? unit.items.reduce((sum, item) => sum + item.level, 0) / equippedCount
    : 0;
  const itemScore = (equippedCount / 3) * (avgItemLevel / 11) * 15;

  const total = Math.round((rankScore + xpScore + starScore + abilityScore + itemScore) * 10) / 10;

  return {
    rankScore: Math.round(rankScore * 10) / 10,
    xpScore: Math.round(xpScore * 10) / 10,
    starScore: Math.round(starScore * 10) / 10,
    abilityScore: Math.round(abilityScore * 10) / 10,
    itemScore: Math.round(itemScore * 10) / 10,
    total,
  };
}

export function getReadinessColor(score: number): string {
  if (score >= 90) return 'text-[rgb(185,160,110)]'; // gold
  if (score >= 60) return 'text-green-400';
  if (score >= 30) return 'text-yellow-400';
  return 'text-red-400';
}

export function getReadinessBgColor(score: number): string {
  if (score >= 90) return 'bg-[rgba(185,160,110,0.2)]';
  if (score >= 60) return 'bg-green-900/20';
  if (score >= 30) return 'bg-yellow-900/20';
  return 'bg-red-900/20';
}

// --- Raid Efficiency ---

export interface UnitEfficiency {
  unitId: string;
  unitName: string;
  avgEfficiency: number; // damage per power point
  totalDamage: number;
  totalPower: number;
  raidCount: number;
}

export interface RaidEfficiencyEntry {
  damageDealt: number;
  totalTeamPower: number;
  efficiency: number;
  heroIds: string[];
  damageType: 'Bomb' | 'Battle';
  encounterType: 'Boss' | 'SideBoss';
  bossType: string;
}

// --- Campaign Analysis ---

export interface CampaignAnalysisData {
  id: string;
  name: string;
  type: string;
  totalBattles: number;
  maxBattleIndex: number;
  progressPercent: number;
  totalAttemptsUsed: number;
  avgAttemptsPerBattle: number;
  walls: { battleIndex: number; attemptsUsed: number }[];
}

export function analyzeCampaign(campaign: { id: string; name: string; type: string; battles: { battleIndex: number; attemptsUsed: number; attemptsLeft: number }[] }): CampaignAnalysisData {
  const maxBattleIndex = campaign.battles.length > 0
    ? Math.max(...campaign.battles.map(b => b.battleIndex))
    : 0;

  const totalAttemptsUsed = campaign.battles.reduce((sum, b) => sum + b.attemptsUsed, 0);
  const battlesWithAttempts = campaign.battles.filter(b => b.attemptsUsed > 0);
  const avgAttemptsPerBattle = battlesWithAttempts.length > 0
    ? Math.round((totalAttemptsUsed / battlesWithAttempts.length) * 10) / 10
    : 0;

  // Walls: battles with many attempts and no remaining attempts
  const walls = campaign.battles
    .filter(b => b.attemptsUsed > 5 && b.attemptsLeft === 0)
    .map(b => ({ battleIndex: b.battleIndex, attemptsUsed: b.attemptsUsed }))
    .sort((a, b) => b.attemptsUsed - a.attemptsUsed);

  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    totalBattles: campaign.battles.length,
    maxBattleIndex,
    progressPercent: Math.round((maxBattleIndex / 75) * 100),
    totalAttemptsUsed,
    avgAttemptsPerBattle,
    walls,
  };
}

// --- Ability Analysis (Phase 2) ---

export function calculateAbilityCompletion(unit: Unit): { completion: number; locked: number; unlocked: number; avgLevel: number } {
  const unlocked = unit.abilities.filter(a => a.level > 0);
  const locked = unit.abilities.filter(a => a.level === 0);

  if (unlocked.length === 0) {
    return { completion: 0, locked: locked.length, unlocked: 0, avgLevel: 0 };
  }

  const avgLevel = Math.round((unlocked.reduce((sum, a) => sum + a.level, 0) / unlocked.length) * 10) / 10;
  const completion = Math.round((unlocked.reduce((sum, a) => sum + a.level, 0) / (unlocked.length * 50)) * 1000) / 10;

  return { completion, locked: locked.length, unlocked: unlocked.length, avgLevel };
}
