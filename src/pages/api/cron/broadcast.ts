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

        // Count how many users will receive the notification
        const tokensSnapshot = await db.collection('push_tokens')
            .where('active', '==', true)
            .get()

        const uniqueUsers = new Set<string>()
        tokensSnapshot.forEach(doc => {
            uniqueUsers.add(doc.data().userId)
        })

        const totalTokens = tokensSnapshot.size
        const totalUsers = uniqueUsers.size

        if (totalTokens === 0) {
            return res.status(200).json({
                success: false,
                message: 'No active push tokens found. No notifications sent.',
                totalTokens: 0,
                totalUsers: 0
            })
        }

        console.log(`[Broadcast] Sending to ${totalTokens} tokens across ${totalUsers} users`)
        console.log(`[Broadcast] Title: ${title}`)
        console.log(`[Broadcast] Body: ${body}`)

        // Send to all users
        const success = await sendPushToAll(title, body, {
            type: 'broadcast',
            timestamp: Date.now().toString(),
            ...data
        })

        // Log the broadcast
        await db.collection('broadcast_logs').add({
            title,
            body,
            data: data || null,
            sentAt: Date.now(),
            totalTokens,
            totalUsers,
            success
        })

        return res.status(200).json({
            success,
            message: success
                ? `Broadcast sent successfully to ${totalUsers} users (${totalTokens} devices)`
                : 'Broadcast may have partially failed - check server logs',
            totalTokens,
            totalUsers,
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
