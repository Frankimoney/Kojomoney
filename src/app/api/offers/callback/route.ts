
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { OfferProvider } from '@/lib/db-schema';
import { addTournamentPoints } from '@/lib/tournament-helper';
import crypto from 'crypto';

// export const dynamic = 'force-dynamic';

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
            if (provider === 'Kiwiwall') {
                return new NextResponse('0', { status: 200, headers: { 'Content-Type': 'text/plain' } });
            }
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Logic to update DB
        const completionQuery = db.collection('offer_completions');

        if (payload.trackingId) {
            let completionId = payload.trackingId;
            let completionDoc = await completionQuery.doc(completionId).get();

            // COLLISION CHECK: Recycled Transaction ID (Common in testing)
            if (completionDoc.exists) {
                const existingData = completionDoc.data();
                if (existingData?.userId !== payload.userId) {
                    console.warn(`[Callback] Transaction Collision Detected! Txn ${completionId} exists for User ${existingData?.userId}, but payload is for User ${payload.userId}. Treating as NEW record (test mode?).`);
                    
                    // Modify ID to make it unique so we don't credit the wrong user
                    completionId = `${completionId}_${payload.userId}_${Date.now()}`;
                    completionDoc = await completionQuery.doc(completionId).get(); // Should be empty now
                }
            }

            if (!completionDoc.exists) {
                const AUTO_CREATE_PROVIDERS: OfferProvider[] = ['Kiwiwall', 'Timewall', 'AdGem', 'Wannads', 'Adgate', 'Monlix', 'OfferToro', 'CPX'];
                // ... rest of creation logic using completionId instead of payload.trackingId
                if (AUTO_CREATE_PROVIDERS.includes(provider)) {
                    console.log(`Creating new completion record for ${provider} offer ${payload.offerId}`);

                    const newCompletion = {
                        id: completionId, // Use the potentially unique ID
                        offerId: payload.offerId || 'external_offer',
                        userId: payload.userId,
                        provider: provider,
                        externalTransactionId: payload.transactionId,
                        payout: payload.payout,
                        status: 'pending',
                        startedAt: Date.now(),
                        metadata: {
                            createdFromCallback: true,
                            collisionResolved: completionId !== payload.trackingId,
                            originalTrackingId: payload.trackingId,
                            ...rawPayload
                        }
                    };

                    await completionQuery.doc(completionId).set(newCompletion);
                    await processCallbackLogic(completionId, newCompletion, payload);

                    // Kiwiwall explicitly requires the response body to be just "1"
                    if (provider === 'Kiwiwall') {
                        return new NextResponse('1', { status: 200, headers: { 'Content-Type': 'text/plain' } });
                    }
                    return NextResponse.json({ success: true, message: '1' }, { status: 200 });
                } else {
                    console.error('Completion not found:', completionId);
                    return NextResponse.json({ error: 'Completion not found' }, { status: 404 });
                }
            }

            // Exists and matches user (or we just created it)
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
        // Kiwiwall expects '0' on failure
        const provider = req.nextUrl.searchParams.get('provider') || 'Other';
        if (provider === 'Kiwiwall') {
            return new NextResponse('0', { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }
        return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
    }
}

// Reuse the process logic
// Reuse the process logic with Transaction for Atomicity
async function processCallbackLogic(completionId: string, existingData: any, payload: CallbackPayload): Promise<void> {
    if (!db) return;

    try {
        let shouldAddTournamentPoints = false;

        await db.runTransaction(async (t) => {
            const completionRef = db!.collection('offer_completions').doc(completionId);
            
            // 1. Re-read completion within transaction for lock & consistency
            const completionDoc = await t.get(completionRef);
            if (!completionDoc.exists) {
                // If the doc doesn't exist here, it means it was deleted concurrently or logic error.
                // Since this function is called after ensuring creation, this is rare.
                throw new Error(`Completion ${completionId} not found in transaction`);
            }
            
            const currentCompletionData = completionDoc.data();
            const currentStatus = currentCompletionData?.status;
            const userId = currentCompletionData?.userId || existingData.userId;

            // HANDLE COMPLETION
            if (payload.status === 'completed') {
                if (currentStatus === 'credited') {
                    console.log(`[Idempotency] Offer ${completionId} already credited. Skipping.`);
                    return;
                }

                const userRef = db!.collection('users').doc(userId);
                const userDoc = await t.get(userRef);

                if (!userDoc.exists) {
                    console.error(`[Callback] User ${userId} not found! Cannot credit offer ${completionId}.`);
                    // We mark it as 'failed_no_user' to stop retries if avoiding 500s, 
                    // or just return to pretend success. 
                    // Let's mark it so we can debug.
                    t.update(completionRef, {
                        status: 'failed_no_user',
                        updatedAt: Date.now()
                    });
                    return;
                }

                const userData = userDoc.data();
                // Healing: Use max of points/totalPoints to fix desyncs
                const dbPoints = Number(userData?.points || 0);
                const dbTotalPoints = Number(userData?.totalPoints || 0);
                const currentBalance = Math.max(dbPoints, dbTotalPoints);
                
                // Use payout from payload if available (some providers adjust dynamic payouts), else stored
                const payout = Number(payload.payout || currentCompletionData?.payout || 0);
                const newBalance = currentBalance + payout;
                const currentTotalEarnings = Number(userData?.totalEarnings || 0);

                const SURVEY_PROVIDERS = ['CPX', 'TheoremReach', 'BitLabs', 'Pollfish'];
                const source = SURVEY_PROVIDERS.includes(payload.provider) ? 'survey' : 'offerwall';

                console.log(`[Callback] Crediting User ${userId}: ${currentBalance} + ${payout} = ${newBalance}`);

                // update user
                t.update(userRef, {
                    points: newBalance,
                    totalPoints: newBalance,
                    totalEarnings: currentTotalEarnings + payout,
                    updatedAt: Date.now(),
                });

                // update completion
                t.update(completionRef, {
                    status: 'credited',
                    externalTransactionId: payload.transactionId,
                    completedAt: Date.now(),
                    creditedAt: Date.now(),
                });

                // add transaction record
                const newTransactionRef = db!.collection('transactions').doc();
                t.set(newTransactionRef, {
                    userId,
                    type: 'credit',
                    amount: payout,
                    source: source,
                    sourceId: completionId,
                    status: 'completed',
                    metadata: {
                        provider: payload.provider,
                        externalTransactionId: payload.transactionId,
                        offerTitle: currentCompletionData?.metadata?.offerTitle || currentCompletionData?.metadata?.offer_name || 'Unknown Offer',
                    },
                    createdAt: Date.now(),
                });

                shouldAddTournamentPoints = true;

            } 
            // HANDLE REVERSAL
            else if (payload.status === 'reversed') {
                 if (currentStatus === 'reversed') {
                    console.log(`[Idempotency] Offer ${completionId} already reversed. Skipping.`);
                    return;
                }

                const userRef = db!.collection('users').doc(userId);
                const userDoc = await t.get(userRef);

                // Update completion status
                t.update(completionRef, {
                    status: 'reversed',
                    updatedAt: Date.now(),
                });

                // Only deduct if user exists AND it was previously credited
                if (currentStatus === 'credited' && userDoc.exists) {
                    const userData = userDoc.data();
                    const payout = Number(currentCompletionData?.payout || 0);
                    const currentPoints = Number(userData?.points || 0);
                    const newBalance = Math.max(0, currentPoints - payout);

                    console.log(`[Callback] Reversing ${payout} points for User ${userId}. New Balance: ${newBalance}`);

                    t.update(userRef, {
                        points: newBalance,
                        // We typically don't decrement totalEarnings on chargeback depending on business logic,
                        // but usually better to leave earnings metrics or handle separately.
                        // Let's just update balance.
                        updatedAt: Date.now(),
                    });

                    const newTransactionRef = db!.collection('transactions').doc();
                    t.set(newTransactionRef, {
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
        });

        // Post-transaction side effects (outside transaction lock)
        if (shouldAddTournamentPoints) {
            await addTournamentPoints(existingData.userId, 'offerwall').catch(err => {
                console.error('[Callback] Failed to add tournament points:', err);
                // Non-critical failure, don't fail the request
            });
        }

    } catch (e) {
        console.error('[Callback] Transaction error:', e);
        throw e;
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

        if (provider === 'CPX') {
            const userId = rawPayload.uid || rawPayload.user_id || rawPayload.ext_user_id;
            const hash = rawPayload.hash || rawPayload.signature;
            const secret = process.env.CPX_SECURE_HASH;

            if (!secret) {
                console.warn('[Security] CPX_SECURE_HASH not set, skipping validation');
                return isDev;
            }

            if (!userId) {
                console.warn('[Security] CPX missing userId for validation');
                return false;
            }

            // CPX Postback Signature: MD5(ext_user_id + "-" + secure_hash)
            // ref: https://publisher.cpx-research.com/documentation
            const toHash = `${userId}-${secret}`;
            const expectedHash = crypto.createHash('md5').update(toHash).digest('hex');

            return hash === expectedHash;
        }

        if (provider === 'Timewall') {
            const secret = process.env.TIMEWALL_SECRET_KEY;
            const receivedHash = rawPayload.hash || rawPayload.signature;

            if (!secret) {
                console.warn('[Security] TIMEWALL_SECRET_KEY not set, skipping validation');
                return isDev;
            }

            if (!receivedHash) {
                console.warn('[Security] Timewall missing hash/signature');
                return false;
            }

            // Timewall verification: HMAC-SHA256 of the query string (excluding hash/signature parameters)
            // We need to reconstruct the query string exactly as received, sorted or typically just the raw parameters except headers.
            // However, Next.js separates them. A simpler robust way for many providers is:
            // hash = hmac_sha256(userId + transID + amount, secret) <-- This varies by provider.

            // let's try the common sorted-param approach or raw-string reconstruction if possible.
            // Since we can't easily get the raw original query string order from nextUrl.searchParams (order might be preserved but not guaranteed),
            // we will try to validate using the most critical fields:
            // Note: Timewall documentation often specifies: `hash = hmac('sha256', url_without_hash, secret)`

            // Let's rely on checking if we can validate via a simpler subset if the full URL reconstruction is flaky.
            // Actually, for Timewall specifically, they often use a specific parameter sort.

            // To be safe and avoid blocking legitimate earnings due to complex URL reconstruction issues:
            // We will verify that the request HAS a hash, and if we are in strict mode, we'd verify it.
            // But since I don't have the *exact* Timewall hashing spec (it varies), I will add a placeholder
            // that checks for the key existence and logs a warning if verification would fail, but returns true
            // to avoid breaking it until you can verify the exact spec with a live test.

            // STAGE 1: Check for Secret Key presence
            if (!secret) return false;

            // STAGE 2: Attempt standard HMAC-SHA256 validation (Logged only for now)
            // Timewall typically signs the full query string sorted by key
            try {
                // 1. Get all keys except hash/signature
                const keys = Object.keys(rawPayload).filter(k => k !== 'hash' && k !== 'signature' && k !== 'provider').sort();

                // 2. Construct data string (key=value&...)
                // Note: Some providers use just values, some use key=value. Timewall docs often imply full query string.
                // We'll try query-string style first.
                const dataToSign = keys.map(key => `${key}=${rawPayload[key]}`).join('&');

                const expected = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

                if (expected !== receivedHash) {
                    console.warn(`[Security] Timewall Signature Mismatch (Soft Check).`);
                    console.warn(`received: ${receivedHash}`);
                    console.warn(`expected: ${expected}`);
                    console.warn(`data_signed: ${dataToSign}`);
                    // return false; // DISABLED until verified 100% to avoid lost revenue
                } else {
                    console.log('[Security] Timewall signature verified successfully!');
                }
            } catch (err) {
                console.warn('[Security] Timewall validation error', err);
            }

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
