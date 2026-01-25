/**
 * Test Push Notification by Email
 * 
 * GET /api/cron/send-test?email=user@example.com
 * 
 * For testing purposes only - finds user by email and sends a test push notification
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { sendPushToUser } from '@/pages/api/notifications/send'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { email, userId } = req.query

    if (!email && !userId) {
        return res.status(400).json({
            error: 'Missing email or userId query parameter',
            usage: '/api/cron/send-test?email=user@example.com',
            alternativeUsage: '/api/cron/send-test?userId=YOUR_USER_ID'
        })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        let targetUserId = userId as string
        let userEmail = email as string

        // If email provided, find the user
        if (email && !userId) {
            const usersSnapshot = await db.collection('users')
                .where('email', '==', email)
                .limit(1)
                .get()

            if (usersSnapshot.empty) {
                return res.status(404).json({
                    error: 'User not found with this email',
                    email
                })
            }

            const userDoc = usersSnapshot.docs[0]
            targetUserId = userDoc.id
            userEmail = userDoc.data().email
        }

        // Check if user has push tokens
        const tokensSnapshot = await db.collection('push_tokens')
            .where('userId', '==', targetUserId)
            .where('active', '==', true)
            .get()

        if (tokensSnapshot.empty) {
            return res.status(200).json({
                success: false,
                error: 'No active push tokens found for this user',
                userId: targetUserId,
                email: userEmail,
                hint: 'The user needs to open the app first to register their push token'
            })
        }

        // Log token info
        const tokens = tokensSnapshot.docs.map(doc => ({
            platform: doc.data().platform,
            createdAt: doc.data().createdAt,
            tokenPreview: doc.data().token?.substring(0, 30) + '...'
        }))

        console.log(`[Send Test] Found ${tokens.length} token(s) for user ${targetUserId}`)

        // Send test notification
        const success = await sendPushToUser(
            targetUserId,
            "🎉 Test Notification Success!",
            "Background push notifications are working! You received this while the app was closed.",
            {
                type: 'test',
                timestamp: Date.now().toString()
            }
        )

        if (success) {
            return res.status(200).json({
                success: true,
                message: 'Test notification sent successfully!',
                userId: targetUserId,
                email: userEmail,
                tokens: tokens,
                time: new Date().toISOString()
            })
        } else {
            return res.status(500).json({
                success: false,
                error: 'Failed to send notification (sendPushToUser returned false)',
                userId: targetUserId,
                email: userEmail,
                tokens: tokens,
                hint: 'Check server logs for FCM errors'
            })
        }

    } catch (error: any) {
        console.error('Send test error:', error)
        return res.status(500).json({
            success: false,
            error: error.message || 'Unknown error'
        })
    }
}

export default allowCors(handler)
