'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Camera, Upload, CheckCircle2, Clock, MapPin, Share2, Timer, ChevronRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall } from '@/lib/api-client'
import dynamic from 'next/dynamic'

// Interfaces
interface MissionStep {
    id: string
    instruction: string
    isCompleted: boolean
}

interface Mission {
    id: string
    title: string
    description: string
    payout: number
    type: 'social' | 'install' | 'review' | 'referral'
    difficulty: 'Easy' | 'Medium' | 'Hard'
    expiresIn?: string // roughly '2 days', '5 hours'
    steps: MissionStep[]
    status: 'available' | 'in_progress' | 'reviewing' | 'completed'
    proofRequired: boolean
    icon?: any
}

// Mock Data
const MOCK_MISSIONS: Mission[] = [
    {
        id: 'm1',
        title: 'Follow us on Twitter',
        description: 'Follow our official account and retweet the pinned post.',
        payout: 200,
        type: 'social',
        difficulty: 'Easy',
        status: 'available',
        proofRequired: true,
        steps: [
            { id: 's1', instruction: 'Open Twitter/X app', isCompleted: false },
            { id: 's2', instruction: 'Follow @KojoMoneyApp', isCompleted: false },
            { id: 's3', instruction: 'Retweet pinned post', isCompleted: false },
            { id: 's4', instruction: 'Take a screenshot of your profile following us', isCompleted: false }
        ]
    },
    {
        id: 'm2',
        title: 'Post a Trustpilot Review',
        description: 'Share your honest experience with KojoMoney.',
        payout: 1000,
        type: 'review',
        difficulty: 'Medium',
        expiresIn: '48h',
        status: 'available',
        proofRequired: true,
        steps: [
            { id: 's1', instruction: 'Go to Trustpilot page', isCompleted: false },
            { id: 's2', instruction: 'Write a review (min 20 words)', isCompleted: false },
            { id: 's3', instruction: 'Wait for review to be published', isCompleted: false },
            { id: 's4', instruction: 'Upload screenshot of published review', isCompleted: false }
        ]
    },
    {
        id: 'm3',
        title: 'Invite 3 Friends',
        description: 'Get 3 friends to sign up using your referral code.',
        payout: 1500,
        type: 'referral',
        difficulty: 'Hard',
        expiresIn: '7d',
        status: 'in_progress',
        proofRequired: false, // Auto-tracked
        steps: [
            { id: 's1', instruction: 'Share your referral link', isCompleted: true },
            { id: 's2', instruction: 'Friend 1 signs up', isCompleted: true },
            { id: 's3', instruction: 'Friend 2 signs up', isCompleted: false },
            { id: 's4', instruction: 'Friend 3 signs up', isCompleted: false }
        ]
    },
    {
        id: 'm4',
        title: 'Join Telegram Channel',
        description: 'Join our community for daily codes and updates.',
        payout: 300,
        type: 'social',
        difficulty: 'Easy',
        status: 'available',
        proofRequired: true,
        steps: [
            { id: 's1', instruction: 'Open Telegram', isCompleted: false },
            { id: 's2', instruction: 'Join channel', isCompleted: false },
            { id: 's3', instruction: 'Upload proof', isCompleted: false }
        ]
    }
]

interface MissionSystemProps {
    userId?: string
    onClose?: () => void
}

export default function MissionSystem({ userId, onClose }: MissionSystemProps) {
    const [missions, setMissions] = useState<Mission[]>(MOCK_MISSIONS)
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
    const [uploading, setUploading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [successAnim, setSuccessAnim] = useState(false)

    // Simulate Native Camera/File Picker
    const handleUploadProof = async () => {
        setUploading(true)

        // Check for Capacitor Camera
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()

        try {
            if (isNative) {
                const { Camera, CameraResultType } = await import('@capacitor/camera')
                const image = await Camera.getPhoto({
                    quality: 90,
                    allowEditing: false,
                    resultType: CameraResultType.Base64
                })
                // Simulate upload delay
                await new Promise(r => setTimeout(r, 2000))
            } else {
                // Web fallback mock
                await new Promise(r => setTimeout(r, 1500))
            }

            setUploading(false)
            // Move to reviewing state
            if (selectedMission) {
                const updated = { ...selectedMission, status: 'reviewing' as const }
                setMissions(missions.map(m => m.id === selectedMission.id ? updated : m))
                setSelectedMission(updated)

                // Simulate backend verification polling
                setVerifying(true)
                setTimeout(() => {
                    setVerifying(false)
                    setSuccessAnim(true)
                    completeMission(updated.id)
                }, 3000)
            }
        } catch (e) {
            setUploading(false)
            alert('Upload cancelled or failed.')
        }
    }

    const completeMission = (id: string) => {
        const updated = missions.map(m => {
            if (m.id === id) {
                return {
                    ...m,
                    status: 'completed' as const,
                    steps: m.steps.map(s => ({ ...s, isCompleted: true }))
                }
            }
            return m
        })
        setMissions(updated)
        // Also update selected view if open
        const completed = updated.find(m => m.id === id)
        if (completed) setSelectedMission(completed)

        // Mock Credit
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kojo:points:earned', {
                detail: { source: 'mission', points: completed?.payout || 0 }
            }))
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'social': return <Share2 className="h-5 w-5 text-blue-500" />
            case 'review': return <MapPin className="h-5 w-5 text-green-500" />
            case 'referral': return <CheckCircle2 className="h-5 w-5 text-purple-500" />
            default: return <Clock className="h-5 w-5 text-orange-500" />
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
                        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                            Mission Board
                        </h1>
                    </div>
                </div>
            </div>

            {/* MISSION LIST */}
            {!selectedMission && (
                <div className="p-4 space-y-4 max-w-md mx-auto">
                    {missions.map((mission, idx) => (
                        <motion.div
                            key={mission.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card
                                className={`overflow-hidden cursor-pointer hover:shadow-md transition-all border-l-4 ${mission.status === 'completed' ? 'border-l-green-500 opacity-80' :
                                        mission.status === 'reviewing' ? 'border-l-yellow-500' :
                                            mission.status === 'in_progress' ? 'border-l-blue-500' : 'border-l-orange-500'
                                    }`}
                                onClick={() => setSelectedMission(mission)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-muted rounded-full">
                                                {getIcon(mission.type)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-base">{mission.title}</h3>
                                                <Badge variant="outline" className="text-[10px] h-5">{mission.difficulty}</Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-lg text-green-600 dark:text-green-400">+{mission.payout}</span>
                                            {mission.expiresIn && (
                                                <div className="flex items-center justify-end text-xs text-red-500 mt-1">
                                                    <Timer className="h-3 w-3 mr-1" /> {mission.expiresIn}
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
                                                        mission.steps.filter(s => s.isCompleted).length}/{mission.steps.length} Steps
                                            </span>
                                        </div>
                                        <Progress
                                            value={
                                                mission.status === 'completed' ? 100 :
                                                    mission.status === 'reviewing' ? 90 :
                                                        (mission.steps.filter(s => s.isCompleted).length / mission.steps.length) * 100
                                            }
                                            className="h-1.5"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
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
                            <Button size="icon" variant="ghost" onClick={() => setSelectedMission(null)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
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
                                    <Button onClick={() => { setSuccessAnim(false); setSelectedMission(null); }} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                        Collect Reward
                                    </Button>
                                </motion.div>
                            )}

                            {!successAnim && (
                                <>
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
                                        {selectedMission.steps.map((step, idx) => (
                                            <div key={step.id} className="relative pl-6">
                                                <div className={`absolute -left-[29px] top-0 h-4 w-4 rounded-full border-2 ${step.isCompleted || selectedMission.status === 'completed' ? 'bg-green-500 border-green-500' : 'bg-background border-muted-foreground'
                                                    }`}>
                                                    {(step.isCompleted || selectedMission.status === 'completed') && <CheckCircle2 className="h-3 w-3 text-white absolute top-[-1px] left-[-1px]" />}
                                                </div>
                                                <p className={`text-sm ${step.isCompleted ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                                                    {step.instruction}
                                                </p>
                                            </div>
                                        ))}
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
                                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
                                            {selectedMission.proofRequired ? (
                                                <Button className="w-full h-12 text-base shadow-lg" onClick={handleUploadProof} disabled={uploading}>
                                                    {uploading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="h-4 w-4 mr-2" /> Upload Proof
                                                        </>
                                                    )}
                                                </Button>
                                            ) : (
                                                <Button className="w-full h-12 text-base shadow-lg bg-green-600 hover:bg-green-700">
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
