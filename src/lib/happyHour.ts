/**
 * Happy Hour Utility - Server-side version
 * Calculates point multipliers based on time of day and weekend bonuses
 */

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
 * Get current Happy Hour status with multiplier
 * Can optionally pass a timezone offset for the user
 */
export function getHappyHourStatus(timezoneOffset?: number): HappyHourStatus {
    const now = new Date()

    // Apply timezone offset if provided (in minutes)
    if (timezoneOffset !== undefined) {
        now.setMinutes(now.getMinutes() + timezoneOffset + now.getTimezoneOffset())
    }

    const currentHour = now.getHours()
    const currentDay = now.getDay()
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
 */
export function applyHappyHourMultiplier(basePoints: number, timezoneOffset?: number): number {
    const status = getHappyHourStatus(timezoneOffset)
    return Math.floor(basePoints * status.totalMultiplier)
}

/**
 * Get display info for transaction description
 */
export function getHappyHourBonus(basePoints: number, timezoneOffset?: number): {
    basePoints: number
    multiplier: number
    finalPoints: number
    bonusLabel: string | null
} {
    const status = getHappyHourStatus(timezoneOffset)
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
