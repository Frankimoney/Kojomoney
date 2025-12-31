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
            // Execution Logic (Airtime) - Auto-send via Reloadly
            let airtimeResult: {
                success: boolean
                transactionId?: string
                deliveredAmount?: number
                deliveredCurrency?: string
                message?: string
            } | null = null
            if (withdrawal.method === 'airtime') {
                // Import Reloadly service dynamically to avoid issues if not configured
                try {
                    const { sendTopup, isReloadlyConfigured, COUNTRY_CODES } = await import('@/services/reloadlyService')

                    if (isReloadlyConfigured()) {
                        // Get user's country code
                        const userCountry = withdrawal.userCountry || 'NG' // Default to Nigeria
                        const countryCode = COUNTRY_CODES[userCountry] || userCountry

                        console.log(`[Reloadly] Sending airtime to ${withdrawal.phoneNumber} - $${withdrawal.amountUSD} USD (Country: ${countryCode})`)

                        airtimeResult = await sendTopup({
                            phone: withdrawal.phoneNumber,
                            amount: withdrawal.amountUSD,
                            countryCode: countryCode
                        })

                        if (!airtimeResult.success) {
                            // Airtime failed - don't complete the withdrawal
                            console.error('[Reloadly] Top-up failed:', airtimeResult.message)
                            return res.status(500).json({
                                error: 'Airtime delivery failed',
                                details: airtimeResult.message
                            })
                        }

                        console.log(`[Reloadly] Success! Transaction ID: ${airtimeResult.transactionId}`)
                    } else {
                        console.warn('[Reloadly] Not configured - skipping automatic airtime. Process manually.')
                    }
                } catch (reloadlyError: any) {
                    console.error('[Reloadly] Service error:', reloadlyError)
                    return res.status(500).json({
                        error: 'Airtime service error',
                        details: reloadlyError.message
                    })
                }
            }

            // Update withdrawal status
            const updateData: any = {
                status: 'completed',
                processedAt: now,
                processedBy: adminId || 'admin',
            }

            // Add Reloadly transaction data if available
            if (airtimeResult?.transactionId) {
                updateData.reloadlyTxId = airtimeResult.transactionId
                updateData.deliveredAmount = airtimeResult.deliveredAmount
                updateData.deliveredCurrency = airtimeResult.deliveredCurrency
            }

            await withdrawalRef.update(updateData)

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
