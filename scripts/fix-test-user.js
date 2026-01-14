
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
    } catch (e) { console.error(e); }
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
const PASSWORD = 'KojoMoney2026!'; // Strong password for Google

async function configureUser() {
    console.log(`Configuring Auth for ${EMAIL}...`);
    try {
        try {
            await auth.getUser(USER_ID);
            console.log('User exists in Auth. Updating password...');
            await auth.updateUser(USER_ID, {
                password: PASSWORD,
                email: EMAIL,
                emailVerified: true
            });
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('User not found in Auth. Creating...');
                await auth.createUser({
                    uid: USER_ID,
                    email: EMAIL,
                    password: PASSWORD,
                    emailVerified: true,
                    displayName: 'Test Withdrawal User'
                });
            } else {
                throw error;
            }
        }
        console.log('✅ Success! User credential ready.');
        console.log(`Email: ${EMAIL}`);
        console.log(`Password: ${PASSWORD}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

configureUser();
