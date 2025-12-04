import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectFraud, blockVPN } from '@/lib/anti-fraud'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json()

        // Anti-fraud checks
        const fraudDetection = await detectFraud(request, userId)
        if (fraudDetection.isFraudulent) {
            return NextResponse.json({
                error: 'Suspicious activity detected',
                signals: fraudDetection.signals,
                riskScore: fraudDetection.riskScore
            }, { status: 403 })
        }

        // VPN check
        if (await blockVPN(request)) {
            return NextResponse.json({ error: 'VPN/Proxy usage not allowed' }, { status: 403 })
        }

        // Check for recent ad views (cooldown)
        const recentSnap = await db
            .collection('ad_views')
            .where('userId', '==', userId)
            .where('startedAt', '>=', Timestamp.fromDate(new Date(Date.now() - 30 * 1000)))
            .orderBy('startedAt', 'desc')
            .limit(1)
            .get()
        const recentAdView = recentSnap.docs[0]

        if (recentAdView) {
            const startedAt = (recentAdView.data() as any)?.startedAt as Timestamp
            const startedMs = startedAt ? startedAt.toDate().getTime() : Date.now()
            const cooldownSeconds = Math.ceil((30 * 1000 - (Date.now() - startedMs)) / 1000)
            return NextResponse.json({
                error: 'Cooldown active',
                cooldownSeconds
            }, { status: 429 })
        }

        const adRef = await db.collection('ad_views').add({
            userId,
            ipAddress: (request as any).ip || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            startedAt: Timestamp.now(),
            isConfirmed: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        return NextResponse.json({
            success: true,
            adViewId: adRef.id,
            message: 'Ad started. Confirm completion after SDK event.'
        })
    } catch (error) {
        console.error('Error starting ad view:', error)
        return NextResponse.json({ error: 'Failed to start ad' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { adViewId, userId } = await request.json()

        const adDocRef = db.collection('ad_views').doc(adViewId)
        const adSnap = await adDocRef.get()
        if (!adSnap.exists) {
            return NextResponse.json({ error: 'Ad view not found' }, { status: 404 })
        }
        const adData = adSnap.data() as any
        if (adData.isConfirmed) {
            return NextResponse.json({ success: true, message: 'Already confirmed' })
        }

        await adDocRef.update({
            completedAt: Timestamp.now(),
            isConfirmed: true,
            pointsEarned: 5,
            updatedAt: Timestamp.now(),
        })

        await db.collection('users').doc(userId).update({
            totalPoints: FieldValue.increment(5),
            adPoints: FieldValue.increment(5),
        })

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dateId = today.toISOString().substring(0, 10)
        const dailyRef = db.collection('daily_activities').doc(`${userId}_${dateId}`)
        const dailySnap = await dailyRef.get()
        if (dailySnap.exists) {
            await dailyRef.update({
                adsWatched: FieldValue.increment(1),
                pointsEarned: FieldValue.increment(5),
                updatedAt: Timestamp.now(),
            })
        } else {
            await dailyRef.set({
                userId,
                date: Timestamp.fromDate(today),
                adsWatched: 1,
                storiesRead: 0,
                triviaPlayed: false,
                pointsEarned: 5,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            })
        }

        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, event: 'ad_completion', data: { adViewId } })
            })
        } catch (e) {}

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error confirming ad view:', error)
        return NextResponse.json({ error: 'Failed to confirm ad' }, { status: 500 })
    }
}
