'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, Clock, Star, Zap, ChevronRight, X, ExternalLink, Filter, Trophy, ArrowLeft, Globe, Lock, RefreshCw, Gamepad2, ClipboardList, ShoppingCart, Wallet, PlayCircle, Download, Share2, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Offer, OfferCategory } from '@/lib/db-schema'
import { fetchOffers, startOffer, getOfferStats, getDifficultyColor, OfferFilters, OfferStats } from '@/services/offerwallService'

interface OfferwallSystemProps {
    userId?: string
    onClose?: () => void
}

// External provider configuration
const EXTERNAL_PROVIDERS = {
    kiwiwall: {
        name: 'Kiwiwall',
        description: 'Games, Apps & Offers',
        color: 'from-green-500 to-emerald-600',
        appId: process.env.NEXT_PUBLIC_KIWIWALL_APP_ID || 'wx1ott1hqeh4em25n4bfkd03roptngq7',
        getUrl: (userId: string) => `https://www.kiwiwall.com/wall/${process.env.NEXT_PUBLIC_KIWIWALL_APP_ID || 'wx1ott1hqeh4em25n4bfkd03roptngq7'}/${userId}`,
    },
    timewall: {
        name: 'Timewall',
        description: 'Micro-tasks & Surveys',
        color: 'from-blue-500 to-indigo-600',
        siteId: process.env.NEXT_PUBLIC_TIMEWALL_SITE_ID || '',
        getUrl: (userId: string) => `https://timewall.io/users/login?oid=${process.env.NEXT_PUBLIC_TIMEWALL_SITE_ID || ''}&uid=${userId}&tab=tasks`,
    },
}

export default function OfferwallSystem({ userId, onClose }: OfferwallSystemProps) {
    const [activeTab, setActiveTab] = useState<'internal' | 'kiwiwall' | 'timewall'>('kiwiwall')
    const [tasks, setTasks] = useState<Offer[]>([])
    const [filter, setFilter] = useState('All')
    const [selectedTask, setSelectedTask] = useState<Offer | null>(null)
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const [browserUrl, setBrowserUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [externalWallLoading, setExternalWallLoading] = useState(true)
    const [stats, setStats] = useState<OfferStats>({
        todayEarnings: 0,
        todayGoal: 500,
        totalCompleted: 0,
        pendingPayouts: 0,
    })

    // Fetch offers on mount
    useEffect(() => {
        loadOffers()
        loadStats()
    }, [userId])

    const loadOffers = async (filters?: OfferFilters) => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetchOffers(userId || 'anonymous', filters)
            setTasks(response.offers)
        } catch (err) {
            console.error('Failed to load offers:', err)
            setError('Failed to load offers. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const loadStats = async () => {
        if (!userId) return
        try {
            const userStats = await getOfferStats(userId)
            setStats(userStats)
        } catch (err) {
            console.error('Failed to load stats:', err)
        }
    }

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter)

        let filters: OfferFilters = {}

        if (newFilter === 'High Paying') {
            filters.minPayout = 1000
        } else if (newFilter === 'Easy') {
            filters.difficulty = 'Easy'
        } else if (newFilter === 'New') {
            filters.tags = ['New']
        }

        loadOffers(Object.keys(filters).length > 0 ? filters : undefined)
    }

    const openTask = async (task: Offer) => {
        if (!userId) {
            setError('Please log in to start offers')
            return
        }

        setIsStarting(true)
        setSelectedTask(task)

        try {
            const response = await startOffer(userId, task.id)

            // Open the task URL
            setTimeout(() => {
                setBrowserUrl(response.redirectUrl)
            }, 500)
        } catch (err) {
            console.error('Failed to start offer:', err)
            setError('Failed to start offer. Please try again.')
            setSelectedTask(null)
        } finally {
            setIsStarting(false)
        }
    }

    const closeBrowser = () => {
        setShowExitConfirm(true)
    }

    const confirmExit = () => {
        setBrowserUrl(null)
        setSelectedTask(null)
        setShowExitConfirm(false)
        // Reload stats in case offer was completed
        loadStats()
    }

    const getCategoryIcon = (category: OfferCategory) => {
        switch (category) {
            case 'Game': return <Gamepad2 className="h-8 w-8 text-purple-400" />
            case 'Survey': return <ClipboardList className="h-8 w-8 text-teal-400" />
            case 'Shopping': return <ShoppingCart className="h-8 w-8 text-orange-400" />
            case 'Finance': return <Wallet className="h-8 w-8 text-green-400" />
            case 'Video': return <PlayCircle className="h-8 w-8 text-red-400" />
            case 'Install': return <Download className="h-8 w-8 text-blue-400" />
            case 'Social': return <Share2 className="h-8 w-8 text-pink-400" />
            default: return <Zap className="h-8 w-8 text-indigo-400" />
        }
    }

    const getExternalWallUrl = (provider: 'kiwiwall' | 'timewall') => {
        const uid = userId || 'anonymous'
        if (provider === 'kiwiwall') {
            return EXTERNAL_PROVIDERS.kiwiwall.getUrl(uid)
        }
        return EXTERNAL_PROVIDERS.timewall.getUrl(uid)
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 pb-20 relative overflow-hidden">
            {/* IN-APP BROWSER OVERLAY */}
            <AnimatePresence>
                {browserUrl && selectedTask && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 bg-background flex flex-col"
                    >
                        {/* Browser Header */}
                        <div className="bg-muted/80 backdrop-blur-md border-b p-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center space-x-3">
                                <Button size="icon" variant="ghost" onClick={closeBrowser} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                                    <X className="h-5 w-5" />
                                </Button>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium flex items-center gap-1">
                                        <Lock className="h-3 w-3 text-green-500" />
                                        {selectedTask.provider}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{selectedTask.url}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="flex items-center gap-1 animate-pulse bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    <DollarSign className="h-3 w-3" />
                                    Earn {selectedTask.payout}
                                </Badge>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(browserUrl, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Browser Content (Iframe simulation) */}
                        <div className="flex-1 bg-white relative w-full h-full">
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                                <Globe className="h-16 w-16 text-muted-foreground opacity-20" />
                                <h3 className="text-xl font-semibold text-foreground">Task Started</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Complete the requirements for <strong>{selectedTask.title}</strong> to earn your reward.
                                    Do not close this window until you are finished.
                                </p>
                                <Button onClick={() => window.open(browserUrl, '_blank')}>
                                    Open in Browser
                                </Button>
                            </div>
                            <iframe
                                src={browserUrl}
                                className="w-full h-full border-none opacity-5 pointer-events-none"
                                title="Offerwall Task"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EXIT CONFIRMATION MODAL */}
            <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Abandon Task?</AlertDialogTitle>
                        <AlertDialogDescription>
                            If you leave now, you might lose your progress and the {selectedTask?.payout} points reward.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Keep Going</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmExit} className="bg-destructive hover:bg-destructive/90">Exit Task</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <div className="p-4 space-y-4 max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {onClose && (
                            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                            Offerwalls & Tasks
                        </h2>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        <Zap className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-500" />
                        2x Bonus Active
                    </Badge>
                </div>

                {/* Earnings Progress */}
                <Card className="shadow-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-indigo-100 dark:border-indigo-900">
                    <CardContent className="p-3">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Earnings</p>
                                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {stats.todayEarnings} <span className="text-sm font-normal text-muted-foreground">/ {stats.todayGoal} pts</span>
                                </p>
                            </div>
                            <div className="text-right">
                                {stats.pendingPayouts > 0 && (
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                        +{stats.pendingPayouts} pending
                                    </p>
                                )}
                                <Trophy className={`h-6 w-6 ${stats.todayEarnings >= stats.todayGoal ? 'text-yellow-500' : 'text-muted-foreground/30'}`} />
                            </div>
                        </div>
                        <Progress
                            value={(stats.todayEarnings / stats.todayGoal) * 100}
                            className="h-2 bg-indigo-100 dark:bg-indigo-950 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-purple-500"
                        />
                    </CardContent>
                </Card>

                {/* Provider Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/50">
                        <TabsTrigger value="kiwiwall" className="text-xs sm:text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Kiwiwall
                        </TabsTrigger>
                        <TabsTrigger value="timewall" className="text-xs sm:text-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            Timewall
                        </TabsTrigger>
                        <TabsTrigger value="internal" className="text-xs sm:text-sm data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                        </TabsTrigger>
                    </TabsList>

                    {/* Kiwiwall Tab */}
                    <TabsContent value="kiwiwall" className="mt-4">
                        <Card className="overflow-hidden border-green-200 dark:border-green-900">
                            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    Kiwiwall Offers
                                </CardTitle>
                                <CardDescription className="text-green-100">
                                    Complete offers, install apps, and earn points automatically!
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {!userId ? (
                                    <div className="p-8 text-center">
                                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-muted-foreground">Please log in to see offers</p>
                                    </div>
                                ) : (
                                    <div className="relative w-full" style={{ height: '500px' }}>
                                        {externalWallLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-background">
                                                <RefreshCw className="h-8 w-8 animate-spin text-green-500" />
                                            </div>
                                        )}
                                        <iframe
                                            src={getExternalWallUrl('kiwiwall')}
                                            className="w-full h-full border-none"
                                            title="Kiwiwall Offerwall"
                                            onLoad={() => setExternalWallLoading(false)}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Timewall Tab */}
                    <TabsContent value="timewall" className="mt-4">
                        <Card className="overflow-hidden border-blue-200 dark:border-blue-900">
                            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Timewall Tasks
                                </CardTitle>
                                <CardDescription className="text-blue-100">
                                    Micro-tasks, surveys, and easy offers to earn points!
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {!userId ? (
                                    <div className="p-8 text-center">
                                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-muted-foreground">Please log in to see offers</p>
                                    </div>
                                ) : !EXTERNAL_PROVIDERS.timewall.siteId ? (
                                    <div className="p-8 text-center">
                                        <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
                                        <p className="text-muted-foreground">Timewall is being configured...</p>
                                        <p className="text-xs text-muted-foreground mt-1">Check back soon!</p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                                            <Clock className="h-10 w-10 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Timewall Offers & Tasks</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Complete micro-tasks, watch videos, and install apps to earn points. Opens in a new window for the best experience.
                                            </p>
                                        </div>
                                        <Button
                                            size="lg"
                                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                            onClick={() => window.open(getExternalWallUrl('timewall'), '_blank')}
                                        >
                                            Open Timewall Tasks
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            💡 Points are credited automatically after completing tasks
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Internal/Featured Offers Tab */}
                    <TabsContent value="internal" className="mt-4 space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                                {error}
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => loadOffers()}
                                    className="text-red-600 dark:text-red-400 p-0 h-auto ml-2"
                                >
                                    Try again
                                </Button>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {['All', 'High Paying', 'Easy', 'New'].map((f) => (
                                <Button
                                    key={f}
                                    variant={filter === f ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleFilterChange(f)}
                                    className={`rounded-full px-4 whitespace-nowrap ${filter === f ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                >
                                    {f === 'High Paying' && <DollarSign className="h-3 w-3 mr-1" />}
                                    {f === 'Easy' && <Star className="h-3 w-3 mr-1" />}
                                    {f === 'New' && <Zap className="h-3 w-3 mr-1" />}
                                    {f}
                                </Button>
                            ))}
                        </div>

                        {/* Task List */}
                        <div className="space-y-3 pb-8">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <Card key={i} className="overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex gap-4">
                                                <Skeleton className="w-16 h-16 rounded-xl" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                    <Skeleton className="h-3 w-1/3" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                tasks.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card
                                            className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500"
                                            onClick={() => openTask(task)}
                                        >
                                            <CardContent className="p-0">
                                                <div className="p-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {task.logoUrl ? (
                                                                <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                getCategoryIcon(task.category)
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <h3 className="font-semibold text-sm leading-tight line-clamp-2">{task.title}</h3>
                                                                <Badge variant="secondary" className={`shrink-0 text-xs ${getDifficultyColor(task.difficulty)}`}>
                                                                    {task.difficulty}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
                                                            <div className="flex items-center gap-3 text-xs">
                                                                <span className="font-bold text-green-600 dark:text-green-400 flex items-center">
                                                                    <DollarSign className="h-3 w-3" />
                                                                    {task.payout} pts
                                                                </span>
                                                                <span className="text-muted-foreground flex items-center">
                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                    {task.estimatedTime}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-t border-muted/50">
                                                    <span className="text-xs text-muted-foreground font-medium">{task.provider}</span>
                                                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                                        {isStarting && selectedTask?.id === task.id ? (
                                                            <>Starting...</>
                                                        ) : (
                                                            <>START TASK <ChevronRight className="h-3 w-3 ml-1" /></>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            )}

                            {!isLoading && tasks.length === 0 && (
                                <div className="text-center py-10 opacity-50">
                                    <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                                    <p>No tasks found for this filter.</p>
                                    <Button
                                        variant="link"
                                        onClick={() => handleFilterChange('All')}
                                        className="mt-2"
                                    >
                                        View all tasks
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
