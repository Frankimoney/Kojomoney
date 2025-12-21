/**
 * Admin Game Transactions API Endpoint
 *
 * GET /api/admin/games/transactions
 *
 * View game provider transactions with filtering options.
 * Requires admin authentication.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { GameProvider, GameTransaction, isValidProvider } from '@/lib/games'

export const dynamic = 'force-dynamic'

/**
 * Response type for transactions endpoint.
 */
interface TransactionsResponse {
    success: boolean
    transactions?: GameTransaction[]
    total?: number
    page?: number
    limit?: number
    error?: string
}

/**
 * Handle GET /api/admin/games/transactions
 *
 * Query parameters:
 * - provider: Filter by game provider
 * - userId: Filter by user ID
 * - status: Filter by transaction status
 * - startDate: Start of date range (ISO string)
 * - endDate: End of date range (ISO string)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<TransactionsResponse>
) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    // TODO: Add proper admin authentication check
    // For now, we'll check for an admin header (replace with proper auth)
    const adminKey = req.headers['x-admin-key']
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        // Allow if ADMIN_API_KEY is not set (development mode)
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

    try {
        // Parse query parameters
        const {
            provider,
            userId,
            status,
            startDate,
            endDate,
            page = '1',
            limit = '50',
        } = req.query

        const pageNum = Math.max(1, parseInt(String(page)))
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))))

        // Build query
        let query: FirebaseFirestore.Query = db.collection('game_transactions')

        // Apply filters
        if (provider && typeof provider === 'string' && isValidProvider(provider)) {
            query = query.where('provider', '==', provider)
        }

        if (userId && typeof userId === 'string') {
            query = query.where('userId', '==', userId)
        }

        if (status && typeof status === 'string') {
            query = query.where('status', '==', status)
        }

        if (startDate && typeof startDate === 'string') {
            const startTime = new Date(startDate).getTime()
            if (!isNaN(startTime)) {
                query = query.where('createdAt', '>=', startTime)
            }
        }

        if (endDate && typeof endDate === 'string') {
            const endTime = new Date(endDate).getTime()
            if (!isNaN(endTime)) {
                query = query.where('createdAt', '<=', endTime)
            }
        }

        // Order and paginate
        query = query.orderBy('createdAt', 'desc')

        // Get total count (approximate - Firestore doesn't have efficient count)
        const countSnapshot = await query.limit(1000).get()
        const total = countSnapshot.size

        // Get paginated results
        const offset = (pageNum - 1) * limitNum
        const snapshot = await query.offset(offset).limit(limitNum).get()

        const transactions: GameTransaction[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        } as GameTransaction))

        return res.status(200).json({
            success: true,
            transactions,
            total,
            page: pageNum,
            limit: limitNum,
        })
    } catch (error) {
        console.error('Failed to fetch game transactions:', error)
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions',
        })
    }
}

export default handler
