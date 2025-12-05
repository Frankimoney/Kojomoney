import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        try {
            const snap = await db
                .collection('withdrawals')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()

            return NextResponse.json({ withdrawals: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
        } catch (err: any) {
            const msg = String(err?.details || err?.message || '')
            // Fallback when composite index is missing: fetch without orderBy and sort in memory
            if (msg.includes('requires an index') || err?.code === 9) {
                const snap = await db
                    .collection('withdrawals')
                    .where('userId', '==', userId)
                    .get()
                const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
                rows.sort((a, b) => {
                    const ad = a.createdAt?.toDate?.() ?? a.createdAt ?? 0
                    const bd = b.createdAt?.toDate?.() ?? b.createdAt ?? 0
                    return new Date(bd).getTime() - new Date(ad).getTime()
                })
                return NextResponse.json({ withdrawals: rows.slice(0, 20) })
            }
            throw err
        }
    } catch (error) {
        console.error('Error fetching withdrawals:', error)
        return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId, amount, bankName, accountNumber, accountName } = await request.json()

        // Validate minimum withdrawal
        if (amount < 1000) {
            return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 })
        }

        // Check user points
        const userSnap = await db.collection('users').doc(userId).get()
        const user = userSnap.data() as any
        if (!user || (user.totalPoints || 0) < amount) {
            return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
        }

        // Check for existing withdrawal this week
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentSnap = await db
            .collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>=', Timestamp.fromDate(oneWeekAgo))
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get()
        const recentWithdrawal = recentSnap.docs.find((d) => {
            const s = d.data() as any
            return s.status === 'pending' || s.status === 'approved'
        })

        if (recentWithdrawal) {
            return NextResponse.json({ error: 'One withdrawal per week allowed' }, { status: 400 })
        }

        // Create withdrawal request
        const newDoc = await db.collection('withdrawals').add({
            userId,
            amount,
            bankName,
            accountNumber,
            accountName,
            status: 'pending',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })
        const withdrawalSnap = await newDoc.get()
        const withdrawal = { id: newDoc.id, ...withdrawalSnap.data() }

        // Deduct points from user
        await db.collection('users').doc(userId).update({ totalPoints: FieldValue.increment(-amount) })

        return NextResponse.json({
            success: true,
            withdrawal,
            message: 'Withdrawal request submitted successfully'
        })
    } catch (error) {
        console.error('Error creating withdrawal:', error)
        return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
    }
}
