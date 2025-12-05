import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectFraud } from '@/lib/anti-fraud'
import { Timestamp } from 'firebase-admin/firestore'
import { verifyPassword, validateEmail } from '@/lib/security'

export async function POST(request: NextRequest) {
    try {
        const { usernameOrEmail, password, verificationId } = await request.json()

        if (!usernameOrEmail) {
            return NextResponse.json({ error: 'Username or email is required' }, { status: 400 })
        }

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 })
        }

        if (!verificationId) {
            return NextResponse.json({ error: 'Login verification required' }, { status: 400 })
        }

        // Anti-fraud checks
        const fraudDetection = await detectFraud(request)
        if (fraudDetection.isFraudulent) {
            return NextResponse.json({
                error: 'Suspicious activity detected',
                signals: fraudDetection.signals
            }, { status: 403 })
        }

        // Verify the login code was verified
        const verificationRef = db.collection('verification_codes').doc(verificationId)
        const verificationSnap = await verificationRef.get()

        if (!verificationSnap.exists) {
            return NextResponse.json({ error: 'Invalid verification record' }, { status: 400 })
        }

        const verificationData = verificationSnap.data() as any
        if (!verificationData.isUsed) {
            return NextResponse.json({ error: 'Verification code must be confirmed first' }, { status: 400 })
        }
        if (verificationData.type !== 'login') {
            return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 })
        }

        // Find user by username or email
        let userQuery

        if (validateEmail(usernameOrEmail)) {
            // Search by email
            userQuery = await db.collection('users').where('email', '==', usernameOrEmail.toLowerCase()).limit(1).get()
        } else {
            // Search by username
            userQuery = await db.collection('users').where('username', '==', usernameOrEmail.toLowerCase()).limit(1).get()
        }

        if (userQuery.empty) {
            return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 })
        }

        const userDoc = userQuery.docs[0]
        const userDataRaw = userDoc.data() as any
        const user = { id: userDoc.id, ...userDataRaw }

        // Check if user is blocked
        if (user.isBlocked) {
            return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
        }

        // Verify password
        try {
            const isPasswordValid = await verifyPassword(password, user.passwordHash)
            if (!isPasswordValid) {
                // Log failed login attempt
                await db.collection('login_attempts').add({
                    userId: user.id,
                    ip: (request as any).ip || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    success: false,
                    timestamp: Timestamp.now(),
                })

                return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 })
            }
        } catch (error) {
            console.error('Error verifying password:', error)
            return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
        }

        // Update last active date
        await db.collection('users').doc(user.id).update({ 
            lastActiveDate: Timestamp.now(),
            lastLogin: Timestamp.now(),
        })

        // Log successful login
        await db.collection('login_logs').add({
            userId: user.id,
            ip: (request as any).ip || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            type: 'login',
            timestamp: Timestamp.now(),
        })

        // Return user data (excluding sensitive info)
        // Load recent withdrawals and activities
        const withdrawalsSnap = await db
            .collection('withdrawals')
            .where('userId', '==', user.id)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get()
        const withdrawals = withdrawalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

        const activitiesSnap = await db
            .collection('daily_activities')
            .where('userId', '==', user.id)
            .orderBy('date', 'desc')
            .limit(7)
            .get()
        const dailyActivities = activitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            phone: user.phone,
            referralCode: user.referralCode,
            totalPoints: user.totalPoints || 0,
            adPoints: user.adPoints || 0,
            newsPoints: user.newsPoints || 0,
            triviaPoints: user.triviaPoints || 0,
            dailyStreak: user.dailyStreak || 0,
            lastActiveDate: user.lastActiveDate,
            withdrawals,
            dailyActivities,
            createdAt: user.createdAt
        }

        return NextResponse.json({
            success: true,
            user: userData,
            message: 'Login successful!'
        })

    } catch (error) {
        console.error('Error during login:', error)
        return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
}
