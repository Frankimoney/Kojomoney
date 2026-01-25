import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { verificationId, code, newPassword, email } = req.body

        if (!verificationId || !code || !newPassword || !email) {
            return res.status(400).json({ error: 'All fields are required', success: false })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available', success: false })
        }

        const normalizedEmail = email.toLowerCase().trim()

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters', success: false })
        }

        // Verify the code
        const verificationDoc = await db.collection('verifications').doc(verificationId).get()

        if (!verificationDoc.exists) {
            return res.status(400).json({ error: 'Invalid verification', success: false })
        }

        const verificationData = verificationDoc.data()

        if (!verificationData) {
            return res.status(400).json({ error: 'Invalid verification data', success: false })
        }

        if (verificationData.used) {
            return res.status(400).json({ error: 'This code has already been used', success: false })
        }

        if (verificationData.expiresAt < Date.now()) {
            return res.status(400).json({ error: 'Verification code has expired', success: false })
        }

        if (verificationData.code !== code) {
            return res.status(400).json({ error: 'Invalid verification code', success: false })
        }

        if (verificationData.email !== normalizedEmail) {
            return res.status(400).json({ error: 'Email mismatch', success: false })
        }

        if (verificationData.type !== 'reset-password') {
            return res.status(400).json({ error: 'Invalid verification type', success: false })
        }

        // Mark verification as used
        await db.collection('verifications').doc(verificationId).update({ used: true })

        // Find the user by email
        const usersRef = db.collection('users')
        const userQuery = await usersRef.where('email', '==', normalizedEmail).get()

        if (userQuery.empty) {
            return res.status(404).json({ error: 'User not found', success: false })
        }

        const userDoc = userQuery.docs[0]

        // Hash the new password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        // Update the user's password
        await usersRef.doc(userDoc.id).update({
            password: hashedPassword,
            updatedAt: Date.now()
        })

        console.log(`[RESET-PASSWORD] Password reset for ${normalizedEmail}`)

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        })

    } catch (error) {
        console.error('[RESET-PASSWORD] Error:', error)
        return res.status(500).json({ error: 'Failed to reset password', success: false })
    }
}

export default allowCors(handler)
