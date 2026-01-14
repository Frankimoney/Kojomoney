
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=').trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                process.env[key.trim()] = value;
            }
        });
    } catch (e) { }
}

loadEnv();

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
const USERS_COLLECTION = 'users';

async function setPoints(email, points) {
    console.log(`Setting points for ${email} to ${points}...`);
    try {
        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get();
        if (snapshot.empty) {
            console.log('User not found!');
            return;
        }

        const doc = snapshot.docs[0];
        await doc.ref.update({
            totalPoints: points,
            updatedAt: Date.now()
        });
        console.log(`✅ Success! Updated ${doc.id} (Email: ${email}) to ${points} points.`);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Get args
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node scripts/update-points.js <email> <points>');
} else {
    setPoints(args[0], parseInt(args[1]));
}
