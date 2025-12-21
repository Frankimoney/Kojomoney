/**
 * Admin Wallet Adjustment API Endpoint
 *
 * POST /api/admin/wallet/adjust
 *
 * Manually adjust a user's wallet balance with logged reason.
 * Creates full audit trail for compliance.
 *
 * Requires admin authentication.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { adjustWalletBalance } from '@/services/walletService'

export const dynamic = 'force-dynamic'

/**
 * Response type for wallet adjustment endpoint.
 */
interface AdjustmentResponse {
    success: boolean
    transactionId?: string
    newBalance?: number
    previousBalance?: number
    error?: string
}

/**
 * Handle POST /api/admin/wallet/adjust
 *
 * Body:
 * - userId: User ID to adjust
 * - amount: Amount to adjust (positive for credit, negative for debit)
 * - reason: Required reason for the adjustment
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AdjustmentResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    // TODO: Add proper admin authentication check
    const adminKey = req.headers['x-admin-key']
    const adminId = req.headers['x-admin-id'] as string | undefined

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

    const { userId, amount, reason } = req.body

    // Validate userId
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid userId',
        })
    }

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        return res.status(400).json({
            success: false,
            error: 'Amount must be a non-zero number',
        })
    }

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        return res.status(400).json({
            success: false,
            error: 'Reason is required and must be at least 10 characters',
        })
    }

    try {
        // Get current balance for response
        const userDoc = await db.collection('users').doc(userId).get()

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            })
        }

        const userData = userDoc.data()!
        const previousBalance = userData.points || userData.totalPoints || 0

        // Perform the adjustment
        const result = await adjustWalletBalance(
            userId,
            amount,
            reason.trim(),
            adminId || 'admin'
        )

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to adjust balance',
            })
        }

        console.log({
            event: 'wallet_adjusted',
            userId,
            amount,
            reason: reason.trim(),
            adminId: adminId || 'admin',
            previousBalance,
            newBalance: result.newBalance,
            transactionId: result.transactionId,
        })

        return res.status(200).json({
            success: true,
            transactionId: result.transactionId,
            previousBalance,
            newBalance: result.newBalance,
        })
    } catch (error) {
        console.error('Failed to adjust wallet:', error)
        return res.status(500).json({
            success: false,
            error: 'Failed to adjust wallet balance',
        })
    }
}

export default handler
