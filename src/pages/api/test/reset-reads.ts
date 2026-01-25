// TEMPORARY: Test endpoint to reset news reads for a user
// TODO: Remove this file before production deployment

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        // Find and delete all news reads for this user
        const readsSnapshot = await db.collection('news_reads')
            .where('userId', '==', userId)
            .get()

        let deletedCount = 0
        const batch = db.batch()

        readsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCount++
        })

        if (deletedCount > 0) {
            await batch.commit()
        }

        // Also reset todayProgress.storiesRead in user doc
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (userDoc.exists) {
            const userData = userDoc.data()!
            const todayProgress = userData.todayProgress || { adsWatched: 0, storiesRead: 0, triviaCompleted: false }
            todayProgress.storiesRead = 0

            await userRef.update({
                todayProgress,
                storiesRead: 0
            })
        }

        console.log(`[TEST] Reset ${deletedCount} news reads for user ${userId}`)

        return res.status(200).json({
            success: true,
            deletedReads: deletedCount,
            message: `Cleared ${deletedCount} read records for testing`
        })
    } catch (error) {
        console.error('Error resetting reads:', error)
        return res.status(500).json({ error: 'Failed to reset reads' })
    }
}
