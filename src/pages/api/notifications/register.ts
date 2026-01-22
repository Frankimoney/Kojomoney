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

        console.log('[Push Register] Incoming request:', {
            userId: userId?.substring(0, 8) + '...',
            tokenPrefix: token?.substring(0, 20) + '...',
            platform
        })

        if (!userId || !token) {
            console.log('[Push Register] Missing params:', { hasUserId: !!userId, hasToken: !!token })
            return res.status(400).json({ error: 'Missing userId or token' })
        }

        if (!db) {
            console.error('[Push Register] Database not available')
            return res.status(500).json({ error: 'Database not available' })
        }

        const deviceId = `${userId}_${platform || 'unknown'}`
        console.log('[Push Register] Device ID:', deviceId)

        // Store/update the token for this user+device
        await db.collection('push_tokens').doc(deviceId).set({
            userId,
            token,
            platform: platform || 'unknown',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            active: true
        }, { merge: true })

        console.log('[Push Register] Token saved successfully for:', deviceId)

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
