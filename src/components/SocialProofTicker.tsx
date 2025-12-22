'use client'

import { useState, useEffect } from 'react'
import { apiCall } from '@/lib/api-client'
import { DollarSign, Star, TrendingUp, Coins, X } from 'lucide-react'

interface ActivityItem {
    id: string
    type: 'earning' | 'withdrawal'
    name: string
    amount: number
    source?: string
    timestamp: number
}

interface SocialProofTickerProps {
    onClose?: () => void
}

export default function SocialProofTicker({ onClose }: SocialProofTickerProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isVisible, setIsVisible] = useState(true)
    const [isPaused, setIsPaused] = useState(false)

    useEffect(() => {
        loadActivityFeed()
        // Refresh every 2 minutes
        const interval = setInterval(loadActivityFeed, 120000)
        return () => clearInterval(interval)
    }, [])

    const loadActivityFeed = async () => {
        try {
            const response = await apiCall('/api/activity-feed')
            if (response.ok) {
                const data = await response.json()
                setActivities(data.activities || [])
            }
        } catch (err) {
            console.error('Failed to load activity feed:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setIsVisible(false)
        onClose?.()
    }

    if (!isVisible || isLoading || activities.length === 0) {
        return null
    }

    // Duplicate activities for seamless loop
    const duplicatedActivities = [...activities, ...activities]

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-lg border-t border-indigo-500/30"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Close button */}
            <button
                onClick={handleClose}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                aria-label="Close ticker"
            >
                <X className="h-3 w-3 text-white" />
            </button>

            {/* Ticker container */}
            <div className="overflow-hidden py-2.5 pr-10">
                <div
                    className={`flex gap-8 whitespace-nowrap ${isPaused ? '' : 'animate-marquee'}`}
                    style={{
                        animation: isPaused ? 'none' : 'marquee 15s linear infinite',
                    }}
                >
                    {duplicatedActivities.map((activity, index) => (
                        <div
                            key={`${activity.id}-${index}`}
                            className="inline-flex items-center gap-2 text-white text-sm"
                        >
                            {/* Icon */}
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/20">
                                {activity.type === 'withdrawal' ? (
                                    <DollarSign className="h-3.5 w-3.5 text-green-300" />
                                ) : (
                                    <Coins className="h-3.5 w-3.5 text-yellow-300" />
                                )}
                            </span>

                            {/* Content */}
                            <span className="font-medium">
                                {activity.name}
                            </span>
                            <span className="opacity-80">
                                {activity.type === 'withdrawal' ? (
                                    <>withdrew <strong className="text-green-300">${activity.amount.toFixed(2)}</strong></>
                                ) : (
                                    <>earned <strong className="text-yellow-300">{activity.amount.toLocaleString()} pts</strong> from {activity.source}</>
                                )}
                            </span>

                            {/* Separator dot */}
                            <span className="mx-2 h-1 w-1 rounded-full bg-white/40" />
                        </div>
                    ))}
                </div>
            </div>

            {/* CSS for marquee animation */}
            <style jsx>{`
                @keyframes marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
                .animate-marquee {
                    animation: marquee 15s linear infinite;
                }
            `}</style>
        </div>
    )
}
