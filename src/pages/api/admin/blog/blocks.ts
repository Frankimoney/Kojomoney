/**
 * Admin Content Block API
 * 
 * GET /api/admin/blog/blocks - List all blocks
 * POST /api/admin/blog/blocks - Create/Update block (simplified single endpoint for blocks)
 * DELETE /api/admin/blog/blocks?id=...
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { ContentBlock } from '@/types/blog'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database connection failed' })
    }

    if (req.method === 'GET') {
        try {
            const snapshot = await db.collection('content_blocks').orderBy('name').get()
            const blocks: ContentBlock[] = []
            snapshot.forEach(doc => {
                blocks.push({ id: doc.id, ...doc.data() } as ContentBlock)
            })
            return res.status(200).json({ success: true, data: blocks })
        } catch (error) {
            console.error('Error fetching blocks:', error)
            return res.status(500).json({ error: 'Failed to fetch blocks' })
        }
    }
    else if (req.method === 'POST') {
        try {
            const { id, name, content, category } = req.body
            const now = Date.now()

            const data = {
                name,
                content,
                category: category || 'General',
                updatedAt: now
            }

            if (id) {
                await db.collection('content_blocks').doc(id).update(data)
                return res.status(200).json({ success: true, data: { id, ...data } })
            } else {
                const docRef = await db.collection('content_blocks').add({
                    ...data,
                    createdAt: now
                })
                return res.status(201).json({ success: true, data: { id: docRef.id, ...data } })
            }
        } catch (error) {
            console.error('Error saving block:', error)
            return res.status(500).json({ error: 'Failed to save block' })
        }
    }
    else if (req.method === 'DELETE') {
        try {
            const { id } = req.query
            if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' })

            await db.collection('content_blocks').doc(id).delete()
            return res.status(200).json({ success: true, message: 'Block deleted' })
        } catch (error) {
            console.error('Error deleting block:', error)
            return res.status(500).json({ error: 'Failed to delete block' })
        }
    }
    else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default requireAdmin(handler)
