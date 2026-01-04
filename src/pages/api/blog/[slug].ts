/**
 * Public Blog Post API (Single)
 * 
 * GET /api/blog/[slug]
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { BlogPost } from '@/types/blog'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database connection failed' })
    }

    try {
        const { slug } = req.query

        if (!slug || typeof slug !== 'string') {
            return res.status(400).json({ error: 'Invalid slug' })
        }

        const snapshot = await db.collection('posts')
            .where('slug', '==', slug)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Post not found' })
        }

        const doc = snapshot.docs[0]
        const post = doc.data() as BlogPost

        // Check if published
        // Note: We might want to allow 'preview' with a secret token later
        if (post.status !== 'published') {
            return res.status(404).json({ error: 'Post not found' })
        }

        // Increment read count? (Optional, maybe later via analytics endpoint)

        return res.status(200).json({
            success: true,
            data: post
        })
    } catch (error) {
        console.error('Error fetching blog post:', error)
        return res.status(500).json({ error: 'Failed to fetch post' })
    }
}

export default allowCors(handler)
