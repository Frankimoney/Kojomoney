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
        const isAdmin = userIdStr === 'admin'

        // Fetch ALL missions from Firestore
        const snapshot = await db!.collection('missions').get()

        let missions: Mission[] = []

        // No seeding - admin must manually add missions
        snapshot.forEach(doc => {
            const data = doc.data()
            // Admin sees ALL missions, users only see active ones
            if (isAdmin || data.active === true) {
                missions.push({ id: doc.id, ...data } as Mission)
            }
        })

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
        const missionsWithProgress = await Promise.all(missions.map(async (mission) => {
            const progress = missionProgress[mission.id]

            // Special handling for referral missions - sync with actual referral data
            if (mission.type === 'referral' && userIdStr) {
                const referralsSnapshot = await db!.collection('referrals')
                    .where('referrerId', '==', userIdStr)
                    .get()

                const referralCount = referralsSnapshot.size

                // Auto-complete steps based on actual referral count
                const completedSteps: string[] = ['s1'] // Always mark "share link" as done
                if (referralCount >= 1) completedSteps.push('s2')
                if (referralCount >= 2) completedSteps.push('s3')
                if (referralCount >= 3) completedSteps.push('s4')

                // Determine status
                let status: 'available' | 'in_progress' | 'completed' = 'available'
                if (referralCount >= 3) {
                    status = 'completed'
                    // Auto-credit points if not already credited
                    if (!progress || progress.status !== 'completed') {
                        const existingProgress = await db!.collection('mission_progress')
                            .where('userId', '==', userIdStr)
                            .where('missionId', '==', mission.id)
                            .where('status', '==', 'completed')
                            .limit(1)
                            .get()

                        if (existingProgress.empty) {
                            // Credit points for completing referral mission
                            await db!.collection('mission_progress').add({
                                userId: userIdStr,
                                missionId: mission.id,
                                status: 'completed',
                                completedSteps,
                                startedAt: Date.now(),
                                completedAt: Date.now(),
                            })

                            // Add points to user
                            const userRef = db!.collection('users').doc(userIdStr)
                            const { FieldValue } = await import('firebase-admin/firestore')
                            await userRef.update({
                                totalPoints: FieldValue.increment(mission.payout),
                                referralPoints: FieldValue.increment(mission.payout),
                            })
                        }
                    }
                } else if (referralCount > 0) {
                    status = 'in_progress'
                }

                return {
                    ...mission,
                    userProgress: progress || null,
                    status,
                    completedSteps,
                    referralCount, // Expose for UI
                }
            }

            return {
                ...mission,
                userProgress: progress || null,
                status: progress?.status || 'available',
                completedSteps: progress?.completedSteps || [],
            }
        }))

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
