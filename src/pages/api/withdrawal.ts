import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { getWithdrawalLimits, POINTS_CONFIG } from '@/lib/points-config'

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
        const { userId, amount, method, bankName, accountNumber, accountName, paypalEmail, walletAddress, cryptoNetwork } = req.body

        if (!userId || !amount || !method) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Validate based on method
        if (method === 'bank_transfer') {
            if (!bankName || !accountNumber || !accountName) {
                return res.status(400).json({ error: 'Missing bank details' })
            }
        } else if (method === 'paypal') {
            if (!paypalEmail) {
                return res.status(400).json({ error: 'Missing PayPal email' })
            }
        } else if (method === 'crypto') {
            if (!walletAddress || !cryptoNetwork) {
                return res.status(400).json({ error: 'Missing crypto wallet details' })
            }
        } else {
            return res.status(400).json({ error: 'Invalid payment method' })
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

        // Get dynamic withdrawal limits based on user tier
        const withdrawalLimits = getWithdrawalLimits({
            createdAt: userData.createdAt,
            emailVerified: userData.emailVerified,
            phoneVerified: userData.phoneVerified,
            totalPoints: userData.totalPoints
        })

        // Check minimum withdrawal (in points)
        if (amount < withdrawalLimits.minPoints) {
            const minUSD = POINTS_CONFIG.formatPointsAsUSD(withdrawalLimits.minPoints)
            return res.status(400).json({
                error: `Minimum withdrawal is ${minUSD} (${withdrawalLimits.minPoints.toLocaleString()} points) for ${withdrawalLimits.tier} users`,
                tier: withdrawalLimits.tier,
                minPoints: withdrawalLimits.minPoints
            })
        }

        // Check daily limit
        const dailyLimitPoints = Math.floor(withdrawalLimits.dailyLimitUSD * POINTS_CONFIG.pointsPerDollar)
        if (amount > dailyLimitPoints) {
            const maxUSD = POINTS_CONFIG.formatPointsAsUSD(dailyLimitPoints)
            return res.status(400).json({
                error: `Daily withdrawal limit is ${maxUSD} for ${withdrawalLimits.tier} users`,
                tier: withdrawalLimits.tier,
                dailyLimitPoints
            })
        }

        if (currentPoints < amount) {
            return res.status(400).json({ error: 'Insufficient balance' })
        }

        // Check for recent withdrawals based on tier's weekly limit
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        const recentWithdrawals = await db.collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>', oneWeekAgo)
            .where('status', 'in', ['pending', 'approved'])
            .get()

        if (recentWithdrawals.size >= withdrawalLimits.weeklyLimit) {
            return res.status(400).json({
                error: `You've reached your weekly limit of ${withdrawalLimits.weeklyLimit} withdrawal(s) for ${withdrawalLimits.tier} users`,
                tier: withdrawalLimits.tier,
                weeklyLimit: withdrawalLimits.weeklyLimit
            })
        }

        // Create withdrawal request with user info for admin access
        const withdrawalRef = db.collection('withdrawals').doc()
        const amountUSD = amount / POINTS_CONFIG.pointsPerDollar

        const withdrawal: any = {
            id: withdrawalRef.id,
            userId,
            // Store user info for admin access
            userEmail: userData.email || 'Unknown',
            userName: userData.name || userData.displayName || 'Unknown',
            userPhone: userData.phone || null,
            userTier: withdrawalLimits.tier,
            // Amount info
            amount,
            amountUSD,
            // Payment method
            method,
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        // Add method-specific details with combined account details for admin
        if (method === 'bank_transfer') {
            withdrawal.bankName = bankName
            withdrawal.accountNumber = accountNumber
            withdrawal.accountName = accountName
            withdrawal.accountDetails = `${bankName} - ${accountNumber} (${accountName})`
        } else if (method === 'paypal') {
            withdrawal.paypalEmail = paypalEmail
            withdrawal.accountDetails = `PayPal: ${paypalEmail}`
        } else if (method === 'crypto') {
            withdrawal.walletAddress = walletAddress
            withdrawal.cryptoNetwork = cryptoNetwork
            withdrawal.accountDetails = `${cryptoNetwork}: ${walletAddress}`
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
            method,
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
