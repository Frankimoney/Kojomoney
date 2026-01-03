/**
 * Reloadly Gift Card Service
 * 
 * Handles gift card purchases via Reloadly Gift Card API
 * Docs: https://developers.reloadly.com/api/giftcards
 */

// Reloadly API Configuration (same credentials, different audience)
const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID || ''
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET || ''
const RELOADLY_SANDBOX = process.env.RELOADLY_SANDBOX === 'true'

// Gift Card API uses different base URL than Airtime
const GIFTCARD_BASE_URL = RELOADLY_SANDBOX
    ? 'https://giftcards-sandbox.reloadly.com'
    : 'https://giftcards.reloadly.com'

const AUTH_URL = 'https://auth.reloadly.com/oauth/token'

// Cached token specifically for gift cards (separate from airtime token)
let cachedGiftCardToken: { token: string; expiresAt: number } | null = null

/**
 * Get OAuth access token for Gift Card API
 * Note: Gift Cards use a different audience than Airtime
 */
async function getGiftCardAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedGiftCardToken && cachedGiftCardToken.expiresAt > Date.now()) {
        return cachedGiftCardToken.token
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
                ? 'https://giftcards-sandbox.reloadly.com'
                : 'https://giftcards.reloadly.com'
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Reloadly auth failed: ${error}`)
    }

    const data = await response.json()
    cachedGiftCardToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 60000 // Expire 1 min early
    }

    return cachedGiftCardToken.token
}

/**
 * Gift Card Product interface
 */
export interface GiftProduct {
    productId: number
    productName: string
    brand: {
        brandId: number
        brandName: string
    }
    country: {
        isoName: string
        name: string
    }
    denominationType: 'FIXED' | 'RANGE'
    fixedRecipientDenominations?: number[]
    minRecipientDenomination?: number
    maxRecipientDenomination?: number
    senderCurrencyCode: string
    recipientCurrencyCode: string
    discountPercentage: number
    logoUrls: string[]
}

/**
 * Order result interface
 */
export interface GiftOrderResult {
    success: boolean
    transactionId?: number
    redeemCode?: string
    cardPin?: string
    message?: string
    status?: string
}

/**
 * Get available gift card products for a country
 */
export async function getGiftProducts(countryCode: string): Promise<GiftProduct[]> {
    const token = await getGiftCardAccessToken()

    const response = await fetch(
        `${GIFTCARD_BASE_URL}/countries/${countryCode}/products`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/com.reloadly.giftcards-v1+json'
            }
        }
    )

    if (!response.ok) {
        console.error('Failed to get gift products:', await response.text())
        return []
    }

    const products = await response.json()
    return products.map((p: any) => ({
        productId: p.productId,
        productName: p.productName,
        brand: {
            brandId: p.brand?.brandId,
            brandName: p.brand?.brandName
        },
        country: {
            isoName: p.country?.isoName,
            name: p.country?.name
        },
        denominationType: p.denominationType,
        fixedRecipientDenominations: p.fixedRecipientDenominations,
        minRecipientDenomination: p.minRecipientDenomination,
        maxRecipientDenomination: p.maxRecipientDenomination,
        senderCurrencyCode: p.senderCurrencyCode,
        recipientCurrencyCode: p.recipientCurrencyCode,
        discountPercentage: p.discountPercentage || 0,
        logoUrls: p.logoUrls || []
    }))
}

/**
 * Get popular gift card brands (curated list for UI)
 * Returns products for common brands that work globally
 */
export async function getPopularGiftBrands(countryCode: string = 'US'): Promise<{
    brand: string
    productId: number
    productName: string
    minAmount: number
    maxAmount: number
    logo?: string
}[]> {
    const products = await getGiftProducts(countryCode)

    // Filter for popular brands
    const popularBrands = ['Amazon', 'Google Play', 'Steam', 'iTunes', 'Netflix', 'Spotify', 'PlayStation', 'Xbox']

    const filtered = products.filter(p =>
        popularBrands.some(brand =>
            p.brand?.brandName?.toLowerCase().includes(brand.toLowerCase()) ||
            p.productName?.toLowerCase().includes(brand.toLowerCase())
        )
    )

    return filtered.map(p => ({
        brand: p.brand?.brandName || p.productName,
        productId: p.productId,
        productName: p.productName,
        minAmount: p.denominationType === 'RANGE'
            ? (p.minRecipientDenomination || 1)
            : (p.fixedRecipientDenominations?.[0] || 1),
        maxAmount: p.denominationType === 'RANGE'
            ? (p.maxRecipientDenomination || 100)
            : (p.fixedRecipientDenominations?.slice(-1)[0] || 100),
        logo: p.logoUrls?.[0]
    }))
}

/**
 * Order a gift card
 */
export async function orderGiftCard(params: {
    productId: number
    quantity?: number
    unitPrice: number
    recipientEmail: string
    customIdentifier?: string
}): Promise<GiftOrderResult> {
    const { productId, quantity = 1, unitPrice, recipientEmail, customIdentifier } = params

    try {
        const token = await getGiftCardAccessToken()

        const response = await fetch(`${GIFTCARD_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/com.reloadly.giftcards-v1+json'
            },
            body: JSON.stringify({
                productId,
                quantity,
                unitPrice,
                recipientEmail,
                customIdentifier: customIdentifier || `KOJO-GC-${Date.now()}`,
                senderName: 'KojoMoney'
            })
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Gift card order failed:', error)
            return {
                success: false,
                message: error.message || 'Gift card order failed'
            }
        }

        const data = await response.json()

        return {
            success: true,
            transactionId: data.transactionId,
            redeemCode: data.redeemCode?.cardNumber,
            cardPin: data.redeemCode?.pinCode,
            status: data.status,
            message: `Gift card ordered successfully. Code sent to ${recipientEmail}`
        }

    } catch (error: any) {
        console.error('Gift card service error:', error)
        return {
            success: false,
            message: error.message || 'Gift card service error'
        }
    }
}

/**
 * Get order status/details
 */
export async function getOrderStatus(transactionId: number): Promise<{
    status: string
    redeemCode?: string
    cardPin?: string
} | null> {
    try {
        const token = await getGiftCardAccessToken()

        const response = await fetch(
            `${GIFTCARD_BASE_URL}/orders/transactions/${transactionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/com.reloadly.giftcards-v1+json'
                }
            }
        )

        if (!response.ok) {
            return null
        }

        const data = await response.json()
        return {
            status: data.status,
            redeemCode: data.redeemCode?.cardNumber,
            cardPin: data.redeemCode?.pinCode
        }
    } catch (error) {
        console.error('Failed to get order status:', error)
        return null
    }
}

/**
 * Check Gift Card API balance
 */
export async function getGiftCardBalance(): Promise<{ balance: number; currencyCode: string }> {
    const token = await getGiftCardAccessToken()

    const response = await fetch(`${GIFTCARD_BASE_URL}/accounts/balance`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get gift card balance')
    }

    const data = await response.json()
    return {
        balance: data.balance,
        currencyCode: data.currencyCode
    }
}

/**
 * Check if Gift Card service is configured
 */
export function isGiftCardConfigured(): boolean {
    return !!(RELOADLY_CLIENT_ID && RELOADLY_CLIENT_SECRET)
}

/**
 * Hardcoded popular gift card options for UI
 * These are commonly available across many countries
 */
export const POPULAR_GIFT_CARDS = [
    { id: 'amazon', name: 'Amazon', icon: '🛒' },
    { id: 'google_play', name: 'Google Play', icon: '▶️' },
    { id: 'steam', name: 'Steam', icon: '🎮' },
    { id: 'itunes', name: 'iTunes / Apple', icon: '🍎' },
    { id: 'netflix', name: 'Netflix', icon: '📺' },
    { id: 'spotify', name: 'Spotify', icon: '🎵' },
    { id: 'playstation', name: 'PlayStation', icon: '🎮' },
    { id: 'xbox', name: 'Xbox', icon: '🎮' },
]
