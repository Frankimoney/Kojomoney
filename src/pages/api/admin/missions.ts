/**
 * Admin Missions API Endpoint
 * 
 * POST /api/admin/missions - Create a new mission with affiliate link
 * PUT /api/admin/missions - Update an existing mission
 * DELETE /api/admin/missions - Delete a mission
 * 
 * IMPORTANT: In production, add proper admin authentication!
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    // TODO: Add admin authentication check
    // For now, we'll allow all requests
    // In production, verify admin JWT or session

    switch (req.method) {
        case 'POST':
            return handleCreate(req, res)
        case 'PUT':
            return handleUpdate(req, res)
        case 'DELETE':
            return handleDelete(req, res)
        default:
            return res.status(405).json({ error: 'Method not allowed' })
    }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            title,
            description,
            payout,
            type,
            difficulty,
            affiliateUrl,
            steps,
            proofRequired,
            active,
            expiresAt,
        } = req.body

        if (!title || !affiliateUrl || !payout) {
            return res.status(400).json({ error: 'Title, affiliate URL, and payout are required' })
        }

        const now = Date.now()
        const mission = {
            title,
            description: description || '',
            payout: parseInt(payout) || 100,
            type: type || 'custom',
            difficulty: difficulty || 'Easy',
            affiliateUrl,
            steps: steps || [],
            proofRequired: proofRequired ?? true,
            active: active ?? true,
            expiresAt: expiresAt || null,
            createdAt: now,
            updatedAt: now,
        }

        const docRef = await db!.collection('missions').add(mission)

        return res.status(201).json({
            success: true,
            mission: { id: docRef.id, ...mission },
        })
    } catch (error) {
        console.error('Error creating mission:', error)
        return res.status(500).json({ error: 'Failed to create mission' })
    }
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id, ...updates } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Mission ID is required' })
        }

        // Validate mission exists
        const missionRef = db!.collection('missions').doc(id)
        const missionDoc = await missionRef.get()

        if (!missionDoc.exists) {
            return res.status(404).json({ error: 'Mission not found' })
        }

        // Only allow specific fields to be updated
        const allowedFields = [
            'title', 'description', 'payout', 'type', 'difficulty',
            'affiliateUrl', 'steps', 'proofRequired', 'active', 'expiresAt'
        ]

        const sanitizedUpdates: Record<string, any> = { updatedAt: Date.now() }
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field]
            }
        }

        await missionRef.update(sanitizedUpdates)

        return res.status(200).json({
            success: true,
            mission: { id, ...missionDoc.data(), ...sanitizedUpdates },
        })
    } catch (error) {
        console.error('Error updating mission:', error)
        return res.status(500).json({ error: 'Failed to update mission' })
    }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Mission ID is required' })
        }

        await db!.collection('missions').doc(id).delete()

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error deleting mission:', error)
        return res.status(500).json({ error: 'Failed to delete mission' })
    }
}

export default requireAdmin(handler, 'super_admin')
