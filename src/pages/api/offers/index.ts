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

export const dynamic = 'force-dynamic'

// Default offers to seed the database if empty
const DEFAULT_OFFERS: Omit<Offer, 'id'>[] = [
    {
        externalId: 'merge-dragons-1',
        provider: 'AdGem',
        title: 'Merge Dragons',
        description: 'Reach Level 100 to earn 5000 points. New users only.',
        payout: 5000,
        category: 'Game',
        difficulty: 'Hard',
        tags: ['High Paying', 'Game'],
        estimatedTime: '7 days',
        logoUrl: '',
        url: 'https://play.google.com/store/apps/details?id=com.gramgames.mergedragons',
        active: true,
        priority: 10,
        requirements: 'New users only. Must reach level 100.',
        countries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'cpx-survey-1',
        provider: 'CPX',
        title: 'Take a Survey',
        description: 'Complete a quick profile survey to get matched with higher paying surveys.',
        payout: 250,
        category: 'Survey',
        difficulty: 'Easy',
        tags: ['Easy', 'Survey'],
        estimatedTime: '15 mins',
        logoUrl: '',
        url: 'https://www.cpx-research.com',
        active: true,
        priority: 8,
        countries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'aliex-signup-1',
        provider: 'OfferToro',
        title: 'Sign up for AliExpress',
        description: 'Register and make a purchase of at least $1.',
        payout: 1200,
        category: 'Shopping',
        difficulty: 'Medium',
        tags: ['New', 'Shopping'],
        estimatedTime: '5 mins',
        logoUrl: '',
        url: 'https://aliexpress.com',
        active: true,
        priority: 7,
        countries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'candy-crush-1',
        provider: 'Tapjoy',
        title: 'Play Candy Crush',
        description: 'Install and open the app.',
        payout: 50,
        category: 'Game',
        difficulty: 'Easy',
        tags: ['Easy', 'Game'],
        estimatedTime: '2 mins',
        logoUrl: '',
        url: 'https://play.google.com/store/apps/details?id=com.king.candycrushsaga',
        active: true,
        priority: 5,
        countries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'crypto-kyc-1',
        provider: 'AyeT',
        title: 'Crypto.com Register',
        description: 'Complete KYC and deposit $50.',
        payout: 8000,
        category: 'Finance',
        difficulty: 'Hard',
        tags: ['High Paying', 'Finance'],
        estimatedTime: '3 days',
        logoUrl: '',
        url: 'https://crypto.com',
        active: true,
        priority: 10,
        countries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'video-ad-1',
        provider: 'AdColony',
        title: 'Watch Video Ad',
        description: 'Watch a short video to earn points.',
        payout: 10,
        category: 'Video',
        difficulty: 'Easy',
        tags: ['Easy', 'Video'],
        estimatedTime: '30 secs',
        logoUrl: '',
        url: 'https://example.com/video-ad',
        active: true,
        priority: 3,
        countries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

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

        // Fetch ALL offers from Firestore (no compound queries to avoid index requirements)
        const snapshot = await db!.collection('offers').get()

        let offers: Offer[] = []

        if (snapshot.empty) {
            // Seed default offers if database is empty
            console.log('No offers found, seeding default offers...')
            const batch = db!.batch()

            for (const offer of DEFAULT_OFFERS) {
                const docRef = db!.collection('offers').doc()
                batch.set(docRef, offer)
                offers.push({ ...offer, id: docRef.id } as Offer)
            }

            await batch.commit()
            console.log('Seeded', offers.length, 'default offers')
        } else {
            snapshot.forEach(doc => {
                const data = doc.data()
                // Only include active offers
                if (data.active === true) {
                    offers.push({ id: doc.id, ...data } as Offer)
                }
            })
        }

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
