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
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { BlogPost } from '@/types/blog'

export const dynamic = 'force-dynamic'

const POSTS_PER_PAGE = 9

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(200).json({
            posts: [],
            page: 1,
            hasMore: false,
            categories: [],
            activeCategory: null,
            searchQuery: null,
            settings: {}
        })
    }

    try {
        const page = parseInt(req.query.page as string || '1')
        const search = (req.query.search as string || '').toLowerCase()
        const category = req.query.category as string || null

        let query = db.collection('posts')
            .where('status', '==', 'published')

        if (category) {
            query = query.where('categories', 'array-contains', category)
        }

        // Fetch posts
        const snapshot = await query.orderBy('publishedAt', 'desc').limit(100).get()

        console.log(`[Blog Posts API] Found ${snapshot.docs.length} published posts`)

        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost))

        // Filter by title (Search) - naive impl for MVP
        if (search) {
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(search) ||
                p.excerpt?.toLowerCase().includes(search)
            )
        }

        // Pagination
        const total = posts.length
        const start = (page - 1) * POSTS_PER_PAGE
        const paginatedPosts = posts.slice(start, start + POSTS_PER_PAGE)
        const hasMore = start + POSTS_PER_PAGE < total

        // Extract Categories from all published posts
        const allCategories = Array.from(new Set(posts.flatMap(p => p.tags || []))).slice(0, 10)

        // Serialize dates and strip content
        const serializedPosts = paginatedPosts.map(post => ({
            ...post,
            content: '', // Strip heavy content for list view
            publishedAt: post.publishedAt || null,
            createdAt: post.createdAt || null
        }))

        // Fetch Global Settings
        const settingsDoc = await db.collection('settings').doc('blog').get()
        const settings = settingsDoc.exists ? settingsDoc.data() : {}

        return res.status(200).json({
            posts: serializedPosts,
            page,
            hasMore,
            categories: allCategories,
            activeCategory: category,
            searchQuery: search || null,
            settings
        })
    } catch (error) {
        console.error('Error fetching blog posts:', error)
        return res.status(200).json({
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
