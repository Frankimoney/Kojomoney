'use client'

import { useState, useEffect, useRef } from 'react'
import { apiCall } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import {
    Send as TelegramIcon,
    Music2,
    Camera,
    Upload,
    CheckCircle2,
    Clock,
    XCircle,
    ExternalLink,
    Loader2,
    Image as ImageIcon,
    AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SocialMission {
    id: string
    title: string
    socialType: 'telegram' | 'tiktok' | 'twitter' | 'instagram'
    channelName: string
    socialUrl: string
    payout: number
    description: string
    userStatus: 'available' | 'pending' | 'approved' | 'rejected'
}

interface SocialFollowMissionsProps {
    userId: string
    onPointsEarned?: (points: number) => void
}

export default function SocialFollowMissions({ userId, onPointsEarned }: SocialFollowMissionsProps) {
    const [missions, setMissions] = useState<SocialMission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedMission, setSelectedMission] = useState<SocialMission | null>(null)
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadMissions()
    }, [userId])

    const loadMissions = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await apiCall(`/api/social-missions?userId=${userId}`)
            const data = await res.json()
            if (data.missions) {
                setMissions(data.missions)
            }
        } catch (err) {
            console.error('Failed to load social missions:', err)
            setError('Failed to load missions')
        } finally {
            setIsLoading(false)
        }
    }

    const getSocialIcon = (type: string) => {
        switch (type) {
            case 'telegram':
                return <TelegramIcon className="h-6 w-6 text-sky-500" />
            case 'tiktok':
                return <Music2 className="h-6 w-6 text-gray-900 dark:text-white" />
            case 'twitter':
                return <span className="text-xl">𝕏</span>
            case 'instagram':
                return <span className="text-xl">📸</span>
            default:
                return <ExternalLink className="h-6 w-6" />
        }
    }

    const getSocialColor = (type: string) => {
        switch (type) {
            case 'telegram':
                return 'from-sky-400 to-blue-500'
            case 'tiktok':
                return 'from-gray-900 to-gray-700 dark:from-white dark:to-gray-300'
            case 'twitter':
                return 'from-gray-800 to-black'
            case 'instagram':
                return 'from-purple-500 via-pink-500 to-orange-400'
            default:
                return 'from-gray-500 to-gray-600'
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        <Clock className="h-3 w-3 mr-1" /> Pending Review
                    </Badge>
                )
            case 'approved':
                return (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                )
            case 'rejected':
                return (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        <XCircle className="h-3 w-3 mr-1" /> Rejected - Retry
                    </Badge>
                )
            default:
                return null
        }
    }

    const handleFollowClick = (mission: SocialMission) => {
        // Open social link in new tab/browser
        if (typeof window !== 'undefined') {
            window.open(mission.socialUrl, '_blank')
        }
        setSelectedMission(mission)
    }

    const handleUploadClick = (mission: SocialMission) => {
        setSelectedMission(mission)
        setShowUploadDialog(true)
        setPreviewImage(null)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file')
                return
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image must be less than 5MB')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                setPreviewImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmitProof = async () => {
        if (!selectedMission || !previewImage) return

        setUploading(true)
        setError(null)

        try {
            const res = await apiCall('/api/submit-social-proof', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    missionId: selectedMission.id,
                    screenshotData: previewImage,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit proof')
            }

            // Update local mission status
            setMissions(prev =>
                prev.map(m =>
                    m.id === selectedMission.id
                        ? { ...m, userStatus: 'pending' as const }
                        : m
                )
            )

            setShowUploadDialog(false)
            setPreviewImage(null)
            setSelectedMission(null)

        } catch (err: any) {
            setError(err.message || 'Failed to submit proof')
        } finally {
            setUploading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-32" />
                </div>
                {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        )
    }

    if (missions.length === 0) {
        return null // Don't show section if no missions
    }

    return (
        <div className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TelegramIcon className="h-5 w-5 text-sky-500" />
                    Follow & Earn
                </h3>
                <Badge variant="outline" className="text-xs">
                    {missions.filter(m => m.userStatus === 'available' || m.userStatus === 'rejected').length} Available
                </Badge>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => setError(null)}
                        className="text-red-600 p-0 h-auto ml-auto"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Mission Cards */}
            <div className="space-y-3">
                <AnimatePresence>
                    {missions.map((mission, idx) => (
                        <motion.div
                            key={mission.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className={`overflow-hidden ${mission.userStatus === 'approved' ? 'opacity-60' : ''
                                }`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* Social Icon */}
                                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getSocialColor(mission.socialType)} flex items-center justify-center shrink-0`}>
                                            <div className="text-white">
                                                {getSocialIcon(mission.socialType)}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-semibold text-sm line-clamp-1">
                                                        {mission.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {mission.channelName || mission.socialType}
                                                    </p>
                                                </div>
                                                <span className="font-bold text-green-600 text-sm whitespace-nowrap">
                                                    +{mission.payout} pts
                                                </span>
                                            </div>

                                            {/* Status or Actions */}
                                            <div className="mt-2 flex items-center gap-2">
                                                {mission.userStatus === 'available' || mission.userStatus === 'rejected' ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs"
                                                            onClick={() => handleFollowClick(mission)}
                                                        >
                                                            <ExternalLink className="h-3 w-3 mr-1" />
                                                            Follow
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                                            onClick={() => handleUploadClick(mission)}
                                                        >
                                                            <Camera className="h-3 w-3 mr-1" />
                                                            Upload Proof
                                                        </Button>
                                                    </>
                                                ) : (
                                                    getStatusBadge(mission.userStatus)
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-purple-500" />
                            Upload Screenshot Proof
                        </DialogTitle>
                        <DialogDescription>
                            Take a screenshot showing you followed{' '}
                            <span className="font-semibold">{selectedMission?.channelName}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Preview Area */}
                        <div
                            className="relative border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 min-h-[200px] flex items-center justify-center cursor-pointer hover:border-purple-500/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewImage ? (
                                <img
                                    src={previewImage}
                                    alt="Screenshot preview"
                                    className="max-h-[250px] rounded-lg object-contain"
                                />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Click to select screenshot</p>
                                    <p className="text-xs opacity-70">PNG, JPG up to 5MB</p>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Instructions */}
                        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                            <p className="font-medium">📱 How to take a screenshot:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                <li>Open the {selectedMission?.socialType} app</li>
                                <li>Go to the channel/profile page</li>
                                <li>Take a screenshot showing you followed</li>
                                <li>Upload it here for verification</li>
                            </ul>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowUploadDialog(false)
                                setPreviewImage(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!previewImage || uploading}
                            onClick={handleSubmitProof}
                            className="bg-gradient-to-r from-purple-500 to-pink-500"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Submit for Review
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
