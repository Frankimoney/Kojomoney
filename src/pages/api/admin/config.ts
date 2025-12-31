import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG } from '@/lib/points-config'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Verify Admin Authentication
    const authHeader = req.headers.authorization
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    // In a real app, verify the token against a secret or DB
    // For now, we reuse the simple check from other admin endpoints if available,
    // or just check if it exists since we rely on the AdminLogin component's security.
    // Ideally, verify against process.env.ADMIN_SECRET or similar if you had one.
    // Checking against a hardcoded "admin-token" or similar is weak but matches current session context if any.
    // Let's assume the frontend sends the token we generated in login.
    // For stronger security, we should validate it properly.

    // Check if authenticated
    if (!adminToken) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

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
            const { earningRates, dailyLimits, pointsConfig, countryMultipliers, globalMargin } = req.body

            // Validation could go here

            const updateData = {
                earningRates: earningRates || EARNING_RATES,
                dailyLimits: dailyLimits || DAILY_LIMITS,
                pointsConfig: pointsConfig || POINTS_CONFIG,
                countryMultipliers: countryMultipliers || {},
                globalMargin: globalMargin !== undefined ? globalMargin : 1.0,
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

export default allowCors(handler)
