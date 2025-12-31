import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

/**
 * POST /api/notifications/register
 * Register a device's FCM push token for the user
 * 
 * Body: { userId: string, token: string, platform: 'ios' | 'android' | 'web' }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId, token, platform } = req.body

        if (!userId || !token) {
            return res.status(400).json({ error: 'Missing userId or token' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        const deviceId = `${userId}_${platform || 'unknown'}`

        // Store/update the token for this user+device
        await db.collection('push_tokens').doc(deviceId).set({
            userId,
            token,
            platform: platform || 'unknown',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            active: true
        }, { merge: true })

        // Also update user document with latest token
        await db.collection('users').doc(userId).update({
            pushToken: token,
            pushPlatform: platform || 'unknown',
            pushTokenUpdatedAt: Date.now()
        })

        return res.status(200).json({
            success: true,
            message: 'Push token registered successfully'
        })
    } catch (error) {
        console.error('Error registering push token:', error)
        return res.status(500).json({ error: 'Failed to register push token' })
    }
}

export default allowCors(handler)
