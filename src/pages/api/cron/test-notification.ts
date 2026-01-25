/**
 * Test Push Notification Endpoint
 * 
 * GET /api/cron/test-notification?userId=xxx
 * 
 * Sends a test push notification to verify the system is working.
 * Can also be used to test the cron job functionality.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { sendPushToUser } from '@/pages/api/notifications/send'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { userId, testCron } = req.query
    const userIdStr = Array.isArray(userId) ? userId[0] : userId

    // If testing the full cron, call the cron endpoint
    if (testCron === 'true') {
        try {
            const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/notifications`
            const cronResponse = await fetch(cronUrl, {
                headers: {
                    'x-cron-secret': process.env.CRON_SECRET || ''
                }
            })
            const cronResult = await cronResponse.json()

            return res.status(200).json({
                success: true,
                message: 'Cron job triggered',
                cronResult
            })
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                error: 'Failed to trigger cron',
                details: error.message
            })
        }
    }

    // Send test notification to a specific user
    if (!userIdStr) {
        return res.status(400).json({
            error: 'Missing userId query parameter',
            usage: '/api/cron/test-notification?userId=YOUR_USER_ID',
            alternativeUsage: '/api/cron/test-notification?testCron=true'
        })
    }

    try {
        // Check if user has push tokens
        if (db) {
            const tokensSnapshot = await db.collection('push_tokens')
                .where('userId', '==', userIdStr)
                .where('active', '==', true)
                .get()

            if (tokensSnapshot.empty) {
                return res.status(200).json({
                    success: false,
                    error: 'No active push tokens found for this user',
                    userId: userIdStr,
                    hint: 'Make sure the app has granted notification permissions and registered the push token'
                })
            }

            // Log token info
            const tokens = tokensSnapshot.docs.map(doc => ({
                platform: doc.data().platform,
                createdAt: doc.data().createdAt,
                token: doc.data().token?.substring(0, 20) + '...'
            }))

            console.log(`[Test Notification] Found ${tokens.length} token(s) for user ${userIdStr}`)
        }

        // Send test notification
        const success = await sendPushToUser(
            userIdStr,
            "🔔 Test Notification",
            "Push notifications are working! This is a test from KojoMoney.",
            {
                type: 'test',
                timestamp: Date.now().toString()
            }
        )

        if (success) {
            return res.status(200).json({
                success: true,
                message: 'Test notification sent successfully!',
                userId: userIdStr,
                time: new Date().toISOString()
            })
        } else {
            return res.status(500).json({
                success: false,
                error: 'Failed to send notification',
                userId: userIdStr,
                hint: 'Check server logs for details'
            })
        }

    } catch (error: any) {
        console.error('Test notification error:', error)
        return res.status(500).json({
            success: false,
            error: error.message || 'Unknown error',
            userId: userIdStr
        })
    }
}

export default allowCors(handler)
