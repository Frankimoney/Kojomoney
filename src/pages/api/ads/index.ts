/**
 * Ads API - Handle ad view tracking and rewards
 * 
 * POST /api/ads - Start an ad viewing session
 * PATCH /api/ads - Complete an ad view and award points
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { getHappyHourBonus } from '@/lib/happyHour'
import { getStreakMultiplier } from '@/lib/points-config'

export const dynamic = 'force-dynamic'

// Constants
const BASE_AD_REWARD_POINTS = 5 // Base points per ad watched
const TOURNAMENT_POINTS_PER_AD = 10 // Tournament points per ad
const MAX_ADS_PER_DAY = 10 // Daily limit

function getTodayKey(): string {
    return new Date().toISOString().split('T')[0]
}

function getCurrentWeekKey(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    if (req.method === 'POST') {
        return handlePost(req, res)
    } else if (req.method === 'PATCH') {
        return handlePatch(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default allowCors(handler)

// POST: Start an ad viewing session
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        const todayKey = getTodayKey()
        const now = Date.now()

        // Check daily limit
        const userDoc = await db!.collection('users').doc(userId).get()
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()!
        let adsWatched = userData.adsWatched || 0

        // Reset if new day
        if (userData.lastActiveDate !== todayKey) {
            adsWatched = 0
        }

        if (adsWatched >= MAX_ADS_PER_DAY) {
            return res.status(429).json({
                error: 'Daily ad limit reached',
                adsWatched,
                maxAds: MAX_ADS_PER_DAY,
                resetTime: 'midnight'
            })
        }

        // Create ad view record
        const adViewRef = await db!.collection('ad_views').add({
            userId,
            status: 'started',
            startedAt: now,
            date: todayKey,
        })

        return res.status(200).json({
            adViewId: adViewRef.id,
            adsWatchedToday: adsWatched,
            remainingAds: MAX_ADS_PER_DAY - adsWatched,
            rewardPoints: AD_REWARD_POINTS,
        })
    } catch (error) {
        console.error('Error starting ad view:', error)
        return res.status(500).json({ error: 'Failed to start ad view' })
    }
}

// PATCH: Complete an ad view and award points
async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { adViewId, userId } = req.body

        if (!adViewId || !userId) {
            return res.status(400).json({ error: 'adViewId and userId are required' })
        }

        const now = Date.now()
        const todayKey = getTodayKey()
        const weekKey = getCurrentWeekKey()

        // Verify ad view exists and is not already completed
        const adViewRef = db!.collection('ad_views').doc(adViewId)
        const adViewDoc = await adViewRef.get()

        if (!adViewDoc.exists) {
            return res.status(404).json({ error: 'Ad view not found' })
        }

        const adViewData = adViewDoc.data()!
        if (adViewData.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        if (adViewData.status === 'completed') {
            return res.status(400).json({ error: 'Ad already completed' })
        }

        // Update ad view record
        await adViewRef.update({
            status: 'completed',
            completedAt: now,
        })

        // Update user points and stats
        const userRef = db!.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()!
        const currentPoints = userData.totalPoints || userData.points || 0

        // Check daily stats
        let adsWatched = userData.adsWatched || 0
        if (userData.lastActiveDate !== todayKey) {
            adsWatched = 0
        }

        // Get streak for tier-based multiplier
        const dailyStreak = userData.dailyStreak || 0
        const streakInfo = getStreakMultiplier(dailyStreak)

        // Apply both Happy Hour AND Streak multipliers
        const happyHourInfo = getHappyHourBonus(BASE_AD_REWARD_POINTS)
        const combinedMultiplier = happyHourInfo.multiplier * streakInfo.multiplier
        const pointsToAward = Math.floor(BASE_AD_REWARD_POINTS * combinedMultiplier)

        // Update user
        await userRef.update({
            totalPoints: currentPoints + pointsToAward,
            points: currentPoints + pointsToAward,
            adPoints: (userData.adPoints || 0) + pointsToAward,
            adsWatched: adsWatched + 1,
            lastActiveDate: todayKey,
            updatedAt: now,
        })

        // Build bonus description
        const bonusLabels: string[] = []
        if (happyHourInfo.bonusLabel) bonusLabels.push(happyHourInfo.bonusLabel)
        if (streakInfo.multiplier > 1) bonusLabels.push(`${streakInfo.tier.label} ${streakInfo.multiplier}x`)
        const bonusDescription = bonusLabels.length > 0 ? ` (${bonusLabels.join(' + ')})` : ''

        // Create transaction record with bonus info
        await db!.collection('transactions').add({
            userId,
            type: 'credit',
            amount: pointsToAward,
            baseAmount: BASE_AD_REWARD_POINTS,
            happyHourMultiplier: happyHourInfo.multiplier,
            streakMultiplier: streakInfo.multiplier,
            source: 'ad_watch',
            status: 'completed',
            description: `Watched ad #${adsWatched + 1}${bonusDescription}`,
            createdAt: now,
        })

        // Update Tournament Points
        const entrySnapshot = await db!.collection('tournament_entries')
            .where('weekKey', '==', weekKey)
            .where('userId', '==', userId)
            .limit(1)
            .get()

        if (!entrySnapshot.empty) {
            const entryDoc = entrySnapshot.docs[0]
            await entryDoc.ref.update({
                points: (entryDoc.data().points || 0) + TOURNAMENT_POINTS_PER_AD,
                lastUpdated: now,
            })
        } else {
            // Auto-join tournament
            await db!.collection('tournament_entries').add({
                weekKey,
                userId,
                name: userData.name || userData.username || 'Anonymous',
                avatar: userData.avatarUrl || '',
                points: TOURNAMENT_POINTS_PER_AD,
                joinedAt: now,
                lastUpdated: now,
            })
        }

        return res.status(200).json({
            success: true,
            pointsAwarded: pointsToAward,
            basePoints: BASE_AD_REWARD_POINTS,
            multiplier: happyHourInfo.multiplier,
            happyHourBonus: happyHourInfo.bonusLabel,
            tournamentPointsAwarded: TOURNAMENT_POINTS_PER_AD,
            newTotal: currentPoints + pointsToAward,
            adsWatchedToday: adsWatched + 1,
            remainingAds: MAX_ADS_PER_DAY - (adsWatched + 1),
        })
    } catch (error) {
        console.error('Error completing ad view:', error)
        return res.status(500).json({ error: 'Failed to complete ad view' })
    }
}
