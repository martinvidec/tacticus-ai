import { adminAuth, adminDb } from './firebase/firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verifies the Firebase ID token from the Authorization header and fetches the user's Tacticus API key.
 * 
 * @param authorizationHeader The 'Authorization' header value (e.g., "Bearer <token>").
 * @returns Promise<{ uid: string; apiKey: string } | { error: string; status: number }>
 */
export async function verifyUserAndGetApiKey(
    authorizationHeader: string | null | undefined
): Promise<{ uid: string; apiKey: string } | { error: string; status: number }> {
    
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return { error: 'Unauthorized: Missing or invalid Authorization header.', status: 401 };
    }

    const idToken = authorizationHeader.split('Bearer ')[1];
    if (!idToken) {
        return { error: 'Unauthorized: Invalid token format.', status: 401 };
    }

    let decodedToken: DecodedIdToken;
    try {
        if (!adminAuth) {
            throw new Error("Admin Auth not initialized.");
        }
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return { error: 'Unauthorized: Invalid or expired token.', status: 401 };
    }

    const uid = decodedToken.uid;
    if (!uid) {
        return { error: 'Unauthorized: Could not identify user from token.', status: 401 };
    }

    // Fetch API key from Firestore
    try {
        if (!adminDb) {
             throw new Error("Admin DB not initialized.");
        }
        const userDocRef = adminDb.collection('users').doc(uid);
        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            const apiKey = data?.tacticusApiKey;

            if (apiKey && typeof apiKey === 'string') {
                return { uid, apiKey }; // Success!
            } else {
                console.log(`User ${uid} found but missing tacticusApiKey.`);
                return { error: 'Forbidden: API Key not configured for this user.', status: 403 };
            }
        } else {
            console.log(`User document not found for UID: ${uid}`);
            return { error: 'Forbidden: User profile not found.', status: 403 };
        }
    } catch (error) {
        console.error(`Error fetching API key for user ${uid}:`, error);
        return { error: 'Internal Server Error: Could not retrieve API key.', status: 500 };
    }
} 