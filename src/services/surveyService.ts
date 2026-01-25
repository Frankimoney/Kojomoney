/**
 * Survey Service
 * 
 * Handles fetching surveys from:
 * 1. Internal database (admin-created surveys)
 * 2. External Africa providers (Wannads, Adgate, Monlix) via /api/surveywalls
 */

import { Survey, SurveyCompletion } from '@/lib/db-schema'
import { apiJson, apiCall } from '@/lib/api-client'

// =============================================================================
// Types
// =============================================================================

export interface SurveyFilters {
    provider?: Survey['provider']
    minPayout?: number
    maxPayout?: number
    tags?: string[]
}

export interface SurveyListResponse {
    surveys: Survey[]
    total: number
    page: number
    limit: number
}

export interface SurveyStats {
    todayCompleted: number
    pendingCredits: number
    totalEarned: number
}

export interface ExternalSurveyWall {
    provider: string
    name: string
    description: string
    color: string
    types: string[]
    bestFor: string
    url: string | null
    available: boolean
    message?: string
}

export interface SurveyWallsResponse {
    surveyWalls: ExternalSurveyWall[]
    configured: boolean
    userId?: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch surveys from the backend API (internal surveys).
 */
export async function fetchSurveys(
    userId: string,
    filters?: SurveyFilters,
    page: number = 1,
    limit: number = 20
): Promise<SurveyListResponse> {
    try {
        const params = new URLSearchParams({
            userId,
            page: page.toString(),
            limit: limit.toString(),
        })

        if (filters?.provider) params.append('provider', filters.provider)
        if (filters?.minPayout) params.append('minPayout', filters.minPayout.toString())
        if (filters?.maxPayout) params.append('maxPayout', filters.maxPayout.toString())
        if (filters?.tags?.length) params.append('tags', filters.tags.join(','))

        return await apiJson<SurveyListResponse>(`/api/surveys?${params.toString()}`)
    } catch (error) {
        console.error('Failed to fetch surveys:', error)
        return { surveys: [], total: 0, page, limit }
    }
}

/**
 * Fetch external survey walls from Africa providers (Wannads, Adgate, Monlix).
 * These are iframe/webview URLs, not individual surveys.
 */
export async function fetchExternalSurveyWalls(
    userId: string
): Promise<SurveyWallsResponse> {
    try {
        const response = await apiCall(`/api/surveywalls?userId=${encodeURIComponent(userId)}`)

        if (!response.ok) {
            throw new Error('Failed to fetch survey walls')
        }

        return await response.json()
    } catch (error) {
        console.error('Failed to fetch external survey walls:', error)
        return { surveyWalls: [], configured: false }
    }
}

/**
 * Fetch individual surveys from external providers (API-based).
 * Note: Most providers only support iframe walls, so this may return empty.
 */
export async function fetchExternalSurveys(
    userId: string,
    provider?: string
): Promise<Survey[]> {
    try {
        const params = new URLSearchParams({
            userId,
            fetch: 'true',
        })

        if (provider) {
            params.append('provider', provider)
        }

        const response = await apiCall(`/api/surveywalls?${params.toString()}`)

        if (!response.ok) {
            return []
        }

        const data = await response.json()
        return data.surveys || []
    } catch (error) {
        console.error('Failed to fetch external surveys:', error)
        return []
    }
}

/**
 * Update survey status (completed, disqualified).
 */
export async function updateSurveyStatus(
    userId: string,
    surveyId: string,
    status: 'completed' | 'disqualified',
    externalTransactionId?: string
): Promise<{ success: boolean; completionId?: string }> {
    try {
        return await apiJson('/api/surveys/status', {
            method: 'POST',
            body: JSON.stringify({ userId, surveyId, status, externalTransactionId }),
        })
    } catch (error) {
        console.error('Failed to update survey status:', error)
        return { success: false }
    }
}

/**
 * Get user's survey completion history.
 */
export async function getSurveyHistory(
    userId: string,
    limit: number = 50
): Promise<SurveyCompletion[]> {
    try {
        const response = await apiJson<{ completions: SurveyCompletion[] }>(
            `/api/surveys/history?userId=${userId}&limit=${limit}`
        )
        return response.completions
    } catch (error) {
        console.error('Failed to fetch survey history:', error)
        return []
    }
}

export default {
    fetchSurveys,
    fetchExternalSurveyWalls,
    fetchExternalSurveys,
    updateSurveyStatus,
    getSurveyHistory,
}
