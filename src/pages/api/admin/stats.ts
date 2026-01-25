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
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

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
        // Initialize breakdown objects
        const initialBreakdown = {
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

        const earningsBySource: Record<string, number> = { ...initialBreakdown }
        const earningsBySource30d: Record<string, number> = { ...initialBreakdown }

        try {
            // Optimized Query: Fetch transactions from the last 30 days
            console.log(`[STATS] Querying transactions since ${new Date(thirtyDaysAgo).toISOString()}`)
            const transactionsSnapshot = await db.collection('transactions')
                .where('createdAt', '>', thirtyDaysAgo)
                .get()

            console.log(`[STATS] Found ${transactionsSnapshot.size} transactions in last 30d`)

            // Debug: Track source counts
            const sourceCounts: Record<string, number> = {}

            transactionsSnapshot.forEach(doc => {
                const data = doc.data()
                // Process both credits (earnings) and debits (admin deductions)
                if (data.type === 'credit' || data.type === 'mini_game_reward' || data.type === 'debit') {
                    // For debits, treat as negative amount to reduce the total
                    const rawAmount = data.amount || 0
                    const isDebit = data.type === 'debit'
                    const amount = isDebit ? -rawAmount : rawAmount

                    if (data.createdAt > oneDayAgo) {
                        totalPointsDistributed += amount
                    }

                    let source = data.source || (data.type === 'mini_game_reward' ? 'game_reward' : 'other')

                    // FIX: Check provider for surveys if source is generic 'offerwall'
                    if (source === 'offerwall' && data.metadata?.provider) {
                        const SURVEY_PROVIDERS = ['CPX', 'TheoremReach', 'BitLabs', 'Pollfish']
                        if (SURVEY_PROVIDERS.includes(data.metadata.provider)) {
                            source = 'survey'
                        }
                    }

                    // Debug: count sources
                    sourceCounts[source] = (sourceCounts[source] || 0) + 1

                    // Helper to add to specific breakdown
                    const addToBreakdown = (breakdown: Record<string, number>) => {
                        // Normalize source names (use specific prefixes to avoid false matches)
                        if (source.startsWith('ad_') || source === 'ad_reward' || source === 'ad_watch') {
                            breakdown.ad_watch += amount
                        } else if (source.includes('news') || source === 'news_reward') {
                            breakdown.news_read += amount
                        } else if (source.includes('trivia')) {
                            breakdown.trivia_complete += amount
                        } else if (source.includes('game') || source === 'mini_game') {
                            breakdown.game_reward += amount
                        } else if (source.includes('offer') || source === 'offer_complete') {
                            breakdown.offerwall += amount
                        } else if (source.includes('survey')) {
                            breakdown.survey += amount
                        } else if (source.includes('referral')) {
                            breakdown.referral += amount
                        } else if (source.includes('spin') || source === 'daily_spin') {
                            breakdown.daily_spin += amount
                        } else if (source.includes('mission')) {
                            breakdown.mission += amount
                        } else {
                            breakdown.other += amount
                        }
                    }

                    // Add to 30d stats
                    addToBreakdown(earningsBySource30d)

                    // Add to 24h stats if recent
                    if (data.createdAt > oneDayAgo) {
                        addToBreakdown(earningsBySource)
                    }
                }
            })

            console.log(`[STATS] Source breakdown:`, sourceCounts)
            console.log(`[STATS] Earnings by source:`, earningsBySource)

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
        // Calculate total points given out in 24h and 30d
        const totalPoints24h = Object.values(earningsBySource).reduce((a, b) => a + b, 0)
        const totalPoints30d = Object.values(earningsBySource30d).reduce((a, b) => a + b, 0)

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
            },
            // Monthly Earnings (30d)
            earningsUSD30d: {
                ads: toUSD(earningsBySource30d.ad_watch),
                news: toUSD(earningsBySource30d.news_read),
                trivia: toUSD(earningsBySource30d.trivia_complete),
                games: toUSD(earningsBySource30d.game_reward),
                offerwalls: toUSD(earningsBySource30d.offerwall),
                surveys: toUSD(earningsBySource30d.survey),
                referrals: toUSD(earningsBySource30d.referral),
                spins: toUSD(earningsBySource30d.daily_spin),
                missions: toUSD(earningsBySource30d.mission),
                other: toUSD(earningsBySource30d.other),
                total: toUSD(totalPoints30d)
            }
        })
    } catch (error) {
        console.error('Error fetching admin stats:', error)
        return res.status(500).json({ error: 'Failed to fetch stats' })
    }
}

export default requireAdmin(handler, 'support')
