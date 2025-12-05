import { NextRequest, NextResponse } from 'next/server'
import { db, getTimestamp } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params

    try {
        // 1. Parse Payload
        // Different providers use different formats (query params vs body)
        // For this generic adapter, we assume a standard JSON body or normalized query params
        const body = await req.json().catch(() => ({}))
        const { userId, offerId, payout, transId, signature, status } = body

        // 2. Validate Input
        if (!userId || !payout || !transId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 3. Verify Signature (Mock - usually involves hashing secrets)
        // const expectedSig = crypto.createHmac('sha256', SECRET).update(transId).digest('hex')
        // if (signature !== expectedSig) return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })

        if (status === 'chargeback') {
            // Handle chargebacks (deduct points)
            await handleChargeback(userId, payout, transId, provider)
            return NextResponse.json({ success: true, type: 'chargeback' })
        }

        // 4. Check for Duplicate Transaction
        const txRef = db.ref(`transactions`).orderByChild('externalTxId').equalTo(transId).limitToFirst(1)
        const snapshot = await txRef.once('value')
        if (snapshot.exists()) {
            return NextResponse.json({ success: true, message: 'Already processed' })
        }

        // 5. Credit User
        const amount = parseInt(payout) // Assume payout is in points

        await db.ref(`users/${userId}/balance`).transaction((current) => {
            return (current || 0) + amount
        })

        // 6. Log Transaction
        const newTxRef = db.ref('transactions').push()
        await newTxRef.set({
            userId,
            externalTxId: transId,
            provider,
            offerId,
            amount,
            type: 'credit',
            source: 'offerwall',
            status: 'completed',
            createdAt: getTimestamp()
        })

        // 7. Trigger Side Effects (Tournament Points, Daily Challenge)
        // We'll fire and forget these updates for performance
        updateTournamentPoints(userId, amount)
        updateDailyChallenge(userId, 'offer_completed')

        return NextResponse.json({ success: true, points_added: amount })

    } catch (error: any) {
        console.error('Postback Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Helper: Handle Chargebacks
async function handleChargeback(userId: string, amount: number, transId: string, provider: string) {
    await db.ref(`users/${userId}/balance`).transaction((current) => (current || 0) - amount)
    db.ref('transactions').push({
        userId,
        externalTxId: transId,
        provider,
        amount: -amount,
        type: 'debit',
        source: 'chargeback',
        status: 'completed',
        createdAt: getTimestamp()
    })
}

// Helper: Update Tournament
async function updateTournamentPoints(userId: string, points: number) {
    // Determine current tournament week ID
    const weekId = getCurrentWeekId()
    await db.ref(`tournaments/${weekId}/participants/${userId}`).transaction((current) => {
        if (!current) {
            return { points, name: 'Unknown', avatar: '' } // Would usually fetch user details here
        }
        current.points = (current.points || 0) + points
        return current
    })
}

// Helper: Update Daily Challenge
async function updateDailyChallenge(userId: string, type: string) {
    const today = new Date().toISOString().split('T')[0]
    // Specific logic would go here depending on configured challenges
    // For now we just increment a generic counter
    await db.ref(`daily_challenges/${userId}/${today}/generic_count`).transaction(c => (c || 0) + 1)
}

function getCurrentWeekId() {
    // Simple ISO Week logic or similar
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil(days / 7)
    return `${now.getFullYear()}-W${weekNumber}`
}
