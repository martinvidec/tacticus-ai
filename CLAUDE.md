# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session-Start Workflow

**Bei jeder neuen Session:**

1. **Offene Issues prüfen:**
   ```bash
   gh issue list --state open
   ```

2. **Benutzer fragen:** "Es gibt X offene Issues. Mit welchem soll ich beginnen?" (Liste anzeigen)

3. **Branch erstellen** für das gewählte Issue:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/issue-<nummer>-<kurzbeschreibung>
   ```
   Beispiel: `fix/issue-15-remove-deepgram`

4. **Issue bearbeiten** und regelmäßig committen

5. **Nach Erledigung:**
   ```bash
   git push -u origin <branch-name>
   gh pr create --title "<Titel>" --body "Closes #<issue-nummer>"
   ```

6. **Wichtig:** Niemals direkt auf `main` pushen! Der `main`-Branch wird automatisch deployed. Alle Änderungen müssen über Pull Requests gemerged werden.

## Branch-Namenskonventionen

| Typ | Format | Beispiel |
|-----|--------|----------|
| Bugfix/Issue | `fix/issue-<nr>-<beschreibung>` | `fix/issue-15-remove-deepgram` |
| Feature | `feat/<beschreibung>` | `feat/add-rate-limiting` |
| Security | `security/issue-<nr>-<beschreibung>` | `security/issue-18-input-validation` |

## Commands

Node.js is installed via **nvm**. The npm binary is not on the default PATH.
Always prefix commands with the PATH export:

```bash
export PATH="/Users/vid/.nvm/versions/node/v20.19.6/bin:$PATH"

npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint via Next.js
npm start        # Run production server
```

No test framework is configured.

## Architecture

Next.js 14 App Router application (TypeScript, Tailwind CSS) that serves as a dashboard for the Warhammer 40,000: Tacticus mobile game. It pulls player, guild, and raid data from the Tacticus game API and displays it with charts and stats.

### Source Layout (`src/`)

- `app/page.tsx` — Main dashboard page (~850 lines, client component). Manages all top-level state, data fetching, and section rendering.
- `app/settings/page.tsx` — API key management page.
- `app/api/tacticus/` — Server-side API routes that proxy requests to the Tacticus game API. Each route verifies Firebase auth and retrieves the user's stored API key before calling the external API.
- `app/api/{openai,anthropic,replicate}/` — Pre-configured AI service integrations (Vercel AI SDK). Available but not central to the dashboard. *(Scheduled for removal: Issues #16, #17)*
- `app/components/` — React components organized by dashboard section (CombatUnitsSection, ArmouryStoresSection, charts/, etc.).
- `lib/types.ts` — TypeScript types mirroring the Tacticus API schema (Player, Guild, GuildRaid, etc.).
- `lib/firebase/` — Firebase client SDK init (`firebase.ts`), Admin SDK init (`firebaseAdmin.ts`), and utilities.
- `lib/contexts/` — AuthContext (Firebase Google Sign-In), DebugContext (debug popup).
- `lib/apiHelpers.ts` — `verifyUserAndGetApiKey()` — core server-side helper that validates Firebase ID tokens and retrieves user-specific Tacticus API keys from Firestore.
- `lib/actions.ts` — Server actions for Firestore CRUD (save/get API keys).

### Data Flow

1. User authenticates via Firebase Google Sign-In
2. Client sends requests to Next.js API routes with Firebase ID token in Authorization header
3. API routes verify the token server-side, retrieve the user's Tacticus API key from Firestore (`users/{uid}`)
4. Routes call the Tacticus game API (`TACTICUS_SERVER_URL`) with the user's key
5. Response data flows back to client components for rendering

### Key Patterns

- **All Tacticus API keys are stored server-side in Firestore**, never exposed to the client.
- **Per-request auth verification**: Every API route calls `verifyUserAndGetApiKey()` before proceeding.
- **State management**: React hooks + Context API only (no Redux/Zustand).
- **Data visualization**: Tremor React library for charts and data cards.
- **Path alias**: `@` maps to `src/` (configured in tsconfig.json).

## Theming

The UI must maintain a **Warhammer 40K aesthetic**:
- Dark mode by default with parchment/gold (`rgb(185,160,110)`) and dark red (`rgb(160,50,50)`) accents
- Font: Exo 2 (Google Fonts)
- Use thematic language in UI text: military/sci-fi terminology ("Armoury & Stores", "Combat Roster", "Cogitator Log", "For the Emperor!")
- CSS variables for theme colors defined in `globals.css`

## Environment Variables

Public (client-side):
- `NEXT_PUBLIC_FIREBASE_*` — Firebase config (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)

Server-side:
- `TACTICUS_SERVER_URL` — Tacticus API base URL (`https://api.tacticusgame.com/api/v1/`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK credentials

## API Reference

The Tacticus game API schema is documented in `tacticus-api-openapi.json` (OpenAPI 3.0) at the project root.

## Statistics Roadmap

All 12 statistics features have been implemented and integrated. GitHub Issues #2–#13 are closed.

### Phase 1 — Tier 1: High Impact (Issues #2–#5)
| # | Issue | Title | Status |
|---|-------|-------|--------|
| 1 | #2 | Roster-Stärke-Analyse nach Fraktion/Allianz | done |
| 2 | #3 | Unit Readiness Score (Einsatzbereitschaft) | done |
| 3 | #4 | Guild-Raid-Effizienz pro Einheit | done |
| 4 | #5 | Kampagnen-Fortschrittsanalyse | done |

### Phase 2 — Tier 2: Medium Impact (Issues #6–#9)
| # | Issue | Title | Status |
|---|-------|-------|--------|
| 5 | #6 | Shard-Farming-Priorisierung | done |
| 6 | #7 | Ausrüstungs-Audit | done |
| 7 | #8 | Ability-Level-Analyse | done |
| 8 | #9 | Guild-Aktivitätsmonitor | done |

### Phase 3 — Tier 3: Supplementary (Issues #10–#13)
| # | Issue | Title | Status |
|---|-------|-------|--------|
| 9 | #10 | Ressourcen-Budgetierung | done |
| 10 | #11 | Token-Management | done |
| 11 | #12 | Upgrade-Fortschritt | done |
| 12 | #13 | Season-übergreifende Raid-Trends | done |

### New Files Created
- `src/lib/statsUtils.ts` — Reusable stat calculation functions (readiness score, alliance strength, ability completion, campaign analysis)
- `src/lib/gameConstants.ts` — Game constants (shard costs per star, rank tier names, rarity mappings)
- `src/app/components/RosterStrengthAnalysis.tsx` — Alliance/faction strength breakdown (Combat Roster section)
- `src/app/components/UnitReadinessSection.tsx` — Weighted readiness score per unit (Combat Roster section)
- `src/app/components/RaidEfficiencyAnalysis.tsx` — Damage/power efficiency ranking (Raid Intel section)
- `src/app/components/CampaignAnalysis.tsx` — Campaign progress with wall detection (Missions section)
- `src/app/components/ShardFarmingPriority.tsx` — Shard progress to next star (Combat Roster section)
- `src/app/components/EquipmentAudit.tsx` — Empty slots, underlevel items, rarity distribution (Armoury section)
- `src/app/components/AbilityAnalysis.tsx` — Ability completion ranking (Combat Roster section)
- `src/app/components/GuildActivityMonitor.tsx` — Member activity/inactivity tracking (Guild section)
- `src/app/components/ResourceBudget.tsx` — XP books, badges, orbs, components overview (Armoury section)
- `src/app/components/TokenManagement.tsx` — Token status with wasted-regen warnings (Missions section)
- `src/app/components/UpgradeProgress.tsx` — 2×3 upgrade grid completion (Combat Roster section)
- `src/app/components/RaidSeasonTrends.tsx` — Cross-season damage/participation trends (Raid Intel section)

### Section Mapping
Each statistic is placed in the appropriate dashboard section:
- **Combat Roster**: RosterStrengthAnalysis → UnitReadinessSection → ShardFarmingPriority → AbilityAnalysis → UpgradeProgress → CombatUnitsSection
- **Raid Intel**: GuildRaidIntelSection → RaidEfficiencyAnalysis → RaidSeasonTrends
- **Armoury & Stores**: ArmouryStoresSection → EquipmentAudit → ResourceBudget
- **Missions**: TokenManagement → MissionProgressSection → CampaignAnalysis
- **Guild**: GuildAffiliationSection → GuildActivityMonitor

### Resolved Build Issues (fixed in this roadmap)
- `useOpenUnit` extracted from `page.tsx` to `lib/contexts/OpenUnitContext.tsx` (Next.js page export restriction)
- Dead heroicon imports removed from `SideNavMenu.tsx`
- `SignInWithGoogle.tsx` import fixed to use `@/lib/contexts/AuthContext`
- OpenAI/Replicate clients made lazy-init to prevent build crashes without API keys
