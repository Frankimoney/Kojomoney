import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        // Fetch user's referral data
        const referralsRef = db.ref(`users/${userId}/referrals`)
        const snapshot = await referralsRef.once('value')
        const referralsMap = snapshot.val() || {}

        // Calculate stats
        const referrals = Object.entries(referralsMap).map(([refId, data]: [string, any]) => ({
            id: refId,
            ...data
        }))

        const totalEarned = referrals.reduce((acc, r) => acc + (r.earnedAmount || 0), 0)
        const activeCount = referrals.filter(r => r.status === 'active' || r.status === 'completed').length

        // Milestones (Hardcoded or fetched from DB config)
        const milestones = [
            { id: 1, count: 5, reward: 500 },
            { id: 2, count: 10, reward: 1200 },
            { id: 3, count: 25, reward: 3500 },
            { id: 4, count: 50, reward: 8000 },
            { id: 5, count: 100, reward: 20000 },
        ]

        // Check if any new milestone is reached (conceptually)
        // In a real app we'd trigger this event driven, but here we just return the config.

        return NextResponse.json({
            referrals,
            stats: {
                totalEarned,
                activeCount,
                totalInvites: referrals.length
            },
            milestones
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }
}
