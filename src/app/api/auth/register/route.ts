import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectFraud } from '@/lib/anti-fraud'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
    try {
        const { email, name, phone, referralCode } = await request.json()

        // Basic validation
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Anti-fraud checks
        const fraudDetection = await detectFraud(request)
        if (fraudDetection.isFraudulent) {
            return NextResponse.json({
                error: 'Suspicious activity detected',
                signals: fraudDetection.signals
            }, { status: 403 })
        }

        // Check if user already exists
        const existingUserSnap = await db.collection('users').where('email', '==', email).limit(1).get()

        if (!existingUserSnap.empty) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 })
        }

        // Generate unique user ID and referral code
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const userReferralCode = `EARN${Math.random().toString(36).substr(2, 8).toUpperCase()}`

        // Handle referral
        let referredBy: string | null = null
        if (referralCode) {
            const referrerSnap = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get()
            if (!referrerSnap.empty) {
                referredBy = referrerSnap.docs[0].id
            }
        }

        // Create new user
        const usersRef = db.collection('users')
        const userDocRef = usersRef.doc(userId)
        await userDocRef.set({
            email,
            name: name || null,
            phone: phone || null,
            referralCode: userReferralCode,
            referredBy,
            deviceId: generateDeviceId(request),
            totalPoints: referredBy ? 100 : 0,
            adPoints: 0,
            newsPoints: 0,
            triviaPoints: 0,
            dailyStreak: 0,
            isVpnBlocked: false,
            isBlocked: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        // Award referral bonus to referrer
        if (referredBy) {
            await db.collection('referral_rewards').add({
                referrerId: referredBy,
                referredId: userId,
                points: 100,
                claimedAt: Timestamp.now(),
                createdAt: Timestamp.now(),
            })

            await usersRef.doc(referredBy).update({ totalPoints: FieldValue.increment(100) })
        }

        // Create welcome activity
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const dateId = today.toISOString().substring(0, 10)
        await db.collection('daily_activities').doc(`${userId}_${dateId}`).set({
            userId,
            date: Timestamp.fromDate(today),
            adsWatched: 0,
            storiesRead: 0,
            triviaPlayed: false,
            pointsEarned: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                email,
                name: name || null,
                phone: phone || null,
                referralCode: userReferralCode,
                totalPoints: referredBy ? 100 : 0,
                adPoints: 0,
                newsPoints: 0,
                triviaPoints: 0,
                dailyStreak: 0,
                createdAt: Timestamp.now()
            },
            message: 'Account created successfully!'
        })

    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }
}

function generateDeviceId(request: NextRequest): string {
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = (request as any).ip || 'unknown'
    const fingerprint = `${userAgent}-${ip}`
    return Buffer.from(fingerprint).toString('base64').substring(0, 32)
}
