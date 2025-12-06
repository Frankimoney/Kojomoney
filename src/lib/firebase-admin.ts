import * as admin from 'firebase-admin'

if (!admin.apps.length) {
    // Only initialize if we have proper credentials
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            // Use custom database URL if provided, otherwise construct default
            const databaseURL = process.env.FIREBASE_DATABASE_URL ||
                `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                databaseURL
            })
            console.log('Firebase Admin initialized successfully')
            console.log('Database URL:', databaseURL)
        } catch (error) {
            console.error('Firebase Admin initialization error:', error)
        }
    } else {
        console.warn('Firebase credentials not found in environment variables')
    }
}

export const db = admin.apps.length > 0 ? admin.database() : null
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null

// Helper to get a timestamp
export const getTimestamp = () => {
    try {
        if (admin.apps.length > 0 && admin.database && (admin as any).database().ServerValue) {
            return (admin as any).database().ServerValue.TIMESTAMP
        }
    } catch (e) {
        // If firebase admin isn't initialized or ServerValue isn't available,
        // return a conservative placeholder that calling code can handle.
        console.warn('getTimestamp: Firebase Admin not initialized, returning fallback timestamp placeholder')
    }
    return { '.sv': 'timestamp' }
}

