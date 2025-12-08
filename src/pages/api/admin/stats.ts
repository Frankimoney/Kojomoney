/**
 * Admin Stats API Endpoint
 * 
 * GET /api/admin/stats - Get dashboard statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    // TODO: Add admin authentication check

    try {
        const now = Date.now()
        const oneDayAgo = now - 24 * 60 * 60 * 1000

        // Initialize default stats
        let totalUsers = 0
        let newUsersToday = 0
        let activeUsers = 0
        let totalWithdrawals = 0
        let pendingWithdrawals = 0
        let totalPointsDistributed = 0
        let activeMissions = 0
        let totalOffers = 0
        let completedMissions24h = 0

        // Get user stats (safely)
        try {
            const usersSnapshot = await db.collection('users').get()
            totalUsers = usersSnapshot.size

            usersSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.createdAt && data.createdAt > oneDayAgo) {
                    newUsersToday++
                }
                if (data.lastActive && data.lastActive > oneDayAgo) {
                    activeUsers++
                }
                // Also count lastActiveDate
                if (data.lastActiveDate) {
                    const lastActiveStr = data.lastActiveDate
                    const today = new Date().toISOString().split('T')[0]
                    if (lastActiveStr === today) {
                        activeUsers++
                    }
                }
            })
        } catch (e) {
            console.error('Error fetching users:', e)
        }

        // Get withdrawal stats (safely)
        try {
            const withdrawalsSnapshot = await db.collection('withdrawals').get()
            totalWithdrawals = withdrawalsSnapshot.size

            withdrawalsSnapshot.forEach(doc => {
                if (doc.data().status === 'pending') {
                    pendingWithdrawals++
                }
            })
        } catch (e) {
            console.error('Error fetching withdrawals:', e)
        }

        // Get mission stats (safely - without compound query)
        try {
            const missionsSnapshot = await db.collection('missions').get()
            missionsSnapshot.forEach(doc => {
                if (doc.data().active === true) {
                    activeMissions++
                }
            })
        } catch (e) {
            console.error('Error fetching missions:', e)
        }

        // Get mission progress (safely - without compound query)
        try {
            const missionProgressSnapshot = await db.collection('mission_progress').get()
            missionProgressSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.status === 'completed' && data.completedAt && data.completedAt > oneDayAgo) {
                    completedMissions24h++
                }
            })
        } catch (e) {
            console.error('Error fetching mission progress:', e)
        }

        // Get offer stats (safely)
        try {
            const offersSnapshot = await db.collection('offers').get()
            offersSnapshot.forEach(doc => {
                if (doc.data().active === true) {
                    totalOffers++
                }
            })
        } catch (e) {
            console.error('Error fetching offers:', e)
        }

        // Calculate total points distributed (safely)
        try {
            const transactionsSnapshot = await db.collection('transactions').get()
            transactionsSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.type === 'credit') {
                    totalPointsDistributed += data.amount || 0
                }
            })
        } catch (e) {
            console.error('Error fetching transactions:', e)
        }

        return res.status(200).json({
            totalUsers,
            activeUsers,
            newUsersToday,
            totalWithdrawals,
            pendingWithdrawals,
            totalPointsDistributed,
            totalMissions: activeMissions,
            totalOffers,
            activeMissions,
            completedMissions24h,
        })
    } catch (error) {
        console.error('Error fetching admin stats:', error)
        return res.status(500).json({ error: 'Failed to fetch stats' })
    }
}

export default requireAdmin(handler)
