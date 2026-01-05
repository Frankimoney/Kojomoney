import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/admin-auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const settingsRef = db.collection('settings').doc('blog')

    // GET Settings
    if (req.method === 'GET') {
        try {
            const doc = await settingsRef.get()
            if (!doc.exists) {
                return res.status(200).json({ success: true, data: {} })
            }
            return res.status(200).json({ success: true, data: doc.data() })
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Failed to fetch settings' })
        }
    }

    // UPDATE Settings
    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
            const { googleAnalyticsId, googleSearchConsoleCode } = body

            await settingsRef.set({
                googleAnalyticsId: googleAnalyticsId || '',
                googleSearchConsoleCode: googleSearchConsoleCode || '',
                updatedAt: new Date().toISOString(),
                updatedBy: (req as any).adminEmail || 'admin'
            }, { merge: true })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Save error:', error)
            return res.status(500).json({ success: false, error: 'Failed to save settings' })
        }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
}

export default requireAdmin(handler)
