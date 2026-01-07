/**
 * Broadcast Notification Endpoint
 * 
 * GET /api/cron/broadcast?title=...&body=...&secret=...
 * POST /api/cron/broadcast (with JSON body)
 * 
 * Send a push notification to ALL users with active push tokens.
 * Designed to be called by external cron services.
 * 
 * Query params (GET):
 *   - title: Notification title (required)
 *   - body: Notification body (required)
 *   - secret: Your CRON_SECRET for authentication
 * 
 * Body (POST):
 *   {
 *     "title": "Notification title",
 *     "body": "Notification body",
 *     "data": { optional custom data }
 *   }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { sendPushToAll } from '@/pages/api/notifications/send'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verify authentication - accept either:
    // 1. Cron secret (for external cron jobs)
    // 2. Admin Bearer token (for admin dashboard)
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret
    const authHeader = req.headers.authorization
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    // Check if authenticated via cron secret
    const cronSecretValid = cronSecret && cronSecret === process.env.CRON_SECRET

    // Check if authenticated via admin token (simple check - in production use JWT)
    const adminTokenValid = adminToken && adminToken.length > 0

    if (!cronSecretValid && !adminTokenValid) {
        return res.status(401).json({
            error: 'Unauthorized - Invalid or missing authentication',
            hint: 'Use ?secret=YOUR_CRON_SECRET or Authorization: Bearer TOKEN header'
        })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        let title: string
        let body: string
        let data: Record<string, any> | undefined

        if (req.method === 'POST') {
            // Parse from JSON body
            title = req.body.title
            body = req.body.body
            data = req.body.data
        } else {
            // Parse from query params (GET)
            title = req.query.title as string
            body = req.query.body as string
        }

        if (!title || !body) {
            return res.status(400).json({
                error: 'Missing required parameters: title and body',
                usage: {
                    GET: '/api/cron/broadcast?title=Hello&body=World&secret=YOUR_SECRET',
                    POST: {
                        url: '/api/cron/broadcast',
                        headers: { 'x-cron-secret': 'YOUR_SECRET', 'Content-Type': 'application/json' },
                        body: { title: 'Hello', body: 'World', data: { optional: 'custom data' } }
                    }
                }
            })
        }

        // Get ALL users to store notification in Firestore
        const usersSnapshot = await db.collection('users').get()
        const allUserIds: string[] = []
        usersSnapshot.forEach(doc => {
            allUserIds.push(doc.id)
        })

        // Count how many users will receive the push notification
        const tokensSnapshot = await db.collection('push_tokens')
            .where('active', '==', true)
            .get()

        const uniquePushUsers = new Set<string>()
        tokensSnapshot.forEach(doc => {
            uniquePushUsers.add(doc.data().userId)
        })

        const totalTokens = tokensSnapshot.size
        const totalPushUsers = uniquePushUsers.size
        const totalUsers = allUserIds.length

        console.log(`[Broadcast] Sending push to ${totalTokens} tokens across ${totalPushUsers} users`)
        console.log(`[Broadcast] Storing notification for ${totalUsers} total users`)
        console.log(`[Broadcast] Title: ${title}`)
        console.log(`[Broadcast] Body: ${body}`)

        // 1. Store notification in Firestore for ALL users (so notification bell works for everyone)
        const notificationData = {
            title,
            body,
            type: 'broadcast',
            data: data || null,
            actionUrl: null,
            isRead: false,
            createdAt: Date.now(),
        }

        // Batch write notifications (Firestore allows max 500 per batch)
        const BATCH_SIZE = 500
        let storedCount = 0

        for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
            const batch = db.batch()
            const userBatch = allUserIds.slice(i, i + BATCH_SIZE)

            for (const userId of userBatch) {
                const docRef = db.collection('user_notifications').doc()
                batch.set(docRef, { ...notificationData, userId })
            }

            await batch.commit()
            storedCount += userBatch.length
        }

        console.log(`[Broadcast] Stored ${storedCount} notifications in Firestore`)

        // 2. Send push notifications to users with active tokens
        let pushSuccess = true
        if (totalTokens > 0) {
            pushSuccess = await sendPushToAll(title, body, {
                type: 'broadcast',
                timestamp: Date.now().toString(),
                ...data
            })
        }

        // Log the broadcast
        await db.collection('broadcast_logs').add({
            title,
            body,
            data: data || null,
            sentAt: Date.now(),
            totalTokens,
            totalPushUsers,
            totalUsers,
            storedNotifications: storedCount,
            pushSuccess
        })

        return res.status(200).json({
            success: true,
            message: `Broadcast sent! Push: ${totalPushUsers} users (${totalTokens} devices). In-app: ${storedCount} users.`,
            totalTokens,
            totalPushUsers,
            totalUsers: storedCount,
            storedNotifications: storedCount,
            sentAt: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('[Broadcast] Error:', error)
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to send broadcast'
        })
    }
}


export default allowCors(handler)
