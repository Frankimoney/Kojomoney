/**
 * Game Fraud Detection Service
 *
 * Handles fraud detection for game reward callbacks including:
 * - Rate limiting (credits per minute/hour/day)
 * - User ID validation
 * - Velocity threshold checking
 * - Suspicious event logging
 */

import { db } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
    GameProvider,
    SuspiciousEvent,
    FraudConfig,
    DEFAULT_FRAUD_CONFIG,
} from '@/lib/games'

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a fraud check.
 */
export interface FraudCheckResult {
    /** Whether all fraud checks passed */
    passed: boolean
    /** Fraud signals detected */
    signals: string[]
    /** Risk score (0-100) */
    riskScore: number
    /** Whether user should be flagged for review */
    shouldFlag: boolean
    /** Rate limit details */
    rateLimits?: {
        minuteCount: number
        hourCount: number
        dayCount: number
    }
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Perform comprehensive fraud check for a game callback.
 *
 * @param userId - User ID to check
 * @param provider - Game provider
 * @param sessionUserId - User ID from the session (for validation)
 * @param callbackUserId - User ID from the callback (for validation)
 * @param config - Optional custom fraud configuration
 * @returns Fraud check result
 */
export async function performFraudCheck(
    userId: string,
    provider: GameProvider,
    sessionUserId?: string,
    callbackUserId?: string,
    config: FraudConfig = DEFAULT_FRAUD_CONFIG
): Promise<FraudCheckResult> {
    const signals: string[] = []
    let riskScore = 0

    // 1. Validate user ID match if session provided
    if (sessionUserId && callbackUserId && sessionUserId !== callbackUserId) {
        signals.push('user_id_mismatch')
        riskScore += 50

        await logSuspiciousEvent({
            userId,
            eventType: 'user_id_mismatch',
            provider,
            details: {
                sessionUserId,
                callbackUserId,
            },
            riskScore: 50,
        })
    }

    // 2. Check rate limits
    const rateLimits = await checkRateLimits(userId, provider, config)

    if (rateLimits.minuteExceeded) {
        signals.push('rate_limit_minute_exceeded')
        riskScore += 30

        await logSuspiciousEvent({
            userId,
            eventType: 'rate_limit_exceeded',
            provider,
            details: {
                type: 'minute',
                count: rateLimits.minuteCount,
                limit: config.maxCreditsPerMinute,
            },
            riskScore: 30,
        })
    }

    if (rateLimits.hourExceeded) {
        signals.push('rate_limit_hour_exceeded')
        riskScore += 20
    }

    if (rateLimits.dayExceeded) {
        signals.push('rate_limit_day_exceeded')
        riskScore += 25

        await logSuspiciousEvent({
            userId,
            eventType: 'daily_velocity_exceeded',
            provider,
            details: {
                count: rateLimits.dayCount,
                limit: config.maxCreditsPerDay,
            },
            riskScore: 25,
        })
    }

    // 3. Check for suspicious patterns
    const patternCheck = await checkSuspiciousPatterns(userId, provider)
    if (patternCheck.suspicious) {
        signals.push(...patternCheck.signals)
        riskScore += patternCheck.riskScore
    }

    // Determine if user should be flagged
    const shouldFlag = riskScore >= config.flagThreshold

    // Flag user if threshold exceeded
    if (shouldFlag) {
        await flagUserForReview(userId, signals, riskScore)
    }

    return {
        passed: signals.length === 0,
        signals,
        riskScore: Math.min(riskScore, 100),
        shouldFlag,
        rateLimits: {
            minuteCount: rateLimits.minuteCount,
            hourCount: rateLimits.hourCount,
            dayCount: rateLimits.dayCount,
        },
    }
}

/**
 * Check rate limits for credits.
 *
 * @param userId - User ID
 * @param provider - Game provider
 * @param config - Fraud configuration
 * @returns Rate limit check results
 */
async function checkRateLimits(
    userId: string,
    provider: GameProvider,
    config: FraudConfig
): Promise<{
    minuteCount: number
    hourCount: number
    dayCount: number
    minuteExceeded: boolean
    hourExceeded: boolean
    dayExceeded: boolean
}> {
    if (!db) {
        return {
            minuteCount: 0,
            hourCount: 0,
            dayCount: 0,
            minuteExceeded: false,
            hourExceeded: false,
            dayExceeded: false,
        }
    }

    const now = Date.now()
    const oneMinuteAgo = new Date(now - 60 * 1000)
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)

    try {
        // Query game transactions for this user
        const transactionsRef = db.collection('game_transactions')

        // Count transactions in last minute
        const minuteSnapshot = await transactionsRef
            .where('userId', '==', userId)
            .where('status', '==', 'credited')
            .where('createdAt', '>=', oneMinuteAgo.getTime())
            .get()
        const minuteCount = minuteSnapshot.size

        // Count transactions in last hour
        const hourSnapshot = await transactionsRef
            .where('userId', '==', userId)
            .where('status', '==', 'credited')
            .where('createdAt', '>=', oneHourAgo.getTime())
            .get()
        const hourCount = hourSnapshot.size

        // Count transactions in last day
        const daySnapshot = await transactionsRef
            .where('userId', '==', userId)
            .where('status', '==', 'credited')
            .where('createdAt', '>=', oneDayAgo.getTime())
            .get()
        const dayCount = daySnapshot.size

        return {
            minuteCount,
            hourCount,
            dayCount,
            minuteExceeded: minuteCount >= config.maxCreditsPerMinute,
            hourExceeded: hourCount >= config.maxCreditsPerHour,
            dayExceeded: dayCount >= config.maxCreditsPerDay,
        }
    } catch (error) {
        console.error('Failed to check rate limits:', error)
        return {
            minuteCount: 0,
            hourCount: 0,
            dayCount: 0,
            minuteExceeded: false,
            hourExceeded: false,
            dayExceeded: false,
        }
    }
}

/**
 * Check for suspicious activity patterns.
 *
 * @param userId - User ID
 * @param provider - Game provider
 * @returns Pattern check result
 */
async function checkSuspiciousPatterns(
    userId: string,
    provider: GameProvider
): Promise<{
    suspicious: boolean
    signals: string[]
    riskScore: number
}> {
    if (!db) {
        return { suspicious: false, signals: [], riskScore: 0 }
    }

    const signals: string[] = []
    let riskScore = 0

    try {
        // Check for multiple providers in short time (potential abuse)
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
        const recentTxSnapshot = await db
            .collection('game_transactions')
            .where('userId', '==', userId)
            .where('createdAt', '>=', fifteenMinutesAgo)
            .get()

        if (!recentTxSnapshot.empty) {
            const providers = new Set<string>()
            recentTxSnapshot.docs.forEach((doc) => {
                providers.add(doc.data().provider)
            })

            // Using all 3 providers in 15 minutes is suspicious
            if (providers.size >= 3) {
                signals.push('multiple_providers_short_time')
                riskScore += 15
            }
        }

        // Check for recent suspicious events
        const recentEventsSnapshot = await db
            .collection('suspicious_events')
            .where('userId', '==', userId)
            .where('createdAt', '>=', Date.now() - 24 * 60 * 60 * 1000)
            .get()

        if (recentEventsSnapshot.size >= 3) {
            signals.push('repeated_suspicious_activity')
            riskScore += 20
        }
    } catch (error) {
        console.error('Failed to check suspicious patterns:', error)
    }

    return {
        suspicious: signals.length > 0,
        signals,
        riskScore,
    }
}

/**
 * Log a suspicious event for audit and review.
 *
 * @param event - Event details (without id and createdAt)
 */
export async function logSuspiciousEvent(
    event: Omit<SuspiciousEvent, 'id' | 'createdAt'>
): Promise<void> {
    if (!db) {
        console.error('Database not available for logging suspicious event:', event)
        return
    }

    try {
        await db.collection('suspicious_events').add({
            ...event,
            createdAt: Date.now(),
        })

        console.warn('Suspicious event logged:', {
            userId: event.userId,
            eventType: event.eventType,
            provider: event.provider,
            riskScore: event.riskScore,
        })
    } catch (error) {
        console.error('Failed to log suspicious event:', error)
    }
}

/**
 * Flag a user for review by admins.
 *
 * @param userId - User ID to flag
 * @param signals - Fraud signals detected
 * @param riskScore - Cumulative risk score
 */
async function flagUserForReview(
    userId: string,
    signals: string[],
    riskScore: number
): Promise<void> {
    if (!db) {
        return
    }

    try {
        // Update user document with fraud flag
        await db.collection('users').doc(userId).update({
            fraudFlagged: true,
            fraudFlaggedAt: Date.now(),
            fraudSignals: signals,
            fraudRiskScore: riskScore,
        })

        // Create review queue entry
        await db.collection('fraud_review_queue').add({
            userId,
            signals,
            riskScore,
            status: 'pending',
            createdAt: Date.now(),
        })

        console.warn('User flagged for fraud review:', {
            userId,
            signals,
            riskScore,
        })
    } catch (error) {
        console.error('Failed to flag user for review:', error)
    }
}

/**
 * Validate that callback user ID matches session user ID.
 *
 * @param sessionUserId - User ID from the game session
 * @param callbackUserId - User ID from the provider callback
 * @returns True if they match or session is not available
 */
export function validateUserIdMatch(
    sessionUserId: string | undefined,
    callbackUserId: string
): boolean {
    if (!sessionUserId) {
        // No session to validate against - allow but log
        console.warn('No session user ID to validate against')
        return true
    }

    return sessionUserId === callbackUserId
}

/**
 * Log callback with invalid signature.
 *
 * @param provider - Game provider
 * @param transactionId - Provider transaction ID
 * @param userId - User ID if available
 * @param payload - Raw payload
 */
export async function logInvalidSignature(
    provider: GameProvider,
    transactionId: string,
    userId: string | undefined,
    payload: Record<string, unknown>
): Promise<void> {
    await logSuspiciousEvent({
        userId: userId || 'unknown',
        eventType: 'invalid_signature',
        provider,
        transactionId,
        details: {
            payload: JSON.stringify(payload).substring(0, 500), // Truncate for storage
        },
        riskScore: 40,
    })
}

/**
 * Get user's fraud score based on recent activity.
 *
 * @param userId - User ID
 * @returns Aggregate fraud risk score
 */
export async function getUserFraudScore(userId: string): Promise<number> {
    if (!db) {
        return 0
    }

    try {
        // Get recent suspicious events
        const eventsSnapshot = await db
            .collection('suspicious_events')
            .where('userId', '==', userId)
            .where('createdAt', '>=', Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            .get()

        if (eventsSnapshot.empty) {
            return 0
        }

        // Sum up risk scores
        let totalScore = 0
        eventsSnapshot.docs.forEach((doc) => {
            totalScore += doc.data().riskScore || 0
        })

        // Cap at 100
        return Math.min(totalScore, 100)
    } catch (error) {
        console.error('Failed to get user fraud score:', error)
        return 0
    }
}

export default {
    performFraudCheck,
    logSuspiciousEvent,
    validateUserIdMatch,
    logInvalidSignature,
    getUserFraudScore,
}
