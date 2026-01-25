import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(200).json({ status: 'db is null' })
    }

    try {
        console.log('Attempting to query posts...')
        const snapshot = await db.collection('posts')
            .where('status', '==', 'published')
            .orderBy('updatedAt', 'desc')
            .limit(5)
            .get()

        const posts = snapshot.docs.map(doc => doc.data())
        return res.status(200).json({ status: 'success', count: posts.length, posts })
    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack,
            code: error.code,
            details: error.details
        })
    }
}
