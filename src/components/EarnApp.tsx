'use client'

import { useState, useEffect } from 'react'
import { DAILY_LIMITS as DEFAULT_DAILY_LIMITS, EARNING_RATES as DEFAULT_EARNING_RATES } from '@/lib/points-config'
import { useEconomyStore, useEconomyInit } from '@/store/economyStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Home, Coins, Wallet, User, Play, BookOpen, Brain, Clock, TrendingUp, Gift, Settings, Share2, Bell, Moon, LogOut, Users, Trophy, Medal, ArrowLeft, FileText, Gamepad2, CheckCircle, Sparkles, UserCircle, Shield, ChevronRight, Landmark, Building, Bitcoin, Smartphone } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { apiCall } from '@/lib/api-client'
import AdService from '@/services/adService'
import { useBannerAd } from '@/hooks/useAds'

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
import { FloatingNotificationContainer, FloatingNotifications } from '@/components/notifications/FloatingNotification'
import { useEngagementNotifications } from '@/hooks/useEngagementNotifications'
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
    gamePoints?: number
    dailyStreak: number
    lastActiveDate?: string
    referralRewards?: any[]
    todayProgress?: {
        adsWatched: number
        storiesRead: number
        triviaCompleted: boolean
    }
    // Extended fields for TrustBadges
    createdAt?: number | string
    emailVerified?: boolean
    phoneVerified?: boolean
    hasWithdrawn?: boolean
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

const LuckySpin = dynamic(() => import('./LuckySpin'), {
    ssr: false,
    loading: () => null
})

const UserLevelDisplay = dynamic(() => import('./UserLevelDisplay'), {
    ssr: false
})

const TrustBadges = dynamic(() => import('./TrustBadges'), {
    ssr: false
})

const StreakDisplay = dynamic(() => import('./StreakDisplay'), {
    ssr: false
})

const HappyHour = dynamic(() => import('./HappyHour'), {
    ssr: false
})

const SocialProofTicker = dynamic(() => import('./SocialProofTicker'), {
    ssr: false
})

const Onboarding = dynamic(() => import('./Onboarding'), {
    ssr: false
})

const AIChatbot = dynamic(() => import('./AIChatbot'), {
    ssr: false
})


// Dedicated Page Components for focused activity experience
interface DedicatedPageProps {
    user: User
    onBack: () => void
}

function NewsPage({ user: initialUser, onBack }: DedicatedPageProps) {
    const dailyLimits = useEconomyStore(state => state.dailyLimits)
    const earningRates = useEconomyStore(state => state.earningRates)
    const [user, setUser] = useState<User>(initialUser)

    // Show banner ad at bottom
    useBannerAd('bottom', true)

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
        <div className="min-h-screen bg-background pb-16"> {/* Added padding for banner */}
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
                                <p className="text-2xl font-bold">{user.todayProgress?.storiesRead || 0}/{dailyLimits.maxNews}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-green-100 text-sm">Points Earned</p>
                                <p className="text-2xl font-bold">{(user.todayProgress?.storiesRead || 0) * earningRates.readNews} pts</p>
                            </div>
                        </div>
                        <Progress
                            value={Math.min(((user.todayProgress?.storiesRead || 0) / dailyLimits.maxNews) * 100, 100)}
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
    const dailyLimits = useEconomyStore(state => state.dailyLimits)
    const earningRates = useEconomyStore(state => state.earningRates)
    const [user, setUser] = useState<User>(initialUser)

    // Show banner ad at bottom
    useBannerAd('bottom', true)

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
        <div className="min-h-screen bg-background pb-16"> {/* Added padding for banner */}
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
                            <p className="text-sm text-muted-foreground">Answer questions and earn up to {earningRates.triviaBonus} bonus points</p>
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
    const earningRates = useEconomyStore(state => state.earningRates)
    const dailyLimits = useEconomyStore(state => state.dailyLimits)
    const [adCooldown, setAdCooldown] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    // Show banner ad at bottom
    useBannerAd('bottom', true)

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
                const creditRes = await apiCall('/api/ads', {
                    method: 'PATCH',
                    body: JSON.stringify({ adViewId, userId: user.id })
                })
                const creditData = await creditRes.json()

                // Show multiplier feedback notification
                if (creditData.success && creditData.pointsAwarded) {
                    FloatingNotifications.pointsEarned({
                        source: 'Ad Watch',
                        basePoints: creditData.basePoints || 5,
                        finalPoints: creditData.pointsAwarded,
                        happyHourMultiplier: creditData.happyHourMultiplier,
                        happyHourName: creditData.happyHourName,
                        streakMultiplier: creditData.streakMultiplier,
                        streakName: creditData.streakName
                    })
                }

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
                            <p className="text-sm text-muted-foreground">Earn {earningRates.watchAd} points per ad watched</p>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <Card className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">Ads Watched Today</p>
                                <p className="text-2xl font-bold">{user.todayProgress?.adsWatched || 0}/{dailyLimits.maxAds}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-100 text-sm">Points Earned</p>
                                <p className="text-2xl font-bold">{(user.todayProgress?.adsWatched || 0) * earningRates.watchAd} pts</p>
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
    const earningRates = useEconomyStore(state => state.earningRates)
    const dailyLimits = useEconomyStore(state => state.dailyLimits)
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
                        <CardDescription className="text-teal-100">Earn {earningRates.surveyMin}-{earningRates.surveyMax} pts</CardDescription>
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
                            Earn 1,000 pts for every 10 invites
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
                        <CardDescription className="text-blue-100">Compete for huge prizes</CardDescription>
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
                            <Badge variant="secondary">{earningRates.watchAd} pts</Badge>
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
                            <Badge variant="secondary">{earningRates.readNews} pts</Badge>
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
                            <Progress value={(user.dailyStreak / 7) * 100} className="mt-2 h-2 bg-orange-200 dark:bg-orange-900/50 [&>div]:bg-orange-500 dark:[&>div]:bg-orange-400" />
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
    onOpenSpin: () => void
}

function HomeTab({ user, userPoints, setActiveTab, setActiveView, onOpenSpin }: HomeTabProps) {
    const dailyLimits = useEconomyStore(state => state.dailyLimits)
    const earningRates = useEconomyStore(state => state.earningRates)
    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Welcome back, {user.name || user.email}!</CardTitle>
                            <CardDescription className="text-purple-100">
                                Ready to earn more points today?
                            </CardDescription>
                        </div>
                        <Button
                            onClick={onOpenSpin}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-yellow-600 font-bold shadow-lg animate-pulse"
                            size="sm"
                        >
                            <Sparkles className="h-4 w-4 mr-1" />
                            SPIN &amp; WIN
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <UserLevelDisplay points={userPoints} />

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur-sm">
                            <p className="text-2xl font-bold">{userPoints.toLocaleString()}</p>
                            <p className="text-xs text-purple-100 uppercase tracking-wider">Total Points</p>
                        </div>
                        <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur-sm">
                            <p className="text-2xl font-bold">{user.dailyStreak} Days</p>
                            <p className="text-xs text-purple-100 uppercase tracking-wider">Current Streak</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Streak Multiplier Display */}
            <StreakDisplay dailyStreak={user.dailyStreak || 0} />

            {/* Happy Hour - Time-based earning boosts */}
            <HappyHour />

            {/* 🚀 Boost Earnings Card - Watch ad for 2x next reward */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg cursor-pointer overflow-hidden relative"
                    onClick={async () => {
                        // Check if on native platform
                        const isNative = typeof window !== 'undefined' && (
                            ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
                            (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
                        )

                        if (!isNative) {
                            alert('Boost Earnings ads are only available in the Kojomoney mobile app.')
                            return
                        }

                        try {
                            const reward = await AdService.showRewarded()
                            if (reward) {
                                // Store boost state for next activity
                                localStorage.setItem('kojomoneyEarningsBoost', JSON.stringify({
                                    active: true,
                                    multiplier: 2,
                                    expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
                                }))
                                alert('🎉 2x Boost Activated! Your next earning activity will give double points!')
                            }
                        } catch (err) {
                            console.error('Error showing boost ad:', err)
                        }
                    }}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10" />
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
                                <span className="text-2xl">🚀</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Boost Your Earnings</h3>
                                <p className="text-sm text-emerald-100">Watch ad for 2x points on next activity!</p>
                            </div>
                        </div>
                        <Button size="icon" className="rounded-full bg-white/20 hover:bg-white/30 text-white shadow-md border border-white/30">
                            <Play className="h-5 w-5 fill-current" />
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Daily Spin Card - Retention Booster */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card
                    className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700 cursor-pointer overflow-hidden relative"
                    onClick={onOpenSpin}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-2xl -mr-10 -mt-10" />
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center border-2 border-yellow-400">
                                <span className="text-2xl">🎰</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200">Daily Lucky Spin</h3>
                                <p className="text-sm text-amber-600 dark:text-amber-400">Win up to 500 bonus points daily!</p>
                            </div>
                        </div>
                        <Button size="icon" className="rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-md">
                            <Play className="h-5 w-5 fill-current" />
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('ads')}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                            <Play className="h-6 w-6 text-blue-500" />
                            <CardTitle className="text-lg">Watch an Ad</CardTitle>
                        </div>
                        <CardDescription>Earn {earningRates.watchAd} points per ad</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            Start Watching
                        </Button>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/blog'}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-6 w-6 text-orange-500" />
                            <CardTitle className="text-lg">Blog & Guides</CardTitle>
                        </div>
                        <CardDescription>Tips, tricks & payment proofs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            Visit Blog
                        </Button>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('news')}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                            <BookOpen className="h-6 w-6 text-green-500" />
                            <CardTitle className="text-lg">Read Today's Stories</CardTitle>
                        </div>
                        <CardDescription>Earn {earningRates.readNews} points per story</CardDescription>
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
                        <CardDescription>Earn {earningRates.triviaBonus} points bonus</CardDescription>
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
                            <span>{user.todayProgress?.adsWatched || 0}/{dailyLimits.maxAds}</span>
                        </div>
                        <Progress value={Math.min(((user.todayProgress?.adsWatched || 0) / dailyLimits.maxAds) * 100, 100)} className="h-2 bg-purple-200 dark:bg-purple-900/50 [&>div]:bg-purple-500 dark:[&>div]:bg-purple-400" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Stories Read</span>
                            <span>{user.todayProgress?.storiesRead || 0}/{dailyLimits.maxNews}</span>
                        </div>
                        <Progress value={Math.min(((user.todayProgress?.storiesRead || 0) / dailyLimits.maxNews) * 100, 100)} className="h-2 bg-purple-200 dark:bg-purple-900/50 [&>div]:bg-purple-500 dark:[&>div]:bg-purple-400" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Daily Trivia</span>
                            <span>{user.todayProgress?.triviaCompleted ? 'Completed' : 'Not completed'}</span>
                        </div>
                        <Progress value={user.todayProgress?.triviaCompleted ? 100 : 0} className="h-2 bg-purple-200 dark:bg-purple-900/50 [&>div]:bg-purple-500 dark:[&>div]:bg-purple-400" />
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}

interface WalletTabProps {
    user: User
    userPoints: number
    syncUserFromServer: () => Promise<void>
}

function WalletTab({ user, userPoints, syncUserFromServer }: WalletTabProps) {
    const dailyLimits = useEconomyStore(state => state.dailyLimits)
    const pointsConfig = useEconomyStore(state => state.pointsConfig)
    const [withdrawals, setWithdrawals] = useState<any[]>([])
    const [earnings, setEarnings] = useState<any[]>([])
    const [earningSummary, setEarningSummary] = useState<any>(null)
    const [historyTab, setHistoryTab] = useState<'earnings' | 'withdrawals'>('earnings')
    const [withdrawalForm, setWithdrawalForm] = useState({
        amount: '',
        method: 'bank_transfer',
        bankName: '',
        accountNumber: '',
        accountName: '',
        paypalEmail: '',
        walletAddress: '',
        cryptoNetwork: 'USDT (TRC20)',
        phoneNumber: '', // For Airtime
        giftCardBrand: '', // For Gift Cards
        recipientEmail: '', // For Gift Cards
        bankCode: '' // For bank verification
    })
    const [isLoadingWithdrawal, setIsLoadingWithdrawal] = useState(false)
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(false)

    // Bank verification state
    const [isVerifyingBank, setIsVerifyingBank] = useState(false)
    const [bankVerificationError, setBankVerificationError] = useState<string | null>(null)

    // Bank code to name mapping
    const BANK_OPTIONS = [
        { code: '044', name: 'Access Bank' },
        { code: '058', name: 'GTBank' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '033', name: 'United Bank for Africa (UBA)' },
        { code: '057', name: 'Zenith Bank' },
        { code: '50211', name: 'Kuda Bank' },
        { code: '999992', name: 'OPay' },
        { code: '100033', name: 'PalmPay' },
        { code: '50515', name: 'Moniepoint' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '232', name: 'Sterling Bank' },
        { code: '221', name: 'Stanbic IBTC Bank' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '035', name: 'Wema Bank' },
        { code: '214', name: 'First City Monument Bank' },
        { code: '076', name: 'Polaris Bank' },
    ]

    // Auto-verify bank account when account number and bank are filled
    const verifyBankAccount = async (accountNumber: string, bankCode: string) => {
        if (accountNumber.length !== 10 || !bankCode) return

        setIsVerifyingBank(true)
        setBankVerificationError(null)

        try {
            const response = await apiCall(`/api/bank/verify?account_number=${accountNumber}&bank_code=${bankCode}`)
            const data = await response.json()

            if (data.success && data.account_name) {
                setWithdrawalForm(prev => ({
                    ...prev,
                    accountName: data.account_name
                }))
            } else {
                setBankVerificationError(data.error || 'Could not verify account')
            }
        } catch (error) {
            console.error('Bank verification error:', error)
            setBankVerificationError('Verification service unavailable')
        } finally {
            setIsVerifyingBank(false)
        }
    }

    // Diesel Economy: User's withdrawal rate based on country
    const [rateInfo, setRateInfo] = useState<{
        country: string
        multiplier: number
        usdPer1000Points: number
    } | null>(null)

    // Fetch user's withdrawal rate
    const fetchWithdrawalRate = async () => {
        try {
            const response = await apiCall(`/api/user/withdrawal-rate?userId=${user?.id}`)
            if (response.ok) {
                const data = await response.json()
                setRateInfo({
                    country: data.country,
                    multiplier: data.multiplier,
                    usdPer1000Points: data.usdPer1000Points
                })
            }
        } catch (error) {
            console.error('Failed to fetch withdrawal rate:', error)
        }
    }

    // Calculate estimated USD for current amount
    const estimatedUSD = withdrawalForm.amount && rateInfo
        ? (parseInt(withdrawalForm.amount) / 1000 * rateInfo.usdPer1000Points).toFixed(2)
        : '0.00'

    // Show banner ad at bottom of wallet tab
    useBannerAd('bottom', true)

    const fetchWithdrawals = async () => {
        try {
            const response = await apiCall(`/api/withdrawal?userId=${user?.id}`)
            if (response.ok) {
                const data = await response.json()
                setWithdrawals(data.withdrawals || [])
            }
        } catch (error) {
            console.error('Failed to fetch withdrawals:', error)
        }
    }

    const fetchEarnings = async () => {
        setIsLoadingEarnings(true)
        try {
            const response = await apiCall(`/api/user/earnings?userId=${user?.id}&limit=50`)
            if (response.ok) {
                const data = await response.json()
                setEarnings(data.earnings || [])
                setEarningSummary(data.summary || null)
            }
        } catch (error) {
            console.error('Failed to fetch earnings:', error)
        } finally {
            setIsLoadingEarnings(false)
        }
    }

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoadingWithdrawal(true)

        try {
            // Show a pre-withdrawal rewarded interstitial (user gets bonus for watching)
            await AdService.showRewardedInterstitial()

            // Construct payload based on method
            const payload: any = {
                userId: user?.id,
                amount: parseInt(withdrawalForm.amount),
                method: withdrawalForm.method
            }

            if (withdrawalForm.method === 'bank_transfer') {
                payload.bankName = withdrawalForm.bankName
                payload.accountNumber = withdrawalForm.accountNumber
                payload.accountName = withdrawalForm.accountName
            } else if (withdrawalForm.method === 'paypal') {
                payload.paypalEmail = withdrawalForm.paypalEmail
            } else if (withdrawalForm.method === 'crypto') {
                payload.walletAddress = withdrawalForm.walletAddress
                payload.cryptoNetwork = withdrawalForm.cryptoNetwork
            } else if (withdrawalForm.method === 'airtime') {
                payload.phoneNumber = withdrawalForm.phoneNumber
            } else if (withdrawalForm.method === 'gift_card') {
                payload.giftCardBrand = withdrawalForm.giftCardBrand
                payload.recipientEmail = withdrawalForm.recipientEmail
            }

            const response = await apiCall('/api/withdrawal', {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            if (data.success) {
                setWithdrawalForm(prev => ({ ...prev, amount: '' })) // Keep details for convenience
                fetchWithdrawals()
                syncUserFromServer()
                alert('Withdrawal request submitted successfully!')
            } else {
                alert(data.error || 'Failed to submit withdrawal')
            }
        } catch (error: any) {
            alert(error.message || 'An error occurred')
        } finally {
            setIsLoadingWithdrawal(false)
        }
    }

    useEffect(() => {
        fetchWithdrawals()
        fetchEarnings()
        fetchWithdrawalRate()
        syncUserFromServer()
    }, [])

    // Get icon and color for earning type
    const getEarningStyle = (type: string) => {
        switch (type) {
            case 'ad_reward':
            case 'ad_watch':
                return { icon: <Play className="h-4 w-4" />, color: 'text-blue-500', bg: 'bg-blue-100' }
            case 'news_reward':
            case 'news_read':
                return { icon: <BookOpen className="h-4 w-4" />, color: 'text-green-500', bg: 'bg-green-100' }
            case 'trivia_reward':
            case 'trivia_complete':
                return { icon: <Brain className="h-4 w-4" />, color: 'text-purple-500', bg: 'bg-purple-100' }
            case 'game_reward':
                return { icon: <Gamepad2 className="h-4 w-4" />, color: 'text-pink-500', bg: 'bg-pink-100' }
            case 'mini_game_reward':
                return { icon: <Gamepad2 className="h-4 w-4" />, color: 'text-amber-500', bg: 'bg-amber-100' }
            case 'offerwall':
            case 'offer_complete':
                return { icon: <Gift className="h-4 w-4" />, color: 'text-orange-500', bg: 'bg-orange-100' }
            case 'survey':
            case 'survey_complete':
                return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-teal-500', bg: 'bg-teal-100' }
            case 'referral':
            case 'referral_bonus':
                return { icon: <Users className="h-4 w-4" />, color: 'text-violet-500', bg: 'bg-violet-100' }
            default:
                return { icon: <Coins className="h-4 w-4" />, color: 'text-gray-500', bg: 'bg-gray-100' }
        }
    }

    return (
        <div className="space-y-6">
            {/* Balance Card */}
            <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl">Total Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold mb-4">{userPoints.toLocaleString()} Points</p>

                    {/* Earning Sources Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <p className="text-lg font-semibold">{earningSummary?.ads || user?.adPoints || 0}</p>
                            <p className="text-green-100">Ads</p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg">
                            <p className="text-lg font-semibold">{earningSummary?.news || user?.newsPoints || 0}</p>
                            <p className="text-green-100">News</p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg">
                            <p className="text-lg font-semibold">{earningSummary?.trivia || user?.triviaPoints || 0}</p>
                            <p className="text-green-100">Trivia</p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg">
                            <p className="text-lg font-semibold">{(earningSummary?.games || 0) + (earningSummary?.miniGames || 0) || user?.gamePoints || 0}</p>
                            <p className="text-green-100">Games</p>
                        </div>
                    </div>

                    {/* More sources */}
                    {earningSummary && (earningSummary.offerwalls > 0 || earningSummary.surveys > 0 || earningSummary.referrals > 0) && (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <p className="text-lg font-semibold">{earningSummary?.offerwalls || 0}</p>
                                <p className="text-green-100">Offers</p>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg">
                                <p className="text-lg font-semibold">{earningSummary?.surveys || 0}</p>
                                <p className="text-green-100">Surveys</p>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg">
                                <p className="text-lg font-semibold">{earningSummary?.referrals || 0}</p>
                                <p className="text-green-100">Referrals</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Withdrawal Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Withdraw Points</CardTitle>
                    <CardDescription>
                        Minimum withdrawal: 1,000 points
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleWithdrawal} className="space-y-4">
                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-5 gap-2">
                            <button
                                type="button"
                                onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'bank_transfer' }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${withdrawalForm.method === 'bank_transfer' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-muted hover:bg-muted'}`}
                            >
                                <Building className={`h-5 w-5 mb-1 ${withdrawalForm.method === 'bank_transfer' ? 'text-green-600' : 'text-muted-foreground'}`} />
                                <span className={`text-xs font-medium ${withdrawalForm.method === 'bank_transfer' ? 'text-green-700' : 'text-muted-foreground'}`}>Bank</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'airtime' }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${withdrawalForm.method === 'airtime' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-muted hover:bg-muted'}`}
                            >
                                <Smartphone className={`h-5 w-5 mb-1 ${withdrawalForm.method === 'airtime' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                                <span className={`text-xs font-medium ${withdrawalForm.method === 'airtime' ? 'text-purple-700' : 'text-muted-foreground'}`}>Airtime</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'paypal' }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${withdrawalForm.method === 'paypal' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-muted hover:bg-muted'}`}
                            >
                                <span className={`text-lg font-bold mb-1 ${withdrawalForm.method === 'paypal' ? 'text-blue-600' : 'text-muted-foreground'}`}>P</span>
                                <span className={`text-xs font-medium ${withdrawalForm.method === 'paypal' ? 'text-blue-700' : 'text-muted-foreground'}`}>PayPal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'crypto' }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${withdrawalForm.method === 'crypto' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-muted hover:bg-muted'}`}
                            >
                                <Bitcoin className={`h-5 w-5 mb-1 ${withdrawalForm.method === 'crypto' ? 'text-orange-600' : 'text-muted-foreground'}`} />
                                <span className={`text-xs font-medium ${withdrawalForm.method === 'crypto' ? 'text-orange-700' : 'text-muted-foreground'}`}>Crypto</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'gift_card' }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${withdrawalForm.method === 'gift_card' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-muted hover:bg-muted'}`}
                            >
                                <Gift className={`h-5 w-5 mb-1 ${withdrawalForm.method === 'gift_card' ? 'text-pink-600' : 'text-muted-foreground'}`} />
                                <span className={`text-xs font-medium ${withdrawalForm.method === 'gift_card' ? 'text-pink-700' : 'text-muted-foreground'}`}>Gift Card</span>
                            </button>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Amount (Points)</label>
                            <input
                                type="number"
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                                placeholder="Min: 1,000"
                                min="1000"
                                step="100"
                                value={withdrawalForm.amount}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                                required
                            />
                            {/* Diesel Economy: Show estimated USD value */}
                            {withdrawalForm.amount && (
                                <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Estimated Value:</span>
                                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                            ${estimatedUSD} USD
                                        </span>
                                    </div>
                                    {rateInfo && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Rate: {rateInfo.country} × {rateInfo.multiplier} | Daily limit: $10 USD
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>


                        {withdrawalForm.method === 'bank_transfer' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Bank Name</label>
                                        <select className="w-full mt-1 px-3 py-2 border rounded-md"
                                            value={withdrawalForm.bankCode}
                                            onChange={(e) => {
                                                const selectedBank = BANK_OPTIONS.find(b => b.code === e.target.value)
                                                setWithdrawalForm(prev => ({
                                                    ...prev,
                                                    bankCode: e.target.value,
                                                    bankName: selectedBank?.name || '',
                                                    accountName: '' // Reset account name when bank changes
                                                }))
                                                setBankVerificationError(null)
                                                // Auto-verify if account number already entered
                                                if (withdrawalForm.accountNumber.length === 10) {
                                                    verifyBankAccount(withdrawalForm.accountNumber, e.target.value)
                                                }
                                            }}
                                            required={withdrawalForm.method === 'bank_transfer'}
                                        >
                                            <option value="">Select Bank</option>
                                            {BANK_OPTIONS.map(bank => (
                                                <option key={bank.code} value={bank.code}>{bank.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Account Number</label>
                                        <input
                                            type="text"
                                            className="w-full mt-1 px-3 py-2 border rounded-md"
                                            placeholder="0123456789"
                                            maxLength={10}
                                            value={withdrawalForm.accountNumber}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '') // Only digits
                                                setWithdrawalForm(prev => ({ ...prev, accountNumber: value, accountName: '' }))
                                                setBankVerificationError(null)
                                                // Auto-verify when 10 digits entered
                                                if (value.length === 10 && withdrawalForm.bankCode) {
                                                    verifyBankAccount(value, withdrawalForm.bankCode)
                                                }
                                            }}
                                            required={withdrawalForm.method === 'bank_transfer'}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        Account Name
                                        {isVerifyingBank && (
                                            <span className="text-xs text-blue-500 animate-pulse">Verifying...</span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full mt-1 px-3 py-2 border rounded-md ${withdrawalForm.accountName ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : ''
                                            } ${bankVerificationError ? 'border-red-300' : ''}`}
                                        placeholder={isVerifyingBank ? 'Verifying account...' : 'Auto-filled after verification'}
                                        value={withdrawalForm.accountName}
                                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountName: e.target.value }))}
                                        required={withdrawalForm.method === 'bank_transfer'}
                                        readOnly={isVerifyingBank}
                                    />
                                    {bankVerificationError && (
                                        <p className="text-xs text-red-500 mt-1">{bankVerificationError}</p>
                                    )}
                                    {withdrawalForm.accountName && !bankVerificationError && (
                                        <p className="text-xs text-green-600 mt-1">✓ Account verified</p>
                                    )}
                                </div>
                            </>
                        )}

                        {withdrawalForm.method === 'paypal' && (
                            <div>
                                <label className="text-sm font-medium">PayPal Email Address</label>
                                <input
                                    type="email"
                                    className="w-full mt-1 px-3 py-2 border rounded-md"
                                    placeholder="your-email@example.com"
                                    value={withdrawalForm.paypalEmail}
                                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, paypalEmail: e.target.value }))}
                                    required={withdrawalForm.method === 'paypal'}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Payment will be sent in USD (converted).</p>
                            </div>
                        )}

                        {withdrawalForm.method === 'crypto' && (
                            <>
                                <div>
                                    <label className="text-sm font-medium">Network</label>
                                    <select
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                        value={withdrawalForm.cryptoNetwork}
                                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cryptoNetwork: e.target.value }))}
                                    >
                                        <option value="USDT (TRC20)">USDT (TRC20)</option>
                                        <option value="USDT (BEP20)">USDT (BEP20)</option>
                                        <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                                        <option value="LTC (Litecoin)">LTC (Litecoin)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Wallet Address</label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                        placeholder="Start with T... (for TRC20)"
                                        value={withdrawalForm.walletAddress}
                                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                                        required={withdrawalForm.method === 'crypto'}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Ensure the network matches your address!</p>
                                </div>
                            </>
                        )}

                        {withdrawalForm.method === 'airtime' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                        placeholder="+234 XXX XXX XXXX"
                                        value={withdrawalForm.phoneNumber}
                                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        required={withdrawalForm.method === 'airtime'}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Enter your phone number with country code. Airtime will be sent instantly upon approval.
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <p className="text-xs text-purple-700 dark:text-purple-300">
                                        ⚡ <strong>Instant Delivery:</strong> Airtime is delivered within minutes after admin approval.
                                        Supported networks: MTN, Airtel, Glo, 9mobile (Nigeria) and more.
                                    </p>
                                </div>
                            </div>
                        )}

                        {withdrawalForm.method === 'gift_card' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Gift Card Brand</label>
                                    <select
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                        value={withdrawalForm.giftCardBrand}
                                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, giftCardBrand: e.target.value }))}
                                        required={withdrawalForm.method === 'gift_card'}
                                    >
                                        <option value="">Select Gift Card</option>
                                        <option value="amazon">🛒 Amazon</option>
                                        <option value="google_play">▶️ Google Play</option>
                                        <option value="steam">🎮 Steam</option>
                                        <option value="itunes">🍎 iTunes / Apple</option>
                                        <option value="netflix">📺 Netflix</option>
                                        <option value="spotify">🎵 Spotify</option>
                                        <option value="playstation">🎮 PlayStation</option>
                                        <option value="xbox">🎮 Xbox</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Recipient Email</label>
                                    <input
                                        type="email"
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                        placeholder="email@example.com"
                                        value={withdrawalForm.recipientEmail}
                                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                                        required={withdrawalForm.method === 'gift_card'}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Gift card code will be sent to this email address.
                                    </p>
                                </div>
                                <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                                    <p className="text-xs text-pink-700 dark:text-pink-300">
                                        🎁 <strong>Digital Delivery:</strong> Gift card codes are sent to your email within 24-48 hours after approval.
                                        Available brands may vary by region.
                                    </p>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoadingWithdrawal || userPoints < 1000}>
                            {isLoadingWithdrawal ? 'Processing...' : 'Request Withdrawal'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            One withdrawal per week. Processing takes 24-48 hours.
                        </p>
                    </form>
                </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <div className="flex gap-2 mt-2">
                        <Button
                            variant={historyTab === 'earnings' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setHistoryTab('earnings')}
                        >
                            Earnings ({earnings.length})
                        </Button>
                        <Button
                            variant={historyTab === 'withdrawals' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setHistoryTab('withdrawals')}
                        >
                            Withdrawals ({withdrawals.length})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {historyTab === 'earnings' ? (
                            isLoadingEarnings ? (
                                <p className="text-center text-muted-foreground py-8">Loading...</p>
                            ) : earnings.length > 0 ? (
                                earnings.map((entry, index) => {
                                    const style = getEarningStyle(entry.type)
                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${style.bg} ${style.color}`}>
                                                    {style.icon}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{entry.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(entry.createdAt).toLocaleDateString()} • {new Date(entry.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                +{entry.amount} pts
                                            </Badge>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    No earnings yet. Start completing tasks to earn points!
                                </p>
                            )
                        ) : (
                            withdrawals.length > 0 ? (
                                withdrawals.map((transaction, index) => (
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
                                            {transaction.amount} pts
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    No withdrawals yet
                                </p>
                            )
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
    syncUserFromServer: () => Promise<void>
}

function ProfileTab({ user, setUser, resolvedTheme, setTheme, onLogout, onShowLegal, syncUserFromServer }: ProfileTabProps) {
    const earningRates = useEconomyStore(state => state.earningRates)
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || ''
    })
    const [isEditing, setIsEditing] = useState(false)
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('notifications_enabled') !== 'false'
        }
        return true
    })
    const [referralStats, setReferralStats] = useState({
        totalReferrals: 0,
        pointsEarned: 0
    })

    const handleToggleNotifications = async () => {
        const newValue = !notificationsEnabled
        setNotificationsEnabled(newValue)
        localStorage.setItem('notifications_enabled', String(newValue))

        // If enabling, request permission
        if (newValue && typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const permission = await Notification.requestPermission()
                if (permission !== 'granted') {
                    setNotificationsEnabled(false)
                    localStorage.setItem('notifications_enabled', 'false')
                }
            } catch (e) {
                console.log('Notification permission error:', e)
            }
        }
    }

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
            const response = await apiCall(`/api/user?userId=${user?.id}`)
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

    const getInitials = (name?: string) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Aesthetic Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-6 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-black/10 blur-3xl"></div>

                <div className="relative flex flex-col items-center">
                    <div className="mb-4 rounded-full border-4 border-white/20 p-1 shadow-2xl">
                        <Avatar className="h-24 w-24 border-4 border-white">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
                            <AvatarFallback className="text-2xl font-bold bg-indigo-100 text-indigo-700">
                                {getInitials(user?.name || user?.email)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight">{user?.name || 'Kojo User'}</h2>
                        <p className="text-purple-200 font-medium">{'Member since ' + new Date(user?.createdAt || Date.now()).getFullYear()}</p>
                    </div>

                    <div className="mt-6 flex w-full justify-center gap-8">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{user.totalPoints.toLocaleString()}</p>
                            <p className="text-xs uppercase tracking-wider text-purple-200">Points</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{user.dailyStreak || 0}</p>
                            <p className="text-xs uppercase tracking-wider text-purple-200">Day Streak</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{referralStats.totalReferrals}</p>
                            <p className="text-xs uppercase tracking-wider text-purple-200">Friends</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Level & Trust Section */}
            <div className="grid grid-cols-1 gap-4">
                <UserLevelDisplay points={user.totalPoints || 0} />
                <TrustBadges user={user} onVerificationComplete={syncUserFromServer} />
            </div>

            {/* Menu Sections */}
            <Card className="overflow-hidden border-none shadow-md">
                <CardContent className="p-0">
                    <div className="bg-muted/30 p-4">
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider ml-1">Account & Settings</h3>
                    </div>
                    <div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                                    <UserCircle className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium">Personal Information</p>
                                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                                </div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isEditing ? 'rotate-90' : ''}`} />
                        </button>

                        {isEditing && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-muted/20 px-4 pb-4"
                            >
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
                                        <Input
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                            className="mt-1 bg-white dark:bg-black/20"
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <Button size="sm" onClick={handleProfileUpdate}>Save Changes</Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="flex w-full items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium">Notifications</p>
                                    <p className="text-xs text-muted-foreground">
                                        {notificationsEnabled ? 'Push alerts enabled' : 'Push alerts disabled'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleNotifications}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${notificationsEnabled ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                ></span>
                            </button>
                        </div>

                        <div className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600">
                                    <Moon className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium">Dark Mode</p>
                                    <p className="text-xs text-muted-foreground">Toggle theme</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${resolvedTheme === 'dark' ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition ${resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                                ></span>
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md">
                <CardContent className="p-0">
                    <div className="bg-muted/30 p-4">
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider ml-1">Referral Program</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30">
                            <div>
                                <p className="text-xs font-bold text-orange-600 uppercase">Your Code</p>
                                <p className="text-xl font-mono font-bold tracking-widest">{user?.referralCode || '----'}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={copyReferralCode} className="h-9">
                                Copy
                            </Button>
                        </div>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg" onClick={() => {
                            if (user?.referralCode) {
                                const link = `${window.location.origin}/?ref=${user.referralCode}`
                                navigator.share?.({ title: 'Join Kojomoney', url: link }).catch(() => navigator.clipboard.writeText(link))
                            }
                        }}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Invite Friends
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md">
                <CardContent className="p-0">
                    <div className="bg-muted/30 p-4">
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider ml-1">Support & Legal</h3>
                    </div>
                    <div>
                        {[
                            { label: 'Blog & Guides', action: 'blog', icon: BookOpen },
                            { label: 'Privacy Policy', action: 'privacy', icon: Shield },
                            { label: 'Terms of Service', action: 'terms', icon: FileText },
                            { label: 'Cookie Policy', action: 'cookies', icon: FileText }
                        ].map((item, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    if (item.action === 'blog') window.location.href = '/blog'
                                    else onShowLegal(item.action as any)
                                }}
                                className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600">
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-12 font-semibold"
                onClick={onLogout}
            >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
            </Button>
        </div>
    )
}

export default function EarnApp() {
    useEconomyInit()
    const [activeTab, setActiveTab] = useState('home')
    const [activeView, setActiveView] = useState<'news' | 'trivia' | 'ads' | null>(null)
    const [activeLegalPage, setActiveLegalPage] = useState<LegalPageType | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [userPoints, setUserPoints] = useState(0)
    const [isClient, setIsClient] = useState(false)
    const { resolvedTheme, setTheme } = useTheme()
    const [showLuckySpin, setShowLuckySpin] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)

    // Enable engagement notifications (daily reset, streak alerts, opportunities)
    useEngagementNotifications(user)

    useEffect(() => {
        setIsClient(true)
        // Check for existing user session only on client
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('kojomoneyUser') || localStorage.getItem('earnAppUser')
            const hasCompletedOnboarding = localStorage.getItem('onboarding_complete')

            if (savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser)
                    setUser(parsedUser)
                    setUserPoints(parsedUser.totalPoints)
                } catch (error) {
                    console.error('Failed to parse user data:', error)
                }
            } else if (!hasCompletedOnboarding) {
                // Only show onboarding if no user session and flag not set
                setShowOnboarding(true)
            }

            // Handle Deep Linking via Query Params
            const searchParams = new URLSearchParams(window.location.search)
            const tabParam = searchParams.get('tab')
            const viewParam = searchParams.get('view')

            if (tabParam && ['home', 'earn', 'wallet', 'profile'].includes(tabParam)) {
                setActiveTab(tabParam)
            }

            if (viewParam && ['news', 'trivia', 'ads'].includes(viewParam)) {
                setActiveView(viewParam as any)
            }

            // Clean URL after consuming params (optional, keeps URL clean)
            if (tabParam || viewParam) {
                const newUrl = window.location.pathname
                window.history.replaceState({}, '', newUrl)
            }
        }
    }, [])

    const syncUserFromServer = async () => {
        try {
            // Always try to get the latest ID from localStorage if state is stale
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('kojomoneyUser') : null
            const id = user?.id || (savedUser ? JSON.parse(savedUser).id : null)

            if (!id) return

            const res = await apiCall(`/api/user?userId=${encodeURIComponent(id)}`)
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
        window.addEventListener('open-spin', () => setShowLuckySpin(true))

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
    // Note: Token registration is handled by notificationService.ts
    // This effect only sets up the listeners for when notifications are received/tapped
    useEffect(() => {
        const isNative = typeof window !== 'undefined' && (
            ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
            (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
        )
        if (!isNative || !user?.id) return

        const setupPushListeners = async () => {
            try {
                console.log('[PushNotifications] Setting up notification listeners...')

                // Dynamically import push notifications
                const { PushNotifications } = await import('@capacitor/push-notifications')

                // Remove any existing listeners to avoid duplicates
                await PushNotifications.removeAllListeners()

                // Listen for push notifications (when app is in foreground)
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('[PushNotifications] Received:', notification)
                    // Can show a toast or update UI here
                })

                // Listen for push notification action (when user taps notification)
                PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    console.log('[PushNotifications] Action performed:', action)
                    // Handle deep linking or navigation here
                    const data = action.notification?.data
                    if (data?.type === 'streak_warning') {
                        setActiveView('trivia')
                    } else if (data?.type === 'tournament_reminder') {
                        setActiveTab('home')
                    }
                })

                // Listen for errors
                PushNotifications.addListener('registrationError', (error) => {
                    console.error('[PushNotifications] Registration error:', error)
                })

                console.log('[PushNotifications] Listeners set up successfully')

            } catch (err) {
                console.error('[PushNotifications] Listener setup failed:', err)
            }
        }

        setupPushListeners()
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

    if (showOnboarding) {
        return <Onboarding onComplete={() => {
            if (typeof window !== 'undefined') {
                localStorage.setItem('onboarding_complete', 'true')
            }
            setShowOnboarding(false)
        }} />
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
                            <HomeTab
                                user={user}
                                userPoints={userPoints}
                                setActiveTab={setActiveTab}
                                setActiveView={setActiveView}
                                onOpenSpin={() => setShowLuckySpin(true)}
                            />
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
                                syncUserFromServer={syncUserFromServer}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {showLuckySpin && (
                <LuckySpin
                    userId={user.id}
                    onClose={() => {
                        setShowLuckySpin(false)
                        syncUserFromServer()
                    }}
                />
            )}

            {/* Social proof ticker - shows recent activity */}
            <SocialProofTicker />

            {/* AI Support Chatbot */}
            <AIChatbot />

            {/* Floating notifications overlay */}
            <FloatingNotificationContainer />
        </div>
    )
}
