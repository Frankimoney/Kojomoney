/**
 * Timezone Utility Library
 * 
 * Provides timezone-aware utilities for the KojoMoney app to ensure
 * notifications, greetings, and time-based features work correctly
 * for users in any timezone.
 */

const TIMEZONE_STORAGE_KEY = 'kojomoney_timezone';

/**
 * Get the user's timezone from browser or fallback to stored value
 * Returns IANA timezone string (e.g., "Africa/Lagos", "America/New_York")
 */
export function getUserTimezone(): string {
    // Try to get from browser's Intl API (most accurate)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        try {
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (browserTimezone) {
                // Cache it for future use
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(TIMEZONE_STORAGE_KEY, browserTimezone);
                }
                return browserTimezone;
            }
        } catch (e) {
            console.warn('Failed to get timezone from Intl API:', e);
        }
    }

    // Fallback to stored timezone
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
        if (stored) return stored;
    }

    // Last resort: estimate from offset (less accurate but better than nothing)
    const offset = new Date().getTimezoneOffset();
    // Common timezone mappings based on offset
    const offsetToTimezone: Record<number, string> = {
        0: 'UTC',
        60: 'Atlantic/Azores', // UTC-1
        120: 'Atlantic/South_Georgia', // UTC-2
        180: 'America/Sao_Paulo', // UTC-3
        240: 'America/New_York', // UTC-4 (EDT)
        300: 'America/New_York', // UTC-5 (EST)
        360: 'America/Chicago', // UTC-6 (CST)
        420: 'America/Denver', // UTC-7 (MST)
        480: 'America/Los_Angeles', // UTC-8 (PST)
        [-60]: 'Africa/Lagos', // UTC+1 (WAT - Nigeria)
        [-120]: 'Africa/Johannesburg', // UTC+2 (SAST)
        [-180]: 'Africa/Nairobi', // UTC+3 (EAT)
        [-330]: 'Asia/Kolkata', // UTC+5:30 (IST - India)
        [-480]: 'Asia/Singapore', // UTC+8
    };

    return offsetToTimezone[offset] || 'UTC';
}

/**
 * Get the current hour in a specific timezone (0-23)
 */
export function getLocalHour(timezone: string = getUserTimezone()): number {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false,
        });
        const hourStr = formatter.format(now);
        return parseInt(hourStr, 10);
    } catch (e) {
        console.warn('Failed to get local hour for timezone:', timezone, e);
        return new Date().getHours();
    }
}

/**
 * Get the current day of week in a specific timezone (0 = Sunday, 6 = Saturday)
 */
export function getLocalDayOfWeek(timezone: string = getUserTimezone()): number {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'short',
        });
        const dayStr = formatter.format(now);
        const dayMap: Record<string, number> = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3,
            'Thu': 4, 'Fri': 5, 'Sat': 6,
        };
        return dayMap[dayStr] ?? new Date().getDay();
    } catch (e) {
        console.warn('Failed to get local day for timezone:', timezone, e);
        return new Date().getDay();
    }
}

/**
 * Get the current date string (YYYY-MM-DD) in user's timezone
 */
export function getLocalDateString(timezone: string = getUserTimezone()): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(now);
    } catch (e) {
        console.warn('Failed to get local date for timezone:', timezone, e);
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Get appropriate greeting based on time of day
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimeOfDay(timezone: string = getUserTimezone()): TimeOfDay {
    const hour = getLocalHour(timezone);

    if (hour >= 5 && hour < 12) {
        return 'morning';
    } else if (hour >= 12 && hour < 17) {
        return 'afternoon';
    } else if (hour >= 17 && hour < 21) {
        return 'evening';
    } else {
        return 'night';
    }
}

/**
 * Get a friendly greeting message based on time of day
 */
export function getGreeting(timezone: string = getUserTimezone()): string {
    const timeOfDay = getTimeOfDay(timezone);

    switch (timeOfDay) {
        case 'morning':
            return 'Good Morning! ☀️';
        case 'afternoon':
            return 'Good Afternoon! 🌤️';
        case 'evening':
            return 'Good Evening! 🌆';
        case 'night':
            return 'Hello Night Owl! 🌙';
    }
}

/**
 * Check if current time is within a specific hour range (in user's timezone)
 * Handles overnight ranges (e.g., 22-6 means 10pm to 6am)
 */
export function isWithinTimeRange(
    startHour: number,
    endHour: number,
    timezone: string = getUserTimezone()
): boolean {
    const currentHour = getLocalHour(timezone);

    if (startHour <= endHour) {
        // Normal range (e.g., 9-17)
        return currentHour >= startHour && currentHour < endHour;
    } else {
        // Overnight range (e.g., 22-6)
        return currentHour >= startHour || currentHour < endHour;
    }
}

/**
 * Check if it's a weekend in the user's timezone
 */
export function isWeekend(timezone: string = getUserTimezone()): boolean {
    const day = getLocalDayOfWeek(timezone);
    return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get timezone offset in minutes from UTC
 * Positive = behind UTC (e.g., US), Negative = ahead of UTC (e.g., Nigeria, India)
 */
export function getTimezoneOffset(timezone: string = getUserTimezone()): number {
    try {
        const now = new Date();
        // Get the time in the target timezone
        const tzTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        // Get the time in UTC
        const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        // Return difference in minutes
        return (utcTime.getTime() - tzTime.getTime()) / (1000 * 60);
    } catch (e) {
        console.warn('Failed to get timezone offset:', timezone, e);
        return new Date().getTimezoneOffset();
    }
}

/**
 * Server-side utility: Get local hour for a timezone (for use in API routes/cron jobs)
 * Works in Node.js environment
 */
export function getLocalHourServer(timezone: string = 'UTC'): number {
    try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false,
        };
        const hourStr = new Intl.DateTimeFormat('en-US', options).format(now);
        return parseInt(hourStr, 10);
    } catch (e) {
        console.warn('Server: Failed to get local hour for timezone:', timezone, e);
        return new Date().getUTCHours();
    }
}

/**
 * Server-side utility: Check if it's within a time range for a specific timezone
 */
export function isWithinTimeRangeServer(
    startHour: number,
    endHour: number,
    timezone: string = 'UTC'
): boolean {
    const currentHour = getLocalHourServer(timezone);

    if (startHour <= endHour) {
        return currentHour >= startHour && currentHour < endHour;
    } else {
        return currentHour >= startHour || currentHour < endHour;
    }
}
