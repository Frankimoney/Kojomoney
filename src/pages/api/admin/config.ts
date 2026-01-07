import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { requireAdmin } from '@/lib/admin-auth'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG } from '@/lib/points-config'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Authenticated via requireAdmin middleware

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    const configRef = db.collection('system_config').doc('economy')

    if (req.method === 'GET') {
        try {
            const doc = await configRef.get()

            let configData

            if (doc.exists) {
                configData = doc.data()
            } else {
                // Return defaults if no custom config exists
                configData = {
                    earningRates: EARNING_RATES,
                    dailyLimits: DAILY_LIMITS,
                    pointsConfig: POINTS_CONFIG,
                    lastUpdated: Date.now()
                }
                // Optionally seed the DB? No, let's keep it clean until edited.
            }

            return res.status(200).json(configData)
        } catch (error) {
            console.error('Error fetching config:', error)
            return res.status(500).json({ error: 'Failed to fetch config' })
        }
    } else if (req.method === 'POST') {
        try {
            const { earningRates, dailyLimits, pointsConfig, countryMultipliers, globalMargin, pointsPerDollar, dailyEarningCap } = req.body

            // Validation could go here

            const updateData = {
                earningRates: earningRates || EARNING_RATES,
                dailyLimits: dailyLimits || DAILY_LIMITS,
                pointsConfig: pointsConfig || POINTS_CONFIG,
                countryMultipliers: countryMultipliers || {},
                globalMargin: globalMargin !== undefined ? globalMargin : 1.0,
                pointsPerDollar: pointsPerDollar !== undefined ? pointsPerDollar : POINTS_CONFIG.pointsPerDollar,
                dailyEarningCap: dailyEarningCap !== undefined ? dailyEarningCap : 2500, // $0.25 default
                lastUpdated: Date.now(),
                updatedBy: 'admin' // Could track specific admin email if available
            }

            await configRef.set(updateData, { merge: true })

            return res.status(200).json({ success: true, message: 'Configuration updated successfully' })
        } catch (error) {
            console.error('Error updating config:', error)
            return res.status(500).json({ error: 'Failed to update config' })
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default requireAdmin(handler, 'super_admin')
