import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

/**
 * Test Seed API - DEVELOPMENT ONLY
 * 
 * Creates test users and data for testing purposes.
 * This endpoint should be disabled in production!
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Test endpoints are disabled in production' })
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    const { action, userId, points } = req.body

    try {
        if (action === 'create-test-user') {
            const testUserId = userId || `test-user-${Date.now()}`
            const testPoints = points || 50000

            const testUser = {
                id: testUserId,
                email: `${testUserId}@test.kojomoney.com`,
                name: 'Test Withdrawal User',
                totalPoints: testPoints,
                adPoints: Math.floor(testPoints * 0.25),
                newsPoints: Math.floor(testPoints * 0.25),
                triviaPoints: Math.floor(testPoints * 0.25),
                gamePoints: Math.floor(testPoints * 0.25),
                dailyStreak: 30,
                createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
                emailVerified: true,
                phoneVerified: false,
                country: 'US',
                updatedAt: Date.now()
            }

            await db.collection('users').doc(testUserId).set(testUser)

            return res.status(200).json({
                success: true,
                message: 'Test user created',
                user: {
                    id: testUserId,
                    email: testUser.email,
                    totalPoints: testPoints,
                    tier: 'regular' // 30 days old, email verified, no phone = regular
                }
            })
        }

        if (action === 'add-points') {
            if (!userId) {
                return res.status(400).json({ error: 'userId is required' })
            }

            const userRef = db.collection('users').doc(userId)
            const userDoc = await userRef.get()

            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' })
            }

            const currentPoints = userDoc.data()!.totalPoints || 0
            const newPoints = currentPoints + (points || 10000)

            await userRef.update({
                totalPoints: newPoints,
                updatedAt: Date.now()
            })

            return res.status(200).json({
                success: true,
                message: 'Points added',
                previousPoints: currentPoints,
                addedPoints: points || 10000,
                newTotal: newPoints
            })
        }

        if (action === 'cleanup-test-users') {
            // Delete all test users
            const testUsersSnapshot = await db.collection('users')
                .where('email', '>=', 'test-')
                .where('email', '<', 'test-\uf8ff')
                .get()

            let deleted = 0
            for (const doc of testUsersSnapshot.docs) {
                if (doc.data().email?.includes('@test.kojomoney.com')) {
                    await doc.ref.delete()
                    deleted++
                }
            }

            return res.status(200).json({
                success: true,
                message: `Cleaned up ${deleted} test user(s)`
            })
        }

        return res.status(400).json({ error: 'Unknown action' })

    } catch (error: any) {
        console.error('Test seed error:', error)
        return res.status(500).json({ error: error.message || 'Internal error' })
    }
}

export default handler
