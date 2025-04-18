'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from './firebase/firebaseAdmin'; // Assuming adminDb is exported from here

/**
 * Saves or updates the user's Tacticus API key in Firestore.
 * @param userId - The Firebase UID of the user.
 * @param apiKey - The Tacticus API key to save.
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function saveUserApiKey(
  userId: string | null, 
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return { success: false, error: 'Invalid API key provided.' };
  }
  if (!adminDb) {
    console.error("Firebase Admin DB is not initialized.");
    return { success: false, error: 'Server configuration error.' };
  }

  try {
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.set({ tacticusApiKey: apiKey }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Error saving API key:", error);
    let errorMessage = 'Failed to save API key.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves the status and optionally a masked version of the user's Tacticus API key.
 * @param userId - The Firebase UID of the user.
 * @returns Promise<{ hasKey: boolean; maskedKey?: string; error?: string }>
 */
export async function getUserApiKeyStatus(
    userId: string | null
): Promise<{ hasKey: boolean; maskedKey?: string; error?: string }> {
    if (!userId) {
        return { hasKey: false, error: 'User not authenticated.' };
    }
    if (!adminDb) {
        console.error("Firebase Admin DB is not initialized for getUserApiKeyStatus.");
        return { hasKey: false, error: 'Server configuration error.' };
    }

    try {
        const userDocRef = adminDb.collection('users').doc(userId);
        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
            const data = docSnap.data() as { [key: string]: any } | undefined;
            const apiKey = data?.tacticusApiKey;
            
            // @ts-ignore - Linter incorrectly flags this type check
            if (apiKey && typeof apiKey === 'string') {
                if (apiKey.length > 4) {
                    const maskedKey = `••••••••••••${apiKey.slice(-4)}`;
                    return { hasKey: true, maskedKey: maskedKey };
                } else {
                    return { hasKey: true, maskedKey: '••••' };
                }
            }
        }
        return { hasKey: false };
    } catch (error) {
        console.error("Error fetching API key status:", error);
        let errorMessage = 'Failed to fetch API key status.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { hasKey: false, error: errorMessage };
    }
}
