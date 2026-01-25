import { db } from '@/lib/firebase-admin'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG, DAILY_EARNING_CAP } from '@/lib/points-config'

export interface EconomyConfig {
    earningRates: typeof EARNING_RATES
    dailyLimits: typeof DAILY_LIMITS
    countryMultipliers: Record<string, number>
    globalMargin: number
    pointsPerDollar: number
    dailyEarningCap: number
    tournament: {
        prizePool: number
        rewards: {
            rank: number
            points: number
            nairaValue: number
            tier: string
            label: string
        }[]
    }
    lastUpdated?: number
}

export async function getEconomyConfig(): Promise<EconomyConfig> {
    let config: EconomyConfig = {
        earningRates: { ...EARNING_RATES },
        dailyLimits: { ...DAILY_LIMITS },
        // Country-specific rate multipliers (1.0 = full rate, 0.2 = 20% rate)
        countryMultipliers: {
            'US': 1.0,
            'GB': 1.0,
            'CA': 1.0,
            'AU': 1.0,
            'DE': 1.0,
            'NG': 1.0, // Early Stage: Fixed Global Rate
            'GH': 1.0,
            'KE': 1.0,
            'IN': 1.0,
            'ZA': 1.0,
            'GLOBAL': 1.0 // Early Stage: Fixed Global Rate
        },
        globalMargin: 1.0, // Safety margin (0.9 = 10% margin for protection)
        pointsPerDollar: POINTS_CONFIG.pointsPerDollar, // Default: 10000 pts = $1
        dailyEarningCap: DAILY_EARNING_CAP, // Default: 2500 pts = $0.25/day
        tournament: {
            prizePool: 100000,
            rewards: [
                { rank: 1, points: 25000, nairaValue: 25000, tier: 'Champion', label: '1st Place' },
                { rank: 2, points: 15000, nairaValue: 15000, tier: 'Champion', label: '2nd Place' },
                { rank: 3, points: 10000, nairaValue: 10000, tier: 'Champion', label: '3rd Place' },
                { rank: 4, points: 5000, nairaValue: 5000, tier: 'Gold', label: '4th Place' },
                { rank: 5, points: 5000, nairaValue: 5000, tier: 'Gold', label: '5th Place' },
                { rank: 6, points: 5000, nairaValue: 5000, tier: 'Gold', label: '6th Place' },
                { rank: 7, points: 5000, nairaValue: 5000, tier: 'Gold', label: '7th Place' },
                { rank: 8, points: 5000, nairaValue: 5000, tier: 'Gold', label: '8th Place' },
                { rank: 9, points: 5000, nairaValue: 5000, tier: 'Silver', label: '9th Place' },
                { rank: 10, points: 5000, nairaValue: 5000, tier: 'Silver', label: '10th Place' },
            ]
        }
    }

    if (db) {
        try {
            const doc = await db.collection('system_config').doc('economy').get()
            if (doc.exists) {
                const data = doc.data()
                if (data) {
                    if (data.earningRates) config.earningRates = { ...config.earningRates, ...data.earningRates }
                    if (data.dailyLimits) config.dailyLimits = { ...config.dailyLimits, ...data.dailyLimits }
                    if (data.countryMultipliers) config.countryMultipliers = { ...config.countryMultipliers, ...data.countryMultipliers }
                    if (data.globalMargin !== undefined) config.globalMargin = data.globalMargin
                    if (data.pointsPerDollar !== undefined) config.pointsPerDollar = data.pointsPerDollar
                    if (data.dailyEarningCap !== undefined) config.dailyEarningCap = data.dailyEarningCap
                    if (data.tournament) config.tournament = { ...config.tournament, ...data.tournament }
                    if (data.lastUpdated) config.lastUpdated = data.lastUpdated
                }
            }
        } catch (e) {
            console.error('Failed to load economy config', e)
        }
    }
    return config
}

/**
 * Convert points to USD using current economy config
 */
export function pointsToUSD(points: number, config: EconomyConfig, userCountry?: string): number {
    const countryMultiplier = userCountry
        ? (config.countryMultipliers[userCountry.toUpperCase()] || config.countryMultipliers['GLOBAL'] || 1.0)
        : 1.0

    const baseUSD = points / config.pointsPerDollar
    return baseUSD * countryMultiplier * config.globalMargin
}

