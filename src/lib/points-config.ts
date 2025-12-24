/**
 * KojoMoney Points & Economy Configuration
 * Centralized config for all earning rates, multipliers, and thresholds
 */

// ============================================
// POINTS CONVERSION
// ============================================
export const POINTS_CONFIG = {
    // 1000 points = $0.10 USD
    pointsPerDollar: 10000,
    dollarPerPoint: 0.0001,

    // Display helpers
    formatPointsAsUSD: (points: number): string => {
        const usd = points / 10000
        return `$${usd.toFixed(2)}`
    },

    pointsToUSD: (points: number): number => {
        return points / 10000
    },

    usdToPoints: (usd: number): number => {
        return Math.floor(usd * 10000)
    }
}

// ============================================
// BASE EARNING RATES (in points)
// ============================================
export const EARNING_RATES = {
    watchAd: 50,           // $0.005
    readNews: 100,         // $0.01
    triviaCorrect: 40,     // $0.004 per correct answer
    triviaBonus: 200,      // $0.02 bonus for 5/5
    surveyMin: 500,        // $0.05 minimum
    surveyMax: 20000,      // $2.00 maximum
    offerwallMin: 1000,    // $0.10 minimum
    offerwallMax: 500000,  // $50.00 maximum
    gamePlaytimePerMin: 5, // $0.0005 per minute
    dailySpinMin: 100,     // $0.01
    dailySpinMax: 10000,   // $1.00
    referralSignup: 5000,  // $0.50 when referral signs up
    referralCommission: 0.10, // 10% of referral's earnings
}

// ============================================
// STREAK MULTIPLIERS
// ============================================
export interface StreakTier {
    minDays: number
    multiplier: number
    label: string
}

export const STREAK_TIERS: StreakTier[] = [
    { minDays: 0, multiplier: 1.0, label: 'No Streak' },
    { minDays: 3, multiplier: 1.2, label: '3-Day Streak' },
    { minDays: 5, multiplier: 1.5, label: '5-Day Streak' },
    { minDays: 7, multiplier: 2.0, label: 'Week Warrior' },
    { minDays: 14, multiplier: 2.5, label: 'Fortnight Champion' },
    { minDays: 30, multiplier: 3.0, label: 'Month Master' },
]

export function getStreakMultiplier(streakDays: number): { multiplier: number; tier: StreakTier } {
    let currentTier = STREAK_TIERS[0]

    for (const tier of STREAK_TIERS) {
        if (streakDays >= tier.minDays) {
            currentTier = tier
        }
    }

    return { multiplier: currentTier.multiplier, tier: currentTier }
}

export function getNextStreakTier(streakDays: number): StreakTier | null {
    for (const tier of STREAK_TIERS) {
        if (tier.minDays > streakDays) {
            return tier
        }
    }
    return null // Already at max
}

// ============================================
// USER LEVEL BONUSES (earning multipliers)
// ============================================
export const LEVEL_BONUSES: Record<string, number> = {
    'Starter': 1.0,    // Base rate
    'Bronze': 1.05,    // +5%
    'Silver': 1.10,    // +10%
    'Gold': 1.20,      // +20%
    'Platinum': 1.30,  // +30%
    'Diamond': 1.50,   // +50%
}

export function getLevelBonus(levelName: string): number {
    return LEVEL_BONUSES[levelName] || 1.0
}

// ============================================
// WITHDRAWAL THRESHOLDS (USD)
// ============================================
export type UserTier = 'new' | 'regular' | 'verified' | 'vip'

export interface WithdrawalTier {
    minWithdrawalUSD: number
    dailyLimitUSD: number
    weeklyLimit: number  // Number of withdrawals per week
}

export const WITHDRAWAL_TIERS: Record<UserTier, WithdrawalTier> = {
    new: {
        minWithdrawalUSD: 0.50,
        dailyLimitUSD: 0.50,
        weeklyLimit: 1
    },
    regular: {
        minWithdrawalUSD: 0.20,
        dailyLimitUSD: 2.00,
        weeklyLimit: 2
    },
    verified: {
        minWithdrawalUSD: 0.10,
        dailyLimitUSD: 5.00,
        weeklyLimit: 3
    },
    vip: {
        minWithdrawalUSD: 0.05,
        dailyLimitUSD: 10.00,
        weeklyLimit: 7 // Daily
    }
}

export function getUserTier(user: {
    createdAt?: number | string
    emailVerified?: boolean
    phoneVerified?: boolean
    totalPoints?: number
}): UserTier {
    const accountAgeMs = Date.now() - (typeof user.createdAt === 'number' ? user.createdAt : new Date(user.createdAt || Date.now()).getTime())
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24)

    // VIP: Diamond level (1M+ points)
    if ((user.totalPoints || 0) >= 1000000) {
        return 'vip'
    }

    // Verified: Email AND Phone verified, account > 7 days
    if (user.emailVerified && user.phoneVerified && accountAgeDays >= 7) {
        return 'verified'
    }

    // Regular: Account > 7 days
    if (accountAgeDays >= 7) {
        return 'regular'
    }

    // New: Account < 7 days
    return 'new'
}

export function getWithdrawalLimits(user: {
    createdAt?: number | string
    emailVerified?: boolean
    phoneVerified?: boolean
    totalPoints?: number
}): WithdrawalTier & { tier: UserTier; minPoints: number } {
    const tier = getUserTier(user)
    const limits = WITHDRAWAL_TIERS[tier]

    return {
        ...limits,
        tier,
        minPoints: Math.floor(limits.minWithdrawalUSD * POINTS_CONFIG.pointsPerDollar)
    }
}

// ============================================
// DAILY LIMITS
// ============================================
export const DAILY_LIMITS = {
    maxAds: 10,
    maxNews: 10,
    maxTrivia: 1,    // Once per day
    maxSurveys: 10,
    maxGamesMinutes: 120, // 2 hours
}

// ============================================
// APPLY MULTIPLIERS TO POINTS
// ============================================
export function calculateEarnings(
    basePoints: number,
    streakDays: number,
    levelName: string,
    happyHourMultiplier: number = 1.0
): { points: number; breakdown: { base: number; streakMultiplier: number; levelBonus: number; happyHour: number } } {
    const { multiplier: streakMultiplier } = getStreakMultiplier(streakDays)
    const levelBonus = getLevelBonus(levelName)

    const finalPoints = Math.floor(basePoints * streakMultiplier * levelBonus * happyHourMultiplier)

    return {
        points: finalPoints,
        breakdown: {
            base: basePoints,
            streakMultiplier,
            levelBonus,
            happyHour: happyHourMultiplier
        }
    }
}
