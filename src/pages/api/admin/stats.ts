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
        // Diesel Metrics
        let totalLiabilityPoints = 0
        let adRevenue24h = 0
        let payouts24h = 0

        // Get user stats (safely)
        try {
            const usersSnapshot = await db.collection('users').get()
            totalUsers = usersSnapshot.size

            usersSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.createdAt && data.createdAt > oneDayAgo) {
                    newUsersToday++
                }
                totalLiabilityPoints += (data.points || 0)
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
                const data = doc.data()
                if (data.status === 'completed' && data.processedAt && data.processedAt > oneDayAgo) {
                    payouts24h += (data.amountUSD || 0)
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

        // Calculate total points distributed by source (safely)
        const earningsBySource: Record<string, number> = {
            ad_watch: 0,
            news_read: 0,
            trivia_complete: 0,
            game_reward: 0,
            offerwall: 0,
            survey: 0,
            referral: 0,
            daily_spin: 0,
            mission: 0,
            other: 0
        }

        try {
            const transactionsSnapshot = await db.collection('transactions').get()
            transactionsSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.type === 'credit') {
                    totalPointsDistributed += data.amount || 0

                    // Track by source (last 24h)
                    if (data.createdAt > oneDayAgo) {
                        const source = data.source || 'other'

                        // Normalize source names
                        if (source.includes('ad') || source === 'ad_reward') {
                            earningsBySource.ad_watch += data.amount || 0
                        } else if (source.includes('news') || source === 'news_reward') {
                            earningsBySource.news_read += data.amount || 0
                        } else if (source.includes('trivia')) {
                            earningsBySource.trivia_complete += data.amount || 0
                        } else if (source.includes('game') || source === 'mini_game') {
                            earningsBySource.game_reward += data.amount || 0
                        } else if (source.includes('offer') || source === 'offer_complete') {
                            earningsBySource.offerwall += data.amount || 0
                        } else if (source.includes('survey')) {
                            earningsBySource.survey += data.amount || 0
                        } else if (source.includes('referral')) {
                            earningsBySource.referral += data.amount || 0
                        } else if (source.includes('spin') || source === 'daily_spin') {
                            earningsBySource.daily_spin += data.amount || 0
                        } else if (source.includes('mission')) {
                            earningsBySource.mission += data.amount || 0
                        } else {
                            earningsBySource.other += data.amount || 0
                        }
                    }
                }
            })

            // Calculate estimated revenue
            // Ads: We earn ~$0.002-0.005 per view, users get ~$0.005
            // So roughly 1:1 margin on ads
            adRevenue24h = (earningsBySource.ad_watch / 10000) * 1.5

        } catch (e) {
            console.error('Error fetching transactions:', e)
        }

        // Calculate total points given out in 24h
        const totalPoints24h = Object.values(earningsBySource).reduce((a, b) => a + b, 0)

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
            // Diesel Metrics
            totalLiabilityPoints,
            adRevenue24h,
            payouts24h,
            netMargin: adRevenue24h - payouts24h,
            // Earnings Breakdown (24h)
            totalPoints24h,
            earningsBySource,
            // Convert to USD for display
            earningsUSD24h: {
                ads: (earningsBySource.ad_watch / 10000).toFixed(2),
                news: (earningsBySource.news_read / 10000).toFixed(2),
                trivia: (earningsBySource.trivia_complete / 10000).toFixed(2),
                games: (earningsBySource.game_reward / 10000).toFixed(2),
                offerwalls: (earningsBySource.offerwall / 10000).toFixed(2),
                surveys: (earningsBySource.survey / 10000).toFixed(2),
                referrals: (earningsBySource.referral / 10000).toFixed(2),
                spins: (earningsBySource.daily_spin / 10000).toFixed(2),
                missions: (earningsBySource.mission / 10000).toFixed(2),
                other: (earningsBySource.other / 10000).toFixed(2),
                total: (totalPoints24h / 10000).toFixed(2)
            }
        })
    } catch (error) {
        console.error('Error fetching admin stats:', error)
        return res.status(500).json({ error: 'Failed to fetch stats' })
    }
}

export default requireAdmin(handler)
