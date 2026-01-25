import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'



async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

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

        // Build todayProgress with proper defaults and date validation
        const today = new Date().toISOString().split('T')[0]
        const isToday = userData.lastActiveDate === today
        const existingProgress = userData.todayProgress || {}

        // Check if trivia was completed today (from todayProgress or legacy field)
        const triviaCompletedToday = isToday
            ? (existingProgress.triviaCompleted || userData.lastTriviaDate === today)
            : false

        // Get adsWatched - check both todayProgress and root-level (legacy) field
        const adsWatchedToday = isToday
            ? (existingProgress.adsWatched || userData.adsWatched || 0)
            : 0

        const todayProgress = {
            adsWatched: adsWatchedToday,
            storiesRead: isToday ? (existingProgress.storiesRead || 0) : 0,
            triviaCompleted: triviaCompletedToday
        }

        // Validate streak - reset if user missed more than 1 day
        let validatedStreak = userData.dailyStreak || 0
        if (userData.lastActiveDate && validatedStreak > 0) {
            const lastActive = new Date(userData.lastActiveDate)
            const todayDate = new Date(today)
            const yesterday = new Date(todayDate)
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]

            // Streak is only valid if lastActiveDate is today or yesterday
            if (userData.lastActiveDate !== today && userData.lastActiveDate !== yesterdayStr) {
                // User missed a day - streak is broken
                validatedStreak = 0

                // Also update the database to reflect the broken streak
                try {
                    await db.collection('users').doc(userIdStr).update({
                        dailyStreak: 0,
                        updatedAt: Date.now()
                    })
                } catch (updateError) {
                    console.error('Failed to reset broken streak:', updateError)
                }
            }
        }

        // ... (existing code)

        // HEALING: Auto-reconciliate balance from transactions if it looks suspicious
        // or just do it once per session? doing it on every fetch is expensive but 100% reliable.
        // For this critical fix phase, we will do it.
        const transactionsSnapshot = await db.collection('transactions')
            .where('userId', '==', userData.id || userIdStr) // Handle potentially missing id in bad docs
            .get();

        if (!transactionsSnapshot.empty) {
            let calculatedPoints = 0;
            let calculatedEarnings = 0;

            transactionsSnapshot.forEach(doc => {
                const tx = doc.data();
                const amount = Number(tx.amount || 0);

                if (tx.type === 'credit' && tx.status === 'completed') {
                    // Earnings, refunds, etc.
                    calculatedPoints += amount;

                    // Only count earnings for totalEarnings (exclude refunds)
                    if (['offerwall', 'survey', 'referral', 'bonus', 'daily_reward', 'game', 'trivia'].includes(tx.source)) {
                        calculatedEarnings += amount;
                    }
                } else if (tx.type === 'debit') {
                    // Handle Debits

                    // 1. 'withdrawal' source is an Admin Approval Log (duplicate of request). Ignore it.
                    if (tx.source === 'withdrawal') return;

                    // 2. 'withdrawal_request' is the actual deduction. Count it (pending or completed).
                    if (tx.source === 'withdrawal_request') {
                        calculatedPoints -= amount;
                        return;
                    }

                    // 3. Other debits must be completed to count (e.g. reversals)
                    if (tx.status === 'completed') {
                        calculatedPoints -= amount;
                    }
                }
            });

            // Ensure non-negative
            calculatedPoints = Math.max(0, calculatedPoints);

            // Compare with stored values
            const storedPoints = Math.max(userData.points || 0, userData.totalPoints || 0);

            // If calculated is HIGHER, we definitely missed something. Upgrade the balance.
            if (calculatedPoints > storedPoints) {
                console.log(`[Healing] User ${userIdStr} mismatch! Stored: ${storedPoints}, Calculated: ${calculatedPoints}. Fixing...`);

                await db.collection('users').doc(userIdStr).update({
                    points: calculatedPoints,
                    totalPoints: calculatedPoints,
                    // Safe to update earnings? Yes
                    totalEarnings: Math.max(userData.totalEarnings || 0, calculatedEarnings),
                    updatedAt: Date.now()
                });

                userData.points = calculatedPoints;
                userData.totalPoints = calculatedPoints;
            }
        }

        // Remove sensitive fields
        const safeUser = {
            id: userIdStr,
            username: userData.username,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            totalPoints: Math.max(userData.totalPoints || 0, userData.points || 0),
            adPoints: userData.adPoints || 0,
            newsPoints: userData.newsPoints || 0,
            triviaPoints: userData.triviaPoints || 0,
            gamePoints: userData.gamePoints || 0,
            points: userData.points || 0,
            totalEarnings: userData.totalEarnings || 0,
            referralCode: userData.referralCode,
            referralCount: userData.referralCount || 0,
            referralRewards: userData.referralRewards || 0,
            dailyStreak: validatedStreak, // Use validated streak
            lastActiveDate: userData.lastActiveDate,
            lastTriviaDate: userData.lastTriviaDate,
            emailVerified: userData.emailVerified || false,
            hasWithdrawn: userData.hasWithdrawn || false,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            profileImageUrl: userData.profileImageUrl,
            country: userData.country,
            region: userData.region,
            todayProgress
        }

        return res.status(200).json({ user: safeUser })
    } catch (error) {
        console.error('Error fetching user:', error)
        return res.status(500).json({ error: 'Failed to fetch user' })
    }
}

export default allowCors(handler)

