/**
 * Mini-Game Complete API Endpoint
 *
 * POST /api/mini-games/complete
 *
 * Complete a mini-game session and award points.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import {
    getMiniGameConfig,
    completeMiniGameSession,
} from '@/services/miniGameService'

interface CompleteResponse {
    success: boolean
    pointsAwarded: number
    dailyTotal?: number
    dailyCapRemaining?: number
    error?: string
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CompleteResponse>
) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            pointsAwarded: 0,
            error: 'Method not allowed. Use POST.',
        })
    }

    // Check if module is enabled
    const config = getMiniGameConfig()
    if (!config.enabled) {
        return res.status(503).json({
            success: false,
            pointsAwarded: 0,
            error: 'Mini-games are currently unavailable',
        })
    }

    const { sessionToken, duration, adWatched } = req.body

    // Validate required fields
    if (!sessionToken || typeof sessionToken !== 'string') {
        return res.status(400).json({
            success: false,
            pointsAwarded: 0,
            error: 'Missing or invalid sessionToken',
        })
    }

    try {
        const result = await completeMiniGameSession(
            sessionToken,
            typeof duration === 'number' ? duration : undefined,
            adWatched === true
        )

        if (!result.success && result.error !== 'Daily cap reached') {
            return res.status(400).json({
                success: false,
                pointsAwarded: 0,
                error: result.error,
            })
        }

        return res.status(200).json({
            success: result.success,
            pointsAwarded: result.pointsAwarded,
            dailyTotal: result.dailyTotal,
            dailyCapRemaining: result.dailyCapRemaining,
            error: result.error,
        })
    } catch (error) {
        console.error('Mini-game complete error:', error)
        return res.status(500).json({
            success: false,
            pointsAwarded: 0,
            error: 'Failed to complete game session',
        })
    }
}

export default allowCors(handler)
