import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { adminDb } from '@/lib/admin-db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email } = req.body
    const currentUser = (req as any).user

    if (!email) {
        return res.status(400).json({ error: 'Email is required' })
    }

    // Prevent self-deletion
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    try {
        await adminDb.deleteAdmin(email)
        return res.status(200).json({ success: true, message: `Admin deleted: ${email}` })
    } catch (error) {
        console.error('[Admin Delete] Failed:', error)
        return res.status(500).json({ error: 'Failed to delete admin' })
    }
}

// Require super_admin role for deletion
export default requireAdmin(handler, 'super_admin')
