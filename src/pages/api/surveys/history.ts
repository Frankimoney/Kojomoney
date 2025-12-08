/**
 * Survey History API Endpoint
 * 
 * GET /api/surveys/history - Get user's survey completion history
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { SurveyCompletion } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId, status, limit = '50' } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId
        const limitNum = Math.min(parseInt(limit as string) || 50, 100)

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        let query = db
            .collection('survey_completions')
            .where('userId', '==', userIdStr)
            .orderBy('completedAt', 'desc')
            .limit(limitNum)

        if (status) {
            query = db
                .collection('survey_completions')
                .where('userId', '==', userIdStr)
                .where('status', '==', status)
                .orderBy('completedAt', 'desc')
                .limit(limitNum)
        }

        const snapshot = await query.get()

        const completions: SurveyCompletion[] = []
        snapshot.forEach(doc => {
            completions.push({ id: doc.id, ...doc.data() } as SurveyCompletion)
        })

        return res.status(200).json({ completions })
    } catch (error) {
        console.error('Error fetching survey history:', error)
        return res.status(500).json({ error: 'Failed to fetch history' })
    }
}
