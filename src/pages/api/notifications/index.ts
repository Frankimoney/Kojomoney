/**
 * User Notifications API
 * 
 * GET /api/notifications?userId=xxx - Get user's notifications
 * POST /api/notifications - Create a notification for a user
 * PATCH /api/notifications - Mark notifications as read
 * DELETE /api/notifications - Clear all notifications for a user
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    const userId = req.query.userId as string || req.body?.userId

    // GET - Fetch user notifications
    if (req.method === 'GET') {
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        try {
            let notifications: any[] = []

            try {
                // Try optimized query with ordering (requires composite index)
                const snapshot = await db.collection('user_notifications')
                    .where('userId', '==', userId)
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get()

                notifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
            } catch (indexError: any) {
                // Fallback: If index missing, fetch without ordering and sort client-side
                if (indexError.code === 9 || indexError.message?.includes('index')) {
                    console.warn('[Notifications] Index missing, using fallback query')
                    const snapshot = await db.collection('user_notifications')
                        .where('userId', '==', userId)
                        .limit(50)
                        .get()

                    notifications = snapshot.docs
                        .map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                        }))
                        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
                } else {
                    throw indexError
                }
            }

            return res.status(200).json({ notifications })
        } catch (error: any) {
            console.error('[Notifications] GET error:', error?.message || error)
            return res.status(500).json({
                error: 'Failed to fetch notifications',
                details: error?.message || 'Unknown error'
            })
        }
    }

    // POST - Create a notification (internal use)
    if (req.method === 'POST') {
        const { title, body, type, data, actionUrl, targetUserIds } = req.body

        if (!title || !body) {
            return res.status(400).json({ error: 'title and body are required' })
        }

        try {
            const notification = {
                title,
                body,
                type: type || 'info',
                data: data || null,
                actionUrl: actionUrl || null,
                isRead: false,
                createdAt: Date.now(),
            }

            // If targetUserIds provided, create notification for each user
            if (targetUserIds && Array.isArray(targetUserIds)) {
                const batch = db.batch()
                const notificationIds: string[] = []

                for (const uid of targetUserIds) {
                    const docRef = db.collection('user_notifications').doc()
                    batch.set(docRef, { ...notification, userId: uid })
                    notificationIds.push(docRef.id)
                }

                await batch.commit()

                return res.status(201).json({
                    success: true,
                    count: targetUserIds.length,
                    notificationIds
                })
            }

            // Single user notification
            if (!userId) {
                return res.status(400).json({ error: 'userId or targetUserIds required' })
            }

            const docRef = await db.collection('user_notifications').add({
                ...notification,
                userId
            })

            return res.status(201).json({
                success: true,
                notificationId: docRef.id
            })
        } catch (error: any) {
            console.error('[Notifications] POST error:', error)
            return res.status(500).json({ error: 'Failed to create notification' })
        }
    }

    // PATCH - Mark as read
    if (req.method === 'PATCH') {
        const { notificationIds, markAll } = req.body

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        try {
            if (markAll) {
                // Mark all user notifications as read
                let docsToUpdate: FirebaseFirestore.QueryDocumentSnapshot[] = []

                try {
                    // Try compound query (requires index)
                    const snapshot = await db.collection('user_notifications')
                        .where('userId', '==', userId)
                        .where('isRead', '==', false)
                        .get()
                    docsToUpdate = snapshot.docs
                } catch (indexError: any) {
                    // Fallback: fetch all user notifications and filter client-side
                    if (indexError.code === 9 || indexError.message?.includes('index')) {
                        console.warn('[Notifications] Index missing for PATCH, using fallback')
                        const snapshot = await db.collection('user_notifications')
                            .where('userId', '==', userId)
                            .get()
                        docsToUpdate = snapshot.docs.filter(doc => !doc.data().isRead)
                    } else {
                        throw indexError
                    }
                }

                const batch = db.batch()
                docsToUpdate.forEach(doc => {
                    batch.update(doc.ref, { isRead: true, readAt: Date.now() })
                })
                await batch.commit()

                return res.status(200).json({
                    success: true,
                    updated: docsToUpdate.length
                })
            }

            if (notificationIds && Array.isArray(notificationIds)) {
                const batch = db.batch()
                for (const id of notificationIds) {
                    const docRef = db.collection('user_notifications').doc(id)
                    batch.update(docRef, { isRead: true, readAt: Date.now() })
                }
                await batch.commit()

                return res.status(200).json({
                    success: true,
                    updated: notificationIds.length
                })
            }

            return res.status(400).json({ error: 'notificationIds or markAll required' })
        } catch (error: any) {
            console.error('[Notifications] PATCH error:', error)
            return res.status(500).json({ error: 'Failed to update notifications' })
        }
    }

    // DELETE - Clear all notifications for user
    if (req.method === 'DELETE') {
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' })
        }

        try {
            const snapshot = await db.collection('user_notifications')
                .where('userId', '==', userId)
                .get()

            const batch = db.batch()
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref)
            })
            await batch.commit()

            return res.status(200).json({
                success: true,
                deleted: snapshot.size
            })
        } catch (error: any) {
            console.error('[Notifications] DELETE error:', error)
            return res.status(500).json({ error: 'Failed to delete notifications' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default allowCors(handler)
