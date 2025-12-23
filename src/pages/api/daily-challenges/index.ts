/**
 * Daily Challenge API Endpoints
 * 
 * GET /api/daily-challenges - Get today's challenges and user progress
 * POST /api/daily-challenges - Update challenge progress / claim rewards
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

// Daily challenge definitions
const DAILY_CHALLENGES = [
    {
        id: 'watch_ads',
        title: 'Watch 5 Ads',
        description: 'Watch reward ads to earn bonus points',
        target: 5,
        reward: 100,
        type: 'ads_watched',
        icon: '📺',
    },
    {
        id: 'complete_survey',
        title: 'Complete 1 Survey',
        description: 'Complete any survey from the offerwall',
        target: 1,
        reward: 200,
        type: 'surveys_completed',
        icon: '📋',
    },
    {
        id: 'play_trivia',
        title: 'Play Trivia',
        description: 'Play the daily trivia game',
        target: 1,
        reward: 50,
        type: 'trivia_played',
        icon: '🎯',
    },
    {
        id: 'read_news',
        title: 'Read 3 Stories',
        description: 'Read news articles to earn points',
        target: 3,
        reward: 75,
        type: 'stories_read',
        icon: '📰',
    },
    {
        id: 'daily_login',
        title: 'Daily Login',
        description: 'Log in every day to maintain your streak',
        target: 1,
        reward: 25,
        type: 'login',
        icon: '✅',
    },
]

// Bonus for completing all challenges
const ALL_COMPLETE_BONUS = 500

function getTodayKey(): string {
    return new Date().toISOString().split('T')[0]
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

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId } = req.query

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        const todayKey = getTodayKey()

        // Get or create today's challenge progress
        const progressRef = db!.collection('daily_challenges').doc(`${userId}_${todayKey}`)
        const progressDoc = await progressRef.get()

        let progress: Record<string, { current: number; completed: boolean; claimed: boolean }> = {}
        let bonusClaimed = false

        if (progressDoc.exists) {
            const data = progressDoc.data()!
            progress = data.tasks || {}
            bonusClaimed = data.bonusClaimed || false
        } else {
            // Initialize today's challenges
            for (const challenge of DAILY_CHALLENGES) {
                progress[challenge.id] = {
                    current: challenge.type === 'login' ? 1 : 0, // Auto-complete login
                    completed: challenge.type === 'login',
                    claimed: false,
                }
            }

            await progressRef.set({
                userId,
                date: todayKey,
                tasks: progress,
                bonusClaimed: false,
                createdAt: Date.now(),
            })
        }

        // Get user's current activity stats for today
        const userDoc = await db!.collection('users').doc(userId as string).get()
        let userStats = {
            adsWatched: 0,
            storiesRead: 0,
            triviaCompleted: false,
        }

        if (userDoc.exists) {
            const userData = userDoc.data()!
            // Check if the stats are from today
            if (userData.lastActiveDate === todayKey) {
                userStats.adsWatched = userData.adsWatched || 0
                userStats.storiesRead = userData.storiesRead || 0
                userStats.triviaCompleted = userData.triviaCompleted || false
            }
        }

        // Update progress based on current stats
        if (progress['watch_ads']) {
            progress['watch_ads'].current = Math.min(userStats.adsWatched, 5)
            progress['watch_ads'].completed = userStats.adsWatched >= 5
        }
        if (progress['read_news']) {
            progress['read_news'].current = Math.min(userStats.storiesRead, 3)
            progress['read_news'].completed = userStats.storiesRead >= 3
        }
        if (progress['play_trivia']) {
            progress['play_trivia'].current = userStats.triviaCompleted ? 1 : 0
            progress['play_trivia'].completed = userStats.triviaCompleted
        }

        // Build response with challenge details
        const challenges = DAILY_CHALLENGES.map(challenge => ({
            ...challenge,
            current: progress[challenge.id]?.current || 0,
            completed: progress[challenge.id]?.completed || false,
            claimed: progress[challenge.id]?.claimed || false,
        }))

        const completedCount = challenges.filter(c => c.completed).length
        const claimedCount = challenges.filter(c => c.claimed).length
        const allCompleted = completedCount === challenges.length

        return res.status(200).json({
            date: todayKey,
            challenges,
            completedCount,
            totalChallenges: challenges.length,
            allCompleted,
            bonusAvailable: allCompleted && !bonusClaimed,
            bonusClaimed,
            bonusReward: ALL_COMPLETE_BONUS,
            totalPossibleReward: challenges.reduce((sum, c) => sum + c.reward, 0) + ALL_COMPLETE_BONUS,
        })
    } catch (error) {
        console.error('Error fetching daily challenges:', error)
        return res.status(500).json({ error: 'Failed to fetch challenges' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId, action, challengeId } = req.body

        if (!userId || !action) {
            return res.status(400).json({ error: 'userId and action are required' })
        }

        const todayKey = getTodayKey()
        const progressRef = db!.collection('daily_challenges').doc(`${userId}_${todayKey}`)
        const progressDoc = await progressRef.get()

        if (!progressDoc.exists) {
            return res.status(400).json({ error: 'No challenge progress found for today' })
        }

        const progressData = progressDoc.data()!
        const tasks = progressData.tasks || {}
        const now = Date.now()

        if (action === 'claim_reward') {
            if (!challengeId) {
                return res.status(400).json({ error: 'challengeId is required' })
            }

            const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId)
            if (!challenge) {
                return res.status(400).json({ error: 'Invalid challenge' })
            }

            const taskProgress = tasks[challengeId]
            if (!taskProgress?.completed) {
                return res.status(400).json({ error: 'Challenge not completed' })
            }

            if (taskProgress.claimed) {
                return res.status(400).json({ error: 'Reward already claimed' })
            }

            // Update progress
            tasks[challengeId].claimed = true
            await progressRef.update({ tasks })

            // Credit reward
            const userRef = db!.collection('users').doc(userId)
            const userDoc = await userRef.get()
            const currentPoints = userDoc.data()?.totalPoints || userDoc.data()?.points || 0

            await userRef.update({
                totalPoints: currentPoints + challenge.reward,
                points: currentPoints + challenge.reward,
                updatedAt: now,
            })

            // Create transaction
            await db!.collection('transactions').add({
                userId,
                type: 'credit',
                amount: challenge.reward,
                source: 'daily_challenge',
                status: 'completed',
                description: `Daily Challenge: ${challenge.title}`,
                createdAt: now,
            })

            return res.status(200).json({
                success: true,
                reward: challenge.reward,
                message: `Earned ${challenge.reward} points!`,
            })
        }

        if (action === 'claim_bonus') {
            if (progressData.bonusClaimed) {
                return res.status(400).json({ error: 'Bonus already claimed' })
            }

            // Check if all challenges completed
            const allCompleted = DAILY_CHALLENGES.every(c => tasks[c.id]?.completed)
            if (!allCompleted) {
                return res.status(400).json({ error: 'Complete all challenges first' })
            }

            // Update progress
            await progressRef.update({ bonusClaimed: true })

            // Credit bonus
            const userRef = db!.collection('users').doc(userId)
            const userDoc = await userRef.get()
            const currentPoints = userDoc.data()?.totalPoints || userDoc.data()?.points || 0

            await userRef.update({
                totalPoints: currentPoints + ALL_COMPLETE_BONUS,
                points: currentPoints + ALL_COMPLETE_BONUS,
                updatedAt: now,
            })

            // Create transaction
            await db!.collection('transactions').add({
                userId,
                type: 'credit',
                amount: ALL_COMPLETE_BONUS,
                source: 'daily_challenge',
                status: 'completed',
                description: 'Daily Challenge Completion Bonus',
                createdAt: now,
            })

            return res.status(200).json({
                success: true,
                reward: ALL_COMPLETE_BONUS,
                message: `Congratulations! Earned ${ALL_COMPLETE_BONUS} bonus points!`,
            })
        }

        if (action === 'update_progress') {
            // Update a specific challenge progress
            if (!challengeId) {
                return res.status(400).json({ error: 'challengeId is required' })
            }

            const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId)
            if (!challenge) {
                return res.status(400).json({ error: 'Invalid challenge' })
            }

            const current = (tasks[challengeId]?.current || 0) + 1
            const completed = current >= challenge.target

            tasks[challengeId] = {
                current,
                completed,
                claimed: tasks[challengeId]?.claimed || false,
            }

            await progressRef.update({ tasks })

            return res.status(200).json({
                success: true,
                current,
                completed,
            })
        }

        return res.status(400).json({ error: 'Invalid action' })
    } catch (error) {
        console.error('Error processing challenge action:', error)
        return res.status(500).json({ error: 'Failed to process action' })
    }
}

export default allowCors(handler)
