/**
 * User Withdrawal Rate API
 * 
 * GET /api/user/withdrawal-rate?userId=xxx
 * Returns the user's withdrawal rate based on their country and the global margin
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { getEconomyConfig } from '@/lib/server-config'
import { POINTS_CONFIG } from '@/lib/points-config'

import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        // Get economy config
        const config = await getEconomyConfig()
        const { countryMultipliers, globalMargin } = config

        // Get user's country
        let userCountry = 'GLOBAL'
        let shouldUpdateProfile = false

        if (db) {
            try {
                const userDoc = await db.collection('users').doc(userIdStr).get()
                if (userDoc.exists) {
                    const userData = userDoc.data()
                    userCountry = userData?.country || 'GLOBAL'
                }

                // If country is GLOBAL or missing, try to detect from IP headers
                if (userCountry === 'GLOBAL' || !userCountry) {
                    const headerCountry = (req.headers['cf-ipcountry'] as string) ||
                        (req.headers['x-vercel-ip-country'] as string) ||
                        (req.headers['x-country'] as string)

                    if (headerCountry && headerCountry.length === 2) {
                        userCountry = headerCountry.toUpperCase()
                        shouldUpdateProfile = true
                    }
                }

                // Update user profile if we detected a new country
                if (shouldUpdateProfile && userCountry !== 'GLOBAL') {
                    await db.collection('users').doc(userIdStr).update({
                        country: userCountry,
                        updatedAt: Date.now()
                    })
                    console.log(`Updated user ${userIdStr} country to ${userCountry}`)
                }

            } catch (e) {
                console.error('Error fetching/updating user country:', e)
            }
        }

        // Calculate rate
        const normalizedCountry = userCountry.toUpperCase()
        const multiplier = countryMultipliers[normalizedCountry] || countryMultipliers['GLOBAL'] || 0.2
        const effectiveMargin = globalMargin || 1.0
        const basePointsPerDollar = POINTS_CONFIG.pointsPerDollar || 10000

        // How many USD per 1000 points
        const usdPer1000Points = (1000 / basePointsPerDollar) * multiplier * effectiveMargin

        return res.status(200).json({
            success: true,
            country: userCountry,
            multiplier,
            globalMargin: effectiveMargin,
            baseRate: basePointsPerDollar,
            usdPer1000Points: parseFloat(usdPer1000Points.toFixed(4)),
            // Example conversions
            examples: {
                '1000': parseFloat((1000 / basePointsPerDollar * multiplier * effectiveMargin).toFixed(2)),
                '5000': parseFloat((5000 / basePointsPerDollar * multiplier * effectiveMargin).toFixed(2)),
                '10000': parseFloat((10000 / basePointsPerDollar * multiplier * effectiveMargin).toFixed(2)),
            }
        })
    } catch (error) {
        console.error('Error fetching withdrawal rate:', error)
        return res.status(500).json({ error: 'Failed to fetch rate' })
    }
}

export default allowCors(handler)
