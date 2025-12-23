/**
 * Social Missions API - Manage Telegram/TikTok follow missions
 * 
 * GET - Fetch active social follow missions for users
 * POST - Create a new social mission (admin)
 * PUT - Update a social mission (admin)
 * DELETE - Delete a social mission (admin)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    switch (req.method) {
        case 'GET':
            return handleGet(req, res)
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

// Get active social missions for user
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId } = req.query

        // Fetch all active social missions
        const missionsSnapshot = await db!.collection('social_missions')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .get()

        const missions = missionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // If userId provided, fetch their submission statuses
        let userSubmissions: Record<string, string> = {}
        if (userId && typeof userId === 'string') {
            const submissionsSnapshot = await db!.collection('social_proofs')
                .where('userId', '==', userId)
                .get()

            submissionsSnapshot.docs.forEach(doc => {
                const data = doc.data()
                userSubmissions[data.missionId] = data.status
            })
        }

        // Attach submission status to each mission
        const missionsWithStatus = missions.map(mission => ({
            ...mission,
            userStatus: userSubmissions[mission.id] || 'available'
        }))

        return res.status(200).json({ missions: missionsWithStatus })
    } catch (error) {
        console.error('Error fetching social missions:', error)
        return res.status(500).json({ error: 'Failed to fetch missions' })
    }
}

// Create a new social mission (admin only)
async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
    try {
        // TODO: Add admin auth check
        const {
            title,
            socialType,      // 'telegram' | 'tiktok' | 'twitter' | 'instagram'
            channelName,
            socialUrl,
            payout,
            description,
        } = req.body

        if (!title || !socialType || !socialUrl || !payout) {
            return res.status(400).json({
                error: 'title, socialType, socialUrl, and payout are required'
            })
        }

        if (!['telegram', 'tiktok', 'twitter', 'instagram'].includes(socialType)) {
            return res.status(400).json({
                error: 'socialType must be telegram, tiktok, twitter, or instagram'
            })
        }

        const mission = {
            title,
            socialType,
            channelName: channelName || '',
            socialUrl,
            payout: parseInt(payout) || 100,
            description: description || `Follow our ${socialType} channel`,
            active: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        const docRef = await db!.collection('social_missions').add(mission)

        return res.status(201).json({
            success: true,
            mission: { id: docRef.id, ...mission }
        })
    } catch (error) {
        console.error('Error creating social mission:', error)
        return res.status(500).json({ error: 'Failed to create mission' })
    }
}

// Update a social mission
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id, ...updates } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Mission ID is required' })
        }

        const missionRef = db!.collection('social_missions').doc(id)
        const missionDoc = await missionRef.get()

        if (!missionDoc.exists) {
            return res.status(404).json({ error: 'Mission not found' })
        }

        const allowedFields = ['title', 'socialType', 'channelName', 'socialUrl', 'payout', 'description', 'active']
        const sanitizedUpdates: Record<string, any> = { updatedAt: Date.now() }

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field]
            }
        }

        await missionRef.update(sanitizedUpdates)

        return res.status(200).json({
            success: true,
            mission: { id, ...missionDoc.data(), ...sanitizedUpdates }
        })
    } catch (error) {
        console.error('Error updating social mission:', error)
        return res.status(500).json({ error: 'Failed to update mission' })
    }
}

// Delete a social mission
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Mission ID is required' })
        }

        await db!.collection('social_missions').doc(id).delete()

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error deleting social mission:', error)
        return res.status(500).json({ error: 'Failed to delete mission' })
    }
}

export default allowCors(handler)
