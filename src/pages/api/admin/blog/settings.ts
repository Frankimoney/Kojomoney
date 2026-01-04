import { NextApiRequest, NextApiResponse } from 'next'
import { db, adminAuth } from '@/lib/firebase-admin'

// Helper to verify admin token
async function verifyAdmin(req: NextApiRequest) {
    const token = req.headers.authorization?.split('Bearer ')[1]
    if (!token) return null
    try {
        const decodedToken = await adminAuth.verifyIdToken(token)
        return decodedToken
    } catch (e) {
        return null
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Basic CORS for development (adjust as needed for prod)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    // Verify Admin
    const admin = await verifyAdmin(req)
    if (!admin) {
        return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

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
            const { googleAnalyticsId, googleSearchConsoleCode } = JSON.parse(req.body)

            await settingsRef.set({
                googleAnalyticsId: googleAnalyticsId || '',
                googleSearchConsoleCode: googleSearchConsoleCode || '',
                updatedAt: new Date().toISOString(),
                updatedBy: admin.uid
            }, { merge: true })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Save error:', error)
            return res.status(500).json({ success: false, error: 'Failed to save settings' })
        }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
}
