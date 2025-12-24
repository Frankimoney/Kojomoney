/**
 * Scheduled Notifications Cron Endpoint
 * 
 * GET /api/cron/notifications
 * 
 * Called by a cron service (Vercel Cron, Railway, etc.) to send scheduled notifications:
 * - Streak at risk warnings (6pm local)
 * - Inactivity re-engagement (24h+ no login)
 * - Tournament reminders (last day of week)
 * 
 * Set up in vercel.json or as external cron
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { sendPushToUser } from '@/pages/api/notifications/send'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verify cron secret for security
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    const results = {
        streakWarnings: 0,
        inactivityReminders: 0,
        tournamentReminders: 0,
        errors: 0
    }

    try {
        const now = Date.now()
        const oneDayAgo = now - (24 * 60 * 60 * 1000)
        const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)
        const hour = new Date().getUTCHours()

        // 1. Streak at Risk Warnings (send once per day, around evening hours)
        if (hour >= 17 && hour <= 20) {
            const usersSnapshot = await db.collection('users')
                .where('dailyStreak', '>=', 2)
                .get()

            for (const doc of usersSnapshot.docs) {
                const user = doc.data()
                const userId = doc.id

                // Check if trivia completed today
                const todayStart = new Date()
                todayStart.setUTCHours(0, 0, 0, 0)

                const hasActivity = user.lastActiveDate &&
                    new Date(user.lastActiveDate).getTime() > todayStart.getTime()

                if (!hasActivity && user.dailyStreak >= 2) {
                    // Check if we already sent this notification today
                    const notifKey = `streak_warning_${userId}_${todayStart.toISOString().split('T')[0]}`
                    const sentCheck = await db.collection('sent_notifications').doc(notifKey).get()

                    if (!sentCheck.exists) {
                        try {
                            await sendPushToUser(
                                userId,
                                "🔥 Don't Lose Your Streak!",
                                `You have a ${user.dailyStreak}-day streak! Complete a task now to keep it.`,
                                { type: 'streak_warning', streak: user.dailyStreak }
                            )

                            // Mark as sent
                            await db.collection('sent_notifications').doc(notifKey).set({
                                sentAt: now,
                                type: 'streak_warning'
                            })

                            results.streakWarnings++
                        } catch (e) {
                            results.errors++
                        }
                    }
                }
            }
        }

        // 2. Multi-tier Inactivity Re-engagement
        // Define inactivity tiers with different messages and urgency
        const inactivityTiers = [
            {
                name: '1day',
                minHours: 24,
                maxHours: 48,
                title: "We miss you! 🎁",
                body: "Come back and earn! Your daily tasks are waiting.",
            },
            {
                name: '3day',
                minHours: 72,      // 3 days
                maxHours: 96,      // 4 days
                title: "Don't forget your earnings! 💰",
                body: "You have unclaimed opportunities. Quick tasks = quick points!",
            },
            {
                name: '7day',
                minHours: 168,     // 7 days
                maxHours: 336,     // 14 days
                title: "We've added new ways to earn! 🚀",
                body: "Check out what's new - surveys, offers, and bonus events await!",
            },
            {
                name: '30day',
                minHours: 720,     // 30 days
                maxHours: 2160,    // 90 days
                title: "Welcome back bonus ready! 🎉",
                body: "It's been a while! Come back for a special comeback reward.",
            }
        ]

        for (const tier of inactivityTiers) {
            const tierMinAgo = now - (tier.minHours * 60 * 60 * 1000)
            const tierMaxAgo = now - (tier.maxHours * 60 * 60 * 1000)

            // Query users inactive within this tier's window
            const inactiveUsersSnapshot = await db.collection('users')
                .where('updatedAt', '<', tierMinAgo)
                .where('updatedAt', '>', tierMaxAgo)
                .limit(50) // Process in smaller batches per tier
                .get()

            for (const doc of inactiveUsersSnapshot.docs) {
                const userId = doc.id
                const notifKey = `inactivity_${tier.name}_${userId}`
                const sentCheck = await db.collection('sent_notifications').doc(notifKey).get()

                // Only send once per tier (not per day)
                if (!sentCheck.exists) {
                    try {
                        await sendPushToUser(
                            userId,
                            tier.title,
                            tier.body,
                            { type: 'inactivity_reminder', tier: tier.name }
                        )

                        await db.collection('sent_notifications').doc(notifKey).set({
                            sentAt: now,
                            type: 'inactivity',
                            tier: tier.name
                        })

                        results.inactivityReminders++
                    } catch (e) {
                        results.errors++
                    }
                }
            }
        }

        // 3. Tournament Reminders (last day of the week)
        const dayOfWeek = new Date().getUTCDay()
        if (dayOfWeek === 0 && hour >= 10 && hour <= 12) { // Sunday morning
            // Get all tournament participants this week
            const startOfYear = new Date(new Date().getFullYear(), 0, 1)
            const weekNumber = Math.ceil((((now - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7)
            const weekKey = `${new Date().getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`

            const entriesSnapshot = await db.collection('tournament_entries')
                .where('weekKey', '==', weekKey)
                .limit(100)
                .get()

            for (const doc of entriesSnapshot.docs) {
                const entry = doc.data()
                const notifKey = `tournament_${entry.userId}_${weekKey}`
                const sentCheck = await db.collection('sent_notifications').doc(notifKey).get()

                if (!sentCheck.exists) {
                    try {
                        await sendPushToUser(
                            entry.userId,
                            "⏰ Tournament Ends Today!",
                            `You're at ${entry.points} points. Last chance to climb the leaderboard!`,
                            { type: 'tournament_reminder', weekKey }
                        )

                        await db.collection('sent_notifications').doc(notifKey).set({
                            sentAt: now,
                            type: 'tournament_reminder'
                        })

                        results.tournamentReminders++
                    } catch (e) {
                        results.errors++
                    }
                }
            }
        }

        // Cleanup old sent_notifications (older than 7 days)
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
        const oldNotifs = await db.collection('sent_notifications')
            .where('sentAt', '<', sevenDaysAgo)
            .limit(100)
            .get()

        const batch = db.batch()
        oldNotifs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()

        return res.status(200).json({
            success: true,
            ...results,
            message: `Sent ${results.streakWarnings + results.inactivityReminders + results.tournamentReminders} notifications`
        })

    } catch (error) {
        console.error('Cron notification error:', error)
        return res.status(500).json({ error: 'Failed to process scheduled notifications' })
    }
}
