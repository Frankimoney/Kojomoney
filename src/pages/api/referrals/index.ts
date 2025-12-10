/**
 * Referral System API Endpoints
 * 
 * GET /api/referrals - Get user's referrals and stats
 * POST /api/referrals/claim - Claim milestone reward
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

// Referral milestones configuration
const REFERRAL_MILESTONES = [
    { count: 5, reward: 1000 },
    { count: 10, reward: 2500 },
    { count: 25, reward: 7500 },
    { count: 50, reward: 20000 },
    { count: 100, reward: 50000 },
]

// Points earned per referral action
const REFERRAL_REWARDS = {
    signup: 100,          // User gets when someone signs up with their code
    firstTask: 200,       // User gets when referral completes first task
    referralSignupBonus: 100, // New user gets when they use a referral code
}

// Tournament points for referrals
const TOURNAMENT_POINTS_PER_REFERRAL = 100

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

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default allowCors(handler)

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId } = req.query

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        // Get user data
        const userDoc = await db!.collection('users').doc(userId as string).get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()!
        const referralCode = userData.referralCode || ''

        // Get all referrals for this user
        const referralsSnapshot = await db!.collection('referrals')
            .where('referrerId', '==', userId)
            .get()

        let referrals: any[] = []
        let totalEarnings = 0

        for (const doc of referralsSnapshot.docs) {
            const data = doc.data()

            // Get referred user info
            let referredUserName = 'Anonymous'
            if (data.referredUserId) {
                try {
                    const referredUserDoc = await db!.collection('users').doc(data.referredUserId).get()
                    if (referredUserDoc.exists) {
                        const referredUser = referredUserDoc.data()!
                        referredUserName = referredUser.name || referredUser.username || 'Anonymous'
                    }
                } catch (e) {
                    // Ignore
                }
            }

            const earnings = data.earnedAmount || REFERRAL_REWARDS.signup
            totalEarnings += earnings

            referrals.push({
                id: doc.id,
                name: referredUserName,
                date: new Date(data.createdAt).toISOString().split('T')[0],
                status: data.status || 'registered',
                earnings,
            })
        }

        // Sort by date descending
        referrals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Get claimed milestones
        const claimedMilestones = userData.claimedMilestones || []

        // Calculate milestones
        const milestones = REFERRAL_MILESTONES.map(milestone => ({
            count: milestone.count,
            reward: milestone.reward,
            isClaimed: claimedMilestones.includes(milestone.count),
            isUnlocked: referrals.length >= milestone.count,
        }))

        return res.status(200).json({
            referralCode,
            referralLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kojomoney.com'}/signup?ref=${referralCode}`,
            totalReferrals: referrals.length,
            activeReferrals: referrals.filter(r => r.status === 'active').length,
            completedReferrals: referrals.filter(r => r.status === 'completed').length,
            totalEarnings,
            referrals: referrals.slice(0, 20), // Limit to recent 20
            milestones,
            rewards: REFERRAL_REWARDS,
        })
    } catch (error) {
        console.error('Error fetching referrals:', error)
        return res.status(500).json({ error: 'Failed to fetch referrals' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId, action, milestoneCount } = req.body

        if (!userId || !action) {
            return res.status(400).json({ error: 'userId and action are required' })
        }

        if (action === 'claim_milestone') {
            if (!milestoneCount) {
                return res.status(400).json({ error: 'milestoneCount is required' })
            }

            // Verify milestone exists
            const milestone = REFERRAL_MILESTONES.find(m => m.count === milestoneCount)
            if (!milestone) {
                return res.status(400).json({ error: 'Invalid milestone' })
            }

            // Get user and referral count
            const userRef = db!.collection('users').doc(userId)
            const userDoc = await userRef.get()

            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' })
            }

            const userData = userDoc.data()!
            const claimedMilestones = userData.claimedMilestones || []

            // Check if already claimed
            if (claimedMilestones.includes(milestoneCount)) {
                return res.status(400).json({ error: 'Milestone already claimed' })
            }

            // Count referrals
            const referralsSnapshot = await db!.collection('referrals')
                .where('referrerId', '==', userId)
                .get()

            if (referralsSnapshot.size < milestoneCount) {
                return res.status(400).json({ error: 'Not enough referrals to claim this milestone' })
            }

            // Credit reward
            const currentPoints = userData.totalPoints || userData.points || 0
            const now = Date.now()

            await userRef.update({
                totalPoints: currentPoints + milestone.reward,
                points: currentPoints + milestone.reward,
                claimedMilestones: [...claimedMilestones, milestoneCount],
                updatedAt: now,
            })

            // Create transaction
            await db!.collection('transactions').add({
                userId,
                type: 'credit',
                amount: milestone.reward,
                source: 'referral',
                status: 'completed',
                description: `Referral milestone: ${milestoneCount} referrals`,
                createdAt: now,
            })

            // Add tournament points for referral milestone
            const weekKey = getCurrentWeekKey()
            const tournamentPoints = TOURNAMENT_POINTS_PER_REFERRAL * milestoneCount

            const entrySnapshot = await db!.collection('tournament_entries')
                .where('weekKey', '==', weekKey)
                .where('userId', '==', userId)
                .limit(1)
                .get()

            if (!entrySnapshot.empty) {
                const entryDoc = entrySnapshot.docs[0]
                await entryDoc.ref.update({
                    points: (entryDoc.data().points || 0) + tournamentPoints,
                    lastUpdated: now,
                })
            } else {
                // Auto-join tournament
                await db!.collection('tournament_entries').add({
                    weekKey,
                    userId,
                    name: userData.name || userData.username || 'Anonymous',
                    avatar: userData.avatarUrl || '',
                    points: tournamentPoints,
                    joinedAt: now,
                    lastUpdated: now,
                })
            }

            return res.status(200).json({
                success: true,
                reward: milestone.reward,
                tournamentPoints,
                message: `Claimed ${milestone.reward} points for ${milestoneCount} referrals!`,
            })
        }

        return res.status(400).json({ error: 'Invalid action' })
    } catch (error) {
        console.error('Error processing referral action:', error)
        return res.status(500).json({ error: 'Failed to process action' })
    }
}
