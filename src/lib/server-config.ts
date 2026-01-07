import { db } from '@/lib/firebase-admin'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG, DAILY_EARNING_CAP } from '@/lib/points-config'

export interface EconomyConfig {
    earningRates: typeof EARNING_RATES
    dailyLimits: typeof DAILY_LIMITS
    countryMultipliers: Record<string, number>
    globalMargin: number
    pointsPerDollar: number
    dailyEarningCap: number
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
            'NG': 0.2, // Tier 3
            'GH': 0.2,
            'KE': 0.2,
            'IN': 0.25,
            'ZA': 0.3,
            'GLOBAL': 0.2 // Rest of World (default)
        },
        globalMargin: 1.0, // Safety margin (0.9 = 10% margin for protection)
        pointsPerDollar: POINTS_CONFIG.pointsPerDollar, // Default: 10000 pts = $1
        dailyEarningCap: DAILY_EARNING_CAP // Default: 2500 pts = $0.25/day
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
        ? (config.countryMultipliers[userCountry.toUpperCase()] || config.countryMultipliers['GLOBAL'] || 0.2)
        : 1.0

    const baseUSD = points / config.pointsPerDollar
    return baseUSD * countryMultiplier * config.globalMargin
}

