import { NextRequest, NextResponse } from 'next/server'
import { db, getTimestamp } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    try {
        // Fetch all available missions
        const missionsSnap = await db.ref('missions').once('value')
        const missions = missionsSnap.val() || {}

        // Fetch user's progress
        const userMissionsSnap = await db.ref(`user_missions/${userId}`).once('value')
        const userProgress = userMissionsSnap.val() || {}

        // Combine and format
        const missionList = Object.entries(missions).map(([id, data]: [string, any]) => {
            const userState = userProgress[id] || { status: 'available' }
            return {
                id,
                ...data,
                status: userState.status,
                completedSteps: userState.completedSteps || []
            }
        })

        return NextResponse.json({ missions: missionList })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { userId, missionId, proofUrl } = body

        if (!userId || !missionId || !proofUrl) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // Save proof for manual review
        const proofRef = db.ref('mission_proofs').push()
        await proofRef.set({
            userId,
            missionId,
            proofUrl,
            status: 'pending',
            submittedAt: getTimestamp()
        })

        // Update user status
        await db.ref(`user_missions/${userId}/${missionId}`).update({
            status: 'reviewing',
            proofSubmittedAt: getTimestamp()
        })

        return NextResponse.json({ success: true, message: 'Proof submitted' })

    } catch (error) {
        return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
    }
}
