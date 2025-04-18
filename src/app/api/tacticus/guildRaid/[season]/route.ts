import { NextResponse } from 'next/server';
import { verifyUserAndGetApiKey } from '@/lib/apiHelpers'; // Import the helper

interface Params {
  season: string;
}

const TACTICUS_SERVER_URL = process.env.TACTICUS_SERVER_URL;
// Remove static API key usage
// const TACTICUS_API_KEY = process.env.TACTICUS_API_KEY;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const season = parseInt(params.season, 10);

  if (!TACTICUS_SERVER_URL) {
    console.error('TACTICUS_SERVER_URL is not defined in environment variables.');
    return NextResponse.json({ type: 'SERVER_CONFIG_ERROR' }, { status: 500 });
  }

  // 1. Validate season parameter
  if (isNaN(season)) {
    return NextResponse.json({ type: 'Invalid season parameter' }, { status: 400 });
  }

  // 2. Verify user and get their API key
  const authHeader = request.headers.get('Authorization');
  const apiKeyResult = await verifyUserAndGetApiKey(authHeader);

  if ('error' in apiKeyResult) {
    return NextResponse.json({ type: apiKeyResult.error }, { status: apiKeyResult.status });
  }
  // Successfully got the user-specific API key
  const { apiKey } = apiKeyResult;

  // Remove check for static API key
  // if (!TACTICUS_API_KEY) {
  //   console.error('TACTICUS_API_KEY is not defined in environment variables.');
  //   return NextResponse.json({ type: 'SERVER_CONFIG_ERROR' }, { status: 500 });
  // }
  
  try {
     // 3. Make the request using the user's API key
    const response = await fetch(`${TACTICUS_SERVER_URL}guildRaid/${season}`, {
      headers: {
        'X-API-KEY': apiKey, // Use the fetched user-specific key
        'Content-Type': 'application/json' // Good practice to include
      },
    });

    // --- Response Handling (mostly unchanged) ---
    if (!response.ok) {
        let errorType = 'UNKNOWN_ERROR';
        let errorDetails = {};
        try {
            errorDetails = await response.json();
            errorType = (errorDetails as any).type || errorType;
        } catch (e) { /* Ignore if response is not JSON */ }

        // Handle 404 and 403 specifically for guildRaid season endpoint
        if (response.status === 404) { errorType = 'NOT_FOUND'; }
        if (response.status === 403) { errorType = 'FORBIDDEN'; } // API key might be invalid/revoked
        
        console.error(`Tacticus API Error (${response.status}) for /guildRaid/${season}:`, errorDetails);
        return NextResponse.json({ type: errorType }, { status: response.status });
    }
    // --- End Response Handling ---

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Error fetching guild raid data for season ${season}:`, error);
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
       return NextResponse.json({ type: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }
    return NextResponse.json({ type: 'UNKNOWN_ERROR' }, { status: 500 });
  }
} 