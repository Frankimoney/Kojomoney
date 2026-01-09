/**
 * Admin Process Withdrawal API Endpoint
 * 
 * POST /api/admin/withdrawals/process - Approve or reject a withdrawal
 * 
 * Features:
 * - Manual mode (default): Admin approves, pays manually
 * - Auto mode (AUTO_PAYMENTS_ENABLED=true): Airtime sent via Reloadly automatically
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { notifyWithdrawalProcessed } from '@/services/emailService'
import { requireAdmin } from '@/lib/admin-auth'
import { sendPushToUser } from '@/pages/api/notifications/send'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

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
            // Check if automatic payments are enabled
            // Set AUTO_PAYMENTS_ENABLED=true in .env to enable automatic airtime via Reloadly
            const autoPaymentsEnabled = process.env.AUTO_PAYMENTS_ENABLED === 'true'

            // Airtime result for tracking (used when auto-payments enabled)
            let airtimeResult: {
                success: boolean
                transactionId?: string
                deliveredAmount?: number
                deliveredCurrency?: string
                message?: string
            } | null = null

            // Handle Airtime withdrawals with optional auto-payment
            if (withdrawal.method === 'airtime' && autoPaymentsEnabled) {
                try {
                    // Dynamically import Reloadly service
                    const { sendTopup, isReloadlyConfigured, COUNTRY_CODES } = await import('@/services/reloadlyService')

                    if (isReloadlyConfigured()) {
                        const userCountry = withdrawal.userCountry || 'NG'
                        const countryCode = COUNTRY_CODES[userCountry] || userCountry

                        console.log(`[Reloadly] Auto-sending airtime to ${withdrawal.phoneNumber} - $${withdrawal.amountUSD} USD (Country: ${countryCode})`)

                        airtimeResult = await sendTopup({
                            phone: withdrawal.phoneNumber,
                            amount: withdrawal.amountUSD,
                            countryCode: countryCode
                        })

                        if (!airtimeResult.success) {
                            console.error('[Reloadly] Top-up failed:', airtimeResult.message)
                            return res.status(500).json({
                                error: 'Airtime delivery failed',
                                details: airtimeResult.message
                            })
                        }

                        console.log(`[Reloadly] Success! Transaction ID: ${airtimeResult.transactionId}`)
                    } else {
                        console.log('[Reloadly] Not configured - proceeding with manual approval')
                    }
                } catch (reloadlyError: any) {
                    console.error('[Reloadly] Service error:', reloadlyError.message)
                    // Continue with manual approval if Reloadly fails
                    console.log('[Reloadly] Continuing with manual approval due to service error')
                }
            } else if (withdrawal.method === 'airtime') {
                console.log(`[Manual Mode] Airtime withdrawal approved. Pay ${withdrawal.phoneNumber} manually: $${withdrawal.amountUSD}`)
            }

            // Handle Gift Card withdrawals with optional auto-payment
            let giftCardResult: {
                success: boolean
                transactionId?: number
                redeemCode?: string
                message?: string
            } | null = null

            if (withdrawal.method === 'gift_card' && autoPaymentsEnabled) {
                try {
                    // Dynamically import Gift Card service
                    const { orderGiftCard, isGiftCardConfigured } = await import('@/services/giftCardService')

                    if (isGiftCardConfigured()) {
                        console.log(`[GiftCard] Auto-ordering gift card (${withdrawal.giftCardBrand}) - $${withdrawal.amountUSD} USD to ${withdrawal.recipientEmail}`)

                        // Note: In production, you'd need to look up the productId based on brand and country
                        // For now, we'll mark for manual processing if no productId
                        if (withdrawal.giftCardProductId) {
                            giftCardResult = await orderGiftCard({
                                productId: withdrawal.giftCardProductId,
                                unitPrice: withdrawal.amountUSD,
                                recipientEmail: withdrawal.recipientEmail
                            })

                            if (!giftCardResult.success) {
                                console.error('[GiftCard] Order failed:', giftCardResult.message)
                                // Don't fail - continue with manual approval
                            } else {
                                console.log(`[GiftCard] Success! Transaction ID: ${giftCardResult.transactionId}`)
                            }
                        } else {
                            console.log('[GiftCard] No productId - proceeding with manual approval')
                        }
                    } else {
                        console.log('[GiftCard] Not configured - proceeding with manual approval')
                    }
                } catch (giftCardError: any) {
                    console.error('[GiftCard] Service error:', giftCardError.message)
                    // Continue with manual approval
                }
            } else if (withdrawal.method === 'gift_card') {
                console.log(`[Manual Mode] Gift card withdrawal approved. Send ${withdrawal.giftCardBrand} worth $${withdrawal.amountUSD} to ${withdrawal.recipientEmail}`)
            }

            // Build update data
            const updateData: Record<string, any> = {
                status: 'completed',
                processedAt: now,
                processedBy: adminId || 'admin',
            }

            // Add Reloadly transaction data if auto-payment was successful
            if (airtimeResult?.transactionId) {
                updateData.reloadlyTxId = airtimeResult.transactionId
                updateData.deliveredAmount = airtimeResult.deliveredAmount
                updateData.deliveredCurrency = airtimeResult.deliveredCurrency
                updateData.autoPaymentSuccess = true
            }

            // Update withdrawal status
            await withdrawalRef.update(updateData)

            // Create transaction record
            await db.collection('transactions').add({
                userId: withdrawal.userId,
                type: 'debit',
                amount: withdrawal.amount,
                source: 'withdrawal',
                status: 'completed',
                description: `Withdrawal via ${withdrawal.method}${airtimeResult?.transactionId ? ' (Auto)' : ''}`,
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

            // Send push notification to user
            try {
                const amountUSD = withdrawal.amountUSD || (withdrawal.amount / 100).toFixed(2)
                await sendPushToUser(
                    withdrawal.userId,
                    "💰 Withdrawal Approved!",
                    `Your withdrawal of $${amountUSD} has been approved and is being processed.`,
                    { type: 'withdrawal_approved', withdrawalId, amount: withdrawal.amount }
                )
            } catch (pushErr) {
                console.error('Failed to send approval push notification:', pushErr)
            }

            return res.status(200).json({
                success: true,
                message: 'Withdrawal approved',
                autoPayment: airtimeResult?.success || false,
                transactionId: airtimeResult?.transactionId || null,
            })

        } else if (action === 'reject') {
            // Reject and refund points
            await withdrawalRef.update({
                status: 'rejected',
                processedAt: now,
                processedBy: adminId || 'admin',
                rejectionReason: rejectionReason || 'Request rejected by admin',
            })

            // Refund points to user
            const userRef = db.collection('users').doc(withdrawal.userId)
            const userDoc = await userRef.get()
            if (userDoc.exists) {
                const currentPoints = userDoc.data()?.totalPoints || 0
                await userRef.update({
                    totalPoints: currentPoints + withdrawal.amount,
                    updatedAt: now,
                })
            }

            // Create refund transaction record
            await db.collection('transactions').add({
                userId: withdrawal.userId,
                type: 'credit',
                amount: withdrawal.amount,
                source: 'withdrawal_refund',
                status: 'completed',
                description: `Withdrawal rejected: ${rejectionReason || 'No reason given'}`,
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

            // Send push notification to user
            try {
                await sendPushToUser(
                    withdrawal.userId,
                    "❌ Withdrawal Update",
                    `Your withdrawal request was not approved. Points have been refunded to your account.`,
                    { type: 'withdrawal_rejected', withdrawalId, refunded: true }
                )
            } catch (pushErr) {
                console.error('Failed to send rejection push notification:', pushErr)
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

export default requireAdmin(handler, 'support')
