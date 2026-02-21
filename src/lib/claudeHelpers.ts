import { adminAuth, adminDb } from './firebase/firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface ClaudeUserConfig {
  uid: string;
  claudeApiKey: string;
  claudeModel: string;
}

/**
 * Verifies the Firebase ID token and fetches the user's Claude API key and model preference.
 *
 * @param authorizationHeader The 'Authorization' header value (e.g., "Bearer <token>").
 * @returns Promise<ClaudeUserConfig | { error: string; status: number }>
 */
export async function verifyUserAndGetClaudeConfig(
    authorizationHeader: string | null | undefined
): Promise<ClaudeUserConfig | { error: string; status: number }> {

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

    // Fetch Claude API key from Firestore
    try {
        if (!adminDb) {
            throw new Error("Admin DB not initialized.");
        }
        const userDocRef = adminDb.collection('users').doc(uid);
        const docSnap = await userDocRef.get();

        if (!docSnap.exists) {
            return { error: 'Forbidden: User profile not found.', status: 403 };
        }

        const data = docSnap.data();
        const claudeApiKey = data?.claudeApiKey;
        const claudeModel = data?.claudeModel || 'claude-sonnet-4-20250514';

        if (!claudeApiKey || typeof claudeApiKey !== 'string' || !claudeApiKey.startsWith('sk-ant-')) {
            return { error: 'Forbidden: Claude API key not configured. Add your key in Settings.', status: 403 };
        }

        return { uid, claudeApiKey, claudeModel };

    } catch (error) {
        console.error(`Error fetching Claude config for user ${uid}:`, error);
        return { error: 'Internal Server Error: Could not retrieve Claude configuration.', status: 500 };
    }
}

/**
 * Verifies the Firebase ID token and returns the user's UID.
 * Used for endpoints that need auth but not the Claude key.
 *
 * @param authorizationHeader The 'Authorization' header value.
 * @returns Promise<{ uid: string } | { error: string; status: number }>
 */
export async function verifyUser(
    authorizationHeader: string | null | undefined
): Promise<{ uid: string } | { error: string; status: number }> {

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return { error: 'Unauthorized: Missing or invalid Authorization header.', status: 401 };
    }

    const idToken = authorizationHeader.split('Bearer ')[1];
    if (!idToken) {
        return { error: 'Unauthorized: Invalid token format.', status: 401 };
    }

    try {
        if (!adminAuth) {
            throw new Error("Admin Auth not initialized.");
        }
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (!uid) {
            return { error: 'Unauthorized: Could not identify user from token.', status: 401 };
        }

        return { uid };
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return { error: 'Unauthorized: Invalid or expired token.', status: 401 };
    }
}
