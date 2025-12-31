import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG } from '@/lib/points-config'

// Cache config for 5 minutes
export const revalidate = 300

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Try to fetch from Firestore
        let configData = {
            earningRates: EARNING_RATES,
            dailyLimits: DAILY_LIMITS,
            pointsConfig: POINTS_CONFIG,
            fromCache: false
        }

        if (db) {
            const doc = await db.collection('system_config').doc('economy').get()
            if (doc.exists) {
                const data = doc.data()
                if (data) {
                    configData = {
                        earningRates: { ...EARNING_RATES, ...(data.earningRates || {}) },
                        dailyLimits: { ...DAILY_LIMITS, ...(data.dailyLimits || {}) },
                        pointsConfig: { ...POINTS_CONFIG, ...(data.pointsConfig || {}) },
                        fromCache: false
                    }
                }
            }
        }

        // Return config
        return res.status(200).json(configData)
    } catch (error) {
        console.error('Error fetching public config:', error)
        // Fallback to defaults on error
        return res.status(200).json({
            earningRates: EARNING_RATES,
            dailyLimits: DAILY_LIMITS,
            pointsConfig: POINTS_CONFIG,
            error: 'Failed to fetch remote config, using defaults'
        })
    }
}

export default allowCors(handler)
