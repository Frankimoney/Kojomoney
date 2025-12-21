'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Home, Coins, Wallet, User, Play, BookOpen, Brain, Clock, TrendingUp, Gift, Settings, Share2, Bell, Moon, LogOut, Users, Trophy, Medal, ArrowLeft, FileText, Gamepad2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { apiCall } from '@/lib/api-client'
import AdService from '@/services/adService'

// Dynamically import components to prevent SSR issues
const NewsReadingSystem = dynamic(() => import('./NewsReadingSystem'), {
    ssr: false,
    loading: () => <div>Loading news...</div>
})

const DailyTrivia = dynamic(() => import('./DailyTrivia'), {
    ssr: false,
    loading: () => <div>Loading trivia...</div>
})

import AuthSystem from './AuthSystem'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
// Capacitor plugins - only available on mobile, lazy loaded
// import { PushNotifications } from '@capacitor/push-notifications'
// import { FirebaseAnalytics } from '@capacitor-firebase/analytics'
// import { FirebaseMessaging } from '@capacitor-firebase/messaging'

interface User {
    id: string
    email: string
    name?: string
    phone?: string
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

type LegalPageType = 'privacy' | 'terms' | 'cookies' | 'gdpr'

// Dynamically import OfferwallSystem
const OfferwallSystem = dynamic(() => import('./OfferwallSystem'), {
    ssr: false,
    loading: () => <div>Loading offerwall...</div>
})

// Dynamically import SurveySystem
const SurveySystem = dynamic(() => import('./SurveySystem'), {
    ssr: false,
    loading: () => <div>Loading surveys...</div>
})

// Dynamically import MissionSystem
const MissionSystem = dynamic(() => import('./MissionSystem'), {
    ssr: false,
    loading: () => <div>Loading missions...</div>
})

// Dynamically import ReferralSystem
const ReferralSystem = dynamic(() => import('./ReferralSystem'), {
    ssr: false,
    loading: () => <div>Loading referrals...</div>
})

// Dynamically import DailyChallengeSystem
const DailyChallengeSystem = dynamic(() => import('./DailyChallengeSystem'), {
    ssr: false,
    loading: () => <div>Loading challenges...</div>
})

// Dynamically import TournamentSystem
const TournamentSystem = dynamic(() => import('./TournamentSystem'), {
    ssr: false,
    loading: () => <div>Loading tournament...</div>
})

// Dynamically import AfricaOfferwallSystem (Wannads, Adgate, Monlix)
const AfricaOfferwallSystem = dynamic(() => import('./AfricaOfferwallSystem'), {
    ssr: false,
    loading: () => <div>Loading offerwalls...</div>
})

// Dynamically import AfricaSurveySystem (Wannads, Adgate, Monlix surveys)
const AfricaSurveySystem = dynamic(() => import('./AfricaSurveySystem'), {
    ssr: false,
    loading: () => <div>Loading surveys...</div>
})

// Dynamically import LegalPages
const LegalPages = dynamic(() => import('./LegalPages'), {
    ssr: false,
    loading: () => <div>Loading legal pages...</div>
})

// Dynamically import GameRewardSystem
const GameRewardSystem = dynamic(() => import('./GameRewardSystem'), {
    ssr: false,
    loading: () => <div>Loading games...</div>
})


// Dedicated Page Components for focused activity experience
interface DedicatedPageProps {
    user: User
    onBack: () => void
}

function NewsPage({ user: initialUser, onBack }: DedicatedPageProps) {
    const [user, setUser] = useState<User>(initialUser)

    useEffect(() => {
        const handler = () => {
            // Re-read user from localStorage when notified
            const savedUser = localStorage.getItem('kojomoneyUser')
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser))
                } catch { }
            }
        }

        window.addEventListener('kojo:user:update', handler)
        window.addEventListener('kojo:points:earned', handler)

        return () => {
            window.removeEventListener('kojo:user:update', handler)
            window.removeEventListener('kojo:points:earned', handler)
        }
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Today's Stories</h1>
                            <p className="text-sm text-muted-foreground">Read stories and earn 10 points each</p>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <Card className="mb-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">Stories Read Today</p>
                                <p className="text-2xl font-bold">{user.todayProgress?.storiesRead || 0}/5</p>
                            </div>
                            <div className="text-right">
                                <p className="text-green-100 text-sm">Points Earned</p>
                                <p className="text-2xl font-bold">{(user.todayProgress?.storiesRead || 0) * 10} pts</p>
                            </div>
                        </div>
                        <Progress
                            value={Math.min(((user.todayProgress?.storiesRead || 0) / 5) * 100, 100)}
                            className="mt-3 h-2 bg-green-400/30"
                        />
                    </CardContent>
                </Card>

                {/* News Content */}
                <NewsReadingSystem userId={user?.id} />
            </div>
        </div>
    )
}

function TriviaPage({ user: initialUser, onBack }: DedicatedPageProps) {
    const [user, setUser] = useState<User>(initialUser)

    useEffect(() => {
        const handler = () => {
            const savedUser = localStorage.getItem('kojomoneyUser')
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser))
                } catch { }
            }
        }

        window.addEventListener('kojo:user:update', handler)
        window.addEventListener('kojo:points:earned', handler)

        return () => {
            window.removeEventListener('kojo:user:update', handler)
            window.removeEventListener('kojo:points:earned', handler)
        }
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Daily Trivia Challenge</h1>
                            <p className="text-sm text-muted-foreground">Answer questions and earn up to 50 bonus points</p>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">Daily Trivia Status</p>
                                <p className="text-2xl font-bold">
                                    {user.todayProgress?.triviaCompleted ? '✅ Completed' : '🎯 Ready to Play'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-purple-100 text-sm">Current Streak</p>
                                <p className="text-2xl font-bold">{user.dailyStreak} days 🔥</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Trivia Content */}
                <DailyTrivia userId={user?.id} dailyStreak={user.dailyStreak} />
            </div>
        </div>
    )
}

interface AdsPageProps {
    user: User
    onBack: () => void
}

function AdsPage({ user, onBack }: AdsPageProps) {
    const [adCooldown, setAdCooldown] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    const handleWatchAd = async () => {
        if (!user?.id || isLoading) return

        // Check if on native platform
        const isNative = typeof window !== 'undefined' && (
            ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
            (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
        )

        if (!isNative) {
            alert('To earn ad points, please use the Kojomoney mobile app.')
            return
        }

        setIsLoading(true)

        try {
            // Start ad session on backend
            const start = await apiCall('/api/ads', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id })
            })
            const startData = await start.json()
            if (!start.ok || !startData?.adViewId) {
                alert(startData?.error || 'Unable to start ad view. Please try again.')
                setIsLoading(false)
                return
            }

            const adViewId = startData.adViewId

            // Use AdService to show the rewarded ad
            const reward = await AdService.showRewarded()

            if (reward) {
                // Ad was watched successfully, credit points
                await apiCall('/api/ads', {
                    method: 'PATCH',
                    body: JSON.stringify({ adViewId, userId: user.id })
                })

                // Start cooldown
                setAdCooldown(30)
                const timer = setInterval(() => {
                    setAdCooldown(prev => {
                        if (prev <= 1) {
                            clearInterval(timer)
                            return 0
                        }
                        return prev - 1
                    })
                }, 1000)

                // Trigger user data refresh
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('kojo:user:update'))
                }
            } else {
                alert('Ad was not completed. Please watch the full ad to earn points.')
            }
        } catch (err) {
            console.error('Error showing ad:', err)
            alert('Ad failed to load. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                            <Play className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Watch Ads & Earn</h1>
                            <p className="text-sm text-muted-foreground">Earn 5 points per ad watched</p>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <Card className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">Ads Watched Today</p>
                                <p className="text-2xl font-bold">{user.todayProgress?.adsWatched || 0}/10</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-100 text-sm">Points Earned</p>
                                <p className="text-2xl font-bold">{(user.todayProgress?.adsWatched || 0) * 5} pts</p>
                            </div>
                        </div>
                        <Progress
                            value={Math.min(((user.todayProgress?.adsWatched || 0) / 10) * 100, 100)}
                            className="mt-3 h-2 bg-blue-400/30"
                        />
                    </CardContent>
                </Card>

                {/* Ad Watch Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Play className="h-5 w-5 text-blue-500" />
                            <span>Rewarded Video Ads</span>
                        </CardTitle>
                        <CardDescription>Watch short video ads to earn points instantly</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4">
                            <div className="p-4 border rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                            <Play className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Standard Video Ad</h3>
                                            <p className="text-sm text-muted-foreground">30-60 seconds</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-blue-500 text-white">5 pts</Badge>
                                </div>
                                <Button
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white h-12 text-lg"
                                    disabled={adCooldown > 0}
                                    onClick={handleWatchAd}
                                >
                                    {adCooldown > 0 ? `⏱️ Wait ${adCooldown}s` : '▶️ Watch Ad Now'}
                                </Button>
                                {adCooldown > 0 && (
                                    <p className="text-center text-sm text-muted-foreground mt-2">
                                        Cooldown active - please wait before watching another ad
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                            <h4 className="font-semibold flex items-center space-x-2 mb-2">
                                <span>💡</span>
                                <span>Tips for Earning More</span>
                            </h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Watch up to 10 ads per day for maximum earnings</li>
                                <li>• Ads are available on the mobile app only</li>
                                <li>• Complete the full video to earn your reward</li>
                                <li>• Check back regularly for new ad opportunities</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

interface EarnTabProps {
    user: User
    userPoints: number
    setUserPoints: (updater: (prev: number) => number) => void
    setActiveView: (val: 'news' | 'trivia' | 'ads' | null) => void
}

function EarnTab({ user, userPoints, setUserPoints, setActiveView }: EarnTabProps) {
    const [adCooldown, setAdCooldown] = useState(0)
    const [view, setView] = useState<'list' | 'offerwall' | 'africa-offerwalls' | 'surveys' | 'missions' | 'referrals' | 'challenges' | 'tournament' | 'games'>('list')


    // Africa Offerwalls (Wannads, Adgate, Monlix) - PRIMARY offerwall option
    if (view === 'offerwall' || view === 'africa-offerwalls') {
        return <AfricaOfferwallSystem userId={user?.id} onClose={() => setView('list')} />
    }

    // Africa Surveys (Wannads, Adgate, Monlix) - Using survey APIs
    if (view === 'surveys') {
        return <AfricaSurveySystem userId={user?.id} onClose={() => setView('list')} />
    }

    if (view === 'missions') {
        return <MissionSystem userId={user?.id} onClose={() => setView('list')} />
    }

    if (view === 'referrals') {
        return <ReferralSystem user={user} onClose={() => setView('list')} />
    }

    if (view === 'challenges') {
        return <DailyChallengeSystem userId={user?.id} onClose={() => setView('list')} />
    }

    if (view === 'tournament') {
        return <TournamentSystem userId={user?.id} onClose={() => setView('list')} />
    }

    if (view === 'games') {
        return <GameRewardSystem userId={user?.id} onClose={() => setView('list')} />
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('offerwall')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-yellow-300" />
                            <span>Offerwall Tasks</span>
                        </CardTitle>
                        <CardDescription className="text-indigo-100">Earn up to 5000+ pts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>High Rewards</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">Hot</Badge>
                        </div>
                        <Button className="w-full bg-white text-indigo-600 hover:bg-white/90">
                            View Offers
                        </Button>
                        <p className="text-xs text-indigo-100">
                            Apps, games & surveys
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('surveys')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Brain className="h-5 w-5 text-yellow-300" />
                            <span>Take Surveys</span>
                        </CardTitle>
                        <CardDescription className="text-teal-100">Earn 500-2000 pts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Available</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">5 New</Badge>
                        </div>
                        <Button className="w-full bg-white text-teal-600 hover:bg-white/90">
                            Start Survey
                        </Button>
                        <p className="text-xs text-teal-100">
                            5-15 mins average time
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('missions')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Gift className="h-5 w-5 text-yellow-300" />
                            <span>Quick Missions</span>
                        </CardTitle>
                        <CardDescription className="text-orange-100">Simple tasks, instant pay</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Easy Tasks</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">Daily</Badge>
                        </div>
                        <Button className="w-full bg-white text-orange-600 hover:bg-white/90">
                            Start Mission
                        </Button>
                        <p className="text-xs text-orange-100">
                            Social, Review & Install
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('referrals')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-yellow-300" />
                            <span>Refer & Earn</span>
                        </CardTitle>
                        <CardDescription className="text-violet-100">10% commission forever</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Lifetime Rewards</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">Passive</Badge>
                        </div>
                        <Button className="w-full bg-white text-violet-600 hover:bg-white/90">
                            Invite Friends
                        </Button>
                        <p className="text-xs text-violet-100">
                            Earn ₦1,000 for every 10 invites
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('games')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Gamepad2 className="h-5 w-5 text-yellow-300" />
                            <span>Play Games</span>
                        </CardTitle>
                        <CardDescription className="text-pink-100">Win up to 1000 pts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Skill & Quiz</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">Fun</Badge>
                        </div>
                        <Button className="w-full bg-white text-pink-600 hover:bg-white/90">
                            Play Now
                        </Button>
                        <p className="text-xs text-pink-100">
                            Games, Quizzes & Playtime
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('challenges')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Trophy className="h-5 w-5 text-white/90" />
                            <span>Daily Daily Challenges</span>
                        </CardTitle>
                        <CardDescription className="text-yellow-100">Claim your rewards</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Checklist</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">Reset 24h</Badge>
                        </div>
                        <Button className="w-full bg-white text-orange-600 hover:bg-white/90">
                            View Streak
                        </Button>
                        <p className="text-xs text-yellow-100">
                            Bonus Chest Available!
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-none shadow-lg transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => setView('tournament')}>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Medal className="h-5 w-5 text-yellow-300" />
                            <span>Weekly Cup</span>
                        </CardTitle>
                        <CardDescription className="text-blue-100">Compete for ₦100k</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Top 100 Win</span>
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">Live</Badge>
                        </div>
                        <Button className="w-full bg-white text-blue-600 hover:bg-white/90">
                            See Rankings
                        </Button>
                        <p className="text-xs text-blue-100">
                            Ends in 2 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Play className="h-5 w-5 text-blue-500" />
                            <span>Ad View Tasks</span>
                        </CardTitle>
                        <CardDescription>Watch ads to earn points</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Standard Ad</span>
                            <Badge variant="secondary">5 pts</Badge>
                        </div>
                        <Button
                            className="w-full"
                            disabled={adCooldown > 0}
                            onClick={() => setActiveView('ads')}
                        >
                            {adCooldown > 0 ? `Cooldown: ${adCooldown}s` : 'Watch Ad'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            30-60 second cooldown between ads
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-green-500" />
                            <span>News Tasks</span>
                        </CardTitle>
                        <CardDescription>Read stories and answer quizzes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Daily News</span>
                            <Badge variant="secondary">10 pts</Badge>
                        </div>
                        <Button className="w-full" variant="outline" onClick={() => setActiveView('news')}>
                            Read Stories
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            10 new stories available today
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Brain className="h-5 w-5 text-purple-500" />
                            <span>Trivia Tasks</span>
                        </CardTitle>
                        <CardDescription>Test your knowledge</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Daily Trivia</span>
                            <Badge variant="secondary">50 pts</Badge>
                        </div>
                        <Button className="w-full" variant="outline" onClick={() => setActiveView('trivia')}>
                            Play Trivia
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            5-10 questions with bonus rewards
                        </p>
                    </CardContent>
                </Card>
            </div>



            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Gift className="h-5 w-5 text-orange-500" />
                        <span>Special Offers</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold">Streak Bonus</h4>
                            <p className="text-sm text-muted-foreground">
                                {user.dailyStreak >= 7
                                    ? '🎉 7 day streak achieved! Keep it up!'
                                    : `${user.dailyStreak}/7 days - 100 bonus points at 7 days`}
                            </p>
                            <Progress value={(user.dailyStreak / 7) * 100} className="mt-2 h-2" />
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold">Referral Reward</h4>
                            <p className="text-sm text-muted-foreground">Invite friends = 100 points each</p>
                            <Button
                                size="sm"
                                className="mt-2"
                                variant="outline"
                                onClick={async () => {
                                    if (!user?.referralCode) {
                                        alert('Referral code not available yet.')
                                        return
                                    }
                                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                                    const link = `${origin}/?ref=${encodeURIComponent(user.referralCode)}`
                                    try {
                                        if (navigator.share) {
                                            await navigator.share({ title: 'Join Kojomoney', text: 'Sign up and earn with my referral!', url: link })
                                        } else {
                                            await navigator.clipboard.writeText(link)
                                            alert('Referral link copied to clipboard!')
                                        }
                                    } catch (_) {
                                        try {
                                            await navigator.clipboard.writeText(link)
                                            alert('Referral link copied to clipboard!')
                                        } catch (e) {
                                            alert(`Referral link: ${link}`)
                                        }
                                    }
                                }}
                            >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share Referral Link
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}


interface HomeTabProps {
    user: User
    userPoints: number
    setActiveTab: (val: string) => void
    setActiveView: (val: 'news' | 'trivia' | 'ads' | null) => void
}

function HomeTab({ user, userPoints, setActiveTab, setActiveView }: HomeTabProps) {
    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome back, {user.name || user.email}!</CardTitle>
                    <CardDescription className="text-purple-100">
                        Ready to earn more points today?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-3xl font-bold">{userPoints.toLocaleString()}</p>
                            <p className="text-purple-100">Total Points</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-semibold">{user.dailyStreak} days</p>
                            <p className="text-purple-100">Daily Streak</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('ads')}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                            <Play className="h-6 w-6 text-blue-500" />
                            <CardTitle className="text-lg">Watch an Ad</CardTitle>
                        </div>
                        <CardDescription>Earn 5 points per ad</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            Start Watching
                        </Button>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('news')}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                            <BookOpen className="h-6 w-6 text-green-500" />
                            <CardTitle className="text-lg">Read Today's Stories</CardTitle>
                        </div>
                        <CardDescription>Earn 10 points per story</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            Read Stories
                        </Button>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('trivia')}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                            <Brain className="h-6 w-6 text-purple-500" />
                            <CardTitle className="text-lg">Play Daily Trivia</CardTitle>
                        </div>
                        <CardDescription>Earn 50 points bonus</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            Play Now
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Daily Progress</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Ads Watched</span>
                            <span>{user.todayProgress?.adsWatched || 0}/10</span>
                        </div>
                        <Progress value={Math.min(((user.todayProgress?.adsWatched || 0) / 10) * 100, 100)} className="h-2" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Stories Read</span>
                            <span>{user.todayProgress?.storiesRead || 0}/5</span>
                        </div>
                        <Progress value={Math.min(((user.todayProgress?.storiesRead || 0) / 5) * 100, 100)} className="h-2" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Daily Trivia</span>
                            <span>{user.todayProgress?.triviaCompleted ? 'Completed' : 'Not completed'}</span>
                        </div>
                        <Progress value={user.todayProgress?.triviaCompleted ? 100 : 0} className="h-2" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

interface WalletTabProps {
    user: User
    userPoints: number
    syncUserFromServer: () => Promise<void>
}

function WalletTab({ user, userPoints, syncUserFromServer }: WalletTabProps) {
    const [transactions, setTransactions] = useState<any[]>([])
    const [withdrawalForm, setWithdrawalForm] = useState({
        amount: '',
        bankName: '',
        accountNumber: '',
        accountName: ''
    })
    const [isLoadingWithdrawal, setIsLoadingWithdrawal] = useState(false)

    const fetchTransactions = async () => {
        try {
            const response = await fetch(`/api/withdrawal?userId=${user?.id}`)
            if (response.ok) {
                const data = await response.json()
                setTransactions(data.withdrawals || [])
            }
        } catch (error) {
        }
    }

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoadingWithdrawal(true)

        try {
            const response = await apiCall('/api/withdrawal', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user?.id,
                    amount: parseInt(withdrawalForm.amount),
                    bankName: withdrawalForm.bankName,
                    accountNumber: withdrawalForm.accountNumber,
                    accountName: withdrawalForm.accountName
                })
            })

            const data = await response.json()
            if (data.success) {
                setWithdrawalForm({ amount: '', bankName: '', accountNumber: '', accountName: '' })
                fetchTransactions()
                syncUserFromServer()
            }
        } catch (error) {
        } finally {
            setIsLoadingWithdrawal(false)
        }
    }

    useEffect(() => {
        fetchTransactions()
        syncUserFromServer()
    }, [])

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl">Total Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold mb-4">{userPoints.toLocaleString()} Points</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-semibold">{user?.adPoints || 0}</p>
                            <p className="text-green-100">From Ads</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold">{user?.newsPoints || 0}</p>
                            <p className="text-green-100">From News</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold">{user?.triviaPoints || 0}</p>
                            <p className="text-green-100">From Trivia</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Withdraw Points</CardTitle>
                    <CardDescription>
                        Minimum withdrawal: ₦1,000 (1,000 points)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleWithdrawal} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Amount (₦)</label>
                                <input
                                    type="number"
                                    className="w-full mt-1 px-3 py-2 border rounded-md"
                                    placeholder="Enter amount"
                                    min="1000"
                                    step="100"
                                    value={withdrawalForm.amount}
                                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Bank Name</label>
                                <select className="w-full mt-1 px-3 py-2 border rounded-md"
                                    value={withdrawalForm.bankName}
                                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, bankName: e.target.value }))}
                                    required>
                                    <option value="">Select Bank</option>
                                    <option value="Access Bank">Access Bank</option>
                                    <option value="GTBank">GTBank</option>
                                    <option value="First Bank">First Bank</option>
                                    <option value="UBA">UBA</option>
                                    <option value="Zenith Bank">Zenith Bank</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Account Number</label>
                            <input
                                type="text"
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                                placeholder="Enter account number"
                                value={withdrawalForm.accountNumber}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Account Name</label>
                            <input
                                type="text"
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                                placeholder="Enter account name"
                                value={withdrawalForm.accountName}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountName: e.target.value }))}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoadingWithdrawal || userPoints < 1000}>
                            {isLoadingWithdrawal ? 'Processing...' : 'Request Withdrawal'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            One withdrawal per week. Processing takes 24-48 hours.
                        </p>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Withdrawal History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {transactions.length > 0 ? (
                            transactions.map((transaction, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded">
                                    <div>
                                        <p className="font-medium">Withdrawal</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(transaction.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge variant={
                                        transaction.status === 'approved' ? 'default' :
                                            transaction.status === 'rejected' ? 'destructive' : 'secondary'
                                    }>
                                        ₦{transaction.amount}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No withdrawals yet
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}



interface ProfileTabProps {
    user: User
    setUser: (u: User | null) => void
    resolvedTheme?: string
    setTheme: (t: string) => void
    onLogout: () => void
    onShowLegal: (page: LegalPageType) => void
}

function ProfileTab({ user, setUser, resolvedTheme, setTheme, onLogout, onShowLegal }: ProfileTabProps) {
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || ''
    })
    const [isEditing, setIsEditing] = useState(false)
    const [referralStats, setReferralStats] = useState({
        totalReferrals: 0,
        pointsEarned: 0
    })

    const handleProfileUpdate = async () => {
        try {
            const response = await apiCall('/api/user', {
                method: 'PUT',
                body: JSON.stringify({
                    userId: user?.id,
                    ...profileForm
                })
            })

            if (response.ok) {
                const data = await response.json()
                setUser(data.user)
                setIsEditing(false)
                if (typeof window !== 'undefined') {
                    localStorage.setItem('kojomoneyUser', JSON.stringify(data.user))
                }
            }
        } catch (error) {
        }
    }

    const copyReferralCode = () => {
        if (user?.referralCode) {
            navigator.clipboard.writeText(user.referralCode)
            alert('Referral code copied to clipboard!')
        }
    }

    const fetchReferralStats = async () => {
        try {
            const response = await fetch(`/api/user?userId=${user?.id}`)
            if (response.ok) {
                const data = await response.json()
                const referralPoints = data.user.referralRewards?.reduce((sum: number, reward: any) => sum + reward.points, 0) || 0
                const referralCount = data.user.referralRewards?.length || 0

                setReferralStats({
                    totalReferrals: referralCount,
                    pointsEarned: referralPoints
                })
            }
        } catch (error) {
        }
    }

    useEffect(() => {
        fetchReferralStats()
    }, [user?.id])

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>Profile Information</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Full Name</label>
                            <input
                                type="text"
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                                placeholder="Enter your name"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                disabled={!isEditing}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone Number</label>
                            <input
                                type="tel"
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                                placeholder="+234..."
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                disabled={!isEditing}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                            placeholder="Enter your email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="flex space-x-2">
                        {isEditing ? (
                            <>
                                <Button onClick={handleProfileUpdate}>Save Changes</Button>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Share2 className="h-5 w-5" />
                        <span>Referral Program</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Your Referral Code</p>
                        <div className="flex items-center space-x-2">
                            <code className="flex-1 px-3 py-2 bg-background border rounded">{user?.referralCode || 'N/A'}</code>
                            <Button variant="outline" size="sm" onClick={copyReferralCode}>Copy</Button>
                        </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Share Referral Link</p>
                        <div className="flex items-center space-x-2">
                            <code className="flex-1 px-3 py-2 bg-background border rounded">
                                {typeof window !== 'undefined' && user?.referralCode ? `${window.location.origin}/?ref=${user.referralCode}` : 'N/A'}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    if (!user?.referralCode) return
                                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                                    const link = `${origin}/?ref=${encodeURIComponent(user.referralCode)}`
                                    try {
                                        if (navigator.share) {
                                            await navigator.share({ title: 'Join Kojomoney', text: 'Sign up and earn with my referral!', url: link })
                                        } else {
                                            await navigator.clipboard.writeText(link)
                                            alert('Referral link copied to clipboard!')
                                        }
                                    } catch (_) {
                                        try {
                                            await navigator.clipboard.writeText(link)
                                            alert('Referral link copied to clipboard!')
                                        } catch (e) {
                                            alert(`Referral link: ${link}`)
                                        }
                                    }
                                }}
                            >
                                Share
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold">{referralStats.totalReferrals}</p>
                            <p className="text-sm text-muted-foreground">Total Referrals</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{referralStats.pointsEarned}</p>
                            <p className="text-sm text-muted-foreground">Points Earned</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Bell className="h-4 w-4" />
                            <span>Push Notifications</span>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-background transition translate-x-6"></span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Moon className="h-4 w-4" />
                            <span>Dark Mode</span>
                        </div>
                        <button
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${resolvedTheme === 'dark' ? 'bg-primary' : 'bg-muted'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-background transition ${resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                            ></span>
                        </button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Legal & Privacy</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="justify-start" onClick={() => onShowLegal('privacy')}>
                            Privacy Policy
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => onShowLegal('terms')}>
                            Terms of Service
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => onShowLegal('cookies')}>
                            Cookie Policy
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => onShowLegal('gdpr')}>
                            GDPR & Data Rights
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Button variant="destructive" className="w-full" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
            </Button>
        </div>
    )
}

export default function EarnApp() {
    const [activeTab, setActiveTab] = useState('home')
    const [activeView, setActiveView] = useState<'news' | 'trivia' | 'ads' | null>(null)
    const [activeLegalPage, setActiveLegalPage] = useState<LegalPageType | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [userPoints, setUserPoints] = useState(0)
    const [isClient, setIsClient] = useState(false)
    const { resolvedTheme, setTheme } = useTheme()

    useEffect(() => {
        setIsClient(true)
        // Check for existing user session only on client
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('kojomoneyUser') || localStorage.getItem('earnAppUser')
            if (savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser)
                    setUser(parsedUser)
                    setUserPoints(parsedUser.totalPoints)
                } catch (error) {
                    localStorage.removeItem('kojomoneyUser')
                }
            }
        }
    }, [])

    const syncUserFromServer = async () => {
        try {
            // Always try to get the latest ID from localStorage if state is stale
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('kojomoneyUser') : null
            const id = user?.id || (savedUser ? JSON.parse(savedUser).id : null)

            if (!id) return

            const res = await fetch(`/api/user?userId=${encodeURIComponent(id)}`)
            const data = await res.json()
            if (data?.user) {
                setUser(data.user)
                setUserPoints(Number(data.user.totalPoints || 0))
                localStorage.setItem('kojomoneyUser', JSON.stringify(data.user))
            }
        } catch (e) { }
    }

    useEffect(() => {
        const handler = () => {
            // Fetch fresh data from server when notified of updates
            // Add a small delay to ensure backend consistency
            setTimeout(() => {
                syncUserFromServer()
            }, 500)
        }

        window.addEventListener('kojo:user:update', handler)
        window.addEventListener('kojo:points:earned', handler)

        return () => {
            window.removeEventListener('kojo:user:update', handler)
            window.removeEventListener('kojo:points:earned', handler)
        }
    }, [])

    useEffect(() => {
        // Sync whenever tab changes to ensure fresh data
        syncUserFromServer()
    }, [activeTab])

    // Push notifications setup (must be before conditional returns)
    useEffect(() => {
        const isNative = typeof window !== 'undefined' && (
            ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
            (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
        )
        if (!isNative || !user?.id) return
        const setupPush = async () => {
            try {
                // const perm = await PushNotifications.requestPermissions()
                // if (perm.receive !== 'granted') return
                // await PushNotifications.register()
                // const tok = await FirebaseMessaging.getToken()
                // if ((tok as any)?.token) {
                //     await apiCall('/api/push', {
                //         method: 'POST',
                //         body: JSON.stringify({ userId: user.id, token: (tok as any).token, platform: (window as any).Capacitor.getPlatform?.() })
                //     })
                // }
            } catch (_) { }
        }
        setupPush()
    }, [user?.id])

    // Analytics screen tracking (must be before conditional returns)
    useEffect(() => {
        const isNative = typeof window !== 'undefined' && (
            ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
            (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
        )
        if (!isNative) return
        const screen = activeTab
        try {
            // FirebaseAnalytics.logEvent({ name: 'screen_view', params: { screen_name: screen } })
        } catch (error) {
            // Firebase not initialized in browser - this is expected
        }
    }, [activeTab])

    const handleAuthSuccess = (userData: User) => {
        setUser(userData)
        setUserPoints(userData.totalPoints)
        // Update localStorage only on client
        if (typeof window !== 'undefined') {
            localStorage.setItem('kojomoneyUser', JSON.stringify(userData))
        }
    }

    const handleLogout = () => {
        setUser(null)
        setUserPoints(0)
        if (typeof window !== 'undefined') {
            localStorage.removeItem('kojomoneyUser')
        }
        if (typeof window !== 'undefined') {
            localStorage.removeItem('kojomoneyUser')
        }
        setActiveTab('home')
        setActiveView(null)
    }

    // Don't render anything until client-side hydration is complete
    if (!isClient) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        )
    }

    // If not authenticated, show auth system
    if (!user) {
        return (
            <>
                <AuthSystem onAuthSuccess={handleAuthSuccess} />
                <Toaster />
            </>
        )
    }









    // Handle dedicated activity views (full-screen pages)
    const handleCloseActivityView = () => {
        setActiveView(null)
        // Sync user data when returning from activity page
        syncUserFromServer()
    }

    if (activeView === 'news') {
        return (
            <>
                <NewsPage user={user} onBack={handleCloseActivityView} />
                <Toaster />
            </>
        )
    }

    if (activeView === 'trivia') {
        return (
            <>
                <TriviaPage user={user} onBack={handleCloseActivityView} />
                <Toaster />
            </>
        )
    }

    if (activeView === 'ads') {
        return (
            <>
                <AdsPage user={user} onBack={handleCloseActivityView} />
                <Toaster />
            </>
        )
    }

    if (activeLegalPage) {
        return (
            <LegalPages
                initialPage={activeLegalPage}
                onClose={() => setActiveLegalPage(null)}
            />
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                            <Coins className="h-8 w-8 text-primary" />
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                KojoMoney
                            </h1>
                        </div>
                        <NotificationCenter />
                    </div>

                    <TabsList className="grid w-full grid-cols-4 mb-8">
                        <TabsTrigger value="home" className="space-x-2">
                            <Home className="h-4 w-4" />
                            <span className="hidden md:inline">Home</span>
                        </TabsTrigger>
                        <TabsTrigger value="earn" className="space-x-2">
                            <Play className="h-4 w-4" />
                            <span className="hidden md:inline">Earn</span>
                        </TabsTrigger>
                        <TabsTrigger value="wallet" className="space-x-2">
                            <Wallet className="h-4 w-4" />
                            <span className="hidden md:inline">Wallet</span>
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="space-x-2">
                            <User className="h-4 w-4" />
                            <span className="hidden md:inline">Profile</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="home" className="space-y-4">
                        {user && (
                            <HomeTab user={user} userPoints={userPoints} setActiveTab={setActiveTab} setActiveView={setActiveView} />
                        )}
                    </TabsContent>

                    <TabsContent value="earn" className="space-y-4">
                        {user && (
                            <EarnTab user={user} userPoints={userPoints} setUserPoints={setUserPoints} setActiveView={setActiveView} />
                        )}
                    </TabsContent>

                    <TabsContent value="wallet" className="space-y-4">
                        {user && (
                            <WalletTab user={user} userPoints={userPoints} syncUserFromServer={syncUserFromServer} />
                        )}
                    </TabsContent>

                    <TabsContent value="profile" className="space-y-4">
                        {user && (
                            <ProfileTab
                                user={user}
                                setUser={setUser}
                                resolvedTheme={resolvedTheme}
                                setTheme={setTheme}
                                onLogout={handleLogout}
                                onShowLegal={setActiveLegalPage}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
