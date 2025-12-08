/**
 * Offerwall Service
 * 
 * Handles fetching offers from database and external providers.
 * Designed to be extensible for future SDK integrations.
 */

import { Offer, OfferCompletion, OfferProvider, OfferCategory } from '@/lib/db-schema'
import { apiJson } from '@/lib/api-client'

// =============================================================================
// Types
// =============================================================================

export interface OfferFilters {
    provider?: OfferProvider
    category?: OfferCategory
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    minPayout?: number
    maxPayout?: number
    tags?: string[]
    country?: string
}

export interface OfferListResponse {
    offers: Offer[]
    total: number
    page: number
    limit: number
}

export interface StartOfferResponse {
    success: boolean
    trackingId: string
    redirectUrl: string
}

export interface OfferStats {
    todayEarnings: number
    todayGoal: number
    totalCompleted: number
    pendingPayouts: number
}

// =============================================================================
// Provider Interface for External SDKs
// =============================================================================

/**
 * Interface for external offerwall provider SDKs.
 * Implement this interface when integrating new providers like AdGem, Tapjoy, etc.
 */
export interface IOfferwallProvider {
    readonly name: OfferProvider

    /** Initialize the provider SDK */
    initialize(config: ProviderInitConfig): Promise<void>

    /** Fetch available offers from the provider */
    fetchOffers(userId: string, options?: ProviderFetchOptions): Promise<Offer[]>

    /** Generate tracking URL for starting an offer */
    getTrackingUrl(offerId: string, userId: string): string

    /** Validate a postback/callback from the provider */
    validateCallback(payload: any, signature?: string): boolean

    /** Check if provider is available in user's country */
    isAvailable(country: string): boolean
}

export interface ProviderInitConfig {
    apiKey?: string
    apiSecret?: string
    appId?: string
    userId?: string
    sandbox?: boolean
}

export interface ProviderFetchOptions {
    limit?: number
    category?: OfferCategory
    country?: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch offers from the backend API.
 * This fetches offers stored in the database (from admin panel or synced from providers).
 */
export async function fetchOffers(
    userId: string,
    filters?: OfferFilters,
    page: number = 1,
    limit: number = 20
): Promise<OfferListResponse> {
    try {
        const params = new URLSearchParams({
            userId,
            page: page.toString(),
            limit: limit.toString(),
        })

        if (filters?.provider) params.append('provider', filters.provider)
        if (filters?.category) params.append('category', filters.category)
        if (filters?.difficulty) params.append('difficulty', filters.difficulty)
        if (filters?.minPayout) params.append('minPayout', filters.minPayout.toString())
        if (filters?.maxPayout) params.append('maxPayout', filters.maxPayout.toString())
        if (filters?.tags?.length) params.append('tags', filters.tags.join(','))
        if (filters?.country) params.append('country', filters.country)

        return await apiJson<OfferListResponse>(`/api/offers?${params.toString()}`)
    } catch (error) {
        console.error('Failed to fetch offers:', error)
        // Return empty list on error
        return { offers: [], total: 0, page, limit }
    }
}

/**
 * Start an offer - records the attempt and returns tracking URL.
 */
export async function startOffer(
    userId: string,
    offerId: string
): Promise<StartOfferResponse> {
    return await apiJson<StartOfferResponse>('/api/offers/start', {
        method: 'POST',
        body: JSON.stringify({ userId, offerId }),
    })
}

/**
 * Get user's offer statistics.
 */
export async function getOfferStats(userId: string): Promise<OfferStats> {
    try {
        return await apiJson<OfferStats>(`/api/offers/stats?userId=${userId}`)
    } catch (error) {
        console.error('Failed to fetch offer stats:', error)
        return {
            todayEarnings: 0,
            todayGoal: 500,
            totalCompleted: 0,
            pendingPayouts: 0,
        }
    }
}

/**
 * Get user's offer completion history.
 */
export async function getOfferHistory(
    userId: string,
    status?: OfferCompletion['status'],
    limit: number = 50
): Promise<OfferCompletion[]> {
    try {
        const params = new URLSearchParams({ userId, limit: limit.toString() })
        if (status) params.append('status', status)

        const response = await apiJson<{ completions: OfferCompletion[] }>(
            `/api/offers/history?${params.toString()}`
        )
        return response.completions
    } catch (error) {
        console.error('Failed to fetch offer history:', error)
        return []
    }
}

// =============================================================================
// Provider Registry
// =============================================================================

/**
 * Registry for external offerwall providers.
 * Add new providers here when implementing SDK integrations.
 */
const providerRegistry: Map<OfferProvider, IOfferwallProvider> = new Map()

/**
 * Register an offerwall provider.
 */
export function registerProvider(provider: IOfferwallProvider): void {
    providerRegistry.set(provider.name, provider)
}

/**
 * Get a registered provider.
 */
export function getProvider(name: OfferProvider): IOfferwallProvider | undefined {
    return providerRegistry.get(name)
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): IOfferwallProvider[] {
    return Array.from(providerRegistry.values())
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get difficulty color classes for UI.
 */
export function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
        case 'Easy':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        case 'Medium':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
        case 'Hard':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
}

/**
 * Get category icon name for UI.
 */
export function getCategoryIcon(category: OfferCategory): string {
    switch (category) {
        case 'Game': return 'gamepad-2'
        case 'Survey': return 'clipboard-list'
        case 'Shopping': return 'shopping-cart'
        case 'Finance': return 'wallet'
        case 'Video': return 'play-circle'
        case 'Install': return 'download'
        case 'Social': return 'share-2'
        default: return 'circle'
    }
}

/**
 * Format payout for display.
 */
export function formatPayout(payout: number): string {
    if (payout >= 1000) {
        return `${(payout / 1000).toFixed(1)}K`
    }
    return payout.toString()
}

// =============================================================================
// Default Export
// =============================================================================

export default {
    fetchOffers,
    startOffer,
    getOfferStats,
    getOfferHistory,
    registerProvider,
    getProvider,
    getAllProviders,
    getDifficultyColor,
    getCategoryIcon,
    formatPayout,
}
