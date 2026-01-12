'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Share2, Copy, Download, Users, Gift, Star, Award, ChevronRight, ArrowLeft, MessageCircle, Twitter, Facebook, AlertTriangle, CheckCircle2, Loader2, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall, apiJson } from '@/lib/api-client'
import { useBannerAd } from '@/hooks/useAds'
import html2canvas from 'html2canvas'
import { safeConfetti } from '@/lib/safe-confetti'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Referral {
    id: string
    name: string
    date: string
    status: 'registered' | 'active' | 'completed'
    earnings: number
}

interface Milestone {
    count: number
    reward: number
    isClaimed: boolean
    isUnlocked: boolean
}

interface ReferralSystemProps {
    user: any
    onClose?: () => void
}

export default function ReferralSystem({ user, onClose }: ReferralSystemProps) {
    const [referrals, setReferrals] = useState<Referral[]>([])
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [totalEarnings, setTotalEarnings] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [showPoster, setShowPoster] = useState(false)
    const [lastShareTime, setLastShareTime] = useState(0)
    const [showSpamWarning, setShowSpamWarning] = useState(false)
    const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null)
    const posterRef = useRef<HTMLDivElement>(null)

    // Show banner ad at bottom
    useBannerAd('bottom', true)

    // Count ALL referrals for progress (including 'registered')
    // Milestones are unlocked based on total referral count, not just active ones
    const totalReferralCount = referrals.length
    const activeCount = referrals.filter(r => r.status === 'active' || r.status === 'completed').length
    const nextMilestone = milestones.find(m => !m.isClaimed && m.count > totalReferralCount) || milestones[milestones.length - 1]
    const progress = nextMilestone ? Math.min((totalReferralCount / nextMilestone.count) * 100, 100) : 100

    useEffect(() => {
        loadReferralData()
    }, [user?.id])

    const loadReferralData = async () => {
        if (!user?.id) return

        setIsLoading(true)
        try {
            const response = await apiJson(`/api/referrals?userId=${user.id}`)
            if (response) {
                setReferrals(response.referrals || [])
                setMilestones(response.milestones || [])
                setTotalEarnings(response.totalEarnings || 0)
            }
        } catch (error) {
            console.error('Error loading referrals:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClaimMilestone = async (milestone: Milestone) => {
        if (!user?.id || milestone.isClaimed || !milestone.isUnlocked) return

        setClaimingMilestone(milestone.count)
        try {
            const response = await apiJson('/api/referrals', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user.id,
                    action: 'claim_milestone',
                    milestoneCount: milestone.count,
                }),
            })

            if (response.success) {
                triggerConfetti()
                loadReferralData() // Refresh data
            }
        } catch (error) {
            console.error('Error claiming milestone:', error)
        } finally {
            setClaimingMilestone(null)
        }
    }

    const handleCopy = () => {
        if (user?.referralCode) {
            navigator.clipboard.writeText(user.referralCode)
            // toast success
        }
    }

    const handleShare = async (platform: string) => {
        const now = Date.now()
        if (now - lastShareTime < 2000) {
            setShowSpamWarning(true)
            setTimeout(() => setShowSpamWarning(false), 3000)
            return
        }
        setLastShareTime(now)

        const code = user?.referralCode || 'KOJO'
        // Always use production domain for referral links
        const url = `https://kojomoney.com/signup?ref=${code}`
        const text = `🎉 Join me on KojoMoney and start earning rewards! Use my referral code ${code} for a welcome bonus.`

        if (platform === 'native' && typeof navigator.share !== 'undefined') {
            try {
                await navigator.share({ title: 'Join KojoMoney', text, url })
            } catch (e) { }
        } else {
            // Fallback mock
            console.log(`Sharing to ${platform}: ${text} ${url}`)
            // In a real app, open respective URL schemes (whatsapp://, etc.)
        }
    }

    const triggerConfetti = () => {
        // Use safe confetti wrapper that handles Android compatibility
        safeConfetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.7 }
        })
    }

    const handleDownloadPoster = async () => {
        if (!posterRef.current) return
        try {
            const canvas = await html2canvas(posterRef.current, { scale: 2 })
            const link = document.createElement('a')
            link.download = `kojo-invite-${user?.referralCode}.png`
            link.href = canvas.toDataURL()
            link.click()
            triggerConfetti()
        } catch (e) {
            console.error('Poster generation failed', e)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-900/50 pb-20 relative font-sans">
            {/* HEADER */}
            <div className="bg-white dark:bg-zinc-950 border-b sticky top-0 z-10">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {onClose && (
                            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                            Refer & Earn
                        </h1>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-md mx-auto">
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
                        <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">My Referrals</TabsTrigger>
                        <TabsTrigger value="contest" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-sm flex gap-2">
                            <Trophy className="h-3 w-3" /> Contest
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                        {/* HERO SECTION */}
                        <Card className="bg-gradient-to-br from-violet-600 to-purple-700 text-white border-none shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <Users className="h-32 w-32" />
                            </div>
                            <CardContent className="p-6 text-center space-y-4">
                                <div>
                                    <p className="text-purple-100 text-sm mb-1">Your Referral Code</p>
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center justify-center gap-3">
                                        <span className="text-2xl font-mono font-bold tracking-wider">{user?.referralCode || 'LOADING'}</span>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={handleCopy}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-purple-100">
                                    Earn 10% of everything your friends earn, forever!
                                </p>

                                <div className="grid grid-cols-4 gap-2 pt-2">
                                    <Button variant="outline" size="icon" className="w-full h-12 bg-green-500 hover:bg-green-600 border-none text-white rounded-xl" onClick={() => handleShare('whatsapp')}>
                                        <MessageCircle className="h-5 w-5" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="w-full h-12 bg-blue-600 hover:bg-blue-700 border-none text-white rounded-xl" onClick={() => handleShare('facebook')}>
                                        <Facebook className="h-5 w-5" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="w-full h-12 bg-black hover:bg-zinc-800 border-none text-white rounded-xl" onClick={() => handleShare('twitter')}>
                                        <Twitter className="h-5 w-5" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="w-full h-12 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl" onClick={() => setShowPoster(true)}>
                                        <Download className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ANTI-SPAM WARNING */}
                        <AnimatePresence>
                            {showSpamWarning && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm"
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Sharing too fast! Please slow down.</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* MILESTONES */}
                        {nextMilestone && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground">Milestone Progress</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-bold">{totalReferralCount} / {nextMilestone.count} Referrals</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                                    <motion.div
                                        className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-pink-500 to-purple-600"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-center pt-1">
                                    Reach {nextMilestone.count} referrals to unlock {nextMilestone.reward.toLocaleString()} bonus points!
                                </p>
                            </div>
                        )}

                        {/* REFERRAL LIST */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-purple-500" />
                                    My Referrals
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {referrals.map((ref) => (
                                    <div key={ref.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                                {ref.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{ref.name}</p>
                                                <p className="text-xs text-muted-foreground">{ref.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={ref.status === 'completed' ? 'default' : ref.status === 'active' ? 'secondary' : 'outline'} className="text-[10px] mb-1 capitalize">
                                                {ref.status}
                                            </Badge>
                                            {ref.earnings > 0 && (
                                                <p className="text-xs font-semibold text-green-600">+{ref.earnings} pts</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {referrals.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No referrals yet. Invite friends to start earning!
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* CTA BUTTON */}
                        <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg text-lg font-semibold" onClick={() => handleShare('native')}>
                            Invite Friends & Earn
                        </Button>
                    </TabsContent>

                    <TabsContent value="contest" className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                        <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-none shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Trophy className="h-6 w-6 text-yellow-100" />
                                    Weekly Contest
                                </CardTitle>
                                <CardDescription className="text-amber-100">
                                    Top 10 inviters win big rewards every Sunday!
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-amber-100 text-sm font-medium">Prize Pool</span>
                                        <span className="text-3xl font-black text-white">$100.00</span>
                                    </div>
                                    <div className="text-xs text-amber-100/80">Next payout: in 2 days</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {[
                                    { rank: 1, name: 'David K.', count: 142, prize: '$50' },
                                    { rank: 2, name: 'Sarah M.', count: 98, prize: '$30' },
                                    { rank: 3, name: 'Michael B.', count: 76, prize: '$20' },
                                    { rank: 4, name: 'Jenny L.', count: 45, prize: '5000 pts' },
                                    { rank: 5, name: 'Tom H.', count: 41, prize: '2000 pts' },
                                    { rank: 6, name: 'Alex P.', count: 32, prize: '1000 pts' },
                                    { rank: 7, name: 'John D.', count: 28, prize: '500 pts' },
                                    { rank: 8, name: 'Lisa R.', count: 24, prize: '500 pts' },
                                ].map((u, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${u.rank <= 3 ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50' : 'bg-transparent border border-transparent'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${u.rank === 1 ? 'bg-yellow-400 text-yellow-900 shadow-md' :
                                                u.rank === 2 ? 'bg-gray-300 text-gray-800' :
                                                    u.rank === 3 ? 'bg-orange-300 text-orange-900' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>
                                                {u.rank}
                                            </div>
                                            <div className="font-medium">{u.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-sm">{u.count} invites</div>
                                            <div className="text-xs text-green-600 font-medium">{u.prize}</div>
                                        </div>
                                    </div>
                                ))}
                                <div className="border-t my-2 pt-2">
                                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                                -
                                            </div>
                                            <div className="font-medium">You</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-sm text-purple-700 dark:text-purple-300">{activeCount} invites</div>
                                            <div className="text-xs text-muted-foreground">Keep inviting!</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg text-lg font-semibold" onClick={() => handleShare('native')}>
                            Start Inviting Now
                        </Button>
                    </TabsContent>
                </Tabs>
            </div>

            {/* POSTER GENERATION DIALOG */}
            <Dialog open={showPoster} onOpenChange={setShowPoster}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Shareable Poster</DialogTitle>
                        <DialogDescription>Download this image to share on Instagram or WhatsApp Status</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center p-4 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                        {/* POSTER ELEMENT */}
                        <div
                            ref={posterRef}
                            className="w-[300px] h-[400px] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6 flex flex-col items-center justify-between relative shadow-2xl"
                            style={{ fontFamily: 'sans-serif' }}
                        >
                            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                            <div className="text-center z-10">
                                <h2 className="text-3xl font-extrabold mb-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">KOJOMONEY</h2>
                                <p className="text-purple-200 text-sm">Earn Rewards Daily</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 w-full text-center z-10">
                                <p className="text-sm font-medium mb-1 text-purple-100">USE MY CODE</p>
                                <p className="text-3xl font-black tracking-widest text-white mb-2">{user?.referralCode || 'KOJO'}</p>
                                <div className="bg-white text-purple-900 text-xs font-bold py-1 px-3 rounded-full inline-block">
                                    GET 500 BONUS POINTS
                                </div>
                            </div>

                            <div className="text-center z-10 space-y-2">
                                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-green-400" /> Instant Payouts
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-green-400" /> Easy Tasks
                                </div>
                                <p className="text-xs text-purple-300 mt-4">Download App Today</p>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleDownloadPoster} className="w-full">
                        <Download className="h-4 w-4 mr-2" /> Download Image
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
