
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Missing Firebase credentials in .env.local')
    process.exit(1)
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    })
}

const db = admin.firestore()

async function findUsers() {
    console.log('Searching for users with > 35,000 points...')

    try {
        const snapshot = await db.collection('users')
            .where('totalPoints', '>=', 35000)
            .orderBy('totalPoints', 'desc')
            .limit(10)
            .get()

        if (snapshot.empty) {
            console.log('No users found with > 35,000 points.')
            return
        }

        console.log(`Found ${snapshot.size} users:`)
        snapshot.forEach(doc => {
            const data = doc.data()
            console.log(`
User ID: ${doc.id}
Email: ${data.email}
Name: ${data.name || 'N/A'}
Points: ${data.totalPoints}
Created: ${new Date(data.createdAt).toISOString()}
-------------------`)
        })

    } catch (error) {
        console.error('Error finding users:', error)
    }
}

findUsers().catch(console.error)
