export interface User {
    id: string
    email: string
    name?: string
    phone?: string
    timezone?: string  // IANA timezone string, e.g., "Africa/Lagos"
    referralCode?: string
    totalPoints: number
    adPoints: number
    newsPoints: number
    triviaPoints: number
    dailyStreak: number
    lastActiveDate?: string
    referralRewards?: any[]
    todayProgress?: {
        adsWatched: number
        storiesRead: number
        triviaCompleted: boolean
    }
}
