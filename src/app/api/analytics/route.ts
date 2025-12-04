import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
    try {
        const { userId, event, data } = await request.json()

        // Track different types of events
        switch (event) {
            case 'story_completion':
                await trackStoryCompletion(userId, data)
                break
            case 'ad_completion':
                await trackAdCompletion(userId, data)
                break
            case 'trivia_completion':
                await trackTriviaCompletion(userId, data)
                break
            case 'user_engagement':
                await trackUserEngagement(userId, data)
                break
            default:
                console.log('Unknown event type:', event)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error tracking analytics:', error)
        return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const eventType = searchParams.get('event')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Get user analytics data
        const analytics = await getUserAnalytics(userId, eventType || undefined)

        return NextResponse.json({ analytics })
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}

async function trackStoryCompletion(userId: string, data: any) {
    const { storyId, timeSpent, quizCorrect } = data

    // Update daily activity
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateId = today.toISOString().substring(0, 10)
    const docRef = db.collection('daily_activities').doc(`${userId}_${dateId}`)
    const snap = await docRef.get()
    if (snap.exists) {
        await docRef.update({
            storiesRead: FieldValue.increment(1),
            pointsEarned: FieldValue.increment(quizCorrect ? 10 : 0),
            updatedAt: Timestamp.now(),
        })
    } else {
        await docRef.set({
            userId,
            date: Timestamp.fromDate(today),
            adsWatched: 0,
            storiesRead: 1,
            triviaPlayed: false,
            pointsEarned: quizCorrect ? 10 : 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })
    }

    console.log(`Story completion tracked: User ${userId}, Story ${storyId}, Time: ${timeSpent}s, Correct: ${quizCorrect}`)
}

async function trackAdCompletion(userId: string, data: any) {
    const { adViewId, timeSpent } = data

    // Update daily activity
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateId = today.toISOString().substring(0, 10)
    const docRef = db.collection('daily_activities').doc(`${userId}_${dateId}`)
    const snap = await docRef.get()
    if (snap.exists) {
        await docRef.update({
            adsWatched: FieldValue.increment(1),
            pointsEarned: FieldValue.increment(5),
            updatedAt: Timestamp.now(),
        })
    } else {
        await docRef.set({
            userId,
            date: Timestamp.fromDate(today),
            adsWatched: 1,
            storiesRead: 0,
            triviaPlayed: false,
            pointsEarned: 5,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })
    }

    console.log(`Ad completion tracked: User ${userId}, Ad ${adViewId}, Time: ${timeSpent}s`)
}

async function trackTriviaCompletion(userId: string, data: any) {
    const { triviaId, correctAnswers, totalQuestions, pointsEarned } = data

    // Update daily activity
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateId = today.toISOString().substring(0, 10)
    const docRef = db.collection('daily_activities').doc(`${userId}_${dateId}`)
    const snap = await docRef.get()
    if (snap.exists) {
        await docRef.update({
            triviaPlayed: true,
            pointsEarned: FieldValue.increment(pointsEarned),
            updatedAt: Timestamp.now(),
        })
    } else {
        await docRef.set({
            userId,
            date: Timestamp.fromDate(today),
            adsWatched: 0,
            storiesRead: 0,
            triviaPlayed: true,
            pointsEarned,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })
    }

    console.log(`Trivia completion tracked: User ${userId}, Score: ${correctAnswers}/${totalQuestions}, Points: ${pointsEarned}`)
}

async function trackUserEngagement(userId: string, data: any) {
    const { sessionDuration, actionsPerformed } = data

    // Update user's last active date
    await db.collection('users').doc(userId).update({ lastActiveDate: Timestamp.now() })

    console.log(`User engagement tracked: User ${userId}, Duration: ${sessionDuration}s, Actions: ${actionsPerformed}`)
}

async function getUserAnalytics(userId: string, eventType?: string) {
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get daily activities for the last 7 days
    const activitiesSnap = await db
        .collection('daily_activities')
        .where('userId', '==', userId)
        .where('date', '>=', Timestamp.fromDate(sevenDaysAgo))
        .orderBy('date', 'desc')
        .get()
    const dailyActivities: Array<{ id: string; adsWatched: number; storiesRead: number; triviaPlayed: boolean; pointsEarned: number; date?: any }> = activitiesSnap.docs.map((d) => {
        const v = d.data() as any
        return {
            id: d.id,
            adsWatched: v.adsWatched || 0,
            storiesRead: v.storiesRead || 0,
            triviaPlayed: !!v.triviaPlayed,
            pointsEarned: v.pointsEarned || 0,
            date: v.date?.toDate?.() ?? v.date,
        }
    })

    // Calculate totals
    const totals = dailyActivities.reduce((acc, activity) => {
        acc.adsWatched += activity.adsWatched
        acc.storiesRead += activity.storiesRead
        acc.triviaPlayed += activity.triviaPlayed ? 1 : 0
        acc.pointsEarned += activity.pointsEarned
        return acc
    }, {
        adsWatched: 0,
        storiesRead: 0,
        triviaPlayed: 0,
        pointsEarned: 0
    })

    // Get user info
    const userSnap = await db.collection('users').doc(userId).get()
    const user = userSnap.exists
        ? {
              totalPoints: (userSnap.data() as any)?.totalPoints || 0,
              dailyStreak: (userSnap.data() as any)?.dailyStreak || 0,
              lastActiveDate: (userSnap.data() as any)?.lastActiveDate || null,
          }
        : null

    return {
        last7Days: totals,
        dailyActivities,
        userInfo: user,
        engagementMetrics: {
            averageDailyPoints: Math.round(totals.pointsEarned / 7),
            activeDays: dailyActivities.length,
            completionRate: dailyActivities.length > 0 ? (totals.triviaPlayed / dailyActivities.length) * 100 : 0
        }
    }
}
