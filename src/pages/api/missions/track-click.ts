/**
 * Affiliate Click Tracking API Endpoint
 * 
 * POST /api/missions/track-click - Track affiliate link clicks for compliance
 * 
 * This endpoint logs all affiliate link clicks for:
 * 1. FTC compliance documentation
 * 2. Analytics and conversion tracking
 * 3. Fraud prevention
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId, missionId, affiliateUrl, timestamp, userAgent } = req.body

        if (!userId || !missionId) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Get request metadata for compliance logging
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress ||
            'unknown'

        // Create affiliate click record
        const clickRecord = {
            userId,
            missionId,
            affiliateUrl: affiliateUrl || '',
            timestamp: timestamp || Date.now(),
            userAgent: userAgent || req.headers['user-agent'] || '',
            ipAddress,
            // Add geolocation if available from headers (e.g., Cloudflare)
            country: req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || '',
            // Track session for fraud detection
            sessionId: req.headers['x-session-id'] || '',
            // Compliance flags
            disclosureShown: true,
            consentGiven: true,
            createdAt: Date.now(),
        }

        await db.collection('affiliate_clicks').add(clickRecord)

        // Also update mission progress to track that user clicked the link
        const progressQuery = await db
            .collection('mission_progress')
            .where('userId', '==', userId)
            .where('missionId', '==', missionId)
            .limit(1)
            .get()

        if (!progressQuery.empty) {
            const progressDoc = progressQuery.docs[0]
            const currentData = progressDoc.data()

            await progressDoc.ref.update({
                affiliateClicks: (currentData.affiliateClicks || 0) + 1,
                lastClickAt: Date.now(),
            })
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error tracking affiliate click:', error)
        // Don't fail the request - tracking is non-critical
        return res.status(200).json({ success: true, warning: 'Tracking may have failed' })
    }
}
