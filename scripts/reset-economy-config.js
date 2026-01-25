/**
 * Reset Firestore Economy Config to Defaults
 * 
 * This script updates the system_config/economy document in Firestore
 * to match the hardcoded defaults in points-config.ts
 * 
 * Run with: node scripts/reset-economy-config.js
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const db = admin.firestore();

// Default config from points-config.ts
const EARNING_RATES = {
    watchAd: 50,           // $0.005
    readNews: 100,         // $0.01
    triviaCorrect: 40,     // $0.004 per correct answer
    triviaBonus: 200,      // $0.02 bonus for 5/5
    surveyMin: 500,        // $0.05 minimum
    surveyMax: 20000,      // $2.00 maximum
    offerwallMin: 1000,    // $0.10 minimum
    offerwallMax: 500000,  // $50.00 maximum
    gamePlaytimePerMin: 5, // $0.0005 per minute
    dailySpinMin: 100,     // $0.01
    dailySpinMax: 10000,   // $1.00
    referralSignup: 5000,  // $0.50 when referral signs up
    referralCommission: 0.10, // 10% of referral's earnings
};

const DAILY_LIMITS = {
    maxAds: 10,
    maxNews: 10,
    maxTrivia: 1,    // Once per day
    maxSurveys: 10,
    maxGamesMinutes: 120, // 2 hours
};

const POINTS_CONFIG = {
    pointsPerDollar: 10000,
    dollarPerPoint: 0.0001,
};

async function resetConfig() {
    console.log('🔧 Resetting Firestore economy config to defaults...\n');

    try {
        const configRef = db.collection('system_config').doc('economy');

        // First, let's see what the current config is
        const currentDoc = await configRef.get();
        if (currentDoc.exists) {
            console.log('📋 Current config in Firestore:');
            console.log(JSON.stringify(currentDoc.data(), null, 2));
            console.log('\n');
        } else {
            console.log('📋 No existing config found in Firestore\n');
        }

        // Update with defaults
        const newConfig = {
            earningRates: EARNING_RATES,
            dailyLimits: DAILY_LIMITS,
            pointsConfig: POINTS_CONFIG,
            globalMargin: 1.0, // Reset profit margin to 1.0 (100%)
            updatedAt: Date.now(),
            updatedBy: 'reset-script',
        };

        await configRef.set(newConfig, { merge: true });

        console.log('✅ Config reset to defaults:');
        console.log(JSON.stringify(newConfig, null, 2));
        console.log('\n');
        console.log('🎉 Done! The live site will now use these values.');

    } catch (error) {
        console.error('❌ Error resetting config:', error);
        process.exit(1);
    }

    process.exit(0);
}

resetConfig();
