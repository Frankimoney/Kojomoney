import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const table = searchParams.get('table')

        // Basic auth check (in production, use proper authentication)
        const authHeader = request.headers.get('authorization')
        if (authHeader !== 'Bearer admin-earnapp-2024') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        switch (action) {
            case 'overview':
                return await getOverview()
            case 'table':
                return await getTableData(table)
            case 'users':
                return await getUsers()
            case 'stats':
                return await getStats()
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error) {
        console.error('Admin API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function getOverview() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [usersSnap, newsSnap, triviaSnap, withdrawalsSnap, activeSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('news_stories').get(),
        db.collection('daily_trivias').get(),
        db.collection('withdrawals').get(),
        db.collection('users').where('lastActiveDate', '>=', Timestamp.fromDate(sevenDaysAgo)).get(),
    ])

    // Sum total points in system
    const totalPointsInSystem = usersSnap.docs.reduce((sum, d) => {
        const val = (d.data() as any)?.totalPoints || 0
        return sum + (typeof val === 'number' ? val : 0)
    }, 0)

    return NextResponse.json({
        overview: {
            totalUsers: usersSnap.size,
            totalNews: newsSnap.size,
            totalTrivia: triviaSnap.size,
            totalWithdrawals: withdrawalsSnap.size,
            totalPointsInSystem,
            activeUsersThisWeek: activeSnap.size,
        }
    })
}

async function getTableData(table?: string | null) {
    if (!table) {
        return NextResponse.json({ error: 'Table parameter required' }, { status: 400 })
    }

    const limit = 50
    let data: any[] = []

    switch (table) {
        case 'users': {
            const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(limit).get()
            data = snap.docs.map((d) => {
                const v = d.data() as any
                return {
                    id: d.id,
                    ...v,
                    createdAt: v.createdAt?.toDate?.() ?? v.createdAt ?? null,
                    lastActiveDate: v.lastActiveDate?.toDate?.() ?? v.lastActiveDate ?? null,
                }
            })
            break
        }
        case 'news_reads': {
            const snap = await db.collection('news_reads').orderBy('startedAt', 'desc').limit(limit).get()
            const rows = snap.docs.map((d) => {
                const v = d.data() as any
                return {
                    id: d.id,
                    ...v,
                    startedAt: v.startedAt?.toDate?.() ?? v.startedAt ?? null,
                    completedAt: v.completedAt?.toDate?.() ?? v.completedAt ?? null,
                }
            }) as any[]
            const userIds = Array.from(new Set(rows.map((r) => r.userId)))
            const storyIds = Array.from(new Set(rows.map((r) => r.storyId)))
            const userMap: Record<string, any> = {}
            const storyMap: Record<string, any> = {}
            await Promise.all([
                Promise.all(userIds.map(async (uid) => {
                    const u = await db.collection('users').doc(uid).get()
                    userMap[uid] = u.exists ? u.data() : null
                })),
                Promise.all(storyIds.map(async (sid) => {
                    const s = await db.collection('news_stories').doc(sid).get()
                    storyMap[sid] = s.exists ? s.data() : null
                })),
            ])
            data = rows.map((r) => ({ ...r, user: userMap[r.userId] ? { email: (userMap[r.userId] as any).email } : null, story: storyMap[r.storyId] ? { title: (storyMap[r.storyId] as any).title } : null }))
            break
        }
        case 'ad_views': {
            const snap = await db.collection('ad_views').orderBy('startedAt', 'desc').limit(limit).get()
            const rows = snap.docs.map((d) => {
                const v = d.data() as any
                return {
                    id: d.id,
                    ...v,
                    startedAt: v.startedAt?.toDate?.() ?? v.startedAt ?? null,
                    completedAt: v.completedAt?.toDate?.() ?? v.completedAt ?? null,
                }
            }) as any[]
            const userIds = Array.from(new Set(rows.map((r) => r.userId)))
            const userMap: Record<string, any> = {}
            await Promise.all(userIds.map(async (uid) => {
                const u = await db.collection('users').doc(uid).get()
                userMap[uid] = u.exists ? u.data() : null
            }))
            data = rows.map((r) => ({ ...r, user: userMap[r.userId] ? { email: (userMap[r.userId] as any).email } : null }))
            break
        }
        case 'withdrawals': {
            const snap = await db.collection('withdrawals').orderBy('createdAt', 'desc').limit(limit).get()
            const rows = snap.docs.map((d) => {
                const v = d.data() as any
                return {
                    id: d.id,
                    ...v,
                    createdAt: v.createdAt?.toDate?.() ?? v.createdAt ?? null,
                }
            }) as any[]
            const userIds = Array.from(new Set(rows.map((r) => r.userId)))
            const userMap: Record<string, any> = {}
            await Promise.all(userIds.map(async (uid) => {
                const u = await db.collection('users').doc(uid).get()
                userMap[uid] = u.exists ? u.data() : null
            }))
            data = rows.map((r) => ({ ...r, user: userMap[r.userId] ? { email: (userMap[r.userId] as any).email } : null }))
            break
        }
        case 'daily_activities': {
            const snap = await db.collection('daily_activities').orderBy('date', 'desc').limit(limit).get()
            const rows = snap.docs.map((d) => {
                const v = d.data() as any
                return { id: d.id, ...v, date: v.date?.toDate?.() ?? v.date ?? null }
            }) as any[]
            const userIds = Array.from(new Set(rows.map((r) => r.userId)))
            const userMap: Record<string, any> = {}
            await Promise.all(userIds.map(async (uid) => {
                const u = await db.collection('users').doc(uid).get()
                userMap[uid] = u.exists ? u.data() : null
            }))
            data = rows.map((r) => ({ ...r, user: userMap[r.userId] ? { email: (userMap[r.userId] as any).email } : null }))
            break
        }
        default:
            return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    return NextResponse.json({ table, data })
}

async function getUsers() {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get()
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ users })
}

async function getStats() {
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [usersWeekSnap, usersMonthSnap, usersSnapAll, activitiesSnap, withdrawalsSnap, topUsersSnap] = await Promise.all([
        db.collection('users').where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)).get(),
        db.collection('users').where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)).get(),
        db.collection('users').get(),
        db.collection('daily_activities').where('date', '>=', Timestamp.fromDate(sevenDaysAgo)).get(),
        db.collection('withdrawals').where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)).get(),
        db.collection('users').orderBy('totalPoints', 'desc').limit(10).get(),
    ])

    const totalPointsInSystem = usersSnapAll.docs.reduce((sum, d) => sum + (((d.data() as any)?.totalPoints) || 0), 0)
    const pointsEarnedThisWeek = activitiesSnap.docs.reduce((sum, d) => sum + (((d.data() as any)?.pointsEarned) || 0), 0)
    const totalWithdrawalsThisMonth = withdrawalsSnap.docs.reduce((sum, d) => sum + (((d.data() as any)?.amount) || 0), 0)
    const topUsers = topUsersSnap.docs.map((d) => ({
        email: (d.data() as any)?.email,
        name: (d.data() as any)?.name,
        totalPoints: (d.data() as any)?.totalPoints || 0,
        dailyStreak: (d.data() as any)?.dailyStreak || 0,
        createdAt: (d.data() as any)?.createdAt,
    }))

    return NextResponse.json({
        stats: {
            newUsersThisWeek: usersWeekSnap.size,
            newUsersThisMonth: usersMonthSnap.size,
            totalPointsInSystem,
            pointsEarnedThisWeek,
            totalWithdrawalsThisMonth,
            topUsers,
        }
    })
}
