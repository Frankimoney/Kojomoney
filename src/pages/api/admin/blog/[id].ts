/**
 * Admin Single Post Management API
 * 
 * GET /api/admin/blog/[id] - Get post for editing
 * PUT /api/admin/blog/[id] - Update post
 * DELETE /api/admin/blog/[id] - Delete post
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

    const { id } = req.query

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid ID' })
    }

    const docRef = db.collection('posts').doc(id)

    if (req.method === 'GET') {
        try {
            const doc = await docRef.get()
            if (!doc.exists) {
                return res.status(404).json({ error: 'Post not found' })
            }
            return res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } })
        } catch (error) {
            console.error('Error fetching post:', error)
            return res.status(500).json({ error: 'Failed to fetch post' })
        }
    }
    else if (req.method === 'PUT') {
        try {
            // Transaction to ensure versioning safety
            await db.runTransaction(async (t) => {
                const doc = await t.get(docRef)
                if (!doc.exists) {
                    throw new Error('Post not found')
                }

                const currentData = doc.data() as BlogPost
                const newData = req.body

                // Create Version Snapshot
                // We save the STATE BEFORE THE UPDATE
                const versionRef = docRef.collection('versions').doc()
                t.set(versionRef, {
                    postId: id,
                    data: currentData,
                    createdAt: Date.now(),
                    createdBy: 'admin', // Should be dynamic
                    changeNote: 'Update via Admin Editor'
                })

                // Update Fields
                // If slug changed, verify uniqueness (skip for now to avoid complexity in transaction, usually handled by checking first)
                // Note: strict transactional uniqueness check requires a separate index/collection or very strict locking. 
                // We'll trust the admin or rely on standard merge.

                const updateData = {
                    ...newData,
                    updatedAt: Date.now()
                }

                if (newData.title && !newData.slug) {
                    // Update slug if title changed and slug is empty (resetting slug)
                    // But usually slug is passed explicitly.
                }

                t.update(docRef, updateData)
            })

            return res.status(200).json({ success: true, message: 'Post updated' })

        } catch (error: any) {
            console.error('Error updating post:', error)
            return res.status(500).json({ error: error.message || 'Failed to update post' })
        }
    }
    else if (req.method === 'DELETE') {
        try {
            // Get the post data before deleting (for redirect)
            const doc = await docRef.get()
            if (!doc.exists) {
                return res.status(404).json({ error: 'Post not found' })
            }

            const postData = doc.data() as BlogPost
            const deletedSlug = postData.slug
            const deletedCategories = postData.categories || []

            // Find a similar post to redirect to
            let redirectToSlug: string | null = null

            // First, try to find a post in the same category
            if (deletedCategories.length > 0) {
                const similarQuery = await db.collection('posts')
                    .where('status', '==', 'published')
                    .where('categories', 'array-contains-any', deletedCategories)
                    .limit(5)
                    .get()

                // Find one that isn't the current post
                for (const similar of similarQuery.docs) {
                    if (similar.id !== id) {
                        redirectToSlug = (similar.data() as BlogPost).slug
                        break
                    }
                }
            }

            // If no similar post found, get the most recent published post
            if (!redirectToSlug) {
                const recentQuery = await db.collection('posts')
                    .where('status', '==', 'published')
                    .orderBy('publishedAt', 'desc')
                    .limit(2)
                    .get()

                for (const recent of recentQuery.docs) {
                    if (recent.id !== id) {
                        redirectToSlug = (recent.data() as BlogPost).slug
                        break
                    }
                }
            }

            // Save the redirect mapping
            if (deletedSlug && redirectToSlug) {
                await db.collection('redirects').doc(deletedSlug).set({
                    from: deletedSlug,
                    to: redirectToSlug,
                    type: '301', // Permanent redirect
                    createdAt: Date.now(),
                    reason: 'post_deleted',
                    originalTitle: postData.title
                })
                console.log(`[Redirect] Created: /blog/${deletedSlug} -> /blog/${redirectToSlug}`)
            }

            // Delete post
            // Note: Versions in subcollection generally stay unless recursive delete is used.
            await docRef.delete()

            return res.status(200).json({
                success: true,
                message: 'Post deleted',
                redirect: redirectToSlug ? `/blog/${redirectToSlug}` : null
            })
        } catch (error) {
            console.error('Error deleting post:', error)
            return res.status(500).json({ error: 'Failed to delete post' })
        }
    }
    else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default requireAdmin(handler, 'editor')
