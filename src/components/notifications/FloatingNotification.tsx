'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, AlertTriangle, Info, CheckCircle, Flame, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { create } from 'zustand'

// Types
export interface FloatingNotification {
    id: string
    title: string
    message: string
    type: 'reward' | 'warning' | 'info' | 'success' | 'streak' | 'spin'
    duration?: number // ms, default 5000
    action?: {
        label: string
        onClick: () => void
    }
}

// Store for managing floating notifications
interface FloatingNotificationState {
    notifications: FloatingNotification[]
    show: (notification: Omit<FloatingNotification, 'id'>) => void
    dismiss: (id: string) => void
    clear: () => void
}

export const useFloatingNotifications = create<FloatingNotificationState>((set) => ({
    notifications: [],
    show: (notification) => set((state) => ({
        notifications: [...state.notifications, {
            ...notification,
            id: Math.random().toString(36).substring(7)
        }].slice(-3) // Keep max 3 notifications
    })),
    dismiss: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),
    clear: () => set({ notifications: [] })
}))

// Style configs per type
const typeStyles = {
    reward: {
        bg: 'from-yellow-400 via-amber-500 to-orange-500',
        icon: Gift,
        iconBg: 'bg-yellow-600',
        glow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]'
    },
    warning: {
        bg: 'from-orange-500 to-red-500',
        icon: AlertTriangle,
        iconBg: 'bg-red-600',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]'
    },
    info: {
        bg: 'from-blue-500 to-indigo-600',
        icon: Info,
        iconBg: 'bg-blue-600',
        glow: 'shadow-[0_0_30px_rgba(59,130,246,0.4)]'
    },
    success: {
        bg: 'from-green-500 to-emerald-600',
        icon: CheckCircle,
        iconBg: 'bg-green-600',
        glow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
    },
    streak: {
        bg: 'from-orange-500 via-red-500 to-pink-500',
        icon: Flame,
        iconBg: 'bg-red-600',
        glow: 'shadow-[0_0_30px_rgba(249,115,22,0.4)]'
    },
    spin: {
        bg: 'from-purple-500 via-pink-500 to-rose-500',
        icon: Sparkles,
        iconBg: 'bg-purple-600',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]'
    }
}

// Single notification item
function NotificationPopup({ notification, onDismiss }: {
    notification: FloatingNotification
    onDismiss: () => void
}) {
    const style = typeStyles[notification.type]
    const Icon = style.icon

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss()
        }, notification.duration || 5000)

        return () => clearTimeout(timer)
    }, [notification.duration, onDismiss])

    return (
        <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`
                relative overflow-hidden rounded-2xl p-4
                bg-gradient-to-r ${style.bg}
                text-white ${style.glow}
                backdrop-blur-xl
            `}
        >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full"
                        initial={{ x: Math.random() * 300, y: Math.random() * 100 }}
                        animate={{
                            x: Math.random() * 300,
                            y: Math.random() * 100,
                            opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            repeatType: 'reverse'
                        }}
                    />
                ))}
            </div>

            <div className="relative flex items-start gap-3">
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    className={`shrink-0 w-12 h-12 ${style.iconBg} rounded-xl flex items-center justify-center shadow-lg`}
                >
                    <Icon className="h-6 w-6 text-white" />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <motion.h4
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="font-bold text-lg"
                    >
                        {notification.title}
                    </motion.h4>
                    <motion.p
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/90 text-sm"
                    >
                        {notification.message}
                    </motion.p>

                    {/* Action button */}
                    {notification.action && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-2"
                        >
                            <Button
                                size="sm"
                                variant="secondary"
                                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                onClick={() => {
                                    notification.action?.onClick()
                                    onDismiss()
                                }}
                            >
                                {notification.action.label}
                            </Button>
                        </motion.div>
                    )}
                </div>

                {/* Close button */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
                    onClick={onDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Progress bar */}
            <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: (notification.duration || 5000) / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 origin-left"
            />
        </motion.div>
    )
}

// Container component to render all floating notifications
export function FloatingNotificationContainer() {
    const { notifications, dismiss } = useFloatingNotifications()

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 space-y-3">
            <AnimatePresence mode="sync">
                {notifications.map((notification) => (
                    <NotificationPopup
                        key={notification.id}
                        notification={notification}
                        onDismiss={() => dismiss(notification.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}

// Helper function to quickly show notifications
export const showFloatingNotification = (notification: Omit<FloatingNotification, 'id'>) => {
    useFloatingNotifications.getState().show(notification)
}

// Preset notification helpers
export const FloatingNotifications = {
    reward: (title: string, message: string, action?: FloatingNotification['action']) => {
        showFloatingNotification({ title, message, type: 'reward', action, duration: 6000 })
    },
    streak: (days: number) => {
        showFloatingNotification({
            title: `🔥 ${days} Day Streak!`,
            message: `You're on fire! Keep it going for bigger rewards.`,
            type: 'streak',
            duration: 5000
        })
    },
    spinReady: (onClick: () => void) => {
        showFloatingNotification({
            title: '🎰 Daily Spin Ready!',
            message: 'Your free spin is waiting. Win up to 1000 points!',
            type: 'spin',
            action: { label: 'Spin Now', onClick },
            duration: 8000
        })
    },
    levelUp: (level: string) => {
        showFloatingNotification({
            title: `🏆 Level Up!`,
            message: `Congratulations! You've reached ${level} level.`,
            type: 'success',
            duration: 7000
        })
    },
    warning: (title: string, message: string) => {
        showFloatingNotification({ title, message, type: 'warning', duration: 6000 })
    },
    // NEW: Points earned with multiplier breakdown
    pointsEarned: (options: {
        source: string  // e.g., "News", "Trivia", "Ad"
        basePoints: number
        finalPoints: number
        happyHourMultiplier?: number
        streakMultiplier?: number
        happyHourName?: string  // e.g., "Lunch Rush 2x"
        streakName?: string     // e.g., "Week Warrior 2x"
    }) => {
        const { source, basePoints, finalPoints, happyHourMultiplier, streakMultiplier, happyHourName, streakName } = options

        // Build multiplier description
        const multipliers: string[] = []
        if (happyHourMultiplier && happyHourMultiplier > 1) {
            multipliers.push(happyHourName || `Happy Hour ${happyHourMultiplier}x`)
        }
        if (streakMultiplier && streakMultiplier > 1) {
            multipliers.push(streakName || `Streak ${streakMultiplier}x`)
        }

        let message = ''
        if (multipliers.length > 0) {
            message = `${basePoints} base × ${multipliers.join(' × ')} = ${finalPoints} pts!`
        } else {
            message = `You earned ${finalPoints} points!`
        }

        // Use reward type with celebratory title
        const hasBonus = multipliers.length > 0
        const title = hasBonus
            ? `🎉 ${source} +${finalPoints} pts (${Math.round((finalPoints / basePoints) * 10) / 10}x Bonus!)`
            : `✅ ${source} +${finalPoints} pts`

        showFloatingNotification({
            title,
            message,
            type: hasBonus ? 'reward' : 'success',
            duration: hasBonus ? 6000 : 4000
        })
    }
}
