/**
 * Admin Users API Endpoint
 * 
 * GET /api/admin/users - Get list of users with search
 * POST /api/admin/users - Ban/unban a user
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handleBan(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { search, limit = '50' } = req.query
        const limitNum = Math.min(parseInt(limit as string) || 50, 100)

        // Fetch all users and filter/sort client-side to avoid index requirements
        const snapshot = await db!.collection('users').get()

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
                isBanned: data.isBanned || false,
                bannedAt: data.bannedAt,
                bannedReason: data.bannedReason,
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

async function handleBan(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { userId, action, reason } = req.body

        if (!userId || !action) {
            return res.status(400).json({ error: 'userId and action are required' })
        }

        if (!['ban', 'unban'].includes(action)) {
            return res.status(400).json({ error: 'action must be ban or unban' })
        }

        const userRef = db!.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        if (action === 'ban') {
            await userRef.update({
                isBanned: true,
                status: 'banned',
                bannedAt: Date.now(),
                bannedReason: reason || 'Banned by admin',
            })

            return res.status(200).json({
                success: true,
                message: 'User banned successfully',
            })
        } else {
            await userRef.update({
                isBanned: false,
                status: 'active',
                bannedAt: null,
                bannedReason: null,
                unbannedAt: Date.now(),
            })

            return res.status(200).json({
                success: true,
                message: 'User unbanned successfully',
            })
        }
    } catch (error) {
        console.error('Error updating user ban status:', error)
        return res.status(500).json({ error: 'Failed to update user' })
    }
}

export default requireAdmin(handler)

