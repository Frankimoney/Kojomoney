/**
 * KojoMoney Points & Economy Configuration
 * Centralized config for all earning rates, multipliers, and thresholds
 * 
 * ECONOMICS RATIONALE:
 * - Ads: You earn ~$0.01-0.03 CPM, pay out ~$0.002 = ~80% margin
 * - News: Embedded ads earn ~$0.02, pay out ~$0.005 = ~75% margin  
 * - Offerwalls: You keep 30-40% of what advertisers pay
 * - Trivia/Spin: Loss leaders for engagement (keep low)
 */

// ============================================
// POINTS CONVERSION
// ============================================
export const POINTS_CONFIG = {
    // 10,000 points = $1.00 USD (unchanged - good rate)
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
// BASE EARNING RATES (in points) - REDUCED FOR SUSTAINABILITY
// ============================================
export const EARNING_RATES = {
    // Ads: Pay $0.002/ad, earn $0.01-0.03 = profitable
    watchAd: 20,           // $0.002 (was $0.005) 

    // News: Embedded ads cover this
    readNews: 50,          // $0.005 (was $0.01)

    // Trivia: Loss leader for engagement - keep low
    triviaCorrect: 20,     // $0.002 per correct (was $0.004)
    triviaBonus: 100,      // $0.01 bonus for 5/5 (was $0.02)

    // Surveys/Offerwalls: You take 30-40% cut - these are your profit center
    surveyMin: 500,        // $0.05 minimum (unchanged)
    surveyMax: 20000,      // $2.00 maximum (unchanged)
    offerwallMin: 1000,    // $0.10 minimum (unchanged)
    offerwallMax: 500000,  // $50.00 maximum (unchanged)

    // Games: Very low - mostly for engagement
    gamePlaytimePerMin: 2, // $0.0002 per minute (was $0.0005)

    // Daily Spin: Loss leader - reduced expectations
    dailySpinMin: 50,      // $0.005 (was $0.01)
    dailySpinMax: 5000,    // $0.50 max (was $1.00)

    // Referrals: Reduced to protect margins
    referralSignup: 2500,  // $0.25 when referral signs up (was $0.50)
    referralCommission: 0.05, // 5% of referral's earnings (was 10%)
}

// ============================================
// STREAK MULTIPLIERS - REDUCED TO PROTECT MARGINS
// Max 1.25x instead of 3x - still rewards loyalty without killing profits
// ============================================
export interface StreakTier {
    minDays: number
    multiplier: number
    label: string
}

export const STREAK_TIERS: StreakTier[] = [
    { minDays: 0, multiplier: 1.0, label: 'No Streak' },
    { minDays: 3, multiplier: 1.05, label: '3-Day Streak' },      // was 1.2
    { minDays: 7, multiplier: 1.10, label: 'Week Warrior' },      // was 2.0
    { minDays: 14, multiplier: 1.15, label: 'Fortnight Champion' }, // was 2.5
    { minDays: 30, multiplier: 1.20, label: 'Month Master' },     // was 3.0
    { minDays: 60, multiplier: 1.25, label: 'Legend' },           // NEW top tier
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
// USER LEVEL BONUSES (earning multipliers) - REDUCED
// ============================================
export const LEVEL_BONUSES: Record<string, number> = {
    'Starter': 1.0,    // Base rate
    'Bronze': 1.02,    // +2% (was +5%)
    'Silver': 1.05,    // +5% (was +10%)
    'Gold': 1.08,      // +8% (was +20%)
    'Platinum': 1.12,  // +12% (was +30%)
    'Diamond': 1.15,   // +15% (was +50%)
}

export function getLevelBonus(levelName: string): number {
    return LEVEL_BONUSES[levelName] || 1.0
}

// ============================================
// WITHDRAWAL THRESHOLDS (USD) - INCREASED FOR NEW USERS
// ============================================
export type UserTier = 'new' | 'regular' | 'verified' | 'vip'

export interface WithdrawalTier {
    minWithdrawalUSD: number
    dailyLimitUSD: number
    weeklyLimit: number  // Number of withdrawals per week
}

export const WITHDRAWAL_TIERS: Record<UserTier, WithdrawalTier> = {
    new: {
        minWithdrawalUSD: 1.00,  // INCREASED from $0.50 - ensures user is engaged before payout
        dailyLimitUSD: 1.00,
        weeklyLimit: 1
    },
    regular: {
        minWithdrawalUSD: 0.50,  // was $0.20
        dailyLimitUSD: 2.00,
        weeklyLimit: 1           // was 2
    },
    verified: {
        minWithdrawalUSD: 0.25,  // was $0.10
        dailyLimitUSD: 5.00,
        weeklyLimit: 2           // was 3
    },
    vip: {
        minWithdrawalUSD: 0.10,  // was $0.05
        dailyLimitUSD: 10.00,
        weeklyLimit: 3           // was 7
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

    // Verified: Email AND Phone verified, account > 14 days (was 7)
    if (user.emailVerified && user.phoneVerified && accountAgeDays >= 14) {
        return 'verified'
    }

    // Regular: Account > 14 days (was 7)
    if (accountAgeDays >= 14) {
        return 'regular'
    }

    // New: Account < 14 days
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
// DAILY LIMITS - REDUCED TO CAP EXPOSURE
// ============================================
export const DAILY_LIMITS = {
    maxAds: 5,          // was 10 - limits daily payout
    maxNews: 5,         // was 10
    maxTrivia: 1,       // Once per day (unchanged)
    maxSurveys: 10,     // unchanged - these are profitable
    maxGamesMinutes: 60, // 1 hour (was 2 hours)
}

// ============================================
// DAILY EARNING CAP - NEW PROTECTION
// Maximum a user can earn per day from basic activities
// Offerwalls/Surveys are excluded as they're profitable
// ============================================
export const DAILY_EARNING_CAP = 2500 // $0.25/day max from ads/news/trivia/games
// This ensures even power users can't drain you

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
