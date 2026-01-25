/**
 * Milestone Celebration Service
 * 
 * Sends push notifications when users reach point milestones
 * Milestones: 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000 points
 */

import { db } from '@/lib/firebase-admin'
import { sendPushToUser } from '@/pages/api/notifications/send'

// Point milestones that trigger celebrations
const POINT_MILESTONES = [
    { points: 100, emoji: '🎉', message: 'First 100 points!' },
    { points: 500, emoji: '⭐', message: 'You reached 500 points!' },
    { points: 1000, emoji: '🏆', message: '1,000 points milestone!' },
    { points: 2500, emoji: '🚀', message: '2,500 points achieved!' },
    { points: 5000, emoji: '💎', message: '5,000 points - Amazing!' },
    { points: 10000, emoji: '🔥', message: '10K points unlocked!' },
    { points: 25000, emoji: '👑', message: '25K points - You\'re a pro!' },
    { points: 50000, emoji: '💰', message: '50K points - Incredible!' },
    { points: 100000, emoji: '🏅', message: '100K points - Legendary!' },
]

/**
 * Check if user just crossed a milestone and send celebration notification
 * 
 * @param userId - The user's ID
 * @param previousPoints - Points before this transaction
 * @param newPoints - Points after this transaction
 */
export async function checkAndCelebrateMilestone(
    userId: string,
    previousPoints: number,
    newPoints: number
): Promise<void> {
    if (!db || previousPoints >= newPoints) return

    try {
        // Find milestones that were just crossed
        const crossedMilestones = POINT_MILESTONES.filter(
            m => previousPoints < m.points && newPoints >= m.points
        )

        if (crossedMilestones.length === 0) return

        // Get user's already celebrated milestones
        const userDoc = await db.collection('users').doc(userId).get()
        const userData = userDoc.data()
        const celebratedMilestones: number[] = userData?.celebratedMilestones || []

        // Find uncelebrated milestone
        const newMilestone = crossedMilestones.find(m => !celebratedMilestones.includes(m.points))

        if (!newMilestone) return

        // Send push notification
        await sendPushToUser(
            userId,
            `${newMilestone.emoji} Milestone Reached!`,
            `${newMilestone.message} Keep earning to reach the next level!`,
            { type: 'milestone', milestone: newMilestone.points }
        )

        // Mark milestone as celebrated
        await db.collection('users').doc(userId).update({
            celebratedMilestones: [...celebratedMilestones, newMilestone.points]
        })

        console.log(`[Milestone] User ${userId} celebrated ${newMilestone.points} points milestone`)

    } catch (error) {
        console.error('[Milestone] Error checking/celebrating milestone:', error)
    }
}

/**
 * Quick inline check for milestones - use this in high-traffic endpoints
 * Runs asynchronously and doesn't block the main flow
 */
export function checkMilestoneAsync(
    userId: string,
    previousPoints: number,
    newPoints: number
): void {
    // Fire and forget - don't await
    checkAndCelebrateMilestone(userId, previousPoints, newPoints).catch(err => {
        console.error('[Milestone] Background check failed:', err)
    })
}
