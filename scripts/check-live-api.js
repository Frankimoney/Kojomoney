
const https = require('https');

const userId = '47035a77d4cd02a8be63080167a2bd34';
const url = `https://kojomoney-app.onrender.com/api/user?userId=${userId}`;

console.log(`Checking Live API: ${url}`);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log('Status:', res.statusCode);
            const json = JSON.parse(data);
            if (json.user) {
                console.log('User Found!');
                console.log('Points:', json.user.points);
                console.log('TotalPoints:', json.user.totalPoints);

                if (json.user.totalPoints >= json.user.points) {
                    console.log('✅ Validation: totalPoints is >= points.');
                } else {
                    console.log('❌ Validation: totalPoints is LESS than points? This shouldn not happen with the Max fix.');
                }

                // Check if they are exactly equal (ideal state)
                if (json.user.totalPoints === json.user.points) {
                    console.log('✅ Sync: Perfect sync.');
                } else {
                    console.log('⚠️ Sync: Mismatch exists (but Max fix prevents error).');
                }
            } else {
                console.log('Response:', data);
            }
        } catch (e) {
            console.error('Parse Error:', e.message);
            console.log('Raw:', data);
        }
    });
}).on('error', (e) => {
    console.error('Request Error:', e);
});
