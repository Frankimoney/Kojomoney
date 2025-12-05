import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { fetchAfricaTrivia, fetchGlobalTrivia, shuffleArray } from '@/services/triviaService'
import { createHash } from 'crypto'

 export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const regionParam = (searchParams.get('region') || 'africa') as 'global' | 'africa' | 'mixed'
        const refresh = searchParams.get('refresh') === '1'
        const userId = searchParams.get('userId') || null

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dateId = today.toLocaleDateString('en-CA') // YYYY-MM-DD in local timezone

        // Get or create daily trivia
        const triviaRef = db.collection('daily_trivias').doc(dateId)
        const triviaSnap = await triviaRef.get()

        if (refresh || !triviaSnap.exists) {
            // Build a daily set with minimal repetition across recent days
            const hashQuestion = (q: string) => createHash('sha256').update(q.trim().toLowerCase()).digest('hex')

            // Gather recent question hashes from the last 7 days
            const recentHashes = new Set<string>()
            const LOOKBACK_DAYS = 7
            try {
                const histSnap = await db.collection('trivia_history').orderBy('date', 'desc').limit(LOOKBACK_DAYS).get()
                histSnap.forEach(d => {
                    const h = (d.data() as any)?.hashes || []
                    h.forEach((x: string) => recentHashes.add(x))
                })
            } catch {
                // Fallback: fetch docs by date id for the past 7 days
                for (let i = 1; i <= LOOKBACK_DAYS; i++) {
                    const dt = new Date(today)
                    dt.setDate(dt.getDate() - i)
                    const id = dt.toLocaleDateString('en-CA')
                    const hsnap = await db.collection('trivia_history').doc(id).get()
                    if (hsnap.exists) {
                        const h = (hsnap.data() as any)?.hashes || []
                        h.forEach((x: string) => recentHashes.add(x))
                    }
                }
            }

            const TOTAL_TARGET = 10
            const AFRICA_TARGET = regionParam === 'global' ? 0 : (regionParam === 'mixed' ? 5 : 7)

            // Africa preferred candidates
            const africaPool = fetchAfricaTrivia()
            const africaUnique = africaPool.filter(q => !recentHashes.has(hashQuestion(q.question)))
            let selectedAfrica = shuffleArray(africaUnique).slice(0, AFRICA_TARGET)
            if (selectedAfrica.length < AFRICA_TARGET) {
                const remainingAfrica = africaPool.filter(q => !selectedAfrica.some(s => s.question === q.question))
                const needed = AFRICA_TARGET - selectedAfrica.length
                selectedAfrica = [...selectedAfrica, ...shuffleArray(remainingAfrica).slice(0, needed)]
            }

            // Global candidates to fill remaining slots
            const neededGlobal = Math.max(0, TOTAL_TARGET - selectedAfrica.length)
            let selectedGlobal: ReturnType<typeof fetchAfricaTrivia> = []
            if (neededGlobal > 0) {
                const globalPool = await fetchGlobalTrivia(30)
                const globalUnique = globalPool.filter(q => !recentHashes.has(hashQuestion(q.question)))
                selectedGlobal = shuffleArray(globalUnique).slice(0, neededGlobal)
                if (selectedGlobal.length < neededGlobal) {
                    const remainingGlobal = globalPool.filter(q => !selectedGlobal.some(s => s.question === q.question))
                    const moreNeeded = neededGlobal - selectedGlobal.length
                    selectedGlobal = [...selectedGlobal, ...shuffleArray(remainingGlobal).slice(0, moreNeeded)]
                }
            }

            const finalQuestions = shuffleArray([...selectedAfrica, ...selectedGlobal])

            // Transform to API shape with numeric correctAnswer index
            const transformed = finalQuestions.map(q => {
                const correctIndex = q.options.findIndex(opt => opt === q.correctAnswer)
                return {
                    question: q.question,
                    options: q.options,
                    correctAnswer: correctIndex >= 0 ? correctIndex : 0,
                }
            })

            await triviaRef.set({
                date: Timestamp.fromDate(today),
                questions: JSON.stringify(transformed),
                totalPoints: 50,
                isActive: true,
                createdAt: Timestamp.now(),
            })

            // Persist history for uniqueness lookback
            const hashes = finalQuestions.map(q => hashQuestion(q.question))
            await db.collection('trivia_history').doc(dateId).set({
                date: Timestamp.fromDate(today),
                hashes,
                region: regionParam,
                createdAt: Timestamp.now(),
            })
        }

        const triviaDoc = await triviaRef.get()
        const triviaData = triviaDoc.data() as any
        const questions = JSON.parse(triviaData.questions)

        let hasAttempted = false
        if (userId) {
            const attemptId = `${userId}_${dateId}`
            const attemptSnap = await db.collection('trivia_attempts').doc(attemptId).get()
            hasAttempted = attemptSnap.exists
        }

        return NextResponse.json({
            triviaId: dateId,
            questions,
            totalPoints: triviaData.totalPoints,
            hasAttempted
        })
    } catch (error) {
        console.error('Error fetching daily trivia:', error)
        return NextResponse.json({ error: 'Failed to fetch trivia' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { triviaId, userId, answers } = await request.json()

        // Check if user already attempted this trivia
        const attemptId = `${userId}_${triviaId}`
        const existingAttempt = await db.collection('trivia_attempts').doc(attemptId).get()

        if (existingAttempt.exists) {
            return NextResponse.json({ error: 'Trivia already attempted' }, { status: 400 })
        }

        // Get trivia questions
        const triviaSnap = await db.collection('daily_trivias').doc(triviaId).get()
        const trivia = triviaSnap.data() as any

        if (!trivia) {
            return NextResponse.json({ error: 'Trivia not found' }, { status: 404 })
        }

        const questions = JSON.parse(trivia.questions)

        // Calculate correct answers
        let correctAnswers = 0
        answers.forEach((answer: number, index: number) => {
            if (answer === questions[index].correctAnswer) {
                correctAnswers++
            }
        })

        // Calculate points (10 points per correct answer)
        const basePoints = correctAnswers * 10

        // Calculate streak bonus
        const userSnap = await db.collection('users').doc(userId).get()
        const user = userSnap.data() as any
        const streakBonus = user?.dailyStreak ? user.dailyStreak * 5 : 0

        const totalPoints = basePoints + streakBonus

        // Create trivia attempt
        await db.collection('trivia_attempts').doc(attemptId).set({
            userId,
            triviaId,
            answers: JSON.stringify(answers),
            correctAnswers,
            pointsEarned: totalPoints,
            streakBonus,
            startedAt: Timestamp.now(),
            completedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
        })

        // Update user points and streak
        await db.collection('users').doc(userId).update({
            totalPoints: FieldValue.increment(totalPoints),
            triviaPoints: FieldValue.increment(totalPoints),
            dailyStreak: FieldValue.increment(1),
            lastActiveDate: Timestamp.now(),
        })

        // Update daily activity
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const dateId2 = today.toLocaleDateString('en-CA')
        const dailyDocRef = db.collection('daily_activities').doc(`${userId}_${dateId2}`)
        const dailySnap = await dailyDocRef.get()
        if (dailySnap.exists) {
            await dailyDocRef.update({
                triviaPlayed: true,
                pointsEarned: FieldValue.increment(totalPoints),
                updatedAt: Timestamp.now(),
            })
        } else {
            await dailyDocRef.set({
                userId,
                date: Timestamp.fromDate(today),
                adsWatched: 0,
                storiesRead: 0,
                triviaPlayed: true,
                pointsEarned: totalPoints,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            })
        }

        // Mark completion for today's progress lookup
        await db.collection('trivia_completions').doc(`${userId}_${dateId2}`).set({
            userId,
            triviaId,
            completedAt: Timestamp.now(),
            pointsEarned: totalPoints,
            date: Timestamp.fromDate(today),
            createdAt: Timestamp.now(),
        })

        return NextResponse.json({
            success: true,
            correctAnswers,
            totalQuestions: questions.length,
            basePoints,
            streakBonus,
            totalPoints
        })
    } catch (error) {
        console.error('Error submitting trivia attempt:', error)
        return NextResponse.json({ error: 'Failed to submit attempt' }, { status: 500 })
    }
}
