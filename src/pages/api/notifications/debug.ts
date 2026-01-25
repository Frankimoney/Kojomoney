/**
 * DEBUG: Check push notification status
 * 
 * GET /api/notifications/debug?secret=YOUR_CRON_SECRET
 * 
 * Returns information about push tokens and FCM configuration
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import admin from 'firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Simple auth check
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret
    const authHeader = req.headers.authorization
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const isAuthorized =
        (cronSecret && cronSecret === process.env.CRON_SECRET) ||
        (adminToken && adminToken.length > 0)

    if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        firebase: {},
        pushTokens: {},
        environment: {}
    }

    // Check Firebase Admin initialization
    diagnostics.firebase.appsInitialized = admin.apps.length
    diagnostics.firebase.isInitialized = admin.apps.length > 0
    diagnostics.firebase.databaseAvailable = !!db

    // Check if messaging is available
    try {
        if (admin.apps.length > 0) {
            const messaging = admin.messaging()
            diagnostics.firebase.messagingAvailable = !!messaging
        } else {
            diagnostics.firebase.messagingAvailable = false
        }
    } catch (e: any) {
        diagnostics.firebase.messagingAvailable = false
        diagnostics.firebase.messagingError = e.message
    }

    // Check environment variables (redacted)
    diagnostics.environment.hasFirebaseProjectId = !!process.env.FIREBASE_PROJECT_ID
    diagnostics.environment.hasFirebaseClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
    diagnostics.environment.hasFirebasePrivateKey = !!process.env.FIREBASE_PRIVATE_KEY
    diagnostics.environment.hasCronSecret = !!process.env.CRON_SECRET

    // Check push tokens in database
    if (db) {
        try {
            // Count all tokens
            const allTokensSnapshot = await db.collection('push_tokens').get()
            diagnostics.pushTokens.total = allTokensSnapshot.size

            // Count active tokens
            const activeTokensSnapshot = await db.collection('push_tokens')
                .where('active', '==', true)
                .get()
            diagnostics.pushTokens.active = activeTokensSnapshot.size

            // Get unique users with active tokens
            const uniqueUsers = new Set<string>()
            activeTokensSnapshot.forEach(doc => {
                if (doc.data().userId) {
                    uniqueUsers.add(doc.data().userId)
                }
            })
            diagnostics.pushTokens.uniqueActiveUsers = uniqueUsers.size

            // Sample tokens (redacted)
            const sampleTokens: any[] = []
            let count = 0
            activeTokensSnapshot.forEach(doc => {
                if (count < 5) {
                    const data = doc.data()
                    sampleTokens.push({
                        id: doc.id,
                        userId: data.userId?.substring(0, 10) + '...',
                        platform: data.platform,
                        tokenPrefix: data.token?.substring(0, 20) + '...',
                        active: data.active,
                        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null
                    })
                    count++
                }
            })
            diagnostics.pushTokens.samples = sampleTokens

            // Count total users for comparison
            const usersSnapshot = await db.collection('users').get()
            diagnostics.pushTokens.totalUsersInSystem = usersSnapshot.size
            diagnostics.pushTokens.percentageWithTokens =
                usersSnapshot.size > 0
                    ? Math.round((uniqueUsers.size / usersSnapshot.size) * 100) + '%'
                    : '0%'

        } catch (e: any) {
            diagnostics.pushTokens.error = e.message
        }

        // Check recent broadcast logs
        try {
            const logsSnapshot = await db.collection('broadcast_logs')
                .orderBy('sentAt', 'desc')
                .limit(3)
                .get()

            diagnostics.recentBroadcasts = logsSnapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    title: data.title,
                    sentAt: data.sentAt ? new Date(data.sentAt).toISOString() : null,
                    totalTokens: data.totalTokens,
                    totalPushUsers: data.totalPushUsers,
                    totalUsers: data.totalUsers,
                    pushSuccess: data.pushSuccess
                }
            })
        } catch (e: any) {
            diagnostics.recentBroadcasts = { error: e.message }
        }
    }

    // Summary and recommendations
    diagnostics.summary = {
        canSendPush: diagnostics.firebase.messagingAvailable && diagnostics.pushTokens.active > 0,
        issues: []
    }

    if (!diagnostics.firebase.isInitialized) {
        diagnostics.summary.issues.push('Firebase Admin not initialized - check environment variables')
    }
    if (!diagnostics.firebase.messagingAvailable) {
        diagnostics.summary.issues.push('Firebase Messaging not available')
    }
    if (diagnostics.pushTokens.active === 0) {
        diagnostics.summary.issues.push('No active push tokens - users have not granted push permissions or tokens not registered')
    }
    if (diagnostics.pushTokens.active > 0 && diagnostics.pushTokens.active < 5) {
        diagnostics.summary.issues.push(`Only ${diagnostics.pushTokens.active} active tokens - push may be working but few users registered`)
    }

    return res.status(200).json(diagnostics)
}

export default allowCors(handler)
