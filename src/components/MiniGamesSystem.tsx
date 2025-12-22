'use client'

/**
 * Mini Games System Component
 * 
 * Temporary module for self-hosted HTML5 games during partner onboarding.
 * Displays practice games with session-based rewards and compliance messaging.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
    Gamepad2,
    ArrowLeft,
    X,
    Clock,
    Trophy,
    AlertCircle,
    Info,
    Sparkles,
    Timer,
    Coins,
    RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall } from '@/lib/api-client'

interface MiniGamesSystemProps {
    userId?: string
    onClose?: () => void
}

interface MiniGame {
    id: string
    name: string
    description: string
    thumbnail: string
    path: string
    color: string
}

interface UserStats {
    todayPoints: number
    todaySessionCount: number
    canPlay: boolean
    cooldownRemaining: number
    dailyCapRemaining: number
}

interface GameConfig {
    rewardPerSession: number
    dailyCap: number
    minDurationSeconds: number
    cooldownSeconds?: number
}

// Emoji-based thumbnails since we don't have image files
const GAME_ICONS: Record<string, string> = {
    snake: '🐍',
    breakout: '🧱',
    memory: '🃏',
    shooter: '🚀',
    puzzle: '🧩',
    '2048': '🔢',
    tetris: '🏗️',
    pong: '🎾',
}

export default function MiniGamesSystem({ userId, onClose }: MiniGamesSystemProps) {
    const [games, setGames] = useState<MiniGame[]>([])
    const [stats, setStats] = useState<UserStats | null>(null)
    const [config, setConfig] = useState<GameConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [activeGame, setActiveGame] = useState<MiniGame | null>(null)
    const [sessionToken, setSessionToken] = useState<string | null>(null)
    const [sessionStart, setSessionStart] = useState<number | null>(null)
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const [playTime, setPlayTime] = useState(0)

    const [showRewardModal, setShowRewardModal] = useState(false)
    const [lastReward, setLastReward] = useState<{ points: number; dailyTotal: number } | null>(null)
    const [gameFinished, setGameFinished] = useState(false) // Game ended but still waiting for min time

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const isCompletingRef = useRef(false) // Guard against multiple completion calls

    // Calculate min duration early for use in effects
    const minDuration = config?.minDurationSeconds || 120

    // Load stats and games
    const loadData = useCallback(async () => {
        if (!userId) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await apiCall(`/api/mini-games/stats?userId=${userId}`)
            const data = await response.json()

            if (data.success) {
                setGames(data.games || [])
                setStats(data.stats || null)
                setConfig(data.config || null)
            } else {
                setError(data.error || 'Failed to load games')
            }
        } catch (err) {
            console.error('Failed to load mini-games:', err)
            setError('Failed to load games. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Cooldown timer
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null

        if (stats && stats.cooldownRemaining > 0) {
            interval = setInterval(() => {
                setStats(prev => {
                    if (!prev || prev.cooldownRemaining <= 1) {
                        loadData() // Refresh when cooldown ends
                        return prev
                    }
                    return { ...prev, cooldownRemaining: prev.cooldownRemaining - 1 }
                })
            }, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [stats?.cooldownRemaining, loadData])

    // Game session timer
    useEffect(() => {
        if (sessionStart && !timerRef.current) {
            timerRef.current = setInterval(() => {
                const currentTime = Math.floor((Date.now() - sessionStart) / 1000)
                setPlayTime(currentTime)

                // Auto-complete when game finished and minimum time reached
                // Only call if not already completing
                if (gameFinished && currentTime >= minDuration && !isCompletingRef.current) {
                    // Clear timer immediately to prevent multiple calls
                    if (timerRef.current) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                    }
                    completeSession(currentTime)
                }
            }, 1000)
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [sessionStart, gameFinished, minDuration])

    // Handle game completion message from iframe
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'gameComplete' && sessionToken) {
                const currentPlayTime = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0

                // If game finished before minimum time, show waiting message
                if (currentPlayTime < minDuration) {
                    setGameFinished(true)
                    // Don't complete yet - let the timer continue
                } else {
                    // Time requirement met, complete immediately
                    await completeSession(event.data.duration || currentPlayTime)
                }
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [sessionToken, playTime, sessionStart, minDuration])

    const startGame = async (game: MiniGame) => {
        if (!userId) {
            setError('Please log in to play')
            return
        }

        try {
            const response = await apiCall('/api/mini-games/start', {
                method: 'POST',
                body: JSON.stringify({ userId, gameId: game.id }),
            })

            const data = await response.json()

            if (data.success) {
                setActiveGame(game)
                setSessionToken(data.sessionToken)
                setSessionStart(Date.now())
                setPlayTime(0)
            } else {
                setError(data.error || 'Failed to start game')
                if (data.cooldownRemaining) {
                    setStats(prev => prev ? { ...prev, cooldownRemaining: data.cooldownRemaining } : null)
                }
            }
        } catch (err) {
            console.error('Failed to start game:', err)
            setError('Failed to start game. Please try again.')
        }
    }

    const completeSession = async (duration: number) => {
        // Prevent multiple simultaneous completion calls
        if (!sessionToken || isCompletingRef.current) {
            console.log('[MiniGames] Skipping duplicate complete call')
            return
        }

        isCompletingRef.current = true

        try {
            const response = await apiCall('/api/mini-games/complete', {
                method: 'POST',
                body: JSON.stringify({ sessionToken, duration }),
            })

            const data = await response.json()
            console.log('[MiniGames] Complete response:', data)

            // Update stats immediately with the response data (before loadData can overwrite)
            if (data.success && data.pointsAwarded >= 0) {
                const newDailyTotal = data.dailyTotal ?? (stats?.todayPoints || 0) + data.pointsAwarded
                const newCapRemaining = data.dailyCapRemaining ?? Math.max(0, (stats?.dailyCapRemaining || 0) - data.pointsAwarded)

                console.log('[MiniGames] Updating stats:', {
                    oldPoints: stats?.todayPoints,
                    newPoints: newDailyTotal,
                    pointsAwarded: data.pointsAwarded
                })

                // Update local state immediately
                setStats(prev => prev ? {
                    ...prev,
                    todayPoints: newDailyTotal,
                    todaySessionCount: prev.todaySessionCount + 1,
                    dailyCapRemaining: newCapRemaining,
                    canPlay: newCapRemaining > 0,
                    cooldownRemaining: config?.cooldownSeconds || 300,
                    lastSessionAt: Date.now(),
                } : null)
            }

            if (data.pointsAwarded > 0) {
                setLastReward({
                    points: data.pointsAwarded,
                    dailyTotal: data.dailyTotal || 0,
                })
                setShowRewardModal(true)

                // Dispatch events to update global user balance
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('kojo:user:update'))
                    window.dispatchEvent(new CustomEvent('kojo:points:earned', {
                        detail: {
                            source: 'mini_game',
                            points: data.pointsAwarded,
                            gameId: activeGame?.id,
                        }
                    }))

                    // Sync user data
                    setTimeout(async () => {
                        try {
                            if (userId) {
                                const res = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`)
                                const userData = await res.json()
                                if (userData?.user) {
                                    localStorage.setItem('kojomoneyUser', JSON.stringify(userData.user))
                                    window.dispatchEvent(new Event('kojo:user:update'))
                                }
                            }
                        } catch (syncError) {
                            console.error('Error syncing user after game:', syncError)
                        }
                    }, 400)
                }
            } else if (data.error && !data.error.includes('cap')) {
                setError(data.error)
            }

            // Cleanup game UI
            closeGame()

            // NOTE: Do NOT call loadData() here - it would overwrite our optimistic update
            // with potentially stale data from the database
            console.log('[MiniGames] State update complete, not calling loadData')
        } catch (err) {
            console.error('Failed to complete session:', err)
        } finally {
            // Reset the completing flag after a delay to prevent immediate re-trigger
            setTimeout(() => {
                isCompletingRef.current = false
            }, 1000)
        }
    }

    const closeGame = () => {
        setActiveGame(null)
        setSessionToken(null)
        setSessionStart(null)
        setPlayTime(0)
        setGameFinished(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }

    const handleExitGame = () => {
        if (playTime >= (config?.minDurationSeconds || 30)) {
            completeSession(playTime)
        } else {
            setShowExitConfirm(true)
        }
    }

    const confirmExit = () => {
        setShowExitConfirm(false)
        closeGame()
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }


    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            {/* Game Overlay */}
            <AnimatePresence>
                {activeGame && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background flex flex-col"
                    >
                        {/* Game Header */}
                        <div className="bg-muted/80 backdrop-blur-md border-b p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleExitGame}
                                    className="h-9 w-9"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                                <div>
                                    <p className="font-semibold text-sm">{activeGame.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Play time: {formatTime(playTime)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {playTime < minDuration ? (
                                    <Badge variant="secondary" className="text-xs">
                                        <Timer className="h-3 w-3 mr-1" />
                                        {formatTime(minDuration - playTime)} left
                                    </Badge>
                                ) : (
                                    <Badge className="bg-green-500 text-white text-xs">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Reward ready!
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Progress to reward */}
                        <Progress
                            value={Math.min((playTime / minDuration) * 100, 100)}
                            className="h-1 rounded-none"
                        />

                        {/* Game iframe */}
                        <div className="flex-1 relative">
                            <iframe
                                ref={iframeRef}
                                src={activeGame.path}
                                className="w-full h-full border-none"
                                title={activeGame.name}
                            />

                            {/* Waiting for reward overlay */}
                            {gameFinished && playTime < minDuration && (
                                <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="animate-pulse mb-4">
                                        <Clock className="h-16 w-16 text-amber-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">🎮 Great Game!</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Wait a moment to claim your reward...
                                    </p>
                                    <div className="text-3xl font-bold text-amber-500 mb-2">
                                        {formatTime(minDuration - playTime)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Play for 2 minutes to earn points
                                    </p>
                                    <Progress
                                        value={(playTime / minDuration) * 100}
                                        className="w-48 h-2 mt-4"
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exit Confirmation */}
            <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Game?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Play for at least {minDuration} seconds to earn points.
                            You've only played for {playTime} seconds.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Playing</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmExit}>Exit Anyway</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRewardModal} onOpenChange={setShowRewardModal}>
                <AlertDialogContent className="text-center">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl">🎉 Points Earned!</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-center">
                                <span className="block text-4xl font-bold text-green-500">
                                    +{lastReward?.points} pts
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                    Today's total: {lastReward?.dailyTotal} / {config?.dailyCap || 50} pts
                                </span>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center">
                        <AlertDialogAction>Awesome!</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {onClose && (
                                <Button size="icon" variant="ghost" onClick={onClose} className="h-9 w-9 -ml-2">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    <Gamepad2 className="h-5 w-5 text-amber-500" />
                                    Practice Games
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Play for fun, earn bonus points
                                </p>
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={loadData}
                            disabled={isLoading}
                            className="h-9 w-9"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Compliance Notice */}
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 flex gap-3">
                        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-medium">🎮 More sponsored games coming soon!</p>
                            <p className="text-xs mt-1 opacity-80">
                                These practice games are available during partner onboarding.
                                Earn engagement points (no cash value).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Card */}
                {stats && config && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Earnings</p>
                                    <p className="text-2xl font-bold text-amber-600">
                                        {stats.todayPoints} <span className="text-sm font-normal text-muted-foreground">/ {config.dailyCap} pts</span>
                                    </p>
                                </div>
                                <Trophy className={`h-8 w-8 ${stats.todayPoints >= config.dailyCap ? 'text-amber-500' : 'text-muted-foreground/30'}`} />
                            </div>
                            <Progress
                                value={(stats.todayPoints / config.dailyCap) * 100}
                                className="h-2"
                            />

                            {stats.cooldownRemaining > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Next game in: {formatTime(stats.cooldownRemaining)}
                                </div>
                            )}

                            {stats.dailyCapRemaining <= 0 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                                    <AlertCircle className="h-4 w-4" />
                                    Daily limit reached! Come back tomorrow.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Error */}
                {error && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                        <CardContent className="p-4 flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Games Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6 h-40 bg-muted/30" />
                            </Card>
                        ))
                    ) : (
                        games.map((game) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card
                                    className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all border-l-4 ${game.color.replace('bg-', 'border-')}`}
                                    onClick={() => stats?.canPlay && startGame(game)}
                                >
                                    <CardContent className="p-0">
                                        <div className="flex">
                                            <div className={`w-20 ${game.color} flex items-center justify-center text-4xl`}>
                                                {GAME_ICONS[game.id] || '🎮'}
                                            </div>
                                            <div className="p-4 flex-1">
                                                <h3 className="font-bold mb-1">{game.name}</h3>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {game.description}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Coins className="h-3 w-3 mr-1" />
                                                        +{config?.rewardPerSession || 5} pts
                                                    </Badge>
                                                    {!stats?.canPlay && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {stats?.cooldownRemaining ? 'Cooling down...' : 'Limit reached'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* How it works */}
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                    <CardContent className="p-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-blue-800 dark:text-blue-300">
                            <Sparkles className="h-4 w-4" />
                            How it works
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-disc list-inside">
                            <li>Play for at least 2 minutes to earn points</li>
                            <li>Earn {config?.rewardPerSession || 5} engagement points per session</li>
                            <li>Maximum {Math.floor((config?.dailyCap || 25) / (config?.rewardPerSession || 5))} sessions per day</li>
                            <li>Points are added to your wallet automatically</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
