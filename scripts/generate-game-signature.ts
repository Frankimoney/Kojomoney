/**
 * Game Provider Signature Generator
 * 
 * Helper script to generate valid HMAC signatures for testing game webhooks.
 * 
 * Usage:
 * npx ts-node scripts/generate-game-signature.ts <provider> <secret> <transactionId> <amount/seconds>
 * 
 * Example:
 * npx ts-node scripts/generate-game-signature.ts gamezop my-secret-123 tx-001 50
 */

import * as crypto from 'crypto';

const args = process.argv.slice(2);

if (args.length < 4) {
    console.error('Usage: npx ts-node scripts/generate-game-signature.ts <provider> <secret> <transactionId> <amount/seconds>');
    console.error('Providers: gamezop, adjoe, qureka');
    process.exit(1);
}

const [provider, secret, transactionId, amountStr] = args;
const amount = parseFloat(amountStr);
const userId = 'test-user-id'; // Default test user
const timestamp = Date.now();

console.log(`\nGenerating signature for ${provider}...`);
console.log(`Secret: ${secret}`);
console.log(`Transaction ID: ${transactionId}`);
console.log(`Value: ${amount}`);

let signature = '';
let payload: any = {};
let curlCommand = '';

try {
    if (provider === 'gamezop') {
        // Gamezop: Concatenate fields and HMAC
        // Actual Gamezop implementation might vary, ensuring this matches service logic
        // Based on src/services/gameProviderService.ts:
        // const data = JSON.stringify(payload without signature);
        // return hmac(data, secret);

        payload = {
            transactionId,
            userId,
            reward: amount,
            gameId: 'test-game',
            timestamp
        };

        // IMPORTANT: Key sorting/stringification must match backend exactly
        const dataToSign = JSON.stringify(payload);
        signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

        payload.signature = signature;

        curlCommand = `curl -X POST http://localhost:3000/api/games/callback/gamezop \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;

    } else if (provider === 'adjoe') {
        // Adjoe: userId + transactionId + playtimeSeconds
        // Based on src/services/gameProviderService.ts

        payload = {
            transactionId,
            userId,
            playtimeSeconds: amount,
            appId: 'test-app',
            timestamp
        };

        const dataToSign = `${userId}${transactionId}${amount}`;
        signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

        payload.signature = signature;

        curlCommand = `curl -X POST http://localhost:3000/api/games/callback/adjoe \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;

    } else if (provider === 'qureka') {
        // Qureka: key|value sorted
        // Based on src/services/gameProviderService.ts

        payload = {
            transactionId,
            userId,
            coins: amount,
            quizId: 'test-quiz',
            timestamp
        };

        // Create query string sorted by key
        const sortedKeys = Object.keys(payload).sort();
        const dataToSign = sortedKeys.map(key => `${key}|${payload[key]}`).join('&');

        signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

        payload.signature = signature;

        curlCommand = `curl -X POST http://localhost:3000/api/games/callback/qureka \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;

    } else {
        console.error('Unknown provider. Use: gamezop, adjoe, qureka');
        process.exit(1);
    }

    console.log('\n✅ Signature Generated:');
    console.log(signature);

    console.log('\n📋 CURL Command for Testing:');
    console.log(curlCommand);
    console.log('\n');

} catch (error) {
    console.error('Error generating signature:', error);
}
