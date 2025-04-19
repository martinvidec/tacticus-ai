import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';

const TACTICUS_SERVER_URL = process.env.TACTICUS_SERVER_URL;

// Helper: Verify Firebase ID Token
async function verifyUserToken(authHeader: string | null): Promise<DecodedIdToken | null | { error: string, status: number }> {
    if (!adminAuth) {
        console.error('Firebase Admin Auth is not initialized!');
        return { error: 'Server Authentication Error', status: 500 };
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return null;
    }
}

// Helper: Get API Key from Firestore
async function getUserApiKey(uid: string): Promise<string | null | { error: string, status: number }> {
    if (!adminDb) {
        console.error('Firebase Admin DB is not initialized!');
        return { error: 'Server Database Error', status: 500 };
    }
    try {
        const userDocRef = adminDb.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            console.warn(`User document not found for UID: ${uid}`);
            return null;
        }
        const apiKey = userDoc.data()?.tacticusApiKey;
        return apiKey || null;
    } catch (error) {
        console.error('Error retrieving API key from Firestore:', error);
        // Return null here, let the main handler decide the response status
        return null; 
    }
}

export async function GET(
    request: Request,
    { params }: { params: { season: string } }
) {
    const season = params.season;
    console.log(`[API Route] Received GET request for guildRaid season: ${season}`);

    if (!TACTICUS_SERVER_URL) {
        console.error('[API Route] TACTICUS_SERVER_URL is not configured.');
        return NextResponse.json({ type: 'SERVER_CONFIG_ERROR', message: 'Server URL not configured.' }, { status: 500 });
    }

    // 1. Verify User
    const verificationResult = await verifyUserToken(request.headers.get('Authorization'));
    if (verificationResult === null) {
        console.log('[API Route] User token verification failed (null result).');
        return NextResponse.json({ type: 'UNAUTHORIZED', message: 'Invalid or missing user token.' }, { status: 401 });
    } 
    if (typeof verificationResult === 'object' && 'error' in verificationResult) {
         console.log('[API Route] User token verification failed (server error).');
        return NextResponse.json({ type: 'SERVER_AUTH_ERROR', message: verificationResult.error }, { status: verificationResult.status });
    }
    const decodedToken = verificationResult;
    const uid = decodedToken.uid;
    console.log(`[API Route] User ${uid} verified.`);

    // 2. Get User's API Key
    const apiKeyResult = await getUserApiKey(uid);
     if (typeof apiKeyResult === 'object' && apiKeyResult !== null && 'error' in apiKeyResult) {
         console.log('[API Route] API Key retrieval failed (server error).');
         return NextResponse.json({ type: 'SERVER_DB_ERROR', message: apiKeyResult.error }, { status: apiKeyResult.status });
    }
    const apiKey = apiKeyResult;
    if (!apiKey) {
        console.log(`[API Route] API Key not found for user ${uid}.`);
        return NextResponse.json({ type: 'FORBIDDEN', message: 'Tacticus API Key not configured for this user.' }, { status: 403 });
    }
    console.log(`[API Route] Retrieved API Key for user ${uid}.`);

    // 3. Fetch from Tacticus API
    const targetUrl = `${TACTICUS_SERVER_URL}guildRaid/${season}`;
    console.log(`[API Route] Fetching data from Tacticus API: ${targetUrl}`);
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'X-API-KEY': apiKey,
                'Accept': 'application/json',
            },
        });

        console.log(`[API Route] Tacticus API response status: ${response.status}`);

        // --- Log the raw response body --- 
        const responseBodyText = await response.text();
        console.log("[API Route] Raw Tacticus API Response Body:", responseBodyText);
        // --- End Log --- 

        let data;
        try {
            data = JSON.parse(responseBodyText);
        } catch (parseError) {
            console.error('[API Route] Error parsing Tacticus API response:', parseError);
            return NextResponse.json({ type: 'API_PARSE_ERROR', message: 'Failed to parse response from Tacticus API.' }, { status: 502 }); // 502 Bad Gateway
        }
        
        if (!response.ok) {
            console.warn('[API Route] Tacticus API returned error:', data);
            // Forward the status code and error type if possible
            const status = response.status;
            const errorType = data?.type || 'TACTICUS_API_ERROR';
            const message = data?.message || 'Error fetching data from Tacticus API.';
            return NextResponse.json({ type: errorType, message: message }, { status });
        }

        // Return the parsed data
        return NextResponse.json(data);

    } catch (error) {
        console.error('[API Route] Error fetching from Tacticus API:', error);
        return NextResponse.json({ type: 'NETWORK_ERROR', message: 'Failed to connect to Tacticus API.' }, { status: 504 }); // 504 Gateway Timeout
    }
} 