/**
 * Mission Progress API Endpoint
 * 
 * POST /api/missions/progress - Update mission progress for a user
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { MissionProgress } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId, missionId, action, stepId, proofUrl } = req.body

        if (!userId || !missionId || !action) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Fetch the mission
        const missionDoc = await db.collection('missions').doc(missionId).get()

        if (!missionDoc.exists) {
            return res.status(404).json({ error: 'Mission not found' })
        }

        const mission = missionDoc.data()!

        // Check for existing progress
        const progressQuery = await db
            .collection('mission_progress')
            .where('userId', '==', userId)
            .where('missionId', '==', missionId)
            .limit(1)
            .get()

        let progressDoc: FirebaseFirestore.DocumentReference
        let currentProgress: Partial<MissionProgress>

        if (progressQuery.empty) {
            // Create new progress record
            currentProgress = {
                missionId,
                userId,
                status: 'in_progress',
                completedSteps: [],
                startedAt: Date.now(),
            }
            progressDoc = db.collection('mission_progress').doc()
            await progressDoc.set(currentProgress)
        } else {
            progressDoc = progressQuery.docs[0].ref
            currentProgress = progressQuery.docs[0].data() as MissionProgress
        }

        // Handle different actions
        switch (action) {
            case 'start':
                await progressDoc.update({
                    status: 'in_progress',
                    startedAt: Date.now(),
                })
                break

            case 'complete_step':
                if (!stepId) {
                    return res.status(400).json({ error: 'Missing stepId' })
                }

                const completedSteps = currentProgress.completedSteps || []
                if (!completedSteps.includes(stepId)) {
                    completedSteps.push(stepId)
                }

                await progressDoc.update({
                    completedSteps,
                    updatedAt: Date.now(),
                })
                break

            case 'submit_proof':
                if (!proofUrl) {
                    return res.status(400).json({ error: 'Missing proofUrl' })
                }

                const proofUrls = currentProgress.proofUrls || []
                proofUrls.push(proofUrl)

                await progressDoc.update({
                    proofUrls,
                    status: 'reviewing',
                    updatedAt: Date.now(),
                })
                break

            case 'complete':
                // Mark mission as completed and credit points
                await progressDoc.update({
                    status: 'completed',
                    completedAt: Date.now(),
                    creditedAt: Date.now(),
                })

                // Credit user's points
                const userRef = db.collection('users').doc(userId)
                const userDoc = await userRef.get()

                if (userDoc.exists) {
                    const currentPoints = userDoc.data()?.points || 0
                    const totalEarnings = userDoc.data()?.totalEarnings || 0

                    await userRef.update({
                        points: currentPoints + mission.payout,
                        totalEarnings: totalEarnings + mission.payout,
                        updatedAt: Date.now(),
                    })

                    // Create transaction record
                    await db.collection('transactions').add({
                        userId,
                        type: 'credit',
                        amount: mission.payout,
                        source: 'mission',
                        sourceId: missionId,
                        status: 'completed',
                        metadata: {
                            missionTitle: mission.title,
                            missionType: mission.type,
                        },
                        createdAt: Date.now(),
                    })

                    // Dispatch points earned event for client-side handling
                    return res.status(200).json({
                        success: true,
                        status: 'completed',
                        pointsEarned: mission.payout,
                        newBalance: currentPoints + mission.payout,
                    })
                }
                break

            default:
                return res.status(400).json({ error: 'Invalid action' })
        }

        // Fetch updated progress
        const updatedProgress = await progressDoc.get()

        return res.status(200).json({
            success: true,
            progress: { id: progressDoc.id, ...updatedProgress.data() },
        })
    } catch (error) {
        console.error('Error updating mission progress:', error)
        return res.status(500).json({ error: 'Failed to update progress' })
    }
}
