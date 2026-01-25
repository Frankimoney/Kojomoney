import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { adminDb } from '@/lib/admin-db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const admins = await adminDb.listAdmins()
        return res.status(200).json({ success: true, admins })
    } catch (error) {
        console.error('[Admin List] Failed:', error)
        return res.status(500).json({ error: 'Failed to fetch admins' })
    }
}

export default requireAdmin(handler, 'super_admin')
