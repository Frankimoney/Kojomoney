import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

// GET /api/withdrawal?userId=xxx - Fetch withdrawal history for a user
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        // Fetch withdrawals for this user
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('userId', '==', userIdStr)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get()

        const withdrawals = withdrawalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        return res.status(200).json({
            success: true,
            withdrawals
        })
    } catch (error) {
        console.error('Error fetching withdrawals:', error)
        return res.status(500).json({ error: 'Failed to fetch withdrawals' })
    }
}

// POST /api/withdrawal - Request a new withdrawal
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId, amount, bankName, accountNumber, accountName } = req.body

        if (!userId || !amount || !bankName || !accountNumber || !accountName) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        if (amount < 1000) {
            return res.status(400).json({ error: 'Minimum withdrawal amount is ₦1,000' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        // Get user to check balance
        const userDoc = await db.collection('users').doc(userId).get()
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()!
        const currentPoints = userData.totalPoints || 0

        if (currentPoints < amount) {
            return res.status(400).json({ error: 'Insufficient balance' })
        }

        // Check for recent withdrawal (one per week limit)
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        const recentWithdrawal = await db.collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>', oneWeekAgo)
            .where('status', 'in', ['pending', 'approved'])
            .limit(1)
            .get()

        if (!recentWithdrawal.empty) {
            return res.status(400).json({ error: 'You can only make one withdrawal per week' })
        }

        // Create withdrawal request
        const withdrawalRef = db.collection('withdrawals').doc()
        const withdrawal = {
            id: withdrawalRef.id,
            userId,
            amount,
            bankName,
            accountNumber,
            accountName,
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        await withdrawalRef.set(withdrawal)

        // Deduct points from user (hold until approved/rejected)
        await db.collection('users').doc(userId).update({
            totalPoints: currentPoints - amount,
            updatedAt: Date.now()
        })

        // Log the transaction
        await db.collection('transactions').add({
            userId,
            type: 'debit',
            amount,
            source: 'withdrawal',
            status: 'pending',
            withdrawalId: withdrawalRef.id,
            createdAt: Date.now()
        })

        return res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            withdrawal
        })
    } catch (error) {
        console.error('Error creating withdrawal:', error)
        return res.status(500).json({ error: 'Failed to create withdrawal' })
    }
}
