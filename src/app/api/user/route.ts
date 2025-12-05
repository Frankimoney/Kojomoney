import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp } from 'firebase-admin/firestore'

 export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const userRef = db.collection('users').doc(userId)
        const userSnap = await userRef.get()
        if (!userSnap.exists) {
            await userRef.set({ totalPoints: 0, newsPoints: 0, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true })
        }
        const userDoc = await userRef.get()
        const user = { id: userDoc.id, ...userDoc.data() }

        let withdrawals: any[] = []
        try {
            const withdrawalsSnap = await db
                .collection('withdrawals')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get()
            withdrawals = withdrawalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (err: any) {
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                const snap = await db
                    .collection('withdrawals')
                    .where('userId', '==', userId)
                    .get()
                withdrawals = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
                withdrawals.sort((a, b) => {
                    const ad = a.createdAt?.toDate?.() ?? a.createdAt ?? 0
                    const bd = b.createdAt?.toDate?.() ?? b.createdAt ?? 0
                    return new Date(bd).getTime() - new Date(ad).getTime()
                })
                withdrawals = withdrawals.slice(0, 10)
            } else {
                throw err
            }
        }

        let dailyActivities: any[] = []
        try {
            const activitiesSnap = await db
                .collection('daily_activities')
                .where('userId', '==', userId)
                .orderBy('date', 'desc')
                .limit(7)
                .get()
            dailyActivities = activitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (err: any) {
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                const snap = await db
                    .collection('daily_activities')
                    .where('userId', '==', userId)
                    .get()
                dailyActivities = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
                dailyActivities.sort((a, b) => {
                    const ad = a.date?.toDate?.() ?? a.date ?? 0
                    const bd = b.date?.toDate?.() ?? b.date ?? 0
                    return new Date(bd).getTime() - new Date(ad).getTime()
                })
                dailyActivities = dailyActivities.slice(0, 7)
            } else {
                throw err
            }
        }

        // Calculate today's progress
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startTimestamp = Timestamp.fromDate(startOfDay)

        let adsWatched = 0
        try {
            const adsSnap = await db.collection('ad_views')
                .where('userId', '==', userId)
                .where('createdAt', '>=', startTimestamp)
                .get()
            adsWatched = adsSnap.size
        } catch (err: any) {
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                const snap = await db.collection('ad_views')
                    .where('userId', '==', userId)
                    .get()
                adsWatched = snap.docs.filter(d => {
                    const t = (d.data() as any)?.createdAt?.toDate?.() ?? (d.data() as any)?.createdAt
                    return t && new Date(t).getTime() >= startOfDay.getTime()
                }).length
            } else {
                throw err
            }
        }

        let storiesRead = 0
        try {
            const readsSnap = await db.collection('news_reads')
                .where('userId', '==', userId)
                .where('createdAt', '>=', startTimestamp)
                .get()
            storiesRead = readsSnap.size
        } catch (err: any) {
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                const snap = await db.collection('news_reads')
                    .where('userId', '==', userId)
                    .get()
                storiesRead = snap.docs.filter(d => {
                    const t = (d.data() as any)?.createdAt?.toDate?.() ?? (d.data() as any)?.createdAt
                    return t && new Date(t).getTime() >= startOfDay.getTime()
                }).length
            } else {
                throw err
            }
        }

        let triviaCompleted = false
        const todayForId = new Date()
        todayForId.setHours(0, 0, 0, 0)
        const dateId = todayForId.toLocaleDateString('en-CA')

        // Check daily_activities first (already fetched)
        const todayActivity = dailyActivities.find(d => d.id === `${userId}_${dateId}`)
        if (todayActivity?.triviaPlayed) {
            triviaCompleted = true
        }

        // Check trivia_attempts if not found yet
        if (!triviaCompleted) {
            try {
                const attemptSnap = await db.collection('trivia_attempts').doc(`${userId}_${dateId}`).get()
                if (attemptSnap.exists) {
                    triviaCompleted = true
                }
            } catch (e) {
                console.error('Error checking trivia attempts:', e)
            }
        }

        // Fallback to trivia_completions query if still false
        if (!triviaCompleted) {
            try {
                const triviaSnap = await db.collection('trivia_completions')
                    .where('userId', '==', userId)
                    .where('completedAt', '>=', startTimestamp)
                    .limit(1)
                    .get()
                triviaCompleted = !triviaSnap.empty
            } catch (err: any) {
                const msg = String(err?.details || err?.message || '')
                if (msg.includes('requires an index') || err?.code === 9) {
                    const snap = await db.collection('trivia_completions')
                        .where('userId', '==', userId)
                        .get()
                    triviaCompleted = snap.docs.some(d => {
                        const t = (d.data() as any)?.completedAt?.toDate?.() ?? (d.data() as any)?.completedAt
                        return t && new Date(t).getTime() >= startOfDay.getTime()
                    })
                } else {
                    console.error('Error checking trivia completions:', err)
                }
            }
        }

        const todayProgress = {
            adsWatched,
            storiesRead,
            triviaCompleted
        }

        // Fetch referral rewards
        let referralRewards: any[] = []
        try {
            const rewardsSnap = await db.collection('referral_rewards')
                .where('referrerId', '==', userId)
                .get()
            referralRewards = rewardsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        } catch (e) {
            console.error('Error fetching referral rewards:', e)
        }

        return NextResponse.json({ user: { ...user, withdrawals, dailyActivities, todayProgress, referralRewards } })
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { userId: idToUpdate, name, phone, email } = await request.json()

        await db.collection('users').doc(idToUpdate).update({
            name,
            phone,
            email,
            updatedAt: Timestamp.now(),
        })

        const updatedSnap = await db.collection('users').doc(idToUpdate).get()
        return NextResponse.json({ success: true, user: { id: idToUpdate, ...updatedSnap.data() } })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}
