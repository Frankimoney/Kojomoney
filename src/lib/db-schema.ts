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

// Enhanced Offer interface for offerwall
export interface Offer {
    id: string
    externalId: string
    provider: OfferProvider
    title: string
    description: string
    payout: number
    category: OfferCategory
    difficulty: 'Easy' | 'Medium' | 'Hard'
    tags: string[]
    estimatedTime: string
    logoUrl?: string
    url: string
    active: boolean
    priority: number // Higher = shown first
    requirements?: string
    countries?: string[] // Empty = available everywhere
    createdAt: number
    updatedAt: number
}

// Supported offer providers - can add more as needed
// Africa-focused providers: Wannads, Adgate, Monlix
export type OfferProvider =
    | 'AdGem'
    | 'CPX'
    | 'TheoremReach'
    | 'Tapjoy'
    | 'OfferToro'
    | 'AyeT'
    | 'AdColony'
    | 'Pollfish'
    | 'BitLabs'
    | 'Wannads'    // Good African market coverage
    | 'Adgate'     // Adgate Media - works in Africa
    | 'Monlix'     // Global including Africa
    | 'Kiwiwall'   // Global offerwall with good survey/offer mix
    | 'Timewall'   // Micro-tasks, surveys, and offerwall
    | 'Internal'   // For custom offers managed by admin
    | 'Other'

export type OfferCategory =
    | 'Game'
    | 'Survey'
    | 'Shopping'
    | 'Finance'
    | 'Video'
    | 'Install'
    | 'Social'
    | 'Other'

// Track user's offer completions
export interface OfferCompletion {
    id: string
    offerId: string
    userId: string
    provider: OfferProvider
    externalTransactionId?: string // From provider callback
    payout: number
    status: 'pending' | 'credited' | 'rejected' | 'reversed'
    startedAt: number
    completedAt?: number
    creditedAt?: number
    metadata?: Record<string, any>
}

// Survey-specific interface
export interface Survey {
    id: string
    externalId: string
    provider: 'CPX' | 'TheoremReach' | 'BitLabs' | 'Pollfish'
    title: string
    description?: string
    payout: number
    timeMinutes: number
    starRating: number // 1-5
    isHot?: boolean
    tags: string[]
    iframeSupport: boolean
    url: string
    active: boolean
    createdAt: number
    updatedAt: number
}

// Survey completion tracking
export interface SurveyCompletion {
    id: string
    surveyId: string
    userId: string
    provider: string
    externalTransactionId?: string
    payout: number
    status: 'pending' | 'verified' | 'rejected'
    startedAt: number
    completedAt?: number
    creditedAt?: number
}

// Mission interface for mission board
export interface Mission {
    id: string
    title: string
    description: string
    payout: number
    type: 'social' | 'install' | 'review' | 'referral' | 'custom'
    difficulty: 'Easy' | 'Medium' | 'Hard'
    affiliateUrl?: string // The affiliate/referral link
    expiresAt?: number
    steps: MissionStep[]
    proofRequired: boolean
    active: boolean
    createdAt: number
    updatedAt: number
}

export interface MissionStep {
    id: string
    instruction: string
    order: number
}

// User's mission progress
export interface MissionProgress {
    id: string
    missionId: string
    userId: string
    status: 'available' | 'in_progress' | 'reviewing' | 'completed' | 'expired'
    completedSteps: string[] // Step IDs
    proofUrls?: string[]
    startedAt: number
    completedAt?: number
    creditedAt?: number
}

// Daily challenges
export interface DailyChallengeDefinition {
    id: string
    title: string
    description: string
    target: number
    reward: number
    type: 'ads_watched' | 'surveys_completed' | 'offers_completed' | 'trivia_played' | 'login' | 'referral'
    active: boolean
}

export interface Transaction {
    id: string
    userId: string
    type: 'credit' | 'debit'
    amount: number
    source: 'offerwall' | 'survey' | 'mission' | 'referral' | 'tournament' | 'daily_challenge' | 'ad_watch' | 'trivia' | 'bonus' | 'withdrawal' | 'game' | 'admin_adjustment'
    sourceId?: string // Reference to specific offer, survey, etc.
    status: 'pending' | 'completed' | 'failed' | 'reversed'
    metadata?: Record<string, any>
    createdAt: number
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

// Provider configuration for external SDKs
export interface ProviderConfig {
    id: string
    provider: OfferProvider
    apiKey?: string
    apiSecret?: string
    appId?: string
    callbackUrl?: string
    enabled: boolean
    settings?: Record<string, any>
    createdAt: number
    updatedAt: number
}
