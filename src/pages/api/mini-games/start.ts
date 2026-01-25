/**
 * Mini-Game Start API Endpoint
 *
 * POST /api/mini-games/start
 *
 * Start a mini-game session. Returns session token and game URL.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import {
    getMiniGameConfig,
    startMiniGameSession,
    getUserMiniGameStats,
    MINI_GAMES,
} from '@/services/miniGameService'

interface StartResponse {
    success: boolean
    sessionToken?: string
    gameUrl?: string
    error?: string
    cooldownRemaining?: number
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<StartResponse>
) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.',
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

    const { userId, gameId } = req.body

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid userId',
        })
    }

    if (!gameId || typeof gameId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid gameId',
        })
    }

    // Validate game exists
    const game = MINI_GAMES.find((g) => g.id === gameId)
    if (!game) {
        return res.status(400).json({
            success: false,
            error: 'Invalid game ID',
        })
    }

    try {
        const result = await startMiniGameSession(userId, gameId)

        if (!result.success) {
            return res.status(result.cooldownRemaining ? 429 : 400).json({
                success: false,
                error: result.error,
                cooldownRemaining: result.cooldownRemaining,
            })
        }

        return res.status(200).json({
            success: true,
            sessionToken: result.sessionToken,
            gameUrl: result.gameUrl,
        })
    } catch (error) {
        console.error('Mini-game start error:', error)
        return res.status(500).json({
            success: false,
            error: 'Failed to start game session',
        })
    }
}

export default allowCors(handler)
