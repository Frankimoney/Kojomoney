/**
 * Test Withdrawal Script (API-only)
 * 
 * This script tests the withdrawal API by making HTTP requests directly.
 * It uses the same approach as the frontend would.
 * 
 * Usage: node scripts/test-withdrawal.js
 */

async function testWithdrawal() {
    console.log('🧪 Starting Withdrawal Test...\n');

    // First, we need to create a test user with points
    // We'll use a seed script approach or call an admin API

    const BASE_URL = 'http://localhost:3000';
    const TEST_USER_ID = 'test-withdrawal-user-' + Date.now();
    const TEST_AMOUNT = 10000; // 10,000 points = $1.00

    try {
        // Step 1: Create test user via the signup/user API
        console.log('📝 Step 1: Creating test user with points via admin seed...');

        // We'll use a direct Firestore write via the test-seed API
        const seedResponse = await fetch(`${BASE_URL}/api/test-seed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'create-test-user',
                userId: TEST_USER_ID,
                points: 50000
            })
        });

        if (!seedResponse.ok) {
            console.log('   ⚠️ Test seed API not available. Creating user via alternative method...\n');

            // Alternative: Create user directly using signup-like flow
            // For testing, let's just proceed with an existing user approach
            console.log('   💡 Tip: To test with a real user, add points via Firebase console or admin panel.\n');
            console.log('   📌 Proceeding to test the API response format...\n');
        } else {
            const seedResult = await seedResponse.json();
            console.log(`   ✅ Test user created: ${TEST_USER_ID}`);
            console.log(`   💰 Points: 50,000\n`);
        }

        // Step 2: Make withdrawal request
        console.log('📤 Step 2: Submitting withdrawal request...');

        const withdrawalPayload = {
            userId: TEST_USER_ID,
            amount: TEST_AMOUNT,
            method: 'bank_transfer',
            bankName: 'Test Bank',
            accountNumber: '1234567890',
            accountName: 'Test Withdrawal User'
        };

        console.log(`   User ID: ${TEST_USER_ID}`);
        console.log(`   Amount: ${TEST_AMOUNT.toLocaleString()} points`);
        console.log(`   Method: Bank Transfer`);
        console.log(`   Bank: ${withdrawalPayload.bankName}`);
        console.log(`   Account: ${withdrawalPayload.accountNumber}\n`);

        const response = await fetch(`${BASE_URL}/api/withdrawal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Timestamp': Date.now().toString(),
                'X-Request-Signature': 'test-signature',
                'X-Device-Id': 'test-device-id'
            },
            body: JSON.stringify(withdrawalPayload)
        });

        const result = await response.json();

        console.log('📊 API Response:');
        console.log(`   Status Code: ${response.status}`);
        console.log(`   Success: ${result.success || false}`);

        if (result.error) {
            console.log(`   ❌ Error: ${result.error}\n`);
        }

        if (result.withdrawal) {
            console.log(`   ✅ Withdrawal Created!`);
            console.log(`   📋 ID: ${result.withdrawal.id}`);
            console.log(`   💵 USD Value: $${result.withdrawal.amountUSD?.toFixed(2)}`);
            console.log(`   📊 Status: ${result.withdrawal.status}`);
            console.log(`   ⚠️ Risk Score: ${result.withdrawal.riskScore || 0}\n`);
        }

        // Step 3: Fetch withdrawals to verify
        console.log('🔍 Step 3: Fetching withdrawal list...');

        const listResponse = await fetch(`${BASE_URL}/api/withdrawal?userId=${TEST_USER_ID}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Timestamp': Date.now().toString(),
            }
        });

        const listResult = await listResponse.json();

        if (listResult.withdrawals && listResult.withdrawals.length > 0) {
            console.log(`   ✅ Found ${listResult.withdrawals.length} withdrawal(s) for this user`);
            listResult.withdrawals.forEach((w, i) => {
                console.log(`   [${i + 1}] ${w.amount} pts - ${w.status} - ${new Date(w.createdAt).toLocaleString()}`);
            });
        } else {
            console.log('   📭 No withdrawals found for this user');
        }

        console.log('\n' + '═'.repeat(50));
        console.log('📊 TEST COMPLETE');
        console.log('═'.repeat(50));
        console.log('\n🎉 Check the Admin Dashboard at http://localhost:3000/admin');
        console.log('   Go to "Withdrawals" tab to see the pending withdrawal!');
        console.log('═'.repeat(50));

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testWithdrawal();
