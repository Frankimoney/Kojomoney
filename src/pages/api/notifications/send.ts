/**
 * Push Notification Send API
 * 
 * POST /api/notifications/send
 * 
 * Send push notifications to users via Firebase Cloud Messaging
 * 
 * Body: {
 *   userIds: string[] | 'all',  // Specific users or all
 *   title: string,
 *   body: string,
 *   data?: object,              // Optional custom data
 *   imageUrl?: string           // Optional image
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
function getMessaging() {
    try {
        return admin.messaging()
    } catch (e) {
        // Firebase admin not initialized, try to initialize
        if (!admin.apps.length) {
            const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            if (serviceAccount) {
                try {
                    const parsed = JSON.parse(serviceAccount)
                    admin.initializeApp({
                        credential: admin.credential.cert(parsed)
                    })
                    return admin.messaging()
                } catch (parseError) {
                    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError)
                    return null
                }
            }
        }
        return null
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Admin authentication check
    const adminKey = req.headers['x-admin-key']
    const internalKey = req.headers['x-internal-key']

    const isAdmin = adminKey === process.env.ADMIN_API_KEY
    const isInternal = internalKey === process.env.INTERNAL_API_KEY || internalKey === 'internal-notification-system'

    if (!isAdmin && !isInternal) {
        // Allow if no API key is set (development mode)
        if (process.env.ADMIN_API_KEY || process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' })
        }
    }

    try {
        const { userIds, title, body, data, imageUrl } = req.body

        if (!title || !body) {
            return res.status(400).json({ error: 'title and body are required' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        const messaging = getMessaging()
        if (!messaging) {
            return res.status(500).json({ error: 'Firebase Messaging not configured. Set FIREBASE_SERVICE_ACCOUNT env var.' })
        }

        // Get push tokens
        let tokens: string[] = []

        if (userIds === 'all') {
            // Get all active tokens
            const tokensSnapshot = await db.collection('push_tokens')
                .where('active', '==', true)
                .get()

            tokensSnapshot.forEach(doc => {
                const token = doc.data().token
                if (token) tokens.push(token)
            })
        } else if (Array.isArray(userIds)) {
            // Get tokens for specific users
            for (const userId of userIds) {
                const tokensSnapshot = await db.collection('push_tokens')
                    .where('userId', '==', userId)
                    .where('active', '==', true)
                    .get()

                tokensSnapshot.forEach(doc => {
                    const token = doc.data().token
                    if (token) tokens.push(token)
                })
            }
        } else {
            return res.status(400).json({ error: 'userIds must be "all" or an array of user IDs' })
        }

        if (tokens.length === 0) {
            return res.status(200).json({
                success: true,
                sent: 0,
                message: 'No push tokens found for specified users'
            })
        }

        // Remove duplicates
        tokens = [...new Set(tokens)]

        // Build message
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title,
                body,
                ...(imageUrl && { imageUrl })
            },
            data: data ? Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ) : undefined,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    sound: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        }

        // Send notifications
        const response = await messaging.sendEachForMulticast(message)

        // Mark failed tokens as inactive
        const failedTokens: string[] = []
        response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                failedTokens.push(tokens[idx])
            }
        })

        // Deactivate failed tokens
        if (failedTokens.length > 0) {
            const batch = db.batch()
            for (const token of failedTokens) {
                const tokenDocs = await db.collection('push_tokens')
                    .where('token', '==', token)
                    .get()

                tokenDocs.forEach(doc => {
                    batch.update(doc.ref, { active: false })
                })
            }
            await batch.commit()
        }

        return res.status(200).json({
            success: true,
            sent: response.successCount,
            failed: response.failureCount,
            totalTokens: tokens.length
        })

    } catch (error) {
        console.error('Error sending push notifications:', error)
        return res.status(500).json({ error: 'Failed to send notifications' })
    }
}

// Helper function to send push from other API routes
export async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<boolean> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-key': 'internal-notification-system'
            },
            body: JSON.stringify({
                userIds: [userId],
                title,
                body,
                data
            })
        })
        return response.ok
    } catch (e) {
        console.error('Failed to send push:', e)
        return false
    }
}

// Helper to send push to all users
export async function sendPushToAll(
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<boolean> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-key': 'internal-notification-system'
            },
            body: JSON.stringify({
                userIds: 'all',
                title,
                body,
                data
            })
        })
        return response.ok
    } catch (e) {
        console.error('Failed to send push:', e)
        return false
    }
}
