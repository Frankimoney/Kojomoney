'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Circle, Flame, Timer, Gift, Lock, Calendar, Trophy, ChevronRight, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { apiJson } from '@/lib/api-client'

interface Challenge {
    id: string
    title: string
    description: string
    current: number
    target: number
    reward: number
    isClaimed: boolean
    icon?: any
}

interface DailyChallengeSystemProps {
    userId?: string
    onClose?: () => void
}

export default function DailyChallengeSystem({ userId, onClose }: DailyChallengeSystemProps) {
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [streak, setStreak] = useState(0)
    const [weeklyEarnings, setWeeklyEarnings] = useState(0)
    const [timeLeft, setTimeLeft] = useState('')
    const [showBonusModal, setShowBonusModal] = useState(false)
    const [bonusClaimed, setBonusClaimed] = useState(false)
    const [bonusAmount, setBonusAmount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    // Derived state
    const allCompleted = challenges.length > 0 && challenges.every(c => c.current >= c.target)
    const canClaimBonus = allCompleted && !bonusClaimed

    // Initial Data Load
    useEffect(() => {
        loadData()
    }, [userId])

    // Timer Logic
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date()
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)

            const diff = tomorrow.getTime() - now.getTime()
            const h = Math.floor(diff / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${h}h ${m}m ${s}s`)
        }

        updateTimer() // Initial call
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [])

    const loadData = async () => {
        if (!userId) return

        try {
            const response = await apiJson<any>(`/api/daily-challenges?userId=${userId}`)

            if (response) {
                setChallenges(response.challenges || [])
                setBonusClaimed(response.bonusClaimed || false)
                setBonusAmount(response.bonusReward || 0)

                // For streak/weekly - in real app would come from user profile or separate stats endpoint
                // We'll trust the API response logic we previously set up or default
            }
        } catch (error) {
            console.error('Error loading daily challenges:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClaim = async (id: string) => {
        if (!userId) return

        try {
            const response = await apiJson<any>('/api/daily-challenges', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    action: 'claim_reward',
                    challengeId: id
                })
            })

            if (response.success) {
                triggerConfetti(false)
                // Update local state without full reload
                setChallenges(prev => prev.map(c => {
                    if (c.id === id) {
                        return { ...c, isClaimed: true }
                    }
                    return c
                }))
            }
        } catch (error) {
            console.error('Error claiming reward:', error)
        }
    }

    const claimDailyBonus = async () => {
        if (!userId) return

        try {
            const response = await apiJson<any>('/api/daily-challenges', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    action: 'claim_bonus'
                })
            })

            if (response.success) {
                setBonusClaimed(true)
                setShowBonusModal(true)
                triggerConfetti(true)
            }
        } catch (error) {
            console.error('Error claiming bonus:', error)
        }
    }

    const triggerConfetti = (big: boolean) => {
        // Use setTimeout and try-catch for Android WebView compatibility
        setTimeout(() => {
            try {
                if (typeof confetti !== 'function') return

                // Reduce particles on mobile
                const isNative = typeof window !== 'undefined' && (
                    ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
                    (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
                )

                const baseOptions = {
                    zIndex: 9999,
                    useWorker: false,
                    disableForReducedMotion: false
                } as any

                if (big) {
                    confetti({
                        ...baseOptions,
                        particleCount: isNative ? 100 : 200,
                        spread: 100,
                        origin: { y: 0.6 }
                    })
                } else {
                    confetti({
                        ...baseOptions,
                        particleCount: isNative ? 30 : 50,
                        spread: 40,
                        origin: { y: 0.8 }
                    })
                }
            } catch (e) {
                console.error('[DailyChallenges] Confetti error:', e)
            }
        }, 50)
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-900/50 pb-20 relative font-sans">
            {/* HEADER */}
            <div className="bg-white dark:bg-zinc-950 border-b sticky top-0 z-10">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {onClose && (
                            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                            Daily Challenges
                        </h1>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-md mx-auto">

                {/* STATUS BAR */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-none shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-xs font-semibold uppercase tracking-wider">Streak</p>
                                <p className="text-2xl font-bold flex items-center gap-1">
                                    {streak} <Flame className="h-5 w-5 text-yellow-300 fill-yellow-300 animate-pulse" />
                                </p>
                            </div>
                            <div className="bg-white/20 p-2 rounded-full">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-zinc-900 border-none shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Weekly Earned</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    +{weeklyEarnings}
                                </p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* TIMER BANNER */}
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 py-2 rounded-lg border border-dashed">
                    <Timer className="h-4 w-4" />
                    Reset in: <span className="font-mono text-foreground">{timeLeft}</span>
                </div>

                {/* CHALLENGE LIST */}
                <div className="space-y-3">
                    {challenges.map((challenge, idx) => {
                        const isDone = challenge.current >= challenge.target
                        const progress = (challenge.current / challenge.target) * 100

                        return (
                            <motion.div
                                key={challenge.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className={`border-l-4 transition-all ${isDone ? 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-l-gray-300 dark:border-l-gray-700'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full transition-colors ${isDone ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <h3 className={`font-semibold ${isDone ? 'text-green-900 dark:text-green-100' : ''}`}>{challenge.title}</h3>
                                                    <p className="text-xs text-muted-foreground">{challenge.description}</p>
                                                </div>
                                            </div>
                                            <Badge variant={isDone && !challenge.isClaimed ? "default" : "secondary"} className={`${isDone && !challenge.isClaimed ? 'animate-pulse bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}>
                                                +{challenge.reward} pts
                                            </Badge>
                                        </div>

                                        <div className="mt-3 flex items-center gap-3">
                                            <Progress
                                                value={progress}
                                                className={`h-2 flex-1 ${isDone ? 'bg-green-100 dark:bg-green-900 [&>div]:bg-green-500' : ''}`}
                                            />
                                            <span className="text-xs font-mono font-medium text-muted-foreground w-12 text-right">
                                                {challenge.current}/{challenge.target}
                                            </span>
                                        </div>
                                    </CardContent>
                                    {isDone && !challenge.isClaimed && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 text-center border-t border-yellow-100 dark:border-yellow-900/30">
                                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleClaim(challenge.id); }} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                                                Claim Reward
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>

                {/* BONUS CHEST */}
                <Card className={`overflow-hidden border-2 ${allCompleted ? 'border-yellow-400 dark:border-yellow-600' : 'border-dashed border-muted'}`}>
                    <div className={`h-full p-6 flex flex-col items-center justify-center text-center space-y-3 ${allCompleted ? 'bg-gradient-to-b from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30' : 'bg-muted/10'}`}>
                        <div className="relative">
                            <motion.div
                                animate={allCompleted && !bonusClaimed ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                            >
                                {bonusClaimed ? <Gift className="h-16 w-16 text-muted-foreground opacity-50" /> : <Gift className={`h-16 w-16 ${allCompleted ? 'text-yellow-500 drop-shadow-lg' : 'text-gray-300 dark:text-gray-700'}`} />}
                            </motion.div>
                            {!allCompleted && (
                                <div className="absolute -bottom-2 -right-2 bg-gray-200 dark:bg-gray-800 p-1.5 rounded-full border border-background">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-bold text-lg">Daily Completion Bonus</h3>
                            <p className="text-sm text-muted-foreground">Complete all challenges above to unlock</p>
                        </div>

                        <Button
                            disabled={!canClaimBonus}
                            onClick={claimDailyBonus}
                            className={`w-full max-w-xs transition-all ${allCompleted && !bonusClaimed ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg scale-105' : ''}`}
                        >
                            {bonusClaimed ? 'Claimed' : allCompleted ? 'Open Chest' : 'Locked'}
                        </Button>
                    </div>
                </Card>

                {/* SNEAK PEEK */}
                <div className="opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-sm text-muted-foreground">Tomorrow's Reward Preview</h4>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Coming Soon</span>
                    </div>
                    <Card className="border-dashed bg-muted/20">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                                    <Trophy className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold">Super Sunday Challenge</p>
                                    <p className="text-xs text-muted-foreground">Double XP for all tasks</p>
                                </div>
                            </div>
                            <Badge variant="outline">2x Points</Badge>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* BONUS MODAL */}
            <Dialog open={showBonusModal} onOpenChange={setShowBonusModal}>
                <DialogContent className="sm:max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                            Chest Opened!
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center justify-center space-y-4">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        >
                            <Gift className="h-24 w-24 text-yellow-500" />
                        </motion.div>
                        <div className="space-y-1">
                            <p className="text-4xl font-black text-green-600 dark:text-green-400">
                                +{bonusAmount > 0 ? bonusAmount : 500} <span className="text-lg text-muted-foreground font-normal">pts</span>
                            </p>
                            <p className="text-muted-foreground">Daily Bonus Reward</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowBonusModal(false)} className="w-full">
                        Awsome!
                    </Button>
                </DialogContent>
            </Dialog>

        </div >
    )
}
