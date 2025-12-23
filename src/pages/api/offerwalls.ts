/**
 * Offerwalls & Tasks API Endpoint
 * 
 * Returns offerwall URLs for Kiwiwall and Timewall
 * 
 * GET /api/offerwalls?userId=X - Get offerwall URLs for embedding
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

interface OfferwallItem {
    provider: string
    name: string
    description: string
    color: string
    types: string[]
    bestFor: string
    url: string | null
    available: boolean
    message?: string
}

// Provider configurations (offerwalls and tasks only, no surveys)
const PROVIDER_CONFIG = {
    kiwiwall: {
        name: 'Kiwiwall',
        description: 'High-paying offers, games & app installs with strong African coverage',
        color: '#10b981', // emerald
        types: ['Game', 'Install', 'Watch'],
        bestFor: 'App installs & games',
        getUrl: (userId: string) => {
            const appId = process.env.NEXT_PUBLIC_KIWIWALL_APP_ID
            return appId
                ? `https://www.kiwiwall.com/wall/${appId}/${userId}`
                : null
        },
    },
    timewall: {
        name: 'Timewall',
        description: 'Quick micro-tasks and easy offers for fast earnings',
        color: '#6366f1', // indigo
        types: ['Task', 'Install', 'Watch'],
        bestFor: 'Quick tasks',
        getUrl: (userId: string) => {
            const oid = process.env.NEXT_PUBLIC_TIMEWALL_SITE_ID
            return oid
                ? `https://timewall.io/users/login?oid=${oid}&uid=${userId}&tab=tasks`
                : null
        },
    },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId parameter' })
        }

        const offerwalls: OfferwallItem[] = []

        // Kiwiwall
        const kiwiwallUrl = PROVIDER_CONFIG.kiwiwall.getUrl(userIdStr)
        offerwalls.push({
            provider: 'Kiwiwall',
            name: PROVIDER_CONFIG.kiwiwall.name,
            description: PROVIDER_CONFIG.kiwiwall.description,
            color: PROVIDER_CONFIG.kiwiwall.color,
            types: PROVIDER_CONFIG.kiwiwall.types,
            bestFor: PROVIDER_CONFIG.kiwiwall.bestFor,
            url: kiwiwallUrl,
            available: !!kiwiwallUrl,
            message: kiwiwallUrl ? undefined : 'Configure NEXT_PUBLIC_KIWIWALL_APP_ID in .env.local',
        })

        // Timewall
        const timewallUrl = PROVIDER_CONFIG.timewall.getUrl(userIdStr)
        offerwalls.push({
            provider: 'Timewall',
            name: PROVIDER_CONFIG.timewall.name,
            description: PROVIDER_CONFIG.timewall.description,
            color: PROVIDER_CONFIG.timewall.color,
            types: PROVIDER_CONFIG.timewall.types,
            bestFor: PROVIDER_CONFIG.timewall.bestFor,
            url: timewallUrl,
            available: !!timewallUrl,
            message: timewallUrl ? undefined : 'Configure NEXT_PUBLIC_TIMEWALL_SITE_ID in .env.local',
        })

        const configured = offerwalls.some(o => o.available)

        return res.status(200).json({
            offerwalls,
            configured,
            userId: userIdStr,
        })

    } catch (error) {
        console.error('[Offerwalls] Error:', error)
        return res.status(500).json({ error: 'Failed to fetch offerwalls' })
    }
}

export default allowCors(handler)
