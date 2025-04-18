import admin from 'firebase-admin';
// Remove unused fs and path imports
// import fs from 'fs';
// import path from 'path';

// --- Credentials from Environment Variables --- 
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Replace \n characters in the private key string with actual newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n');

// Check if all required environment variables are set
const hasCredentials = projectId && clientEmail && privateKey;

if (!admin.apps.length) {
    if (hasCredentials) {
        try {
            // Initialize using credential object from environment variables
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: privateKey,
                }),
                // Optional: Add databaseURL if using Realtime Database via Admin SDK
                // databaseURL: `https://${projectId}.firebaseio.com`
            });
            console.log('Firebase Admin SDK Initialized using environment variables.');
        } catch (error: any) {
            console.error('Error initializing Admin SDK using environment variables:', error.message);
            // Log more detail if available
            if (error.code) {
                console.error(`Firebase Admin Error Code: ${error.code}`);
            }
        }
    } else {
        // Log which variables are missing
        let missingVars = [];
        if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
        console.error(`Missing Firebase Admin SDK environment variables: ${missingVars.join(', ')}. Cannot initialize Admin SDK.`);
    }
}

const adminAuth = admin.apps.length ? admin.auth() : null;
// Add explicit check for initialized app before getting firestore
const adminDb = admin.apps.length && admin.app() ? admin.firestore() : null;

export { adminAuth, adminDb }; 