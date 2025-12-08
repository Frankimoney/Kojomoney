/**
 * Admin Users API Endpoint
 * 
 * GET /api/admin/users - Get list of users with search
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    // TODO: Add admin authentication check

    try {
        const { search, limit = '50' } = req.query
        const limitNum = Math.min(parseInt(limit as string) || 50, 100)

        // Fetch all users and filter/sort client-side to avoid index requirements
        const snapshot = await db.collection('users').get()

        let users: any[] = []
        snapshot.forEach(doc => {
            const data = doc.data()
            users.push({
                id: doc.id,
                email: data.email,
                displayName: data.displayName || data.name || data.username,
                username: data.username,
                points: data.points || data.totalPoints || 0,
                totalEarnings: data.totalEarnings || data.totalPoints || 0,
                referralCode: data.referralCode || '',
                referredBy: data.referredBy,
                createdAt: data.createdAt,
                lastActive: data.lastActive,
                lastActiveDate: data.lastActiveDate,
                country: data.country,
                deviceType: data.deviceType,
                status: data.status || 'active',
            })
        })

        // Client-side search filter
        if (search) {
            const searchLower = (search as string).toLowerCase()
            users = users.filter(u =>
                u.email?.toLowerCase().includes(searchLower) ||
                u.displayName?.toLowerCase().includes(searchLower) ||
                u.username?.toLowerCase().includes(searchLower) ||
                u.referralCode?.toLowerCase().includes(searchLower)
            )
        }

        // Sort by createdAt descending
        users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

        // Limit results
        users = users.slice(0, limitNum)

        return res.status(200).json({
            users,
            total: users.length,
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        return res.status(500).json({ error: 'Failed to fetch users' })
    }
}

export default requireAdmin(handler)
