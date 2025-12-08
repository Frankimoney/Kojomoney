// Test Firestore connection
require('dotenv').config({ path: '.env.local' })
const admin = require('firebase-admin')

async function testFirestore() {
    console.log('Testing Firestore connection...')
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID)
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL)

    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('❌ FIREBASE_PRIVATE_KEY is missing!')
        return
    }
    console.log('Private Key length:', process.env.FIREBASE_PRIVATE_KEY.length)

    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            })
        }
        console.log('✅ Firebase Admin initialized')

        const db = admin.firestore()
        console.log('Got Firestore instance. Attempting write...')

        const startTime = Date.now()

        // Add a timeout to the operation
        const writePromise = db.collection('test_verifications').doc('test_conn').set({
            test: 'connection',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out after 10s')), 10000)
        )

        await Promise.race([writePromise, timeoutPromise])

        console.log(`✅ Firestore Write successful in ${Date.now() - startTime}ms`)

        console.log('Attempting cleanup...')
        await db.collection('test_verifications').doc('test_conn').delete()
        console.log('✅ Cleanup successful')

    } catch (error) {
        console.error('\n❌ Firestore Error:', error.message)
        if (error.code) console.error('Error Code:', error.code)
    }
}

testFirestore()
