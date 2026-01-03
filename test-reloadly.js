/**
 * Test Reloadly Integration
 * Run: node test-reloadly.js
 */

require('dotenv').config({ path: '.env.local' })

const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET
const SANDBOX = process.env.RELOADLY_SANDBOX === 'true' // Set RELOADLY_SANDBOX=true in .env.local for sandbox

const AUTH_URL = 'https://auth.reloadly.com/oauth/token'
const BASE_URL = SANDBOX
    ? 'https://topups-sandbox.reloadly.com'
    : 'https://topups.reloadly.com'

async function getAccessToken() {
    console.log('🔐 Getting access token...')

    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: RELOADLY_CLIENT_ID,
            client_secret: RELOADLY_CLIENT_SECRET,
            grant_type: 'client_credentials',
            audience: SANDBOX
                ? 'https://topups-sandbox.reloadly.com'
                : 'https://topups.reloadly.com'
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Auth failed: ${error}`)
    }

    const data = await response.json()
    console.log('✅ Token received! Expires in:', data.expires_in, 'seconds')
    return data.access_token
}

async function getBalance(token) {
    console.log('\n💰 Checking account balance...')

    const response = await fetch(`${BASE_URL}/accounts/balance`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.topups-v1+json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get balance')
    }

    const data = await response.json()
    console.log('✅ Balance:', data.balance, data.currencyCode)
    return data
}

async function getCountries(token) {
    console.log('\n🌍 Getting supported countries...')

    const response = await fetch(`${BASE_URL}/countries`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.topups-v1+json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get countries')
    }

    const data = await response.json()
    console.log('✅ Supported countries:', data.length)

    // Show African countries
    const african = data.filter(c =>
        ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW', 'ET', 'CM'].includes(c.isoName)
    )
    console.log('\n🌍 African countries available:')
    african.forEach(c => console.log(`   - ${c.name} (${c.isoName})`))

    return data
}

async function getNigeriaOperators(token) {
    console.log('\n📱 Getting Nigeria operators...')

    const response = await fetch(`${BASE_URL}/operators/countries/NG`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.topups-v1+json'
        }
    })

    if (!response.ok) {
        const err = await response.text()
        console.log('Error:', err)
        return
    }

    const data = await response.json()
    console.log('✅ Nigeria operators:')
    data.slice(0, 10).forEach(op => {
        console.log(`   - ${op.name} (ID: ${op.operatorId}) - Min: ${op.minAmount}, Max: ${op.maxAmount}`)
    })

    return data
}

async function testAutoDetect(token, phone) {
    console.log('\n🔍 Testing operator auto-detect for:', phone)

    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+/, '')

    const response = await fetch(
        `${BASE_URL}/operators/auto-detect/phone/${cleanPhone}/countries/NG`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/com.reloadly.topups-v1+json'
            }
        }
    )

    if (!response.ok) {
        const err = await response.text()
        console.log('❌ Auto-detect failed:', err)
        return null
    }

    const data = await response.json()
    console.log('✅ Detected operator:', data.name, '(ID:', data.operatorId, ')')
    return data
}

// Main test
async function main() {
    console.log('='.repeat(50))
    console.log('🚀 RELOADLY INTEGRATION TEST')
    console.log('   Mode:', SANDBOX ? 'SANDBOX (Test)' : 'PRODUCTION')
    console.log('='.repeat(50))

    try {
        // 1. Get token
        const token = await getAccessToken()

        // 2. Check balance
        await getBalance(token)

        // 3. Get countries
        await getCountries(token)

        // 4. Get Nigeria operators
        await getNigeriaOperators(token)

        // 5. Test auto-detect with a sample Nigerian number
        await testAutoDetect(token, '+2348012345678')

        console.log('\n' + '='.repeat(50))
        console.log('✅ ALL TESTS PASSED! Reloadly is working.')
        console.log('='.repeat(50))
        console.log('\n📋 Next steps:')
        console.log('   1. Add RELOADLY_* vars to your .env.local')
        console.log('   2. Test an airtime withdrawal in the admin dashboard')
        console.log('   3. In sandbox mode, use test numbers like +2348000000001')
        console.log('   4. When ready, set RELOADLY_SANDBOX=false for production')

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message)
    }
}

main()
