import { db } from '@/lib/firebase-admin'
import { EARNING_RATES, DAILY_LIMITS } from '@/lib/points-config'

export async function getEconomyConfig() {
    let config = {
        earningRates: { ...EARNING_RATES },
        dailyLimits: { ...DAILY_LIMITS },
        // Diesel Economy Defaults
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
            'GLOBAL': 0.2 // Rest of World
        } as Record<string, number>,
        globalMargin: 1.0
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
                }
            }
        } catch (e) {
            console.error('Failed to load economy config', e)
        }
    }
    return config
}
