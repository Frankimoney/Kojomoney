/**
 * Missions API Endpoint
 * 
 * GET /api/missions - Fetch available missions for a user
 * POST /api/missions - Create new mission (admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { Mission, MissionProgress } from '@/lib/db-schema'
import { verifyAdminToken } from '@/lib/admin-auth'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

// Default missions to seed the database if empty
const DEFAULT_MISSIONS: Omit<Mission, 'id'>[] = [
    {
        title: 'Follow us on Twitter',
        description: 'Follow our official account and retweet the pinned post.',
        payout: 200,
        type: 'social',
        difficulty: 'Easy',
        affiliateUrl: 'https://twitter.com/KojoMoneyApp', // Your social link
        steps: [
            { id: 's1', instruction: 'Open Twitter/X app', order: 1 },
            { id: 's2', instruction: 'Follow @KojoMoneyApp', order: 2 },
            { id: 's3', instruction: 'Retweet pinned post', order: 3 },
            { id: 's4', instruction: 'Take a screenshot of your profile following us', order: 4 },
        ],
        proofRequired: true,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        title: 'Post a Trustpilot Review',
        description: 'Share your honest experience with KojoMoney.',
        payout: 1000,
        type: 'review',
        difficulty: 'Medium',
        affiliateUrl: 'https://trustpilot.com/review/kojomoney.com', // Your Trustpilot page
        expiresAt: Date.now() + 48 * 60 * 60 * 1000, // 48 hours from now
        steps: [
            { id: 's1', instruction: 'Go to Trustpilot page', order: 1 },
            { id: 's2', instruction: 'Write a review (min 20 words)', order: 2 },
            { id: 's3', instruction: 'Wait for review to be published', order: 3 },
            { id: 's4', instruction: 'Upload screenshot of published review', order: 4 },
        ],
        proofRequired: true,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        title: 'Invite 3 Friends',
        description: 'Get 3 friends to sign up using your referral code.',
        payout: 1500,
        type: 'referral',
        difficulty: 'Hard',
        // No affiliate URL - uses in-app referral system
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        steps: [
            { id: 's1', instruction: 'Share your referral link', order: 1 },
            { id: 's2', instruction: 'Friend 1 signs up', order: 2 },
            { id: 's3', instruction: 'Friend 2 signs up', order: 3 },
            { id: 's4', instruction: 'Friend 3 signs up', order: 4 },
        ],
        proofRequired: false, // Auto-tracked
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        title: 'Join Telegram Channel',
        description: 'Join our community for daily codes and updates.',
        payout: 300,
        type: 'social',
        difficulty: 'Easy',
        affiliateUrl: 'https://t.me/KojoMoneyCommunity', // Your Telegram link
        steps: [
            { id: 's1', instruction: 'Open Telegram', order: 1 },
            { id: 's2', instruction: 'Join channel', order: 2 },
            { id: 's3', instruction: 'Upload proof', order: 3 },
        ],
        proofRequired: true,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

export default allowCors(handler)

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId, type, status } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        // Fetch ALL missions from Firestore (no compound queries to avoid index requirements)
        const snapshot = await db!.collection('missions').get()

        let missions: Mission[] = []

        if (snapshot.empty) {
            // Seed default missions if database is empty
            console.log('No missions found, seeding default missions...')
            const batch = db!.batch()

            for (const mission of DEFAULT_MISSIONS) {
                const docRef = db!.collection('missions').doc()
                batch.set(docRef, mission)
                missions.push({ ...mission, id: docRef.id } as Mission)
            }

            await batch.commit()
            console.log('Seeded', missions.length, 'default missions')
        } else {
            snapshot.forEach(doc => {
                const data = doc.data()
                // Only include active missions
                if (data.active === true) {
                    missions.push({ id: doc.id, ...data } as Mission)
                }
            })
        }

        // Apply type filter (client-side)
        if (type) {
            missions = missions.filter(m => m.type === type)
        }

        // If userId provided, fetch user's progress for each mission
        let missionProgress: Record<string, MissionProgress> = {}

        if (userIdStr) {
            const progressSnapshot = await db!
                .collection('mission_progress')
                .where('userId', '==', userIdStr)
                .get()

            progressSnapshot.forEach(doc => {
                const data = doc.data() as MissionProgress
                missionProgress[data.missionId] = { ...data, id: doc.id }
            })
        }

        // Combine mission data with user progress
        const missionsWithProgress = missions.map(mission => {
            const progress = missionProgress[mission.id]
            return {
                ...mission,
                userProgress: progress || null,
                status: progress?.status || 'available',
                completedSteps: progress?.completedSteps || [],
            }
        })

        // Filter by status if provided
        let filteredMissions = missionsWithProgress
        if (status) {
            filteredMissions = missionsWithProgress.filter(m => m.status === status)
        }

        return res.status(200).json({
            missions: filteredMissions,
            total: filteredMissions.length,
        })
    } catch (error) {
        console.error('Error fetching missions:', error)
        return res.status(500).json({ error: 'Failed to fetch missions' })
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

        const mission = req.body as Omit<Mission, 'id'>

        if (!mission.title || !mission.payout || !mission.type) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const now = Date.now()
        const newMission = {
            ...mission,
            active: mission.active ?? true,
            steps: mission.steps || [],
            createdAt: now,
            updatedAt: now,
        }

        const docRef = await db!.collection('missions').add(newMission)

        return res.status(201).json({
            mission: { id: docRef.id, ...newMission },
        })
    } catch (error) {
        console.error('Error creating mission:', error)
        return res.status(500).json({ error: 'Failed to create mission' })
    }
}
