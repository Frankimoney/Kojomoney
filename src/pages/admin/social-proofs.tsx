'use client'

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    CheckCircle2,
    XCircle,
    Clock,
    Send as TelegramIcon,
    Music2,
    Image as ImageIcon,
    ArrowLeft,
    Plus,
    Loader2,
    RefreshCw
} from 'lucide-react'

interface SocialProof {
    id: string
    userId: string
    missionId: string
    screenshotUrl: string
    status: 'pending' | 'approved' | 'rejected'
    submittedAt: number
    userName?: string
    userEmail?: string
    missionTitle?: string
    socialType?: string
}

interface SocialMission {
    id: string
    title: string
    socialType: 'telegram' | 'tiktok' | 'twitter' | 'instagram'
    channelName: string
    socialUrl: string
    payout: number
    active: boolean
}

export default function AdminSocialProofsPage() {
    const [activeTab, setActiveTab] = useState<'proofs' | 'missions'>('proofs')
    const [proofs, setProofs] = useState<SocialProof[]>([])
    const [missions, setMissions] = useState<SocialMission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedProof, setSelectedProof] = useState<SocialProof | null>(null)
    const [processing, setProcessing] = useState<string | null>(null)
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
    const [showCreateMission, setShowCreateMission] = useState(false)
    const [newMission, setNewMission] = useState<{
        title: string
        socialType: 'telegram' | 'tiktok' | 'twitter' | 'instagram'
        channelName: string
        socialUrl: string
        payout: number
        notifyUsers: boolean
    }>({
        title: '',
        socialType: 'telegram',
        channelName: '',
        socialUrl: '',
        payout: 500,
        notifyUsers: false
    })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        loadData()
    }, [filter])

    const loadData = async () => {
        setIsLoading(true)
        try {
            // Load proofs
            const proofsRes = await fetch(`/api/admin/social-proofs?status=${filter}`)
            const proofsData = await proofsRes.json()
            setProofs(proofsData.proofs || [])

            // Load missions
            const missionsRes = await fetch('/api/social-missions')
            const missionsData = await missionsRes.json()
            setMissions(missionsData.missions || [])
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleReview = async (proofId: string, action: 'approve' | 'reject') => {
        setProcessing(proofId)
        try {
            const res = await fetch('/api/admin/social-proofs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proofId, action })
            })

            if (res.ok) {
                setProofs(prev => prev.filter(p => p.id !== proofId))
                setSelectedProof(null)
            }
        } catch (err) {
            console.error('Failed to review proof:', err)
        } finally {
            setProcessing(null)
        }
    }

    const handleCreateMission = async () => {
        if (!newMission.title || !newMission.socialUrl) return

        setCreating(true)
        try {
            const res = await fetch('/api/social-missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMission)
            })

            if (res.ok) {
                setShowCreateMission(false)
                setNewMission({ title: '', socialType: 'telegram', channelName: '', socialUrl: '', payout: 500, notifyUsers: false })
                loadData()
            }
        } catch (err) {
            console.error('Failed to create mission:', err)
        } finally {
            setCreating(false)
        }
    }

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getSocialIcon = (type?: string) => {
        switch (type) {
            case 'telegram': return <TelegramIcon className="h-4 w-4 text-sky-500" />
            case 'tiktok': return <Music2 className="h-4 w-4" />
            default: return <ImageIcon className="h-4 w-4" />
        }
    }

    return (
        <>
            <Head>
                <title>Social Proofs - KojoMoney Admin</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <AdminLayout
                title="Social Follow Missions"
                subtitle="Manage Telegram/TikTok missions & review proofs"
                showRefresh={true}
                onRefresh={() => loadData()}
                isLoading={isLoading}
                actions={
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                }
            >
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                        <TabsList>
                            <TabsTrigger value="proofs" className="flex gap-2">
                                <Clock className="h-4 w-4" />
                                Pending Proofs
                                {proofs.length > 0 && (
                                    <Badge variant="destructive" className="h-5 px-1.5">
                                        {proofs.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="missions" className="flex gap-2">
                                <TelegramIcon className="h-4 w-4" />
                                Missions
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {activeTab === 'proofs' && (
                        <>
                            {/* Filter */}
                            <div className="flex gap-2">
                                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                                    <Button
                                        key={f}
                                        variant={filter === f ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilter(f)}
                                        className="capitalize"
                                    >
                                        {f}
                                    </Button>
                                ))}
                            </div>

                            {/* Proofs Grid */}
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-48 rounded-xl" />
                                    ))}
                                </div>
                            ) : proofs.length === 0 ? (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                        <p className="text-muted-foreground">No {filter} proofs</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {proofs.map(proof => (
                                        <Card
                                            key={proof.id}
                                            className="cursor-pointer hover:shadow-lg transition-shadow"
                                            onClick={() => setSelectedProof(proof)}
                                        >
                                            <CardContent className="p-4 space-y-3">
                                                {/* Screenshot Preview */}
                                                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                                    {proof.screenshotUrl ? (
                                                        <img
                                                            src={proof.screenshotUrl}
                                                            alt="Proof"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {getSocialIcon(proof.socialType)}
                                                            <span className="font-medium text-sm truncate">
                                                                {proof.missionTitle || 'Mission'}
                                                            </span>
                                                        </div>
                                                        <Badge variant={proof.status === 'pending' ? 'outline' : proof.status === 'approved' ? 'default' : 'destructive'}>
                                                            {proof.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {proof.userName || proof.userEmail || 'Unknown User'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(proof.submittedAt)}
                                                    </p>
                                                </div>

                                                {/* Quick Actions */}
                                                {proof.status === 'pending' && (
                                                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                                            disabled={processing === proof.id}
                                                            onClick={() => handleReview(proof.id, 'approve')}
                                                        >
                                                            {processing === proof.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="flex-1"
                                                            disabled={processing === proof.id}
                                                            onClick={() => handleReview(proof.id, 'reject')}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'missions' && (
                        <>
                            {/* Create Mission Button */}
                            <div className="flex justify-end">
                                <Button onClick={() => setShowCreateMission(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Social Mission
                                </Button>
                            </div>

                            {/* Missions List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {missions.map(mission => (
                                    <Card key={mission.id}>
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${mission.socialType === 'telegram' ? 'bg-sky-100 text-sky-600' :
                                                mission.socialType === 'tiktok' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-purple-100 text-purple-600'
                                                }`}>
                                                {getSocialIcon(mission.socialType)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{mission.title}</h3>
                                                <p className="text-sm text-muted-foreground">{mission.channelName}</p>
                                                <p className="text-sm text-green-600 font-medium">+{mission.payout} pts</p>
                                            </div>
                                            <Badge variant={mission.active ? 'default' : 'secondary'}>
                                                {mission.active ? 'Active' : 'Paused'}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                ))}

                                {missions.length === 0 && !isLoading && (
                                    <Card className="col-span-full">
                                        <CardContent className="p-8 text-center">
                                            <TelegramIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                            <p className="text-muted-foreground mb-4">No social missions yet</p>
                                            <Button onClick={() => setShowCreateMission(true)}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create First Mission
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </AdminLayout>

            {/* Proof Detail Dialog */}
            <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {getSocialIcon(selectedProof?.socialType)}
                            {selectedProof?.missionTitle}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedProof && (
                        <div className="space-y-4">
                            {/* Image */}
                            <div className="bg-muted rounded-lg overflow-hidden max-h-[400px]">
                                <img
                                    src={selectedProof.screenshotUrl}
                                    alt="Proof screenshot"
                                    className="w-full object-contain"
                                />
                            </div>

                            {/* User Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">User</p>
                                    <p className="font-medium">{selectedProof.userName || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{selectedProof.userEmail}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Submitted</p>
                                    <p className="font-medium">{formatDate(selectedProof.submittedAt)}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            {selectedProof.status === 'pending' && (
                                <div className="flex gap-3">
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        disabled={processing === selectedProof.id}
                                        onClick={() => handleReview(selectedProof.id, 'approve')}
                                    >
                                        {processing === selectedProof.id ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                        )}
                                        Approve & Credit Points
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        disabled={processing === selectedProof.id}
                                        onClick={() => handleReview(selectedProof.id, 'reject')}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Mission Dialog */}
            <Dialog open={showCreateMission} onOpenChange={setShowCreateMission}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Social Follow Mission</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Title</Label>
                            <Input
                                placeholder="Follow our Telegram"
                                value={newMission.title}
                                onChange={e => setNewMission(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div>
                            <Label>Platform</Label>
                            <div className="flex gap-2 mt-2">
                                {(['telegram', 'tiktok', 'twitter', 'instagram'] as const).map(type => (
                                    <Button
                                        key={type}
                                        variant={newMission.socialType === type ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setNewMission(prev => ({ ...prev, socialType: type }))}
                                        className="capitalize"
                                    >
                                        {type}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label>Channel Name</Label>
                            <Input
                                placeholder="@kojomoney"
                                value={newMission.channelName}
                                onChange={e => setNewMission(prev => ({ ...prev, channelName: e.target.value }))}
                            />
                        </div>

                        <div>
                            <Label>Social Link (URL)</Label>
                            <Input
                                placeholder="https://t.me/kojomoney"
                                value={newMission.socialUrl}
                                onChange={e => setNewMission(prev => ({ ...prev, socialUrl: e.target.value }))}
                            />
                        </div>

                        <div>
                            <Label>Points Reward</Label>
                            <Input
                                type="number"
                                placeholder="500"
                                value={newMission.payout}
                                onChange={e => setNewMission(prev => ({ ...prev, payout: parseInt(e.target.value) || 0 }))}
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <input
                                type="checkbox"
                                id="notifyUsers"
                                checked={newMission.notifyUsers}
                                onChange={e => setNewMission(prev => ({ ...prev, notifyUsers: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="notifyUsers" className="cursor-pointer flex-1">
                                <span className="font-medium">Notify all users</span>
                                <p className="text-xs text-muted-foreground">Send a push notification about this new mission</p>
                            </Label>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleCreateMission}
                            disabled={creating || !newMission.title || !newMission.socialUrl}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Mission
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
