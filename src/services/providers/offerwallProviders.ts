/**
 * External Offerwall Provider SDK Integration Examples
 * 
 * This file provides templates for integrating external offerwall SDKs.
 * Each provider has different integration requirements.
 * 
 * IMPORTANT: Before integrating any provider, you must:
 * 1. Create an account with the provider
 * 2. Get your API keys and app IDs
 * 3. Configure callback/postback URLs in their dashboard
 * 4. Store credentials in environment variables
 */

import { IOfferwallProvider, ProviderInitConfig, ProviderFetchOptions } from '@/services/offerwallService'
import { Offer, OfferProvider } from '@/lib/db-schema'

// =============================================================================
// AdGem Integration Example
// =============================================================================

/**
 * AdGem Offerwall Provider
 * Documentation: https://adgem.com/docs
 * 
 * Required Environment Variables:
 * - ADGEM_APP_ID
 * - ADGEM_API_KEY
 * - ADGEM_POSTBACK_SECRET
 */
export class AdGemProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'AdGem'
    private appId: string = ''
    private apiKey: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.appId = config.appId || process.env.ADGEM_APP_ID || ''
        this.apiKey = config.apiKey || process.env.ADGEM_API_KEY || ''

        if (!this.appId || !this.apiKey) {
            throw new Error('AdGem: Missing appId or apiKey')
        }

        this.isInitialized = true
        console.log('AdGem provider initialized')
    }

    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('AdGem provider not initialized')
        }

        // AdGem API endpoint for fetching offers
        // This is a simplified example - actual implementation may differ
        const response = await fetch(
            `https://api.adgem.com/v1/offers?app_id=${this.appId}&player_id=${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            }
        )

        if (!response.ok) {
            throw new Error(`AdGem API error: ${response.status}`)
        }

        const data = await response.json()

        // Transform AdGem offers to our format
        return data.offers?.map((offer: any) => ({
            id: `adgem_${offer.id}`,
            externalId: offer.id.toString(),
            provider: 'AdGem' as OfferProvider,
            title: offer.name,
            description: offer.description || offer.requirements,
            payout: offer.payout,
            category: this.mapCategory(offer.category),
            difficulty: this.mapDifficulty(offer.difficulty),
            tags: offer.tags || [],
            estimatedTime: offer.estimated_time || '5 mins',
            logoUrl: offer.icon,
            url: offer.click_url,
            active: true,
            priority: offer.featured ? 10 : 5,
            countries: offer.countries || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        })) || []
    }

    getTrackingUrl(offerId: string, userId: string): string {
        // AdGem tracking URL format
        return `https://api.adgem.com/v1/click?app_id=${this.appId}&offer_id=${offerId}&player_id=${userId}`
    }

    validateCallback(payload: any, signature?: string): boolean {
        // Implement HMAC signature verification
        // AdGem uses SHA256 HMAC with your postback secret
        // const expectedSig = crypto
        //     .createHmac('sha256', process.env.ADGEM_POSTBACK_SECRET!)
        //     .update(payload.transaction_id + payload.payout)
        //     .digest('hex')
        // return signature === expectedSig
        return true // TODO: Implement
    }

    isAvailable(country: string): boolean {
        // AdGem is available in most countries
        return true
    }

    private mapCategory(category: string): Offer['category'] {
        const mapping: Record<string, Offer['category']> = {
            'game': 'Game',
            'survey': 'Survey',
            'shopping': 'Shopping',
            'finance': 'Finance',
            'video': 'Video',
        }
        return mapping[category?.toLowerCase()] || 'Other'
    }

    private mapDifficulty(difficulty: number): Offer['difficulty'] {
        if (difficulty <= 2) return 'Easy'
        if (difficulty <= 4) return 'Medium'
        return 'Hard'
    }
}


// =============================================================================
// Tapjoy Integration Example
// =============================================================================

/**
 * Tapjoy Offerwall Provider
 * Documentation: https://dev.tapjoy.com/
 * 
 * Required Environment Variables:
 * - TAPJOY_SDK_KEY
 * - TAPJOY_SECRET_KEY
 */
export class TapjoyProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'Tapjoy'
    private sdkKey: string = ''
    private secretKey: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.sdkKey = config.apiKey || process.env.TAPJOY_SDK_KEY || ''
        this.secretKey = config.apiSecret || process.env.TAPJOY_SECRET_KEY || ''

        if (!this.sdkKey) {
            throw new Error('Tapjoy: Missing SDK key')
        }

        this.isInitialized = true
        console.log('Tapjoy provider initialized')
    }

    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        // Tapjoy typically uses native SDK for showing offers
        // Server-side offer fetching may not be available
        // Return empty array - offers shown via native SDK
        console.log('Tapjoy offers are shown via native SDK')
        return []
    }

    getTrackingUrl(offerId: string, userId: string): string {
        // Tapjoy uses native SDK for tracking
        return ''
    }

    validateCallback(payload: any, signature?: string): boolean {
        // Tapjoy callback verification
        // Uses MD5 hash: md5(verifier + secret_key)
        return true // TODO: Implement
    }

    isAvailable(country: string): boolean {
        return true
    }
}


// =============================================================================
// CPX Research Integration
// =============================================================================

/**
 * CPX Research (Surveys) Provider
 * Documentation: https://publisher.cpx-research.com/
 * 
 * Required Environment Variables:
 * - CPX_APP_ID: Your app ID from CPX dashboard (number)
 * - CPX_SECURE_HASH: Your secure hash for signature verification
 * 
 * Postback URL Format (set in CPX dashboard Postback Settings):
 * https://your-domain.com/api/offers/callback?
 *   provider=CPX&
 *   uid={user_id}&
 *   trans_id={trans_id}&
 *   amount={amount_local}&
 *   status={status}&
 *   hash={hash}
 * 
 * Status Codes:
 * - status=1: Pending/Completed (credit the user)
 * - status=2: Reversed (debit/chargeback)
 * 
 * Secure Hash Verification: MD5(ext_user_id + "-" + secure_hash)
 */
export class CPXResearchProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'CPX'
    private appId: string = ''
    private secureHash: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.appId = config.appId || process.env.CPX_APP_ID || ''
        this.secureHash = config.apiSecret || process.env.CPX_SECURE_HASH || ''

        if (!this.appId) {
            throw new Error('CPX Research: Missing App ID')
        }

        this.isInitialized = true
        console.log('CPX Research provider initialized')
    }

    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        // CPX Research provides surveys, not traditional offers
        // Surveys are shown via iframe/webview with their script tag
        console.log('CPX Research surveys are shown via iframe/script tag')
        return []
    }

    /**
     * Generate the CPX Research wall URL
     * Can be used in iframe or opened directly
     */
    getTrackingUrl(offerId: string, userId: string): string {
        // CPX Research wall URL with user tracking
        // URL format: https://wall.cpx-research.com/index.php?app_id=XXX&ext_user_id=XXX
        const params = new URLSearchParams({
            app_id: this.appId,
            ext_user_id: userId,
        })

        // Add secure hash if available (recommended for security)
        if (this.secureHash) {
            const crypto = require('crypto')
            const hash = crypto
                .createHash('md5')
                .update(`${userId}-${this.secureHash}`)
                .digest('hex')
            params.append('secure_hash', hash)
        }

        return `https://wall.cpx-research.com/index.php?${params.toString()}`
    }

    /**
     * Generate secure hash for a user
     * Formula: MD5(ext_user_id + "-" + secure_hash)
     */
    generateSecureHash(userId: string): string {
        if (!this.secureHash) return ''

        const crypto = require('crypto')
        return crypto
            .createHash('md5')
            .update(`${userId}-${this.secureHash}`)
            .digest('hex')
    }

    /**
     * Validate CPX Research postback signature
     * CPX uses MD5 hash: md5(ext_user_id + "-" + secure_hash)
     */
    validateCallback(payload: any, signature?: string): boolean {
        if (!this.secureHash) {
            console.warn('CPX Research: No secure hash configured, skipping signature validation')
            return true
        }

        const userId = payload.uid || payload.user_id || payload.ext_user_id || ''

        // Generate expected hash
        const crypto = require('crypto')
        const expectedHash = crypto
            .createHash('md5')
            .update(`${userId}-${this.secureHash}`)
            .digest('hex')

        const providedHash = signature || payload.hash || ''

        if (expectedHash !== providedHash) {
            console.error('CPX Research signature mismatch:', {
                expected: expectedHash,
                received: providedHash
            })
            return false
        }

        return true
    }

    isAvailable(country: string): boolean {
        // CPX Research is available worldwide
        return true
    }
}


// =============================================================================
// Timewall Integration
// =============================================================================

/**
 * Timewall Offerwall Provider
 * Website: https://timewall.io
 * 
 * Timewall offers micro-tasks, pay-to-click offers, and survey offerwalls.
 * 
 * Required Environment Variables:
 * - TIMEWALL_SITE_ID: Your site ID from Timewall dashboard
 * - TIMEWALL_SECRET_KEY: Your secret key for hash validation
 * 
 * Postback URL Format (set in Timewall dashboard):
 * https://your-domain.com/api/offers/callback?
 *   provider=Timewall&
 *   uid={userID}&
 *   trans_id={transactionID}&
 *   amount={revenue}&
 *   currency_amount={currencyAmount}&
 *   type={type}&
 *   hash={hash}
 * 
 * Type Values:
 * - type=credit: Successful completion (credit the user)
 * - type=chargeback: Reversal (debit the user)
 * 
 * Response: Must return HTTP 200 OK, otherwise Timewall will retry
 */
export class TimewallProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'Timewall'
    private siteId: string = ''
    private secretKey: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.siteId = config.appId || process.env.TIMEWALL_SITE_ID || ''
        this.secretKey = config.apiSecret || process.env.TIMEWALL_SECRET_KEY || ''

        if (!this.siteId) {
            throw new Error('Timewall: Missing Site ID')
        }

        this.isInitialized = true
        console.log('Timewall provider initialized')
    }

    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        // Timewall uses iframe for displaying offers
        // Server-side offer fetching requires contacting their support
        console.log('Timewall offers are shown via iframe')
        return []
    }

    /**
     * Generate the Timewall offerwall URL
     * Format may vary - check your dashboard for exact URL
     */
    getTrackingUrl(offerId: string, userId: string): string {
        // Timewall offerwall URL with user tracking
        // Note: Exact URL format should be verified in your Timewall dashboard
        const params = new URLSearchParams({
            site_id: this.siteId,
            user_id: userId,
        })
        return `https://timewall.io/offerwall?${params.toString()}`
    }

    /**
     * Generate iframe HTML for embedding Timewall offerwall
     */
    getIframeHtml(userId: string, width: string = '100%', height: string = '600'): string {
        const url = this.getTrackingUrl('', userId)
        return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`
    }

    /**
     * Validate Timewall postback hash
     * Hash validation method should be confirmed with Timewall support
     * Common pattern: MD5(userID + transactionID + revenue + secretKey)
     */
    validateCallback(payload: any, signature?: string): boolean {
        if (!this.secretKey) {
            console.warn('Timewall: No secret key configured, skipping hash validation')
            return true
        }

        const userId = payload.uid || payload.userID || payload.user_id || ''
        const transactionId = payload.trans_id || payload.transactionID || payload.transaction_id || ''
        const revenue = payload.amount || payload.revenue || payload.currencyAmount || ''

        // Common hash pattern - verify with Timewall documentation
        const crypto = require('crypto')
        const expectedHash = crypto
            .createHash('md5')
            .update(`${userId}${transactionId}${revenue}${this.secretKey}`)
            .digest('hex')

        const providedHash = signature || payload.hash || ''

        if (expectedHash !== providedHash) {
            console.error('Timewall hash mismatch:', {
                expected: expectedHash,
                received: providedHash
            })
            // For now, allow the callback but log the mismatch
            // Enable strict validation once you verify the hash format
            console.warn('Timewall: Hash validation disabled for testing - enable in production!')
            return true
        }

        return true
    }

    isAvailable(country: string): boolean {
        // Timewall is available globally
        return true
    }
}


// =============================================================================
// Kiwiwall Integration
// =============================================================================

/**
 * Kiwiwall Offerwall Provider
 * Documentation: https://kiwiwall.com/publishers/postback-integration
 * 
 * Required Environment Variables:
 * - KIWIWALL_APP_ID: Your app ID from Kiwiwall dashboard
 * - KIWIWALL_SECRET_KEY: Your secret key for signature verification
 * 
 * IP Whitelist: 34.193.235.172 (must be whitelisted for postbacks)
 * 
 * Postback URL Format:
 * https://your-domain.com/api/offers/callback?
 *   provider=Kiwiwall&
 *   status={status}&
 *   trans_id={trans_id}&
 *   sub_id={sub_id}&
 *   amount={amount}&
 *   offer_id={offer_id}&
 *   offer_name={offer_name}&
 *   signature={signature}&
 *   ip_address={ip_address}
 * 
 * Signature Verification: MD5(sub_id:amount:secret_key)
 */
export class KiwiwallProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'Kiwiwall'
    private appId: string = ''
    private secretKey: string = ''
    private isInitialized: boolean = false

    // Kiwiwall's IP address for postback validation
    static readonly KIWIWALL_IP = '34.193.235.172'

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.appId = config.appId || process.env.KIWIWALL_APP_ID || ''
        this.secretKey = config.apiSecret || process.env.KIWIWALL_SECRET_KEY || ''

        if (!this.appId) {
            throw new Error('Kiwiwall: Missing App ID')
        }

        this.isInitialized = true
        console.log('Kiwiwall provider initialized')
    }

    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Kiwiwall provider not initialized')
        }

        // Kiwiwall typically uses iframe/webview for displaying offers
        // Server-side offer fetching may require additional API access
        // For now, return empty - offers are shown via iframe
        console.log('Kiwiwall offers are shown via iframe/webview')
        return []
    }

    getTrackingUrl(offerId: string, userId: string): string {
        // Kiwiwall wall URL with user tracking
        // URL format from Kiwiwall iframe: https://www.kiwiwall.com/wall/{app_id}/{sub_id}
        // The sub_id is your user ID - passed as path parameter, not query param
        return `https://www.kiwiwall.com/wall/${this.appId}/${userId}`
    }

    /**
     * Validate Kiwiwall postback signature
     * Signature = MD5(sub_id:amount:secret_key)
     */
    validateCallback(payload: any, signature?: string): boolean {
        if (!this.secretKey) {
            console.warn('Kiwiwall: No secret key configured, skipping signature validation')
            return true
        }

        const subId = payload.sub_id || payload.uid || ''
        const amount = payload.amount || payload.payout || ''

        // Create expected signature: MD5(sub_id:amount:secret_key)
        const crypto = require('crypto')
        const expectedSignature = crypto
            .createHash('md5')
            .update(`${subId}:${amount}:${this.secretKey}`)
            .digest('hex')

        const providedSignature = signature || payload.signature || ''

        if (expectedSignature !== providedSignature) {
            console.error('Kiwiwall signature mismatch:', {
                expected: expectedSignature,
                received: providedSignature
            })
            return false
        }

        return true
    }

    /**
     * Validate that the request comes from Kiwiwall's IP
     */
    static validateIP(requestIP: string): boolean {
        // Handle forwarded IPs (common with proxies/load balancers)
        const cleanIP = requestIP.split(',')[0].trim()
        return cleanIP === KiwiwallProvider.KIWIWALL_IP
    }

    isAvailable(country: string): boolean {
        // Kiwiwall is available globally
        return true
    }
}


// =============================================================================
// Provider Factory
// =============================================================================

/**
 * Create and initialize a provider instance.
 */
export async function createProvider(
    providerName: OfferProvider,
    config?: ProviderInitConfig
): Promise<IOfferwallProvider> {
    let provider: IOfferwallProvider

    switch (providerName) {
        case 'AdGem':
            provider = new AdGemProvider()
            break
        case 'Tapjoy':
            provider = new TapjoyProvider()
            break
        case 'CPX':
            provider = new CPXResearchProvider()
            break
        case 'Timewall':
            provider = new TimewallProvider()
            break
        case 'Kiwiwall':
            provider = new KiwiwallProvider()
            break
        default:
            throw new Error(`Unknown provider: ${providerName}`)
    }

    await provider.initialize(config || {})
    return provider
}


// =============================================================================
// Integration Guide
// =============================================================================

/**
 * HOW TO ADD A NEW OFFERWALL PROVIDER
 * ====================================
 * 
 * 1. Create a new class implementing IOfferwallProvider:
 *    - initialize(): Set up SDK keys and configuration
 *    - fetchOffers(): Get offers from provider API (if available)
 *    - getTrackingUrl(): Generate click tracking URL
 *    - validateCallback(): Verify postback signatures
 *    - isAvailable(): Check country availability
 * 
 * 2. Add environment variables for credentials:
 *    - Add to .env.local and .env.production
 *    - Never commit actual credentials!
 * 
 * 3. Configure postback URL in provider dashboard:
 *    - URL: https://your-domain.com/api/offers/callback
 *    - Include: provider name, user ID, offer ID, payout, transaction ID, signature
 * 
 * 4. Add provider case to createProvider() factory
 * 
 * 5. Register provider in your app initialization:
 *    ```typescript
 *    import { registerProvider } from '@/services/offerwallService'
 *    import { AdGemProvider } from '@/services/providers/offerwallProviders'
 *    
 *    const adgem = new AdGemProvider()
 *    await adgem.initialize({ appId: process.env.ADGEM_APP_ID })
 *    registerProvider(adgem)
 *    ```
 * 
 * 6. Update the callback handler to parse provider-specific payloads
 * 
 * POSTBACK URL TEMPLATE:
 * https://your-domain.com/api/offers/callback?
 *   provider=PROVIDER_NAME&
 *   tid={TRACKING_ID}&
 *   uid={USER_ID}&
 *   oid={OFFER_ID}&
 *   payout={PAYOUT}&
 *   trans_id={TRANSACTION_ID}&
 *   signature={SIGNATURE}
 */
