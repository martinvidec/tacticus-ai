/**
 * Game constants for Warhammer 40,000: Tacticus.
 * These values are not available from the API and must be maintained manually.
 */

/**
 * Shard costs per star upgrade within a rarity tier.
 * progressionIndex: 0=Common, 3=Uncommon, 6=Rare, 9=Epic, 12=Legendary
 * Each rarity tier has 3 star levels (e.g., Common stars at index 1, 2, 3).
 *
 * TODO: Verify exact shard costs from game data. These are best-effort estimates.
 */
export const SHARD_COSTS_PER_STAR: Record<number, number> = {
  // Common → stars 1, 2, 3 (progressionIndex 0→1→2→3)
  1: 10,
  2: 15,
  3: 15,
  // Uncommon → stars 4, 5, 6 (progressionIndex 3→4→5→6)
  4: 25,
  5: 30,
  6: 40,
  // Rare → stars 7, 8, 9 (progressionIndex 6→7→8→9)
  7: 55,
  8: 65,
  9: 80,
  // Epic → stars 10, 11, 12 (progressionIndex 9→10→11→12)
  10: 100,
  11: 130,
  12: 165,
  // Legendary → stars 13, 14, 15 (progressionIndex 12→13→14→15)
  13: 200,
  14: 250,
  15: 300,
};

/**
 * Get the number of shards needed to reach the next star level.
 * Returns null if already at max or if cost is unknown.
 */
export function getShardsToNextStar(progressionIndex: number): number | null {
  const nextStar = progressionIndex + 1;
  return SHARD_COSTS_PER_STAR[nextStar] ?? null;
}

/**
 * Get the rarity tier name from progressionIndex.
 */
export function getRarityFromProgressionIndex(index: number): string {
  if (index >= 12) return 'Legendary';
  if (index >= 9) return 'Epic';
  if (index >= 6) return 'Rare';
  if (index >= 3) return 'Uncommon';
  return 'Common';
}

/**
 * Rank tier names as a constant record.
 */
export const RANK_TIER_NAMES: Record<number, string> = {
  0: 'Stone I',
  1: 'Stone II',
  2: 'Stone III',
  3: 'Iron I',
  4: 'Iron II',
  5: 'Iron III',
  6: 'Bronze I',
  7: 'Bronze II',
  8: 'Bronze III',
  9: 'Silver I',
  10: 'Silver II',
  11: 'Silver III',
  12: 'Gold I',
  13: 'Gold II',
  14: 'Gold III',
  15: 'Diamond I',
  16: 'Diamond II',
  17: 'Diamond III',
};

/**
 * Rank tier names mapped to rank numbers.
 */
export function getRankTierName(rank: number): string {
  return RANK_TIER_NAMES[rank] || `Rank ${rank}`;
}
