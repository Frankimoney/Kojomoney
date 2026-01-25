/**
 * Admin Game Providers API Endpoint
 *
 * GET /api/admin/games/providers - List all providers with status
 * PATCH /api/admin/games/providers - Enable/disable a provider
 *
 * Requires admin authentication.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import {
    GameProvider,
    GameProviderConfig,
    isValidProvider,
    DEFAULT_CONVERSION_RULES,
} from '@/lib/games'
import { getAllProviders, getProviderConfig } from '@/services/gameProviderService'

export const dynamic = 'force-dynamic'

/**
 * Response type for providers endpoint.
 */
interface ProvidersResponse {
    success: boolean
    providers?: Array<{
        provider: GameProvider
        enabled: boolean
        configured: boolean
        conversionRules: {
            multiplier: number
            minimumValue: number
            maximumCredit: number
            description: string
        }
    }>
    error?: string
}

/**
 * Handle GET/PATCH /api/admin/games/providers
 *
 * GET: Returns list of all providers with their configuration status
 * PATCH: Enable or disable a provider
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ProvidersResponse>
) {
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

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'PATCH') {
        return handlePatch(req, res)
    } else {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }
}

/**
 * Handle GET request - list all providers.
 */
async function handleGet(
    req: NextApiRequest,
    res: NextApiResponse<ProvidersResponse>
): Promise<void> {
    const providers: GameProvider[] = ['gamezop', 'adjoe', 'qureka']

    const providerList = providers.map((provider) => {
        const config = getProviderConfig(provider)

        return {
            provider,
            enabled: config?.enabled ?? false,
            configured: config !== null,
            conversionRules: config?.conversionRules ?? DEFAULT_CONVERSION_RULES[provider],
        }
    })

    res.status(200).json({
        success: true,
        providers: providerList,
    })
}

/**
 * Handle PATCH request - enable/disable provider.
 *
 * Body:
 * - provider: GameProvider
 * - enabled: boolean
 */
async function handlePatch(
    req: NextApiRequest,
    res: NextApiResponse<ProvidersResponse>
): Promise<void> {
    const { provider, enabled } = req.body

    // Validate provider
    if (!provider || typeof provider !== 'string' || !isValidProvider(provider)) {
        res.status(400).json({
            success: false,
            error: 'Invalid provider',
        })
        return
    }

    // Validate enabled
    if (typeof enabled !== 'boolean') {
        res.status(400).json({
            success: false,
            error: 'enabled must be a boolean',
        })
        return
    }

    try {
        // Store provider status in database
        // This allows runtime enable/disable without restarting the app
        await db!.collection('provider_settings').doc(provider).set(
            {
                provider,
                enabled,
                updatedAt: Date.now(),
            },
            { merge: true }
        )

        // Log the change
        await db!.collection('admin_logs').add({
            action: enabled ? 'enable_provider' : 'disable_provider',
            provider,
            adminId: req.headers['x-admin-id'] || 'unknown',
            timestamp: Date.now(),
        })

        console.log({
            event: 'provider_status_changed',
            provider,
            enabled,
        })

        res.status(200).json({
            success: true,
        })
    } catch (error) {
        console.error('Failed to update provider status:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to update provider status',
        })
    }
}

export default handler
