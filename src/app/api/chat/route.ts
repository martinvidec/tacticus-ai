import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyUserAndGetClaudeConfig } from '@/lib/claudeHelpers';
import { checkRateLimit, chatRateLimit, getRateLimitHeaders } from '@/lib/ratelimit';
import { ChatRequestSchema, validateParams } from '@/lib/validation';

// System prompt for the Cogitator
const SYSTEM_PROMPT = `Du bist der Cogitator, ein taktischer Beratungs-Maschinengeist für Warhammer 40,000: Tacticus.

Deine Aufgaben:
- Roster-Analyse und Upgrade-Prioritäten empfehlen
- Raid-Team-Zusammenstellung optimieren
- Ressourcen-Optimierung vorschlagen
- Kampagnen-Strategien entwickeln

Stil:
- Präzise und actionable Empfehlungen
- Gelegentlich WH40K-Terminologie verwenden ("Maschinengeist", "Operative", "Imperiale Garde", etc.)
- Konkrete nächste Schritte nennen
- Bei Datenanalyse auf die bereitgestellten Statistiken verweisen

Wichtig:
- Du hast Zugriff auf die aktuellen Spielerdaten im Kontext
- Beantworte Fragen basierend auf den tatsächlichen Daten
- Wenn keine Daten verfügbar sind, weise darauf hin

Antworte auf Deutsch, es sei denn, der Benutzer schreibt auf Englisch.`;

export async function POST(request: NextRequest) {
  // Verify user and get Claude config
  const authResult = await verifyUserAndGetClaudeConfig(
    request.headers.get('Authorization')
  );

  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { uid, claudeApiKey, claudeModel } = authResult;

  // Check rate limit
  const rateLimitResult = await checkRateLimit(uid, chatRateLimit);
  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait before sending more messages.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validation = validateParams(ChatRequestSchema, body);
  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages } = validation.data;

  // Get stats context if provided
  const statsContext = body.statsContext as string | undefined;

  // Build system prompt with stats context
  let fullSystemPrompt = SYSTEM_PROMPT;
  if (statsContext) {
    fullSystemPrompt += `\n\n=== AKTUELLE SPIELERDATEN ===\n${statsContext}`;
  }

  // Initialize Anthropic client with user's API key
  const anthropic = new Anthropic({
    apiKey: claudeApiKey,
  });

  try {
    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: claudeModel,
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    // Convert to ReadableStream for Next.js Response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                // Send as SSE format
                const data = JSON.stringify({ text: delta.text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } else if (event.type === 'message_stop') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({ error: 'Stream interrupted' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error('Claude API error:', error);

    let errorMessage = 'Failed to get response from Claude';
    let status = 500;

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        errorMessage = 'Invalid Claude API key. Please check your key in Settings.';
        status = 401;
      } else if (error.status === 429) {
        errorMessage = 'Claude API rate limit exceeded. Please try again later.';
        status = 429;
      } else if (error.status === 400) {
        errorMessage = 'Invalid request to Claude API.';
        status = 400;
      } else {
        errorMessage = error.message || errorMessage;
        status = error.status || 500;
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
