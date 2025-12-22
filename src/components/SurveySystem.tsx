'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, DollarSign, AlertCircle, CheckCircle2, ChevronRight, X, Star, HelpCircle, RefreshCcw, ShieldCheck, Timer, ArrowLeft, FileText, Sparkles, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Survey, SurveyCompletion } from '@/lib/db-schema'
import { fetchSurveys, updateSurveyStatus } from '@/services/surveyService'
import { apiCall } from '@/lib/api-client'

interface SurveySystemProps {
    userId?: string
    onClose?: () => void
}

// External survey provider configuration
const CPX_CONFIG = {
    appId: process.env.NEXT_PUBLIC_CPX_APP_ID || '30576',
    getUrl: (userId: string, secureHash?: string) => {
        const params = new URLSearchParams({
            app_id: process.env.NEXT_PUBLIC_CPX_APP_ID || '30576',
            ext_user_id: userId,
        })
        if (secureHash) {
            params.append('secure_hash', secureHash)
        }
        return `https://wall.cpx-research.com/index.php?${params.toString()}`
    }
}

const TIMEWALL_CONFIG = {
    oid: process.env.NEXT_PUBLIC_TIMEWALL_SITE_ID || '',
    getUrl: (userId: string) => {
        const oid = process.env.NEXT_PUBLIC_TIMEWALL_SITE_ID
        return oid ? `https://timewall.io/users/login?oid=${oid}&uid=${userId}` : ''
    }
}

export default function SurveySystem({ userId, onClose }: SurveySystemProps) {
    const [activeTab, setActiveTab] = useState<'cpx' | 'timewall' | 'internal' | 'completed'>('cpx')
    const [surveys, setSurveys] = useState<Survey[]>([])
    const [completedSurveys, setCompletedSurveys] = useState<SurveyCompletion[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null)
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const [showTips, setShowTips] = useState(false)
    const [webViewMode, setWebViewMode] = useState<'iframe' | 'external' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [externalWallLoading, setExternalWallLoading] = useState(true)

    // For disqualification simulation
    const [isSimulatingDisq, setIsSimulatingDisq] = useState(false)

    // Scroll progress for survey duration simulation
    const [scrollProgress, setScrollProgress] = useState(0)

    useEffect(() => {
        loadSurveys()
        loadCompletedSurveys()
    }, [userId])

    const loadSurveys = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetchSurveys(userId || 'anonymous')
            setSurveys(response.surveys)
        } catch (err) {
            console.error('Failed to load surveys:', err)
            setError('Failed to load surveys. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const loadCompletedSurveys = async () => {
        if (!userId) return
        try {
            const response = await apiCall(`/api/surveys/history?userId=${userId}`)
            if (response.ok) {
                const data = await response.json()
                setCompletedSurveys(data.completions || [])
            }
        } catch (err) {
            console.error('Failed to load completed surveys:', err)
        }
    }

    const handleStartSurvey = async (survey: Survey) => {
        setCurrentSurvey(survey)

        if (typeof window !== 'undefined' && (window as any).Capacitor && !survey.iframeSupport) {
            try {
                const { Browser } = await import('@capacitor/browser')
                await Browser.open({ url: survey.url })
                setWebViewMode('external')
            } catch (e) {
                setWebViewMode('iframe')
            }
        } else {
            setWebViewMode('iframe')
        }
    }

    const handleExitSurvey = () => {
        setShowExitConfirm(true)
    }

    const confirmExit = async (completed: boolean = false) => {
        if (completed && currentSurvey && userId) {
            // Update survey status in database
            const result = await updateSurveyStatus(userId, currentSurvey.id, 'completed')

            if (result.success) {
                // Add to completed list locally
                const newCompleted: SurveyCompletion = {
                    id: result.completionId || Math.random().toString(36),
                    surveyId: currentSurvey.id,
                    userId,
                    provider: currentSurvey.provider,
                    payout: currentSurvey.payout,
                    status: 'pending',
                    startedAt: Date.now(),
                    completedAt: Date.now(),
                }
                setCompletedSurveys([newCompleted, ...completedSurveys])
            }
        }

        setCurrentSurvey(null)
        setWebViewMode(null)
        setShowExitConfirm(false)
        setScrollProgress(0)
    }

    const simulateDisqualification = async () => {
        if (!currentSurvey || !userId) return

        setIsSimulatingDisq(true)

        // Log disqualification
        await updateSurveyStatus(userId, currentSurvey.id, 'disqualified')

        setTimeout(() => {
            const newSurveys = surveys.filter(s => s.id !== currentSurvey?.id)
            setSurveys(newSurveys)
            setIsSimulatingDisq(false)
            setCurrentSurvey(null)
            setWebViewMode(null)
            alert(`You didn't qualify for that survey. Here are some other matches for you!`)
        }, 1500)
    }

    const formatDate = (timestamp: number | undefined) => {
        if (!timestamp) return 'Unknown'
        return new Date(timestamp).toLocaleDateString()
    }

    const getCpxUrl = () => {
        return CPX_CONFIG.getUrl(userId || 'anonymous')
    }

    const getTimewallUrl = () => {
        return TIMEWALL_CONFIG.getUrl(userId || 'anonymous')
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-900/50 pb-20 relative font-sans">

            {/* SURVEY WEBVIEW OVERLAY */}
            <AnimatePresence>
                {currentSurvey && webViewMode === 'iframe' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 bg-background flex flex-col"
                    >
                        {/* Browser Header */}
                        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b p-3 shadow-sm flex items-center justify-between sticky top-0 z-20">
                            <div className="flex-1">
                                <Progress value={scrollProgress} className="h-1 mb-2 w-full absolute top-0 left-0 rounded-none bg-indigo-100 dark:bg-indigo-950" />
                                <div className="flex items-center gap-3">
                                    <Button size="icon" variant="ghost" onClick={handleExitSurvey} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                                        <X className="h-5 w-5" />
                                    </Button>
                                    <div>
                                        <p className="font-semibold text-sm leading-tight flex items-center gap-1">
                                            {currentSurvey.provider}
                                            <ShieldCheck className="h-3 w-3 text-green-500" />
                                        </p>
                                        <p className="text-xs text-muted-foreground">Est. {currentSurvey.timeMinutes} mins left</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200 dark:border-red-900 shadow-none"
                                onClick={handleExitSurvey}
                            >
                                Exit Survey
                            </Button>
                        </div>

                        {/* Iframe Container */}
                        <div className="flex-1 relative w-full h-full bg-gray-100 dark:bg-black overflow-y-auto" onScroll={(e) => {
                            const target = e.currentTarget
                            const progress = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100
                            setScrollProgress(progress)
                        }}>
                            <iframe
                                src={currentSurvey.url}
                                className="w-full h-full border-none"
                                sandbox="allow-scripts allow-forms allow-same-origin"
                                title="Survey"
                            />

                            {/* Demo Controls overlay */}
                            <div className="absolute bottom-10 right-4 flex flex-col gap-2">
                                <Button size="sm" onClick={() => confirmExit(true)} className="bg-green-600 hover:bg-green-700 shadow-lg">
                                    Simulate Complete
                                </Button>
                                <Button size="sm" onClick={simulateDisqualification} variant="secondary" className="shadow-lg">
                                    Simulate Disqualify
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EXIT DIALOG */}
            <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Survey?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are currently in a survey. If you leave now, you will lose your progress and the {currentSurvey?.payout} points reward.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Continue Survey</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmExit(false)} className="bg-destructive hover:bg-destructive/90">Yes, Exit</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* HEADER */}
            <div className="bg-white dark:bg-zinc-950 border-b sticky top-0 z-10">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {onClose && (
                            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <h1 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
                            Survey Hub
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={loadSurveys}
                            disabled={isLoading}
                            className="h-8 w-8"
                        >
                            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowTips(true)}>
                            <HelpCircle className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Provider Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                    <TabsList className="w-full grid grid-cols-4 h-12 rounded-none bg-muted/30">
                        <TabsTrigger value="cpx" className="text-xs sm:text-sm data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-none">
                            <Sparkles className="h-3 w-3 mr-1" />
                            CPX
                        </TabsTrigger>
                        <TabsTrigger value="timewall" className="text-xs sm:text-sm data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-none">
                            <Clock className="h-3 w-3 mr-1" />
                            Timewall
                        </TabsTrigger>
                        <TabsTrigger value="internal" className="text-xs sm:text-sm data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-none">
                            <ClipboardList className="h-3 w-3 mr-1" />
                            More
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs sm:text-sm data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-none">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* MAIN CONTENT */}
            <div className="p-4 max-w-md mx-auto space-y-4">

                {/* TIPS MODAL */}
                <Dialog open={showTips} onOpenChange={setShowTips}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>💡 Survey Success Tips</DialogTitle>
                            <DialogDescription>
                                Increase your earnings with these simple rules:
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="flex gap-3">
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full h-fit"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                                <div className="text-sm"><strong>Be Honest:</strong> Inconsistent answers will get you banned.</div>
                            </div>
                            <div className="flex gap-3">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full h-fit"><Clock className="h-4 w-4 text-blue-600" /></div>
                                <div className="text-sm"><strong>Take Your Time:</strong> Speeding through surveys leads to disqualification.</div>
                            </div>
                            <div className="flex gap-3">
                                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full h-fit"><Star className="h-4 w-4 text-yellow-600" /></div>
                                <div className="text-sm"><strong>Profile Matters:</strong> Complete your profile to get matched with higher paying surveys.</div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                        <Button variant="link" size="sm" onClick={loadSurveys} className="text-red-600 dark:text-red-400 p-0 h-auto ml-auto">
                            Retry
                        </Button>
                    </div>
                )}

                {/* CPX Research Tab */}
                {activeTab === 'cpx' && (
                    <Card className="overflow-hidden border-teal-200 dark:border-teal-900">
                        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                CPX Research Surveys
                            </CardTitle>
                            <CardDescription className="text-teal-100">
                                High-paying surveys from top research companies. Complete surveys to earn points automatically!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!userId ? (
                                <div className="p-8 text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">Please log in to see surveys</p>
                                </div>
                            ) : (
                                <div className="relative w-full" style={{ height: '550px' }}>
                                    {externalWallLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background">
                                            <RefreshCcw className="h-8 w-8 animate-spin text-teal-500" />
                                        </div>
                                    )}
                                    <iframe
                                        src={getCpxUrl()}
                                        className="w-full h-full border-none"
                                        title="CPX Research Surveys"
                                        onLoad={() => setExternalWallLoading(false)}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Timewall Tab */}
                {activeTab === 'timewall' && (
                    <Card className="overflow-hidden border-indigo-200 dark:border-indigo-900">
                        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Timewall Surveys
                            </CardTitle>
                            <CardDescription className="text-indigo-100">
                                Quick surveys and micro-tasks. Complete simple tasks to earn points fast!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {!userId ? (
                                <div className="p-8 text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">Please log in to see surveys</p>
                                </div>
                            ) : !TIMEWALL_CONFIG.oid ? (
                                <div className="p-8 text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
                                    <p className="text-muted-foreground">Timewall is being configured...</p>
                                    <p className="text-xs text-muted-foreground mt-1">Check back soon!</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                                        <Clock className="h-10 w-10 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Timewall Surveys & Tasks</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Complete quick surveys and micro-tasks to earn points. Opens in a new window for the best experience.
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                                        onClick={() => window.open(getTimewallUrl(), '_blank')}
                                    >
                                        Open Timewall Surveys
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        💡 Complete surveys honestly to avoid account restrictions
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Internal Surveys Tab */}
                {activeTab === 'internal' && (
                    <div className="space-y-4">
                        {/* Info Banner */}
                        <div className="bg-teal-50 dark:bg-teal-950/30 p-4 rounded-lg flex items-start gap-3 border border-teal-100 dark:border-teal-900">
                            <TrendingIcon className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold text-teal-900 dark:text-teal-100 text-sm">Earn 2x Points Today!</h3>
                                <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                                    Complete at least 3 surveys to unlock the daily bonus.
                                </p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <Card key={i} className="overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <Skeleton className="h-5 w-24" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                            <Skeleton className="h-6 w-3/4 mb-2" />
                                            <div className="flex gap-2 mb-4">
                                                <Skeleton className="h-4 w-16" />
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                            <div className="flex justify-between">
                                                <Skeleton className="h-5 w-20" />
                                                <Skeleton className="h-8 w-28" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            surveys.map((survey, i) => (
                                <motion.div
                                    key={survey.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Card className="overflow-hidden border-l-4 border-l-teal-500 hover:shadow-md transition-shadow">
                                        <CardContent className="p-0">
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="font-medium">{survey.provider}</Badge>
                                                        {survey.isHot && (
                                                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none flex items-center gap-1 px-1.5">
                                                                <Star className="h-3 w-3 fill-white" /> Hot
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <div className="flex gap-0.5">
                                                                        {[...Array(5)].map((_, idx) => (
                                                                            <div key={idx} className={`h-1.5 w-1.5 rounded-full ${idx < survey.starRating ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                                                        ))}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Success Rate: {survey.starRating}/5</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>

                                                <h3 className="font-bold text-lg mb-1">{survey.title}</h3>

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {survey.tags.map(tag => (
                                                        <span key={tag} className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground uppercase tracking-wide">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="flex items-center gap-4 text-sm font-medium">
                                                        <div className="flex items-center text-green-600 dark:text-green-400">
                                                            <DollarSign className="h-4 w-4 mr-1" />
                                                            {survey.payout} pts
                                                        </div>
                                                        <div className="flex items-center text-muted-foreground">
                                                            <Timer className="h-4 w-4 mr-1" />
                                                            {survey.timeMinutes} min
                                                        </div>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleStartSurvey(survey)} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-teal-500/20">
                                                        Start Survey <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}

                        {!isLoading && surveys.length === 0 && (
                            <div className="text-center py-10 opacity-50 space-y-3">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p>No surveys available right now.</p>
                                <Button variant="outline" onClick={loadSurveys}>Check Again</Button>
                            </div>
                        )}

                        {/* Disqualification Refresh Prompt */}
                        {isSimulatingDisq && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 rounded-lg flex flex-col items-center text-center space-y-3"
                            >
                                <AlertCircle className="h-8 w-8 text-orange-500" />
                                <div className="text-sm">
                                    <p className="font-medium text-orange-900 dark:text-orange-100">Finding better matches...</p>
                                    <p className="text-orange-700 dark:text-orange-300 text-xs mt-1">Some surveys have strict requirements. Don't worry, we are refreshing your feed.</p>
                                </div>
                                <RefreshCcw className="h-4 w-4 animate-spin text-orange-500" />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Completed Surveys Tab */}
                {activeTab === 'completed' && (
                    <div className="space-y-3">
                        {completedSurveys.length === 0 ? (
                            <div className="text-center py-10 opacity-50 space-y-3">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p>No completed surveys yet.</p>
                                <Button variant="outline" onClick={() => setActiveTab('cpx')}>Browse Surveys</Button>
                            </div>
                        ) : (
                            completedSurveys.map((s) => (
                                <Card key={s.id} className="opacity-90">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">Survey #{s.surveyId?.slice(-6) || s.id.slice(-6)}</p>
                                            <p className="text-xs text-muted-foreground">Completed: {formatDate(s.completedAt)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-600 dark:text-green-400">+{s.payout} pts</p>
                                            <Badge variant={s.status === 'verified' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] mt-1">
                                                {s.status === 'pending' ? (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </span>
                                                ) : s.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                    {s.status === 'pending' && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 px-4 py-2 border-t text-xs text-yellow-700 dark:text-yellow-400 flex justify-between items-center">
                                            <span>Est. credit time:</span>
                                            <span className="font-medium">15 mins</span>
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function TrendingIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    )
}
