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
import { addTournamentPoints } from '@/lib/tournament-helper'

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

            // Add tournament points (30 for offerwall completion)
            await addTournamentPoints(userId, 'offerwall')
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

            // ===========================================
            // AFRICA-FOCUSED PROVIDERS
            // ===========================================

            case 'Wannads':
                // Wannads callback format
                // Example: ?provider=Wannads&uid=USER_ID&tid=TRANS_ID&payout=100&oid=OFFER_ID&sig=SIGNATURE
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.transaction_id || rawPayload.trans_id,
                    userId: rawPayload.uid || rawPayload.user_id || rawPayload.subid,
                    offerId: rawPayload.oid || rawPayload.offer_id || rawPayload.campaign_id,
                    transactionId: rawPayload.tid || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || parseInt(rawPayload.points) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.status === 'chargeback' ? 'reversed' : 'completed',
                    signature: rawPayload.sig || rawPayload.signature || rawPayload.hash,
                }

            case 'Adgate':
                // Adgate Media callback format
                // Example: ?provider=Adgate&s1=USER_ID&points=100&tx_id=TRANS_ID&offer_id=123&signature=SIG
                return {
                    provider,
                    trackingId: rawPayload.tx_id || rawPayload.transaction_id || rawPayload.tid,
                    userId: rawPayload.s1 || rawPayload.user_id || rawPayload.uid || rawPayload.subid,
                    offerId: rawPayload.offer_id || rawPayload.oid,
                    transactionId: rawPayload.tx_id || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.points) || parseInt(rawPayload.payout) || parseInt(rawPayload.currency) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.type === 'chargeback' ? 'reversed' : 'completed',
                    signature: rawPayload.signature || rawPayload.sig || rawPayload.hash,
                }

            case 'Monlix':
                // Monlix callback format
                // Example: ?provider=Monlix&userid=USER_ID&transid=TRANS_ID&payout=100&hash=HASH
                return {
                    provider,
                    trackingId: rawPayload.transid || rawPayload.trans_id || rawPayload.tid || rawPayload.transaction_id,
                    userId: rawPayload.userid || rawPayload.user_id || rawPayload.uid || rawPayload.subid,
                    offerId: rawPayload.offerid || rawPayload.offer_id || rawPayload.survey_id,
                    transactionId: rawPayload.transid || rawPayload.trans_id || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || parseInt(rawPayload.points) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.status === 'chargeback' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature || rawPayload.sig,
                }

            case 'Timewall':
                // Timewall callback format
                // Website: https://timewall.io
                //
                // Parameters:
                // - userID: Your user's unique identifier
                // - transactionID: Unique ID for the transaction
                // - revenue: Payout amount for the offer
                // - currencyAmount: Monetary value of conversion
                // - hash: Security hash for validation
                // - type: 'credit' (success) or 'chargeback' (reversal)
                //
                // Response: Must return HTTP 200 OK
                //
                // Example postback URL to set in Timewall dashboard:
                // https://your-domain.com/api/offers/callback?provider=Timewall&uid={userID}&trans_id={transactionID}&amount={revenue}&currency_amount={currencyAmount}&type={type}&hash={hash}
                return {
                    provider,
                    trackingId: rawPayload.trans_id || rawPayload.transactionID || rawPayload.transaction_id,
                    userId: rawPayload.uid || rawPayload.userID || rawPayload.user_id,
                    transactionId: rawPayload.trans_id || rawPayload.transactionID || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.amount) || parseInt(rawPayload.revenue) || parseInt(rawPayload.currencyAmount) || parseInt(rawPayload.currency_amount) || 0,
                    // Timewall type: 'credit' = success, 'chargeback' = reversal
                    status: rawPayload.type === 'chargeback' || rawPayload.type === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                }

            case 'Kiwiwall':
                // Kiwiwall callback format
                // Documentation: https://kiwiwall.com/publishers/postback-integration
                // 
                // Parameters:
                // - status: 1 = success, 2 = reversal/chargeback
                // - trans_id: Unique transaction ID from Kiwiwall
                // - sub_id: Your user ID (passed when opening the offerwall)
                // - sub_id_2 to sub_id_5: Additional tracking parameters (optional)
                // - amount: Points/payout amount
                // - gross: Gross payout in dollars (optional)
                // - offer_id: Kiwiwall's offer ID
                // - offer_name: Name of the offer completed
                // - category: Offer category (Offer, Mobile, CC, Video)
                // - os: Operating system (android/ios)
                // - ip_address: User's IP address
                // - signature: MD5(sub_id:amount:secret_key)
                //
                // IP Whitelist: 34.193.235.172
                //
                // Example postback URL to set in Kiwiwall dashboard:
                // https://your-domain.com/api/offers/callback?provider=Kiwiwall&status={status}&trans_id={trans_id}&sub_id={sub_id}&amount={amount}&offer_id={offer_id}&offer_name={offer_name}&signature={signature}&ip_address={ip_address}
                return {
                    provider,
                    trackingId: rawPayload.trans_id || rawPayload.transid || rawPayload.tid,
                    userId: rawPayload.sub_id || rawPayload.subid || rawPayload.uid || rawPayload.user_id,
                    offerId: rawPayload.offer_id || rawPayload.offerid,
                    transactionId: rawPayload.trans_id || rawPayload.transid || Date.now().toString(),
                    payout: parseInt(rawPayload.amount) || parseInt(rawPayload.payout) || parseInt(rawPayload.points) || 0,
                    // Kiwiwall status: 1 = success, 2 = reversal
                    status: rawPayload.status === '2' || rawPayload.status === 2 || rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.signature || rawPayload.sig,
                }

            case 'CPX':
                // CPX Research callback format
                // Documentation: https://publisher.cpx-research.com/
                //
                // Parameters:
                // - {user_id} or {ext_user_id}: Your user's ID
                // - {trans_id}: Unique transaction ID
                // - {amount_local}: Payout in your currency
                // - {status}: 1 = completed/pending, 2 = reversed/cancelled
                // - {hash}: MD5(ext_user_id + "-" + secure_hash)
                //
                // Example postback URL to set in CPX dashboard:
                // https://your-domain.com/api/offers/callback?provider=CPX&uid={user_id}&trans_id={trans_id}&amount={amount_local}&status={status}&hash={hash}
                return {
                    provider,
                    trackingId: rawPayload.trans_id || rawPayload.transaction_id || rawPayload.tid,
                    userId: rawPayload.uid || rawPayload.user_id || rawPayload.ext_user_id,
                    transactionId: rawPayload.trans_id || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.amount) || parseInt(rawPayload.amount_local) || parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || 0,
                    // CPX status: 1 = completed/pending, 2 = reversed
                    status: rawPayload.status === '2' || rawPayload.status === 2 || rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                }

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
                    status: rawPayload.status === 'reversed' || rawPayload.status === '2' || rawPayload.status === 2 ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                }

            default:
                // Generic format
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.trackingId,
                    userId: rawPayload.uid || rawPayload.userId || rawPayload.user_id || rawPayload.s1 || rawPayload.subid,
                    offerId: rawPayload.oid || rawPayload.offerId || rawPayload.offer_id,
                    transactionId: rawPayload.transactionId || rawPayload.trans_id || rawPayload.tx_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.points) || parseInt(rawPayload.amount) || 0,
                    status: rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.signature || rawPayload.sig || rawPayload.hash,
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
