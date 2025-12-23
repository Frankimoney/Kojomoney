import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { getTriviaByRegion, shuffleArray, type TriviaQuestion, type Region } from '@/services/triviaService'
import crypto from 'crypto'
import { allowCors } from '@/lib/cors'
import { getHappyHourBonus } from '@/lib/happyHour'
import { getStreakMultiplier } from '@/lib/points-config'

export const dynamic = 'force-dynamic'

interface ProcessedQuestion {
    question: string
    options: string[]
    correctAnswer: number // Index of correct answer
}

// Helper keys
function getTodayKey(): string {
    return new Date().toISOString().split('T')[0]
}

function getCurrentWeekKey(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
}


async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default allowCors(handler)

// African Country Codes (ISO 3166-1 alpha-2)
const AFRICA_CODES = new Set([
    'NG', 'GH', 'KE', 'ZA', 'EG', 'MA', 'DZ', 'TN', 'ET', 'UG',
    'TZ', 'RW', 'CM', 'CI', 'SN', 'ZW', 'ZM', 'AO', 'MZ', 'MG',
    'NA', 'BW', 'LR', 'SL', 'BJ', 'TG', 'BF', 'NE', 'ML', 'GM'
])

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        let { region, userId } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId

        // Auto-detect region if not specified or set to 'auto'
        if (!region || region === 'auto') {
            const country = (req.headers['x-vercel-ip-country'] as string)?.toUpperCase()
            // If country is in Africa, use 'africa', otherwise 'global'
            // Default to 'global' if location unknown (safer for wider audience)
            region = (country && AFRICA_CODES.has(country)) ? 'africa' : 'global'
        }

        const regionStr = Array.isArray(region) ? region[0] : region

        // Check daily attempt for signed-in users
        let hasAttempted = false
        if (userIdStr && db) {
            const today = new Date().toISOString().split('T')[0]
            const attemptRef = db.collection('trivia_attempts').doc(`${userIdStr}_${today}`)
            const attemptDoc = await attemptRef.get()
            hasAttempted = attemptDoc.exists
        }

        // Fetch trivia from service
        const rawQuestions = await getTriviaByRegion(regionStr as Region)

        // Take only 5 questions for daily trivia
        const selectedQuestions = shuffleArray(rawQuestions).slice(0, 5)

        // Process questions: convert correctAnswer to index
        const processedQuestions: ProcessedQuestion[] = selectedQuestions.map(q => {
            const correctIndex = q.options.findIndex(opt => opt === q.correctAnswer)
            return {
                question: q.question,
                options: q.options,
                correctAnswer: correctIndex !== -1 ? correctIndex : 0
            }
        })

        // Generate triviaId for tracking
        const triviaId = crypto.randomBytes(16).toString('hex')

        // Store trivia session temporarily (if db available)
        if (db) {
            try {
                await db.collection('trivia_sessions').doc(triviaId).set({
                    questions: processedQuestions.map((q, i) => ({
                        question: q.question,
                        correctAnswer: q.correctAnswer
                    })),
                    createdAt: Date.now(),
                    userId: userIdStr || null,
                    region: regionStr
                })
            } catch (e) {
                console.error('Failed to store trivia session:', e)
            }
        }

        return res.status(200).json({
            questions: processedQuestions,
            totalPoints: processedQuestions.length * 10,
            triviaId,
            hasAttempted
        })
    } catch (error) {
        console.error('Error fetching trivia:', error)
        return res.status(500).json({ error: 'Failed to fetch trivia' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { triviaId, userId, answers } = req.body

        if (!triviaId || !userId || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not available' })
        }

        // Get the trivia session
        const sessionDoc = await db.collection('trivia_sessions').doc(triviaId).get()
        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Trivia session not found' })
        }

        const session = sessionDoc.data()!
        const questions = session.questions

        // Check daily attempt
        const today = new Date().toISOString().split('T')[0]
        const attemptRef = db.collection('trivia_attempts').doc(`${userId}_${today}`)
        const attemptDoc = await attemptRef.get()

        if (attemptDoc.exists) {
            return res.status(400).json({
                error: 'Already attempted today',
                hasAttempted: true
            })
        }

        // Award points to user - get userRef first
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        // Calculate score
        let correctCount = 0
        for (let i = 0; i < Math.min(answers.length, questions.length); i++) {
            if (answers[i] === questions[i].correctAnswer) {
                correctCount++
            }
        }

        // Get streak for tier-based multiplier
        const currentStreak = userDoc.exists ? (userDoc.data()?.dailyStreak || 0) : 0
        const streakInfo = getStreakMultiplier(currentStreak)

        // Calculate base points (10 per correct answer)
        const basePoints = correctCount * 10

        // Apply both Happy Hour AND Streak multipliers
        const happyHourInfo = getHappyHourBonus(basePoints)
        const combinedMultiplier = happyHourInfo.multiplier * streakInfo.multiplier
        const pointsEarned = Math.floor(basePoints * combinedMultiplier)

        // Record the attempt
        await attemptRef.set({
            userId,
            triviaId,
            score: correctCount,
            total: questions.length,
            basePoints,
            happyHourMultiplier: happyHourInfo.multiplier,
            streakMultiplier: streakInfo.multiplier,
            pointsEarned,
            createdAt: Date.now(),
            date: today
        })

        if (userDoc.exists) {
            const userData = userDoc.data()!
            const currentPoints = userData.totalPoints || userData.points || 0
            const weekKey = getCurrentWeekKey()
            const now = Date.now()

            await userRef.update({
                totalPoints: currentPoints + pointsEarned,
                points: currentPoints + pointsEarned,
                triviaPoints: (userData.triviaPoints || 0) + pointsEarned,
                lastTriviaDate: today,
                triviaCompleted: true, // Mark as completed for today
                lastActiveDate: today, // Sync active date
                updatedAt: now
            })

            // Build bonus description
            const bonusLabels: string[] = []
            if (happyHourInfo.bonusLabel) bonusLabels.push(happyHourInfo.bonusLabel)
            if (streakInfo.multiplier > 1) bonusLabels.push(`${streakInfo.tier.label} ${streakInfo.multiplier}x`)
            const bonusDescription = bonusLabels.length > 0 ? ` (${bonusLabels.join(' + ')})` : ''

            // Create Transaction with bonus info
            await db.collection('transactions').add({
                userId,
                type: 'credit',
                amount: pointsEarned,
                baseAmount: basePoints,
                happyHourMultiplier: happyHourInfo.multiplier,
                streakMultiplier: streakInfo.multiplier,
                source: 'trivia',
                status: 'completed',
                description: `Daily Trivia Score: ${correctCount}/${questions.length}${bonusDescription}`,
                createdAt: now
            })

            // Update Tournament Points (Add 20 points for playing trivia)
            const entrySnapshot = await db.collection('tournament_entries')
                .where('weekKey', '==', weekKey)
                .where('userId', '==', userId)
                .limit(1)
                .get()

            if (!entrySnapshot.empty) {
                const entryDoc = entrySnapshot.docs[0]
                await entryDoc.ref.update({
                    points: (entryDoc.data().points || 0) + 20, // 20 points for trivia
                    lastUpdated: now
                })
            } else {
                // Auto-join
                await db.collection('tournament_entries').add({
                    weekKey,
                    userId,
                    name: userData.name || userData.username || 'Anonymous',
                    avatar: userData.avatarUrl || '',
                    points: 20,
                    joinedAt: now,
                    lastUpdated: now
                })
            }
        }

        // Clean up the session
        await db.collection('trivia_sessions').doc(triviaId).delete()

        return res.status(200).json({
            success: true,
            score: correctCount,
            total: questions.length,
            pointsEarned,
            message: `You scored ${correctCount}/${questions.length} and earned ${pointsEarned} points!`
        })
    } catch (error) {
        console.error('Error submitting trivia:', error)
        return res.status(500).json({ error: 'Failed to submit trivia' })
    }
}
