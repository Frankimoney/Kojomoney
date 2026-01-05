/**
 * Admin Withdrawals API Endpoint
 * 
 * GET /api/admin/withdrawals - Get list of withdrawals with filtering
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
        const { status, limit = '50' } = req.query
        const limitNum = Math.min(parseInt(limit as string) || 50, 100)

        // Get all withdrawals and filter client-side to avoid index requirements
        const snapshot = await db.collection('withdrawals').get()

        let withdrawals: any[] = []

        for (const doc of snapshot.docs) {
            const data = doc.data()

            // Filter by status if specified
            if (status && status !== 'all' && data.status !== status) {
                continue
            }

            let userEmail = data.userEmail || 'Unknown'

            // If no userEmail, try to fetch from users collection
            if (!data.userEmail && data.userId) {
                try {
                    const userDoc = await db.collection('users').doc(data.userId).get()
                    if (userDoc.exists) {
                        userEmail = userDoc.data()?.email || 'Unknown'
                    }
                } catch (e) {
                    // Ignore error, use default
                }
            }

            withdrawals.push({
                id: doc.id,
                oderId: data.oderId,
                userId: data.userId,
                userEmail,
                amount: data.amount || 0,
                amountUSD: data.amountUSD || (data.amount || 0) / 1000, // Assume 1000 pts = $1
                method: data.method || 'unknown',
                accountDetails: data.accountDetails || data.paymentDetails || '',
                status: data.status || 'pending',
                createdAt: data.createdAt || Date.now(),
                processedAt: data.processedAt,
                processedBy: data.processedBy,
                rejectionReason: data.rejectionReason,
            })
        }

        // Sort by createdAt descending
        withdrawals.sort((a, b) => b.createdAt - a.createdAt)

        // Limit results
        withdrawals = withdrawals.slice(0, limitNum)

        return res.status(200).json({
            withdrawals,
            total: withdrawals.length,
        })
    } catch (error) {
        console.error('Error fetching withdrawals:', error)
        return res.status(500).json({ error: 'Failed to fetch withdrawals' })
    }
}

export default requireAdmin(handler, 'support')
