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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { username, email, password, name, phone, referralCode, verificationId } = req.body

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

        // Check if email already exists
        const usersRef = db.ref('users')
        const emailCheck = await usersRef.orderByChild('email').equalTo(normalizedEmail).once('value')
        if (emailCheck.exists()) {
            return res.status(400).json({ error: 'Email already registered', success: false })
        }

        // Check if username already exists
        const usernameCheck = await usersRef.orderByChild('username').equalTo(normalizedUsername).once('value')
        if (usernameCheck.exists()) {
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
            phone: phone || '',
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

        // Save user to Firebase
        await db.ref(`users/${userId}`).set(newUser)

        // If user was referred, credit the referrer
        if (referralCode) {
            const referrerQuery = await usersRef.orderByChild('referralCode').equalTo(referralCode.toUpperCase()).once('value')
            if (referrerQuery.exists()) {
                const referrerData = referrerQuery.val()
                const referrerId = Object.keys(referrerData)[0]
                const referrer = referrerData[referrerId]

                // Add referral reward to referrer
                const newTotalPoints = (referrer.totalPoints || 0) + 100
                const referralRewards = referrer.referralRewards || []
                referralRewards.push({
                    referredUserId: userId,
                    referredUsername: normalizedUsername,
                    points: 100,
                    createdAt: Date.now()
                })

                await db.ref(`users/${referrerId}`).update({
                    totalPoints: newTotalPoints,
                    referralRewards,
                    updatedAt: Date.now()
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
