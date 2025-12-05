'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Share2, Copy, Download, Users, Gift, Star, Award, ChevronRight, ArrowLeft, MessageCircle, Twitter, Facebook, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall } from '@/lib/api-client'
import html2canvas from 'html2canvas'
import confetti from 'canvas-confetti'

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
}

// Mock Data
const MOCK_REFERRALS: Referral[] = [
    { id: '1', name: 'John Doe', date: '2023-12-01', status: 'completed', earnings: 500 },
    { id: '2', name: 'Sarah Smith', date: '2023-12-03', status: 'active', earnings: 100 },
    { id: '3', name: 'Mike Johnson', date: '2023-12-05', status: 'registered', earnings: 0 },
    { id: '4', name: 'Alex Brown', date: '2023-12-05', status: 'registered', earnings: 0 }
]

const MILESTONES: Milestone[] = [
    { count: 5, reward: 1000, isClaimed: false },
    { count: 10, reward: 2500, isClaimed: false },
    { count: 25, reward: 7500, isClaimed: false }
]

interface ReferralSystemProps {
    user: any
    onClose?: () => void
}

export default function ReferralSystem({ user, onClose }: ReferralSystemProps) {
    const [referrals, setReferrals] = useState<Referral[]>(MOCK_REFERRALS)
    const [milestones, setMilestones] = useState<Milestone[]>(MILESTONES)
    const [showPoster, setShowPoster] = useState(false)
    const [lastShareTime, setLastShareTime] = useState(0)
    const [showSpamWarning, setShowSpamWarning] = useState(false)
    const posterRef = useRef<HTMLDivElement>(null)

    const activeCount = referrals.filter(r => r.status === 'active' || r.status === 'completed').length
    const nextMilestone = milestones.find(m => m.count > activeCount) || milestones[milestones.length - 1]
    const progress = Math.min((activeCount / nextMilestone.count) * 100, 100)

    useEffect(() => {
        // Trigger confetti if a new referral becomes active (Simulation)
        // In a real app, this would be based on websocket or polling diffs
        if (referrals.some(r => r.status === 'active')) {
            // just a demo trigger on mount if any are active
            // confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
        }
    }, [])

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

        const text = `Join me on KojoMoney and start earning! Use my code ${user?.referralCode || 'KOJO'} for a bonus.`
        const url = `https://kojomoney.com/?ref=${user?.referralCode}`

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

    const handleDownloadPoster = async () => {
        if (!posterRef.current) return
        try {
            const canvas = await html2canvas(posterRef.current, { scale: 2 })
            const link = document.createElement('a')
            link.download = `kojo-invite-${user?.referralCode}.png`
            link.href = canvas.toDataURL()
            link.click()
            confetti({
                particleCount: 150,
                spread: 60,
                origin: { y: 0.7 },
                zIndex: 9999
            })
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
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-muted-foreground">Milestone Progress</span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold">{activeCount} / {nextMilestone.count} Active</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                        <motion.div
                            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-pink-500 to-purple-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-1">
                        Reach {nextMilestone.count} active referrals to unlock ₦{nextMilestone.reward.toLocaleString()} bonus!
                    </p>
                </div>

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
                                <p className="text-purple-200 text-sm">Earn Money Daily</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 w-full text-center z-10">
                                <p className="text-sm font-medium mb-1 text-purple-100">USE MY CODE</p>
                                <p className="text-3xl font-black tracking-widest text-white mb-2">{user?.referralCode || 'KOJO'}</p>
                                <div className="bg-white text-purple-900 text-xs font-bold py-1 px-3 rounded-full inline-block">
                                    GET ₦500 BONUS
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
