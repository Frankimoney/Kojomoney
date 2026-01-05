import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'
import { adminDb } from '@/lib/admin-db'
import bcrypt from 'bcryptjs'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // GET: Validate token and return admin info
    if (req.method === 'GET') {
        const { token } = req.query

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' })
        }

        const admin = await adminDb.getAdminByToken(token)

        if (!admin) {
            return res.status(404).json({ error: 'Invalid or expired invitation' })
        }

        if (admin.inviteExpiresAt && admin.inviteExpiresAt < Date.now()) {
            return res.status(410).json({ error: 'Invitation has expired' })
        }

        return res.status(200).json({
            success: true,
            admin: {
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        })
    }

    // POST: Accept invite and set password
    if (req.method === 'POST') {
        const { token, password } = req.body

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' })
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' })
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 12)

        // Accept the invite
        const result = await adminDb.acceptInvite(token, passwordHash)

        if (!result.success) {
            return res.status(400).json({ error: result.error })
        }

        return res.status(200).json({
            success: true,
            message: 'Account activated successfully! You can now log in.',
            email: result.email
        })
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default allowCors(handler)
