
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Simple .env parser since dotenv might not be in dependencies for runtime (it is in devDependencies)
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=').trim();
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                process.env[key.trim()] = value;
            }
        });
    } catch (e) {
        console.error('Error loading .env.local', e);
    }
}

loadEnv();

if (!process.env.FIREBASE_PROJECT_ID) {
    console.error('Missing env vars');
    process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function findUsers() {
    console.log('Searching for users with > 38,000 points...');
    try {
        const snapshot = await db.collection('users')
            .where('totalPoints', '>=', 38000)
            .orderBy('totalPoints', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log('No users found.');
            return;
        }

        console.log(`Found ${snapshot.size} users:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[USER] ID: ${doc.id} | Email: ${data.email} | Points: ${data.totalPoints}`);
            // Also check for password hint if stored (unlikely but worth checking fields)
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

findUsers();
