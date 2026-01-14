import { db, adminAuth } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { requestId, action } = req.body // action: 'approve' | 'reject'

        if (!requestId || !action) {
            return res.status(400).json({ error: 'Missing parameters' })
        }

        if (!db || !adminAuth) {
            return res.status(500).json({ error: 'Database/Auth not initialized' })
        }

        const requestRef = db.collection('deletion_requests').doc(requestId)
        const requestDoc = await requestRef.get()

        if (!requestDoc.exists) {
            return res.status(404).json({ error: 'Request not found' })
        }

        const requestData = requestDoc.data()

        if (action === 'approve') {
            const userId = requestData?.userId

            // 1. Delete from Authentication
            try {
                await adminAuth.deleteUser(userId)
            } catch (e) {
                console.log('Auth user already deleted or error', e)
            }

            // 2. Delete User Doc (or mark deletion)
            // We delete the user document to fully comply with "account deletion"
            await db.collection('users').doc(userId).delete()

            // 3. Update request status
            await requestRef.update({
                status: 'approved',
                processedAt: Date.now()
            })
        } else if (action === 'reject') {
            await requestRef.update({
                status: 'rejected',
                processedAt: Date.now()
            })
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error processing deletion:', error)
        return res.status(500).json({ error: 'Failed to process' })
    }
}

export default allowCors(handler)
