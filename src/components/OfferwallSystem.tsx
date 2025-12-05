'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DollarSign, Clock, Star, Zap, ChevronRight, X, ExternalLink, Filter, Trophy, ArrowLeft, Globe, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Mock Data for Offerwall Tasks
const MOCK_TASKS = [
    {
        id: '1',
        title: 'Merge Dragons',
        logo: 'https://play-lh.googleusercontent.com/OqDfqOqV-f4eW5vVw5W5W5W5W5W5W5W5W5W5W5W5', // Placeholder-ish
        provider: 'AdGem',
        payout: 5000,
        difficulty: 'Hard',
        tags: ['High Paying', 'Game'],
        time: '7 days',
        description: 'Reach Level 100 to earn 5000 points. New users only.',
        url: 'https://google.com' // Mock URL
    },
    {
        id: '2',
        title: 'Take a Survey',
        logo: '',
        provider: 'CPX Research',
        payout: 250,
        difficulty: 'Easy',
        tags: ['Easy', 'Survey'],
        time: '15 mins',
        description: 'Complete a quick profile survey to get matched.',
        url: 'https://google.com'
    },
    {
        id: '3',
        title: 'Sign up for AliEx',
        logo: '',
        provider: 'OfferToro',
        payout: 1200,
        difficulty: 'Medium',
        tags: ['New', 'Shopping'],
        time: '5 mins',
        description: 'Register and make a purchase of at least $1.',
        url: 'https://google.com'
    },
    {
        id: '4',
        title: 'Play Candy Crush',
        logo: '',
        provider: 'Tapjoy',
        payout: 50,
        difficulty: 'Easy',
        tags: ['Easy', 'Game'],
        time: '2 mins',
        description: 'Install and open the app.',
        url: 'https://google.com'
    },
    {
        id: '5',
        title: 'Crypto.com Register',
        logo: '',
        provider: 'AyeT',
        payout: 8000,
        difficulty: 'Hard',
        tags: ['High Paying', 'Finance'],
        time: '3 days',
        description: 'Complete KYC and deposit $50.',
        url: 'https://google.com'
    },
    {
        id: '6',
        title: 'Watch Video Ad',
        logo: '',
        provider: 'AdColony',
        payout: 10,
        difficulty: 'Easy',
        tags: ['Easy', 'Video'],
        time: '30 secs',
        description: 'Watch a short video to earn points.',
        url: 'https://google.com'
    }
]

interface OfferwallSystemProps {
    userId?: string
    onClose?: () => void // If we want to allow going back to main earn page from here
}

export default function OfferwallSystem({ userId, onClose }: OfferwallSystemProps) {
    const [tasks, setTasks] = useState(MOCK_TASKS)
    const [filter, setFilter] = useState('All')
    const [selectedTask, setSelectedTask] = useState<any | null>(null)
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const [browserUrl, setBrowserUrl] = useState<string | null>(null)
    const [earningsToday, setEarningsToday] = useState(120) // Mock today's earnings
    const [earningsGoal, setEarningsGoal] = useState(500)

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter)
        if (newFilter === 'All') {
            setTasks(MOCK_TASKS)
        } else if (newFilter === 'High Paying') {
            setTasks(MOCK_TASKS.filter(t => t.payout > 1000))
        } else if (newFilter === 'Easy') {
            setTasks(MOCK_TASKS.filter(t => t.difficulty === 'Easy'))
        } else if (newFilter === 'New') {
            setTasks(MOCK_TASKS.filter(t => t.tags.includes('New')))
        }
    }

    const openTask = (task: any) => {
        setSelectedTask(task)
        // simulate opening browser
        setTimeout(() => setBrowserUrl(task.url), 500)
    }

    const closeBrowser = () => {
        setShowExitConfirm(true)
    }

    const confirmExit = () => {
        setBrowserUrl(null)
        setSelectedTask(null)
        setShowExitConfirm(false)
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
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(selectedTask.url, '_blank')}>
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
                                <Button onClick={() => window.open(selectedTask.url, '_blank')}>
                                    Open in Chrome
                                </Button>
                                {/* In a real Capacitor app, we would use the InAppBrowser plugin here or show the webview */}
                            </div>
                            {/* Actual iframe might be blocked by x-frame-options for many offerwalls, hence the fallback UI above */}
                            <iframe
                                src={selectedTask.url}
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


            <div className="p-4 space-y-6 max-w-md mx-auto">
                {/* Header / Banner */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {onClose && (
                                <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 -ml-2">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                                Offerwall
                            </h2>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-500" />
                            2x Bonus Active
                        </Badge>
                    </div>

                    <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-none text-white shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy className="h-24 w-24" />
                        </div>
                        <CardContent className="p-5">
                            <h3 className="font-bold text-lg mb-1">How it works</h3>
                            <p className="text-indigo-100 text-sm mb-4">
                                Complete simple tasks like playing games or surveys to earn massive points.
                            </p>
                            <div className="flex items-center gap-2 text-xs font-medium text-pink-100 bg-white/10 p-2 rounded-lg w-fit backdrop-blur-sm">
                                <Clock className="h-3 w-3" />
                                Average payout time: 24h
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Floating Earnings Progress */}
                <div className="sticky top-2 z-10">
                    <Card className="shadow-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-indigo-100 dark:border-indigo-900">
                        <CardContent className="p-3">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Earnings</p>
                                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{earningsToday} <span className="text-sm font-normal text-muted-foreground">/ {earningsGoal} pts</span></p>
                                </div>
                                <Trophy className={`h-6 w-6 ${earningsToday >= earningsGoal ? 'text-yellow-500' : 'text-muted-foreground/30'}`} />
                            </div>
                            <Progress value={(earningsToday / earningsGoal) * 100} className="h-2 bg-indigo-100 dark:bg-indigo-950 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-purple-500" />
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
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
                    {tasks.map((task, idx) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card
                                className="overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99] border-muted"
                                onClick={() => openTask(task)}
                            >
                                <CardContent className="p-0">
                                    <div className="p-4 flex gap-4">
                                        <div className="h-16 w-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                            {task.logo ? (
                                                <img src={task.logo} alt={task.title} className="h-10 w-10 object-contain rounded-md" onError={(e) => (e.target as any).style.display = 'none'} />
                                            ) : (
                                                <Zap className="h-8 w-8 text-indigo-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-semibold text-base truncate pr-2">{task.title}</h4>
                                                <Badge variant="secondary" className="font-bold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 shrink-0">
                                                    +{task.payout}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                                            <div className="flex items-center gap-3 pt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${task.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                    task.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
                                                        'bg-red-100 text-red-700 dark:bg-red-900/30'
                                                    }`}>
                                                    {task.difficulty}
                                                </span>
                                                <div className="flex items-center text-[10px] text-muted-foreground">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {task.time}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-t border-muted/50">
                                        <span className="text-xs text-muted-foreground font-medium">{task.provider}</span>
                                        <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                            START TASK <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}

                    {tasks.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <p>No tasks found for this filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
