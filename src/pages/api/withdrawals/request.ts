/**
 * Withdrawal Request API Endpoint
 * 
 * POST /api/withdrawals/request - Create a new withdrawal request
 * 
 * This endpoint deducts points from user and creates a pending withdrawal.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { notifyNewWithdrawal } from '@/services/emailService'
import { getEconomyConfig, pointsToUSD } from '@/lib/server-config'

export const dynamic = 'force-dynamic'

interface WithdrawalRequest {
    userId: string
    amount: number
    method: 'paypal' | 'bank' | 'crypto' | 'mobile_money' | 'gift_card'
    accountDetails: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId, amount, method, accountDetails } = req.body as WithdrawalRequest

        // Validate inputs
        if (!userId || !amount || !method || !accountDetails) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        if (amount < 1000) {
            return res.status(400).json({ error: 'Minimum withdrawal is 1000 points' })
        }

        // Get user and check balance
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()!
        const currentPoints = userData.points || 0

        if (currentPoints < amount) {
            return res.status(400).json({ error: 'Insufficient points' })
        }

        // Check for pending withdrawals
        const pendingSnapshot = await db
            .collection('withdrawals')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .limit(1)
            .get()

        if (!pendingSnapshot.empty) {
            return res.status(400).json({ error: 'You already have a pending withdrawal request' })
        }

        const now = Date.now()

        // Get configurable conversion rate from economy config
        const economyConfig = await getEconomyConfig()
        const userCountry = userData.country || 'GLOBAL'
        const amountUSD = pointsToUSD(amount, economyConfig, userCountry)

        // Deduct points
        await userRef.update({
            points: currentPoints - amount,
        })

        // Create withdrawal record
        const withdrawalData = {
            userId,
            userEmail: userData.email,
            amount,
            amountUSD,
            method,
            accountDetails,
            status: 'pending',
            createdAt: now,
        }

        const withdrawalRef = await db.collection('withdrawals').add(withdrawalData)

        // Create transaction record
        await db.collection('transactions').add({
            userId,
            type: 'debit',
            amount,
            source: 'withdrawal_request',
            status: 'pending',
            description: `Withdrawal request: ${amount} pts via ${method}`,
            withdrawalId: withdrawalRef.id,
            createdAt: now,
        })

        // Notify admins of new withdrawal
        try {
            await notifyNewWithdrawal({
                id: withdrawalRef.id,
                userId,
                userEmail: userData.email,
                amount,
                amountUSD,
                method,
                accountDetails,
                createdAt: now,
            })
        } catch (emailErr) {
            console.error('Failed to send admin notification:', emailErr)
        }

        return res.status(200).json({
            success: true,
            withdrawalId: withdrawalRef.id,
            message: 'Withdrawal request submitted. You will be notified when it is processed.',
        })
    } catch (error) {
        console.error('Error creating withdrawal request:', error)
        return res.status(500).json({ error: 'Failed to create withdrawal request' })
    }
}
