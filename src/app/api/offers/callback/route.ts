
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { OfferProvider } from '@/lib/db-schema';
import { addTournamentPoints } from '@/lib/tournament-helper';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
    return handleRequest(req);
}

export async function POST(req: NextRequest) {
    return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    try {
        let rawPayload: Record<string, any> = {};

        // 1. Always check URL Search Params (works for GET and POST with query params)
        req.nextUrl.searchParams.forEach((value, key) => {
            rawPayload[key] = value;
        });

        // 2. If POST, try to parse Body
        if (req.method === 'POST') {
            const contentType = req.headers.get('content-type') || '';

            try {
                if (contentType.includes('application/json')) {
                    const body = await req.json();
                    rawPayload = { ...rawPayload, ...body };
                } else if (contentType.includes('application/x-www-form-urlencoded')) {
                    const formData = await req.formData();
                    formData.forEach((value, key) => {
                        rawPayload[key] = value.toString();
                    });
                }
            } catch (e) {
                // Ignore body parsing errors, relying on searchParams if body fails or is empty
            }
        }

        // Determine provider
        const provider = (rawPayload.provider || rawPayload.network || 'Other') as OfferProvider;

        // Parse callback
        const payload = parseProviderCallback(provider, rawPayload);

        if (!payload) {
            console.error('Failed to parse callback:', rawPayload);
            return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 });
        }

        // Validate signature
        const isValid = await validateCallback(provider, rawPayload);
        if (!isValid) {
            console.error('Invalid callback signature:', provider);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Logic to update DB
        const completionQuery = db.collection('offer_completions');

        if (payload.trackingId) {
            const completionDoc = await completionQuery.doc(payload.trackingId).get();

            if (!completionDoc.exists) {
                const AUTO_CREATE_PROVIDERS: OfferProvider[] = ['Kiwiwall', 'Timewall', 'AdGem', 'Wannads', 'Adgate', 'Monlix', 'OfferToro'];

                if (AUTO_CREATE_PROVIDERS.includes(provider)) {
                    console.log(`Creating new completion record for ${provider} offer ${payload.offerId}`);

                    const newCompletion = {
                        id: payload.trackingId,
                        offerId: payload.offerId || 'external_offer',
                        userId: payload.userId,
                        provider: provider,
                        externalTransactionId: payload.transactionId,
                        payout: payload.payout,
                        status: 'pending',
                        startedAt: Date.now(),
                        metadata: {
                            createdFromCallback: true,
                            ...rawPayload
                        }
                    };

                    await completionQuery.doc(payload.trackingId).set(newCompletion);
                    await processCallbackLogic(payload.trackingId, newCompletion, payload);

                    // Kiwiwall explicitly requires the response body to be just "1"
                    if (provider === 'Kiwiwall') {
                        return new NextResponse('1', { status: 200, headers: { 'Content-Type': 'text/plain' } });
                    }
                    return NextResponse.json({ success: true, message: '1' }, { status: 200 });
                } else {
                    console.error('Completion not found:', payload.trackingId);
                    return NextResponse.json({ error: 'Completion not found' }, { status: 404 });
                }
            }

            // Exists
            await processCallbackLogic(completionDoc.id, completionDoc.data(), payload);
        } else if (payload.userId && payload.offerId) {
            // Search by user + offer
            const snapshot = await completionQuery
                .where('userId', '==', payload.userId)
                .where('offerId', '==', payload.offerId)
                .where('status', '==', 'pending')
                .limit(1)
                .get();

            if (snapshot.empty) {
                console.error('Completion not found for user/offer:', payload.userId, payload.offerId);
                return NextResponse.json({ error: 'Completion not found' }, { status: 404 });
            }

            const doc = snapshot.docs[0];
            await processCallbackLogic(doc.id, doc.data(), payload);
        } else {
            return NextResponse.json({ error: 'Missing tracking information' }, { status: 400 });
        }

        if (provider === 'Kiwiwall') {
            return new NextResponse('1', { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }
        return NextResponse.json({ success: true, message: '1' }, { status: 200 });

    } catch (error) {
        console.error('Error processing callback:', error);
        return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
    }
}

// Reuse the process logic
async function processCallbackLogic(completionId: string, existingData: any, payload: CallbackPayload): Promise<void> {
    if (payload.status === 'completed') {
        await db!.collection('offer_completions').doc(completionId).update({
            status: 'credited',
            externalTransactionId: payload.transactionId,
            completedAt: Date.now(),
            creditedAt: Date.now(),
        });

        const userId = existingData.userId;
        const payout = payload.payout || existingData.payout;

        const userRef = db!.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const currentPoints = userDoc.data()?.points || 0;
            const totalEarnings = userDoc.data()?.totalEarnings || 0;

            const SURVEY_PROVIDERS = ['CPX', 'TheoremReach', 'BitLabs', 'Pollfish'];
            const source = SURVEY_PROVIDERS.includes(payload.provider) ? 'survey' : 'offerwall';

            await userRef.update({
                points: currentPoints + payout,
                totalEarnings: totalEarnings + payout,
                updatedAt: Date.now(),
            });

            await db!.collection('transactions').add({
                userId,
                type: 'credit',
                amount: payout,
                source: source,
                sourceId: completionId,
                status: 'completed',
                metadata: {
                    provider: payload.provider,
                    externalTransactionId: payload.transactionId,
                    offerTitle: existingData.metadata?.offerTitle || existingData.metadata?.offer_name || 'Unknown Offer',
                },
                createdAt: Date.now(),
            });

            await addTournamentPoints(userId, 'offerwall');
        }
        console.log(`Credited ${payout} points to user ${userId} for offer completion ${completionId}`);

    } else if (payload.status === 'reversed') {
        await db!.collection('offer_completions').doc(completionId).update({
            status: 'reversed',
            updatedAt: Date.now(),
        });

        if (existingData.status === 'credited') {
            const userId = existingData.userId;
            const payout = existingData.payout;
            const userRef = db!.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const currentPoints = userDoc.data()?.points || 0;
                await userRef.update({
                    points: Math.max(0, currentPoints - payout),
                    updatedAt: Date.now(),
                });

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
                });
            }
        }
        console.log(`Reversed offer completion ${completionId}`);
    }
}

// Helpers
function parseProviderCallback(provider: OfferProvider, rawPayload: any): CallbackPayload | null {
    try {
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
                };
            case 'Tapjoy':
                return {
                    provider,
                    trackingId: rawPayload.snuid,
                    userId: rawPayload.snuid,
                    transactionId: rawPayload.id,
                    payout: parseInt(rawPayload.currency) || 0,
                    status: 'completed',
                    signature: rawPayload.verifier,
                };
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
                };
            case 'Wannads':
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.transaction_id || rawPayload.trans_id,
                    userId: rawPayload.uid || rawPayload.user_id || rawPayload.subid,
                    offerId: rawPayload.oid || rawPayload.offer_id || rawPayload.campaign_id,
                    transactionId: rawPayload.tid || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || parseInt(rawPayload.points) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.status === 'chargeback' ? 'reversed' : 'completed',
                    signature: rawPayload.sig || rawPayload.signature || rawPayload.hash,
                };
            case 'Adgate':
                return {
                    provider,
                    trackingId: rawPayload.tx_id || rawPayload.transaction_id || rawPayload.tid,
                    userId: rawPayload.s1 || rawPayload.user_id || rawPayload.uid || rawPayload.subid,
                    offerId: rawPayload.offer_id || rawPayload.oid,
                    transactionId: rawPayload.tx_id || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.points) || parseInt(rawPayload.payout) || parseInt(rawPayload.currency) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.type === 'chargeback' ? 'reversed' : 'completed',
                    signature: rawPayload.signature || rawPayload.sig || rawPayload.hash,
                };
            case 'Monlix':
                return {
                    provider,
                    trackingId: rawPayload.transid || rawPayload.trans_id || rawPayload.tid || rawPayload.transaction_id,
                    userId: rawPayload.userid || rawPayload.user_id || rawPayload.uid || rawPayload.subid,
                    offerId: rawPayload.offerid || rawPayload.offer_id || rawPayload.survey_id,
                    transactionId: rawPayload.transid || rawPayload.trans_id || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || parseInt(rawPayload.points) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.status === 'chargeback' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature || rawPayload.sig,
                };
            case 'Timewall':
                return {
                    provider,
                    trackingId: rawPayload.trans_id || rawPayload.transactionID || rawPayload.transaction_id,
                    userId: rawPayload.uid || rawPayload.userID || rawPayload.user_id,
                    transactionId: rawPayload.trans_id || rawPayload.transactionID || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.amount) || parseInt(rawPayload.revenue) || parseInt(rawPayload.currencyAmount) || parseInt(rawPayload.currency_amount) || 0,
                    status: rawPayload.type === 'chargeback' || rawPayload.type === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                };
            case 'Kiwiwall':
                return {
                    provider,
                    trackingId: rawPayload.trans_id || rawPayload.transid || rawPayload.tid,
                    userId: rawPayload.sub_id || rawPayload.subid || rawPayload.uid || rawPayload.user_id,
                    offerId: rawPayload.offer_id || rawPayload.offerid,
                    transactionId: rawPayload.trans_id || rawPayload.transid || Date.now().toString(),
                    payout: parseInt(rawPayload.amount) || parseInt(rawPayload.payout) || parseInt(rawPayload.points) || 0,
                    status: rawPayload.status === '2' || rawPayload.status === 2 || rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.signature || rawPayload.sig,
                };
            case 'CPX':
                return {
                    provider,
                    trackingId: rawPayload.trans_id || rawPayload.transaction_id || rawPayload.tid,
                    userId: rawPayload.uid || rawPayload.user_id || rawPayload.ext_user_id,
                    transactionId: rawPayload.trans_id || rawPayload.transaction_id || Date.now().toString(),
                    payout: parseInt(rawPayload.amount) || parseInt(rawPayload.amount_local) || parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || 0,
                    status: rawPayload.status === '2' || rawPayload.status === 2 || rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                };
            case 'TheoremReach':
            case 'BitLabs':
            case 'Pollfish':
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.request_uuid,
                    userId: rawPayload.uid || rawPayload.user_id,
                    transactionId: rawPayload.trans_id || rawPayload.transaction_id,
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.reward) || 0,
                    status: rawPayload.status === 'reversed' || rawPayload.status === '2' || rawPayload.status === 2 ? 'reversed' : 'completed',
                    signature: rawPayload.hash || rawPayload.signature,
                };
            default:
                return {
                    provider,
                    trackingId: rawPayload.tid || rawPayload.trackingId,
                    userId: rawPayload.uid || rawPayload.userId || rawPayload.user_id || rawPayload.s1 || rawPayload.subid,
                    offerId: rawPayload.oid || rawPayload.offerId || rawPayload.offer_id,
                    transactionId: rawPayload.transactionId || rawPayload.trans_id || rawPayload.tx_id || Date.now().toString(),
                    payout: parseInt(rawPayload.payout) || parseInt(rawPayload.points) || parseInt(rawPayload.amount) || 0,
                    status: rawPayload.status === 'reversed' ? 'reversed' : 'completed',
                    signature: rawPayload.signature || rawPayload.sig || rawPayload.hash,
                };
        }
    } catch (error) {
        console.error('Error parsing callback:', error);
        return null;
    }
}

async function validateCallback(provider: OfferProvider, rawPayload: any): Promise<boolean> {
    const isDev = process.env.NODE_ENV === 'development';
    try {
        if (provider === 'Kiwiwall') {
            const subId = rawPayload.sub_id || rawPayload.subid || rawPayload.uid || rawPayload.user_id;
            const amount = rawPayload.amount || rawPayload.payout || rawPayload.points;
            const signature = rawPayload.signature || rawPayload.sig;
            const secret = process.env.KIWIWALL_SECRET_KEY || process.env.KIWIWALL_SECRET;

            if (!secret) {
                console.warn('[Security] KIWIWALL_SECRET not set, skipping validation');
                return isDev;
            }

            const toHash = `${subId}:${amount}:${secret}`;
            const expectedSig = crypto.createHash('md5').update(toHash).digest('hex');
            return signature === expectedSig;
        }

        if (provider === 'Timewall') {
            if (!rawPayload.hash && !rawPayload.signature) return false;
            return true;
        }

        if (!rawPayload.signature && !rawPayload.hash && !rawPayload.sig) {
            console.warn(`[Security] Missing signature for ${provider}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Validation error:', e);
        return false;
    }
}
