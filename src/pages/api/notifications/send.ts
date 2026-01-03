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

// Get Firebase Messaging (uses already-initialized admin instance)
function getMessaging() {
    try {
        // If admin is already initialized (from firebase-admin.ts), use it
        if (admin.apps.length > 0) {
            return admin.messaging()
        }

        // Otherwise, not configured
        console.error('Firebase Admin not initialized. Check firebase-admin.ts')
        return null
    } catch (e) {
        console.error('Error getting Firebase Messaging:', e)
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

// Helper function to send push from other API routes (direct Firebase Admin SDK call)
export async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<boolean> {
    try {
        if (!db) {
            console.error('[sendPushToUser] Database not available')
            return false
        }

        const messaging = getMessaging()
        if (!messaging) {
            console.error('[sendPushToUser] Firebase Messaging not configured')
            return false
        }

        // Get push tokens for this specific user
        const tokensSnapshot = await db.collection('push_tokens')
            .where('userId', '==', userId)
            .where('active', '==', true)
            .get()

        let tokens: string[] = []
        tokensSnapshot.forEach(doc => {
            const token = doc.data().token
            if (token) tokens.push(token)
        })

        if (tokens.length === 0) {
            console.log(`[sendPushToUser] No active tokens for user ${userId}`)
            return true // Not an error, just no recipients
        }

        // Remove duplicates
        tokens = [...new Set(tokens)]

        console.log(`[sendPushToUser] Sending to user ${userId} (${tokens.length} devices)`)

        // Build message
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title,
                body
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

        console.log(`[sendPushToUser] Success: ${response.successCount}, Failed: ${response.failureCount}`)

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
            console.log(`[sendPushToUser] Deactivated ${failedTokens.length} invalid tokens`)
        }

        return response.successCount > 0
    } catch (e) {
        console.error('[sendPushToUser] Failed:', e)
        return false
    }
}


// Helper to send push to all users (direct Firebase Admin SDK call)
export async function sendPushToAll(
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<boolean> {
    try {
        if (!db) {
            console.error('[sendPushToAll] Database not available')
            return false
        }

        const messaging = getMessaging()
        if (!messaging) {
            console.error('[sendPushToAll] Firebase Messaging not configured')
            return false
        }

        // Get ALL active tokens
        const tokensSnapshot = await db.collection('push_tokens')
            .where('active', '==', true)
            .get()

        let tokens: string[] = []
        tokensSnapshot.forEach(doc => {
            const token = doc.data().token
            if (token) tokens.push(token)
        })

        if (tokens.length === 0) {
            console.log('[sendPushToAll] No active tokens found')
            return true // Not an error, just no recipients
        }

        // Remove duplicates
        tokens = [...new Set(tokens)]

        console.log(`[sendPushToAll] Sending to ${tokens.length} devices`)

        // Build message
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title,
                body
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

        console.log(`[sendPushToAll] Success: ${response.successCount}, Failed: ${response.failureCount}`)

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
            console.log(`[sendPushToAll] Deactivated ${failedTokens.length} invalid tokens`)
        }

        return response.successCount > 0
    } catch (e) {
        console.error('[sendPushToAll] Failed:', e)
        return false
    }
}
