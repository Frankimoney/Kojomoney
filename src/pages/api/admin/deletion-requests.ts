import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not initialized' })
        }

        const snapshot = await db.collection('deletion_requests')
            .orderBy('createdAt', 'desc')
            .get()

        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        return res.status(200).json({ requests })
    } catch (error) {
        console.error('Error fetching deletion requests:', error)
        return res.status(500).json({ error: 'Failed to fetch requests' })
    }
}

export default allowCors(handler)
