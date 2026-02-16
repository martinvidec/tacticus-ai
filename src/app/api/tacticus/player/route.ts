import { NextResponse } from 'next/server';
import { verifyUserAndGetApiKey } from '@/lib/apiHelpers';
import { checkRateLimit, getRateLimitHeaders, standardRateLimit } from '@/lib/ratelimit';

const TACTICUS_SERVER_URL = process.env.TACTICUS_SERVER_URL;

export async function GET(request: Request) {

  if (!TACTICUS_SERVER_URL) {
    console.error('TACTICUS_SERVER_URL is not defined in environment variables.');
    return NextResponse.json({ type: 'SERVER_CONFIG_ERROR' }, { status: 500 });
  }

  // 1. Verify user and get their API key
  const authHeader = request.headers.get('Authorization');
  const apiKeyResult = await verifyUserAndGetApiKey(authHeader);

  if ('error' in apiKeyResult) {
    return NextResponse.json({ type: apiKeyResult.error }, { status: apiKeyResult.status });
  }
  // Successfully got the user-specific API key
  const { uid, apiKey } = apiKeyResult;

  // 2. Check rate limit
  const rateLimitResult = await checkRateLimit(uid, standardRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { type: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  // Remove check for static API key
  // if (!TACTICUS_API_KEY) {
  //   console.error('TACTICUS_API_KEY is not defined in environment variables.');
  //   return NextResponse.json({ type: 'SERVER_CONFIG_ERROR' }, { status: 500 });
  // }

  try {
    // 2. Make the request using the user's API key
    const response = await fetch(`${TACTICUS_SERVER_URL}player`, {
      headers: {
        'X-API-KEY': apiKey, // Use the fetched user-specific key
        'Content-Type': 'application/json' // Good practice to include
      },
    });

    if (!response.ok) {
       let errorType = 'UNKNOWN_ERROR';
       let errorDetails = {};
      try {
        errorDetails = await response.json();
        errorType = (errorDetails as any).type || errorType;
      } catch (e) { /* Ignore if response is not JSON */ }

      // Tacticus API uses 403 for Forbidden/Invalid Key
      if (response.status === 403) { errorType = 'FORBIDDEN'; }
      
      console.error(`Tacticus API Error (${response.status}) for /player:`, errorDetails);
      return NextResponse.json({ type: errorType }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching player data:', error);
    // Handle potential fetch errors (e.g., network issues)
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
       return NextResponse.json({ type: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }
    return NextResponse.json({ type: 'UNKNOWN_ERROR' }, { status: 500 });
  }
} 