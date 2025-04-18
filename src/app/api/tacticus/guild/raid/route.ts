import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';

const TACTICUS_SERVER_URL = process.env.TACTICUS_SERVER_URL;

// --- Helper function to verify token and get UID --- 
async function verifyUserToken(request: Request): Promise<DecodedIdToken | null> {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        try {
            // Ensure adminAuth is initialized (check firebaseAdmin.ts)
            if (!adminAuth) {
                console.error('Admin Auth SDK not initialized in verifyUserToken.');
                return null; 
            }
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            return decodedToken;
        } catch (error) {
            console.error('Error verifying token:', error);
            return null;
        }
    } 
    console.log('No valid Authorization header found.');
    return null;
}

// --- Helper function to get user's API key from Firestore ---
async function getUserApiKey(uid: string): Promise<string | null> {
     if (!adminDb) {
        console.error('Admin DB not initialized in getUserApiKey.');
        return null;
    }
    try {
        const settingsDocRef = adminDb.collection('userSettings').doc(uid);
        const settingsDoc = await settingsDocRef.get();
        if (!settingsDoc.exists) {
            console.log(`User settings document not found for UID: ${uid}`);
            return null;
        } 
        const apiKey = settingsDoc.data()?.tacticusApiKey;
        if (!apiKey) {
             console.log(`tacticusApiKey not found in settings for UID: ${uid}`);
             return null;
        }
        return apiKey;
    } catch (error) {
        console.error(`Error fetching API key for user ${uid}:`, error);
        return null;
    }
}

export async function GET(request: Request) {
  // --- 1. Verify User and Get API Key --- 
  const decodedToken = await verifyUserToken(request);
  if (!decodedToken) {
      console.log('Guild Raid Route: User token verification failed.');
      return NextResponse.json({ type: 'UNAUTHORIZED' }, { status: 401 });
  }
  
  const userApiKey = await getUserApiKey(decodedToken.uid);
  if (!userApiKey) {
       console.log(`Guild Raid Route: API Key not found for user ${decodedToken.uid}.`);
      return NextResponse.json({ type: 'API_KEY_NOT_SET' }, { status: 403 });
  }
  
  // --- 2. Check for Tacticus Server URL --- 
  if (!TACTICUS_SERVER_URL) {
    console.error('TACTICUS_SERVER_URL is not defined');
    // This should NOT be the error if other routes work, but keep check.
    return NextResponse.json({ type: 'SERVER_CONFIG_ERROR', detail: 'TACTICUS_SERVER_URL missing' }, { status: 500 });
  }
  
  const targetUrl = `${TACTICUS_SERVER_URL}guild/raid`;
  const headers = { 'X-API-KEY': userApiKey };

  // --- 3. Make Request to Tacticus API --- 
  try {
    console.log(`Guild Raid Route: Fetching data for user ${decodedToken.uid} from ${targetUrl} using their key.`);
    const response = await fetch(targetUrl, {
      headers: headers,
      // cache: 'no-store', // Uncomment if caching issues are suspected
    });

    // --- 4. Handle Tacticus API Response --- 
    if (!response.ok) {
      let errorType = 'TACTICUS_API_ERROR';
      let errorDetail = `Tacticus API responded with status ${response.status}`; 
      let errorData = null;
      try { 
          const textResponse = await response.text(); // Read response body as text first
          errorDetail += ` Body: ${textResponse}`; // Log the raw body
          if (response.status !== 404) {
              try {
                  errorData = JSON.parse(textResponse); // Try parsing as JSON
                  errorType = errorData?.type || errorType;
              } catch (parseError) {
                   console.warn('Could not parse Tacticus API error response as JSON.');
              }
          } else {
             errorType = 'NOT_FOUND'; // Specifically handle 404
          }
      } catch (e) { 
          console.error('Error reading/parsing error response from Tacticus API:', e);
          errorDetail = `Failed to read error response body. Status: ${response.status}`;
      }
       console.error(`Guild Raid Route Error: ${errorDetail}`);
      return NextResponse.json({ type: errorType, detail: errorDetail, rawErrorData: errorData }, { status: response.status });
    }

    const data = await response.json();
    console.log(`Guild Raid Route: Successfully fetched data for user ${decodedToken.uid}.`);
    return NextResponse.json(data);

  } catch (error: any) {
    // Log the specific fetch error
    console.error('Guild Raid Route: FETCH FAILED. URL: ${targetUrl}, User: ${decodedToken.uid}, Error:', error);
    let errorType = 'INTERNAL_SERVER_ERROR';
    let status = 500;
    if (error.cause?.code === 'ECONNREFUSED') { // More robust check for connection refused
       errorType = 'TACTICUS_API_UNAVAILABLE';
       status = 503;
    } else if (error instanceof TypeError && error.message === 'fetch failed') { 
       // Often indicates DNS or network issue
       errorType = 'NETWORK_ERROR';
       status = 504; // Gateway Timeout might be appropriate
    }
    // Return the detailed error message
    return NextResponse.json({ type: errorType, detail: error.message, cause: error.cause }, { status });
  }
} 