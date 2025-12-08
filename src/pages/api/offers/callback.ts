/**
 * Offer Callback API Endpoint
 * 
 * POST /api/offers/callback - Receive postback callbacks from offer providers
 * 
 * This endpoint receives callbacks from external offerwall providers
 * when a user completes an offer. Each provider has different callback formats.
 * 
 * Security: In production, implement signature verification for each provider.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { OfferProvider } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

// Provider-specific callback handlers
interface CallbackPayload {
    provider: OfferProvider
    trackingId: string
    userId: string
    offerId?: string
    transactionId: string
    payout: number
    status: 'completed' | 'reversed'
    signature?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        // Parse callback based on request method (some providers use GET)
        const rawPayload = req.method === 'GET' ? req.query : req.body

        // Determine provider from the endpoint or payload
        const provider = (rawPayload.provider || rawPayload.network || 'Other') as OfferProvider

        // Parse the callback into our standard format
        const payload = parseProviderCallback(provider, rawPayload)

        if (!payload) {
            console.error('Failed to parse callback:', rawPayload)
            return res.status(400).json({ error: 'Invalid callback format' })
        }

        // Validate callback signature (provider-specific)
        const isValid = await validateCallback(provider, rawPayload)
        if (!isValid) {
            console.error('Invalid callback signature:', provider)
            return res.status(403).json({ error: 'Invalid signature' })
        }

        // Find the completion record
        let completionQuery = db.collection('offer_completions')

        if (payload.trackingId) {
            // Use our tracking ID directly
            const completionDoc = await completionQuery.doc(payload.trackingId).get()

            if (!completionDoc.exists) {
                console.error('Completion not found:', payload.trackingId)
                return res.status(404).json({ error: 'Completion not found' })
            }

            await processCallback(completionDoc.id, completionDoc.data()!, payload)
        } else if (payload.userId && payload.offerId) {
            // Search by userId and offerId
            const snapshot = await completionQuery
                .where('userId', '==', payload.userId)
                .where('offerId', '==', payload.offerId)
                .where('status', '==', 'pending')
                .limit(1)
                .get()

            if (snapshot.empty) {
                console.error('Completion not found for user/offer:', payload.userId, payload.offerId)
                return res.status(404).json({ error: 'Completion not found' })
            }

            const doc = snapshot.docs[0]
            await processCallback(doc.id, doc.data(), payload)
        } else {
            return res.status(400).json({ error: 'Missing tracking information' })
        }

        // Return success to provider
        // Most providers expect a specific response format
        return res.status(200).json({ success: true, message: '1' })
    } catch (error) {
        console.error('Error processing callback:', error)
        return res.status(500).json({ error: 'Failed to process callback' })
    }
}

async function processCallback(
    completionId: string,
    existingData: any,
    payload: CallbackPayload
): Promise<void> {
    if (payload.status === 'completed') {
        // Update completion status
        await db!.collection('offer_completions').doc(completionId).update({
            status: 'credited',
            externalTransactionId: payload.transactionId,
            completedAt: Date.now(),
            creditedAt: Date.now(),
        })

        // Credit user's points
        const userId = existingData.userId
        const payout = payload.payout || existingData.payout

        // Update user's points
        const userRef = db!.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (userDoc.exists) {
            const currentPoints = userDoc.data()?.points || 0
            const totalEarnings = userDoc.data()?.totalEarnings || 0

            await userRef.update({
                points: currentPoints + payout,
                totalEarnings: totalEarnings + payout,
                updatedAt: Date.now(),
            })

            // Create transaction record
            await db!.collection('transactions').add({
                userId,
                type: 'credit',
                amount: payout,
                source: 'offerwall',
                sourceId: completionId,
                status: 'completed',
                metadata: {
                    provider: payload.provider,
                    externalTransactionId: payload.transactionId,
                    offerTitle: existingData.metadata?.offerTitle,
                },
                createdAt: Date.now(),
            })
        }

        console.log(`Credited ${payout} points to user ${userId} for offer completion ${completionId}`)
    } else if (payload.status === 'reversed') {
        // Handle chargeback/reversal
        await db!.collection('offer_completions').doc(completionId).update({
            status: 'reversed',
            updatedAt: Date.now(),
        })

        // Debit points if already credited
        if (existingData.status === 'credited') {
            const userId = existingData.userId
            const payout = existingData.payout

            const userRef = db!.collection('users').doc(userId)
            const userDoc = await userRef.get()

            if (userDoc.exists) {
                const currentPoints = userDoc.data()?.points || 0
                await userRef.update({
                    points: Math.max(0, currentPoints - payout),
                    updatedAt: Date.now(),
                })

                // Create reversal transaction
                await db!.collection('transactions').add({
                    userId,
                    type: 'debit',
                    amount: payout,
                    source: 'offerwall',
                    sourceId: completionId,
                    status: 'completed',
                    metadata: {
                        reason: 'reversal',
                        provider: payload.provider,
                    },
                    createdAt: Date.now(),
                })
            }
        }

        console.log(`Reversed offer completion ${completionId}`)
    }
}

function parseProviderCallback(provider: OfferProvider, rawPayload: any): CallbackPayload | null {
    try {
        // Each provider has different callback formats
        // This is a simplified example - in production, each provider needs specific handling

        switch (provider) {
            case 'AdGem':
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.tracking_id,
                    userId: rawPayload.player_id || rawPayload.uid,
                    offerId: rawPayload.offer_id,
                    transactionId: rawPayload.transaction_id,
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.amount) || 0,
                    status: rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.signature,
                }

            case 'Tapjoy':
                return {
                    provider,
                    trackingId: rawPayload.snuid, // Sender unique ID
                    userId: rawPayload.snuid,
                    transactionId: rawPayload.id,
                    payout: parseInt(rawPayload.currency) || 0,
                    status: 'completed',
                    signature: rawPayload.verifier,
                }

            case 'OfferToro':
                return {
                    provider,
                    trackingId: rawPayload.sub1,
                    userId: rawPayload.user_id,
                    offerId: rawPayload.offer_id,
                    transactionId: rawPayload.oid,
                    payout: parseInt(rawPayload.payout) || 0,
                    status: 'completed',
                    signature: rawPayload.sig,
                }

            case 'CPX':
            case 'TheoremReach':
            case 'BitLabs':
            case 'Pollfish':
                // Survey providers - generic format
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.request_uuid,
                    userId: rawPayload.uid || rawPayload.user_id,
                    transactionId: rawPayload.trans_id || rawPayload.transaction_id,
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || 0,
                    status: rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                }

            default:
                // Generic format
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.trackingId,
                    userId: rawPayload.uid || rawPayload.userId,
                    offerId: rawPayload.oid || rawPayload.offerId,
                    transactionId: rawPayload.transactionId || rawPayload.trans_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.amount) || 0,
                    status: rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.signature,
                }
        }
    } catch (error) {
        console.error('Error parsing callback:', error)
        return null
    }
}

async function validateCallback(provider: OfferProvider, rawPayload: any): Promise<boolean> {
    // In production, implement signature verification for each provider
    // Each provider uses different HMAC/hash schemes

    // For now, we'll do basic validation
    // TODO: Implement provider-specific signature verification

    // Example for a generic HMAC verification:
    // const expectedSignature = crypto
    //     .createHmac('sha256', process.env[`${provider.toUpperCase()}_SECRET`] || '')
    //     .update(JSON.stringify(rawPayload))
    //     .digest('hex')
    // return rawPayload.signature === expectedSignature

    // Temporarily return true for development
    // WARNING: Enable signature verification before production!
    console.warn('Callback signature validation is disabled - enable before production!')
    return true
}
