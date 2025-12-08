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
            })
            console.log('Firebase Admin initialized successfully (Firestore)')
        } catch (error: any) {
            // Check if error is "already exists" which can happen in race conditions
            if (error.errorInfo?.code === 'app/duplicate-app') {
                console.log('Firebase Admin already initialized (duplicate-app)')
            } else {
                console.error('Firebase Admin initialization error:', error)
            }
        }
    } else {
        console.warn('Firebase credentials not found in environment variables')
    }
}


// Export Firestore (not Realtime Database)
export const db = admin.apps.length > 0 ? admin.firestore() : null
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null

// Helper to get a Firestore server timestamp
export const getTimestamp = () => {
    return admin.firestore.FieldValue.serverTimestamp()
}
