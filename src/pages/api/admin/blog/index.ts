/**
 * Admin Blog Management API
 * 
 * GET /api/admin/blog - List all posts (with filtering)
 * POST /api/admin/blog - Create new post
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { BlogPost } from '@/types/blog'
import slugify from 'slugify'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database connection failed' })
    }

    if (req.method === 'GET') {
        try {
            const { status, search, limit = '20', page = '1' } = req.query

            // Note: Complex search requires Algolia/Meilisearch.
            // For now, we'll do simple filtering or client-side search for small datasets.

            let query = db.collection('posts').orderBy('updatedAt', 'desc')

            if (status) {
                query = query.where('status', '==', status)
            }

            // Pagination
            const limitNum = parseInt(limit as string) || 20
            const pageNum = Math.max(parseInt(page as string) || 1, 1)
            const offset = (pageNum - 1) * limitNum

            const snapshot = await query.limit(limitNum).offset(offset).get()

            const posts: BlogPost[] = []
            snapshot.forEach(doc => {
                posts.push({ id: doc.id, ...doc.data() } as BlogPost)
            })

            return res.status(200).json({
                success: true,
                data: posts,
                meta: {
                    page: pageNum,
                    limit: limitNum
                }
            })
        } catch (error) {
            console.error('Error fetching admin posts:', error)
            return res.status(500).json({ error: 'Failed to fetch posts' })
        }
    }
    else if (req.method === 'POST') {
        try {
            const { title, content, status, focusKeyword } = req.body

            if (!title) {
                return res.status(400).json({ error: 'Title is required' })
            }

            // Generate Slug
            let slug = req.body.slug
                ? slugify(req.body.slug, { lower: true, strict: true })
                : slugify(title, { lower: true, strict: true })

            // Check slug uniqueness
            const slugCheck = await db.collection('posts').where('slug', '==', slug).get()
            if (!slugCheck.empty) {
                // Simple collision resolution: append random string or timestamp
                // Ideally, user should fix it, but let's auto-fix to be "efficient"
                slug = `${slug}-${Date.now().toString().slice(-4)}`
            }

            const now = Date.now()

            const newPost: Omit<BlogPost, 'id'> = {
                title,
                slug,
                content: content || '', // Drafts might be empty
                status: status || 'draft',
                updatedAt: now,
                createdAt: now,
                author: req.body.author || { name: 'Admin', id: 'admin' }, // Should come from token ideally
                tags: req.body.tags || [],
                categories: req.body.categories || [],
                loading: false, // UI helper, not DB
                ...req.body // Spread other fields like SEO/Schema
            }

            // Remove potentially dangerous fields or undefined
            // Firestore doesn't like undefined
            const cleanPost = JSON.parse(JSON.stringify(newPost))

            const docRef = await db.collection('posts').add(cleanPost)

            // Update with ID? Not strictly needed as doc.id is implicit, 
            // but helpful to have inside the doc for some clients.
            // Let's keep it clean and just return it.

            return res.status(201).json({
                success: true,
                data: { id: docRef.id, ...cleanPost }
            })

        } catch (error) {
            console.error('Error creating post:', error)
            return res.status(500).json({ error: 'Failed to create post' })
        }
    }
    else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

// requireAdmin automatically wraps with allowCors now
export default requireAdmin(handler)
