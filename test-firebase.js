// Test Firebase connection
require('dotenv').config({ path: '.env.local' })

async function testFirebase() {
    console.log('Testing Firebase connection...')
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID)
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL)
    console.log('Database URL:', process.env.FIREBASE_DATABASE_URL)
    console.log('Private Key (first 50 chars):', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50))

    const admin = require('firebase-admin')

    if (!admin.apps.length) {
        try {
            const databaseURL = process.env.FIREBASE_DATABASE_URL ||
                `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
                databaseURL
            })
            console.log('✅ Firebase initialized')
            console.log('Database URL:', databaseURL)
        } catch (error) {
            console.error('❌ Firebase init failed:', error.message)
            return
        }
    }

    const db = admin.database()

    // Test write
    console.log('\nAttempting to write to Firebase...')
    const testRef = db.ref('test/connection')

    try {
        const startTime = Date.now()
        await Promise.race([
            testRef.set({ timestamp: Date.now(), test: 'connection' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10s')), 10000))
        ])
        console.log(`✅ Write successful in ${Date.now() - startTime}ms`)
    } catch (error) {
        console.error('❌ Write failed:', error.message)
        console.log('\nPossible issues:')
        console.log('1. Check Firebase Realtime Database rules (should allow writes)')
        console.log('2. Verify the database URL is correct')
        console.log('3. Check that your service account has permission to write')
        return
    }

    // Test read
    console.log('\nAttempting to read from Firebase...')
    try {
        const startTime = Date.now()
        const snapshot = await Promise.race([
            testRef.get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10s')), 10000))
        ])
        console.log(`✅ Read successful in ${Date.now() - startTime}ms`)
        console.log('Data:', snapshot.val())
    } catch (error) {
        console.error('❌ Read failed:', error.message)
    }

    // Cleanup
    try {
        await testRef.remove()
        console.log('✅ Cleanup successful')
    } catch (e) { }

    console.log('\n✅ Firebase connection test complete!')
    process.exit(0)
}

testFirebase()
