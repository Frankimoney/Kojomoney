/**
 * Mini-Game Stats API Endpoint
 *
 * GET /api/mini-games/stats
 *
 * Get user's mini-game stats for today.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import {
    getMiniGameConfig,
    getUserMiniGameStats,
    MINI_GAMES,
    MiniGameUserStats,
    MiniGame,
} from '@/services/miniGameService'

interface StatsResponse {
    success: boolean
    stats?: MiniGameUserStats
    games?: MiniGame[]
    config?: {
        rewardPerSession: number
        dailyCap: number
        minDurationSeconds: number
    }
    error?: string
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<StatsResponse>
) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use GET.',
        })
    }

    // Check if module is enabled
    const config = getMiniGameConfig()
    if (!config.enabled) {
        return res.status(503).json({
            success: false,
            error: 'Mini-games are currently unavailable',
        })
    }

    const { userId } = req.query

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid userId',
        })
    }

    try {
        const stats = await getUserMiniGameStats(userId)

        return res.status(200).json({
            success: true,
            stats,
            games: MINI_GAMES,
            config: {
                rewardPerSession: config.rewardPerSession,
                dailyCap: config.dailyCap,
                minDurationSeconds: config.minDurationSeconds,
            },
        })
    } catch (error) {
        console.error('Mini-game stats error:', error)
        return res.status(500).json({
            success: false,
            error: 'Failed to get game stats',
        })
    }
}

export default allowCors(handler)
