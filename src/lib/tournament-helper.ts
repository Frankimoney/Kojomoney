/**
 * Tournament Points Helper
 * 
 * Add tournament points when users complete activities.
 * This ensures users appear on the Weekly Cup leaderboard.
 */

import { db } from '@/lib/firebase-admin'

// Tournament points per activity type
export const TOURNAMENT_POINTS = {
    survey: 50,
    offerwall: 30,
    mission: 20,
    referral: 100,
    trivia: 20,
    newsRead: 5,
    adWatch: 10,
    game: 15,
    dailyChallenge: 25,
    checkIn: 5,
    socialFollow: 15,
}

export type TournamentActivityType = keyof typeof TOURNAMENT_POINTS

function getCurrentWeekKey(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
}

/**
 * Add tournament points for a user's activity
 * 
 * @param userId - The user's ID
 * @param activityType - Type of activity completed
 * @param customPoints - Optional custom points (overrides default)
 * @returns true if successful, false otherwise
 */
export async function addTournamentPoints(
    userId: string,
    activityType: TournamentActivityType,
    customPoints?: number
): Promise<boolean> {
    if (!db || !userId) return false

    const points = customPoints ?? TOURNAMENT_POINTS[activityType] ?? 10
    const weekKey = getCurrentWeekKey()
    const now = Date.now()

    try {
        // Check if user already has an entry for this week
        const entrySnapshot = await db.collection('tournament_entries')
            .where('weekKey', '==', weekKey)
            .where('userId', '==', userId)
            .limit(1)
            .get()

        if (entrySnapshot.empty) {
            // Create new entry for this user
            const userDoc = await db.collection('users').doc(userId).get()
            const userData = userDoc.exists ? userDoc.data() : {}

            await db.collection('tournament_entries').add({
                weekKey,
                userId,
                name: userData?.displayName || userData?.name || userData?.username || 'Anonymous',
                avatar: userData?.avatarUrl || '',
                points,
                joinedAt: now,
                lastUpdated: now,
                lastActivity: activityType,
            })
        } else {
            // Update existing entry
            const entryDoc = entrySnapshot.docs[0]
            const currentPoints = entryDoc.data().points || 0

            await entryDoc.ref.update({
                points: currentPoints + points,
                lastUpdated: now,
                lastActivity: activityType,
            })
        }

        console.log(`[Tournament] Added ${points} pts for ${userId} (${activityType})`)
        return true
    } catch (error) {
        console.error('[Tournament] Error adding points:', error)
        return false
    }
}

/**
 * Batch add tournament points (useful for bulk operations)
 */
export async function addTournamentPointsBatch(
    entries: Array<{ userId: string; activityType: TournamentActivityType; points?: number }>
): Promise<number> {
    let successCount = 0
    for (const entry of entries) {
        const success = await addTournamentPoints(entry.userId, entry.activityType, entry.points)
        if (success) successCount++
    }
    return successCount
}
