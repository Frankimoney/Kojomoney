import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { usernameOrEmail, password, verificationId, timezone } = req.body

        // Validate required fields
        if (!usernameOrEmail || !password) {
            return res.status(400).json({ error: 'Username/email and password are required', success: false })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available', success: false })
        }

        const loginValue = usernameOrEmail.toLowerCase().trim()
        const usersRef = db.collection('users')

        // Try to find user by email or username
        let userData: any = null
        let userId: string | null = null

        // Check by email
        const emailQuery = await usersRef.where('email', '==', loginValue).get()
        if (!emailQuery.empty) {
            const doc = emailQuery.docs[0]
            userId = doc.id
            userData = doc.data()
        } else {
            // Check by username
            const usernameQuery = await usersRef.where('username', '==', loginValue).get()
            if (!usernameQuery.empty) {
                const doc = usernameQuery.docs[0]
                userId = doc.id
                userData = doc.data()
            }
        }

        if (!userData) {
            return res.status(400).json({ error: 'Invalid username/email or password', success: false })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, userData.password)
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid username/email or password', success: false })
        }

        // Update last active date and timezone
        const updateData: any = {
            lastActiveDate: new Date().toISOString().split('T')[0],
            updatedAt: Date.now(),
            emailVerified: true // Confirmed via OTP Login flow
        }
        // Update timezone if provided (user may have moved or device changed)
        if (timezone) {
            updateData.timezone = timezone
        }
        await usersRef.doc(userId!).update(updateData)

        // Return user data (without password), including updated timezone
        const userResponse = { ...userData, id: userId, timezone: timezone || userData.timezone }
        delete (userResponse as any).password

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: userResponse
        })
    } catch (error) {
        console.error('Login error:', error)
        return res.status(500).json({ error: 'Failed to login', success: false })
    }
}

export default allowCors(handler)
