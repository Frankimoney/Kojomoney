const http = require('http');

const data = JSON.stringify({
    userId: 'test-withdrawal-001',
    amount: 10000,
    method: 'bank_transfer',
    bankName: 'Test Bank',
    accountNumber: '1234567890',
    accountName: 'Test User'
});

console.log('Sending withdrawal request...');
console.log('Data:', data);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/withdrawal',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Request-Timestamp': Date.now().toString(),
        'X-Device-Id': 'test-device'
    }
};

const req = http.request(options, (res) => {
    console.log('\n=== RESPONSE ===');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));

    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('\nBody:', body);
        try {
            const parsed = JSON.parse(body);
            console.log('\nParsed Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('(Could not parse as JSON)');
        }
    });
});

req.on('error', e => {
    console.error('\n!!! Request Error:', e.message);
});

req.write(data);
req.end();

console.log('Request sent, waiting for response...');
