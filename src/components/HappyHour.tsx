'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, TrendingUp, PartyPopper, Timer } from 'lucide-react';
import { getUserTimezone, getLocalHour, getLocalDayOfWeek } from '@/lib/timezone';

// Happy Hour configuration
export const HAPPY_HOUR_SCHEDULE = [
    { start: 12, end: 14, multiplier: 2.0, name: 'Lunch Rush' },      // 12 PM - 2 PM
    { start: 18, end: 20, multiplier: 2.0, name: 'Evening Boost' },   // 6 PM - 8 PM
    { start: 21, end: 23, multiplier: 1.5, name: 'Night Owl' },       // 9 PM - 11 PM
] as const;

// Weekend bonus
export const WEEKEND_BONUS = {
    enabled: true,
    multiplier: 1.25, // Additional 25% on weekends
    days: [0, 6], // Sunday = 0, Saturday = 6
};

export interface HappyHourStatus {
    isActive: boolean;
    currentMultiplier: number;
    sessionName: string | null;
    nextSession: { name: string; startsIn: number } | null;
    isWeekend: boolean;
    totalMultiplier: number;
}

// Utility function to get current happy hour status (timezone-aware)
export function getHappyHourStatus(timezone?: string): HappyHourStatus {
    const tz = timezone || getUserTimezone();
    const now = new Date();
    const currentHour = getLocalHour(tz);
    const currentDay = getLocalDayOfWeek(tz);
    const isWeekend = WEEKEND_BONUS.days.includes(currentDay);

    // Check if we're in a happy hour window
    const activeSession = HAPPY_HOUR_SCHEDULE.find(
        (session) => currentHour >= session.start && currentHour < session.end
    );

    let currentMultiplier = 1.0;
    let sessionName: string | null = null;

    if (activeSession) {
        currentMultiplier = activeSession.multiplier;
        sessionName = activeSession.name;
    }

    // Apply weekend bonus on top
    const weekendMultiplier = isWeekend && WEEKEND_BONUS.enabled ? WEEKEND_BONUS.multiplier : 1.0;
    const totalMultiplier = currentMultiplier * weekendMultiplier;

    // Find next session
    let nextSession: { name: string; startsIn: number } | null = null;
    if (!activeSession) {
        for (const session of HAPPY_HOUR_SCHEDULE) {
            if (session.start > currentHour) {
                const minutesUntil = (session.start - currentHour) * 60 - now.getMinutes();
                nextSession = { name: session.name, startsIn: minutesUntil };
                break;
            }
        }
        // If no session today, show first session tomorrow
        if (!nextSession && HAPPY_HOUR_SCHEDULE.length > 0) {
            const firstSession = HAPPY_HOUR_SCHEDULE[0];
            const hoursUntilMidnight = 24 - currentHour;
            const minutesUntil = hoursUntilMidnight * 60 - now.getMinutes() + firstSession.start * 60;
            nextSession = { name: firstSession.name, startsIn: minutesUntil };
        }
    }

    return {
        isActive: !!activeSession,
        currentMultiplier,
        sessionName,
        nextSession,
        isWeekend,
        totalMultiplier: Math.round(totalMultiplier * 100) / 100,
    };
}

// Format time remaining
function formatTimeRemaining(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Calculate time remaining in current session (timezone-aware)
function getSessionTimeRemaining(timezone?: string): number {
    const tz = timezone || getUserTimezone();
    const currentHour = getLocalHour(tz);
    const now = new Date();
    const currentMinutes = now.getMinutes();

    const activeSession = HAPPY_HOUR_SCHEDULE.find(
        (session) => currentHour >= session.start && currentHour < session.end
    );

    if (!activeSession) return 0;

    const endMinutes = activeSession.end * 60;
    const currentTotalMinutes = currentHour * 60 + currentMinutes;
    return endMinutes - currentTotalMinutes;
}

interface HappyHourProps {
    compact?: boolean;
    className?: string;
    timezone?: string;  // Optional user timezone override
}

export default function HappyHour({ compact = false, className = '', timezone }: HappyHourProps) {
    const userTimezone = timezone || getUserTimezone();
    const [status, setStatus] = useState<HappyHourStatus>(() => getHappyHourStatus(userTimezone));
    const [timeRemaining, setTimeRemaining] = useState(() => getSessionTimeRemaining(userTimezone));

    // Update status every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setStatus(getHappyHourStatus(userTimezone));
            setTimeRemaining(getSessionTimeRemaining(userTimezone));
        }, 60000);

        return () => clearInterval(interval);
    }, [userTimezone]);

    // Compact version for header/navbar
    if (compact) {
        if (!status.isActive && !status.isWeekend) return null;

        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-purple-500/20 text-purple-400'
                    } ${className}`}
            >
                {status.isActive ? (
                    <>
                        <Zap className="w-3 h-3" />
                        <span>{status.totalMultiplier}x</span>
                    </>
                ) : (
                    <>
                        <PartyPopper className="w-3 h-3" />
                        <span>Weekend</span>
                    </>
                )}
            </motion.div>
        );
    }

    // Full card version
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl ${className}`}
        >
            {/* Background */}
            <div
                className={`absolute inset-0 ${status.isActive
                    ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
                    : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
                    }`}
            />

            {/* Animated particles for active state */}
            <AnimatePresence>
                {status.isActive && (
                    <>
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 bg-white/30 rounded-full"
                                initial={{ opacity: 0, y: 100, x: Math.random() * 200 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    y: [-20, -100],
                                    x: Math.random() * 200,
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: i * 0.5,
                                }}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>

            {/* Content */}
            <div className="relative p-4 z-10">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={status.isActive ? { rotate: [0, -10, 10, 0] } : {}}
                            transition={{ duration: 0.5, repeat: status.isActive ? Infinity : 0, repeatDelay: 2 }}
                            className={`p-2.5 rounded-xl ${status.isActive ? 'bg-white/20' : 'bg-slate-600/50'
                                }`}
                        >
                            {status.isActive ? (
                                <Zap className="w-6 h-6 text-white" />
                            ) : (
                                <Clock className="w-6 h-6 text-slate-400" />
                            )}
                        </motion.div>

                        <div>
                            <h3 className={`font-bold text-lg ${status.isActive ? 'text-white' : 'text-slate-200'}`}>
                                {status.isActive ? '⚡ Happy Hour!' : 'Happy Hour'}
                            </h3>
                            <p className={`text-sm ${status.isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                {status.isActive
                                    ? status.sessionName
                                    : status.nextSession
                                        ? `Next: ${status.nextSession.name}`
                                        : 'Check back later'}
                            </p>
                        </div>
                    </div>

                    {/* Multiplier badge */}
                    <div className="text-right">
                        <motion.div
                            animate={status.isActive ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 1, repeat: status.isActive ? Infinity : 0 }}
                            className={`text-2xl font-black ${status.isActive ? 'text-white' : 'text-slate-500'
                                }`}
                        >
                            {status.isActive ? `${status.totalMultiplier}x` : '1x'}
                        </motion.div>
                        <p className={`text-xs ${status.isActive ? 'text-white/70' : 'text-slate-500'}`}>
                            earnings
                        </p>
                    </div>
                </div>

                {/* Time info */}
                <div className="mt-4 flex items-center justify-between">
                    {status.isActive ? (
                        <>
                            <div className="flex items-center gap-2 text-white/80 text-sm">
                                <Timer className="w-4 h-4" />
                                <span>Ends in {formatTimeRemaining(timeRemaining)}</span>
                            </div>
                            {status.isWeekend && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/30 rounded-full text-xs text-purple-200">
                                    <PartyPopper className="w-3 h-3" />
                                    <span>+Weekend Bonus!</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>
                                    {status.nextSession
                                        ? `Starts in ${formatTimeRemaining(status.nextSession.startsIn)}`
                                        : 'No sessions scheduled'}
                                </span>
                            </div>
                            {status.isWeekend && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
                                    <PartyPopper className="w-3 h-3" />
                                    <span>{WEEKEND_BONUS.multiplier}x Weekend</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Schedule preview */}
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className={`text-xs mb-2 ${status.isActive ? 'text-white/60' : 'text-slate-500'}`}>
                        Today&apos;s Schedule
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {HAPPY_HOUR_SCHEDULE.map((session, idx) => {
                            const currentHour = getLocalHour(userTimezone);
                            const isCurrentSession =
                                currentHour >= session.start && currentHour < session.end;
                            const isPast = currentHour >= session.end;

                            return (
                                <div
                                    key={idx}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs ${isCurrentSession
                                        ? 'bg-white/30 text-white font-medium'
                                        : isPast
                                            ? 'bg-slate-600/30 text-slate-500 line-through'
                                            : 'bg-slate-600/50 text-slate-300'
                                        }`}
                                >
                                    <span className="font-medium">{session.start}:00</span>
                                    <span className="mx-1">-</span>
                                    <span>{session.end}:00</span>
                                    <span className="ml-1 opacity-70">({session.multiplier}x)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Named exports for utility usage
export { getHappyHourStatus as checkHappyHour };
