import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

// ⚠️ TESTING MODE - Set to true for testing (bypasses cooldown)
const TESTING_MODE = false

// Normalized probabilities (Sum approx 1.0)
const OUTCOMES = [
    { points: 50, weight: 0.24 },
    { points: 10, weight: 0.32 },
    { points: 100, weight: 0.12 },
    { points: 20, weight: 0.20 },
    { points: 500, weight: 0.04 }, // Jackpot
    { points: 0, weight: 0.08 }   // Try Again
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const { userId, bonusSpin } = body

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' })
        }

        if (!db) {
            return res.status(200).json({
                success: true,
                points: 50,
                awarded: false,
                mock: true
            })
        }

        const userRef = db.collection('users').doc(userId)

        // Transaction to ensure atomic update and cooldown check
        const result = await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef)

            if (!userDoc.exists) {
                throw new Error('User not found')
            }

            const userData = userDoc.data()!
            const lastSpinAt = userData.lastSpinAt || 0
            const lastBonusSpinAt = userData.lastBonusSpinAt || 0
            const now = Date.now()
            const oneDayMs = 24 * 60 * 60 * 1000

            // Check if this is a bonus spin (from watching ad)
            // TESTING_MODE bypasses all cooldowns
            if (!TESTING_MODE) {
                if (bonusSpin) {
                    // Check if bonus spin was already used today
                    if (now - lastBonusSpinAt < oneDayMs) {
                        throw new Error('Bonus spin already used today')
                    }
                } else {
                    // Regular spin - check normal cooldown
                    if (now - lastSpinAt < oneDayMs) {
                        throw new Error('Daily spin cooldown active')
                    }
                }
            }

            // Determine Outcome
            const rand = Math.random()
            let cumulative = 0
            let winningPoints = 10 // Default fallback

            for (const outcome of OUTCOMES) {
                cumulative += outcome.weight
                if (rand <= cumulative) {
                    winningPoints = outcome.points
                    break
                }
            }

            // Update User
            const currentPoints = userData.totalPoints || userData.points || 0

            const updateData: any = {
                totalPoints: currentPoints + winningPoints,
                points: currentPoints + winningPoints, // Sync generic points field
                updatedAt: now
            }

            // Only update the appropriate spin timer
            if (bonusSpin) {
                updateData.lastBonusSpinAt = now
            } else {
                updateData.lastSpinAt = now
            }

            t.update(userRef, updateData)

            // Add Transaction Record
            if (winningPoints > 0) {
                const transRef = db!.collection('transactions').doc()
                t.set(transRef, {
                    userId,
                    type: 'credit',
                    amount: winningPoints,
                    source: bonusSpin ? 'bonus_spin' : 'lucky_spin',
                    status: 'completed',
                    description: bonusSpin ? 'Bonus Spin Reward (Ad)' : 'Daily Lucky Spin Reward',
                    createdAt: now
                })
            }

            return { points: winningPoints }
        })

        // Add Tournament Points (10 pts for spinning)
        const TOURNAMENT_POINTS_PER_SPIN = 10
        const now = Date.now()
        const weekDate = new Date(now)
        const startOfYear = new Date(weekDate.getFullYear(), 0, 1)
        const weekNumber = Math.ceil(((weekDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
        const weekKey = `${weekDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`

        try {
            const userDoc = await db.collection('users').doc(userId).get()
            const userData = userDoc.data() || {}

            const entrySnapshot = await db.collection('tournament_entries')
                .where('weekKey', '==', weekKey)
                .where('userId', '==', userId)
                .limit(1)
                .get()

            if (!entrySnapshot.empty) {
                const entryDoc = entrySnapshot.docs[0]
                await entryDoc.ref.update({
                    points: (entryDoc.data().points || 0) + TOURNAMENT_POINTS_PER_SPIN,
                    lastUpdated: now,
                })
            } else {
                // Auto-join tournament
                await db.collection('tournament_entries').add({
                    weekKey,
                    userId,
                    name: userData.name || userData.username || 'Anonymous',
                    avatar: userData.avatarUrl || '',
                    points: TOURNAMENT_POINTS_PER_SPIN,
                    joinedAt: now,
                    lastUpdated: now,
                })
            }
        } catch (tournamentError) {
            console.error('Failed to add tournament points for spin:', tournamentError)
        }

        return res.status(200).json({
            success: true,
            points: result.points,
            awarded: true,
            tournamentPoints: TOURNAMENT_POINTS_PER_SPIN,
            bonusSpin: !!bonusSpin
        })

    } catch (error: any) {
        console.error('Spin play error:', error)
        if (error.message === 'Daily spin cooldown active') {
            return res.status(429).json({ error: 'Please wait 24h before spinning again' })
        }
        if (error.message === 'Bonus spin already used today') {
            return res.status(429).json({ error: 'Bonus spin already used today. Try again tomorrow!' })
        }
        return res.status(500).json({ error: 'Failed to process spin' })
    }
}

export default allowCors(handler)
