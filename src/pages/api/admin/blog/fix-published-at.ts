/**
 * Fix Missing publishedAt API
 * 
 * GET /api/admin/blog/fix-published-at
 * Adds publishedAt to all published posts that are missing it
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database connection failed' })
    }

    try {
        // Find all published posts
        const snapshot = await db.collection('posts')
            .where('status', '==', 'published')
            .get()

        console.log(`[Fix publishedAt] Found ${snapshot.docs.length} published posts`)

        let fixed = 0
        let alreadyHas = 0
        const fixedPosts: string[] = []

        for (const doc of snapshot.docs) {
            const data = doc.data()

            if (!data.publishedAt) {
                // Set publishedAt to createdAt or updatedAt or now
                const publishedAt = data.createdAt || data.updatedAt || Date.now()

                await doc.ref.update({ publishedAt })
                fixed++
                fixedPosts.push(data.title || doc.id)
                console.log(`[Fix publishedAt] Fixed: ${data.title} (${doc.id})`)
            } else {
                alreadyHas++
            }
        }

        return res.status(200).json({
            success: true,
            message: `Fixed ${fixed} posts, ${alreadyHas} already had publishedAt`,
            fixed,
            alreadyHas,
            fixedPosts
        })

    } catch (error: any) {
        console.error('[Fix publishedAt] Error:', error)
        return res.status(500).json({ error: error.message || 'Failed to fix posts' })
    }
}

export default allowCors(handler)
