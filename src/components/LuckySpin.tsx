'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { motion, useAnimation, useSpring } from 'framer-motion'
import { celebrationConfetti } from '@/lib/safe-confetti'
import { ReviewPrompt } from '@/components/ReviewPrompt'
import { Trophy, Star, Sparkles, Clock, Play } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import AdService from '@/services/adService'

interface LuckySpinProps {
    userId?: string
    onClose?: () => void
}

interface SpinSegment {
    id: number
    label: string
    value: number
    color: string
    probability: number // 0-1
}

const SEGMENTS: SpinSegment[] = [
    { id: 1, label: '50 Pts', value: 50, color: '#ef4444', probability: 0.24 },   // Red
    { id: 2, label: '10 Pts', value: 10, color: '#3b82f6', probability: 0.32 },   // Blue
    { id: 3, label: '100 Pts', value: 100, color: '#eab308', probability: 0.12 }, // Yellow
    { id: 4, label: '20 Pts', value: 20, color: '#22c55e', probability: 0.20 },  // Green
    { id: 5, label: '500 Pts', value: 500, color: '#a855f7', probability: 0.04 }, // Purple (Jackpot)
    { id: 6, label: 'TRY AGAIN', value: 0, color: '#64748b', probability: 0.08 }, // Gray
]

export default function LuckySpin({ userId, onClose }: LuckySpinProps) {
    const [isSpinning, setIsSpinning] = useState(false)
    const [canSpin, setCanSpin] = useState(false) // Default to false until loaded
    const [nextSpinTime, setNextSpinTime] = useState<number | null>(null)
    const [lastWin, setLastWin] = useState<SpinSegment | null>(null)
    const [showWinDialog, setShowWinDialog] = useState(false)
    const [showReviewPrompt, setShowReviewPrompt] = useState(false)
    const [rotation, setRotation] = useState(0)

    // Bonus spin from watching ad
    const [hasBonusSpin, setHasBonusSpin] = useState(false)
    const [isLoadingAd, setIsLoadingAd] = useState(false)
    const [bonusSpinUsedToday, setBonusSpinUsedToday] = useState(false)

    const wheelRef = useRef<HTMLDivElement>(null)
    const controls = useAnimation()

    // Check spin availability
    useEffect(() => {
        checkSpinStatus()
    }, [userId])

    const checkSpinStatus = async () => {
        if (!userId) return

        try {
            const res = await apiCall(`/api/spin/status?userId=${userId}`)
            const data = await res.json()

            if (data.canSpin) {
                setCanSpin(true)
                setNextSpinTime(null)
            } else {
                setCanSpin(false)
                setNextSpinTime(data.nextSpinTime)
            }

            // Set bonus spin availability from server
            setBonusSpinUsedToday(!data.canBonusSpin)
        } catch (error) {
            console.error('Failed to check spin status', error)
        }
    }

    const spinWheel = async () => {
        if (isSpinning || !canSpin || !userId) return

        setIsSpinning(true)

        // 1. Determine local outcome based on probabilities (Visual only first)
        // In a real secure app, we should call API FIRST to get the result.
        // For better UX (instant spin), we can Optimistically spin while fetching result

        try {
            // Start spinning animation visually
            // We need to fetch the result from backend to know where to stop
            const res = await apiCall('/api/spin/play', {
                method: 'POST',
                body: JSON.stringify({ userId, bonusSpin: hasBonusSpin })
            })

            const data = await res.json()

            if (!data.success) {
                alert(data.error || 'Spin failed')
                setIsSpinning(false)
                return
            }

            const winningValue = data.points
            // Find the segment matching the points
            // Note: If 0 points, it matches TRY AGAIN
            const targetSegment = SEGMENTS.find(s => s.value === winningValue) || SEGMENTS.find(s => s.value === 0)!

            console.log('[Spin] Won', winningValue, 'pts - Target Segment:', targetSegment.label)

            // Calculate rotation to land on target
            // Each segment is 60 degrees (360 / 6 = 60)
            const segmentDegree = 360 / SEGMENTS.length  // 60

            // Current rotation for continuous spinning
            const currentRotation = rotation

            // Random extra spins (5 to 10 full spins)
            const extraSpins = 360 * (5 + Math.floor(Math.random() * 5))

            // Find segment index (0-based)
            const segmentIndex = SEGMENTS.findIndex(s => s.id === targetSegment.id)

            // IMPORTANT: The SVG wheel has transform: rotate(-90deg)
            // This means segment 0 doesn't start at the top (where pointer is)
            // It starts 90 degrees clockwise from top (i.e. at right side)
            // So we need to account for this 90 degree offset

            // Each segment center is at: (index * 60) + 30 degrees from the -90deg start
            // To bring segment center to TOP (where pointer is at 0/360 degrees):
            // We need to rotate by: -(segmentCenter + svgOffset) 
            // svgOffset is -90 (because SVG is rotated -90 which effectively means all segments start 90deg early)

            const segmentStart = segmentIndex * segmentDegree  // Where segment starts (0, 60, 120, ...)
            const segmentCenter = segmentStart + (segmentDegree / 2)  // Center of segment

            // Add small random offset within the segment (to look natural)
            // Safe zone is +/- 20 degrees (to not cross segment boundary)
            const randomOffset = (Math.random() * 30) - 15  // +/- 15 degrees

            // The wheel rotates clockwise. Positive rotation moves segments clockwise.
            // So to bring segmentCenter to TOP, we rotate NEGATIVE of its position
            // But since we spin forward (positive rotation), we calculate: 360 - segmentCenter
            // PLUS the SVG offset of +90 (because SVG is -90, we need to add 90 to compensate)
            const offsetForSvg = 90  // SVG starts at -90deg, so segments are shifted 90deg ahead
            const targetAngle = 360 - segmentCenter - offsetForSvg + randomOffset

            // Total rotation: current + extra spins + target angle (normalized)
            const targetRotation = currentRotation + extraSpins + ((targetAngle + 360) % 360)

            console.log('[Spin] Rotation calc:', { segmentIndex, segmentCenter, offsetForSvg, targetAngle, targetRotation })

            // Animate
            await controls.start({
                rotate: targetRotation,
                transition: {
                    duration: 5,
                    ease: [0.15, 0.55, 0.25, 1], // Custom bezier for realistic "spin down"
                    type: "tween"
                }
            })

            setRotation(targetRotation)
            setLastWin(targetSegment)
            setCanSpin(false)
            setNextSpinTime(Date.now() + 24 * 60 * 60 * 1000) // 24h from now approx
            setIsSpinning(false)
            setShowWinDialog(true)

            if (winningValue > 0) {
                triggerConfetti()
                // Update Global User Points
                window.dispatchEvent(new CustomEvent('kojo:points:earned', { detail: { points: winningValue, source: 'spin' } }))
                window.dispatchEvent(new Event('kojo:user:update'))
            }

        } catch (error) {
            console.error('Spin error', error)
            setIsSpinning(false)
            alert('Something went wrong. Please try again.')
        }
    }

    const triggerConfetti = () => {
        // Use safe confetti wrapper that handles Android compatibility
        celebrationConfetti()
    }

    // Timer Component for cooldown
    function TimerDisplay({ targetTime }: { targetTime: number }) {
        const [timeLeft, setTimeLeft] = useState('')

        useEffect(() => {
            const interval = setInterval(() => {
                const now = Date.now()
                const diff = targetTime - now

                if (diff <= 0) {
                    setCanSpin(true)
                    setNextSpinTime(null)
                    clearInterval(interval)
                    return
                }

                const h = Math.floor(diff / (1000 * 60 * 60))
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const s = Math.floor((diff % (1000 * 60)) / 1000)

                setTimeLeft(`${h}h ${m}m ${s}s`)
            }, 1000)

            return () => clearInterval(interval)
        }, [targetTime])

        return <span className="font-mono">{timeLeft}</span>
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <Card className="bg-gradient-to-b from-purple-900 via-indigo-900 to-black border-purple-500/30 text-white overflow-hidden shadow-2xl">
                    <CardHeader className="text-center relative z-10">
                        <div className="absolute top-2 right-2 z-50">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full bg-white/20 hover:bg-white/40 text-white w-10 h-10 border border-white/30 shadow-lg transition-all duration-200 hover:scale-110 focus:ring-2 focus:ring-white/50"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </Button>
                        </div>
                        <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
                            <Sparkles className="h-6 w-6 text-yellow-400" />
                            Daily Lucky Spin
                            <Sparkles className="h-6 w-6 text-yellow-400" />
                        </CardTitle>
                        <CardDescription className="text-purple-200">
                            Spin every 24 hours for free rewards!
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col items-center justify-center p-6 relative">
                        {/* Wheel Container */}
                        <div className="relative w-72 h-72 md:w-80 md:h-80 mb-8">
                            {/* Pointer */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-8 h-10">
                                <motion.div
                                    className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-yellow-400 drop-shadow-lg"
                                    animate={isSpinning ? { rotate: [-5, 5, -5] } : {}}
                                    transition={{ repeat: Infinity, duration: 0.2 }}
                                />
                            </div>

                            {/* The Wheel */}
                            <motion.div
                                ref={wheelRef}
                                className="w-full h-full rounded-full border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] overflow-hidden relative bg-white"
                                animate={controls}
                                style={{ rotate: 0 }}
                            >
                                {SEGMENTS.map((segment, index) => {
                                    const rotation = index * (360 / SEGMENTS.length)
                                    return (
                                        <div
                                            key={segment.id}
                                            className="absolute top-0 left-1/2 w-1/2 h-full -translate-x-1/2 origin-center"
                                            style={{
                                                transform: `rotate(${rotation}deg)`,
                                                // Using clip-path to create wedges is complex, CSS conic-gradient is easier for background
                                                // but for content (text), we need rotation.
                                            }}
                                        >
                                            {/* Wedge Background */}
                                            <div
                                                className="absolute top-0 left-0 w-full h-[50%] origin-bottom-center"
                                                style={{
                                                    backgroundColor: segment.color,
                                                    height: '50%',
                                                    transformOrigin: '50% 100%',
                                                    // This part is visual trickery, simplified for React:
                                                    // In reality, building a CSS wheel requires simpler geometry or SVG
                                                }}
                                            />
                                            {/* Text Content */}
                                            <div
                                                className="absolute top-[20%] left-1/2 -translate-x-1/2 text-white font-bold text-sm md:text-base flex flex-col items-center gap-1 shadow-black/50 drop-shadow-md"
                                                style={{ zIndex: 10 }}
                                            >
                                                {segment.id === 5 && <Trophy className="h-4 w-4 text-yellow-200" />}
                                                {segment.label}
                                            </div>
                                        </div>
                                    )
                                })}
                                {/* SVG Overlay for better wedge shapes */}
                                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                                    {SEGMENTS.map((segment, index) => {
                                        // 360 / 6 = 60 degrees.
                                        // Sector path
                                        const startAngle = index * 60
                                        const endAngle = (index + 1) * 60
                                        // Convert polar to cartesian
                                        const x1 = 50 + 50 * Math.cos(Math.PI * startAngle / 180)
                                        const y1 = 50 + 50 * Math.sin(Math.PI * startAngle / 180)
                                        const x2 = 50 + 50 * Math.cos(Math.PI * endAngle / 180)
                                        const y2 = 50 + 50 * Math.sin(Math.PI * endAngle / 180)

                                        return (
                                            <path
                                                key={`path-${segment.id}`}
                                                d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                                                fill={segment.color}
                                                stroke="white"
                                                strokeWidth="0.5"
                                            />
                                        )
                                    })}
                                </svg>

                                {/* Inner labels (re-rendered on top of SVG) */}
                                {SEGMENTS.map((segment, index) => {
                                    const angle = (index * 60) + 30 // Center of wedge
                                    return (
                                        <div
                                            key={`label-${segment.id}`}
                                            className="absolute w-full h-full top-0 left-0 flex justify-center pt-4"
                                            style={{ transform: `rotate(${angle}deg)` }}
                                        >
                                            <span className="text-white font-bold text-xs md:text-sm drop-shadow-md z-10 bg-black/10 px-1 rounded transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
                                                {segment.label}
                                            </span>
                                        </div>
                                    )
                                })}

                                {/* Center Cap */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full shadow-inner z-30 flex items-center justify-center border-2 border-white">
                                    <Star className="h-4 w-4 md:h-6 md:w-6 text-white fill-white" />
                                </div>
                            </motion.div>
                        </div>

                        {/* Spin Button */}
                        <div className="space-y-4 text-center w-full">
                            {!canSpin && !hasBonusSpin && nextSpinTime ? (
                                <div className="space-y-4">
                                    <div className="bg-purple-950/50 rounded-xl p-4 border border-purple-500/20">
                                        <p className="text-purple-300 text-sm mb-1 uppercase tracking-wider">Next Spin In</p>
                                        <div className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
                                            <Clock className="h-5 w-5 text-purple-400" />
                                            <TimerDisplay targetTime={nextSpinTime} />
                                        </div>
                                    </div>

                                    {/* Watch Ad for Bonus Spin */}
                                    {!bonusSpinUsedToday && (
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Button
                                                onClick={async () => {
                                                    // Check if on native platform
                                                    const isNative = typeof window !== 'undefined' && (
                                                        ((window as any)?.Capacitor?.isNativePlatform?.() === true) ||
                                                        (((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web'))
                                                    )

                                                    if (!isNative) {
                                                        alert('Bonus spin ads are only available in the Kojomoney mobile app.')
                                                        return
                                                    }

                                                    setIsLoadingAd(true)
                                                    try {
                                                        const reward = await AdService.showRewarded()
                                                        if (reward) {
                                                            setHasBonusSpin(true)
                                                            setCanSpin(true)
                                                        }
                                                    } catch (err) {
                                                        console.error('Error showing ad:', err)
                                                    } finally {
                                                        setIsLoadingAd(false)
                                                    }
                                                }}
                                                disabled={isLoadingAd}
                                                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Play className="h-5 w-5" />
                                                {isLoadingAd ? 'Loading Ad...' : '🎁 Watch Ad for FREE Spin'}
                                            </Button>
                                            <p className="text-xs text-green-300/80 mt-1">
                                                Get 1 bonus spin by watching a short video
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            ) : (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        onClick={async () => {
                                            await spinWheel()
                                            // If this was a bonus spin, mark it as used
                                            if (hasBonusSpin) {
                                                setHasBonusSpin(false)
                                                setBonusSpinUsedToday(true)
                                            }
                                        }}
                                        disabled={isSpinning || (!canSpin && !hasBonusSpin)}
                                        className="w-full h-14 text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-600 hover:from-yellow-500 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20 border-b-4 border-amber-800"
                                    >
                                        {isSpinning ? 'SPINNING...' : hasBonusSpin ? '🎁 BONUS SPIN!' : 'SPIN NOW!'}
                                    </Button>
                                </motion.div>
                            )}

                            <p className="text-xs text-purple-300/60">
                                100% Free Daily Reward • Sponsored by KojoMoney
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Win Dialog */}
            <Dialog open={showWinDialog} onOpenChange={setShowWinDialog}>
                <DialogContent className="sm:max-w-md text-center bg-white dark:bg-zinc-900 border-none">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-extrabold flex flex-col items-center gap-2 text-green-600">
                            {lastWin?.value === 0 ? 'Oh no!' : 'CONGRATULATIONS!'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-300">
                            {lastWin?.value === 0 ? 'Better luck next time!' : 'You verified a daily win!'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 flex flex-col items-center justify-center">
                        {lastWin?.value === 0 ? (
                            <div className="text-6xl mb-4">😢</div>
                        ) : (
                            <>
                                <div className="text-6xl mb-4">🎁</div>
                                <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-500 to-emerald-700">
                                    +{lastWin?.value}
                                </h3>
                                <p className="font-bold text-gray-500 mt-2 uppercase tracking-widest text-sm">Points Added</p>
                            </>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-center">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                            onClick={() => {
                                setShowWinDialog(false)
                                // If they won something, ask for a review!
                                if (lastWin && lastWin.value > 0) {
                                    setShowReviewPrompt(true)
                                } else {
                                    onClose && onClose()
                                }
                            }}
                        >
                            CLAIM REWARD
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReviewPrompt
                isOpen={showReviewPrompt}
                onClose={() => {
                    setShowReviewPrompt(false)
                    onClose && onClose()
                }}
                triggerSource="spin"
            />
        </div>
    )
}
