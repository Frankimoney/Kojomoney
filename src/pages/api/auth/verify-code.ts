import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

import { allowCors } from '@/lib/cors'

// ... imports

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { verificationId, code, userId } = req.body

        if (!verificationId || !code) {
            return res.status(400).json({ error: 'Verification ID and code are required', success: false })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available', success: false })
        }

        // Get verification record from Firestore
        const verificationRef = db.collection('verifications').doc(verificationId)
        const snapshot = await verificationRef.get()

        if (!snapshot.exists) {
            return res.status(400).json({ error: 'Invalid verification ID', success: false })
        }

        const verification = snapshot.data()!

        // Check if already used
        if (verification.used) {
            return res.status(400).json({ error: 'Verification code already used', success: false })
        }

        // Check if expired
        if (Date.now() > verification.expiresAt) {
            return res.status(400).json({ error: 'Verification code has expired', success: false })
        }

        // Check if code matches (loose comparison for string/number match)
        if (String(verification.code) !== String(code)) {
            return res.status(400).json({ error: 'Invalid verification code', success: false })
        }

        // Mark as used
        await verificationRef.update({ used: true, usedAt: Date.now() })

        // User Status Update Logic
        let updatedUser: any = null
        let targetUserId = verification.userId || userId

        // Fallback: If no ID found, try to fallback to email/phone lookup
        if (!targetUserId) {
            if (verification.email) {
                console.log('[VERIFY-CODE] Looking up user by email:', verification.email)
                const q = await db.collection('users').where('email', '==', verification.email).limit(1).get()
                if (!q.empty) targetUserId = q.docs[0].id
            } else if (verification.phone) {
                console.log('[VERIFY-CODE] Looking up user by phone:', verification.phone)
                const q = await db.collection('users').where('phone', '==', verification.phone).limit(1).get()
                if (!q.empty) targetUserId = q.docs[0].id
            }
        }

        if (targetUserId) {
            const userRef = db.collection('users').doc(targetUserId)
            const updates: any = { updatedAt: Date.now() }

            if (verification.type === 'verify_email' || verification.email) {
                updates.emailVerified = true
            }

            if (verification.type === 'verify_phone' || verification.phone) {
                updates.phoneVerified = true
                if (verification.phone) {
                    updates.phone = verification.phone // Ensure phone is saved to profile
                }
            }

            await userRef.update(updates)

            // Fetch updated user to return
            const userSnap = await userRef.get()
            updatedUser = { id: userSnap.id, ...userSnap.data() }
        }

        return res.status(200).json({
            success: true,
            message: 'Verified successfully',
            email: verification.email,
            phone: verification.phone,
            user: updatedUser
        })
    } catch (error) {
        console.error('Verify code error:', error)
        return res.status(500).json({ error: 'Failed to verify code', success: false })
    }
}

export default allowCors(handler)
