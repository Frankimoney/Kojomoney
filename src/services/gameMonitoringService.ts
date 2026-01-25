/**
 * Game Monitoring Service
 *
 * Tracks metrics for game reward callbacks:
 * - Webhook success/failure rates
 * - Processing latency
 * - Rejected and suspicious callbacks
 */

import { db } from '@/lib/firebase-admin'
import { GameProvider } from '@/lib/games'

// =============================================================================
// Types
// =============================================================================

/**
 * Metrics for a game provider.
 */
export interface ProviderMetrics {
    /** Game provider */
    provider: GameProvider
    /** Total webhooks received */
    totalWebhooks: number
    /** Successful webhooks */
    successfulWebhooks: number
    /** Failed webhooks */
    failedWebhooks: number
    /** Rejected webhooks (signature/fraud) */
    rejectedWebhooks: number
    /** Average processing time in ms */
    avgProcessingTimeMs: number
    /** Total points credited */
    totalPointsCredited: number
    /** Time period start */
    periodStart: number
    /** Time period end */
    periodEnd: number
}

/**
 * Single metric entry.
 */
interface MetricEntry {
    provider: GameProvider
    timestamp: number
    success: boolean
    latencyMs: number
    rejected: boolean
    pointsCredited?: number
}

// In-memory metrics buffer (flushed periodically)
const metricsBuffer: MetricEntry[] = []
const BUFFER_FLUSH_THRESHOLD = 100

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Track webhook received metrics.
 *
 * @param provider - Game provider
 * @param success - Whether the webhook was processed successfully
 * @param latencyMs - Processing time in milliseconds
 * @param rejected - Whether the webhook was rejected (signature/fraud)
 * @param pointsCredited - Points credited if applicable
 */
export async function trackWebhookMetrics(
    provider: GameProvider,
    success: boolean,
    latencyMs: number,
    rejected: boolean = false,
    pointsCredited?: number
): Promise<void> {
    // Add to buffer
    metricsBuffer.push({
        provider,
        timestamp: Date.now(),
        success,
        latencyMs,
        rejected,
        pointsCredited,
    })

    // Flush if buffer is full
    if (metricsBuffer.length >= BUFFER_FLUSH_THRESHOLD) {
        await flushMetricsBuffer()
    }
}

/**
 * Flush metrics buffer to database.
 */
async function flushMetricsBuffer(): Promise<void> {
    if (!db || metricsBuffer.length === 0) {
        return
    }

    const entriesToFlush = [...metricsBuffer]
    metricsBuffer.length = 0 // Clear buffer

    try {
        const batch = db.batch()

        for (const entry of entriesToFlush) {
            const metricRef = db.collection('game_metrics').doc()
            batch.set(metricRef, entry)
        }

        await batch.commit()
    } catch (error) {
        console.error('Failed to flush metrics buffer:', error)
        // Re-add entries back to buffer on failure
        metricsBuffer.push(...entriesToFlush)
    }
}

/**
 * Get aggregated metrics for a provider.
 *
 * @param provider - Game provider
 * @param startTime - Start of time range
 * @param endTime - End of time range (defaults to now)
 * @returns Aggregated metrics
 */
export async function getProviderMetrics(
    provider: GameProvider,
    startTime: number,
    endTime: number = Date.now()
): Promise<ProviderMetrics> {
    const defaultMetrics: ProviderMetrics = {
        provider,
        totalWebhooks: 0,
        successfulWebhooks: 0,
        failedWebhooks: 0,
        rejectedWebhooks: 0,
        avgProcessingTimeMs: 0,
        totalPointsCredited: 0,
        periodStart: startTime,
        periodEnd: endTime,
    }

    if (!db) {
        return defaultMetrics
    }

    try {
        const snapshot = await db
            .collection('game_metrics')
            .where('provider', '==', provider)
            .where('timestamp', '>=', startTime)
            .where('timestamp', '<=', endTime)
            .get()

        if (snapshot.empty) {
            return defaultMetrics
        }

        let totalLatency = 0
        let successCount = 0
        let failedCount = 0
        let rejectedCount = 0
        let totalPoints = 0

        snapshot.docs.forEach((doc) => {
            const data = doc.data()
            totalLatency += data.latencyMs || 0

            if (data.success) {
                successCount++
            } else {
                failedCount++
            }

            if (data.rejected) {
                rejectedCount++
            }

            if (data.pointsCredited) {
                totalPoints += data.pointsCredited
            }
        })

        const totalWebhooks = snapshot.size

        return {
            provider,
            totalWebhooks,
            successfulWebhooks: successCount,
            failedWebhooks: failedCount,
            rejectedWebhooks: rejectedCount,
            avgProcessingTimeMs: totalWebhooks > 0 ? Math.round(totalLatency / totalWebhooks) : 0,
            totalPointsCredited: totalPoints,
            periodStart: startTime,
            periodEnd: endTime,
        }
    } catch (error) {
        console.error('Failed to get provider metrics:', error)
        return defaultMetrics
    }
}

/**
 * Get metrics for all providers.
 *
 * @param startTime - Start of time range
 * @param endTime - End of time range
 * @returns Metrics for all providers
 */
export async function getAllProviderMetrics(
    startTime: number,
    endTime: number = Date.now()
): Promise<ProviderMetrics[]> {
    const providers: GameProvider[] = ['gamezop', 'adjoe', 'qureka']
    const metrics: ProviderMetrics[] = []

    for (const provider of providers) {
        const providerMetrics = await getProviderMetrics(provider, startTime, endTime)
        metrics.push(providerMetrics)
    }

    return metrics
}

/**
 * Track signature validation result.
 *
 * @param provider - Game provider
 * @param valid - Whether signature was valid
 * @param transactionId - Transaction ID
 */
export async function trackSignatureValidation(
    provider: GameProvider,
    valid: boolean,
    transactionId?: string
): Promise<void> {
    if (!db) return

    try {
        await db.collection('signature_validations').add({
            provider,
            valid,
            transactionId,
            timestamp: Date.now(),
        })
    } catch (error) {
        console.error('Failed to track signature validation:', error)
    }
}

/**
 * Track conversion result.
 *
 * @param provider - Game provider
 * @param inputValue - Original value from provider
 * @param outputPoints - Converted points
 * @param userId - User ID
 */
export async function trackConversion(
    provider: GameProvider,
    inputValue: number,
    outputPoints: number,
    userId: string
): Promise<void> {
    if (!db) return

    try {
        await db.collection('conversion_logs').add({
            provider,
            inputValue,
            outputPoints,
            userId,
            conversionRate: inputValue > 0 ? outputPoints / inputValue : 0,
            timestamp: Date.now(),
        })
    } catch (error) {
        console.error('Failed to track conversion:', error)
    }
}

/**
 * Get webhook success rate for a provider.
 *
 * @param provider - Game provider
 * @param hours - Time window in hours
 * @returns Success rate (0-100)
 */
export async function getWebhookSuccessRate(
    provider: GameProvider,
    hours: number = 24
): Promise<number> {
    const startTime = Date.now() - hours * 60 * 60 * 1000
    const metrics = await getProviderMetrics(provider, startTime)

    if (metrics.totalWebhooks === 0) {
        return 100 // No webhooks = 100% success (no failures)
    }

    return Math.round((metrics.successfulWebhooks / metrics.totalWebhooks) * 100)
}

/**
 * Get summary statistics for dashboard.
 *
 * @param hours - Time window in hours
 * @returns Summary statistics
 */
export async function getDashboardStats(hours: number = 24): Promise<{
    totalWebhooks: number
    successRate: number
    avgLatencyMs: number
    totalPointsCredited: number
    rejectedCount: number
    byProvider: Record<GameProvider, {
        webhooks: number
        successRate: number
        points: number
    }>
}> {
    const startTime = Date.now() - hours * 60 * 60 * 1000
    const allMetrics = await getAllProviderMetrics(startTime)

    const totals = {
        webhooks: 0,
        successful: 0,
        latency: 0,
        points: 0,
        rejected: 0,
    }

    const byProvider: Record<GameProvider, { webhooks: number; successRate: number; points: number }> = {
        gamezop: { webhooks: 0, successRate: 0, points: 0 },
        adjoe: { webhooks: 0, successRate: 0, points: 0 },
        qureka: { webhooks: 0, successRate: 0, points: 0 },
    }

    for (const metrics of allMetrics) {
        totals.webhooks += metrics.totalWebhooks
        totals.successful += metrics.successfulWebhooks
        totals.latency += metrics.avgProcessingTimeMs * metrics.totalWebhooks
        totals.points += metrics.totalPointsCredited
        totals.rejected += metrics.rejectedWebhooks

        byProvider[metrics.provider] = {
            webhooks: metrics.totalWebhooks,
            successRate: metrics.totalWebhooks > 0
                ? Math.round((metrics.successfulWebhooks / metrics.totalWebhooks) * 100)
                : 100,
            points: metrics.totalPointsCredited,
        }
    }

    return {
        totalWebhooks: totals.webhooks,
        successRate: totals.webhooks > 0
            ? Math.round((totals.successful / totals.webhooks) * 100)
            : 100,
        avgLatencyMs: totals.webhooks > 0
            ? Math.round(totals.latency / totals.webhooks)
            : 0,
        totalPointsCredited: totals.points,
        rejectedCount: totals.rejected,
        byProvider,
    }
}

// Flush buffer on process exit
process.on('beforeExit', async () => {
    await flushMetricsBuffer()
})

export default {
    trackWebhookMetrics,
    trackSignatureValidation,
    trackConversion,
    getProviderMetrics,
    getAllProviderMetrics,
    getWebhookSuccessRate,
    getDashboardStats,
}
