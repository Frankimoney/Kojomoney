
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Read .env.local to find the secret
const envPath = path.resolve(process.cwd(), '.env.local');
let secretKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/KIWIWALL_SECRET_KEY=(.+)/);
    if (match) {
        secretKey = match[1].trim();
        console.log('✅ Found KIWIWALL_SECRET_KEY in .env.local');
    } else {
        console.error('❌ Could not find KIWIWALL_SECRET_KEY in .env.local');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Could not read .env.local', error);
    process.exit(1);
}

// Mock Data
const userId = '47035a77d4cd02a8be63080167a2bd34';
const amount = '100'; // Points
const transId = `TEST_TRANS_${Date.now()}`;
const subId = userId;

// Calculate Signature: MD5(sub_id:amount:secret_key)
// Note: verify the order in your callback code. 
// In src/pages/api/offers/callback.ts: const toHash = `${subId}:${amount}:${secret}`
const toHash = `${subId}:${amount}:${secretKey}`;
const signature = crypto.createHash('md5').update(toHash).digest('hex');

// Construct URLSearchParams
const params = new URLSearchParams({
    provider: 'Kiwiwall',
    status: '1', // 1 = success
    trans_id: transId,
    sub_id: subId,
    amount: amount,
    offer_id: 'TEST_OFFER_123',
    offer_name: 'Test Offer',
    signature: signature,
    ip_address: '34.193.235.172' // Mock correct IP if your logic checks it (though fetching from localhost won't have this IP)
});

console.log('\n----------------------------------------');
console.log('🥝 Kiwiwall Callback Tester Generator 🥝');
console.log('----------------------------------------');
console.log(`Secret Key: ${secretKey.substring(0, 5)}...`);
console.log(`Signature:  ${signature}`);
console.log('----------------------------------------\n');

console.log('To test this locally (ensure your Next.js server is running on port 3000):');
console.log(`curl -X POST "http://localhost:3000/api/offers/callback?${params.toString()}"`);

console.log('\nTo test against your PRODUCTION server, replace localhost:3000 with your domain:');
console.log(`curl -X POST "https://YOUR_DOMAIN.com/api/offers/callback?${params.toString()}"`);

console.log('\nExpected Response: {"success":true,"message":"1"}');
console.log('----------------------------------------');
