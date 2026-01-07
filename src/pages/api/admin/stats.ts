/**
 * Admin Stats API Endpoint
 * 
 * GET /api/admin/stats - Get dashboard statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { POINTS_CONFIG } from '@/lib/points-config'
import * as admin from 'firebase-admin'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const now = Date.now()
        const oneDayAgo = now - 24 * 60 * 60 * 1000

        // 1. Fetch Configuration for dynamic points rate from CORRECT location
        let pointsPerDollar = POINTS_CONFIG.pointsPerDollar // Default: 10000
        try {
            // Try the economy config first (new location)
            const economyDoc = await db.collection('system_config').doc('economy').get()
            if (economyDoc.exists && economyDoc.data()?.pointsPerDollar) {
                pointsPerDollar = economyDoc.data()?.pointsPerDollar
            } else {
                // Fallback to old location
                const configDoc = await db.collection('config').doc('general').get()
                if (configDoc.exists && configDoc.data()?.pointsPerDollar) {
                    pointsPerDollar = configDoc.data()?.pointsPerDollar
                }
            }
        } catch (e) {
            console.error('Error fetching config:', e)
        }

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

        // Get user stats - manual iteration (aggregation requires special index)
        try {
            const usersColl = db.collection('users')
            const usersSnapshot = await usersColl.get()

            totalUsers = usersSnapshot.size

            usersSnapshot.forEach(doc => {
                const data = doc.data()

                // Sum up points - users may have totalPoints or points field
                const userPoints = data.totalPoints || data.points || 0
                totalLiabilityPoints += userPoints

                // Count new users today
                if (data.createdAt && data.createdAt > oneDayAgo) {
                    newUsersToday++
                }

                // Count active users (check both timestamp and date string)
                if (data.lastActive && data.lastActive > oneDayAgo) {
                    activeUsers++
                } else if (data.lastActiveDate) {
                    const today = new Date().toISOString().split('T')[0]
                    if (data.lastActiveDate === today) {
                        activeUsers++
                    }
                }
            })

            console.log(`[STATS] Users: ${totalUsers}, Liability: ${totalLiabilityPoints}`)

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
            const missionsSnapshot = await db.collection('missions').where('active', '==', true).get()
            activeMissions = missionsSnapshot.size
        } catch (e) {
            console.error('Error fetching missions:', e)
        }

        // Get mission progress (safely - without compound query)
        try {
            const missionProgressSnapshot = await db.collection('mission_progress')
                .where('completedAt', '>', oneDayAgo)
                .get()

            missionProgressSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.status === 'completed') {
                    completedMissions24h++
                }
            })
        } catch (e) {
            console.error('Error fetching mission progress:', e)
        }

        // Get offer stats (safely)
        try {
            const offersSnapshot = await db.collection('offers').where('active', '==', true).get()
            totalOffers = offersSnapshot.size
        } catch (e) {
            console.error('Error fetching offers:', e)
        }

        // Calculate total points distributed by source
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
            // Optimized Query: Only fetch transactions from the last 24h
            const transactionsSnapshot = await db.collection('transactions')
                .where('createdAt', '>', oneDayAgo)
                .get()

            transactionsSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.type === 'credit') {
                    totalPointsDistributed += data.amount || 0

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
            })

            // Calculate estimated revenue
            // Ads: We earn ~$0.002-0.005 per view, users get ~$0.005 (using pointsPerDollar)
            // Assuming 1.5x margin revenue estimation
            // (Points / Rate) * Margin
            const adPointsUSD = earningsBySource.ad_watch / pointsPerDollar
            adRevenue24h = adPointsUSD * 1.5

        } catch (e) {
            console.error('Error fetching transactions:', e)
        }

        // Calculate total points given out in 24h
        const totalPoints24h = Object.values(earningsBySource).reduce((a, b) => a + b, 0)

        // Helper to formatting currency
        const toUSD = (points: number) => (points / pointsPerDollar).toFixed(2)

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
            totalLiabilityUSD: Number(toUSD(totalLiabilityPoints)), // Added for proper USD display
            pointsPerDollar, // Include rate so frontend knows the conversion
            adRevenue24h,
            payouts24h,
            netMargin: adRevenue24h - payouts24h,
            // Debug info
            _debug: {
                liabilityPts: totalLiabilityPoints,
                liabilityUSD: Number(toUSD(totalLiabilityPoints)),
                rate: pointsPerDollar
            },
            // Earnings Breakdown (24h)
            totalPoints24h,
            earningsBySource,
            // Convert to USD for display using DYNAMIC rate
            earningsUSD24h: {
                ads: toUSD(earningsBySource.ad_watch),
                news: toUSD(earningsBySource.news_read),
                trivia: toUSD(earningsBySource.trivia_complete),
                games: toUSD(earningsBySource.game_reward),
                offerwalls: toUSD(earningsBySource.offerwall),
                surveys: toUSD(earningsBySource.survey),
                referrals: toUSD(earningsBySource.referral),
                spins: toUSD(earningsBySource.daily_spin),
                missions: toUSD(earningsBySource.mission),
                other: toUSD(earningsBySource.other),
                total: toUSD(totalPoints24h)
            }
        })
    } catch (error) {
        console.error('Error fetching admin stats:', error)
        return res.status(500).json({ error: 'Failed to fetch stats' })
    }
}

export default requireAdmin(handler, 'support')
