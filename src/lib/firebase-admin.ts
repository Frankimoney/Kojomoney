import * as admin from 'firebase-admin'

if (!admin.apps.length) {
    // Check if we are in a production environment with proper ENV variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` // Assumption for RTDB URL
        })
    } else {
        // Fallback for local dev without creds - simulates functionality or warns
        console.warn('FIREBASE_ADMIN: Missing env variables, initializing with default (may fail on real DB calls)')
        try {
            admin.initializeApp()
        } catch (e) { /* ignore re-init error */ }
    }
}

export const db = admin.database()
export const adminAuth = admin.auth()

// Helper to get a timestamp
export const getTimestamp = () => admin.database.ServerValue.TIMESTAMP
