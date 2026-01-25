
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

const auth = admin.auth();
const USER_ID = 'test-withdrawal-001';
const EMAIL = 'test-withdrawal-001@test.kojomoney.com';
const PASSWORD = 'KojoMoney2026!';

async function create() {
    console.log(`Creating/Updating Auth for ${EMAIL}...`);
    try {
        // Try deleting first to ensure clean state if it exists in a broken state
        try {
            await auth.deleteUser(USER_ID);
            console.log('Deleted existing auth user.');
        } catch (e) {
            // Ignore if not found
            console.log('User did not exist (or delete failed).');
        }

        const userRecord = await auth.createUser({
            uid: USER_ID,
            email: EMAIL,
            password: PASSWORD,
            emailVerified: true,
            displayName: 'Test Withdrawal User'
        });

        console.log('✅ Successfully created new auth user:');
        console.log(`Uid: ${userRecord.uid}`);
        console.log(`Email: ${userRecord.email}`);
        console.log(`Password: ${PASSWORD}`);

    } catch (error) {
        console.error('FAILED to create user:', error);
        // If this fails, we can't do much.
    }
}

create();
