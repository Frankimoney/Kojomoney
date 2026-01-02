/**
 * Offers API Endpoint
 * 
 * GET /api/offers - Fetch offers with filtering
 * POST /api/offers - Create new offer (admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { Offer } from '@/lib/db-schema'
import { verifyAdminToken } from '@/lib/admin-auth'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else if (req.method === 'PUT') {
        return handlePut(req, res)
    } else if (req.method === 'DELETE') {
        return handleDelete(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default allowCors(handler)

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            userId,
            provider,
            category,
            difficulty,
            minPayout,
            maxPayout,
            tags,
            country,
            page = '1',
            limit = '20',
        } = req.query

        const pageNum = parseInt(page as string) || 1
        const limitNum = Math.min(parseInt(limit as string) || 20, 50)
        const isAdmin = userId === 'admin'

        // Fetch ALL offers from Firestore
        const snapshot = await db!.collection('offers').get()

        let offers: Offer[] = []

        // No seeding - admin must manually add offers
        snapshot.forEach(doc => {
            const data = doc.data()
            // Admin sees ALL offers, users only see active ones
            if (isAdmin || data.active === true) {
                offers.push({ id: doc.id, ...data } as Offer)
            }
        })

        // Apply filters (client-side)
        if (provider) {
            offers = offers.filter(o => o.provider === provider)
        }

        if (category) {
            offers = offers.filter(o => o.category === category)
        }

        if (difficulty) {
            offers = offers.filter(o => o.difficulty === difficulty)
        }

        if (minPayout) {
            const min = parseInt(minPayout as string)
            offers = offers.filter(o => o.payout >= min)
        }

        if (maxPayout) {
            const max = parseInt(maxPayout as string)
            offers = offers.filter(o => o.payout <= max)
        }

        if (tags) {
            const tagList = (tags as string).split(',')
            offers = offers.filter(o =>
                o.tags?.some(t => tagList.includes(t))
            )
        }

        if (country) {
            offers = offers.filter(o =>
                !o.countries?.length || o.countries.includes(country as string)
            )
        }

        // Sort by priority (client-side)
        offers.sort((a, b) => (b.priority || 0) - (a.priority || 0))

        // Pagination
        const total = offers.length
        const startIndex = (pageNum - 1) * limitNum
        const paginatedOffers = offers.slice(startIndex, startIndex + limitNum)

        return res.status(200).json({
            offers: paginatedOffers,
            total,
            page: pageNum,
            limit: limitNum,
        })
    } catch (error) {
        console.error('Error fetching offers:', error)
        return res.status(500).json({ error: 'Failed to fetch offers' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyAdminToken(token)

        if (!decoded || decoded.role !== 'node_admin') {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const offer = req.body as Omit<Offer, 'id'>

        // Validate required fields
        if (!offer.title || !offer.provider || !offer.payout) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Add timestamps
        const now = Date.now()
        const newOffer = {
            ...offer,
            active: offer.active ?? true,
            priority: offer.priority ?? 5,
            tags: offer.tags ?? [],
            countries: offer.countries ?? [],
            createdAt: now,
            updatedAt: now,
        }

        const docRef = await db!.collection('offers').add(newOffer)

        return res.status(201).json({
            offer: { id: docRef.id, ...newOffer },
        })
    } catch (error) {
        console.error('Error creating offer:', error)
        return res.status(500).json({ error: 'Failed to create offer' })
    }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyAdminToken(token)

        if (!decoded || decoded.role !== 'node_admin') {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const { id, ...updates } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Offer ID is required' })
        }

        // Validate offer exists
        const offerRef = db!.collection('offers').doc(id)
        const offerDoc = await offerRef.get()

        if (!offerDoc.exists) {
            return res.status(404).json({ error: 'Offer not found' })
        }

        // Only allow specific fields to be updated
        const allowedFields = [
            'title', 'description', 'payout', 'provider', 'category',
            'difficulty', 'url', 'logoUrl', 'estimatedTime', 'tags',
            'active', 'priority', 'requirements', 'countries'
        ]

        const sanitizedUpdates: Record<string, any> = { updatedAt: Date.now() }
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field]
            }
        }

        await offerRef.update(sanitizedUpdates)

        return res.status(200).json({
            success: true,
            offer: { id, ...offerDoc.data(), ...sanitizedUpdates },
        })
    } catch (error) {
        console.error('Error updating offer:', error)
        return res.status(500).json({ error: 'Failed to update offer' })
    }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyAdminToken(token)

        if (!decoded || decoded.role !== 'node_admin') {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const { id } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Offer ID is required' })
        }

        await db!.collection('offers').doc(id).delete()

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error deleting offer:', error)
        return res.status(500).json({ error: 'Failed to delete offer' })
    }
}
