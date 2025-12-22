/**
 * Submit Social Proof API - User submits screenshot proof
 * 
 * POST - Submit a proof screenshot for a social follow mission
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

// Increase body size limit for base64 images
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId, missionId, screenshotData } = req.body

        if (!userId || !missionId || !screenshotData) {
            return res.status(400).json({
                error: 'userId, missionId, and screenshotData are required'
            })
        }

        // Check if mission exists and is active
        const missionDoc = await db.collection('social_missions').doc(missionId).get()
        if (!missionDoc.exists) {
            return res.status(404).json({ error: 'Mission not found' })
        }

        const missionData = missionDoc.data()
        if (!missionData?.active) {
            return res.status(400).json({ error: 'This mission is no longer active' })
        }

        // Check if user already submitted for this mission
        const existingProof = await db.collection('social_proofs')
            .where('userId', '==', userId)
            .where('missionId', '==', missionId)
            .limit(1)
            .get()

        if (!existingProof.empty) {
            const existingData = existingProof.docs[0].data()
            if (existingData.status === 'approved') {
                return res.status(400).json({ error: 'You have already completed this mission' })
            }
            if (existingData.status === 'pending') {
                return res.status(400).json({ error: 'Your proof is already pending review' })
            }
            // If rejected, allow resubmission - delete old proof
            await existingProof.docs[0].ref.delete()
        }

        // Create proof submission
        const proofData = {
            userId,
            missionId,
            screenshotUrl: screenshotData, // Base64 or URL
            status: 'pending',
            submittedAt: Date.now(),
            missionTitle: missionData.title,
            socialType: missionData.socialType,
            payout: missionData.payout,
        }

        const proofRef = await db.collection('social_proofs').add(proofData)

        return res.status(201).json({
            success: true,
            proofId: proofRef.id,
            message: 'Proof submitted! Awaiting admin review.',
        })
    } catch (error) {
        console.error('Error submitting social proof:', error)
        return res.status(500).json({ error: 'Failed to submit proof' })
    }
}
