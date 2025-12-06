import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { usernameOrEmail, password, verificationId } = req.body

        // Validate required fields
        if (!usernameOrEmail || !password) {
            return res.status(400).json({ error: 'Username/email and password are required', success: false })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available', success: false })
        }

        const loginValue = usernameOrEmail.toLowerCase().trim()
        const usersRef = db.ref('users')

        // Try to find user by email or username
        let userData = null
        let userId = null

        // Check by email
        const emailQuery = await usersRef.orderByChild('email').equalTo(loginValue).once('value')
        if (emailQuery.exists()) {
            const data = emailQuery.val()
            userId = Object.keys(data)[0]
            userData = data[userId]
        } else {
            // Check by username
            const usernameQuery = await usersRef.orderByChild('username').equalTo(loginValue).once('value')
            if (usernameQuery.exists()) {
                const data = usernameQuery.val()
                userId = Object.keys(data)[0]
                userData = data[userId]
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

        // Update last active date
        await db.ref(`users/${userId}`).update({
            lastActiveDate: new Date().toISOString().split('T')[0],
            updatedAt: Date.now()
        })

        // Return user data (without password)
        const userResponse = { ...userData, id: userId }
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
