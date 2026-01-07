/**
 * Withdrawal Request API Endpoint
 * 
 * POST /api/withdrawals/request - Create a new withdrawal request
 * 
 * This endpoint deducts points from user and creates a pending withdrawal.
 * Includes fraud detection to flag suspicious requests.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { notifyNewWithdrawal } from '@/services/emailService'
import { getEconomyConfig, pointsToUSD } from '@/lib/server-config'
import { analyzeWithdrawalFraud, quickFraudCheck } from '@/lib/fraud-detection'
import { checkRateLimit } from '@/lib/security'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

interface WithdrawalRequest {
    userId: string
    amount: number
    method: 'paypal' | 'bank' | 'crypto' | 'mobile_money' | 'gift_card'
    accountDetails: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // SECURITY: Rate limit withdrawal requests
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
    if (!checkRateLimit(`withdrawal_ip_${ip}`, 3, 60000)) { // 3 requests per minute per IP
        return res.status(429).json({ error: 'Too many withdrawal requests. Please wait.' })
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

        // SECURITY: Rate limit per user
        if (!checkRateLimit(`withdrawal_user_${userId}`, 5, 3600000)) { // 5 per hour per user
            return res.status(429).json({ error: 'Too many withdrawal requests. Please try again later.' })
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
        const now = Date.now()

        // SECURITY: Require email verification before withdrawal
        if (!userData.emailVerified) {
            return res.status(403).json({
                error: 'Please verify your email before requesting a withdrawal.',
                code: 'EMAIL_NOT_VERIFIED'
            })
        }

        // SECURITY: Quick fraud check (blocks obvious abuse)
        const accountAgeMs = now - (userData.createdAt || now)
        const pendingSnapshot = await db
            .collection('withdrawals')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .limit(1)
            .get()

        const quickCheck = quickFraudCheck(accountAgeMs, amount, pendingSnapshot.size)
        if (quickCheck.blocked) {
            return res.status(400).json({ error: quickCheck.reason })
        }

        if (currentPoints < amount) {
            return res.status(400).json({ error: 'Insufficient points' })
        }

        // SECURITY: Full fraud analysis
        const userCountry = userData.country || 'GLOBAL'
        const fraudAnalysis = await analyzeWithdrawalFraud(userId, amount, userCountry)

        // Auto-reject high-risk requests
        if (fraudAnalysis.riskScore >= 80) {
            console.warn(`[FRAUD] Auto-rejected withdrawal: userId=${userId}, score=${fraudAnalysis.riskScore}`, fraudAnalysis.signals)
            return res.status(400).json({
                error: 'Your withdrawal request could not be processed. Please contact support if you believe this is an error.',
                code: 'SECURITY_CHECK_FAILED'
            })
        }

        // Get configurable conversion rate from economy config
        const economyConfig = await getEconomyConfig()
        const amountUSD = pointsToUSD(amount, economyConfig, userCountry)

        // Deduct points
        await userRef.update({
            points: currentPoints - amount,
        })

        // Create withdrawal record with fraud data
        const withdrawalData = {
            userId,
            userEmail: userData.email,
            amount,
            amountUSD,
            method,
            accountDetails,
            status: fraudAnalysis.riskScore >= 40 ? 'flagged' : 'pending', // Flag suspicious ones
            createdAt: now,
            // Include fraud analysis for admin review
            riskScore: fraudAnalysis.riskScore,
            fraudSignals: fraudAnalysis.signals,
            fraudRecommendation: fraudAnalysis.recommendation,
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

        // Notify admins of new withdrawal (include fraud warning)
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
                riskScore: fraudAnalysis.riskScore,
                fraudSignals: fraudAnalysis.signals,
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

export default allowCors(handler)
