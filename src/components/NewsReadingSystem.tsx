'use client'

import { apiCall } from '@/lib/api-client'

import { useState, useEffect, Fragment } from 'react'
import { Card, CardFooter, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { DAILY_LIMITS } from '@/lib/points-config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Clock, BookOpen, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import AdService from '@/services/adService'
import { FloatingNotifications } from '@/components/notifications/FloatingNotification'
import { Browser } from '@capacitor/browser'


interface NewsStory {
    id: string
    title: string
    summary: string
    imageUrl?: string
    category?: string
    points: number
    publishedAt: string
    isExternal?: boolean
    externalUrl?: string
    source?: string
    quizQuestion?: string
    quizOptions?: string[]
    correctAnswer?: number
    content?: string
}

interface NewsReadingState {
    currentStory: NewsStory | null
    isReading: boolean
    showQuiz: boolean
    timeRemaining: number
    selectedAnswer: number | null
    quizSubmitted: boolean
    isCorrect: boolean | null
    pointsEarned: number
    fullContent?: string
    fullContentLoading?: boolean
    showFullContent?: boolean
    quizExplanation?: string | null
    hasReadBefore?: boolean
    needsLogin?: boolean
    awarded?: boolean
}

interface NewsReadingSystemProps {
    userId?: string
}

const NewsReadingSystem = ({ userId }: NewsReadingSystemProps) => {
    const [stories, setStories] = useState<NewsStory[]>([])
    const [loading, setLoading] = useState(true)
    const [readIds, setReadIds] = useState<Set<string>>(new Set())
    const [anonId, setAnonId] = useState<string>('')
    const [dailyProgress, setDailyProgress] = useState({ storiesRead: 0, maxStories: DAILY_LIMITS.maxNews })
    const READ_SECONDS = 30
    const [readingState, setReadingState] = useState<NewsReadingState>({
        currentStory: null,
        isReading: false,
        showQuiz: false,
        timeRemaining: READ_SECONDS,
        selectedAnswer: null,
        quizSubmitted: false,
        isCorrect: null,
        pointsEarned: 0,
        fullContent: undefined,
        fullContentLoading: false,
        showFullContent: false
    })

    const defaultQuizQuestion = 'Which category best describes this story?'
    const defaultQuizOptions = ['News', 'Politics', 'Business', 'Sports']

    useEffect(() => {
        fetchNewsStories()
        // Ensure anon id exists
        if (typeof window !== 'undefined') {
            let id = localStorage.getItem('kojomoneyAnonId')
            if (!id) {
                id = `${Math.random().toString(36).slice(2)}_${Date.now()}`
                localStorage.setItem('kojomoneyAnonId', id)
            }
            setAnonId(id || '')
        }
    }, [])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (readingState.isReading && readingState.timeRemaining > 0) {
            timer = setTimeout(() => {
                setReadingState(prev => ({
                    ...prev,
                    timeRemaining: prev.timeRemaining - 1
                }))
            }, 1000)
        } else if (readingState.isReading && readingState.timeRemaining === 0) {
            setReadingState(prev => ({
                ...prev,
                isReading: false,
                showQuiz: true
            }))
        }
        return () => clearTimeout(timer)
    }, [readingState.isReading, readingState.timeRemaining])

    const fetchNewsStories = async () => {
        try {
            let response = await apiCall(`/api/news?reads=1&points=10${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`)
            let data = await response.json()

            if (data?.error || !Array.isArray(data?.stories) || data.stories.length === 0) {
                try {
                    response = await apiCall('/api/news?source=rss&limit=10&points=10')
                    data = await response.json()
                } catch (e) { }
            }

            if (data?.error || !Array.isArray(data?.stories) || data.stories.length === 0) {
                try {
                    response = await apiCall('/api/news?url=https://feeds.bbci.co.uk/news/world/rss.xml&limit=10&points=10')
                    data = await response.json()
                } catch (e) { }
            }

            setStories(Array.isArray(data?.stories) ? data.stories : [])
            if (Array.isArray(data?.reads)) setReadIds(new Set<string>(data.reads))

            // Initialize daily progress from API response
            if (data?.maxDailyStories !== undefined) {
                setDailyProgress({
                    storiesRead: data.storiesReadToday || 0,
                    maxStories: data.maxDailyStories || DAILY_LIMITS.maxNews
                })
            }
        } catch (error) {
            console.error('Error fetching stories:', error)
        } finally {
            setLoading(false)
        }
    }

    const startReading = (story: NewsStory) => {
        setReadingState({
            currentStory: story,
            isReading: true,
            showQuiz: false,
            timeRemaining: READ_SECONDS,
            selectedAnswer: null,
            quizSubmitted: false,
            isCorrect: null,
            pointsEarned: 0,
            fullContent: undefined,
            fullContentLoading: false,
            showFullContent: false
        })

        // Pre-generate quiz while the user is reading
        const url = `/api/quiz?storyId=${encodeURIComponent(story.id)}`
        apiCall(url, {
            method: 'POST',
            body: JSON.stringify({ externalUrl: story.externalUrl, title: story.title, summary: story.summary })
        })
            .then(async (res: any) => {
                const data = await res.json().catch(() => ({}))
                const quiz = data?.quiz || data
                if (!quiz?.question || !Array.isArray(quiz?.options)) return
                setReadingState((prev) => ({
                    ...prev,
                    currentStory: {
                        ...prev.currentStory!,
                        quizQuestion: quiz.question,
                        quizOptions: quiz.options,
                        correctAnswer: typeof quiz.correctIndex === 'number' ? quiz.correctIndex : prev.currentStory?.correctAnswer
                    }
                }))
            })
            .catch(() => { })
    }

    const submitQuiz = async () => {
        if (readingState.selectedAnswer === null || !readingState.currentStory) return

        try {
            const response = await apiCall('/api/news', {
                method: 'POST',
                body: JSON.stringify({
                    storyId: readingState.currentStory.id,
                    quizAnswer: readingState.selectedAnswer,
                    anonId,
                    userId // Pass userId explicitly
                })
            })
            const result = await response.json()
            console.log('[NewsReading] Quiz result:', result)

            setReadingState(prev => ({
                ...prev,
                quizSubmitted: true,
                isCorrect: !!result.isCorrect,
                pointsEarned: typeof result.pointsEarned === 'number' ? result.pointsEarned : (result.isCorrect ? readingState.currentStory!.points : 0),
                quizExplanation: result.quizExplanation || null,
                hasReadBefore: !!result.hasReadBefore,
                needsLogin: !!result.needsLogin,
                awarded: !!result.awarded
            }))

            // Update daily progress from API response
            if (result.storiesReadToday !== undefined && result.maxDailyStories !== undefined) {
                setDailyProgress({
                    storiesRead: result.storiesReadToday,
                    maxStories: result.maxDailyStories
                })
            }

            // Handle daily limit reached
            if (result.dailyLimitReached) {
                console.log('[NewsReading] Daily limit reached:', result.message)
            }

            // Sync updated user to localStorage and notify parent when points awarded
            if (result.awarded && result.isCorrect) {
                console.log('[NewsReading] Points awarded, syncing user data...')

                // Show multiplier feedback notification
                FloatingNotifications.pointsEarned({
                    source: 'News Story',
                    basePoints: result.basePoints || 10,
                    finalPoints: result.pointsEarned || 10,
                    happyHourMultiplier: result.happyHourMultiplier,
                    happyHourName: result.happyHourName,
                    streakMultiplier: result.streakMultiplier,
                    streakName: result.streakName
                })

                // Show smart interstitial every 3rd article (non-blocking)
                AdService.showSmartInterstitial('news_reading').catch(() => { })

                try {
                    // Use the prop userId directly, not from localStorage
                    const effectiveId = userId || `anon:${anonId}`
                    console.log('[NewsReading] Fetching updated user:', effectiveId)

                    const ures = await apiCall(`/api/user?userId=${encodeURIComponent(effectiveId)}`)
                    const udata = await ures.json()
                    console.log('[NewsReading] Updated user data:', udata)

                    if (udata?.user) {
                        window.localStorage.setItem('kojomoneyUser', JSON.stringify(udata.user))
                        console.log('[NewsReading] Saved to localStorage, dispatching events')

                        // Small delay to ensure localStorage is written
                        await new Promise(r => setTimeout(r, 100))

                        // Dispatch events
                        window.dispatchEvent(new Event('kojo:user:update'))
                        window.dispatchEvent(new CustomEvent('kojo:points:earned', {
                            detail: {
                                source: 'reading',
                                points: result.pointsEarned,
                                storyId: readingState.currentStory.id
                            }
                        }))
                    }
                } catch (syncError) {
                    console.error('[NewsReading] Error syncing user:', syncError)
                    // Still dispatch event to try to trigger a refresh
                    window.dispatchEvent(new Event('kojo:user:update'))
                }
            }
        } catch (error) {
            console.error('Error submitting quiz:', error)
            setReadingState(prev => ({
                ...prev,
                quizSubmitted: true,
                isCorrect: false,
                pointsEarned: 0
            }))
        }
    }

    const resetReading = () => {
        setReadingState({
            currentStory: null,
            isReading: false,
            showQuiz: false,
            timeRemaining: READ_SECONDS,
            selectedAnswer: null,
            quizSubmitted: false,
            isCorrect: null,
            pointsEarned: 0,
            fullContent: undefined,
            fullContentLoading: false,
            showFullContent: false
        })
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (readingState.currentStory) {
        return (
            <Card className="max-w-2xl xl:max-w-3xl mx-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5" />
                            <span>Reading Story</span>
                        </CardTitle>
                        <Badge variant="secondary">{readingState.currentStory.points} points</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Reading Phase */}
                    {readingState.isReading && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Please read carefully: {readingState.timeRemaining}s</span>
                            </div>
                            <Progress value={((READ_SECONDS - readingState.timeRemaining) / READ_SECONDS) * 100} className="h-2" />
                            {readingState.currentStory?.imageUrl && (
                                <div className="relative aspect-[16/9]">
                                    <img
                                        src={readingState.currentStory.imageUrl}
                                        alt={readingState.currentStory.title}
                                        className="absolute inset-0 w-full h-full object-cover rounded-md"
                                        loading="lazy"
                                    />
                                </div>
                            )}
                            <div className="prose max-w-none">
                                <h3 className="text-xl font-semibold mb-3">{readingState.currentStory.title}</h3>
                                <p className="text-muted-foreground mb-4">{readingState.currentStory.summary}</p>
                                <div className="bg-muted p-4 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2">
                                        {readingState.currentStory?.externalUrl && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={async () => {
                                                    if (readingState.currentStory?.externalUrl) {
                                                        await Browser.open({ url: readingState.currentStory.externalUrl })
                                                    }
                                                }}
                                            >
                                                🔗 Read Full Article
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Opens in a new tab on the original source ({readingState.currentStory?.source || 'external site'})
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quiz Phase */}
                    {readingState.showQuiz && !readingState.quizSubmitted && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Quick Quiz</h4>
                                <p className="text-sm text-muted-foreground">Answer correctly to earn {readingState.currentStory.points} points!</p>
                            </div>
                            <div className="space-y-3">
                                <p className="font-medium">
                                    {readingState.currentStory.quizQuestion || defaultQuizQuestion}
                                </p>
                                <RadioGroup
                                    value={readingState.selectedAnswer?.toString()}
                                    onValueChange={(value) => setReadingState(prev => ({ ...prev, selectedAnswer: parseInt(value) }))}
                                >
                                    {(readingState.currentStory.quizOptions || defaultQuizOptions).map((option, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                            <Label htmlFor={`option-${index}`}>{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <Button
                                onClick={submitQuiz}
                                disabled={readingState.selectedAnswer === null}
                                className="w-full"
                            >
                                Submit Answer
                            </Button>
                        </div>
                    )}

                    {/* Result Phase */}
                    {readingState.quizSubmitted && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg ${readingState.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className="flex items-center space-x-2">
                                    {readingState.isCorrect ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <span className={`font-semibold ${readingState.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                        {readingState.isCorrect ? 'Correct!' : 'Incorrect'}
                                    </span>
                                </div>
                                <p className="mt-2">
                                    {readingState.isCorrect ? (
                                        readingState.awarded ? `You earned ${readingState.currentStory?.points || readingState.pointsEarned} points!` : (
                                            readingState.needsLogin ? `Correct! Sign in to claim ${readingState.currentStory?.points || 0} points.` : (
                                                readingState.hasReadBefore ? 'Correct! Points already claimed for this story.' : `You earned ${readingState.currentStory?.points || readingState.pointsEarned} points!`
                                            )
                                        )
                                    ) : (
                                        'Better luck next time! Make sure to read the stories carefully.'
                                    )}
                                </p>
                            </div>
                            {readingState.quizExplanation && (
                                <div className="bg-muted p-3 rounded">
                                    <p className="text-sm text-muted-foreground">{readingState.quizExplanation}</p>
                                </div>
                            )}
                            <div className="bg-muted p-4 rounded-lg space-y-3">
                                <div className="flex items-center gap-2">
                                    {readingState.currentStory?.externalUrl && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={async () => {
                                                if (readingState.currentStory?.externalUrl) {
                                                    await Browser.open({ url: readingState.currentStory.externalUrl })
                                                }
                                            }}
                                        >
                                            🔗 Read Full Article
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Opens in a new tab on the original source ({readingState.currentStory?.source || 'external site'})
                                </p>
                            </div>
                            <Button onClick={resetReading} className="w-full">
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Read Another Story
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card >
        )
    }

    return (
        <div className="space-y-4">
            {/* Simple Header without Progress Bar (handled by EarnApp) */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Today's Stories</h3>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{stories.length} available</Badge>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 xl:gap-5">
                {stories.map((story, index) => (
                    <Fragment key={story.id}>
                        <Card className="group cursor-pointer hover:shadow-sm transition-shadow">
                            {story.imageUrl ? (
                                <div className="relative aspect-[16/9]">
                                    <img
                                        src={story.imageUrl}
                                        alt={story.title}
                                        className="absolute inset-0 w-full h-full object-cover rounded-t-md brightness-110 saturate-110 group-hover:brightness-125"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-[16/9] bg-muted animate-pulse rounded-t-md" />
                            )}
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm md:text-base font-semibold line-clamp-2">{story.title}</CardTitle>
                                        <CardDescription className="text-xs md:text-sm line-clamp-2">{story.summary.slice(0, 80)}{story.summary.length > 80 ? '...' : ''}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{story.points} pts</Badge>
                                        {readIds.has(story.id) && (
                                            <Badge variant="outline" className="text-[11px] px-2 py-0.5">Points claimed</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-xs md:text-sm text-muted-foreground">
                                        {story.category && <Badge variant="outline">{story.category}</Badge>}
                                        <span>•</span>
                                        <span>{new Date(story.publishedAt).toLocaleDateString()}</span>
                                    </div>
                                    <Button size="sm" className="h-8 px-3" onClick={() => startReading(story)}>
                                        Read & Earn
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Native Ad Injection */}
                        {(index + 1) % 4 === 0 && (
                            <Card className="group cursor-pointer hover:shadow-sm transition-shadow border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                                <div className="relative aspect-[16/9] bg-amber-100 dark:bg-amber-900/40 rounded-t-md flex items-center justify-center">
                                    <div className="text-center">
                                        <span className="text-4xl block mb-2">⭐</span>
                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">Sponsored</Badge>
                                    </div>
                                </div>
                                <CardHeader className="pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm md:text-base font-semibold text-amber-900 dark:text-amber-100">
                                            Bonus Opportunity
                                        </CardTitle>
                                        <CardDescription className="text-xs md:text-sm text-amber-800 dark:text-amber-200 line-clamp-2">
                                            Check out this special offer to earn up to 500 bonus points instantly!
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        size="sm"
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0"
                                        onClick={() => AdService.showInterstitial()}
                                    >
                                        View Offer
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </Fragment>
                ))}
            </div>
        </div>
    )
}

export default NewsReadingSystem
