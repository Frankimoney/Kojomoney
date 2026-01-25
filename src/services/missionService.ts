/**
 * Mission Service
 * 
 * Handles fetching missions (affiliate offers) from database.
 * Includes affiliate compliance tracking.
 */

import { Mission, MissionProgress } from '@/lib/db-schema'
import { apiJson } from '@/lib/api-client'

// =============================================================================
// Types
// =============================================================================

export interface MissionWithProgress extends Mission {
    userProgress: MissionProgress | null
    status: MissionProgress['status']
    completedSteps: string[]
}

export interface MissionFilters {
    type?: Mission['type']
    status?: MissionProgress['status']
    difficulty?: Mission['difficulty']
}

export interface MissionListResponse {
    missions: MissionWithProgress[]
    total: number
}

export interface MissionProgressUpdate {
    userId: string
    missionId: string
    action: 'start' | 'complete_step' | 'submit_proof' | 'complete'
    stepId?: string
    proofUrl?: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch missions with user progress.
 */
export async function fetchMissions(
    userId: string,
    filters?: MissionFilters
): Promise<MissionListResponse> {
    try {
        const params = new URLSearchParams({ userId })

        if (filters?.type) params.append('type', filters.type)
        if (filters?.status) params.append('status', filters.status)

        return await apiJson<MissionListResponse>(`/api/missions?${params.toString()}`)
    } catch (error) {
        console.error('Failed to fetch missions:', error)
        return { missions: [], total: 0 }
    }
}

/**
 * Update mission progress.
 */
export async function updateMissionProgress(
    update: MissionProgressUpdate
): Promise<{ success: boolean; progress?: MissionProgress; pointsEarned?: number }> {
    try {
        return await apiJson('/api/missions/progress', {
            method: 'POST',
            body: JSON.stringify(update),
        })
    } catch (error) {
        console.error('Failed to update mission progress:', error)
        return { success: false }
    }
}

/**
 * Track affiliate link click for compliance.
 */
export async function trackAffiliateClick(
    userId: string,
    missionId: string,
    affiliateUrl: string
): Promise<void> {
    try {
        await apiJson('/api/missions/track-click', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                missionId,
                affiliateUrl,
                timestamp: Date.now(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            }),
        })
    } catch (error) {
        // Don't block user action on tracking failure
        console.error('Failed to track affiliate click:', error)
    }
}

// =============================================================================
// Affiliate Compliance Helpers
// =============================================================================

/**
 * Get affiliate disclosure text based on mission type.
 */
export function getAffiliateDisclosure(type: Mission['type']): string {
    switch (type) {
        case 'referral':
            return 'This is a referral link. We may earn a commission when you sign up.'
        case 'social':
            return 'Following, sharing, or engaging with this content may earn you rewards.'
        case 'review':
            return 'Honest reviews only. You must disclose that you received compensation.'
        case 'install':
            return 'Affiliate link. We may earn a commission if you install and use this app.'
        default:
            return 'This link may contain affiliate tracking. We may earn a commission from your activity.'
    }
}

/**
 * Check if a mission requires affiliate disclosure.
 */
export function requiresAffiliateDisclosure(mission: Mission): boolean {
    // All missions with external URLs require disclosure
    return true
}

/**
 * Get FTC compliance warning for proof submission.
 */
export function getFTCComplianceWarning(): string {
    return 'By completing this mission, you agree to disclose any compensation received when posting reviews or endorsements publicly, as required by FTC guidelines.'
}

export default {
    fetchMissions,
    updateMissionProgress,
    trackAffiliateClick,
    getAffiliateDisclosure,
    requiresAffiliateDisclosure,
    getFTCComplianceWarning,
}
