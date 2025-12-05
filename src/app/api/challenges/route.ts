import { NextRequest, NextResponse } from 'next/server'
import { db, getTimestamp } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

// Mock config - usually database driven
const DAILY_CONFIG = {
    c1: { title: 'Daily Logger', target: 1, reward: 10, type: 'login' },
    c2: { title: 'Ad Watcher', target: 3, reward: 50, type: 'ad_watch' },
    c3: { title: 'Survey Starter', target: 1, reward: 100, type: 'survey_start' },
    c4: { title: 'Trivia Master', target: 1, reward: 20, type: 'trivia' }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'Missing User ID' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]

    try {
        const progressRef = db.ref(`daily_challenges/${today}/${userId}`)
        const snapshot = await progressRef.once('value')
        const progress = snapshot.val() || {}

        // Merge config with progress
        const challenges = Object.entries(DAILY_CONFIG).map(([id, config]) => {
            const userState = progress[id] || { current: 0, claimed: false }
            return {
                id,
                ...config,
                current: userState.current,
                isClaimed: userState.claimed
            }
        })

        const bonusClaimed = progress.bonusClaimed || false

        return NextResponse.json({
            date: today,
            challenges,
            streak: progress.streak || 0,
            bonusClaimed
        })
    } catch (e) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    // Handle CLAIM action
    const body = await req.json()
    const { userId, challengeId, action } = body
    const today = new Date().toISOString().split('T')[0]

    if (action === 'claim_bonus') {
        // Verify all done
        const ref = db.ref(`daily_challenges/${today}/${userId}`)
        const snap = await ref.once('value')
        const data = snap.val() || {}

        // logic to check sufficiency... simplified for now:
        const allDone = Object.keys(DAILY_CONFIG).every(cid => (data[cid]?.current || 0) >= DAILY_CONFIG[cid as keyof typeof DAILY_CONFIG].target)

        if (!allDone) return NextResponse.json({ error: 'Not all tasks completed' }, { status: 400 })
        if (data.bonusClaimed) return NextResponse.json({ error: 'Already claimed' }, { status: 400 })

        // 250 bonus points
        await db.ref(`users/${userId}/balance`).transaction(c => (c || 0) + 250)
        await ref.update({ bonusClaimed: true })

        return NextResponse.json({ success: true, reward: 250 })
    }

    if (action === 'claim') {
        const ref = db.ref(`daily_challenges/${today}/${userId}/${challengeId}`)
        const snap = await ref.once('value')
        const taskData = snap.val() || { current: 0 }
        const config = DAILY_CONFIG[challengeId as keyof typeof DAILY_CONFIG]

        if (taskData.claimed) return NextResponse.json({ error: 'Already claimed' }, { status: 400 })
        if (taskData.current < config.target) return NextResponse.json({ error: 'Not finished' }, { status: 400 })

        await db.ref(`users/${userId}/balance`).transaction(c => (c || 0) + config.reward)
        await ref.update({ claimed: true })

        return NextResponse.json({ success: true, reward: config.reward })
    }

    // Handle EVENT (Simulate tracking)
    if (action === 'event') {
        const { type } = body // e.g., 'ad_watch'
        // Find matching challenge
        const challengeId = Object.keys(DAILY_CONFIG).find(k => DAILY_CONFIG[k as keyof typeof DAILY_CONFIG].type === type)
        if (challengeId) {
            await db.ref(`daily_challenges/${today}/${userId}/${challengeId}/current`).transaction(c => (c || 0) + 1)
            return NextResponse.json({ success: true, tracked: true })
        }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
