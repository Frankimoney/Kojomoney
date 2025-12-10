/**
 * Offer Stats API Endpoint
 * 
 * GET /api/offers/stats - Get user's offer statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        // Get today's date range
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const todayEnd = todayStart + 24 * 60 * 60 * 1000

        // Fetch today's credited completions
        const todayCompletions = await db
            .collection('offer_completions')
            .where('userId', '==', userIdStr)
            .where('status', '==', 'credited')
            .where('creditedAt', '>=', todayStart)
            .where('creditedAt', '<', todayEnd)
            .get()

        let todayEarnings = 0
        todayCompletions.forEach(doc => {
            todayEarnings += doc.data().payout || 0
        })

        // Fetch total completed offers
        const totalCompleted = await db
            .collection('offer_completions')
            .where('userId', '==', userIdStr)
            .where('status', '==', 'credited')
            .count()
            .get()

        // Fetch pending payouts
        const pendingPayouts = await db
            .collection('offer_completions')
            .where('userId', '==', userIdStr)
            .where('status', '==', 'pending')
            .get()

        let pendingAmount = 0
        pendingPayouts.forEach(doc => {
            pendingAmount += doc.data().payout || 0
        })

        // Get or calculate daily goal
        // Could be stored per user or be a global setting
        const dailyGoal = 500 // Default goal

        return res.status(200).json({
            todayEarnings,
            todayGoal: dailyGoal,
            totalCompleted: totalCompleted.data().count || 0,
            pendingPayouts: pendingAmount,
        })
    } catch (error) {
        console.error('Error fetching offer stats:', error)
        return res.status(500).json({ error: 'Failed to fetch stats' })
    }
}

export default allowCors(handler)
