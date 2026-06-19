'use server';

import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
// User type from admin SDK might be needed if we return user info, but not for just verifying
// import { UserRecord } from 'firebase-admin/auth'; 

interface ActionResult {
    success: boolean;
    error?: string;
}

/**
 * Server Action to save the Tacticus API Key for the currently authenticated user.
 * Verifies the user via the passed ID token.
 * @param apiKey The Tacticus API Key to save.
 * @param idToken The Firebase ID token of the user making the request.
 * @returns ActionResult indicating success or failure.
 */
export async function saveUserApiKey(apiKey: string, idToken: string | undefined): Promise<ActionResult> {
    // 1. Verify the ID token using Admin SDK
    if (!idToken) {
        return { success: false, error: "Authentication token is missing." };
    }

    let decodedToken;
    try {
        if (!adminAuth) {
             console.error('Admin Auth SDK not initialized in saveUserApiKey action.');
             return { success: false, error: "Server configuration error (Auth)." };
        }
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
        console.error("Error verifying ID token in saveUserApiKey action:", error);
        return { success: false, error: "Invalid or expired authentication token." };
    }

    const uid = decodedToken.uid;
    if (!uid) {
         // Should not happen if verifyIdToken succeeds, but check anyway
         return { success: false, error: "Could not extract user ID from token." };
    }

    // 2. Validate the API Key itself
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        return { success: false, error: "Invalid API key provided." };
    }

    // 3. Ensure Firestore Admin SDK is initialized
    if (!adminDb) {
        console.error('Firestore Admin SDK not initialized in saveUserApiKey action.');
        return { success: false, error: "Server configuration error (DB)." };
    }

    try {
        // 4. Get user settings document reference
        const userSettingsRef = adminDb.collection('userSettings').doc(uid);

        // 5. Save the API key using set with merge: true
        await userSettingsRef.set({ 
            tacticusApiKey: apiKey.trim() 
        }, { merge: true });

        console.log(`Tacticus API Key saved successfully for user ${uid}`);
        
        // Optional: Revalidate data on the main page
        // Using revalidatePath('/') might trigger refetch in page.tsx
        revalidatePath('/'); 
        revalidatePath('/settings'); // Revalidate the settings page as well

        return { success: true };

    } catch (error: any) {
        console.error(`Error saving Tacticus API Key for user ${uid}:`, error);
        return { success: false, error: error.message || "Failed to save the API key to the database." };
    }
} 