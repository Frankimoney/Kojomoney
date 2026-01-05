/**
 * Public Blog Post API (Single)
 * 
 * GET /api/blog/[slug]
 * Returns full post with related posts and settings
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
            .where('status', '==', 'published')
            .limit(1)
            .get()

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Post not found' })
        }

        const doc = snapshot.docs[0]
        const post = { id: doc.id, ...doc.data() } as BlogPost

        // Fetch Related Posts
        let relatedPosts: BlogPost[] = []

        // Priority 1: Manual Selection
        if (post.relatedPostIds && post.relatedPostIds.length > 0) {
            try {
                const refs = post.relatedPostIds.map(id => db!.collection('posts').doc(id))
                const snapshots = await db.getAll(...refs)
                relatedPosts = snapshots
                    .filter(s => s.exists && s.data()?.status === 'published')
                    .map(s => ({ id: s.id, ...s.data() } as BlogPost))
            } catch (e) {
                console.error('Error fetching manual related posts', e)
            }
        }

        // Priority 2: Fallback to Tags if we have fewer than 3 manually selected
        if (relatedPosts.length < 3 && post.tags && post.tags.length > 0) {
            const limit = 4
            const relatedSnap = await db.collection('posts')
                .where('tags', 'array-contains', post.tags[0])
                .where('status', '==', 'published')
                .limit(limit)
                .get()

            const taggedPosts = relatedSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as BlogPost))
                .filter(p => p.id !== post.id && !relatedPosts.some(rp => rp.id === p.id))

            relatedPosts = [...relatedPosts, ...taggedPosts].slice(0, 3)
        }

        // Serialize dates
        const serializeInfo = (p: any) => ({
            ...p,
            publishedAt: p.publishedAt || null,
            updatedAt: p.updatedAt || null,
            createdAt: p.createdAt || null
        })

        // Fetch Global Settings
        const settingsDoc = await db.collection('settings').doc('blog').get()
        const settings = settingsDoc.exists ? settingsDoc.data() : {}

        // Process Shortcodes (Content Blocks)
        if (post.content && post.content.includes('[block id=')) {
            try {
                const regex = /\[block id="([^"]+)"\]/g
                const matches = Array.from(post.content.matchAll(regex))

                if (matches.length > 0) {
                    const blockIds = [...new Set(matches.map(m => m[1]))]
                    const blockRefs = blockIds.map(id => db!.collection('blog_blocks').doc(id))

                    if (blockRefs.length > 0) {
                        const blockSnaps = await db.getAll(...blockRefs)
                        const blocksMap = new Map()
                        blockSnaps.forEach(s => {
                            if (s.exists) blocksMap.set(s.id, s.data()?.content || '')
                        })

                        post.content = post.content.replace(regex, (match, id) => {
                            return blocksMap.get(id) || ''
                        })
                    }
                }
            } catch (blockError) {
                console.error('Error processing content blocks:', blockError)
            }
        }

        // Strip content from related posts
        const serializedRelatedPosts = relatedPosts.map(p => ({
            ...serializeInfo(p),
            content: '' // Don't send full content for related posts
        }))

        return res.status(200).json({
            post: serializeInfo(post),
            relatedPosts: serializedRelatedPosts,
            settings
        })

    } catch (error) {
        console.error('Error fetching blog post:', error)
        return res.status(500).json({ error: 'Failed to fetch post' })
    }
}

export default allowCors(handler)
