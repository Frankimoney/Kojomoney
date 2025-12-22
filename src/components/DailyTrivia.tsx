'use client'

import { apiCall } from '@/lib/api-client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Clock, Brain, CheckCircle, XCircle, Trophy, ArrowRight } from 'lucide-react'

interface TriviaQuestion {
    question: string
    options: string[]
    correctAnswer: number
}

interface TriviaState {
    questions: TriviaQuestion[]
    currentQuestionIndex: number
    answers: number[]
    timeRemaining: number
    isCompleted: boolean
    score: number
    totalPoints: number
    streakBonus: number
    showResults: boolean
    triviaId: string | null
    hasAttemptedToday: boolean
}

interface DailyTriviaProps {
    userId?: string
    dailyStreak?: number
}

const DailyTrivia = ({ userId, dailyStreak }: DailyTriviaProps) => {
    const [triviaState, setTriviaState] = useState<TriviaState>({
        questions: [],
        currentQuestionIndex: 0,
        answers: [],
        timeRemaining: 30,
        isCompleted: false,
        score: 0,
        totalPoints: 0,
        streakBonus: 0,
        showResults: false,
        triviaId: null,
        hasAttemptedToday: false
    })
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasStarted, setHasStarted] = useState(false)

    useEffect(() => {
        fetchDailyTrivia()
    }, [])

    useEffect(() => {
        if (triviaState.hasAttemptedToday && typeof window !== 'undefined') {
            window.dispatchEvent(new Event('kojo:user:update'))
        }
    }, [triviaState.hasAttemptedToday])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (hasStarted && !triviaState.isCompleted && triviaState.timeRemaining > 0) {
            timer = setTimeout(() => {
                setTriviaState(prev => ({
                    ...prev,
                    timeRemaining: prev.timeRemaining - 1
                }))
            }, 1000)
        } else if (hasStarted && !triviaState.isCompleted && triviaState.timeRemaining === 0) {
            // Auto-submit when time runs out
            nextQuestion()
        }
        return () => clearTimeout(timer)
    }, [hasStarted, triviaState.isCompleted, triviaState.timeRemaining])

    const fetchDailyTrivia = async () => {
        try {
            // Region defaults to 'auto' (handled by backend based on IP)
            const url = `/api/trivia?userId=${userId ? encodeURIComponent(userId) : ''}`
            const response = await fetch(url)
            const data = await response.json()
            setTriviaState(prev => ({
                ...prev,
                questions: data.questions || [],
                totalPoints: data.totalPoints || 50,
                triviaId: data.triviaId || null,
                hasAttemptedToday: Boolean(data.hasAttempted)
            }))
        } catch (error) {
            console.error('Error fetching trivia:', error)
        } finally {
            setLoading(false)
        }
    }

    const startTrivia = () => {
        if (triviaState.hasAttemptedToday) return
        setHasStarted(true)
        setTriviaState(prev => ({
            ...prev,
            currentQuestionIndex: 0,
            answers: [],
            timeRemaining: 30,
            isCompleted: false,
            score: 0,
            showResults: false
        }))
    }

    const submitAnswer = () => {
        if (selectedAnswer === null) return

        const newAnswers = [...triviaState.answers, selectedAnswer]
        const currentQuestion = triviaState.questions[triviaState.currentQuestionIndex]
        const isCorrect = selectedAnswer === currentQuestion.correctAnswer
        const newScore = isCorrect ? triviaState.score + 1 : triviaState.score

        setTriviaState(prev => ({
            ...prev,
            answers: newAnswers,
            score: newScore
        }))

        setTimeout(() => nextQuestion(), 1000)
    }

    const nextQuestion = () => {
        const nextIndex = triviaState.currentQuestionIndex + 1

        if (nextIndex >= triviaState.questions.length) {
            completeTrivia()
        } else {
            setTriviaState(prev => ({
                ...prev,
                currentQuestionIndex: nextIndex,
                timeRemaining: 30
            }))
            setSelectedAnswer(null)
        }
    }

    const completeTrivia = async () => {
        const basePoints = triviaState.score * 10
        const streakBonus = Math.max(0, (dailyStreak || 0) * 5)
        const totalPoints = basePoints + streakBonus

        setTriviaState(prev => ({
            ...prev,
            isCompleted: true,
            totalPoints: basePoints,
            streakBonus,
            showResults: true
        }))

        // Submit to backend
        try {
            if (!triviaState.triviaId || !userId) {
                console.warn('Missing triviaId or userId for submission')
            } else {
                const response = await apiCall('/api/trivia', {
                    method: 'POST',
                    body: JSON.stringify({
                        triviaId: triviaState.triviaId,
                        userId,
                        answers: triviaState.answers
                    })
                })
                const result = await response.json()
                console.log('Trivia result:', result)
                if (typeof window !== 'undefined') {
                    // Trigger global listeners
                    window.dispatchEvent(new Event('kojo:points:earned'))
                    // Small delay to allow backend writes to settle
                    setTimeout(async () => {
                        try {
                            if (userId) {
                                const res = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`)
                                const data = await res.json()
                                if (data?.user) {
                                    localStorage.setItem('kojomoneyUser', JSON.stringify(data.user))
                                }
                            }
                        } catch { }
                        window.dispatchEvent(new Event('kojo:user:update'))
                    }, 400)
                }
            }
        } catch (error) {
            console.error('Error submitting trivia:', error)
        }
    }

    const resetTrivia = () => {
        setHasStarted(false)
        setSelectedAnswer(null)
        setTriviaState(prev => ({
            ...prev,
            currentQuestionIndex: 0,
            answers: [],
            timeRemaining: 30,
            isCompleted: false,
            score: 0,
            showResults: false
        }))
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!hasStarted) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Brain className="h-6 w-6 text-purple-500" />
                        <span>Daily Trivia Challenge</span>
                    </CardTitle>
                    <CardDescription>
                        {triviaState.hasAttemptedToday
                            ? 'You have already completed today\'s trivia.'
                            : `Test your knowledge and earn up to ${triviaState.totalPoints} points!`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{triviaState.questions.length}</p>
                            <p className="text-sm text-muted-foreground">Questions</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{triviaState.totalPoints}</p>
                            <p className="text-sm text-muted-foreground">Total Points</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">How to Play:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Answer all questions correctly for maximum points</li>
                            <li>• Each correct answer earns 10 points</li>
                            <li>• Get bonus points for daily streaks</li>
                            <li>• 30 seconds per question</li>
                        </ul>
                    </div>

                    <Button onClick={startTrivia} className="w-full" size="lg" disabled={triviaState.hasAttemptedToday}>
                        {triviaState.hasAttemptedToday ? 'Already Completed' : 'Start Daily Trivia'}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (triviaState.showResults) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        <span>Trivia Complete!</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center space-y-4">
                        <div className="text-6xl font-bold text-purple-600">
                            {triviaState.score}/{triviaState.questions.length}
                        </div>
                        <p className="text-lg">Questions Correct</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span>Base Points</span>
                            <span className="font-semibold text-green-700">+{triviaState.totalPoints}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span>Streak Bonus ({(dailyStreak || 0)} days)</span>
                            <span className="font-semibold text-blue-700">+{triviaState.streakBonus}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                            <span className="font-semibold">Total Points Earned</span>
                            <span className="font-bold text-purple-700">+{triviaState.totalPoints + triviaState.streakBonus}</span>
                        </div>
                    </div>

                    <Button onClick={resetTrivia} className="w-full">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Back to Earn Tab
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const currentQuestion = triviaState.questions[triviaState.currentQuestionIndex]
    const progress = ((triviaState.currentQuestionIndex + 1) / triviaState.questions.length) * 100

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-purple-500" />
                        <span>Question {triviaState.currentQuestionIndex + 1} of {triviaState.questions.length}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{triviaState.timeRemaining}s</span>
                    </div>
                </div>
                <Progress value={progress} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>

                    <RadioGroup
                        value={selectedAnswer?.toString()}
                        onValueChange={(value) => setSelectedAnswer(parseInt(value))}
                    >
                        {currentQuestion.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <Button
                    onClick={submitAnswer}
                    disabled={selectedAnswer === null}
                    className="w-full"
                    size="lg"
                >
                    Submit Answer
                </Button>
            </CardContent>
        </Card>
    )
}

export default DailyTrivia
