/**
 * Public Blog Posts API
 * 
 * GET /api/blog/posts
 * Query Params:
 * - page: number (default 1)
 * - category: string (optional)
 * - search: string (optional)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import { getBlogPosts } from '@/lib/blog-service'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const page = parseInt(req.query.page as string || '1')
        const search = (req.query.search as string || '')
        const category = req.query.category as string || null

        const result = await getBlogPosts({
            page,
            category,
            search
        })

        return res.status(200).json(result)
    } catch (error) {
        console.error('Error fetching blog posts:', error)
        return res.status(500).json({
            posts: [],
            page: 1,
            hasMore: false,
            categories: [],
            activeCategory: null,
            searchQuery: null,
            settings: {}
        })
    }
}

export default allowCors(handler)
