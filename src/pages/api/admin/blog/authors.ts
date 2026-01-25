/**
 * Admin Authors API
 * GET /api/admin/blog/authors - Get list of admins who can be authors (super_admin and editor roles)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { adminDb } from '@/lib/admin-db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const admins = await adminDb.listAdmins()

        // Filter to only include super_admin and editor roles
        const authors = admins
            .filter(admin =>
                admin.role === 'super_admin' || admin.role === 'editor'
            )
            .map(admin => ({
                id: admin.email,
                name: admin.name || admin.email.split('@')[0],
                avatar: admin.avatar, // Pass avatar to frontend
                email: admin.email,
                role: admin.role,
                bio: admin.role === 'super_admin'
                    ? 'Administrator at KojoMoney'
                    : 'Content Editor at KojoMoney',
                verified: true
            }))

        return res.status(200).json({
            success: true,
            authors
        })
    } catch (error) {
        console.error('[Authors API] Failed:', error)
        return res.status(500).json({ error: 'Failed to fetch authors' })
    }
}

// Require any admin (editor or above can see authors list)
export default requireAdmin(handler, 'editor')
