/**
 * Admin Transactions API Endpoint
 * 
 * GET /api/admin/transactions - Get list of all transactions
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
        const { type, source, limit = '100' } = req.query
        const limitNum = Math.min(parseInt(limit as string) || 100, 500)

        // Fetch all transactions and filter client-side to avoid index requirements
        const snapshot = await db.collection('transactions').get()

        let transactions: any[] = []
        snapshot.forEach(doc => {
            const data = doc.data()
            transactions.push({
                id: doc.id,
                oderId: data.oderId,
                userId: data.userId,
                type: data.type,
                amount: data.amount || 0,
                source: data.source || 'unknown',
                status: data.status || 'completed',
                description: data.description,
                createdAt: data.createdAt || Date.now(),
                metadata: data.metadata,
            })
        })

        // Filter by type if specified
        if (type && type !== 'all') {
            transactions = transactions.filter(t => t.type === type)
        }

        // Filter by source if specified
        if (source && source !== 'all') {
            transactions = transactions.filter(t => t.source === source)
        }

        // Sort by createdAt descending
        transactions.sort((a, b) => b.createdAt - a.createdAt)

        // Limit results
        transactions = transactions.slice(0, limitNum)

        return res.status(200).json({
            transactions,
            total: transactions.length,
        })
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return res.status(500).json({ error: 'Failed to fetch transactions' })
    }
}

export default requireAdmin(handler, 'support')
