'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, DollarSign, AlertCircle, CheckCircle2, ChevronRight, X, Star, HelpCircle, RefreshCcw, ShieldCheck, Timer, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall } from '@/lib/api-client'

// Interfaces
interface Survey {
    id: string
    title: string
    provider: 'CPX' | 'TheoremReach' | 'BitLabs' | 'Pollfish'
    payout: number
    timeMinutes: number
    starRating: number // 1-5, indicates success rate
    isHot?: boolean
    tags: string[]
    iframeSupport: boolean
    url: string
}

interface CompletedSurvey {
    id: string
    title: string
    payout: number
    completedAt: string
    status: 'pending' | 'verified' | 'rejected'
    estimatedCreditTime: string
}

const MOCK_SURVEYS: Survey[] = [
    {
        id: 's1',
        title: 'Consumer Habits Survey',
        provider: 'CPX',
        payout: 850,
        timeMinutes: 12,
        starRating: 5,
        isHot: true,
        tags: ['High Pay', 'Retail'],
        iframeSupport: false,
        url: 'https://google.com'
    },
    {
        id: 's2',
        title: 'Tech Preferences',
        provider: 'TheoremReach',
        payout: 420,
        timeMinutes: 5,
        starRating: 4,
        tags: ['Fast', 'Tech'],
        iframeSupport: true,
        url: 'https://google.com'
    },
    {
        id: 's3',
        title: 'Entertainment Choices',
        provider: 'BitLabs',
        payout: 1200,
        timeMinutes: 20,
        starRating: 3,
        isHot: true,
        tags: ['Entertainment'],
        iframeSupport: false,
        url: 'https://google.com'
    },
    {
        id: 's4',
        title: 'Daily Check-in Survey',
        provider: 'Pollfish',
        payout: 150,
        timeMinutes: 2,
        starRating: 5,
        tags: ['Daily', 'Bonus'],
        iframeSupport: true,
        url: 'https://google.com'
    },
    {
        id: 's5',
        title: 'Automotive Trends',
        provider: 'CPX',
        payout: 600,
        timeMinutes: 15,
        starRating: 2,
        tags: ['Niche'],
        iframeSupport: false,
        url: 'https://google.com'
    }
]

const MOCK_COMPLETED: CompletedSurvey[] = [
    {
        id: 'c1',
        title: 'Shopping Experience',
        payout: 350,
        completedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        status: 'pending',
        estimatedCreditTime: '24 hours'
    },
    {
        id: 'c2',
        title: 'Brand Awareness',
        payout: 120,
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        status: 'verified',
        estimatedCreditTime: 'Credited'
    }
]

interface SurveySystemProps {
    userId?: string
    onClose?: () => void
}

export default function SurveySystem({ userId, onClose }: SurveySystemProps) {
    const [activeTab, setActiveTab] = useState('available')
    const [surveys, setSurveys] = useState<Survey[]>(MOCK_SURVEYS)
    const [completedSurveys, setCompletedSurveys] = useState<CompletedSurvey[]>(MOCK_COMPLETED)
    const [isLoading, setIsLoading] = useState(false)
    const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null)
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const [showTips, setShowTips] = useState(false)
    const [webViewMode, setWebViewMode] = useState<'iframe' | 'external' | null>(null)

    // For disqualification simulation
    const [isSimulatingDisq, setIsSimulatingDisq] = useState(false)

    // Scroll progress for survey duration simulation (just visual sugar)
    const [scrollProgress, setScrollProgress] = useState(0)

    useEffect(() => {
        // Simulate loading
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 800)
    }, [])

    const handleStartSurvey = async (survey: Survey) => {
        setCurrentSurvey(survey)

        if (typeof window !== 'undefined' && (window as any).Capacitor && !survey.iframeSupport) {
            // Use native browser if available and iframe not supported
            try {
                const { Browser } = await import('@capacitor/browser')
                await Browser.open({ url: survey.url })
                // We assume they return after this for external
                setWebViewMode('external')
            } catch (e) {
                // Fallback
                setWebViewMode('iframe')
            }
        } else {
            setWebViewMode('iframe')
        }
    }

    const handleExitSurvey = () => {
        setShowExitConfirm(true)
    }

    const confirmExit = (completed: boolean = false) => {
        if (completed && currentSurvey) {
            // Add to completed list
            const newCompleted: CompletedSurvey = {
                id: Math.random().toString(36),
                title: currentSurvey.title,
                payout: currentSurvey.payout,
                completedAt: new Date().toISOString(),
                status: 'pending',
                estimatedCreditTime: '15 mins'
            }
            setCompletedSurveys([newCompleted, ...completedSurveys])

            // Sync with backend (mock)
            try {
                apiCall('/api/surveys/status', {
                    method: 'POST',
                    body: JSON.stringify({ userId, surveyId: currentSurvey.id, status: 'completed' })
                }).catch(() => { })
            } catch (e) { }
        }

        setCurrentSurvey(null)
        setWebViewMode(null)
        setShowExitConfirm(false)
        setScrollProgress(0)
    }

    const simulateDisqualification = () => {
        setIsSimulatingDisq(true)
        setTimeout(() => {
            // Refresh list logic
            const newSurveys = surveys.filter(s => s.id !== currentSurvey?.id)
            setSurveys(newSurveys)
            setIsSimulatingDisq(false)
            setCurrentSurvey(null)
            setWebViewMode(null)
            // Show toast or alert here ideally
            alert(`You didn't qualify for that survey. Here are some other matches for you!`)
        }, 1500)
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
                        {/* Fake Browser Header */}
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
                            // Mock progress on scroll
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

                            {/* Dev/Demo Controls overlay */}
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
                    <Button variant="ghost" size="icon" onClick={() => setShowTips(true)}>
                        <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>

                <Tabs defaultValue="available" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start rounded-none h-12 bg-transparent p-0 border-b">
                        <TabsTrigger
                            value="available"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 bg-transparent"
                        >
                            Available Surveys
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 bg-transparent"
                        >
                            Completed
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

                {activeTab === 'available' && (
                    <div className="space-y-4">
                        {/* Info Banner */}
                        <div className="bg-teal-50 dark:bg-teal-950/30 p-4 rounded-lg flex items-start gap-3 border border-teal-100 dark:border-teal-900">
                            <TrendingIcon className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold text-teal-900 dark:text-teal-100 text-sm">Earn 2x Points Today!</h3>
                                <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                                    Complete at least 3 surveys to unblock the daily bonus.
                                </p>
                            </div>
                        </div>

                        {isLoading && (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                                ))}
                            </div>
                        )}

                        {!isLoading && surveys.map((survey, i) => (
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
                        ))}

                        {/* Rejected/Disqualified Retry Prompt */}
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

                {activeTab === 'completed' && (
                    <div className="space-y-3">
                        {completedSurveys.length === 0 ? (
                            <div className="text-center py-10 opacity-50 space-y-3">
                                <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p>No completed surveys yet.</p>
                                <Button variant="outline" onClick={() => setActiveTab('available')}>Browse Surveys</Button>
                            </div>
                        ) : (
                            completedSurveys.map((s) => (
                                <Card key={s.id} className="opacity-90">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{s.title}</p>
                                            <p className="text-xs text-muted-foreground">Completed: {new Date(s.completedAt).toLocaleDateString()}</p>
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
                                            <span className="font-medium">{s.estimatedCreditTime}</span>
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

function FileTextIcon(props: any) {
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
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
        </svg>
    )
}
