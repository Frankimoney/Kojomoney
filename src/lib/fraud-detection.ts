/**
 * Fraud Detection System for KojoMoney
 * 
 * Analyzes withdrawal requests and assigns risk scores.
 * Higher risk = more likely to be fraudulent.
 */

import { db } from '@/lib/firebase-admin'

export interface FraudAnalysis {
    riskScore: number // 0-100
    signals: string[]
    recommendation: 'approve' | 'review' | 'reject'
    details: {
        velocityRisk: number
        newAccountRisk: number
        patternRisk: number
        amountRisk: number
    }
}

interface UserData {
    id: string
    email: string
    createdAt: number
    totalPoints: number
    withdrawalCount?: number
    lastWithdrawal?: number
    country?: string
    deviceId?: string
    ipAddress?: string
}

interface WithdrawalHistory {
    amount: number
    createdAt: number
    status: string
}

/**
 * Analyze a withdrawal request for fraud signals
 */
export async function analyzeWithdrawalFraud(
    userId: string,
    requestedAmount: number,
    userCountry?: string
): Promise<FraudAnalysis> {
    const signals: string[] = []
    let velocityRisk = 0
    let newAccountRisk = 0
    let patternRisk = 0
    let amountRisk = 0

    if (!db) {
        return {
            riskScore: 0,
            signals: ['Database unavailable - skipping fraud check'],
            recommendation: 'review',
            details: { velocityRisk: 0, newAccountRisk: 0, patternRisk: 0, amountRisk: 0 }
        }
    }

    try {
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get()
        if (!userDoc.exists) {
            return {
                riskScore: 100,
                signals: ['User not found'],
                recommendation: 'reject',
                details: { velocityRisk: 100, newAccountRisk: 100, patternRisk: 100, amountRisk: 100 }
            }
        }

        const userData = userDoc.data() as UserData
        const now = Date.now()

        // ============================================
        // 1. NEW ACCOUNT RISK
        // ============================================
        const accountAgeMs = now - (userData.createdAt || now)
        const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24)

        if (accountAgeDays < 1) {
            signals.push('Account less than 24 hours old')
            newAccountRisk = 40
        } else if (accountAgeDays < 3) {
            signals.push('Account less than 3 days old')
            newAccountRisk = 25
        } else if (accountAgeDays < 7) {
            newAccountRisk = 10
        }

        // ============================================
        // 2. WITHDRAWAL VELOCITY RISK
        // ============================================
        const recentWithdrawals = await db
            .collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>', now - 24 * 60 * 60 * 1000) // Last 24 hours
            .get()

        if (recentWithdrawals.size > 0) {
            signals.push('Multiple withdrawal attempts in 24 hours')
            velocityRisk = 30
        }

        const weekWithdrawals = await db
            .collection('withdrawals')
            .where('userId', '==', userId)
            .where('createdAt', '>', now - 7 * 24 * 60 * 60 * 1000) // Last week
            .get()

        if (weekWithdrawals.size >= 3) {
            signals.push('3+ withdrawals in past week')
            velocityRisk = Math.max(velocityRisk, 40)
        }

        // ============================================
        // 3. AMOUNT RISK
        // ============================================
        const amountUSD = requestedAmount / 10000 // Convert to USD

        if (amountUSD > 10) {
            signals.push('Large withdrawal amount ($10+)')
            amountRisk = 15
        }

        if (amountUSD > 50) {
            signals.push('Very large withdrawal ($50+)')
            amountRisk = 30
        }

        // First withdrawal being large is suspicious
        const allWithdrawals = await db
            .collection('withdrawals')
            .where('userId', '==', userId)
            .where('status', '==', 'completed')
            .limit(1)
            .get()

        if (allWithdrawals.empty && amountUSD > 5) {
            signals.push('First withdrawal is unusually large')
            amountRisk += 15
        }

        // ============================================
        // 4. PATTERN RISK (Suspicious behavior)
        // ============================================

        // Check if withdrawal amount equals exactly total points (cashing out completely)
        if (requestedAmount === userData.totalPoints) {
            signals.push('Withdrawing entire balance')
            patternRisk = 20
        }

        // Check earning velocity - if they earned too fast
        const earningsPerDay = userData.totalPoints / Math.max(accountAgeDays, 1)
        const maxNormalEarningsPerDay = 5000 // $0.50/day is reasonable max

        if (earningsPerDay > maxNormalEarningsPerDay) {
            signals.push('Unusually high earning velocity')
            patternRisk = Math.max(patternRisk, 30)
        }

        // Check for suspicious countries (high fraud regions)
        const highRiskCountries = ['proxy', 'anonymous']
        if (userCountry && highRiskCountries.includes(userCountry.toLowerCase())) {
            signals.push('Connection from high-risk region')
            patternRisk = Math.max(patternRisk, 25)
        }

        // ============================================
        // CALCULATE FINAL SCORE
        // ============================================
        const riskScore = Math.min(100, velocityRisk + newAccountRisk + patternRisk + amountRisk)

        let recommendation: 'approve' | 'review' | 'reject' = 'approve'
        if (riskScore >= 60) {
            recommendation = 'reject'
        } else if (riskScore >= 30) {
            recommendation = 'review'
        }

        return {
            riskScore,
            signals,
            recommendation,
            details: {
                velocityRisk,
                newAccountRisk,
                patternRisk,
                amountRisk
            }
        }

    } catch (error) {
        console.error('Error in fraud analysis:', error)
        return {
            riskScore: 50,
            signals: ['Error during fraud analysis - flagged for manual review'],
            recommendation: 'review',
            details: { velocityRisk: 0, newAccountRisk: 0, patternRisk: 0, amountRisk: 50 }
        }
    }
}

/**
 * Quick check for obvious fraud signals (can be called before full analysis)
 */
export function quickFraudCheck(
    accountAgeMs: number,
    requestedAmount: number,
    pendingWithdrawals: number
): { blocked: boolean; reason?: string } {
    // Block if account is less than 6 hours old
    if (accountAgeMs < 6 * 60 * 60 * 1000) {
        return { blocked: true, reason: 'Account too new. Please wait 6 hours before withdrawing.' }
    }

    // Block if already has pending withdrawal
    if (pendingWithdrawals > 0) {
        return { blocked: true, reason: 'You already have a pending withdrawal.' }
    }

    return { blocked: false }
}
