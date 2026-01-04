import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query

    if (!db || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid request' })
    }

    if (req.method === 'GET') {
        try {
            const snapshot = await db.collection('posts').doc(id).collection('versions')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()

            const versions: any[] = []
            snapshot.forEach(doc => {
                versions.push({ id: doc.id, ...doc.data() })
            })

            return res.status(200).json({ success: true, data: versions })
        } catch (error) {
            console.error('Error fetching versions:', error)
            return res.status(500).json({ error: 'Failed to fetch versions' })
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default requireAdmin(handler)
