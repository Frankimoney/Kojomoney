/**
 * Qureka Lite Callback API Endpoint
 *
 * POST /api/games/callback/qureka
 *
 * Receives coin reward callbacks from Qureka Lite.
 * Converts coins to points and credits user wallet.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { generateRequestId } from '@/lib/games'
import { processGameCallback } from '@/services/gameProviderService'
import { trackWebhookMetrics } from '@/services/gameMonitoringService'

export const dynamic = 'force-dynamic'

/**
 * Response type for callback endpoint.
 */
interface CallbackResponse {
    success: boolean
    message?: string
    transactionId?: string
    pointsCredited?: number
    error?: string
}

/**
 * Handle POST /api/games/callback/qureka
 *
 * Qureka callback payload format:
 * {
 *   transactionId: string,    // Unique transaction ID from Qureka
 *   userId: string,           // User's external ID (our user ID)
 *   coins: number,            // Coins earned in quiz
 *   quizId: string,           // Quiz identifier
 *   signature: string,        // HMAC signature for verification
 *   timestamp: number         // Unix timestamp
 * }
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CallbackResponse>
) {
    const requestId = generateRequestId()
    const startTime = Date.now()

    // Log incoming request
    console.log({
        requestId,
        event: 'qureka_callback_received',
        method: req.method,
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    })

    // Accept both POST and GET
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    if (!db) {
        console.error({ requestId, event: 'db_unavailable' })
        return res.status(500).json({
            success: false,
            error: 'Database not available',
        })
    }

    try {
        // Get payload from body or query params
        const payload = req.method === 'GET' ? req.query : req.body

        // Ensure payload is an object
        if (!payload || typeof payload !== 'object') {
            console.warn({
                requestId,
                event: 'invalid_payload',
                payload,
            })
            return res.status(400).json({
                success: false,
                error: 'Invalid payload',
            })
        }

        // Process the callback
        const result = await processGameCallback('qureka', payload as Record<string, unknown>, requestId)

        // Track metrics
        await trackWebhookMetrics('qureka', result.success, Date.now() - startTime, !result.success)

        // Log result
        console.log({
            requestId,
            event: 'qureka_callback_processed',
            success: result.success,
            isDuplicate: result.isDuplicate,
            pointsCredited: result.pointsCredited,
            transactionId: result.transactionId,
            processingTimeMs: Date.now() - startTime,
        })

        // Return appropriate response
        if (result.statusCode === 403) {
            return res.status(403).json({
                success: false,
                error: result.error || 'Forbidden',
            })
        }

        if (result.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Bad request',
            })
        }

        if (!result.success && result.statusCode === 500) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Internal error',
            })
        }

        // Success response
        return res.status(200).json({
            success: true,
            message: result.isDuplicate ? 'Already processed' : 'Quiz coins credited',
            transactionId: result.transactionId,
            pointsCredited: result.pointsCredited,
        })
    } catch (error) {
        console.error({
            requestId,
            event: 'qureka_callback_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        })

        // Track error
        await trackWebhookMetrics('qureka', false, Date.now() - startTime, true)

        return res.status(500).json({
            success: false,
            error: 'Failed to process callback',
        })
    }
}

export default handler
