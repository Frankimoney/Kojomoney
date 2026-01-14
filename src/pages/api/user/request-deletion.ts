import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId, reason } = req.body

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        // Verify user exists first
        const userDoc = await db.collection('users').doc(userId).get()
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()

        // Create deletion request
        await db.collection('deletion_requests').add({
            userId,
            userEmail: userData?.email || 'Unknown',
            userName: userData?.name || 'Unknown',
            reason: reason || 'No reason provided',
            status: 'pending',
            createdAt: Date.now(),
            requestedAt: new Date().toISOString()
        })

        return res.status(200).json({ success: true, message: 'Deletion request submitted successfully' })
    } catch (error) {
        console.error('Error submitting deletion request:', error)
        return res.status(500).json({ error: 'Failed to submit request' })
    }
}

export default allowCors(handler)
