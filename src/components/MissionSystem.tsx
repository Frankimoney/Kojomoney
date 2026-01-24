'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Camera, Upload, CheckCircle2, Clock, MapPin, Share2, Timer, ChevronRight, ArrowLeft, Loader2, AlertCircle, ExternalLink, Info, Shield, FileText, Gift } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mission, MissionProgress } from '@/lib/db-schema'
import { useBannerAd } from '@/hooks/useAds'
import {
    fetchMissions,
    updateMissionProgress,
    trackAffiliateClick,
    getAffiliateDisclosure,
    getFTCComplianceWarning,
    MissionWithProgress
} from '@/services/missionService'
import SocialFollowMissions from './SocialFollowMissions'

interface MissionSystemProps {
    userId?: string
    onClose?: () => void
}

export default function MissionSystem({ userId, onClose }: MissionSystemProps) {
    const [missions, setMissions] = useState<MissionWithProgress[]>([])
    const [selectedMission, setSelectedMission] = useState<MissionWithProgress | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [successAnim, setSuccessAnim] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showAffiliateDisclosure, setShowAffiliateDisclosure] = useState(false)
    const [pendingAffiliateUrl, setPendingAffiliateUrl] = useState<string | null>(null)
    const [showFTCWarning, setShowFTCWarning] = useState(false)

    // Show banner ad at bottom
    useBannerAd('bottom', true)

    useEffect(() => {
        loadMissions()
    }, [userId])

    const loadMissions = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetchMissions(userId || 'anonymous')
            setMissions(response.missions)
        } catch (err) {
            console.error('Failed to load missions:', err)
            setError('Failed to load missions. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle affiliate link click with proper disclosure
    const handleAffiliateClick = async (mission: MissionWithProgress, affiliateUrl: string) => {
        // Show affiliate disclosure first
        setSelectedMission(mission)
        setPendingAffiliateUrl(affiliateUrl)
        setShowAffiliateDisclosure(true)
    }

    const confirmAffiliateClick = async () => {
        if (!selectedMission || !pendingAffiliateUrl || !userId) return

        // Track the click for compliance
        await trackAffiliateClick(userId, selectedMission.id, pendingAffiliateUrl)

        // Start mission progress if not already started
        if (selectedMission.status === 'available') {
            await updateMissionProgress({
                userId,
                missionId: selectedMission.id,
                action: 'start',
            })
        }

        const finalUrl = pendingAffiliateUrl
            .replace('{userId}', userId)
            .replace('{sub_id}', userId)
            .replace('{sub_id_1}', userId) // Supports Kiwiwall format
            .replace('{uid}', userId);

        // Open the affiliate link
        if (typeof window !== 'undefined') {
            // Check if native app
            if ((window as any).Capacitor?.isNativePlatform?.()) {
                try {
                    const { Browser } = await import('@capacitor/browser')
                    await Browser.open({ url: finalUrl })
                } catch (e) {
                    window.open(finalUrl, '_blank')
                }
            } else {
                window.open(finalUrl, '_blank')
            }
        }

        setShowAffiliateDisclosure(false)
        setPendingAffiliateUrl(null)

        // Refresh missions to show updated progress
        loadMissions()
    }

    // Handle proof upload with FTC warning for reviews
    const handleUploadProof = async () => {
        if (!selectedMission || !userId) return

        // Show FTC warning for review missions
        if (selectedMission.type === 'review' && !showFTCWarning) {
            setShowFTCWarning(true)
            return
        }

        setShowFTCWarning(false)
        setUploading(true)

        // Check for Capacitor Camera
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()

        try {
            let proofUrl = ''

            if (isNative) {
                const { Camera, CameraResultType } = await import('@capacitor/camera')
                const image = await Camera.getPhoto({
                    quality: 90,
                    allowEditing: false,
                    resultType: CameraResultType.Base64
                })
                // In production, upload to storage and get URL
                proofUrl = `data:image/jpeg;base64,${image.base64String}`
                await new Promise(r => setTimeout(r, 2000))
            } else {
                // Web fallback - simulate upload
                await new Promise(r => setTimeout(r, 1500))
                proofUrl = 'https://example.com/proof-' + Date.now()
            }

            setUploading(false)

            // Submit proof
            await updateMissionProgress({
                userId,
                missionId: selectedMission.id,
                action: 'submit_proof',
                proofUrl,
            })

            // Update local state
            const updated = { ...selectedMission, status: 'reviewing' as const }
            setMissions(missions.map(m => m.id === selectedMission.id ? updated : m))
            setSelectedMission(updated)

            // Simulate verification
            setVerifying(true)
            setTimeout(async () => {
                setVerifying(false)
                setSuccessAnim(true)

                // Complete the mission
                const result = await updateMissionProgress({
                    userId,
                    missionId: selectedMission.id,
                    action: 'complete',
                })

                if (result.success) {
                    // Update local state
                    const completed = { ...selectedMission, status: 'completed' as const }
                    setMissions(missions.map(m => m.id === selectedMission.id ? completed : m))
                    setSelectedMission(completed)

                    // Dispatch points event
                    if (typeof window !== 'undefined' && result.pointsEarned) {
                        window.dispatchEvent(new CustomEvent('kojo:points:earned', {
                            detail: { source: 'mission', points: result.pointsEarned }
                        }))
                    }
                }
            }, 3000)
        } catch (e) {
            setUploading(false)
            setError('Upload cancelled or failed. Please try again.')
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'social': return <Share2 className="h-5 w-5 text-blue-500" />
            case 'review': return <FileText className="h-5 w-5 text-green-500" />
            case 'referral': return <Gift className="h-5 w-5 text-purple-500" />
            case 'install': return <CheckCircle2 className="h-5 w-5 text-orange-500" />
            default: return <Clock className="h-5 w-5 text-gray-500" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'border-l-green-500'
            case 'reviewing': return 'border-l-yellow-500'
            case 'in_progress': return 'border-l-blue-500'
            default: return 'border-l-orange-500'
        }
    }

    const formatExpiresIn = (expiresAt: number | undefined) => {
        if (!expiresAt) return null
        const diff = expiresAt - Date.now()
        if (diff <= 0) return 'Expired'
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)
        if (days > 0) return `${days}d`
        return `${hours}h`
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-900/50 pb-20 relative font-sans">

            {/* AFFILIATE DISCLOSURE DIALOG */}
            <AlertDialog open={showAffiliateDisclosure} onOpenChange={setShowAffiliateDisclosure}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-500" />
                            Affiliate Link Disclosure
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>{selectedMission ? getAffiliateDisclosure(selectedMission.type) : ''}</p>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                                <strong>What this means:</strong> This is a partner or affiliate link. When you complete the required action, both you and KojoMoney may receive compensation.
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowAffiliateDisclosure(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmAffiliateClick} className="bg-blue-600 hover:bg-blue-700">
                            I Understand, Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* FTC COMPLIANCE WARNING DIALOG */}
            <AlertDialog open={showFTCWarning} onOpenChange={setShowFTCWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-yellow-500" />
                            Important: FTC Disclosure Requirement
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>{getFTCComplianceWarning()}</p>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-xs text-yellow-800 dark:text-yellow-200 space-y-2">
                                <p><strong>Required disclosure language:</strong></p>
                                <p className="italic">"I received compensation for this review through KojoMoney."</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowFTCWarning(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUploadProof} className="bg-yellow-600 hover:bg-yellow-700">
                            I Will Disclose, Continue
                        </AlertDialogAction>
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
                        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                            Quick Missions
                        </h1>
                    </div>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Affiliate Compliant
                    </Badge>
                </div>

                {/* Affiliate Notice Banner */}
                <div className="px-4 pb-3">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Some missions contain affiliate links. We may earn a commission when you complete actions.</span>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                        <Button variant="link" size="sm" onClick={loadMissions} className="text-red-600 p-0 h-auto ml-auto">
                            Retry
                        </Button>
                    </div>
                </div>
            )}

            {/* MISSION LIST */}
            {!selectedMission && (
                <div className="p-4 space-y-4 max-w-md mx-auto">
                    {/* Social Follow Missions - Featured at top */}
                    {userId && (
                        <SocialFollowMissions userId={userId} />
                    )}

                    {/* Divider */}
                    {!isLoading && missions.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">Other Missions</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                    )}

                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <Card key={i} className="overflow-hidden border-l-4 border-l-gray-200">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div>
                                                <Skeleton className="h-5 w-32 mb-1" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-6 w-16" />
                                    </div>
                                    <Skeleton className="h-2 w-full mt-3" />
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        missions.map((mission, idx) => (
                            <motion.div
                                key={mission.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card
                                    className={`overflow-hidden cursor-pointer hover:shadow-md transition-all border-l-4 ${getStatusColor(mission.status)} ${mission.status === 'completed' ? 'opacity-80' : ''}`}
                                    onClick={() => setSelectedMission(mission)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-muted rounded-full">
                                                    {getIcon(mission.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base flex items-center gap-1">
                                                        {mission.title}
                                                        {mission.type !== 'referral' && (
                                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] h-5">{mission.difficulty}</Badge>
                                                        <Badge variant="secondary" className="text-[10px] h-5 capitalize">{mission.type}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-lg text-green-600 dark:text-green-400">+{mission.payout}</span>
                                                {mission.expiresAt && (
                                                    <div className="flex items-center justify-end text-xs text-red-500 mt-1">
                                                        <Timer className="h-3 w-3 mr-1" /> {formatExpiresIn(mission.expiresAt)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                <span>Progress</span>
                                                <span>
                                                    {mission.status === 'completed' ? '100%' :
                                                        mission.status === 'reviewing' ? '90%' :
                                                            `${mission.completedSteps.length}/${mission.steps.length} Steps`}
                                                </span>
                                            </div>
                                            <Progress
                                                value={
                                                    mission.status === 'completed' ? 100 :
                                                        mission.status === 'reviewing' ? 90 :
                                                            (mission.completedSteps.length / mission.steps.length) * 100
                                                }
                                                className="h-1.5"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}

                    {!isLoading && missions.length === 0 && (
                        <div className="text-center py-10 opacity-50 space-y-3">
                            <Gift className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p>No missions available right now.</p>
                            <Button variant="outline" onClick={loadMissions}>Check Again</Button>
                        </div>
                    )}
                </div>
            )}

            {/* MISSION DETAIL VIEW */}
            <AnimatePresence>
                {selectedMission && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="fixed inset-0 z-20 bg-background flex flex-col"
                    >
                        {/* Detail Header */}
                        <div className="border-b p-4 flex items-center space-x-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                            <Button size="icon" variant="ghost" onClick={() => { setSelectedMission(null); setSuccessAnim(false); }}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex-1">
                                <h2 className="font-bold text-lg leading-tight">{selectedMission.title}</h2>
                                <p className="text-xs text-muted-foreground">{selectedMission.type.toUpperCase()} • {selectedMission.difficulty}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-md mx-auto w-full">
                            {/* Success Animation */}
                            {successAnim && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-green-100 dark:bg-green-900/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 border border-green-200 dark:border-green-800"
                                >
                                    <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                                        <CheckCircle2 className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-green-800 dark:text-green-100">Mission Complete!</h3>
                                        <p className="text-green-600 dark:text-green-300">You earned {selectedMission.payout} points.</p>
                                    </div>
                                    <Button onClick={() => { setSuccessAnim(false); setSelectedMission(null); loadMissions(); }} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                        Collect Reward
                                    </Button>
                                </motion.div>
                            )}

                            {!successAnim && (
                                <>
                                    {/* Affiliate Disclosure Card */}
                                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                                        <CardContent className="p-3 flex items-start gap-2">
                                            <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                                {getAffiliateDisclosure(selectedMission.type)}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Description Card */}
                                    <Card>
                                        <CardContent className="p-4 space-y-4">
                                            <p className="text-sm text-muted-foreground">{selectedMission.description}</p>
                                            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                                <div className="text-center flex-1 border-r border-border">
                                                    <p className="text-xs text-muted-foreground">Reward</p>
                                                    <p className="font-bold text-green-600">{selectedMission.payout} pts</p>
                                                </div>
                                                <div className="text-center flex-1">
                                                    <p className="text-xs text-muted-foreground">Time</p>
                                                    <p className="font-bold">5 mins</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Timeline Steps */}
                                    <div className="space-y-6 relative pl-4 border-l-2 border-muted ml-2">
                                        {selectedMission.steps.map((step, idx) => {
                                            const isCompleted = selectedMission.completedSteps.includes(step.id) || selectedMission.status === 'completed'
                                            return (
                                                <div key={step.id} className="relative pl-6">
                                                    <div className={`absolute -left-[29px] top-0 h-4 w-4 rounded-full border-2 ${isCompleted ? 'bg-green-500 border-green-500' : 'bg-background border-muted-foreground'}`}>
                                                        {isCompleted && <CheckCircle2 className="h-3 w-3 text-white absolute top-[-1px] left-[-1px]" />}
                                                    </div>
                                                    <p className={`text-sm ${isCompleted ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                                                        {step.instruction}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Review Status */}
                                    {selectedMission.status === 'reviewing' && (
                                        <Card className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                                            <CardContent className="p-4 flex items-center space-x-4">
                                                {verifying ? <Loader2 className="h-8 w-8 animate-spin text-yellow-600" /> : <Clock className="h-8 w-8 text-yellow-600" />}
                                                <div>
                                                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-100">
                                                        {verifying ? 'Verifying...' : 'Submission Under Review'}
                                                    </h4>
                                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                                        We are checking your proof. This usually takes less than a minute.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Action Buttons */}
                                    {selectedMission.status !== 'completed' && selectedMission.status !== 'reviewing' && (
                                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t space-y-2">
                                            {/* Open Affiliate Link Button */}
                                            {selectedMission.affiliateUrl && (
                                                <Button
                                                    className="w-full h-12 text-base shadow-lg bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleAffiliateClick(selectedMission, selectedMission.affiliateUrl!)}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" /> Open Mission Link
                                                </Button>
                                            )}

                                            {/* Upload Proof Button */}
                                            {selectedMission.proofRequired && (
                                                <Button
                                                    className="w-full h-12 text-base"
                                                    variant="outline"
                                                    onClick={handleUploadProof}
                                                    disabled={uploading}
                                                >
                                                    {uploading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="h-4 w-4 mr-2" /> Upload Proof Screenshot
                                                        </>
                                                    )}
                                                </Button>
                                            )}

                                            {/* Auto-complete for non-proof missions */}
                                            {!selectedMission.proofRequired && (
                                                <Button
                                                    className="w-full h-12 text-base shadow-lg bg-green-600 hover:bg-green-700"
                                                    onClick={async () => {
                                                        if (!userId) return
                                                        const result = await updateMissionProgress({
                                                            userId,
                                                            missionId: selectedMission.id,
                                                            action: 'complete',
                                                        })
                                                        if (result.success) {
                                                            setSuccessAnim(true)
                                                        }
                                                    }}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Done
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
