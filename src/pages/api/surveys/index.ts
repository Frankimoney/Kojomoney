/**
 * Surveys API Endpoint
 * 
 * GET /api/surveys - Fetch available surveys
 * POST /api/surveys - Create new survey (admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { Survey } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

// Default surveys to seed the database if empty
const DEFAULT_SURVEYS: Omit<Survey, 'id'>[] = [
    {
        externalId: 'cpx-consumer-1',
        provider: 'CPX',
        title: 'Consumer Habits Survey',
        description: 'Share your shopping preferences and consumer habits.',
        payout: 850,
        timeMinutes: 12,
        starRating: 5,
        isHot: true,
        tags: ['High Pay', 'Retail'],
        iframeSupport: false,
        url: 'https://www.cpx-research.com',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'theorem-tech-1',
        provider: 'TheoremReach',
        title: 'Tech Preferences',
        description: 'Tell us about your technology usage and preferences.',
        payout: 420,
        timeMinutes: 5,
        starRating: 4,
        tags: ['Fast', 'Tech'],
        iframeSupport: true,
        url: 'https://theoremreach.com',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'bitlabs-ent-1',
        provider: 'BitLabs',
        title: 'Entertainment Choices',
        description: 'Share your entertainment and media consumption habits.',
        payout: 1200,
        timeMinutes: 20,
        starRating: 3,
        isHot: true,
        tags: ['Entertainment'],
        iframeSupport: false,
        url: 'https://bitlabs.ai',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'pollfish-daily-1',
        provider: 'Pollfish',
        title: 'Daily Check-in Survey',
        description: 'Quick daily survey to earn bonus points.',
        payout: 150,
        timeMinutes: 2,
        starRating: 5,
        tags: ['Daily', 'Bonus'],
        iframeSupport: true,
        url: 'https://pollfish.com',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        externalId: 'cpx-auto-1',
        provider: 'CPX',
        title: 'Automotive Trends',
        description: 'Share your thoughts on cars and transportation.',
        payout: 600,
        timeMinutes: 15,
        starRating: 2,
        tags: ['Niche'],
        iframeSupport: false,
        url: 'https://www.cpx-research.com',
        active: true,
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
        const { userId, provider, page = '1', limit = '20' } = req.query

        const pageNum = parseInt(page as string) || 1
        const limitNum = Math.min(parseInt(limit as string) || 20, 50)

        // Fetch ALL surveys from Firestore (no compound queries to avoid index requirements)
        const snapshot = await db!.collection('surveys').get()

        let surveys: Survey[] = []

        if (snapshot.empty) {
            // Seed default surveys if database is empty
            console.log('No surveys found, seeding default surveys...')
            const batch = db!.batch()

            for (const survey of DEFAULT_SURVEYS) {
                const docRef = db!.collection('surveys').doc()
                batch.set(docRef, survey)
                surveys.push({ ...survey, id: docRef.id } as Survey)
            }

            await batch.commit()
            console.log('Seeded', surveys.length, 'default surveys')
        } else {
            snapshot.forEach(doc => {
                const data = doc.data()
                // Only include active surveys
                if (data.active === true) {
                    surveys.push({ id: doc.id, ...data } as Survey)
                }
            })
        }

        // Apply filters (client-side)
        if (provider) {
            surveys = surveys.filter(s => s.provider === provider)
        }

        // Sort by payout (client-side)
        surveys.sort((a, b) => (b.payout || 0) - (a.payout || 0))

        // Pagination
        const total = surveys.length
        const startIndex = (pageNum - 1) * limitNum
        const paginatedSurveys = surveys.slice(startIndex, startIndex + limitNum)

        return res.status(200).json({
            surveys: paginatedSurveys,
            total,
            page: pageNum,
            limit: limitNum,
        })
    } catch (error) {
        console.error('Error fetching surveys:', error)
        return res.status(500).json({ error: 'Failed to fetch surveys' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        // TODO: Add admin authentication check
        const survey = req.body as Omit<Survey, 'id'>

        if (!survey.title || !survey.provider || !survey.payout) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const now = Date.now()
        const newSurvey = {
            ...survey,
            active: survey.active ?? true,
            tags: survey.tags ?? [],
            createdAt: now,
            updatedAt: now,
        }

        const docRef = await db!.collection('surveys').add(newSurvey)

        return res.status(201).json({
            survey: { id: docRef.id, ...newSurvey },
        })
    } catch (error) {
        console.error('Error creating survey:', error)
        return res.status(500).json({ error: 'Failed to create survey' })
    }
}
