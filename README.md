# Tacticus Player Intel Aggregator

**++ Incoming Transmission: Accessing Player Data Feed ++**

This application serves as a cogitator interface designed to aggregate and display vital intel pertaining to Warhammer 40,000: Tacticus combatants. Connect via secure Google Relay authentication to access your detailed player profile, unit rosters, armoury manifests, and mission progress logs retrieved directly from the official Tacticus noosphere data streams.

**++ For the Emperor! ++**

## Features

*   Secure authentication via Google Sign-In (Firebase).
*   Fetches and displays detailed player data from the official Tacticus API:
    *   Player Vitals (Name, Power Level, Metadata)
    *   Combat Unit Roster (Level, Rank, Shards, Abilities, Wargear)
    *   Armoury & Stores (Items, Upgrades, Badges, Orbs, Components, etc.)
    *   Mission & Campaign Progress (Tokens, Campaign Battle Logs)
*   Thematically styled interface inspired by the grim darkness of the 41st Millennium.
*   Built with Next.js (App Router), React, TypeScript, and Tailwind CSS.

## Getting Started: Adeptus Mechanicus Setup Protocol

**Prerequisites:**

*   Node.js (Version >= 18 recommended)
*   npm or yarn

**Installation & Configuration:**

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/martinvidec/tacticus-ai.git # Replace with your repo URL if different
    cd tacticus-ai
    ```

2.  **Install Dependencies:** Consecrate the machine spirit.
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Configure Environment Variables:** Create a `.env.local` file in the project root. This requires sanctioned access keys. Populate it with the following fields:

    ```dotenv
    # Firebase Configuration (Retrieve from your Firebase Project Settings -> Web App Config)
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

    # Tacticus API Key (Obtain your personal key from appropriate channels)
    TACTICUS_API_KEY=YOUR_TACTICUS_API_KEY
    TACTICUS_SERVER_URL=https://api.tacticusgame.com/api/v1/
    ```
    *   **Firebase:** Ensure you have created a Firebase project and enabled Google Sign-In as an authentication provider. Add your web app's configuration details here.
    *   **Tacticus:** You need a valid Tacticus API key with the necessary scopes (Player, Guild, Guild Raid) for the API calls to function.

4.  **Run the Development Servitor:** Engage the runic sequences.
    ```bash
    npm run dev
    # or
    # yarn dev
    ```

5.  **Access the Interface:** Open [http://localhost:3000](http://localhost:3000) in your chrono-viewer (web browser). Authenticate via Google Relay to access the data feed.

## Technologies Employed

*   **Framework:** Next.js 14 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Authentication:** Firebase Authentication (Google Sign-In)
*   **API Interaction:** Fetch API
*   **Icons:** Lucide React

**++ May your data remain uncorrupted. The Emperor Protects. ++**