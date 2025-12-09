import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { verificationId, code } = req.body

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

        // Check if code matches
        if (verification.code !== code) {
            return res.status(400).json({ error: 'Invalid verification code', success: false })
        }

        // Mark as used
        await verificationRef.update({ used: true, usedAt: Date.now() })

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            email: verification.email
        })
    } catch (error) {
        console.error('Verify code error:', error)
        return res.status(500).json({ error: 'Failed to verify code', success: false })
    }
}

export default allowCors(handler)
