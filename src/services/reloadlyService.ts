/**
 * Reloadly Airtime Service
 * 
 * Handles automatic airtime top-ups via Reloadly API
 * Docs: https://developers.reloadly.com/
 */

// Reloadly API Configuration
const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID || ''
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET || ''
const RELOADLY_SANDBOX = process.env.RELOADLY_SANDBOX === 'true' // Use sandbox for testing

const BASE_URL = RELOADLY_SANDBOX
    ? 'https://topups-sandbox.reloadly.com'
    : 'https://topups.reloadly.com'

const AUTH_URL = RELOADLY_SANDBOX
    ? 'https://auth.reloadly.com/oauth/token'
    : 'https://auth.reloadly.com/oauth/token'

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get OAuth access token from Reloadly
 */
async function getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token
    }

    if (!RELOADLY_CLIENT_ID || !RELOADLY_CLIENT_SECRET) {
        throw new Error('Reloadly credentials not configured')
    }

    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: RELOADLY_CLIENT_ID,
            client_secret: RELOADLY_CLIENT_SECRET,
            grant_type: 'client_credentials',
            audience: RELOADLY_SANDBOX
                ? 'https://topups-sandbox.reloadly.com'
                : 'https://topups.reloadly.com'
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Reloadly auth failed: ${error}`)
    }

    const data = await response.json()
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 60000 // Expire 1 min early
    }

    return cachedToken.token
}

/**
 * Get account balance
 */
export async function getBalance(): Promise<{ balance: number; currencyCode: string }> {
    const token = await getAccessToken()

    const response = await fetch(`${BASE_URL}/accounts/balance`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.topups-v1+json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get Reloadly balance')
    }

    const data = await response.json()
    return {
        balance: data.balance,
        currencyCode: data.currencyCode
    }
}

/**
 * Auto-detect operator for a phone number
 */
export async function detectOperator(phone: string, countryCode: string): Promise<{
    operatorId: number
    operatorName: string
    minAmount: number
    maxAmount: number
    currencyCode: string
} | null> {
    const token = await getAccessToken()

    // Clean phone number
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+/, '')

    const response = await fetch(
        `${BASE_URL}/operators/auto-detect/phone/${cleanPhone}/countries/${countryCode}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/com.reloadly.topups-v1+json'
            }
        }
    )

    if (!response.ok) {
        console.error('Failed to auto-detect operator:', await response.text())
        return null
    }

    const data = await response.json()
    return {
        operatorId: data.operatorId,
        operatorName: data.name,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        currencyCode: data.destinationCurrencyCode
    }
}

/**
 * Send airtime top-up
 */
export async function sendTopup(params: {
    phone: string
    amount: number // USD amount
    countryCode: string
    operatorId?: number // Optional, will auto-detect if not provided
}): Promise<{
    success: boolean
    transactionId?: string
    message?: string
    deliveredAmount?: number
    deliveredCurrency?: string
}> {
    const { phone, amount, countryCode, operatorId } = params

    try {
        const token = await getAccessToken()

        // Clean phone number
        const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+/, '')

        // Auto-detect operator if not provided
        let opId = operatorId
        if (!opId) {
            const operator = await detectOperator(phone, countryCode)
            if (!operator) {
                return {
                    success: false,
                    message: 'Could not detect mobile operator for this number'
                }
            }
            opId = operator.operatorId
        }

        // Check balance first
        const balance = await getBalance()
        if (balance.balance < amount) {
            return {
                success: false,
                message: `Insufficient Reloadly balance. Have $${balance.balance}, need $${amount}`
            }
        }

        // Send the top-up
        const response = await fetch(`${BASE_URL}/topups`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/com.reloadly.topups-v1+json'
            },
            body: JSON.stringify({
                operatorId: opId,
                amount: amount, // USD amount - Reloadly converts to local currency
                useLocalAmount: false, // We're sending USD
                recipientPhone: {
                    countryCode: countryCode,
                    number: cleanPhone
                },
                customIdentifier: `KOJO-${Date.now()}` // Unique transaction ID
            })
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Reloadly top-up failed:', error)
            return {
                success: false,
                message: error.message || 'Top-up failed'
            }
        }

        const data = await response.json()

        return {
            success: true,
            transactionId: data.transactionId?.toString(),
            deliveredAmount: data.deliveredAmount,
            deliveredCurrency: data.deliveredAmountCurrencyCode,
            message: `Successfully sent ${data.deliveredAmount} ${data.deliveredAmountCurrencyCode} airtime`
        }

    } catch (error: any) {
        console.error('Reloadly error:', error)
        return {
            success: false,
            message: error.message || 'Airtime service error'
        }
    }
}

/**
 * Get list of supported countries
 */
export async function getCountries(): Promise<Array<{ isoName: string; name: string }>> {
    const token = await getAccessToken()

    const response = await fetch(`${BASE_URL}/countries`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.topups-v1+json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get countries')
    }

    return response.json()
}

/**
 * Get operators for a specific country
 */
export async function getOperators(countryCode: string): Promise<Array<{
    operatorId: number
    name: string
    minAmount: number
    maxAmount: number
}>> {
    const token = await getAccessToken()

    const response = await fetch(`${BASE_URL}/operators/countries/${countryCode}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.topups-v1+json'
        }
    })

    if (!response.ok) {
        return []
    }

    const data = await response.json()
    return data.map((op: any) => ({
        operatorId: op.operatorId,
        name: op.name,
        minAmount: op.minAmount,
        maxAmount: op.maxAmount
    }))
}

// Country code mapping for common countries
export const COUNTRY_CODES: Record<string, string> = {
    'NG': 'NG', // Nigeria
    'GH': 'GH', // Ghana
    'KE': 'KE', // Kenya
    'ZA': 'ZA', // South Africa
    'TZ': 'TZ', // Tanzania
    'UG': 'UG', // Uganda
    'RW': 'RW', // Rwanda
    'ET': 'ET', // Ethiopia
    'CM': 'CM', // Cameroon
    'CI': 'CI', // Ivory Coast
    'SN': 'SN', // Senegal
    'IN': 'IN', // India
    'PH': 'PH', // Philippines
    'ID': 'ID', // Indonesia
    'PK': 'PK', // Pakistan
    'BD': 'BD', // Bangladesh
    // Add more as needed
}

/**
 * Check if Reloadly is configured
 */
export function isReloadlyConfigured(): boolean {
    return !!(RELOADLY_CLIENT_ID && RELOADLY_CLIENT_SECRET)
}
