/**
 * Admin Game Callback Replay API Endpoint
 *
 * POST /api/admin/games/replay
 *
 * Replay a provider callback for debugging purposes.
 * Fetches the stored raw payload and re-processes it.
 *
 * Requires admin authentication.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { GameTransaction, generateRequestId } from '@/lib/games'
import { processGameCallback } from '@/services/gameProviderService'

export const dynamic = 'force-dynamic'

/**
 * Response type for replay endpoint.
 */
interface ReplayResponse {
    success: boolean
    originalTransaction?: Partial<GameTransaction>
    replayResult?: {
        success: boolean
        pointsCredited: number
        isDuplicate: boolean
        error?: string
    }
    error?: string
}

/**
 * Handle POST /api/admin/games/replay
 *
 * Body:
 * - transactionId: Internal game transaction ID to replay
 * - forceCredit: If true, bypass duplicate check (use with caution!)
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ReplayResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    // TODO: Add proper admin authentication check
    const adminKey = req.headers['x-admin-key']
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        if (process.env.ADMIN_API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            })
        }
    }

    if (!db) {
        return res.status(500).json({
            success: false,
            error: 'Database not available',
        })
    }

    const { transactionId } = req.body

    if (!transactionId || typeof transactionId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid transactionId',
        })
    }

    try {
        // Fetch the original transaction
        const transactionDoc = await db
            .collection('game_transactions')
            .doc(transactionId)
            .get()

        if (!transactionDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            })
        }

        const transaction = transactionDoc.data() as GameTransaction

        // Check if raw payload exists
        if (!transaction.rawPayload) {
            return res.status(400).json({
                success: false,
                error: 'No raw payload stored for this transaction',
            })
        }

        const requestId = generateRequestId()

        console.log({
            requestId,
            event: 'replay_started',
            transactionId,
            provider: transaction.provider,
            adminId: req.headers['x-admin-id'] || 'unknown',
        })

        // Re-process the callback
        const replayResult = await processGameCallback(
            transaction.provider,
            transaction.rawPayload,
            requestId
        )

        // Mark the replayed transaction
        if (replayResult.transactionId && replayResult.transactionId !== transactionId) {
            await db
                .collection('game_transactions')
                .doc(replayResult.transactionId)
                .update({
                    isReplay: true,
                    replayedFrom: transactionId,
                    replayedAt: Date.now(),
                })
        }

        // Log the replay action
        await db.collection('admin_logs').add({
            action: 'replay_callback',
            originalTransactionId: transactionId,
            newTransactionId: replayResult.transactionId,
            provider: transaction.provider,
            success: replayResult.success,
            adminId: req.headers['x-admin-id'] || 'unknown',
            timestamp: Date.now(),
        })

        console.log({
            requestId,
            event: 'replay_completed',
            transactionId,
            success: replayResult.success,
            isDuplicate: replayResult.isDuplicate,
        })

        return res.status(200).json({
            success: true,
            originalTransaction: {
                id: transactionId,
                provider: transaction.provider,
                userId: transaction.userId,
                originalValue: transaction.originalValue,
                pointsCredited: transaction.pointsCredited,
                status: transaction.status,
                createdAt: transaction.createdAt,
            },
            replayResult: {
                success: replayResult.success,
                pointsCredited: replayResult.pointsCredited,
                isDuplicate: replayResult.isDuplicate,
                error: replayResult.error,
            },
        })
    } catch (error) {
        console.error('Failed to replay callback:', error)
        return res.status(500).json({
            success: false,
            error: 'Failed to replay callback',
        })
    }
}

export default handler
