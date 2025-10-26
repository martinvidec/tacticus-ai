# Security Audit Report - Tacticus AI Dashboard
**Datum:** 26. Oktober 2025
**Auditor:** Claude Code Security Analysis
**Version:** 1.0

---

## Executive Summary

Dieses Security Audit identifiziert mehrere **kritische und hohe Sicherheitsrisiken** in der Tacticus AI Dashboard-Anwendung, die sofortige Aufmerksamkeit erfordern. Die Anwendung ist eine Next.js 14 Full-Stack-Web-Applikation mit Firebase-Authentifizierung und mehreren externen API-Integrationen (Anthropic Claude, OpenAI, Deepgram, Replicate, Tacticus Game API).

**Kritische Bewertung:**
- 🔴 **1 kritische Schwachstelle** (API-Key-Exposure)
- 🟠 **4 hohe Schwachstellen** (Fehlende Authentifizierung, Rate Limiting)
- 🟡 **3 mittlere Schwachstellen** (Dependency-Schwachstellen, Input-Validierung)
- 🟢 **2 niedrige Schwachstellen** (Sicherheitsheader, Logging)

---

## 🔴 Kritische Schwachstellen

### 1. API-Key-Exposure über öffentlichen Endpoint
**Severity:** KRITISCH
**CVSS Score:** 9.1 (Critical)
**Datei:** `src/app/api/deepgram/route.ts`

#### Beschreibung
Der Deepgram API-Key wird über einen **unauthentifizierten GET-Endpoint** direkt an Clients exponiert:

```typescript
export async function GET() {
    return NextResponse.json({
      key: process.env.DEEPGRAM_API_KEY ?? "",
    });
}
```

#### Risiko
- Jeder kann den Deepgram API-Key abrufen ohne Authentifizierung
- API-Key-Missbrauch durch Dritte möglich
- Potenzielle Kosten durch unbefugte Nutzung
- Verletzung des "Principle of Least Privilege"

#### Empfohlene Maßnahmen
1. **SOFORT**: Deepgram API-Key rotieren
2. Endpoint mit Firebase-Authentifizierung absichern
3. Alternative: Client-seitige Deepgram SDK mit kurzlebigen Tokens verwenden
4. Rate Limiting implementieren

#### Beispiel-Fix
```typescript
import { verifyUserAndGetApiKey } from '@/lib/apiHelpers';

export async function GET(request: Request) {
    // Authentifizierung erforderlich
    const authHeader = request.headers.get('Authorization');
    const apiKeyResult = await verifyUserAndGetApiKey(authHeader);

    if ('error' in apiKeyResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      key: process.env.DEEPGRAM_API_KEY ?? "",
    });
}
```

---

## 🟠 Hohe Schwachstellen

### 2. Fehlende Authentifizierung für AI-Chat-Endpoints
**Severity:** HOCH
**CVSS Score:** 7.5 (High)
**Dateien:**
- `src/app/api/anthropic/chat/route.ts`
- `src/app/api/openai/chat/route.ts`

#### Beschreibung
Die AI-Chat-Endpoints haben **keine Authentifizierung oder Autorisierung**:

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: anthropic("claude-3-5-sonnet-20240620"),
    messages: convertToCoreMessages(messages),
    system: "You are a helpful AI assistant",
  });
  return result.toDataStreamResponse();
}
```

#### Risiko
- Unbefugte Nutzung der AI-APIs durch Dritte
- Hohe API-Kosten durch Missbrauch
- Potential für Prompt-Injection-Angriffe
- Keine Kontrolle über Nutzung und Budgets

#### Empfohlene Maßnahmen
1. Firebase-Authentifizierung implementieren
2. Rate Limiting pro User einführen
3. Input-Validierung für Messages
4. Logging und Monitoring für API-Nutzung
5. Kosten-Limits pro User setzen

#### Beispiel-Fix
```typescript
import { verifyUserAndGetApiKey } from '@/lib/apiHelpers';
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  // Authentifizierung
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();

  // Input-Validierung
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages format', { status: 400 });
  }

  const result = await streamText({
    model: anthropic("claude-3-5-sonnet-20240620"),
    messages: convertToCoreMessages(messages),
    system: "You are a helpful AI assistant",
  });

  return result.toDataStreamResponse();
}
```

---

### 3. Fehlende Authentifizierung für Replicate Image Generation
**Severity:** HOCH
**CVSS Score:** 7.3 (High)
**Datei:** `src/app/api/replicate/generate-image/route.ts`

#### Beschreibung
Der Image-Generation-Endpoint hat keine Authentifizierung:

```typescript
export async function POST(request: Request) {
  const { prompt } = await request.json();
  const output = await replicate.run(
    "stability-ai/stable-diffusion:...",
    { input: { prompt: prompt, ... } }
  );
  return NextResponse.json({ output }, { status: 200 });
}
```

#### Risiko
- Unbefugte Bildgenerierung durch Dritte
- Hohe Replicate-API-Kosten
- Potenzial für Missbrauch (z.B. illegale/schädliche Inhalte)
- Keine Content-Moderation

#### Empfohlene Maßnahmen
1. Authentifizierung implementieren
2. Input-Validierung für Prompts
3. Content-Moderation/Filtering
4. Rate Limiting
5. Prompt-Logging für Compliance

---

### 4. Fehlende Input-Validierung in mehreren Endpoints
**Severity:** HOCH
**CVSS Score:** 7.0 (High)
**Dateien:** Mehrere API-Routes

#### Beschreibung
Viele API-Endpoints validieren Benutzer-Input nicht ausreichend:

```typescript
// Beispiel aus replicate/generate-image/route.ts
const { prompt } = await request.json(); // Keine Validierung!
```

#### Risiko
- Injection-Angriffe möglich
- Ungültige Daten können Backend-Fehler verursachen
- Potenzial für DoS durch große Payloads
- Unerwartetes Verhalten

#### Empfohlene Maßnahmen
1. Zod oder ähnliche Schema-Validierungsbibliothek einsetzen
2. Maximale Längen für alle Text-Inputs definieren
3. Typen und Formate validieren
4. Whitelisting statt Blacklisting

#### Beispiel-Fix
```typescript
import { z } from 'zod';

const ImagePromptSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  const body = await request.json();

  // Validierung
  const validation = ImagePromptSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error },
      { status: 400 }
    );
  }

  const { prompt } = validation.data;
  // ... rest of the code
}
```

---

### 5. Fehlende Rate Limiting
**Severity:** HOCH
**CVSS Score:** 6.8 (Medium-High)
**Dateien:** Alle API-Endpoints

#### Beschreibung
Es gibt **kein Rate Limiting** auf den API-Endpoints implementiert.

#### Risiko
- Denial of Service (DoS) Angriffe möglich
- API-Kosten-Explosion durch Missbrauch
- Server-Überlastung
- Keine Kontrolle über Ressourcennutzung

#### Empfohlene Maßnahmen
1. Rate Limiting Middleware implementieren (z.B. `@upstash/ratelimit`)
2. Pro-User und Pro-IP Limits setzen
3. Unterschiedliche Limits für verschiedene Endpoints
4. Redis für verteiltes Rate Limiting

#### Beispiel-Implementation
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // ... rest of the handler
}
```

---

## 🟡 Mittlere Schwachstellen

### 6. Dependency-Schwachstellen
**Severity:** MITTEL
**CVSS Score:** 5.3 (Medium)

#### Beschreibung
NPM Audit zeigt mehrere Schwachstellen:

- **@ai-sdk/anthropic:** Moderate Schwachstelle (via @ai-sdk/provider-utils)
- **@ai-sdk/openai:** Moderate Schwachstelle (via @ai-sdk/provider-utils)
- **@ai-sdk/provider-utils:** Moderate Schwachstelle (via nanoid)
- **Firebase:** Mehrere moderate Schwachstellen
- **cross-spawn:** HIGH Schwachstelle

#### Risiko
- Potenzielle Sicherheitslücken in Dependencies
- Ausnutzbare Schwachstellen je nach Version

#### Empfohlene Maßnahmen
```bash
# Dependencies aktualisieren
npm audit fix

# Major updates prüfen
npm outdated

# Spezifische Updates
npm install @ai-sdk/anthropic@latest @ai-sdk/openai@latest
npm install firebase@latest firebase-admin@latest
```

---

### 7. Unzureichende Firestore Security Rules
**Severity:** MITTEL
**CVSS Score:** 5.5 (Medium)

#### Beschreibung
Es wurden keine Firestore Security Rules in der Codebase gefunden.

#### Risiko
- Potenzielle direkte Firestore-Zugriffe durch Clients
- Daten-Leaks möglich
- Unberechtigte Datenänderungen

#### Empfohlene Maßnahmen
Firestore Security Rules definieren:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-Daten nur für authentifizierte User zugänglich
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /userSettings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Notes nur für Owner
    match /notes/{noteId} {
      allow read, write: if request.auth != null &&
                            resource.data.userId == request.auth.uid;
    }
  }
}
```

---

### 8. Unvollständige Error-Handling und Information Disclosure
**Severity:** MITTEL
**CVSS Score:** 4.3 (Medium)

#### Beschreibung
Einige Error-Messages geben zu viel Information preis:

```typescript
// src/app/api/replicate/generate-image/route.ts:35
return NextResponse.json({ error: (error as Error).message }, { status: 500 });
```

#### Risiko
- Stack-Traces könnten an Clients gesendet werden
- Interne Implementierungsdetails könnten offengelegt werden
- Hilft Angreifern bei Reconnaissance

#### Empfohlene Maßnahmen
1. Generische Fehlermeldungen für Clients
2. Detaillierte Fehler nur server-seitig loggen
3. Error-Tracking-Service (z.B. Sentry) implementieren

```typescript
try {
  // ... code
} catch (error) {
  console.error('Replicate API Error:', error);
  // Log to error tracking service

  return NextResponse.json(
    { error: 'Image generation failed' },
    { status: 500 }
  );
}
```

---

## 🟢 Niedrige Schwachstellen & Empfehlungen

### 9. Fehlende Security Headers
**Severity:** NIEDRIG
**CVSS Score:** 3.7 (Low)

#### Beschreibung
Keine Custom Security Headers in Next.js Config.

#### Empfohlene Maßnahmen
Security Headers in `next.config.mjs` hinzufügen:

```javascript
const nextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

---

### 10. Unzureichendes Logging und Monitoring
**Severity:** NIEDRIG
**CVSS Score:** 3.1 (Low)

#### Beschreibung
Kein strukturiertes Security-Logging implementiert.

#### Empfohlene Maßnahmen
1. Security-Events loggen (Failed auth, API key changes, etc.)
2. Monitoring-Service integrieren
3. Alerting für anomale Aktivitäten

```typescript
// Logging helper
function logSecurityEvent(event: string, userId?: string, metadata?: any) {
  console.log({
    timestamp: new Date().toISOString(),
    event,
    userId,
    metadata,
    type: 'security'
  });
}

// Usage
logSecurityEvent('api_key_changed', userId, { action: 'update' });
```

---

## ✅ Positive Findings (Was gut gemacht wurde)

1. ✅ **Keine hardcodierten Secrets** - Alle API-Keys und Credentials in Umgebungsvariablen
2. ✅ **Firebase-Authentifizierung** - Korrekt implementiert für User-Management
3. ✅ **API-Key-Maskierung** - User API-Keys werden maskiert (`src/lib/actions.ts:8-13`)
4. ✅ **.env Dateien in .gitignore** - Verhindert versehentliches Commit von Secrets
5. ✅ **TypeScript** - Type-Safety reduziert Bug-Potenzial
6. ✅ **Authentifizierte Tacticus API-Endpoints** - Korrekte Verwendung von `verifyUserAndGetApiKey`
7. ✅ **SVG CSP in next.config.mjs** - Content Security Policy für SVGs definiert

---

## Priorisierte Handlungsempfehlungen

### Sofortige Maßnahmen (Innerhalb 24h)
1. 🔴 **Deepgram API-Key rotieren und Endpoint absichern** (KRITISCH)
2. 🟠 **Authentifizierung für AI-Chat-Endpoints hinzufügen**
3. 🟠 **Authentifizierung für Replicate-Endpoint hinzufügen**

### Kurzfristig (Innerhalb 1 Woche)
4. 🟠 **Rate Limiting implementieren (alle Endpoints)**
5. 🟠 **Input-Validierung mit Zod einführen**
6. 🟡 **Dependencies aktualisieren (npm audit fix)**
7. 🟡 **Firestore Security Rules definieren und deployen**

### Mittelfristig (Innerhalb 1 Monat)
8. 🟡 **Error-Handling standardisieren**
9. 🟢 **Security Headers hinzufügen**
10. 🟢 **Security-Logging und Monitoring implementieren**
11. 🟢 **Security-Tests und CI/CD-Integration**

---

## Compliance und Best Practices

### OWASP Top 10 (2021) Mapping
- **A01: Broken Access Control** → Findings #2, #3, #7
- **A02: Cryptographic Failures** → Finding #1
- **A03: Injection** → Finding #4
- **A05: Security Misconfiguration** → Findings #6, #9
- **A07: Identification and Authentication Failures** → Findings #2, #3
- **A09: Security Logging and Monitoring Failures** → Finding #10

### CWE Mapping
- **CWE-200: Exposure of Sensitive Information** → Finding #1
- **CWE-287: Improper Authentication** → Findings #2, #3
- **CWE-306: Missing Authentication for Critical Function** → Finding #1
- **CWE-20: Improper Input Validation** → Finding #4
- **CWE-770: Allocation of Resources Without Limits** → Finding #5

---

## Test-Empfehlungen

### Security Testing
1. **Penetration Testing** für kritische Endpoints
2. **Automated Security Scanning** (z.B. OWASP ZAP, Burp Suite)
3. **Dependency Scanning** in CI/CD (z.B. Snyk, Dependabot)
4. **SAST** (Static Application Security Testing)
5. **Secret Scanning** (z.B. GitGuardian, TruffleHog)

### Test-Cases
```typescript
// Beispiel: Test für fehlende Authentifizierung
describe('API Security Tests', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await fetch('/api/anthropic/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] })
    });
    expect(res.status).toBe(401);
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(100).fill(0).map(() =>
      fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify({ messages: [] })
      })
    );
    const results = await Promise.all(requests);
    const tooManyRequests = results.filter(r => r.status === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

---

## Zusammenfassung und Risk Score

**Overall Security Score:** 🔴 **4.2/10** (KRITISCH)

**Gesamtrisiko:** **HOCH** - Die Anwendung hat kritische Sicherheitslücken, die sofortige Aufmerksamkeit erfordern.

**Empfohlene Maßnahmen-Reihenfolge:**
1. API-Key-Exposure beheben (KRITISCH)
2. Authentifizierung für alle Endpoints
3. Rate Limiting
4. Input-Validierung
5. Dependency-Updates
6. Monitoring & Logging

**Geschätzter Aufwand für Fixes:**
- Kritische Fixes: 4-8 Stunden
- Hohe Fixes: 16-24 Stunden
- Mittlere Fixes: 8-16 Stunden
- Niedrige Fixes: 4-8 Stunden

**Gesamtaufwand:** ~32-56 Stunden Entwicklungszeit

---

## Kontakt und Nächste Schritte

Dieses Audit sollte als Grundlage für einen Security-Verbesserungsplan dienen. Es wird empfohlen:

1. Priorisierte Tickets für alle Findings erstellen
2. Security-Review-Prozess für Code-Changes etablieren
3. Regelmäßige Security-Audits durchführen (quartalsweise)
4. Security-Training für Entwicklungsteam

---

**Ende des Security Audit Reports**
