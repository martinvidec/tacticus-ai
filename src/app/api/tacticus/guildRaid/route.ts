import { NextResponse } from 'next/server';

const TACTICUS_SERVER_URL = process.env.TACTICUS_SERVER_URL;
const TACTICUS_API_KEY = process.env.TACTICUS_API_KEY;

export async function GET(request: Request) {
  // const apiKey = request.headers.get('X-API-KEY'); // No longer reading from request header

  if (!TACTICUS_SERVER_URL) {
    console.error('TACTICUS_SERVER_URL is not defined in environment variables.');
    return NextResponse.json({ type: 'SERVER_CONFIG_ERROR' }, { status: 500 });
  }

  if (!TACTICUS_API_KEY) {
    console.error('TACTICUS_API_KEY is not defined in environment variables.');
    return NextResponse.json({ type: 'SERVER_CONFIG_ERROR' }, { status: 500 });
  }

  // No longer checking for apiKey from request
  // if (!apiKey) {
  //   return NextResponse.json({ type: 'Missing X-API-KEY header' }, { status: 403 });
  // }

  try {
    const response = await fetch(`${TACTICUS_SERVER_URL}guildRaid`, {
      headers: {
        'X-API-KEY': TACTICUS_API_KEY, // Use server-side key
      },
    });

    if (!response.ok) {
      let errorType = 'UNKNOWN_ERROR';
      // Handle 404 and 403 specifically for guildRaid endpoint as per OpenAPI spec
      if (response.status === 404) {
          errorType = 'NOT_FOUND';
      } else if (response.status === 403) {
          errorType = 'FORBIDDEN';
      } else {
        try {
            const errorData = await response.json();
            errorType = errorData.type || errorType;
        } catch (e) {
            // Ignore if response is not JSON
        }
      }
      return NextResponse.json({ type: errorType }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching current guild raid data:', error);
     if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
       return NextResponse.json({ type: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }
    return NextResponse.json({ type: 'UNKNOWN_ERROR' }, { status: 500 });
  }
} 