/**
 * Survey Status API Endpoint
 * 
 * POST /api/surveys/status - Record survey completion status
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { SurveyCompletion } from '@/lib/db-schema'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId, surveyId, status, externalTransactionId } = req.body

        if (!userId || !surveyId || !status) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Fetch the survey
        const surveyDoc = await db.collection('surveys').doc(surveyId).get()

        if (!surveyDoc.exists) {
            return res.status(404).json({ error: 'Survey not found' })
        }

        const survey = surveyDoc.data()!

        // Check for existing completion
        const existingCompletion = await db
            .collection('survey_completions')
            .where('userId', '==', userId)
            .where('surveyId', '==', surveyId)
            .where('status', 'in', ['pending', 'verified'])
            .limit(1)
            .get()

        if (!existingCompletion.empty && status === 'completed') {
            // Already has a completion record
            return res.status(200).json({
                success: true,
                completionId: existingCompletion.docs[0].id,
                alreadyExists: true,
            })
        }

        if (status === 'completed') {
            // Create or update completion record
            const completion: Omit<SurveyCompletion, 'id'> = {
                surveyId,
                userId,
                provider: survey.provider,
                externalTransactionId,
                payout: survey.payout,
                status: 'pending',
                startedAt: Date.now(),
                completedAt: Date.now(),
            }

            const docRef = await db.collection('survey_completions').add(completion)

            return res.status(200).json({
                success: true,
                completionId: docRef.id,
                status: 'pending',
                estimatedCreditTime: '15 mins',
            })
        } else if (status === 'disqualified') {
            // Log disqualification for analytics
            await db.collection('survey_disqualifications').add({
                userId,
                surveyId,
                provider: survey.provider,
                timestamp: Date.now(),
            })

            return res.status(200).json({
                success: true,
                status: 'disqualified',
            })
        }

        return res.status(400).json({ error: 'Invalid status' })
    } catch (error) {
        console.error('Error updating survey status:', error)
        return res.status(500).json({ error: 'Failed to update status' })
    }
}

export default allowCors(handler)
