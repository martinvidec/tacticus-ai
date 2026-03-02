# Tacticus Player Intel Aggregator

**++ Incoming Transmission: Accessing Player Data Feed ++**

This application serves as a cogitator interface designed to aggregate and display vital intel pertaining to Warhammer 40,000: Tacticus combatants. Connect via secure Google Relay authentication to access your detailed player profile, unit rosters, armoury manifests, mission progress logs, and guild raid intelligence retrieved directly from the official Tacticus noosphere data streams.

**++ For the Emperor! ++**

## Features

### Core Data Access
- Secure authentication via Google Sign-In (Firebase)
- Server-side API key storage in Firestore (never exposed to client)
- Per-request authentication verification with Firebase Admin SDK
- Rate limiting via Upstash Redis

### Player Intelligence Dashboard
- **Player Vitals** — Name, Power Level, Account Metadata
- **Combat Unit Roster** — Level, Rank, Shards, Abilities, Wargear
- **Armoury & Stores** — Items, Upgrades, Badges, Orbs, Components
- **Mission & Campaign Progress** — Tokens, Campaign Battle Logs
- **Guild Affiliation** — Guild info, member roster
- **Raid Intel** — Boss performance, damage tracking, season data

### Advanced Analytics (12 Statistics Modules)

**Combat Roster Analysis:**
- Roster Strength Analysis by Faction/Alliance
- Unit Readiness Score (weighted deployment readiness)
- Shard Farming Priority (progress to next star)
- Ability Level Analysis (completion ranking)
- Upgrade Progress (2×3 grid completion tracking)

**Raid Intelligence:**
- Guild Raid Efficiency per Unit
- Cross-Season Raid Trends (damage/participation)

**Armoury Analytics:**
- Equipment Audit (empty slots, underlevel items, rarity distribution)
- Resource Budget (XP books, badges, orbs, components overview)

**Mission Analysis:**
- Campaign Progress Analysis (with wall detection)
- Token Management (status with wasted-regen warnings)

**Guild Monitoring:**
- Guild Activity Monitor (member activity/inactivity tracking)

### Cogitator AI Assistant
- Integrated Claude AI chat interface for tactical consultation
- Context-aware responses based on your player data
- Thematic Warhammer 40K personality

### Interface
- Dark mode UI with Warhammer 40K aesthetic (parchment/gold accents)
- Interactive data visualization with Tremor React charts
- Smooth animations with Framer Motion
- Responsive design for all device sizes

## Getting Started: Adeptus Mechanicus Setup Protocol

### Prerequisites

- Node.js (Version >= 18 recommended)
- npm or yarn
- Firebase Project with Firestore and Authentication enabled
- Tacticus API Key (with Player, Guild, Guild Raid scopes)

### Installation & Configuration

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/martinvidec/tacticus-ai.git
   cd tacticus-ai
   ```

2. **Install Dependencies:** Consecrate the machine spirit.
   ```bash
   npm install
   ```

3. **Configure Environment Variables:** Create a `.env.local` file in the project root:

   ```dotenv
   # Firebase Client Configuration (from Firebase Console -> Project Settings -> Web App)
   NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

   # Firebase Admin SDK (from Firebase Console -> Service Accounts -> Generate New Private Key)
   FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL=YOUR_SERVICE_ACCOUNT_EMAIL
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Tacticus API
   TACTICUS_SERVER_URL=https://api.tacticusgame.com/api/v1/

   # Anthropic API (for Cogitator AI chat)
   ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY

   # Upstash Redis (for rate limiting)
   UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_URL
   UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_TOKEN
   ```

   **Notes:**
   - Firebase Authentication must have Google Sign-In enabled
   - User Tacticus API keys are stored in Firestore (`users/{uid}`) after login
   - The Anthropic API key powers the Cogitator AI assistant

4. **Run the Development Servitor:**
   ```bash
   npm run dev
   ```

5. **Access the Interface:** Open [http://localhost:3000](http://localhost:3000) in your chrono-viewer. Authenticate via Google Relay, then enter your Tacticus API key in Settings.

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main dashboard (client component)
│   ├── settings/             # API key management
│   ├── api/tacticus/         # Server-side API routes (proxies to Tacticus API)
│   └── components/           # React components by section
├── lib/
│   ├── types.ts              # TypeScript types (Tacticus API schema)
│   ├── firebase/             # Firebase client & admin SDK init
│   ├── contexts/             # React contexts (Auth, Debug, OpenUnit)
│   ├── apiHelpers.ts         # Server-side auth verification
│   ├── actions.ts            # Server actions for Firestore
│   ├── statsUtils.ts         # Statistics calculation functions
│   └── gameConstants.ts      # Game constants (shard costs, ranks, etc.)
└── ...
```

## Technologies Employed

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Firebase Authentication (Google Sign-In)
- **Database:** Firebase Firestore
- **Charts:** Tremor React
- **Animations:** Framer Motion
- **AI:** Anthropic Claude SDK
- **Rate Limiting:** Upstash Redis
- **Validation:** Zod
- **Icons:** Lucide React, Heroicons

## API Reference

The Tacticus game API schema is documented in `tacticus-api-openapi.json` (OpenAPI 3.0) at the project root.

**++ May your data remain uncorrupted. The Emperor Protects. ++**
