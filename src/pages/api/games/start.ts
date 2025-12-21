/**
 * Game Start API Endpoint
 *
 * POST /api/games/start
 *
 * Creates a game session for a user to play via a specific provider.
 * Returns provider launch URL or SDK configuration and a short-lived session token.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import { db } from '@/lib/firebase-admin'
import { validateStartRequest, generateRequestId } from '@/lib/games'
import { createGameSession } from '@/services/gameProviderService'

export const dynamic = 'force-dynamic'

/**
 * Response type for game start endpoint.
 */
interface GameStartResponse {
    success: boolean
    sessionToken?: string
    launchUrl?: string
    sdkConfig?: Record<string, unknown>
    expiresAt?: number
    error?: string
    errors?: string[]
}

/**
 * Handle POST /api/games/start
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GameStartResponse>
) {
    const requestId = generateRequestId()

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.',
        })
    }

    // Check database availability
    if (!db) {
        console.error({ requestId, event: 'db_unavailable' })
        return res.status(500).json({
            success: false,
            error: 'Database not available',
        })
    }

    // Validate request body
    const validation = validateStartRequest(req.body)

    if (!validation.valid || !validation.data) {
        console.warn({
            requestId,
            event: 'validation_failed',
            errors: validation.errors,
        })
        return res.status(400).json({
            success: false,
            error: 'Invalid request',
            errors: validation.errors,
        })
    }

    const { userId, provider, gameId } = validation.data

    console.log({
        requestId,
        event: 'game_start_request',
        userId,
        provider,
        gameId,
    })

    try {
        // Create game session
        const result = await createGameSession(userId, provider, gameId)

        if (!result.success) {
            console.warn({
                requestId,
                event: 'session_creation_failed',
                error: result.error,
            })
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to create game session',
            })
        }

        console.log({
            requestId,
            event: 'game_started',
            userId,
            provider,
            gameId,
            expiresAt: result.expiresAt,
        })

        return res.status(200).json({
            success: true,
            sessionToken: result.sessionToken,
            launchUrl: result.launchUrl,
            sdkConfig: result.sdkConfig,
            expiresAt: result.expiresAt,
        })
    } catch (error) {
        console.error({
            requestId,
            event: 'game_start_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        })

        return res.status(500).json({
            success: false,
            error: 'Failed to start game session',
        })
    }
}

export default allowCors(handler)
