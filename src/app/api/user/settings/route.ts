import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/firebaseAdmin'; // Import admin SDK
import { DecodedIdToken } from 'firebase-admin/auth';

// Helper function to verify token and get UID
async function verifyUserToken(request: Request): Promise<DecodedIdToken | null> {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        try {
            if (!adminAuth) throw new Error('Admin SDK not initialized');
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            return decodedToken;
        } catch (error) {
            console.error('Error verifying token:', error);
            return null;
        }
    } 
    return null;
}

// GET handler to fetch user settings (including API key)
export async function GET(request: Request) {
    const decodedToken = await verifyUserToken(request);

    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    
    try {
        if (!adminDb) throw new Error('Admin DB not initialized');
        const settingsDoc = await adminDb.collection('userSettings').doc(uid).get();
        
        if (!settingsDoc.exists) {
            return NextResponse.json({ tacticusApiKey: '' }, { status: 200 }); // Return empty if not set
        }
        
        const settingsData = settingsDoc.data();
        return NextResponse.json({ tacticusApiKey: settingsData?.tacticusApiKey || '' });

    } catch (error) {
        console.error('Error fetching user settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// POST handler to save/update user settings (API key)
export async function POST(request: Request) {
    const decodedToken = await verifyUserToken(request);

    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    let apiKey;
    try {
        const body = await request.json();
        apiKey = body.tacticusApiKey;
        if (typeof apiKey !== 'string') {
             throw new Error ('Invalid API key format');
        }
    } catch (e) {
         return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    try {
        if (!adminDb) throw new Error('Admin DB not initialized');
        await adminDb.collection('userSettings').doc(uid).set({ 
            tacticusApiKey: apiKey 
        }, { merge: true }); // Use merge: true to only update this field
        
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error saving user settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
} 