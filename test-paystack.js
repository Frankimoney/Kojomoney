require('dotenv').config({ path: '.env.local' })

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_URL = 'https://api.paystack.co/bank/resolve'

async function test() {
    console.log('Testing Paystack Verification...')
    const account = '6973919258'
    const bank = '070' // Fidelity

    if (!PAYSTACK_SECRET_KEY) {
        console.log('❌ Missing PAYSTACK_SECRET_KEY in .env.local')
        return
    }

    const url = `${PAYSTACK_URL}?account_number=${account}&bank_code=${bank}`
    console.log(`Checking ${account} at Fidelity (070)...`)

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        })

        const data = await response.json()

        if (data.status) {
            console.log(`\n✅ SUCCESS! Name: ${data.data.account_name}`)
            console.log(`   Account Number: ${data.data.account_number}`)
        } else {
            console.log(`\n❌ FAILED. Message: ${data.message}`)
        }

    } catch (e) {
        console.error('Error:', e)
    }
}

test()
