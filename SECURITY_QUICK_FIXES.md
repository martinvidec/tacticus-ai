# Security Quick Fixes - Tacticus AI Dashboard

Diese Datei enthält sofort umsetzbare Code-Fixes für die im Security Audit identifizierten kritischen und hohen Schwachstellen.

---

## 🔴 KRITISCH: Fix #1 - Deepgram API-Key Exposure

**Problem:** Der Deepgram API-Key wird über unauthentifizierten GET-Endpoint exponiert.

**Datei:** `src/app/api/deepgram/route.ts`

### Lösung A: Authentifizierung hinzufügen (EMPFOHLEN)

```typescript
import { NextResponse } from "next/server";
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // Authentifizierung prüfen
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];

    try {
        if (!adminAuth) {
            throw new Error('Admin SDK not initialized');
        }
        await adminAuth.verifyIdToken(idToken);
    } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Nur für authentifizierte User
    return NextResponse.json({
        key: process.env.DEEPGRAM_API_KEY ?? "",
    });
}
```

### Lösung B: Temporäre Tokens verwenden (BESTE PRAXIS)

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

export async function GET(request: Request) {
    // Auth check hier...

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

    // Temporären Token generieren (läuft nach 10 Sekunden ab)
    const { result, error } = await deepgram.manage.createProjectKey(
        process.env.DEEPGRAM_PROJECT_ID!,
        {
            comment: "Temporary token",
            scopes: ["usage:write"],
            time_to_live_in_seconds: 10,
        }
    );

    if (error) {
        return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    return NextResponse.json({
        key: result.key,
    });
}
```

**WICHTIG:** Nach dem Fix den alten Deepgram API-Key rotieren!

---

## 🟠 HOCH: Fix #2 - AI Chat Endpoints Authentifizierung

**Problem:** Anthropic und OpenAI Chat-Endpoints haben keine Authentifizierung.

### Fix für `src/app/api/anthropic/chat/route.ts`

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

export const runtime = "edge";

// Helper für Edge Runtime (adminAuth nicht verfügbar)
async function verifyToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Für Edge Runtime: Verwende Firebase REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Authentifizierung
  const authHeader = req.headers.get('Authorization');
  const isAuthenticated = await verifyToken(authHeader);

  if (!isAuthenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Input-Validierung
  const body = await req.json();
  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages format', { status: 400 });
  }

  // Nachrichten-Länge prüfen
  if (messages.length > 100) {
    return new Response('Too many messages', { status: 400 });
  }

  try {
    const result = await streamText({
      model: anthropic("claude-3-5-sonnet-20240620"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Anthropic API Error:', error);
    return new Response('AI service error', { status: 500 });
  }
}
```

### Gleicher Fix für `src/app/api/openai/chat/route.ts`

```typescript
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

// Gleiche verifyToken Funktion wie oben...
async function verifyToken(authHeader: string | null): Promise<boolean> {
  // ... siehe oben
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const isAuthenticated = await verifyToken(authHeader);

  if (!isAuthenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages format', { status: 400 });
  }

  try {
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return new Response('AI service error', { status: 500 });
  }
}
```

---

## 🟠 HOCH: Fix #3 - Replicate Image Generation Authentifizierung

**Datei:** `src/app/api/replicate/generate-image/route.ts`

```typescript
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Authentifizierungs-Helper
async function verifyUserToken(request: Request): Promise<string | null> {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return null;
    }

    const idToken = authorization.split('Bearer ')[1];
    try {
        if (!adminAuth) throw new Error('Admin SDK not initialized');
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}

export async function POST(request: Request) {
  // Authentifizierung
  const userId = await verifyUserToken(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'Service configuration error' },
      { status: 500 }
    );
  }

  let prompt: string;
  try {
    const body = await request.json();
    prompt = body.prompt;

    // Input-Validierung
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt format' },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt too long (max 1000 characters)' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: prompt,
          image_dimensions: "512x512",
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          scheduler: "DPMSolverMultistep",
        },
      }
    );

    // Log für Audit-Trail
    console.log({
      event: 'image_generated',
      userId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ output }, { status: 200 });
  } catch (error) {
    console.error("Replicate API Error:", error);
    return NextResponse.json(
      { error: 'Image generation failed' },
      { status: 500 }
    );
  }
}
```

---

## 🟠 HOCH: Fix #4 - Input-Validierung mit Zod

### 1. Zod installieren

```bash
npm install zod
```

### 2. Validation Schemas definieren

**Neue Datei:** `src/lib/validation.ts`

```typescript
import { z } from 'zod';

export const MessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(10000),
    })
  ).min(1).max(100),
});

export const ImagePromptSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

export const ApiKeySchema = z.object({
  apiKey: z.string().uuid(),
});

export const TacticusApiKeySchema = z.object({
  tacticusApiKey: z.string().min(36).max(36),
});
```

### 3. In Endpoints verwenden

```typescript
import { ImagePromptSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await request.json();

  // Validierung
  const validation = ImagePromptSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid input',
        details: validation.error.format()
      },
      { status: 400 }
    );
  }

  const { prompt } = validation.data;
  // ... rest of the code
}
```

---

## 🟠 HOCH: Fix #5 - Rate Limiting

### 1. Upstash Redis installieren

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Upstash Redis Setup

1. Gehe zu https://console.upstash.com/
2. Erstelle Redis-Datenbank
3. Kopiere `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`
4. Füge zu `.env.local` hinzu:

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Rate Limiting Helper

**Neue Datei:** `src/lib/ratelimit.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate Limiter für verschiedene Endpoints
export const aiChatRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests pro Minute
  analytics: true,
  prefix: "@ai-chat",
});

export const imageGenRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests pro Minute
  analytics: true,
  prefix: "@image-gen",
});

export const apiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 requests pro Minute
  analytics: true,
  prefix: "@api",
});

// Helper Funktion
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}
```

### 4. In Endpoints verwenden

```typescript
import { aiChatRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  // Auth check...
  const userId = "user-id-from-auth"; // Nach Authentifizierung

  // Rate Limiting
  const { success, limit, remaining, reset } = await aiChatRateLimit.limit(userId);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        limit,
        remaining,
        reset: new Date(reset).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // ... rest of the code
}
```

---

## 🟡 MITTEL: Fix #6 - Dependency Updates

```bash
# Sicherheitsupdates installieren
npm audit fix

# Major Updates (manuell prüfen)
npm install @ai-sdk/anthropic@latest
npm install @ai-sdk/openai@latest
npm install firebase@latest
npm install firebase-admin@latest

# Cross-spawn Schwachstelle
npm update cross-spawn

# Audit erneut prüfen
npm audit
```

---

## 🟡 MITTEL: Fix #7 - Firestore Security Rules

**Neue Datei:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper Funktionen
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User-Dokumente
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }

    // User Settings
    match /userSettings/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }

    // Notes
    match /notes/{noteId} {
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() &&
                               resource.data.userId == request.auth.uid;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Deployment:**

```bash
# Firebase CLI installieren (falls noch nicht vorhanden)
npm install -g firebase-tools

# Login
firebase login

# Initialisieren
firebase init firestore

# Deployen
firebase deploy --only firestore:rules
```

---

## 🟢 NIEDRIG: Fix #8 - Security Headers

**Datei:** `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security Headers hinzufügen
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Deployment-Checklist

Nach Implementierung der Fixes:

- [ ] Deepgram API-Key rotiert
- [ ] Alle Endpoints mit Authentifizierung getestet
- [ ] Rate Limiting getestet
- [ ] Input-Validierung getestet
- [ ] Dependencies aktualisiert (`npm audit` zeigt keine kritischen Schwachstellen)
- [ ] Firestore Security Rules deployed
- [ ] Security Headers aktiv (mit Browser DevTools prüfen)
- [ ] Error-Handling überprüft (keine Stack-Traces an Clients)
- [ ] Logging implementiert
- [ ] Monitoring aktiviert

---

## Testing

```bash
# Unit Tests für Authentifizierung
npm test -- --grep "authentication"

# Security Tests
npm run test:security

# Manual Testing
curl -X POST http://localhost:3000/api/anthropic/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": []}'
# Expected: 401 Unauthorized

curl -X POST http://localhost:3000/api/anthropic/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid-token" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
# Expected: 200 OK
```

---

## Weitere Empfehlungen

1. **CI/CD Security Checks:**
   - GitHub Dependabot aktivieren
   - Snyk oder Semgrep in CI/CD integrieren
   - Pre-commit hooks für Secret-Scanning

2. **Monitoring:**
   - Sentry für Error-Tracking
   - Datadog/New Relic für Performance
   - Cloud Logging für Security-Events

3. **Regelmäßige Reviews:**
   - Monatliche Dependency-Updates
   - Quartalsweise Security-Audits
   - Code-Reviews mit Security-Focus

---

**Bei Fragen oder Problemen:** Siehe vollständiges Security Audit in `SECURITY_AUDIT_REPORT.md`
