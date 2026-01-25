/**
 * Survey Walls API Endpoint
 * 
 * Returns SURVEY URLs for CPX Research and Timewall
 * 
 * GET /api/surveywalls?userId=X - Get survey wall URLs for embedding
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

interface SurveyWallItem {
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

// Provider configurations
const SURVEY_PROVIDERS = {
    cpx: {
        name: 'CPX Research',
        description: 'Premium paid surveys from top market research companies. Complete surveys to earn points!',
        color: '#14b8a6', // teal
        types: ['Survey', 'Poll', 'Research'],
        bestFor: 'High-paying surveys',
        getUrl: (userId: string) => {
            const appId = process.env.NEXT_PUBLIC_CPX_APP_ID
            return appId
                ? `https://wall.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${userId}`
                : null
        },
    },
    timewall: {
        name: 'Timewall Surveys',
        description: 'Quick surveys and micro-tasks. Complete simple tasks to earn points fast!',
        color: '#6366f1', // indigo
        types: ['Survey', 'Task', 'Micro-task'],
        bestFor: 'Quick surveys',
        getUrl: (userId: string) => {
            const oid = process.env.NEXT_PUBLIC_TIMEWALL_SITE_ID
            return oid
                ? `https://timewall.io/users/login?oid=${oid}&uid=${userId}`
                : null
        },
    },
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId parameter' })
        }

        const surveyWalls: SurveyWallItem[] = []

        // CPX Research Surveys
        const cpxUrl = SURVEY_PROVIDERS.cpx.getUrl(userIdStr)
        surveyWalls.push({
            provider: 'CPX',
            name: SURVEY_PROVIDERS.cpx.name,
            description: SURVEY_PROVIDERS.cpx.description,
            color: SURVEY_PROVIDERS.cpx.color,
            types: SURVEY_PROVIDERS.cpx.types,
            bestFor: SURVEY_PROVIDERS.cpx.bestFor,
            url: cpxUrl,
            available: !!cpxUrl,
            message: cpxUrl ? undefined : 'Configure NEXT_PUBLIC_CPX_APP_ID in .env.local',
        })

        // Timewall Surveys
        const timewallUrl = SURVEY_PROVIDERS.timewall.getUrl(userIdStr)
        surveyWalls.push({
            provider: 'Timewall',
            name: SURVEY_PROVIDERS.timewall.name,
            description: SURVEY_PROVIDERS.timewall.description,
            color: SURVEY_PROVIDERS.timewall.color,
            types: SURVEY_PROVIDERS.timewall.types,
            bestFor: SURVEY_PROVIDERS.timewall.bestFor,
            url: timewallUrl,
            available: !!timewallUrl,
            message: timewallUrl ? undefined : 'Configure NEXT_PUBLIC_TIMEWALL_SITE_ID in .env.local',
        })

        const configured = surveyWalls.some(s => s.available)

        return res.status(200).json({
            surveyWalls,
            configured,
            userId: userIdStr,
        })

    } catch (error) {
        console.error('[Surveys] Error:', error)
        return res.status(500).json({ error: 'Failed to fetch survey walls' })
    }
}

export default allowCors(handler)
