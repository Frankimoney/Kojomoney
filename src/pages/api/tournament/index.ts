/**
 * Weekly Cup / Tournament API Endpoints
 * 
 * GET /api/tournament - Get current tournament status and leaderboard
 * POST /api/tournament - Join tournament / claim rewards
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

// Tournament configuration
const TOURNAMENT_CONFIG = {
    name: 'Weekly Cup',
    duration: 7, // days
    rewards: [
        { rank: 1, points: 50000, tier: 'Champion' },
        { rank: 2, points: 25000, tier: 'Champion' },
        { rank: 3, points: 15000, tier: 'Champion' },
        { rank: 4, points: 10000, tier: 'Gold' },
        { rank: 5, points: 10000, tier: 'Gold' },
        { rank: 6, points: 5000, tier: 'Gold' },
        { rank: 7, points: 5000, tier: 'Gold' },
        { rank: 8, points: 5000, tier: 'Gold' },
        { rank: 9, points: 2500, tier: 'Silver' },
        { rank: 10, points: 2500, tier: 'Silver' },
    ],
    tiers: {
        Platinum: { minRank: 1, maxRank: 3, color: '#E5E4E2' },
        Gold: { minRank: 4, maxRank: 10, color: '#FFD700' },
        Silver: { minRank: 11, maxRank: 25, color: '#C0C0C0' },
        Bronze: { minRank: 26, maxRank: 100, color: '#CD7F32' },
    },
}

function getCurrentWeekKey(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
}

function getWeekDates(): { start: Date; end: Date; remaining: number } {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    endOfWeek.setHours(0, 0, 0, 0)

    const remaining = Math.max(0, Math.floor((endOfWeek.getTime() - now.getTime()) / 1000))

    return { start: startOfWeek, end: endOfWeek, remaining }
}

function getTier(rank: number): string {
    if (rank <= 3) return 'Platinum'
    if (rank <= 10) return 'Gold'
    if (rank <= 25) return 'Silver'
    return 'Bronze'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId } = req.query
        const weekKey = getCurrentWeekKey()
        const weekDates = getWeekDates()

        // Get tournament entries for this week
        const entriesSnapshot = await db!.collection('tournament_entries')
            .where('weekKey', '==', weekKey)
            .get()

        let entries: any[] = []
        entriesSnapshot.forEach(doc => {
            entries.push({ id: doc.id, ...doc.data() })
        })

        // If no entries, seed with some initial data
        if (entries.length === 0 && userId) {
            // Create entry for current user
            const userDoc = await db!.collection('users').doc(userId as string).get()
            if (userDoc.exists) {
                const userData = userDoc.data()!
                const entry = {
                    weekKey,
                    userId: userId,
                    name: userData.name || userData.username || 'Anonymous',
                    points: 0,
                    joinedAt: Date.now(),
                }
                await db!.collection('tournament_entries').add(entry)
                entries.push(entry)
            }
        }

        // Sort by points descending
        entries.sort((a, b) => b.points - a.points)

        // Add rank and tier
        const leaderboard = entries.map((entry, index) => {
            const rank = index + 1
            const previousRank = entry.previousRank || rank
            return {
                id: entry.id,
                userId: entry.userId,
                rank,
                name: entry.name,
                avatar: entry.avatar,
                points: entry.points,
                change: previousRank - rank,
                tier: getTier(rank),
                isMe: entry.userId === userId,
            }
        })

        // Find current user's entry
        const myEntry = leaderboard.find(e => e.userId === userId) || null
        const myRank = myEntry?.rank || null

        // Calculate time remaining
        const now = new Date()
        const endTime = weekDates.end.getTime()
        const remainingMs = Math.max(0, endTime - now.getTime())
        const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
        const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

        return res.status(200).json({
            tournamentName: TOURNAMENT_CONFIG.name,
            weekKey,
            startDate: weekDates.start.toISOString(),
            endDate: weekDates.end.toISOString(),
            timeRemaining: {
                days: remainingDays,
                hours: remainingHours,
                minutes: remainingMinutes,
                totalSeconds: Math.floor(remainingMs / 1000),
            },
            leaderboard: leaderboard.slice(0, 50), // Top 50
            totalParticipants: leaderboard.length,
            myEntry,
            myRank,
            rewards: TOURNAMENT_CONFIG.rewards,
            tiers: TOURNAMENT_CONFIG.tiers,
            pendingReward: await checkPendingReward(userId as string, weekKey)
        })
    } catch (error) {
        console.error('Error fetching tournament:', error)
        return res.status(500).json({ error: 'Failed to fetch tournament' })
    }
}

async function checkPendingReward(userId: string, currentWeekKey: string) {
    if (!userId || !db) return null

    // Get date for 1 week ago
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const startOfYear = new Date(oneWeekAgo.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((oneWeekAgo.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    const prevWeekKey = `${oneWeekAgo.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`

    try {
        const entrySnapshot = await db.collection('tournament_entries')
            .where('weekKey', '==', prevWeekKey)
            .where('userId', '==', userId)
            .limit(1)
            .get()

        if (entrySnapshot.empty) return null

        const entryData = entrySnapshot.docs[0].data()
        if (entryData.rewardClaimed) return null

        return {
            weekKey: prevWeekKey,
            points: entryData.points || 0
        }
    } catch (e) {
        return null
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId, action } = req.body

        if (!userId || !action) {
            return res.status(400).json({ error: 'userId and action are required' })
        }

        const weekKey = getCurrentWeekKey()
        const now = Date.now()

        if (action === 'join') {
            // Check if already joined
            const existingSnapshot = await db!.collection('tournament_entries')
                .where('weekKey', '==', weekKey)
                .where('userId', '==', userId)
                .limit(1)
                .get()

            if (!existingSnapshot.empty) {
                return res.status(400).json({ error: 'Already joined this week\'s tournament' })
            }

            // Get user info
            const userDoc = await db!.collection('users').doc(userId).get()
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' })
            }

            const userData = userDoc.data()!

            // Create entry
            const entry = {
                weekKey,
                userId: userId,
                name: userData.name || userData.username || 'Anonymous',
                avatar: userData.avatarUrl || '',
                points: 0,
                joinedAt: now,
                lastUpdated: now,
            }

            await db!.collection('tournament_entries').add(entry)

            return res.status(200).json({
                success: true,
                message: 'Joined the tournament!',
            })
        }

        if (action === 'add_points') {
            const { points, source } = req.body

            if (!points || points <= 0) {
                return res.status(400).json({ error: 'Valid points amount required' })
            }

            // Find user's entry
            const entrySnapshot = await db!.collection('tournament_entries')
                .where('weekKey', '==', weekKey)
                .where('userId', '==', userId)
                .limit(1)
                .get()

            if (entrySnapshot.empty) {
                // Auto-join if not in tournament
                const userDoc = await db!.collection('users').doc(userId).get()
                if (userDoc.exists) {
                    const userData = userDoc.data()!
                    await db!.collection('tournament_entries').add({
                        weekKey,
                        userId: userId,
                        name: userData.name || userData.username || 'Anonymous',
                        avatar: userData.avatarUrl || '',
                        points,
                        joinedAt: now,
                        lastUpdated: now,
                    })
                }
            } else {
                // Update existing entry
                const entryDoc = entrySnapshot.docs[0]
                const currentPoints = entryDoc.data().points || 0
                await entryDoc.ref.update({
                    points: currentPoints + points,
                    lastUpdated: now,
                })
            }

            return res.status(200).json({
                success: true,
                addedPoints: points,
            })
        }

        if (action === 'claim_reward') {
            // This would be called after tournament ends
            // Check previous week's results
            const prevWeekKey = req.body.weekKey

            if (!prevWeekKey) {
                return res.status(400).json({ error: 'weekKey is required' })
            }

            // Find user's entry in that week
            const entrySnapshot = await db!.collection('tournament_entries')
                .where('weekKey', '==', prevWeekKey)
                .where('userId', '==', userId)
                .limit(1)
                .get()

            if (entrySnapshot.empty) {
                return res.status(400).json({ error: 'No tournament entry found' })
            }

            const entryDoc = entrySnapshot.docs[0]
            const entryData = entryDoc.data()

            if (entryData.rewardClaimed) {
                return res.status(400).json({ error: 'Reward already claimed' })
            }

            // Calculate rank for that week
            const allEntriesSnapshot = await db!.collection('tournament_entries')
                .where('weekKey', '==', prevWeekKey)
                .get()

            let allEntries: any[] = []
            allEntriesSnapshot.forEach(doc => allEntries.push(doc.data()))
            allEntries.sort((a, b) => b.points - a.points)

            const rank = allEntries.findIndex(e => e.userId === userId) + 1
            const reward = TOURNAMENT_CONFIG.rewards.find(r => r.rank === rank)

            if (!reward) {
                return res.status(200).json({
                    success: true,
                    reward: 0,
                    rank,
                    message: 'No reward for this rank',
                })
            }

            // Credit reward
            const userRef = db!.collection('users').doc(userId)
            const userDoc = await userRef.get()
            const currentPoints = userDoc.data()?.totalPoints || userDoc.data()?.points || 0

            await userRef.update({
                totalPoints: currentPoints + reward.points,
                points: currentPoints + reward.points,
                updatedAt: now,
            })

            // Mark as claimed
            await entryDoc.ref.update({ rewardClaimed: true })

            // Create transaction
            await db!.collection('transactions').add({
                userId,
                type: 'credit',
                amount: reward.points,
                source: 'tournament',
                status: 'completed',
                description: `Weekly Cup Rank #${rank} Reward`,
                createdAt: now,
            })

            return res.status(200).json({
                success: true,
                reward: reward.points,
                rank,
                tier: reward.tier,
                message: `Congratulations! You placed #${rank} and earned ${reward.points} points!`,
            })
        }

        return res.status(400).json({ error: 'Invalid action' })
    } catch (error) {
        console.error('Error processing tournament action:', error)
        return res.status(500).json({ error: 'Failed to process action' })
    }
}
