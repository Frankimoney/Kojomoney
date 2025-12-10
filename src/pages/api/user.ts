import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        // Handle anonymous users
        if (userIdStr.startsWith('anon:')) {
            // For anonymous users, return minimal data
            return res.status(200).json({
                user: {
                    id: userIdStr,
                    points: 0,
                    isAnonymous: true
                }
            })
        }

        // Fetch user from Firestore
        const userDoc = await db.collection('users').doc(userIdStr).get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' })
        }

        const userData = userDoc.data()!

        // Remove sensitive fields
        const safeUser = {
            id: userIdStr,
            username: userData.username,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            totalPoints: userData.totalPoints || userData.points || 0,
            adPoints: userData.adPoints || 0,
            newsPoints: userData.newsPoints || 0,
            triviaPoints: userData.triviaPoints || 0,
            points: userData.points || 0,
            totalEarnings: userData.totalEarnings || 0,
            referralCode: userData.referralCode,
            referralCount: userData.referralCount || 0,
            referralRewards: userData.referralRewards || 0,
            dailyStreak: userData.dailyStreak || 0,
            lastActiveDate: userData.lastActiveDate,
            lastTriviaDate: userData.lastTriviaDate,
            isEmailVerified: userData.isEmailVerified || false,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            profileImageUrl: userData.profileImageUrl,
            country: userData.country,
            region: userData.region,
            todayProgress: userData.todayProgress || {
                adsWatched: 0,
                storiesRead: 0,
                triviaCompleted: Boolean(userData.lastTriviaDate === new Date().toISOString().split('T')[0])
            }
        }

        return res.status(200).json({ user: safeUser })
    } catch (error) {
        console.error('Error fetching user:', error)
        return res.status(500).json({ error: 'Failed to fetch user' })
    }
}

export default allowCors(handler)
