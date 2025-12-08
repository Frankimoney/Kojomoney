/**
 * Admin Process Withdrawal API Endpoint
 * 
 * POST /api/admin/withdrawals/process - Approve or reject a withdrawal
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { notifyWithdrawalProcessed } from '@/services/emailService'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    // TODO: Add admin authentication check

    try {
        const { withdrawalId, action, rejectionReason, adminId } = req.body

        if (!withdrawalId || !action) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' })
        }

        // Fetch the withdrawal
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId)
        const withdrawalDoc = await withdrawalRef.get()

        if (!withdrawalDoc.exists) {
            return res.status(404).json({ error: 'Withdrawal not found' })
        }

        const withdrawal = withdrawalDoc.data()!

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ error: 'Withdrawal is not pending' })
        }

        const now = Date.now()

        if (action === 'approve') {
            // Update withdrawal status
            await withdrawalRef.update({
                status: 'completed',
                processedAt: now,
                processedBy: adminId || 'admin',
            })

            // The points were already deducted when user requested withdrawal
            // Just mark it as complete

            // Create transaction record
            await db.collection('transactions').add({
                userId: withdrawal.userId,
                type: 'debit',
                amount: withdrawal.amount,
                source: 'withdrawal',
                status: 'completed',
                description: `Withdrawal via ${withdrawal.method}`,
                withdrawalId,
                createdAt: now,
            })

            // Send email notification to user
            try {
                const userEmail = withdrawal.userEmail || (await db.collection('users').doc(withdrawal.userId).get()).data()?.email
                if (userEmail) {
                    await notifyWithdrawalProcessed(userEmail, withdrawal.amount, 'approved')
                }
            } catch (emailErr) {
                console.error('Failed to send approval email:', emailErr)
            }

            return res.status(200).json({
                success: true,
                message: 'Withdrawal approved',
            })
        } else {
            // Reject - refund points to user
            await withdrawalRef.update({
                status: 'rejected',
                processedAt: now,
                processedBy: adminId || 'admin',
                rejectionReason: rejectionReason || 'Rejected by admin',
            })

            // Refund points to user
            const userRef = db.collection('users').doc(withdrawal.userId)
            const userDoc = await userRef.get()

            if (userDoc.exists) {
                const currentPoints = userDoc.data()?.points || 0
                await userRef.update({
                    points: currentPoints + withdrawal.amount,
                })
            }

            // Create refund transaction
            await db.collection('transactions').add({
                userId: withdrawal.userId,
                type: 'credit',
                amount: withdrawal.amount,
                source: 'withdrawal_refund',
                status: 'completed',
                description: `Withdrawal refund: ${rejectionReason || 'Rejected'}`,
                withdrawalId,
                createdAt: now,
            })

            // Send email notification to user
            try {
                const userEmail = withdrawal.userEmail || (await db.collection('users').doc(withdrawal.userId).get()).data()?.email
                if (userEmail) {
                    await notifyWithdrawalProcessed(userEmail, withdrawal.amount, 'rejected', rejectionReason)
                }
            } catch (emailErr) {
                console.error('Failed to send rejection email:', emailErr)
            }

            return res.status(200).json({
                success: true,
                message: 'Withdrawal rejected and points refunded',
            })
        }
    } catch (error) {
        console.error('Error processing withdrawal:', error)
        return res.status(500).json({ error: 'Failed to process withdrawal' })
    }
}

export default requireAdmin(handler)
