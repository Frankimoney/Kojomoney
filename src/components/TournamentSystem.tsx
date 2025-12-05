'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trophy, Medal, Crown, Timer, Info, ArrowUp, ArrowDown, ChevronRight, Zap, Target, Star, Gift, ArrowLeft, Users, Flame, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall } from '@/lib/api-client'

interface Player {
    id: string
    rank: number
    name: string
    avatar?: string
    points: number
    change: number
    tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze'
    isMe?: boolean
}

// Mock Data
const MOCK_LEADERBOARD: Player[] = [
    { id: '1', rank: 1, name: 'CryptoKing', points: 15420, change: 0, tier: 'Platinum' },
    { id: '2', rank: 2, name: 'EarnMaster', points: 14200, change: 1, tier: 'Platinum' },
    { id: '3', rank: 3, name: 'Sarah2024', points: 13850, change: -1, tier: 'Gold' },
    { id: '4', rank: 4, name: 'JohnDoe', points: 12100, change: 2, tier: 'Gold' },
    { id: '5', rank: 5, name: 'KojoFan', points: 11500, change: 0, tier: 'Silver' },
    { id: '6', rank: 6, name: 'MoneyMaker', points: 10200, change: -2, tier: 'Silver' },
    { id: '7', rank: 7, name: 'You (Me)', points: 9850, change: 5, tier: 'Bronze', isMe: true },
    { id: '8', rank: 8, name: 'Newbie01', points: 8700, change: 0, tier: 'Bronze' },
    { id: '9', rank: 9, name: 'TaskHero', points: 8500, change: -1, tier: 'Bronze' },
    { id: '10', rank: 10, name: 'LuckyWinner', points: 8200, change: 1, tier: 'Bronze' },
]

interface TournamentSystemProps {
    userId?: string
    onClose?: () => void
}

export default function TournamentSystem({ userId, onClose }: TournamentSystemProps) {
    const [players, setPlayers] = useState<Player[]>(MOCK_LEADERBOARD)
    const [timeLeft, setTimeLeft] = useState('')
    const [showRules, setShowRules] = useState(false)
    const [activityFeed, setActivityFeed] = useState<string[]>([])

    // Simulated Timer
    useEffect(() => {
        const updateTimer = () => {
            // Mock standard end of week
            const now = new Date()
            const endOfWeek = new Date()
            endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
            endOfWeek.setHours(23, 59, 59)

            const diff = endOfWeek.getTime() - now.getTime()
            const d = Math.floor(diff / (1000 * 60 * 60 * 24))
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            setTimeLeft(`${d}d ${h}h ${m}m`)
        }
        updateTimer()
        const timer = setInterval(updateTimer, 60000)

        // Mock Live Updates
        const updateInterval = setInterval(() => {
            // Randomly update a player's score
            setPlayers(prev => {
                const newPlayers = [...prev]
                const randIdx = Math.floor(Math.random() * 10)
                const points = Math.floor(Math.random() * 50) + 10
                newPlayers[randIdx] = {
                    ...newPlayers[randIdx],
                    points: newPlayers[randIdx].points + points
                }

                // Add to activity feed
                const newFeed = [`${newPlayers[randIdx].name} earned +${points} pts`, ...activityFeed].slice(0, 3)
                setActivityFeed(newFeed)

                return newPlayers.sort((a, b) => b.points - a.points).map((p, i) => ({
                    ...p,
                    rank: i + 1
                }))
            })
        }, 5000)

        return () => {
            clearInterval(timer)
            clearInterval(updateInterval)
        }
    }, [activityFeed])

    // Find current user stats
    const me = players.find(p => p.isMe) || players[6]

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500" />
        if (rank === 2) return <Medal className="h-6 w-6 text-gray-400 fill-gray-400" />
        if (rank === 3) return <Medal className="h-6 w-6 text-orange-400 fill-orange-400" />
        return <span className="font-bold text-muted-foreground w-6 text-center">{rank}</span>
    }

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Platinum': return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
            case 'Gold': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
            case 'Silver': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            default: return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-900/50 pb-20 relative font-sans">
            {/* HEADER */}
            <div className="bg-white dark:bg-zinc-950 border-b sticky top-0 z-20">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {onClose && (
                            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-indigo-500" /> Weekly Cup
                        </h1>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowRules(true)}>
                        <Info className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>

                {/* MY RANK BANNER */}
                <div className="px-4 pb-4">
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-4 text-white shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg border border-white/30">
                                {me.rank}
                            </div>
                            <div>
                                <p className="text-blue-100 text-xs font-medium">My Rank</p>
                                <p className="font-bold text-lg">{me.points.toLocaleString()} pts</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-white/20 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
                                {me.tier} League
                            </div>
                            <p className="text-[10px] text-blue-200 mt-1">Top 20%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-md mx-auto space-y-4">

                {/* TIMER & PRIZE POOL */}
                <div className="flex gap-2">
                    <Card className="flex-1 bg-black text-white border-none">
                        <CardContent className="p-3 flex items-center gap-2">
                            <Timer className="h-8 w-8 text-yellow-400" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Ends In</p>
                                <p className="font-mono font-bold text-sm">{timeLeft}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
                        <CardContent className="p-3 flex items-center gap-2">
                            <Gift className="h-8 w-8 text-yellow-600" />
                            <div>
                                <p className="text-[10px] text-yellow-800 dark:text-yellow-200 uppercase font-bold">Prize Pool</p>
                                <p className="font-bold text-yellow-700 dark:text-yellow-400 text-sm">₦500k</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LIVE ACTIVITY FEED */}
                {activityFeed.length > 0 && (
                    <div className="flex flex-col gap-1 overflow-hidden h-6">
                        <AnimatePresence mode='popLayout'>
                            <motion.p
                                key={activityFeed[0]}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-xs text-center text-muted-foreground font-medium flex items-center justify-center gap-1"
                            >
                                <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {activityFeed[0]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                )}

                {/* LEADERBOARD LIST */}
                <div className="space-y-2 pb-24">
                    <div className="flex justify-between px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Rank</span>
                        <span>Points</span>
                    </div>

                    {players.map((player) => (
                        <motion.div
                            key={player.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`flex items-center justify-between p-3 rounded-xl border ${player.isMe
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                    : 'bg-card border-border hover:bg-accent/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 flex justify-center">
                                    {getRankIcon(player.rank)}
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                    <AvatarFallback>{player.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className={`font-semibold text-sm ${player.isMe ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                                        {player.name} {player.isMe && '(You)'}
                                    </p>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 h-4 ${getTierColor(player.tier)}`}>
                                        {player.tier}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">{player.points.toLocaleString()}</p>
                                {player.change !== 0 && (
                                    <div className={`text-[10px] flex items-center justify-end ${player.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {player.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                        {Math.abs(player.change)}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* STICKY BOTTOM EARN CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-20">
                <Button className="w-full text-lg h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 shadow-xl" onClick={onClose}>
                    <Target className="h-5 w-5 mr-2" /> Earn More Points
                </Button>
            </div>

            {/* RULES MODAL */}
            <Dialog open={showRules} onOpenChange={setShowRules}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>🏆 How to Win</DialogTitle>
                        <DialogDescription>
                            Compete with others to win huge weekly prizes!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Point System:</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Survey</span>
                                    <span className="font-bold text-green-600">+500 pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Referral</span>
                                    <span className="font-bold text-green-600">+100 pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Challenge</span>
                                    <span className="font-bold text-green-600">+50 pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Ad Watch</span>
                                    <span className="font-bold text-green-600">+10 pts</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Weekly Prizes:</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between items-center p-2 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                                    <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-600" /> Rank 1</span>
                                    <span className="font-bold">₦100,000</span>
                                </div>
                                <div className="flex justify-between items-center p-2 border rounded-lg">
                                    <span className="flex items-center gap-2"><Medal className="h-4 w-4 text-gray-400" /> Rank 2-10</span>
                                    <span className="font-bold">₦25,000</span>
                                </div>
                                <div className="flex justify-between items-center p-2 border rounded-lg">
                                    <span className="flex items-center gap-2"><Star className="h-4 w-4 text-orange-400" /> Rank 11-100</span>
                                    <span className="font-bold">₦5,000</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
