import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { userId } = req.query
    const userIdStr = Array.isArray(userId) ? userId[0] : userId

    if (!userIdStr) {
        return res.status(400).json({ error: 'User ID required' })
    }

    try {
        if (!db) {
            // Fallback for dev without DB
            return res.status(200).json({ canSpin: true })
        }

        const userDoc = await db.collection('users').doc(userIdStr).get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()
        const lastSpinAt = userData?.lastSpinAt || 0
        const now = Date.now()
        const oneDayMs = 24 * 60 * 60 * 1000

        const timeDiff = now - lastSpinAt
        const canSpin = timeDiff >= oneDayMs

        const nextSpinTime = canSpin ? null : (lastSpinAt + oneDayMs)

        return res.status(200).json({
            canSpin,
            nextSpinTime,
            serverTime: now
        })
    } catch (error) {
        console.error('Spin status error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

export default allowCors(handler)
