/**
 * Start Offer API Endpoint
 * 
 * POST /api/offers/start - Record offer start and return tracking URL
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { OfferCompletion } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { userId, offerId } = req.body

        if (!userId || !offerId) {
            return res.status(400).json({ error: 'Missing userId or offerId' })
        }

        // Fetch the offer
        const offerDoc = await db.collection('offers').doc(offerId).get()

        if (!offerDoc.exists) {
            return res.status(404).json({ error: 'Offer not found' })
        }

        const offer = offerDoc.data()!

        // Check if offer is active
        if (!offer.active) {
            return res.status(400).json({ error: 'Offer is no longer available' })
        }

        // Check if user already has a pending completion for this offer
        const existingCompletion = await db
            .collection('offer_completions')
            .where('userId', '==', userId)
            .where('offerId', '==', offerId)
            .where('status', 'in', ['pending', 'credited'])
            .limit(1)
            .get()

        if (!existingCompletion.empty) {
            // User already started or completed this offer
            const existingData = existingCompletion.docs[0].data()
            return res.status(200).json({
                success: true,
                trackingId: existingCompletion.docs[0].id,
                redirectUrl: offer.url,
                alreadyStarted: true,
                status: existingData.status,
            })
        }

        // Create offer completion record
        const completion: Omit<OfferCompletion, 'id'> = {
            offerId: offerId,
            userId,
            provider: offer.provider,
            payout: offer.payout,
            status: 'pending',
            startedAt: Date.now(),
            metadata: {
                offerTitle: offer.title,
                offerCategory: offer.category,
            },
        }

        const docRef = await db.collection('offer_completions').add(completion)

        // Generate tracking URL with our tracking ID
        // In production, this would include provider-specific tracking parameters
        const trackingId = docRef.id
        const trackingParams = new URLSearchParams({
            tid: trackingId,
            uid: userId,
            oid: offerId,
        })

        // Build redirect URL with tracking
        let redirectUrl = offer.url
        if (redirectUrl.includes('?')) {
            redirectUrl += '&' + trackingParams.toString()
        } else {
            redirectUrl += '?' + trackingParams.toString()
        }

        return res.status(200).json({
            success: true,
            trackingId,
            redirectUrl,
            alreadyStarted: false,
        })
    } catch (error) {
        console.error('Error starting offer:', error)
        return res.status(500).json({ error: 'Failed to start offer' })
    }
}
