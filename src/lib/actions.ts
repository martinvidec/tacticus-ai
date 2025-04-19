'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from './firebase/firebaseAdmin'; // Assuming adminDb is exported from here
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue

// Helper to mask the API key
function maskApiKey(key: string): string {
    if (key.length > 4) {
        return `••••••••••••${key.slice(-4)}`;
    } 
    return '••••'; // Mask short keys too
}

/**
 * Saves or updates the user's Tacticus API key and associated Tacticus User ID in Firestore.
 * @param userId - The Firebase UID of the user.
 * @param apiKey - The Tacticus API key to save.
 * @param tacticusUserId - The Tacticus User ID (UUID) extracted after validating the key.
 * @returns Promise<{ success: boolean; maskedKey?: string; error?: string }>
 */
export async function saveUserApiKey(
  userId: string | null, 
  apiKey: string,
  tacticusUserId: string | null // Added parameter
): Promise<{ success: boolean; maskedKey?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return { success: false, error: 'Invalid API key provided.' };
  }
   if (!tacticusUserId || typeof tacticusUserId !== 'string') {
     // Allow saving the key even if ID extraction failed (maybe log a warning)
     console.warn(`Saving API key for user ${userId} without a valid Tacticus User ID.`);
     // return { success: false, error: 'Invalid Tacticus User ID provided.' };
   }
  if (!adminDb) {
    console.error("Firebase Admin DB is not initialized.");
    return { success: false, error: 'Server configuration error.' };
  }

  try {
    const userDocRef = adminDb.collection('users').doc(userId);
    // Save both the key and the extracted Tacticus ID
    await userDocRef.set({ 
        tacticusApiKey: apiKey,
        tacticusUserId: tacticusUserId // Store the ID
    }, { merge: true });

    // Revalidate paths if needed (uncomment if necessary)
    // revalidatePath('/settings'); 
    // revalidatePath('/');

    // Return success and the masked key
    const maskedKey = maskApiKey(apiKey);
    return { success: true, maskedKey: maskedKey };

  } catch (error) {
    console.error("Error saving API key and/or Tacticus ID:", error);
    let errorMessage = 'Failed to save API key.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves the status, masked key, and Tacticus User ID for the user.
 * @param userId - The Firebase UID of the user.
 * @returns Promise<{ hasKey: boolean; maskedKey?: string; tacticusUserId?: string | null; error?: string }>
 */
export async function getUserApiKeyStatus(
    userId: string | null
): Promise<{ hasKey: boolean; maskedKey?: string; tacticusUserId?: string | null; error?: string }> {
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
            const tacticusUserId = data?.tacticusUserId || null; // Get the Tacticus ID
            
            if (apiKey && typeof apiKey === 'string') {
                 const maskedKey = maskApiKey(apiKey);
                 return { hasKey: true, maskedKey: maskedKey, tacticusUserId: tacticusUserId };
            }
        }
        // If no document or no API key found, return hasKey: false, but still return tacticusUserId if it somehow exists
        const tacticusUserIdAlone = docSnap.exists ? (docSnap.data()?.tacticusUserId || null) : null;
        return { hasKey: false, tacticusUserId: tacticusUserIdAlone };
    } catch (error) {
        console.error("Error fetching API key status:", error);
        let errorMessage = 'Failed to fetch API key status.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { hasKey: false, error: errorMessage };
    }
}

/**
 * Deletes the user's Tacticus API key and Tacticus User ID from Firestore.
 * @param userId - The Firebase UID of the user.
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function deleteUserApiKey(
    userId: string | null
): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    if (!adminDb) {
        console.error("Firebase Admin DB is not initialized for deleteUserApiKey.");
        return { success: false, error: 'Server configuration error.' };
    }

    try {
        const userDocRef = adminDb.collection('users').doc(userId);
        // Use FieldValue.delete() to remove the specific fields
        await userDocRef.update({ 
            tacticusApiKey: FieldValue.delete(),
            tacticusUserId: FieldValue.delete() // Also delete the Tacticus ID
        });

        // Optional: Revalidate paths if necessary
        // revalidatePath('/settings');
        // revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error("Error deleting API key fields:", error);
        let errorMessage = 'Failed to delete API key fields.';
        if (error instanceof Error && (error as any).code === 5) { // Firestore error code 5 is NOT_FOUND
            console.log(`Document or fields already deleted for user ${userId}. Treating as success.`);
            return { success: true }; 
        }
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
