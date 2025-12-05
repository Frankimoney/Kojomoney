import * as admin from 'firebase-admin'

if (!admin.apps.length) {
    // Only initialize if we have proper credentials
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
            })
            console.log('Firebase Admin initialized successfully')
        } catch (error) {
            console.error('Firebase Admin initialization error:', error)
            // Initialize with minimal config as fallback
            admin.initializeApp()
        }
    } else {
        console.warn('FIREBASE_ADMIN: Missing credentials, initializing with default app')
        // Initialize default app to prevent errors
        admin.initializeApp()
    }
}

export const db = admin.database()
export const adminAuth = admin.auth()

// Helper to get a timestamp
export const getTimestamp = () => admin.database.ServerValue.TIMESTAMP
