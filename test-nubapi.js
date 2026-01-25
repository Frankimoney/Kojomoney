require('dotenv').config({ path: '.env.local' })

const NUBAPI_KEY = process.env.NUBAPI_KEY
const NUBAPI_URL = 'https://nubapi.com/api/verify'

async function test() {
    console.log('Testing Fidelity Bank (070) with 6973919258...')

    // Fidelity Bank Code: 070
    const url = `${NUBAPI_URL}?account_number=6973919258&bank_code=070`

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${NUBAPI_KEY}` }
        })
        const data = await response.json()

        console.log('\nResponse:')
        console.log(JSON.stringify(data, null, 2))

        if (data.account_name) {
            console.log(`\n✅ SUCCESS! Name: ${data.account_name}`)
        } else {
            console.log(`\n❌ FAILED. Message: ${data.message}`)
        }

    } catch (e) {
        console.error('Error:', e)
    }
}

test()
