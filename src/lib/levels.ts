import { Trophy, Medal, Crown, Star, Shield } from 'lucide-react'

export interface LevelConfig {
    name: string
    minPoints: number
    icon: any
    color: string
    textColor: string
    bgColor: string
    perk: string
    earningBonus: number  // Multiplier for earnings (1.0 = base, 1.1 = +10%)
}

export const LEVELS: LevelConfig[] = [
    {
        name: 'Starter',
        minPoints: 0,
        icon: Star,
        color: 'text-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-100',
        perk: 'Access to basic tasks',
        earningBonus: 1.0
    },
    {
        name: 'Bronze',
        minPoints: 10000,  // Updated from 1000 to match economic plan
        icon: Shield,
        color: 'text-orange-600',
        textColor: 'text-orange-800',
        bgColor: 'bg-orange-100',
        perk: '+10% Bonus on all earnings',
        earningBonus: 1.10
    },
    {
        name: 'Silver',
        minPoints: 50000,  // Updated from 5000
        icon: Medal,
        color: 'text-slate-400',
        textColor: 'text-slate-600',
        bgColor: 'bg-slate-100',
        perk: '+15% Bonus + Faster Withdrawals',
        earningBonus: 1.15
    },
    {
        name: 'Gold',
        minPoints: 200000,  // Updated from 20000
        icon: Trophy,
        color: 'text-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        perk: '+20% Bonus + Exclusive Tasks',
        earningBonus: 1.20
    },
    {
        name: 'Platinum',
        minPoints: 500000,  // Updated from 50000
        icon: Crown,
        color: 'text-purple-600',
        textColor: 'text-purple-800',
        bgColor: 'bg-purple-100',
        perk: '+30% Bonus + VIP Support',
        earningBonus: 1.30
    },
    {
        name: 'Diamond',
        minPoints: 1000000,  // NEW: Top tier
        icon: Crown,
        color: 'text-cyan-400',
        textColor: 'text-cyan-600',
        bgColor: 'bg-gradient-to-r from-cyan-100 to-blue-100',
        perk: '+50% Bonus + Ultimate Perks',
        earningBonus: 1.50
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
