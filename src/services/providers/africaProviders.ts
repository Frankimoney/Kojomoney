/**
 * Africa-Focused Offerwall & Survey Provider Integrations
 * 
 * IMPORTANT: Each provider has SEPARATE APIs for:
 * - OFFERWALLS: Games, app installs, sign-ups (high engagement offers)
 * - SURVEYS: Paid market research surveys
 * 
 * This separation allows:
 * - Offerwall feature → Uses offerwall endpoints
 * - Survey feature → Uses survey endpoints
 * 
 * Providers integrated:
 * - Wannads: Separate offerwall and survey APIs
 * - Adgate Media: Single API with category filtering
 * - Monlix: Separate campaigns (offers) and surveys endpoints
 */

import { IOfferwallProvider, ProviderInitConfig, ProviderFetchOptions } from '@/services/offerwallService'
import { Offer, OfferProvider, OfferCategory } from '@/lib/db-schema'
import crypto from 'crypto'

// =============================================================================
// WANNADS INTEGRATION
// Website: https://wannads.com
// Has SEPARATE APIs: Offerwall API + Survey API
// =============================================================================

/**
 * Wannads Provider
 * 
 * Wannads has SEPARATE endpoints:
 * - Offerwall: https://platform.wannads.com/api/offerwall/offers (games, apps)
 * - Surveys: Dedicated survey iframe/webview
 * 
 * Required Environment Variables:
 * - WANNADS_APP_ID: Your Wannads App ID
 * - WANNADS_API_KEY: Your Wannads API Key
 * - WANNADS_SECRET_KEY: For postback verification
 */
export class WannadsProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'Wannads'
    private appId: string = ''
    private apiKey: string = ''
    private secretKey: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.appId = config.appId || process.env.WANNADS_APP_ID || ''
        this.apiKey = config.apiKey || process.env.WANNADS_API_KEY || ''
        this.secretKey = config.apiSecret || process.env.WANNADS_SECRET_KEY || ''

        if (!this.appId || !this.apiKey) {
            throw new Error('Wannads: Missing appId or apiKey')
        }

        this.isInitialized = true
        console.log('[Wannads] Provider initialized')
    }

    /**
     * Fetch OFFERWALL content (games, app installs, sign-ups)
     * Excludes surveys - those use fetchSurveys()
     */
    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Wannads provider not initialized')
        }

        try {
            // Wannads Offerwall API - for games, apps, signups (NOT surveys)
            const params = new URLSearchParams({
                apiKey: this.apiKey,
                userId: userId,
                excludeCategory: 'survey_router', // Exclude surveys from offerwall
            })

            const response = await fetch(
                `https://platform.wannads.com/api/offerwall/offers?${params.toString()}`
            )

            if (!response.ok) {
                console.error('[Wannads] Offerwall API error:', response.status)
                return []
            }

            const data = await response.json()

            return (data.offers || data.data || [])
                .filter((offer: any) => {
                    // Double-check: exclude any surveys
                    const cat = (offer.category || offer.type || '').toLowerCase()
                    return !cat.includes('survey')
                })
                .map((offer: any) => ({
                    id: `wannads_offer_${offer.id}`,
                    externalId: offer.id?.toString() || '',
                    provider: 'Wannads' as OfferProvider,
                    title: offer.title || offer.name,
                    description: offer.description || offer.instructions || '',
                    payout: Math.round((offer.payout || offer.reward || 0) * 100),
                    category: this.mapOfferCategory(offer.category || offer.type),
                    difficulty: this.mapDifficulty(offer.difficulty),
                    tags: ['offer', 'wannads'],
                    estimatedTime: offer.estimated_time || '5-10 mins',
                    logoUrl: offer.icon_url || offer.image,
                    url: offer.click_url || offer.tracking_url,
                    active: true,
                    priority: offer.featured ? 10 : 5,
                    countries: offer.countries || ['NG', 'KE', 'GH', 'ZA'],
                    requirements: offer.requirements,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }))
        } catch (error) {
            console.error('[Wannads] Failed to fetch offerwall:', error)
            return []
        }
    }

    /**
     * Fetch SURVEYS only from Wannads
     */
    async fetchSurveys(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Wannads provider not initialized')
        }

        try {
            const params = new URLSearchParams({
                apiKey: this.apiKey,
                userId: userId,
            })

            // Use the survey-specific endpoint or filter
            const response = await fetch(
                `https://api.wannads.com/api/surveys?${params.toString()}`
            )

            if (!response.ok) {
                console.error('[Wannads] Survey API error:', response.status)
                return []
            }

            const data = await response.json()

            return (data.surveys || data.data || []).map((survey: any) => ({
                id: `wannads_survey_${survey.id}`,
                externalId: survey.id?.toString() || '',
                provider: 'Wannads' as OfferProvider,
                title: survey.title || survey.name || 'Wannads Survey',
                description: survey.description || `Earn points by completing this survey`,
                payout: Math.round((survey.payout || survey.reward || 0) * 100),
                category: 'Survey' as OfferCategory,
                difficulty: this.mapSurveyDifficulty(survey.length || survey.loi),
                tags: ['survey', 'wannads'],
                estimatedTime: survey.length ? `${survey.length} mins` : '10 mins',
                logoUrl: survey.icon_url || null,
                url: survey.click_url || survey.url,
                active: true,
                priority: 5,
                countries: survey.countries || [],
                requirements: survey.qualification,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }))
        } catch (error) {
            console.error('[Wannads] Failed to fetch surveys:', error)
            return []
        }
    }

    /**
     * Offerwall iframe URL (games, apps - NO surveys)
     */
    getOfferwallUrl(userId: string): string {
        return `https://earn.wannads.com/wall?apiKey=${this.apiKey}&userId=${userId}`
    }

    /**
     * Survey wall iframe URL (surveys ONLY)
     */
    getSurveyWallUrl(userId: string): string {
        return `https://earn.wannads.com/survey-wall?apiKey=${this.apiKey}&userId=${userId}`
    }

    getTrackingUrl(offerId: string, userId: string): string {
        return `https://wannads.com/offers/${offerId}?apiKey=${this.apiKey}&userId=${userId}`
    }

    validateCallback(payload: any, signature?: string): boolean {
        if (!this.secretKey || !signature) {
            return true
        }

        try {
            const dataToSign = `${payload.user_id}${payload.transaction_id}${payload.payout}`
            const expectedSig = crypto
                .createHmac('sha256', this.secretKey)
                .update(dataToSign)
                .digest('hex')
            return signature === expectedSig
        } catch {
            return false
        }
    }

    isAvailable(country: string): boolean {
        const africanCountries = ['NG', 'KE', 'GH', 'ZA', 'EG', 'TZ', 'UG', 'RW', 'ET', 'SN', 'CI', 'CM']
        return africanCountries.includes(country.toUpperCase())
    }

    private mapOfferCategory(category: string): OfferCategory {
        const mapping: Record<string, OfferCategory> = {
            'game': 'Game', 'games': 'Game', 'gaming': 'Game',
            'app': 'Install', 'install': 'Install', 'download': 'Install',
            'video': 'Video', 'watch': 'Video',
            'shopping': 'Shopping',
            'signup': 'Other', 'registration': 'Other',
        }
        return mapping[category?.toLowerCase()] || 'Other'
    }

    private mapDifficulty(difficulty: string | number): 'Easy' | 'Medium' | 'Hard' {
        if (typeof difficulty === 'number') {
            if (difficulty <= 2) return 'Easy'
            if (difficulty <= 4) return 'Medium'
            return 'Hard'
        }
        return 'Medium'
    }

    private mapSurveyDifficulty(lengthMinutes: number | string): 'Easy' | 'Medium' | 'Hard' {
        const mins = typeof lengthMinutes === 'string' ? parseInt(lengthMinutes) : lengthMinutes
        if (!mins || isNaN(mins)) return 'Medium'
        if (mins <= 5) return 'Easy'
        if (mins <= 15) return 'Medium'
        return 'Hard'
    }
}


// =============================================================================
// ADGATE MEDIA INTEGRATION
// Website: https://adgatemedia.com
// Single API with category filtering for offers vs surveys
// =============================================================================

/**
 * Adgate Media Provider
 * 
 * Adgate uses a SINGLE API but supports category filtering:
 * - Filter by category to get games/apps (for offerwall)
 * - Filter by category to get surveys (for survey wall)
 * 
 * API Endpoint: https://api.adgatemedia.com/v3/offers
 */
export class AdgateProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'Adgate'
    private appId: string = ''
    private apiKey: string = ''
    private secretKey: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.appId = config.appId || process.env.ADGATE_APP_ID || ''
        this.apiKey = config.apiKey || process.env.ADGATE_API_KEY || ''
        this.secretKey = config.apiSecret || process.env.ADGATE_SECRET_KEY || ''

        if (!this.appId) {
            throw new Error('Adgate: Missing appId')
        }

        this.isInitialized = true
        console.log('[Adgate] Provider initialized')
    }

    /**
     * Fetch OFFERS only (games, apps, installs - NOT surveys)
     */
    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Adgate provider not initialized')
        }

        try {
            const params = new URLSearchParams({
                aid: this.appId,
                user_id: userId,
            })

            if (this.apiKey) {
                params.append('api_key', this.apiKey)
            }

            const response = await fetch(
                `https://api.adgatemedia.com/v3/offers?${params.toString()}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            )

            if (!response.ok) {
                console.error('[Adgate] API error:', response.status)
                return []
            }

            const data = await response.json()

            // Filter to get ONLY offers (games, apps) - exclude surveys
            return (data.offers || data.data || [])
                .filter((offer: any) => {
                    const cat = (offer.category || offer.vertical || offer.type || '').toLowerCase()
                    return !cat.includes('survey')
                })
                .map((offer: any) => ({
                    id: `adgate_offer_${offer.id}`,
                    externalId: offer.id?.toString() || '',
                    provider: 'Adgate' as OfferProvider,
                    title: offer.anchor || offer.name || offer.title,
                    description: offer.description || offer.instructions || '',
                    payout: Math.round(parseFloat(offer.points || offer.payout || 0)),
                    category: this.mapOfferCategory(offer.category || offer.type),
                    difficulty: this.mapDifficulty(offer.epc),
                    tags: ['offer', 'adgate'],
                    estimatedTime: offer.estimated_time || '10 mins',
                    logoUrl: offer.image || offer.icon,
                    url: offer.offerlink || offer.click_url,
                    active: true,
                    priority: offer.featured ? 10 : 5,
                    countries: offer.countries || [],
                    requirements: offer.instructions,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }))
        } catch (error) {
            console.error('[Adgate] Failed to fetch offers:', error)
            return []
        }
    }

    /**
     * Fetch SURVEYS only from Adgate
     */
    async fetchSurveys(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Adgate provider not initialized')
        }

        try {
            const params = new URLSearchParams({
                aid: this.appId,
                user_id: userId,
            })

            if (this.apiKey) {
                params.append('api_key', this.apiKey)
            }

            const response = await fetch(
                `https://api.adgatemedia.com/v3/offers?${params.toString()}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            )

            if (!response.ok) {
                console.error('[Adgate] Survey API error:', response.status)
                return []
            }

            const data = await response.json()

            // Filter to get ONLY surveys
            return (data.offers || data.data || [])
                .filter((offer: any) => {
                    const cat = (offer.category || offer.vertical || offer.type || '').toLowerCase()
                    return cat.includes('survey')
                })
                .map((survey: any) => ({
                    id: `adgate_survey_${survey.id}`,
                    externalId: survey.id?.toString() || '',
                    provider: 'Adgate' as OfferProvider,
                    title: survey.anchor || survey.name || 'Adgate Survey',
                    description: survey.description || 'Complete this survey to earn points',
                    payout: Math.round(parseFloat(survey.points || survey.payout || 0)),
                    category: 'Survey' as OfferCategory,
                    difficulty: 'Medium' as const,
                    tags: ['survey', 'adgate'],
                    estimatedTime: survey.estimated_time || '10 mins',
                    logoUrl: survey.image || survey.icon,
                    url: survey.offerlink || survey.click_url,
                    active: true,
                    priority: 5,
                    countries: survey.countries || [],
                    requirements: survey.instructions,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }))
        } catch (error) {
            console.error('[Adgate] Failed to fetch surveys:', error)
            return []
        }
    }

    /**
     * Offerwall iframe URL (games, apps, offers - not surveys)
     */
    getOfferwallUrl(userId: string): string {
        return `https://wall.adgaterewards.com/oEy${this.appId}/${this.appId}?s1=${userId}`
    }

    /**
     * Survey wall iframe URL - Adgate doesn't have separate survey wall
     * but we use the same URL with survey filter
     */
    getSurveyWallUrl(userId: string): string {
        return `https://wall.adgaterewards.com/oEy${this.appId}/${this.appId}?s1=${userId}&category=survey`
    }

    getTrackingUrl(offerId: string, userId: string): string {
        return `https://wall.adgaterewards.com/nz9wYK/${this.appId}?s1=${userId}&offer_id=${offerId}`
    }

    validateCallback(payload: any, signature?: string): boolean {
        if (!this.secretKey) {
            return true
        }

        try {
            const dataToSign = `${payload.uid || payload.user_id}${payload.payout}${this.secretKey}`
            const expectedSig = crypto.createHash('md5').update(dataToSign).digest('hex')
            return signature === expectedSig
        } catch {
            return false
        }
    }

    isAvailable(country: string): boolean {
        return true // Adgate has global coverage
    }

    private mapOfferCategory(category: string): OfferCategory {
        const mapping: Record<string, OfferCategory> = {
            'games': 'Game', 'gaming': 'Game', 'game': 'Game',
            'apps': 'Install', 'mobile': 'Install', 'install': 'Install',
            'videos': 'Video', 'video': 'Video',
            'shopping': 'Shopping', 'ecommerce': 'Shopping',
            'finance': 'Finance', 'fintech': 'Finance',
        }
        return mapping[category?.toLowerCase()] || 'Other'
    }

    private mapDifficulty(epc: number | string): 'Easy' | 'Medium' | 'Hard' {
        const rate = typeof epc === 'string' ? parseFloat(epc) : epc
        if (!rate || isNaN(rate)) return 'Medium'
        if (rate > 0.5) return 'Easy'
        if (rate > 0.2) return 'Medium'
        return 'Hard'
    }
}


// =============================================================================
// MONLIX INTEGRATION
// Website: https://monlix.com
// Has SEPARATE APIs: Campaigns (offers) + Surveys
// =============================================================================

/**
 * Monlix Provider
 * 
 * Monlix has SEPARATE endpoints:
 * - Campaigns/Offers: https://api.monlix.com/api/campaigns
 * - Surveys: https://api.monlix.com/api/surveys
 */
export class MonlixProvider implements IOfferwallProvider {
    readonly name: OfferProvider = 'Monlix'
    private appId: string = ''
    private apiKey: string = ''
    private secretKey: string = ''
    private isInitialized: boolean = false

    async initialize(config: ProviderInitConfig): Promise<void> {
        this.appId = config.appId || process.env.MONLIX_APP_ID || ''
        this.apiKey = config.apiKey || process.env.MONLIX_API_KEY || ''
        this.secretKey = config.apiSecret || process.env.MONLIX_SECRET_KEY || ''

        if (!this.appId) {
            throw new Error('Monlix: Missing appId')
        }

        this.isInitialized = true
        console.log('[Monlix] Provider initialized')
    }

    /**
     * Fetch OFFERS (campaigns) - games, apps, installs (NOT surveys)
     * Uses the campaigns endpoint
     */
    async fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Monlix provider not initialized')
        }

        try {
            // Monlix Campaigns API - for offers, NOT surveys
            const params = new URLSearchParams({
                appid: this.appId,
                userid: userId,
            })

            const response = await fetch(
                `https://api.monlix.com/api/campaigns/?${params.toString()}`
            )

            if (!response.ok) {
                console.error('[Monlix] Campaigns API error:', response.status)
                return []
            }

            const data = await response.json()

            return (data.campaigns || data.offers || data.data || [])
                .filter((offer: any) => {
                    // Exclude surveys from campaigns
                    const type = (offer.type || offer.category || '').toLowerCase()
                    return !type.includes('survey')
                })
                .map((offer: any) => ({
                    id: `monlix_offer_${offer.id}`,
                    externalId: offer.id?.toString() || '',
                    provider: 'Monlix' as OfferProvider,
                    title: offer.title || offer.name,
                    description: offer.description || '',
                    payout: Math.round((offer.payout || offer.reward || 0) * 100),
                    category: this.mapOfferCategory(offer.type || offer.category),
                    difficulty: this.mapDifficulty(offer.estimated_time),
                    tags: ['offer', 'monlix'],
                    estimatedTime: offer.estimated_time || '10 mins',
                    logoUrl: offer.image_url || offer.icon,
                    url: offer.click_url || offer.url,
                    active: true,
                    priority: offer.is_featured ? 10 : 5,
                    countries: offer.countries || [],
                    requirements: offer.requirements,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }))
        } catch (error) {
            console.error('[Monlix] Failed to fetch campaigns:', error)
            return []
        }
    }

    /**
     * Fetch SURVEYS only from Monlix
     * Uses the dedicated surveys endpoint
     */
    async fetchSurveys(userId: string, options?: ProviderFetchOptions): Promise<Offer[]> {
        if (!this.isInitialized) {
            throw new Error('Monlix provider not initialized')
        }

        try {
            // Monlix Surveys API - SEPARATE from campaigns
            const params = new URLSearchParams({
                appid: this.appId,
                userid: userId,
            })

            const response = await fetch(
                `https://api.monlix.com/api/surveys?${params.toString()}`
            )

            if (!response.ok) {
                console.error('[Monlix] Surveys API error:', response.status)
                return []
            }

            const data = await response.json()

            return (data.surveys || data.data || []).map((survey: any) => ({
                id: `monlix_survey_${survey.id}`,
                externalId: survey.id?.toString() || '',
                provider: 'Monlix' as OfferProvider,
                title: survey.title || survey.name || 'Monlix Survey',
                description: survey.description || `Complete this ${survey.length_of_interview || 10} min survey`,
                payout: Math.round((survey.payout || survey.reward || 0) * 100),
                category: 'Survey' as OfferCategory,
                difficulty: this.mapSurveyDifficulty(survey.length_of_interview),
                tags: ['survey', 'monlix'],
                estimatedTime: survey.length_of_interview ? `${survey.length_of_interview} mins` : '10 mins',
                logoUrl: survey.image_url || null,
                url: survey.click_url || survey.url,
                active: true,
                priority: 5,
                countries: survey.countries || [],
                requirements: survey.qualification,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }))
        } catch (error) {
            console.error('[Monlix] Failed to fetch surveys:', error)
            return []
        }
    }

    /**
     * Offerwall iframe URL (offers/campaigns - NO surveys)
     */
    getOfferwallUrl(userId: string): string {
        return `https://offers.monlix.com/?appid=${this.appId}&userid=${userId}&type=offers`
    }

    /**
     * Survey wall iframe URL (surveys ONLY)
     */
    getSurveyWallUrl(userId: string): string {
        return `https://offers.monlix.com/?appid=${this.appId}&userid=${userId}&type=surveys`
    }

    getTrackingUrl(offerId: string, userId: string): string {
        return `https://offers.monlix.com/${this.appId}?user_id=${userId}&offer_id=${offerId}`
    }

    validateCallback(payload: any, signature?: string): boolean {
        if (!this.secretKey) {
            return true
        }

        try {
            const dataToSign = `${payload.uid || payload.user_id}${payload.tid || payload.transaction_id}${payload.payout}`
            const expectedHash = crypto
                .createHmac('sha256', this.secretKey)
                .update(dataToSign)
                .digest('hex')
            return signature === expectedHash || payload.hash === expectedHash
        } catch {
            return false
        }
    }

    isAvailable(country: string): boolean {
        return true // Monlix has global coverage
    }

    private mapOfferCategory(type: string): OfferCategory {
        const mapping: Record<string, OfferCategory> = {
            'game': 'Game', 'games': 'Game', 'gaming': 'Game',
            'install': 'Install', 'app': 'Install', 'download': 'Install',
            'video': 'Video', 'videos': 'Video',
            'signup': 'Other', 'registration': 'Other',
        }
        return mapping[type?.toLowerCase()] || 'Other'
    }

    private mapDifficulty(timeOrDifficulty: number | string): 'Easy' | 'Medium' | 'Hard' {
        const time = typeof timeOrDifficulty === 'string' ? parseInt(timeOrDifficulty) : timeOrDifficulty
        if (!time || isNaN(time)) return 'Medium'
        if (time <= 5) return 'Easy'
        if (time <= 15) return 'Medium'
        return 'Hard'
    }

    private mapSurveyDifficulty(lengthMinutes: number | string): 'Easy' | 'Medium' | 'Hard' {
        const mins = typeof lengthMinutes === 'string' ? parseInt(lengthMinutes) : lengthMinutes
        if (!mins || isNaN(mins)) return 'Medium'
        if (mins <= 5) return 'Easy'
        if (mins <= 15) return 'Medium'
        return 'Hard'
    }
}


// =============================================================================
// PROVIDER FACTORY & UTILITIES
// =============================================================================

/**
 * Create and initialize an Africa-focused provider
 */
export async function createAfricaProvider(
    providerName: 'Wannads' | 'Adgate' | 'Monlix',
    config?: ProviderInitConfig
): Promise<IOfferwallProvider> {
    let provider: IOfferwallProvider

    switch (providerName) {
        case 'Wannads':
            provider = new WannadsProvider()
            break
        case 'Adgate':
            provider = new AdgateProvider()
            break
        case 'Monlix':
            provider = new MonlixProvider()
            break
        default:
            throw new Error(`Unknown Africa provider: ${providerName}`)
    }

    await provider.initialize(config || {})
    return provider
}

/**
 * Get OFFERWALL iframe URLs (games, apps, offers - NOT surveys)
 */
export function getOfferwallUrls(userId: string): Record<string, string> {
    const appIds = {
        wannads: process.env.WANNADS_API_KEY || '',
        adgate: process.env.ADGATE_APP_ID || '',
        monlix: process.env.MONLIX_APP_ID || '',
    }

    return {
        wannads: `https://earn.wannads.com/wall?apiKey=${appIds.wannads}&userId=${userId}`,
        adgate: `https://wall.adgaterewards.com/oEy${appIds.adgate}/${appIds.adgate}?s1=${userId}`,
        monlix: `https://offers.monlix.com/?appid=${appIds.monlix}&userid=${userId}&type=offers`,
    }
}

/**
 * Get SURVEY WALL iframe URLs (surveys ONLY)
 */
export function getSurveyWallUrls(userId: string): Record<string, string> {
    const appIds = {
        wannads: process.env.WANNADS_API_KEY || '',
        adgate: process.env.ADGATE_APP_ID || '',
        monlix: process.env.MONLIX_APP_ID || '',
    }

    return {
        wannads: `https://earn.wannads.com/survey-wall?apiKey=${appIds.wannads}&userId=${userId}`,
        adgate: `https://wall.adgaterewards.com/oEy${appIds.adgate}/${appIds.adgate}?s1=${userId}&category=survey`,
        monlix: `https://offers.monlix.com/?appid=${appIds.monlix}&userid=${userId}&type=surveys`,
    }
}

/**
 * Provider info for UI display
 */
export const AFRICA_PROVIDER_INFO = {
    Wannads: {
        name: 'Wannads',
        description: 'High-paying tasks with strong African market coverage',
        logo: '/providers/wannads.png',
        color: '#6366f1',
        offerwall_types: ['Game', 'Install', 'Watch'],
        survey_types: ['Survey'],
        best_for_offerwalls: 'App installs & games',
        best_for_surveys: 'High-paying surveys',
    },
    Adgate: {
        name: 'Adgate Media',
        description: 'Diverse offerwalls with global reach',
        logo: '/providers/adgate.png',
        color: '#10b981',
        offerwall_types: ['Game', 'Install', 'Video'],
        survey_types: ['Survey'],
        best_for_offerwalls: 'Game offers & app installs',
        best_for_surveys: 'Quick surveys',
    },
    Monlix: {
        name: 'Monlix',
        description: 'Global platform with African support',
        logo: '/providers/monlix.png',
        color: '#f59e0b',
        offerwall_types: ['Install', 'Sign-up'],
        survey_types: ['Survey'],
        best_for_offerwalls: 'Easy tasks',
        best_for_surveys: 'High volume surveys',
    },
} as const

export default {
    WannadsProvider,
    AdgateProvider,
    MonlixProvider,
    createAfricaProvider,
    getOfferwallUrls,
    getSurveyWallUrls,
    AFRICA_PROVIDER_INFO,
}
