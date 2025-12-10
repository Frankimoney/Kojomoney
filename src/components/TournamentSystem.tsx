'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trophy, Medal, Crown, Timer, Info, ArrowUp, ArrowDown, ChevronRight, Zap, Target, Star, Gift, ArrowLeft, Users, Flame, Clock, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall, apiJson } from '@/lib/api-client'

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

interface TournamentSystemProps {
    userId?: string
    onClose?: () => void
}

export default function TournamentSystem({ userId, onClose }: TournamentSystemProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 })
    const [showRules, setShowRules] = useState(false)
    const [activityFeed, setActivityFeed] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [myRank, setMyRank] = useState<number | null>(null)
    const [rewards, setRewards] = useState<any[]>([])
    const [pendingReward, setPendingReward] = useState<any>(null)
    const [prizePool, setPrizePool] = useState(0)
    const [pointsPerActivity, setPointsPerActivity] = useState<Record<string, number>>({})


    useEffect(() => {
        loadTournamentData()

        // Refresh data every 30 seconds
        const refreshInterval = setInterval(loadTournamentData, 30000)

        // Update timer every minute
        const timerInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.minutes > 0) {
                    return { ...prev, minutes: prev.minutes - 1 }
                } else if (prev.hours > 0) {
                    return { ...prev, hours: prev.hours - 1, minutes: 59 }
                } else if (prev.days > 0) {
                    return { ...prev, days: prev.days - 1, hours: 23, minutes: 59 }
                }
                return prev
            })
        }, 60000)

        return () => {
            clearInterval(refreshInterval)
            clearInterval(timerInterval)
        }
    }, [userId])

    const loadTournamentData = async () => {
        try {
            const response = await apiJson(`/api/tournament?userId=${userId || ''}`)
            if (response) {
                setPlayers(response.leaderboard || [])
                setTimeLeft(response.timeRemaining || { days: 0, hours: 0, minutes: 0 })
                setMyRank(response.myRank)
                setRewards(response.rewards || [])
                setPendingReward(response.pendingReward)
                setPrizePool(response.prizePool || 0)
                setPointsPerActivity(response.pointsPerActivity || {})
            }
        } catch (error) {
            console.error('Error loading tournament:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const timeString = `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`

    // Find current user stats
    const me = players.find(p => p.isMe) || (myRank ? { rank: myRank, points: 0, tier: 'Bronze' as const } : null)

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



    const handleClaimReward = async () => {
        if (!userId || !pendingReward) return

        try {
            const response = await apiJson('/api/tournament', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    action: 'claim_reward',
                    weekKey: pendingReward.weekKey
                })
            })

            if (response.success) {
                alert(response.message || 'Reward claimed!')
                setPendingReward(null)
                // Trigger refresh
                loadTournamentData()
            } else {
                alert(response.error || 'Failed to claim reward')
            }
        } catch (e) {
            console.error('Error claiming reward:', e)
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
                                {me?.rank || '-'}
                            </div>
                            <div>
                                <p className="text-blue-100 text-xs font-medium">My Rank</p>
                                <p className="font-bold text-lg">{(me?.points || 0).toLocaleString()} pts</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-white/20 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
                                {me?.tier || 'Bronze'} League
                            </div>
                            <p className="text-[10px] text-blue-200 mt-1">Top 20%</p>
                        </div>
                    </div>
                </div>
            </div>



            <div className="p-4 max-w-md mx-auto space-y-4">
                {/* PENDING REWARD BANNER */}
                {pendingReward && (
                    <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-none shadow-lg animate-pulse">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-100" />
                                    Results Available!
                                </h3>
                                <p className="text-yellow-100 text-sm">You have results from last week's cup.</p>
                            </div>
                            <Button onClick={handleClaimReward} variant="secondary" className="font-bold text-orange-600 bg-white hover:bg-white/90">
                                Check & Claim
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* TIMER & PRIZE POOL */}
                <div className="flex gap-2">
                    <Card className="flex-1 bg-black text-white border-none">
                        <CardContent className="p-3 flex items-center gap-2">
                            <Timer className="h-8 w-8 text-yellow-400" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Ends In</p>
                                <p className="font-mono font-bold text-sm">{timeString}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
                        <CardContent className="p-3 flex items-center gap-2">
                            <Gift className="h-8 w-8 text-yellow-600" />
                            <div>
                                <p className="text-[10px] text-yellow-800 dark:text-yellow-200 uppercase font-bold">Prize Pool</p>
                                <p className="font-bold text-yellow-700 dark:text-yellow-400 text-sm">₦{(prizePool / 1000).toFixed(0)}k</p>
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
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>🏆 How to Win</DialogTitle>
                        <DialogDescription>
                            Compete with others to win huge weekly prizes!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Earn Tournament Points:</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Referral</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.referral || 100} pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Survey</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.survey || 50} pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Offerwall</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.offerwall || 30} pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Mission</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.mission || 20} pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Trivia</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.trivia || 20} pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>Ad Watch</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.adWatch || 10} pts</span>
                                </div>
                                <div className="bg-muted p-2 rounded flex justify-between">
                                    <span>News Read</span>
                                    <span className="font-bold text-green-600">+{pointsPerActivity.newsRead || 5} pts</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Weekly Prizes:</h4>
                            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                                {rewards.slice(0, 3).map((reward, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                                        <span className="flex items-center gap-2">
                                            {index === 0 && <Crown className="h-4 w-4 text-yellow-600" />}
                                            {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                                            {index === 2 && <Medal className="h-4 w-4 text-orange-400" />}
                                            {reward.label || `Rank ${reward.rank}`}
                                        </span>
                                        <span className="font-bold">₦{(reward.nairaValue || reward.points).toLocaleString()}</span>
                                    </div>
                                ))}
                                {rewards.length > 3 && (
                                    <div className="flex justify-between items-center p-2 border rounded-lg">
                                        <span className="flex items-center gap-2"><Star className="h-4 w-4 text-indigo-500" /> Rank 4-10</span>
                                        <span className="font-bold">₦{(rewards[3]?.nairaValue || rewards[3]?.points || 10000).toLocaleString()}+</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-sm">
                            <p className="font-medium text-indigo-700 dark:text-indigo-300">💡 Pro Tip</p>
                            <p className="text-indigo-600 dark:text-indigo-400 text-xs mt-1">Referrals and surveys give the highest tournament points. Complete daily activities to climb the leaderboard!</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
