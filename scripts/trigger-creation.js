
const http = require('http');

const data = JSON.stringify({
    secret: 'create-google-reviewer-now'
});

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/admin/create-reviewer',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('RESPONSE: ' + body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
