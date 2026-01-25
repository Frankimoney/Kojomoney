
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE dynamic imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkRecentActivity() {
    // Dynamic import to allow environment variables to load first
    const { db } = await import('../src/lib/firebase-admin');

    if (!db) {
        console.error('❌ Database not initialized. Check your credentials in .env.local');
        return;
    }

    console.log('✅ Firebase Admin initialized successfully (Firestore)');
    console.log('\n🔍 Checking "offer_completions" for recent activity...\n');

    try {
        const snapshot = await db.collection('offer_completions')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log('⚠️ No offer completions found in the database.');
        } else {
            console.log(`Found ${snapshot.size} recent completions:`);
            console.log('--------------------------------------------------');
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A';
                console.log(`[${date}] Provider: ${data.provider} | Status: ${data.status} | Payout: ${data.payout}`);
                console.log(`User ID: ${data.userId}`);
                console.log(`Tx ID: ${data.transactionId}`);
                console.log('--------------------------------------------------');
            });
        }
    } catch (error) {
        console.error('Error fetching completions:', error);
    }

    console.log('\n🔍 Checking "transactions" for recent credits...\n');

    try {
        const snapshot = await db.collection('transactions')
            .where('type', '==', 'credit')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log('⚠️ No transactions found.');
        } else {
            console.log(`Found ${snapshot.size} recent transactions:`);
            console.log('--------------------------------------------------');
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A';
                console.log(`[${date}] Source: ${data.source} | Amount: ${data.amount}`);
                console.log(`Metadata: ${JSON.stringify(data.metadata)}`);
                console.log('--------------------------------------------------');
            });
        }

    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

checkRecentActivity();
