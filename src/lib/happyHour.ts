/**
 * Happy Hour Utility - Server-side version
 * Calculates point multipliers based on time of day and weekend bonuses
 * Now supports IANA timezone strings for proper timezone handling
 */

import { getLocalHourServer } from './timezone'

// Happy Hour schedule (same as frontend HappyHour.tsx)
export const HAPPY_HOUR_SCHEDULE = [
    { start: 12, end: 14, multiplier: 2.0, name: 'Lunch Rush' },      // 12 PM - 2 PM
    { start: 18, end: 20, multiplier: 2.0, name: 'Evening Boost' },   // 6 PM - 8 PM
    { start: 21, end: 23, multiplier: 1.5, name: 'Night Owl' },       // 9 PM - 11 PM
] as const

// Weekend bonus
export const WEEKEND_BONUS = {
    enabled: true,
    multiplier: 1.25, // Additional 25% on weekends
    days: [0, 6], // Sunday = 0, Saturday = 6
}

export interface HappyHourStatus {
    isActive: boolean
    currentMultiplier: number
    sessionName: string | null
    isWeekend: boolean
    totalMultiplier: number
}

/**
 * Get local day of week for a timezone (server-side)
 * Returns 0-6 where 0 = Sunday
 */
function getLocalDayOfWeekServer(timezone: string = 'UTC'): number {
    try {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'short',
        })
        const dayStr = formatter.format(now)
        const dayMap: Record<string, number> = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3,
            'Thu': 4, 'Fri': 5, 'Sat': 6,
        }
        return dayMap[dayStr] ?? new Date().getUTCDay()
    } catch (e) {
        console.warn('Server: Failed to get local day for timezone:', timezone, e)
        return new Date().getUTCDay()
    }
}

/**
 * Get current Happy Hour status with multiplier
 * Accepts IANA timezone string (e.g., "Africa/Lagos") for proper timezone support
 * Falls back to UTC if no timezone provided
 */
export function getHappyHourStatus(timezone?: string): HappyHourStatus {
    const tz = timezone || 'UTC'

    const currentHour = getLocalHourServer(tz)
    const currentDay = getLocalDayOfWeekServer(tz)
    const isWeekend = WEEKEND_BONUS.days.includes(currentDay)

    // Check if we're in a happy hour window
    const activeSession = HAPPY_HOUR_SCHEDULE.find(
        (session) => currentHour >= session.start && currentHour < session.end
    )

    let currentMultiplier = 1.0
    let sessionName: string | null = null

    if (activeSession) {
        currentMultiplier = activeSession.multiplier
        sessionName = activeSession.name
    }

    // Apply weekend bonus on top
    const weekendMultiplier = isWeekend && WEEKEND_BONUS.enabled ? WEEKEND_BONUS.multiplier : 1.0
    const totalMultiplier = currentMultiplier * weekendMultiplier

    return {
        isActive: !!activeSession,
        currentMultiplier,
        sessionName,
        isWeekend,
        totalMultiplier: Math.round(totalMultiplier * 100) / 100,
    }
}

/**
 * Apply Happy Hour multiplier to points
 * Returns the boosted points amount
 * @param basePoints - Base points to multiply
 * @param timezone - User's IANA timezone string (e.g., "Africa/Lagos")
 */
export function applyHappyHourMultiplier(basePoints: number, timezone?: string): number {
    const status = getHappyHourStatus(timezone)
    return Math.floor(basePoints * status.totalMultiplier)
}

/**
 * Get display info for transaction description
 * @param basePoints - Base points earned
 * @param timezone - User's IANA timezone string (e.g., "Africa/Lagos")
 */
export function getHappyHourBonus(basePoints: number, timezone?: string): {
    basePoints: number
    multiplier: number
    finalPoints: number
    bonusLabel: string | null
} {
    const status = getHappyHourStatus(timezone)
    const finalPoints = Math.floor(basePoints * status.totalMultiplier)

    let bonusLabel: string | null = null
    if (status.isActive && status.isWeekend) {
        bonusLabel = `${status.sessionName} + Weekend Bonus (${status.totalMultiplier}x)`
    } else if (status.isActive) {
        bonusLabel = `${status.sessionName} (${status.totalMultiplier}x)`
    } else if (status.isWeekend) {
        bonusLabel = `Weekend Bonus (${status.totalMultiplier}x)`
    }

    return {
        basePoints,
        multiplier: status.totalMultiplier,
        finalPoints,
        bonusLabel
    }
}
