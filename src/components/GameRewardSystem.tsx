'use client'

/**
 * Game Rewards System Component
 * 
 * Displays available game providers and handles the game launch flow.
 * Integrates with /api/games/start endpoint.
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Gamepad2,
    PlayCircle,
    Trophy,
    Clock,
    AlertCircle,
    ArrowLeft,
    Sparkles,
    Zap,
    ExternalLink
} from 'lucide-react'
import { apiCall } from '@/lib/api-client'

// Lazy load MiniGamesSystem
const MiniGamesSystem = dynamic(() => import('@/components/MiniGamesSystem'), {
    loading: () => <div className="min-h-screen flex items-center justify-center">Loading...</div>
})

interface GameRewardSystemProps {
    userId?: string
    onClose?: () => void
}

interface GameProvider {
    id: 'mini-games' | 'gamezop' | 'adjoe' | 'qureka'
    name: string
    description: string
    color: string
    icon: React.ReactNode
    features: string[]
    actionText: string
    isNew?: boolean
}

export default function GameRewardSystem({ userId, onClose }: GameRewardSystemProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showMiniGames, setShowMiniGames] = useState(false)

    const providers: GameProvider[] = [
        {
            id: 'mini-games',
            name: 'Practice Games',
            description: 'Play fun mini-games and earn bonus points instantly!',
            color: 'bg-amber-500',
            icon: <Sparkles className="h-6 w-6 text-white" />,
            features: ['Instant Play', 'No Install', 'Bonus Points'],
            actionText: 'Play Now',
            isNew: true
        },
        {
            id: 'adjoe',
            name: 'Playtime Rewards',
            description: 'Earn points for every minute you play new games.',
            color: 'bg-emerald-500',
            icon: <Clock className="h-6 w-6 text-white" />,
            features: ['Earn per minute', 'Huge variety', 'Auto-credit'],
            actionText: 'Start Playing',
        },
        {
            id: 'gamezop',
            name: 'Skill Games',
            description: 'Play tournaments and skill-based games to win instantly.',
            color: 'bg-indigo-500',
            icon: <Gamepad2 className="h-6 w-6 text-white" />,
            features: ['Tournaments', 'Instant Wins', 'No Install'],
            actionText: 'Play Games'
        },
        {
            id: 'qureka',
            name: 'Quiz & Trivia',
            description: 'Test your knowledge with fun quizzes and earn coins.',
            color: 'bg-purple-500',
            icon: <Trophy className="h-6 w-6 text-white" />,
            features: ['Live Quizzes', 'Cricket Trivia', 'Instant Rewards'],
            actionText: 'Start Quiz'
        }
    ]

    const handleLaunchGame = async (providerId: string, gameId: string = 'default') => {
        if (!userId) return

        // Handle mini-games separately - show embedded component
        if (providerId === 'mini-games') {
            setShowMiniGames(true)
            return
        }

        setIsLoading(providerId)
        setError(null)

        try {
            // Check native platform for Adjoe (requires SDK usually, but web fallback exists)
            const isNative = typeof window !== 'undefined' && (
                ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
                (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
            )

            // Adjoe best experience on mobile app
            if (providerId === 'adjoe' && !isNative) {
                // Determine if we should warn or block - for now just warn
                console.log('Adjoe launched on web - might have limited offers')
            }

            const response = await apiCall('/api/games/start', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    provider: providerId,
                    gameId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start game session')
            }

            if (data.launchUrl) {
                // Open in new window/tab or in-app browser
                if (isNative) {
                    import('@capacitor/browser').then(({ Browser }) => {
                        Browser.open({ url: data.launchUrl, presentationStyle: 'popover' })
                    }).catch(() => {
                        window.open(data.launchUrl, '_blank')
                    })
                } else {
                    window.open(data.launchUrl, '_blank')
                }
            } else {
                throw new Error('No launch URL received')
            }

        } catch (err: any) {
            console.error('Game launch error:', err)
            setError(err.message || 'Failed to launch game. Please try again.')
        } finally {
            setIsLoading(null)
        }
    }

    // Show Mini Games System when selected
    if (showMiniGames) {
        return (
            <MiniGamesSystem
                userId={userId}
                onClose={() => setShowMiniGames(false)}
            />
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {onClose && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="h-9 w-9 -ml-2"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    <Gamepad2 className="h-5 w-5 text-indigo-500" />
                                    Play & Earn
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Play games, quizzes and earn real money
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Hero Banner */}
                <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-10">
                        <Gamepad2 className="h-40 w-40 -mr-10 -mt-10" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <Badge className="bg-white/20 text-white border-0 mb-3 hover:bg-white/30">
                                    <Zap className="h-3 w-3 mr-1" /> New Games Added
                                </Badge>
                                <h2 className="text-2xl font-bold mb-2">Game Zone</h2>
                                <p className="text-indigo-100 max-w-xs text-sm leading-relaxed">
                                    Dive into our collection of skill games, quizzes, and playtime rewards.
                                    The more you play, the more you earn!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error Message */}
                {error && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                        <CardContent className="p-4 flex items-center gap-3 text-red-700 dark:text-red-400">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Providers Grid */}
                <div className="grid gap-4">
                    {providers.map((provider) => (
                        <Card
                            key={provider.id}
                            className={`overflow-hidden hover:shadow-md transition-all border-l-4 ${provider.color.replace('bg-', 'border-')}`}
                        >
                            <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row">
                                    {/* Icon Section */}
                                    <div className={`p-6 flex flex-col items-center justify-center shrink-0 w-full sm:w-32 ${provider.color}`}>
                                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-2">
                                            {provider.icon}
                                        </div>
                                        {provider.isNew && (
                                            <Badge className="bg-white text-black text-[10px] font-bold px-2 py-0.5 border-0">
                                                NEW
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-lg">{provider.name}</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {provider.description}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {provider.features.map((feature, idx) => (
                                                    <Badge key={idx} variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800 font-normal">
                                                        {feature}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleLaunchGame(provider.id)}
                                            disabled={isLoading === provider.id}
                                            className={`w-full sm:w-auto self-start ${provider.color} border-0 hover:opacity-90 transition-opacity`}
                                        >
                                            {isLoading === provider.id ? (
                                                <>
                                                    <span className="animate-spin mr-2">⏳</span> Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className="h-4 w-4 mr-2" />
                                                    {provider.actionText}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300">
                        <Sparkles className="h-4 w-4" />
                        How it works
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5 list-disc list-inside">
                        <li>Choose a provider from the list above</li>
                        <li>Play games, answer quizzes, or discover apps</li>
                        <li>Points are credited automatically to your wallet</li>
                        <li>Check your transaction history for reward details</li>
                    </ul>
                </div>
            </div>
        </div >
    )
}
