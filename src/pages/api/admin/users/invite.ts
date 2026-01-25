import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin, AdminRequest } from '@/lib/admin-auth'
import { adminDb } from '@/lib/admin-db'
import { sendAdminInvite } from '@/services/emailService'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, role, name } = req.body
    const adminReq = req as AdminRequest
    const inviterEmail = adminReq.admin?.email || 'Admin'

    if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' })
    }

    // Check if admin already exists
    const existing = await adminDb.getAdmin(email)
    if (existing) {
        return res.status(400).json({ error: 'Admin with this email already exists' })
    }

    try {
        // Create admin with pending status and invite token
        const { inviteToken } = await adminDb.createAdmin(
            email,
            role,
            inviterEmail,
            name
        )

        // Send invite email
        const emailSent = await sendAdminInvite(
            email,
            name || email.split('@')[0],
            role,
            inviteToken,
            inviterEmail
        )

        return res.status(200).json({
            success: true,
            message: `Invitation sent to ${email}`,
            emailSent
        })
    } catch (error) {
        console.error('[Admin Invite] Failed:', error)
        return res.status(500).json({ error: 'Failed to invite admin' })
    }
}

// Require super_admin role for invites
export default requireAdmin(handler, 'super_admin')
