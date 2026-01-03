import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { getWithdrawalLimits, POINTS_CONFIG } from '@/lib/points-config'
import { getEconomyConfig } from '@/lib/server-config'
import { enhanceFraudCheck } from '@/lib/anti-fraud'

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
        const { userId, amount, method, bankName, accountNumber, accountName, paypalEmail, walletAddress, cryptoNetwork, phoneNumber, giftCardBrand, recipientEmail } = req.body

        if (!userId || !amount || !method) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Validate based on method
        if (method === 'bank_transfer') {
            if (!bankName || !accountNumber || !accountName) return res.status(400).json({ error: 'Missing bank details' })
        } else if (method === 'paypal') {
            if (!paypalEmail) return res.status(400).json({ error: 'Missing PayPal email' })
        } else if (method === 'crypto') {
            if (!walletAddress || !cryptoNetwork) return res.status(400).json({ error: 'Missing crypto wallet details' })
        } else if (method === 'airtime') {
            if (!phoneNumber) return res.status(400).json({ error: 'Missing phone number' })
        } else if (method === 'gift_card') {
            if (!giftCardBrand) return res.status(400).json({ error: 'Please select a gift card brand' })
            if (!recipientEmail) return res.status(400).json({ error: 'Please enter recipient email for gift card delivery' })
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

        const config = await getEconomyConfig()

        // --- DIESEL ECONOMY LOGIC ---
        // 1. Identify Country & Multiplier
        let userCountry = userData.country
        if (!userCountry) {
            const ipCountry = (req.headers['cf-ipcountry'] as string) || 'US'
            userCountry = ipCountry
        }

        const multiplier = config.countryMultipliers?.[userCountry?.toUpperCase()] || config.countryMultipliers?.['GLOBAL'] || 1.0
        const globalMargin = config.globalMargin || 1.0

        // 2. Calculate Diesel Value (USD)
        const baseUSD = amount / POINTS_CONFIG.pointsPerDollar
        const dieselUSD = baseUSD * multiplier * globalMargin

        // 3. Velocity Check (Max $10/day Diesel Value)
        const DAILY_CAP_USD = 10.0
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const withdrawalsToday = await db.collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>', todayStart.getTime())
            .get()

        const usedUSD = withdrawalsToday.docs.reduce((sum, doc) => sum + (doc.data().amountUSD || 0), 0)

        if ((usedUSD + dieselUSD) > DAILY_CAP_USD) {
            return res.status(400).json({
                error: `Daily limit reached. Max $${DAILY_CAP_USD}/day. Used: $${usedUSD.toFixed(2)}. Request Value: $${dieselUSD.toFixed(2)}`
            })
        }

        // 4. Minimum Check (e.g. $1.00)
        if (dieselUSD < 0.50) { // Keep low for local currencies? Prompt said "Max $10".
            return res.status(400).json({ error: `Minimum withdrawal value is $0.50. Your request is valued at $${dieselUSD.toFixed(2)} based on regional rates.` })
        }

        if (currentPoints < amount) {
            return res.status(400).json({ error: 'Insufficient balance' })
        }

        // SECURITY: Enhanced Fraud Check
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
        const userAgent = req.headers['user-agent'] || 'unknown'
        const deviceId = Buffer.from(`${userAgent}-${ip}`).toString('base64').substring(0, 32) // Simple hydration

        const fraudResult = await enhanceFraudCheck(userId, 'withdrawal', ip, deviceId)

        // Auto-flag high risk withdrawals
        let status = 'pending'
        let adminNote = ''

        if (fraudResult.riskScore > 50) {
            status = 'manual_review'
            adminNote = `High Risk Score: ${fraudResult.riskScore}. Signals: ${(fraudResult.signals || []).join(', ') || 'N/A'}`
        }

        if (amount > 10 * POINTS_CONFIG.pointsPerDollar) { // > $10
            status = 'manual_review'
            adminNote += (adminNote ? ' | ' : '') + 'Large withdrawal amount.'
        }

        // Create withdrawal request with user info for admin access
        const withdrawalRef = db.collection('withdrawals').doc()
        const amountUSD = dieselUSD

        const withdrawal: any = {
            id: withdrawalRef.id,
            userId,
            // Store user info for admin access
            userEmail: userData.email || 'Unknown',
            userName: userData.name || userData.displayName || 'Unknown',
            userPhone: userData.phone || null,
            userTier: 'Standard',
            // Amount info
            amount,
            amountUSD,
            // Payment method
            method,
            status: status, // Use dynamic status (pending or manual_review)
            adminNote: adminNote || null,
            riskScore: fraudResult.riskScore || 0,
            fraudSignals: fraudResult.signals || [],
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
        } else if (method === 'airtime') {
            withdrawal.phoneNumber = phoneNumber
            withdrawal.accountDetails = `Airtime: ${phoneNumber}`
        } else if (method === 'gift_card') {
            withdrawal.giftCardBrand = giftCardBrand
            withdrawal.recipientEmail = recipientEmail
            withdrawal.accountDetails = `Gift Card (${giftCardBrand}): ${recipientEmail}`
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
