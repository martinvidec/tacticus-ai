// Based on tacticus-api-openapi.json Player Response

// --- Primitive/Shared Types ---
export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type GrandAlliance = "Imperial" | "Xenos" | "Chaos";
export type Faction = string; // Faction seems to be just a string in the API spec

// --- Player Details & MetaData ---
export interface PlayerDetails {
  name: string;
  powerLevel: number;
}

export interface PlayerMetaData {
  configHash: string;
  apiKeyExpiresOn?: number;
  lastUpdatedOn: number;
  scopes: string[];
}

// --- Unit Related Types ---
export interface Ability {
  id: string;
  level: number; // 0 = locked
}

export interface UnitItem {
  slotId: "Slot1" | "Slot2" | "Slot3";
  level: number;
  id: string;
  name?: string;
  rarity?: Rarity;
}

export interface Unit {
  id: string;
  name?: string;
  faction?: string;
  grandAlliance?: GrandAlliance;
  progressionIndex: number; // Star level
  xp: number;
  xpLevel: number;
  rank: number; // Stone I, Iron I, etc.
  abilities: Ability[];
  upgrades: number[]; // 2x3 matrix indices
  items: UnitItem[];
  shards: number;
}

// --- Inventory Related Types ---
export interface Item {
  id: string;
  name?: string;
  level: number;
  amount: number;
}

export interface Upgrade {
  id: string;
  name?: string;
  amount: number;
}

export interface Shard {
  id: string;
  name?: string;
  amount: number;
}

export interface XpBook {
  id: string;
  rarity: Rarity;
  amount: number;
}

export interface AbilityBadge {
  name?: string;
  rarity: Rarity;
  amount: number;
}

export interface Component {
  name: string;
  grandAlliance: GrandAlliance;
  amount: number;
}

export interface ForgeBadge {
  name: string;
  rarity: Rarity;
  amount: number;
}

export interface Orb {
  rarity: Rarity;
  amount: number;
}

export interface RequisitionOrders {
    regular: number;
    blessed: number;
}

export interface Inventory {
  items: Item[];
  upgrades: Upgrade[];
  shards: Shard[];
  xpBooks: XpBook[];
  // Keys are GrandAlliance strings
  abilityBadges: { [key: string]: AbilityBadge[] };
  components: Component[];
  forgeBadges: ForgeBadge[];
  // Keys are GrandAlliance strings
  orbs: { [key: string]: Orb[] };
  requisitionOrders?: RequisitionOrders;
  resetStones: number;
}

// --- Progress Related Types ---
export interface Token {
  current: number;
  max: number;
  nextTokenInSeconds?: number;
  regenDelayInSeconds: number;
}

export interface Arena {
  tokens?: Token;
}

export interface GuildRaid {
  tokens?: Token;
  bombTokens?: Token;
}

export interface Onslaught {
  tokens?: Token;
}

export interface SalvageRun {
  tokens?: Token;
}

export interface CampaignLevel {
  battleIndex: number;
  attemptsLeft: number;
  attemptsUsed: number;
}

export interface CampaignProgress {
  id: string;
  name: string;
  type: "Standard" | "Mirror" | "Elite" | "EliteMirror";
  battles: CampaignLevel[];
}

export interface Progress {
  campaigns: CampaignProgress[];
  arena?: Arena;
  guildRaid?: GuildRaid;
  onslaught?: Onslaught;
  salvageRun?: SalvageRun;
}

// --- Player & Response Types ---
export interface Player {
  details: PlayerDetails;
  units: Unit[]; // Now uses detailed Unit interface
  inventory: Inventory; // Now uses detailed Inventory interface
  progress: Progress; // Now uses detailed Progress interface
}

export interface PlayerDataResponse {
  player: Player;
  metaData: PlayerMetaData;
}

// Type for API error responses
export interface ApiError {
  type: string;
} 