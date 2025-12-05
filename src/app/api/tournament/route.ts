import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    try {
        const weekId = getCurrentWeekId()
        // Determine live or cached? Realtime DB orderByChild is good for small-medium lists.
        const leaderboardRef = db.ref(`tournaments/${weekId}/participants`).orderByChild('points').limitToLast(100)

        const snapshot = await leaderboardRef.once('value')
        const rawData = snapshot.val() || {}

        // RTDB returns object keys. Convert to array and reverse (descending order)
        let players = Object.entries(rawData).map(([uid, data]: [string, any]) => ({
            id: uid,
            name: data.name || 'Anonymous',
            avatar: data.avatar || '',
            points: data.points || 0,
            tier: calculateTier(data.points),
            change: data.change || 0,
            rank: 0,
            isMe: false
        })).sort((a, b) => b.points - a.points)

        // Add rank
        players = players.map((p, i) => ({ ...p, rank: i + 1 }))

        // Prepare response
        const userEntry = userId ? players.find(p => p.id === userId) : null

        // If user is not in top 100, fetch their specific node
        let me = userEntry
        if (userId && !me) {
            const mySnap = await db.ref(`tournaments/${weekId}/participants/${userId}`).once('value')
            const myData = mySnap.val() || { points: 0, name: 'You' }
            me = {
                id: userId,
                name: myData.name,
                avatar: myData.avatar,
                points: myData.points || 0,
                tier: calculateTier(myData.points || 0),
                rank: 999, // 999+
                change: 0,
                isMe: true
            }
        } else if (me) {
            me = { ...me, isMe: true }
        }

        return NextResponse.json({
            weekId,
            timeLeft: getTimeLeftInWeek(),
            leaderboard: players,
            me: me || { id: 'guest', rank: 0, points: 0, tier: 'Bronze' }
        })

    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}

function calculateTier(points: number) {
    if (points > 10000) return 'Platinum'
    if (points > 5000) return 'Gold'
    if (points > 1000) return 'Silver'
    return 'Bronze'
}

function getCurrentWeekId() {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil(days / 7)
    return `${now.getFullYear()}-W${weekNumber}`
}

function getTimeLeftInWeek() {
    const now = new Date()
    const endOfWeek = new Date()
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
    endOfWeek.setHours(23, 59, 59)
    return endOfWeek.getTime() - now.getTime()
}
