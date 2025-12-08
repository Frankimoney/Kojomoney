/**
 * Survey Service
 * 
 * Handles fetching surveys from database and external providers.
 */

import { Survey, SurveyCompletion } from '@/lib/db-schema'
import { apiJson } from '@/lib/api-client'

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

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch surveys from the backend API.
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
    updateSurveyStatus,
    getSurveyHistory,
}
