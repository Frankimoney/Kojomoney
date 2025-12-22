import { Trophy, Medal, Crown, Star, Shield } from 'lucide-react'

export interface LevelConfig {
    name: string
    minPoints: number
    icon: any
    color: string
    textColor: string
    bgColor: string
    perk: string
}

export const LEVELS: LevelConfig[] = [
    {
        name: 'Starter',
        minPoints: 0,
        icon: Star,
        color: 'text-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-100',
        perk: 'Access to basic tasks'
    },
    {
        name: 'Bronze',
        minPoints: 1000,
        icon: Shield,
        color: 'text-orange-600',
        textColor: 'text-orange-800',
        bgColor: 'bg-orange-100',
        perk: '+5% Bonus on Surveys'
    },
    {
        name: 'Silver',
        minPoints: 5000,
        icon: Medal,
        color: 'text-slate-400',
        textColor: 'text-slate-600',
        bgColor: 'bg-slate-100',
        perk: 'Faster Withdrawals'
    },
    {
        name: 'Gold',
        minPoints: 20000,
        icon: Trophy,
        color: 'text-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        perk: 'Exclusive Gold Tasks'
    },
    {
        name: 'Platinum',
        minPoints: 50000,
        icon: Crown,
        color: 'text-purple-600',
        textColor: 'text-purple-800',
        bgColor: 'bg-purple-100',
        perk: 'VIP Support + No Ads'
    }
]

export function getUserLevel(points: number): { current: LevelConfig, next: LevelConfig | null, progress: number } {
    let currentLevel = LEVELS[0]
    let nextLevel = LEVELS[1]

    for (let i = 0; i < LEVELS.length; i++) {
        if (points >= LEVELS[i].minPoints) {
            currentLevel = LEVELS[i]
            nextLevel = LEVELS[i + 1] || null
        }
    }

    let progress = 0
    if (nextLevel) {
        const range = nextLevel.minPoints - currentLevel.minPoints
        const currentInLevel = points - currentLevel.minPoints
        progress = Math.min(100, Math.max(0, (currentInLevel / range) * 100))
    } else {
        progress = 100
    }

    return { current: currentLevel, next: nextLevel, progress }
}
