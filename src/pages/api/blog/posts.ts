/**
 * Public Blog Posts API
 * 
 * GET /api/blog/posts
 * Query Params:
 * - limit: number (default 10)
 * - page: number (default 1)
 * - category: string (optional)
 * - tag: string (optional)
 * - authorId: string (optional)
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
        const { limit = '10', page = '1', category, tag, authorId } = req.query

        const limitNum = Math.min(parseInt(limit as string) || 10, 50)
        const pageNum = Math.max(parseInt(page as string) || 1, 1)

        let query = db.collection('posts')
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')

        if (category) {
            query = query.where('categories', 'array-contains', category)
        } else if (tag) {
            // Note: Cloud Firestore can act weird with multiple array-contains.
            // Be careful if combining category + tag filtering logic.
            query = query.where('tags', 'array-contains', tag)
        }

        if (authorId) {
            query = query.where('author.id', '==', authorId)
        }

        // Pagination via offset is expensive in Firestore for deep pages, 
        // but for a blog it's usually fine up to a few thousand posts.
        // For cleaner scalable pagination, we'd use startAfter, but that requires
        // the client to pass the last document snapshot or specific field values.
        // We'll stick to offset for simplicity unless scale demands otherwise.
        const offset = (pageNum - 1) * limitNum

        // Count total for pagination metadata (separate query)
        // Note: count() aggregation is cheaper but requires admin SDK v11+ features or separate aggregated counter.
        // For now, allow simple client-side logic: if results < limit, it's the last page.

        // Execute query
        const snapshot = await query.limit(limitNum).offset(offset).get()

        const posts: BlogPost[] = []
        snapshot.forEach(doc => {
            posts.push(doc.data() as BlogPost)
        })

        // Sanitized response (remove heavy content if listing?)
        // Ideally, we return excerpts in list view, not full content.
        const summaryPosts = posts.map(post => ({
            ...post,
            content: '', // Strip heavy content for list view to save bandwidth
            // Keep excerpt
        }))

        return res.status(200).json({
            success: true,
            data: summaryPosts,
            meta: {
                page: pageNum,
                limit: limitNum,
                hasMore: posts.length === limitNum
            }
        })
    } catch (error) {
        console.error('Error fetching blog posts:', error)
        return res.status(500).json({ error: 'Failed to fetch posts' })
    }
}

export default allowCors(handler)
