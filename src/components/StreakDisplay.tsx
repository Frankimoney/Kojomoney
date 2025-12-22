'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Flame, Zap, Trophy, Target } from 'lucide-react'
import { getStreakMultiplier, getNextStreakTier, STREAK_TIERS } from '@/lib/points-config'

interface StreakDisplayProps {
    dailyStreak: number
    compact?: boolean
}

export default function StreakDisplay({ dailyStreak, compact = false }: StreakDisplayProps) {
    const { multiplier, tier } = getStreakMultiplier(dailyStreak)
    const nextTier = getNextStreakTier(dailyStreak)

    // Calculate progress to next tier
    let progressPercent = 100
    if (nextTier) {
        const daysToNext = nextTier.minDays - dailyStreak
        const rangeSize = nextTier.minDays - tier.minDays
        progressPercent = Math.max(0, ((rangeSize - daysToNext) / rangeSize) * 100)
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg px-3 py-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-bold text-orange-600">{dailyStreak}</span>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-700 text-xs">
                    {multiplier}x
                </Badge>
            </div>
        )
    }

    return (
        <Card className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-orange-900/20 dark:via-red-900/20 dark:to-pink-900/20 border-orange-200 dark:border-orange-800 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                                <Flame className="h-6 w-6 text-white" />
                            </div>
                            {dailyStreak >= 7 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                                    <Trophy className="h-3 w-3 text-yellow-800" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-orange-800 dark:text-orange-200">
                                {dailyStreak} Day Streak
                            </h3>
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                {tier.label}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-300">
                                {multiplier}x
                            </span>
                        </div>
                        <p className="text-xs text-orange-500">Earnings Boost</p>
                    </div>
                </div>

                {nextTier && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Target className="h-3 w-3" />
                                <span>Next: {nextTier.label}</span>
                            </div>
                            <span className="text-orange-600 font-medium">
                                {nextTier.minDays - dailyStreak} days left
                            </span>
                        </div>
                        <Progress
                            value={progressPercent}
                            className="h-2 bg-orange-200 dark:bg-orange-800"
                        />
                        <p className="text-xs text-center text-muted-foreground">
                            🎯 Reach {nextTier.minDays} days for <span className="font-bold text-orange-600">{nextTier.multiplier}x</span> bonus!
                        </p>
                    </div>
                )}

                {!nextTier && (
                    <div className="text-center py-2">
                        <p className="text-sm text-orange-600 font-medium">
                            🏆 Maximum streak bonus achieved!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
