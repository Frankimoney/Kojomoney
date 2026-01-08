import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

function generateReferralCode(userId: string): string {
    const prefix = 'KOJO'
    const suffix = userId.slice(-6).toUpperCase()
    return `${prefix}${suffix}`
}

import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { username, email, password, name, phone, referralCode, verificationId, timezone } = req.body

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required', success: false })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available', success: false })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const normalizedUsername = username.toLowerCase().trim()

        // Validate username format
        if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters, letters, numbers, underscores only', success: false })
        }

        // Check if email already exists (Firestore query)
        const usersRef = db.collection('users')
        const emailCheck = await usersRef.where('email', '==', normalizedEmail).get()
        if (!emailCheck.empty) {
            return res.status(400).json({ error: 'Email already registered', success: false })
        }

        // Check if username already exists
        const usernameCheck = await usersRef.where('username', '==', normalizedUsername).get()
        if (!usernameCheck.empty) {
            return res.status(400).json({ error: 'Username already taken', success: false })
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        // Generate user ID
        const userId = crypto.randomBytes(16).toString('hex')
        const userReferralCode = generateReferralCode(userId)

        // Create user object
        const newUser = {
            id: userId,
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword, // Store hashed password
            name: name || '',
            phone: phone || '', // Optional now
            timezone: timezone || 'UTC',  // User's IANA timezone string
            referralCode: userReferralCode,
            referredBy: referralCode || null,
            totalPoints: 100, // Welcome bonus
            adPoints: 0,
            newsPoints: 0,
            triviaPoints: 0,
            dailyStreak: 0,
            lastActiveDate: null,
            adsWatched: 0,
            storiesRead: 0,
            triviaCompleted: false,
            emailVerified: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        // Save user to Firestore
        await usersRef.doc(userId).set(newUser)

        // If user was referred, credit the referrer
        if (referralCode) {
            const referrerQuery = await usersRef.where('referralCode', '==', referralCode.toUpperCase()).get()
            if (!referrerQuery.empty) {
                const referrerDoc = referrerQuery.docs[0]
                const referrer = referrerDoc.data()

                // Add referral reward to referrer
                const newTotalPoints = (referrer.totalPoints || 0) + 100
                const now = Date.now()

                await usersRef.doc(referrerDoc.id).update({
                    totalPoints: newTotalPoints,
                    updatedAt: now
                })

                // Create referral record for tracking
                await db.collection('referrals').add({
                    referrerId: referrerDoc.id,
                    referredUserId: userId,
                    referredUsername: normalizedUsername,
                    status: 'registered',
                    earnedAmount: 100,
                    createdAt: now
                })

                // Create transaction for referrer
                await db.collection('transactions').add({
                    userId: referrerDoc.id,
                    type: 'credit',
                    amount: 100,
                    source: 'referral_bonus',
                    status: 'completed',
                    description: `Referral bonus for ${normalizedUsername}`,
                    createdAt: now
                })
            }
        }

        // Return user data (without password)
        const userResponse = { ...newUser }
        delete (userResponse as any).password

        return res.status(200).json({
            success: true,
            message: 'Account created successfully',
            user: userResponse
        })
    } catch (error) {
        console.error('Registration error:', error)
        return res.status(500).json({ error: 'Failed to create account', success: false })
    }
}

export default allowCors(handler)
