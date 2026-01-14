/**
 * Public Blog Post API (Single)
 * 
 * GET /api/blog/[slug]
 * Returns full post with related posts and settings
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import { getBlogPostBySlug } from '@/lib/blog-service'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { slug } = req.query

        if (!slug || typeof slug !== 'string') {
            return res.status(400).json({ error: 'Invalid slug' })
        }

        const result = await getBlogPostBySlug(slug)

        if (result.redirect) {
            return res.status(301).json({
                redirect: true,
                to: `/blog/${result.redirect}`,
                permanent: result.permanent
            })
        }

        if (!result.post) {
            return res.status(404).json({ error: 'Post not found' })
        }

        return res.status(200).json(result)

    } catch (error) {
        console.error('Error fetching blog post:', error)
        return res.status(500).json({ error: 'Failed to fetch post' })
    }
}

export default allowCors(handler)
