import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectFraud } from '@/lib/anti-fraud'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { hashPassword, validateUsername, validateEmail, validatePassword } from '@/lib/security'

export async function POST(request: NextRequest) {
    try {
        const { username, email, password, passwordConfirm, name, phone, referralCode, verificationId } = await request.json()

        // Validate required fields
        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 })
        }
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }
        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 })
        }
        if (!verificationId) {
            return NextResponse.json({ error: 'Email verification required' }, { status: 400 })
        }

        // Validate username format
        if (!validateUsername(username)) {
            return NextResponse.json({
                error: 'Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens'
            }, { status: 400 })
        }

        // Validate email format
        if (!validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Validate passwords match
        if (password !== passwordConfirm) {
            return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
        }

        // Validate password strength
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
            return NextResponse.json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors
            }, { status: 400 })
        }

        // Verify the email verification code was used
        const verificationRef = db.collection('verification_codes').doc(verificationId)
        const verificationSnap = await verificationRef.get()

        if (!verificationSnap.exists) {
            return NextResponse.json({ error: 'Invalid verification record' }, { status: 400 })
        }

        const verificationData = verificationSnap.data() as any
        if (!verificationData.isUsed) {
            return NextResponse.json({ error: 'Email must be verified first' }, { status: 400 })
        }
        if (verificationData.email !== email || verificationData.type !== 'register') {
            return NextResponse.json({ error: 'Verification does not match email' }, { status: 400 })
        }

        // Anti-fraud checks
        const fraudDetection = await detectFraud(request)
        if (fraudDetection.isFraudulent) {
            return NextResponse.json({
                error: 'Suspicious activity detected',
                signals: fraudDetection.signals
            }, { status: 403 })
        }

        // Check if user already exists by email
        const existingEmailSnap = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get()
        if (!existingEmailSnap.empty) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
        }

        // Check if username is already taken
        const existingUsernameSnap = await db.collection('users').where('username', '==', username.toLowerCase()).limit(1).get()
        if (!existingUsernameSnap.empty) {
            return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
        }

        // Hash password
        const passwordHash = await hashPassword(password)

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

        // Create new user with enhanced security
        const usersRef = db.collection('users')
        const userDocRef = usersRef.doc(userId)
        await userDocRef.set({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            passwordHash,
            name: name || null,
            phone: phone || null,
            referralCode: userReferralCode,
            referredBy,
            deviceId: generateDeviceId(request),
            isEmailVerified: true,
            isPhoneVerified: !!phone,
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

        // Create login activity log
        await db.collection('login_logs').add({
            userId,
            ip: (request as any).ip || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            type: 'registration',
            timestamp: Timestamp.now(),
        })

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                username,
                email: email.toLowerCase(),
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
            message: 'Account created successfully! Welcome to Kojomoney!'
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
