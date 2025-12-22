/**
 * Mini-Game Service
 * 
 * Temporary module for self-hosted HTML5 games during partner onboarding.
 * Provides session management and reward validation with strict controls.
 */

import { db } from '@/lib/firebase-admin'
import { generateRequestId } from '@/lib/games'

// =============================================================================
// Configuration
// =============================================================================

export interface MiniGameConfig {
    enabled: boolean
    rewardPerSession: number      // Points per completed game
    dailyCap: number              // Max points per day
    minDurationSeconds: number    // Minimum play time required
    cooldownSeconds: number       // Time between sessions
}

export function getMiniGameConfig(): MiniGameConfig {
    return {
        enabled: process.env.MINI_GAMES_ENABLED !== 'false',
        rewardPerSession: parseInt(process.env.MINI_GAMES_REWARD_PER_SESSION || '5'),
        dailyCap: parseInt(process.env.MINI_GAMES_DAILY_CAP || '25'),           // 5 sessions max
        minDurationSeconds: parseInt(process.env.MINI_GAMES_MIN_DURATION_SECONDS || '120'), // 2 minutes
        cooldownSeconds: parseInt(process.env.MINI_GAMES_COOLDOWN_SECONDS || '300'),        // 5 minutes
    }
}

// =============================================================================
// Types
// =============================================================================

export interface MiniGame {
    id: string
    name: string
    description: string
    thumbnail: string
    path: string
    color: string
}

export interface MiniGameSession {
    id: string
    userId: string
    gameId: string
    sessionToken: string
    startedAt: number
    completedAt?: number
    durationSeconds?: number
    pointsAwarded?: number
    status: 'active' | 'completed' | 'expired' | 'invalid'
}

export interface MiniGameUserStats {
    todayPoints: number
    todaySessionCount: number
    lastSessionAt: number | null
    canPlay: boolean
    cooldownRemaining: number
    dailyCapRemaining: number
}

export interface StartSessionResult {
    success: boolean
    sessionToken?: string
    gameUrl?: string
    error?: string
    cooldownRemaining?: number
}

export interface CompleteSessionResult {
    success: boolean
    pointsAwarded: number
    error?: string
    dailyTotal?: number
    dailyCapRemaining?: number
}

// =============================================================================
// Available Games
// =============================================================================

export const MINI_GAMES: MiniGame[] = [
    {
        id: 'snake',
        name: 'Snake Classic',
        description: 'Guide the snake to eat food and grow!',
        thumbnail: '/mini-games/thumbnails/snake.png',
        path: '/mini-games/snake.html',
        color: 'bg-green-500',
    },
    {
        id: 'breakout',
        name: 'Brick Breaker',
        description: 'Destroy all bricks with your ball!',
        thumbnail: '/mini-games/thumbnails/breakout.png',
        path: '/mini-games/breakout.html',
        color: 'bg-blue-500',
    },
    {
        id: 'memory',
        name: 'Memory Match',
        description: 'Find all matching pairs of cards!',
        thumbnail: '/mini-games/thumbnails/memory.png',
        path: '/mini-games/memory.html',
        color: 'bg-purple-500',
    },
    {
        id: 'shooter',
        name: 'Space Shooter',
        description: 'Defend Earth from alien invaders!',
        thumbnail: '/mini-games/thumbnails/shooter.png',
        path: '/mini-games/shooter.html',
        color: 'bg-red-500',
    },
    {
        id: 'puzzle',
        name: 'Slide Puzzle',
        description: 'Arrange tiles to complete the picture!',
        thumbnail: '/mini-games/thumbnails/puzzle.png',
        path: '/mini-games/puzzle.html',
        color: 'bg-amber-500',
    },
]

// =============================================================================
// Session Management
// =============================================================================

/**
 * Get user's mini-game stats for today.
 */
export async function getUserMiniGameStats(userId: string): Promise<MiniGameUserStats> {
    const config = getMiniGameConfig()
    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)

    let todayPoints = 0
    let todaySessionCount = 0
    let lastSessionAt: number | null = null

    if (db) {
        try {
            // Get today's completed sessions
            const sessionsSnapshot = await db
                .collection('mini_game_sessions')
                .where('userId', '==', userId)
                .where('status', '==', 'completed')
                .where('completedAt', '>=', todayStart)
                .get()

            sessionsSnapshot.forEach((doc) => {
                const session = doc.data() as MiniGameSession
                todayPoints += session.pointsAwarded || 0
                todaySessionCount++
                if (!lastSessionAt || (session.completedAt && session.completedAt > lastSessionAt)) {
                    lastSessionAt = session.completedAt || null
                }
            })
        } catch (err) {
            console.error('Failed to get mini-game stats:', err)
        }
    }

    // Calculate cooldown
    const cooldownRemaining = lastSessionAt
        ? Math.max(0, (lastSessionAt + config.cooldownSeconds * 1000) - now) / 1000
        : 0

    // Calculate daily cap remaining
    const dailyCapRemaining = Math.max(0, config.dailyCap - todayPoints)

    return {
        todayPoints,
        todaySessionCount,
        lastSessionAt,
        canPlay: dailyCapRemaining > 0 && cooldownRemaining <= 0,
        cooldownRemaining: Math.ceil(cooldownRemaining),
        dailyCapRemaining,
    }
}

/**
 * Start a mini-game session.
 */
export async function startMiniGameSession(
    userId: string,
    gameId: string
): Promise<StartSessionResult> {
    const config = getMiniGameConfig()

    if (!config.enabled) {
        return { success: false, error: 'Mini-games are currently unavailable' }
    }

    const game = MINI_GAMES.find((g) => g.id === gameId)
    if (!game) {
        return { success: false, error: 'Game not found' }
    }

    // Check user stats
    const stats = await getUserMiniGameStats(userId)

    if (stats.cooldownRemaining > 0) {
        return {
            success: false,
            error: 'Please wait before playing again',
            cooldownRemaining: stats.cooldownRemaining,
        }
    }

    if (stats.dailyCapRemaining <= 0) {
        return { success: false, error: 'Daily limit reached. Come back tomorrow!' }
    }

    // Create session
    const sessionToken = generateRequestId()
    const session: Omit<MiniGameSession, 'id'> = {
        userId,
        gameId,
        sessionToken,
        startedAt: Date.now(),
        status: 'active',
    }

    if (db) {
        try {
            const docRef = await db.collection('mini_game_sessions').add(session)
            console.log({
                event: 'mini_game_session_started',
                sessionId: docRef.id,
                userId,
                gameId,
            })
        } catch (err) {
            console.error('Failed to create mini-game session:', err)
            return { success: false, error: 'Failed to start game' }
        }
    }

    return {
        success: true,
        sessionToken,
        gameUrl: `${game.path}?session=${sessionToken}`,
    }
}

/**
 * Complete a mini-game session and award points.
 */
export async function completeMiniGameSession(
    sessionToken: string,
    clientDuration?: number
): Promise<CompleteSessionResult> {
    const config = getMiniGameConfig()

    if (!config.enabled) {
        return { success: false, pointsAwarded: 0, error: 'Mini-games are currently unavailable' }
    }

    if (!db) {
        return { success: false, pointsAwarded: 0, error: 'Database unavailable' }
    }

    try {
        // Find session
        const sessionSnapshot = await db
            .collection('mini_game_sessions')
            .where('sessionToken', '==', sessionToken)
            .limit(1)
            .get()

        if (sessionSnapshot.empty) {
            return { success: false, pointsAwarded: 0, error: 'Session not found' }
        }

        const sessionDoc = sessionSnapshot.docs[0]
        const session = { id: sessionDoc.id, ...sessionDoc.data() } as MiniGameSession

        // Check if already completed
        if (session.status !== 'active') {
            return { success: false, pointsAwarded: 0, error: 'Session already processed' }
        }

        // Calculate duration
        const now = Date.now()
        const durationSeconds = Math.floor((now - session.startedAt) / 1000)

        // Use server duration if client duration is suspiciously higher
        const trustedDuration = clientDuration && clientDuration < durationSeconds
            ? clientDuration
            : durationSeconds

        // Check minimum duration
        if (trustedDuration < config.minDurationSeconds) {
            await sessionDoc.ref.update({
                status: 'invalid',
                completedAt: now,
                durationSeconds: trustedDuration,
                pointsAwarded: 0,
            })
            return {
                success: false,
                pointsAwarded: 0,
                error: `Play for at least ${config.minDurationSeconds} seconds to earn points`,
            }
        }

        // Get current daily stats
        const stats = await getUserMiniGameStats(session.userId)

        // Calculate points (respect daily cap)
        const pointsToAward = Math.min(config.rewardPerSession, stats.dailyCapRemaining)

        if (pointsToAward <= 0) {
            await sessionDoc.ref.update({
                status: 'completed',
                completedAt: now,
                durationSeconds: trustedDuration,
                pointsAwarded: 0,
            })
            return {
                success: true,
                pointsAwarded: 0,
                error: 'Daily cap reached',
                dailyTotal: stats.todayPoints,
                dailyCapRemaining: 0,
            }
        }

        // Credit points to wallet
        const userRef = db.collection('users').doc(session.userId)
        const userDoc = await userRef.get()

        if (userDoc.exists) {
            const userData = userDoc.data()!
            const currentTotalPoints = userData.totalPoints || userData.points || 0
            const currentGamePoints = userData.gamePoints || 0

            await userRef.update({
                totalPoints: currentTotalPoints + pointsToAward,
                points: currentTotalPoints + pointsToAward,  // Keep in sync
                gamePoints: currentGamePoints + pointsToAward,  // Track game-specific points
            })

            // Log transaction
            await db.collection('transactions').add({
                userId: session.userId,
                type: 'mini_game_reward',
                amount: pointsToAward,
                description: `Practice game reward - ${MINI_GAMES.find(g => g.id === session.gameId)?.name || session.gameId}`,
                gameId: session.gameId,
                sessionId: session.id,
                createdAt: now,
            })
        }

        // Update session
        await sessionDoc.ref.update({
            status: 'completed',
            completedAt: now,
            durationSeconds: trustedDuration,
            pointsAwarded: pointsToAward,
        })

        console.log({
            event: 'mini_game_session_completed',
            sessionId: session.id,
            userId: session.userId,
            gameId: session.gameId,
            durationSeconds: trustedDuration,
            pointsAwarded: pointsToAward,
        })

        return {
            success: true,
            pointsAwarded: pointsToAward,
            dailyTotal: stats.todayPoints + pointsToAward,
            dailyCapRemaining: stats.dailyCapRemaining - pointsToAward,
        }
    } catch (err) {
        console.error('Failed to complete mini-game session:', err)
        return { success: false, pointsAwarded: 0, error: 'Failed to complete game' }
    }
}

export default {
    getMiniGameConfig,
    getUserMiniGameStats,
    startMiniGameSession,
    completeMiniGameSession,
    MINI_GAMES,
}
