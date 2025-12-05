export interface User {
    id: string
    email: string
    name?: string
    avatarUrl?: string
    referralCode?: string
    inviterId?: string
    totalPoints: number
    walletBalance: number
    createdAt: number
    country?: string
}

export interface Offer {
    id: string
    externalId: string
    provider: 'CPX' | 'TheoremReach' | 'AdGem' | 'Other'
    title: string
    payout: number
    category: string
    url: string
    active: boolean
}

export interface Transaction {
    id: string
    userId: string
    type: 'credit' | 'debit'
    amount: number
    source: 'offerwall' | 'survey' | 'mission' | 'referral' | 'tournament' | 'daily_challenge' | 'ad_watch'
    status: 'pending' | 'completed' | 'failed'
    metadata?: any
    createdAt: number
}

export interface Mission {
    id: string
    title: string
    payout: number
    status: 'available' | 'completed'
}

export interface Referral {
    userId: string
    referredUserId: string
    status: 'registered' | 'active'
    earnedAmount: number
    createdAt: number
}

export interface TournamentEntry {
    userId: string
    name: string
    points: number
    rank: number
    lastUpdated: number
}

export interface DailyChallenge {
    userId: string
    date: string // YYYY-MM-DD
    tasks: {
        [taskId: string]: {
            current: number
            target: number
            completed: boolean
        }
    }
    bonusClaimed: boolean
}
