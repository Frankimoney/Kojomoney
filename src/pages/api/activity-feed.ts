/**
 * Public Activity Feed API
 * 
 * GET /api/activity-feed - Get recent anonymized activity (earnings, withdrawals)
 * 
 * Returns privacy-safe data for social proof display.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

interface ActivityItem {
    id: string
    type: 'earning' | 'withdrawal'
    name: string // Anonymized name
    amount: number
    source?: string
    timestamp: number
}

// Anonymize name: "John Doe" -> "Jo**n D."
function anonymizeName(name: string | undefined): string {
    if (!name) return 'Someone'

    const parts = name.trim().split(' ')
    const firstName = parts[0] || 'User'

    if (firstName.length <= 3) {
        return firstName.charAt(0) + '***'
    }

    // Keep first 2 and last char, mask middle
    const masked = firstName.slice(0, 2) + '*'.repeat(Math.min(3, firstName.length - 3)) + firstName.slice(-1)

    // Add last initial if available
    if (parts.length > 1 && parts[1]) {
        return masked + ' ' + parts[1].charAt(0) + '.'
    }

    return masked
}

// Get source display name
function getSourceDisplay(source: string): string {
    const sources: Record<string, string> = {
        'trivia': 'Trivia',
        'daily_trivia': 'Daily Trivia',
        'news': 'News Reading',
        'ads': 'Watching Ads',
        'survey': 'Surveys',
        'offerwall': 'Offers',
        'mission': 'Missions',
        'referral': 'Referrals',
        'check_in': 'Daily Check-in',
        'social_follow': 'Social Follow',
        'game': 'Games',
    }
    return sources[source] || source.replace(/_/g, ' ')
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const activities: ActivityItem[] = []
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

        // Fetch recent transactions - simple query (no index needed)
        try {
            const transactionsSnapshot = await db.collection('transactions')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()

            // Get user names for transactions
            const userIds = new Set<string>()
            transactionsSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.userId && data.type === 'credit' && data.createdAt >= oneDayAgo) {
                    userIds.add(data.userId)
                }
            })

            // Fetch user data
            const userNames: Record<string, string> = {}
            for (const userId of Array.from(userIds).slice(0, 10)) {
                try {
                    const userDoc = await db.collection('users').doc(userId).get()
                    if (userDoc.exists) {
                        const userData = userDoc.data()
                        userNames[userId] = userData?.displayName || userData?.name || userData?.username || 'User'
                    }
                } catch {
                    userNames[userId] = 'User'
                }
            }

            // Filter and process transactions client-side
            transactionsSnapshot.forEach(doc => {
                const data = doc.data()
                if (data.type === 'credit' && data.amount > 0 && data.createdAt >= oneDayAgo) {
                    activities.push({
                        id: doc.id,
                        type: 'earning',
                        name: anonymizeName(userNames[data.userId] || 'User'),
                        amount: data.amount,
                        source: getSourceDisplay(data.source || 'activity'),
                        timestamp: data.createdAt,
                    })
                }
            })
        } catch (e) {
            console.log('Transactions query skipped:', e)
        }

        // Fetch withdrawals - simple query (no index needed)
        try {
            const withdrawalsSnapshot = await db.collection('withdrawals')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()

            // Filter client-side for completed withdrawals
            withdrawalsSnapshot.forEach(doc => {
                const data = doc.data()
                const timestamp = data.processedAt || data.createdAt || Date.now()
                if (data.status === 'completed' && timestamp >= weekAgo) {
                    activities.push({
                        id: doc.id,
                        type: 'withdrawal',
                        name: anonymizeName(data.userName || 'User'),
                        amount: data.amountUSD || (data.amount / 10000) || 0,
                        timestamp,
                    })
                }
            })
        } catch (e) {
            console.log('Withdrawals query skipped:', e)
        }

        // If no real activities, generate demo data for social proof
        if (activities.length === 0) {
            const demoActivities: ActivityItem[] = [
                { id: 'demo1', type: 'earning', name: 'Ch***s O.', amount: 500, source: 'Trivia', timestamp: Date.now() - 300000 },
                { id: 'demo2', type: 'earning', name: 'Am***a K.', amount: 1200, source: 'Surveys', timestamp: Date.now() - 600000 },
                { id: 'demo3', type: 'earning', name: 'Da***d A.', amount: 350, source: 'News Reading', timestamp: Date.now() - 900000 },
                { id: 'demo4', type: 'withdrawal', name: 'Jo***n E.', amount: 25.00, timestamp: Date.now() - 1200000 },
                { id: 'demo5', type: 'earning', name: 'Fa***a B.', amount: 800, source: 'Offers', timestamp: Date.now() - 1500000 },
                { id: 'demo6', type: 'earning', name: 'Mi***l O.', amount: 200, source: 'Referrals', timestamp: Date.now() - 1800000 },
                { id: 'demo7', type: 'withdrawal', name: 'Sa***h I.', amount: 50.00, timestamp: Date.now() - 2100000 },
                { id: 'demo8', type: 'earning', name: 'Em***a N.', amount: 450, source: 'Watching Ads', timestamp: Date.now() - 2400000 },
            ]
            return res.status(200).json({
                activities: demoActivities,
                stats: { totalEarnedToday: 3500, activityCount: demoActivities.length }
            })
        }

        // Sort and limit
        activities.sort((a, b) => b.timestamp - a.timestamp)
        const recentActivities = activities.slice(0, 15)

        const totalEarnedToday = activities
            .filter(a => a.type === 'earning')
            .reduce((sum, a) => sum + a.amount, 0)

        return res.status(200).json({
            activities: recentActivities,
            stats: { totalEarnedToday, activityCount: recentActivities.length }
        })
    } catch (error) {
        console.error('Activity feed error:', error)
        // Return empty instead of error for graceful degradation
        return res.status(200).json({
            activities: [],
            stats: { totalEarnedToday: 0, activityCount: 0 }
        })
    }
}

export default allowCors(handler)
