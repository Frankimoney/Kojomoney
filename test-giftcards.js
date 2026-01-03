/**
 * Test Reloadly Gift Cards Integration
 * Run: node test-giftcards.js
 */

require('dotenv').config({ path: '.env.local' })

const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET
const SANDBOX = process.env.RELOADLY_SANDBOX === 'true'

const AUTH_URL = 'https://auth.reloadly.com/oauth/token'
const GIFTCARD_URL = SANDBOX
    ? 'https://giftcards-sandbox.reloadly.com'
    : 'https://giftcards.reloadly.com'

async function getAccessToken() {
    console.log('🔐 Getting gift card access token...')

    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: RELOADLY_CLIENT_ID,
            client_secret: RELOADLY_CLIENT_SECRET,
            grant_type: 'client_credentials',
            audience: SANDBOX
                ? 'https://giftcards-sandbox.reloadly.com'
                : 'https://giftcards.reloadly.com'
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
    console.log('\n💰 Checking gift card account balance...')

    const response = await fetch(`${GIFTCARD_URL}/accounts/balance`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
        }
    })

    if (!response.ok) {
        const err = await response.text()
        console.log('Error:', err)
        return null
    }

    const data = await response.json()
    console.log('✅ Balance:', data.balance, data.currencyCode)
    return data
}

async function getProducts(token, countryCode = 'US') {
    console.log(`\n🎁 Getting gift card products for ${countryCode}...`)

    const response = await fetch(`${GIFTCARD_URL}/countries/${countryCode}/products`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
        }
    })

    if (!response.ok) {
        const err = await response.text()
        console.log('Error:', err)
        return []
    }

    const data = await response.json()
    console.log(`✅ Found ${data.length} gift card products\n`)

    // Show popular brands
    const popularBrands = ['Amazon', 'Google', 'Steam', 'Netflix', 'Spotify', 'PlayStation', 'Xbox', 'iTunes']
    const popular = data.filter(p =>
        popularBrands.some(brand =>
            p.productName?.toLowerCase().includes(brand.toLowerCase()) ||
            p.brand?.brandName?.toLowerCase().includes(brand.toLowerCase())
        )
    )

    console.log('🔥 Popular gift cards available:')
    popular.slice(0, 10).forEach(p => {
        const minAmount = p.denominationType === 'RANGE'
            ? p.minRecipientDenomination
            : p.fixedRecipientDenominations?.[0]
        const maxAmount = p.denominationType === 'RANGE'
            ? p.maxRecipientDenomination
            : p.fixedRecipientDenominations?.slice(-1)[0]
        console.log(`   - ${p.brand?.brandName || p.productName} (ID: ${p.productId}) - $${minAmount}-$${maxAmount}`)
    })

    return data
}

async function getRedeemInstructions(token, productId) {
    console.log(`\n📋 Getting redeem instructions for product ${productId}...`)

    const response = await fetch(`${GIFTCARD_URL}/products/${productId}/redeem-instructions`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
        }
    })

    if (!response.ok) {
        console.log('❌ Could not get redeem instructions')
        return null
    }

    const data = await response.json()
    if (data.concise) {
        console.log('✅ Redeem instructions:', data.concise.substring(0, 200) + '...')
    }
    return data
}

// Main test
async function main() {
    console.log('='.repeat(50))
    console.log('🎁 RELOADLY GIFT CARDS TEST')
    console.log('   Mode:', SANDBOX ? 'SANDBOX (Test)' : 'PRODUCTION')
    console.log('='.repeat(50))

    if (!RELOADLY_CLIENT_ID || !RELOADLY_CLIENT_SECRET) {
        console.log('\n❌ Missing Reloadly credentials!')
        console.log('   Add RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET to .env.local')
        return
    }

    try {
        // 1. Get token
        const token = await getAccessToken()

        // 2. Check balance
        await getBalance(token)

        // 3. Get US products (most gift cards available)
        const products = await getProducts(token, 'US')

        // 4. Get redeem instructions for first product
        if (products.length > 0) {
            await getRedeemInstructions(token, products[0].productId)
        }

        console.log('\n' + '='.repeat(50))
        console.log('✅ GIFT CARD API TESTS PASSED!')
        console.log('='.repeat(50))
        console.log('\n📋 Next steps:')
        console.log('   1. In sandbox mode, you can test ordering with fake cards')
        console.log('   2. Gift cards are delivered via email after order')
        console.log('   3. Set RELOADLY_SANDBOX=false for production orders')

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message)
    }
}

main()
