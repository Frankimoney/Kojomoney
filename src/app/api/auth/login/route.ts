import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectFraud } from '@/lib/anti-fraud'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

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

        // Find user
        const usersRef = db.collection('users')
        const userQuery = await usersRef.where('email', '==', email).limit(1).get()
        if (userQuery.empty) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        const userDoc = userQuery.docs[0]
        const userDataRaw = userDoc.data() as any
        const user = { id: userDoc.id, ...userDataRaw }

        // Check if user is blocked
        if (user.isBlocked) {
            return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
        }

        // Update last active date
        await usersRef.doc(user.id).update({ lastActiveDate: Timestamp.now() })

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
