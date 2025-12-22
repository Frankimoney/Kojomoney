/**
 * Social Proofs API - Admin review of social follow proof screenshots
 * 
 * GET - Fetch pending social proofs for review
 * POST - Approve or reject a submission
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    switch (req.method) {
        case 'GET':
            return handleGetProofs(req, res)
        case 'POST':
            return handleReviewProof(req, res)
        default:
            return res.status(405).json({ error: 'Method not allowed' })
    }
}

// Get all pending social proofs for admin review
async function handleGetProofs(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { status = 'pending' } = req.query

        let query = db!.collection('social_proofs')
            .orderBy('submittedAt', 'desc')
            .limit(50)

        if (status !== 'all') {
            query = query.where('status', '==', status)
        }

        const snapshot = await query.get()

        const proofs = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data()

                // Fetch user info
                let userName = 'Unknown User'
                let userEmail = ''
                if (data.userId) {
                    const userDoc = await db!.collection('users').doc(data.userId).get()
                    if (userDoc.exists) {
                        const userData = userDoc.data()
                        userName = userData?.name || userData?.email || 'Unknown'
                        userEmail = userData?.email || ''
                    }
                }

                // Fetch mission info
                let missionTitle = 'Unknown Mission'
                let socialType = 'unknown'
                if (data.missionId) {
                    const missionDoc = await db!.collection('social_missions').doc(data.missionId).get()
                    if (missionDoc.exists) {
                        const missionData = missionDoc.data()
                        missionTitle = missionData?.title || 'Unknown'
                        socialType = missionData?.socialType || 'unknown'
                    }
                }

                return {
                    id: doc.id,
                    ...data,
                    userName,
                    userEmail,
                    missionTitle,
                    socialType,
                }
            })
        )

        return res.status(200).json({ proofs })
    } catch (error) {
        console.error('Error fetching social proofs:', error)
        return res.status(500).json({ error: 'Failed to fetch proofs' })
    }
}

// Approve or reject a social proof
async function handleReviewProof(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { proofId, action, adminId } = req.body

        if (!proofId || !action) {
            return res.status(400).json({ error: 'proofId and action are required' })
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'action must be approve or reject' })
        }

        const proofRef = db!.collection('social_proofs').doc(proofId)
        const proofDoc = await proofRef.get()

        if (!proofDoc.exists) {
            return res.status(404).json({ error: 'Proof not found' })
        }

        const proofData = proofDoc.data()!

        if (proofData.status !== 'pending') {
            return res.status(400).json({ error: 'This proof has already been reviewed' })
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected'

        // Update proof status
        await proofRef.update({
            status: newStatus,
            reviewedAt: Date.now(),
            reviewedBy: adminId || 'admin',
        })

        // If approved, credit points to user
        if (action === 'approve' && proofData.userId && proofData.missionId) {
            // Get mission payout
            const missionDoc = await db!.collection('social_missions').doc(proofData.missionId).get()
            const payout = missionDoc.exists ? (missionDoc.data()?.payout || 100) : 100

            // Update user points
            const userRef = db!.collection('users').doc(proofData.userId)
            await userRef.update({
                totalPoints: FieldValue.increment(payout),
                missionPoints: FieldValue.increment(payout),
            })

            // Log the earning
            await db!.collection('earnings').add({
                odId: proofData.userId,
                source: 'social_follow',
                missionId: proofData.missionId,
                points: payout,
                createdAt: Date.now(),
            })

            return res.status(200).json({
                success: true,
                message: `Approved! ${payout} points credited to user.`,
                pointsCredited: payout,
            })
        }

        return res.status(200).json({
            success: true,
            message: action === 'approve' ? 'Proof approved' : 'Proof rejected',
        })
    } catch (error) {
        console.error('Error reviewing proof:', error)
        return res.status(500).json({ error: 'Failed to review proof' })
    }
}

export default requireAdmin(handler)
