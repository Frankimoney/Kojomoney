'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Trash2, Edit, ExternalLink, Copy, CheckCircle, AlertCircle, Link, Gift, Share2, FileText, Download, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiJson, apiCall } from '@/lib/api-client'
import { getAdminToken } from '@/components/AdminLogin'
import AdminLayout from '@/components/admin/AdminLayout'

interface MissionStep {
    id: string
    instruction: string
    order: number
}

interface Mission {
    id?: string
    title: string
    description: string
    payout: number
    type: 'social' | 'install' | 'review' | 'referral' | 'custom'
    difficulty: 'Easy' | 'Medium' | 'Hard'
    affiliateUrl: string
    steps: MissionStep[]
    proofRequired: boolean
    active: boolean
    expiresAt?: number
    // Product info fields
    logoUrl?: string
    brandName?: string
    productCategory?: string
    originalUrl?: string
}

interface Offer {
    id?: string
    title: string
    description: string
    payout: number
    provider: string
    category: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
    url: string
    logoUrl?: string
    estimatedTime: string
    tags: string[]
    active: boolean
}

const DEFAULT_MISSION: Mission = {
    title: '',
    description: '',
    payout: 100,
    type: 'custom',
    difficulty: 'Easy',
    affiliateUrl: '',
    steps: [{ id: '1', instruction: '', order: 1 }],
    proofRequired: true,
    active: true,
    logoUrl: '',
    brandName: '',
    productCategory: '',
}

const DEFAULT_OFFER: Offer = {
    title: '',
    description: '',
    payout: 100,
    provider: 'Internal',
    category: 'Other',
    difficulty: 'Easy',
    url: '',
    estimatedTime: '5 mins',
    tags: [],
    active: true,
}

export default function AdminMissionPanel() {
    const [activeTab, setActiveTab] = useState('missions')
    const [missions, setMissions] = useState<Mission[]>([])
    const [offers, setOffers] = useState<Offer[]>([])
    const [socialMissions, setSocialMissions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [editingMission, setEditingMission] = useState<Mission | null>(null)
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
    const [formData, setFormData] = useState<Mission>(DEFAULT_MISSION)
    const [offerFormData, setOfferFormData] = useState<Offer>(DEFAULT_OFFER)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [deletingMission, setDeletingMission] = useState<Mission | null>(null)
    const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isFetchingMeta, setIsFetchingMeta] = useState(false)

    const authApiCall = (path: string, options: any = {}) => {
        const token = getAdminToken()
        return apiCall(path, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        })
    }

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [missionsRes, offersRes, socialRes] = await Promise.all([
                authApiCall('/api/missions?userId=admin'),
                authApiCall('/api/offers?userId=admin'),
                authApiCall('/api/social-missions'),
            ])

            if (missionsRes.ok) {
                const data = await missionsRes.json()
                setMissions(data.missions || [])
            }
            if (offersRes.ok) {
                const data = await offersRes.json()
                setOffers(data.offers || [])
            }
            if (socialRes.ok) {
                const data = await socialRes.json()
                setSocialMissions(data.missions || [])
            }
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('Failed to load data')
        } finally {
            setIsLoading(false)
        }
    }

    // Mission handlers
    const handleAddMission = () => {
        setFormData(DEFAULT_MISSION)
        setEditingMission(null)
        setShowAddDialog(true)
    }

    const handleEditMission = (mission: Mission) => {
        setFormData({
            ...mission,
            affiliateUrl: (mission as any).affiliateUrl || '',
        })
        setEditingMission(mission)
        setShowAddDialog(true)
    }

    const handleSaveMission = async () => {
        if (!formData.title || !formData.affiliateUrl) {
            setError('Title and Affiliate URL are required')
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            const payload = {
                ...formData,
                steps: formData.steps.filter(s => s.instruction.trim()),
            }

            const response = await authApiCall('/api/admin/missions', {
                method: editingMission ? 'PUT' : 'POST',
                body: JSON.stringify(editingMission ? { ...payload, id: editingMission.id } : payload),
            })

            if (response.ok) {
                setSuccess(editingMission ? 'Mission updated!' : 'Mission created!')
                setShowAddDialog(false)
                loadData()
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to save mission')
            }
        } catch (err) {
            setError('Failed to save mission')
        } finally {
            setIsSaving(false)
        }
    }

    const addStep = () => {
        const newStep: MissionStep = {
            id: Date.now().toString(),
            instruction: '',
            order: formData.steps.length + 1,
        }
        setFormData({ ...formData, steps: [...formData.steps, newStep] })
    }

    const removeStep = (id: string) => {
        setFormData({
            ...formData,
            steps: formData.steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })),
        })
    }

    const updateStep = (id: string, instruction: string) => {
        setFormData({
            ...formData,
            steps: formData.steps.map(s => s.id === id ? { ...s, instruction } : s),
        })
    }

    const fetchUrlMetadata = async () => {
        if (!formData.affiliateUrl) {
            setError('Please enter an affiliate URL first')
            return
        }

        setIsFetchingMeta(true)
        setError(null)

        try {
            const response = await authApiCall('/api/admin/fetch-url-meta', {
                method: 'POST',
                body: JSON.stringify({ url: formData.affiliateUrl }),
            })

            if (response.ok) {
                const data = await response.json()
                const meta = data.metadata

                // Auto-fill form with fetched metadata
                setFormData(prev => ({
                    ...prev,
                    title: prev.title || meta.title || '',
                    description: prev.description || meta.description || '',
                    logoUrl: meta.image || meta.favicon || prev.logoUrl || '',
                    brandName: meta.siteName || prev.brandName || '',
                    originalUrl: meta.url || prev.originalUrl || '',
                }))

                setSuccess('Product info fetched! Review and adjust as needed.')
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to fetch URL metadata')
            }
        } catch (err) {
            setError('Failed to fetch URL metadata. You can enter product info manually.')
        } finally {
            setIsFetchingMeta(false)
        }
    }

    const handleDeleteMission = async () => {
        if (!deletingMission?.id) return

        setIsDeleting(true)
        setError(null)

        try {
            const response = await authApiCall('/api/admin/missions', {
                method: 'DELETE',
                body: JSON.stringify({ id: deletingMission.id }),
            })

            if (response.ok) {
                setSuccess('Mission deleted!')
                setDeletingMission(null)
                loadData()
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to delete mission')
            }
        } catch (err) {
            setError('Failed to delete mission')
        } finally {
            setIsDeleting(false)
        }
    }

    // Offer handlers
    const handleAddOffer = () => {
        setOfferFormData(DEFAULT_OFFER)
        setEditingOffer(null)
    }

    const handleSaveOffer = async () => {
        if (!offerFormData.title || !offerFormData.url) {
            setError('Title and URL are required')
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            const response = await authApiCall('/api/offers', {
                method: 'POST',
                body: JSON.stringify(offerFormData),
            })

            if (response.ok) {
                setSuccess('Offer created!')
                setOfferFormData(DEFAULT_OFFER)
                loadData()
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to save offer')
            }
        } catch (err) {
            setError('Failed to save offer')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteOffer = async () => {
        if (!deletingOffer?.id) return

        setIsDeleting(true)
        setError(null)

        try {
            const response = await authApiCall('/api/offers', {
                method: 'DELETE',
                body: JSON.stringify({ id: deletingOffer.id }),
            })

            if (response.ok) {
                setSuccess('Offer deleted!')
                setDeletingOffer(null)
                loadData()
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to delete offer')
            }
        } catch (err) {
            setError('Failed to delete offer')
        } finally {
            setIsDeleting(false)
        }
    }

    const copyCallbackUrl = () => {
        const url = `${window.location.origin}/api/offers/callback`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'social': return <Share2 className="h-4 w-4" />
            case 'review': return <FileText className="h-4 w-4" />
            case 'referral': return <Gift className="h-4 w-4" />
            case 'install': return <Download className="h-4 w-4" />
            default: return <Link className="h-4 w-4" />
        }
    }

    return (
        <AdminLayout
            title="Missions & Offers"
            subtitle="Manage missions, offers, and affiliate links"
            isLoading={isLoading}
            error={error}
            success={success}
            onClearError={() => setError(null)}
            onClearSuccess={() => setSuccess(null)}
            actions={
                <Button variant="outline" onClick={copyCallbackUrl} size="sm">
                    {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy Callback URL'}
                </Button>
            }
        >
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="missions">Missions (Affiliate Links)</TabsTrigger>
                        <TabsTrigger value="social">Social Follow</TabsTrigger>
                        <TabsTrigger value="offers">Offerwall Items</TabsTrigger>
                        <TabsTrigger value="help">Setup Guide</TabsTrigger>
                    </TabsList>

                    {/* SOCIAL FOLLOW TAB */}
                    <TabsContent value="social" className="space-y-4">
                        <Card className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-sky-200 dark:border-sky-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-sky-500 flex items-center justify-center">
                                            <Share2 className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Social Missions</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Manage Telegram, TikTok follows & Payment Proof missions
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/admin/social-missions'}>
                                <CardContent className="p-4">
                                    <h4 className="font-semibold mb-2">✨ Create / Manage All</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Go to full Social Mission Manager page to add new missions.
                                    </p>
                                    <Button size="sm">
                                        <ExternalLink className="h-4 w-4 mr-2" /> Open Manager
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/admin/social-proofs'}>
                                <CardContent className="p-4">
                                    <h4 className="font-semibold mb-2">📸 Review Screenshots</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Approve or reject user-submitted proof screenshots to credit points.
                                    </p>
                                    <Button size="sm" variant="outline">
                                        Review Proofs
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="font-semibold text-lg">Active Social Missions</h3>
                            {socialMissions.length === 0 ? (
                                <div className="text-center p-8 border rounded-xl bg-muted/20">
                                    <p className="text-muted-foreground">No active social missions found.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {socialMissions.map((mission) => (
                                        <Card key={mission.id}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${mission.socialType === 'telegram' ? 'bg-blue-100 text-blue-600' :
                                                            mission.socialType === 'tiktok' ? 'bg-pink-100 text-pink-600' :
                                                                'bg-green-100 text-green-600'
                                                        }`}>
                                                        <Share2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{mission.title}</h4>
                                                        <div className="flex gap-2 mt-1">
                                                            <Badge variant="secondary" className="text-xs">{mission.socialType}</Badge>
                                                            <Badge variant="outline" className="text-xs text-green-600">{mission.payout} pts</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${mission.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {mission.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* MISSIONS TAB */}
                    <TabsContent value="missions" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Your Affiliate Missions</h2>
                            <Button onClick={handleAddMission}>
                                <Plus className="h-4 w-4 mr-2" /> Add Mission
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {[1, 2, 3, 4].map(i => (
                                    <Card key={i} className="animate-pulse">
                                        <CardContent className="p-4 h-32" />
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {missions.map((mission) => (
                                    <Card key={mission.id} className={`${!mission.active ? 'opacity-60' : ''}`}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    {mission.logoUrl ? (
                                                        <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border">
                                                            <img src={mission.logoUrl} alt="" className="h-full w-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                            {getTypeIcon(mission.type)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-semibold">{mission.title}</h3>
                                                        <div className="flex gap-1">
                                                            <Badge variant="outline" className="text-xs">{mission.type}</Badge>
                                                            <Badge variant="secondary" className="text-xs">{mission.difficulty}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-green-600">+{mission.payout}</span>
                                                    <Badge variant={mission.active ? 'default' : 'secondary'} className="ml-2 text-xs">
                                                        {mission.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{mission.description}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {(mission as any).affiliateUrl || 'No URL set'}
                                                </span>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => handleEditMission(mission)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingMission(mission)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    {(mission as any).affiliateUrl && (
                                                        <Button size="sm" variant="ghost" onClick={() => window.open((mission as any).affiliateUrl, '_blank')}>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {missions.length === 0 && (
                                    <Card className="col-span-2">
                                        <CardContent className="p-8 text-center">
                                            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                            <h3 className="font-semibold mb-2">No missions yet</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Create your first mission with an affiliate link
                                            </p>
                                            <Button onClick={handleAddMission}>
                                                <Plus className="h-4 w-4 mr-2" /> Create Mission
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    {/* OFFERS TAB */}
                    <TabsContent value="offers" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Offerwall Items</h2>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Add New Offer</CardTitle>
                                <CardDescription>Add offers that appear in the main offerwall</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Title *</Label>
                                        <Input
                                            placeholder="e.g., Sign up for Crypto.com"
                                            value={offerFormData.title}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payout (points) *</Label>
                                        <Input
                                            type="number"
                                            value={offerFormData.payout}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, payout: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Affiliate/Offer URL *</Label>
                                    <Input
                                        placeholder="https://partner.example.com/your-affiliate-link"
                                        value={offerFormData.url}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, url: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Logo/Image URL</Label>
                                    <Input
                                        placeholder="https://example.com/offer-logo.png"
                                        value={offerFormData.logoUrl || ''}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, logoUrl: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">Optional: Custom image for the offer card</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        placeholder="Describe what users need to do to earn points..."
                                        value={offerFormData.description}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select value={offerFormData.category} onValueChange={(v) => setOfferFormData({ ...offerFormData, category: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Game">Game</SelectItem>
                                                <SelectItem value="Survey">Survey</SelectItem>
                                                <SelectItem value="Shopping">Shopping</SelectItem>
                                                <SelectItem value="Finance">Finance</SelectItem>
                                                <SelectItem value="Install">App Install</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Difficulty</Label>
                                        <Select value={offerFormData.difficulty} onValueChange={(v: any) => setOfferFormData({ ...offerFormData, difficulty: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Easy">Easy</SelectItem>
                                                <SelectItem value="Medium">Medium</SelectItem>
                                                <SelectItem value="Hard">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Est. Time</Label>
                                        <Input
                                            placeholder="5 mins"
                                            value={offerFormData.estimatedTime}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, estimatedTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <Button onClick={handleSaveOffer} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Add Offer
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {offers.map((offer) => (
                                <Card key={offer.id} className={`${!offer.active ? 'opacity-60' : ''}`}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-3">
                                                {offer.logoUrl && (
                                                    <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
                                                        <img src={offer.logoUrl} alt="" className="h-full w-full object-cover" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-semibold">{offer.title}</h3>
                                                    <div className="flex gap-1 mt-1">
                                                        <Badge variant={offer.active ? 'default' : 'secondary'} className="text-xs">
                                                            {offer.active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="font-bold text-green-600">+{offer.payout}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{offer.description}</p>
                                        <div className="flex gap-1 mb-2">
                                            <Badge variant="outline" className="text-xs">{offer.category}</Badge>
                                            <Badge variant="secondary" className="text-xs">{offer.difficulty}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{offer.provider}</span>
                                            <div className="flex gap-1">
                                                {offer.url && (
                                                    <Button size="sm" variant="ghost" onClick={() => window.open(offer.url, '_blank')}>
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingOffer(offer)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {offers.length === 0 && (
                                <Card className="col-span-full">
                                    <CardContent className="p-8 text-center">
                                        <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                        <h3 className="font-semibold mb-2">No offers yet</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Create your first offer using the form above
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* HELP TAB */}
                    <TabsContent value="help" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>How to Add Affiliate Links</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold">1. Getting Your Affiliate Link</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Sign up for affiliate programs from companies you want to promote. Examples:
                                    </p>
                                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                                        <li><strong>Amazon Associates</strong> - Promote products</li>
                                        <li><strong>CJ Affiliate</strong> - Multiple brands</li>
                                        <li><strong>ShareASale</strong> - Retail and services</li>
                                        <li><strong>Impact</strong> - Tech and finance</li>
                                        <li><strong>Crypto exchanges</strong> - Binance, Coinbase referrals</li>
                                        <li><strong>Mobile apps</strong> - Direct partner programs</li>
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold">2. Creating a Mission</h3>
                                    <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-2">
                                        <li>Click "Add Mission" above</li>
                                        <li>Enter a clear title (e.g., "Sign up for Binance")</li>
                                        <li>Paste your affiliate link in the URL field</li>
                                        <li>Set the points users will earn</li>
                                        <li>Add step-by-step instructions</li>
                                        <li>Enable "Proof Required" if users should upload screenshots</li>
                                    </ol>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold">3. FTC Compliance (Important!)</h3>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm">
                                        <p className="font-medium mb-2">All affiliate links are automatically disclosed to users with:</p>
                                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                            <li>Disclosure dialog before clicking any link</li>
                                            <li>Clear "Affiliate Link" badges</li>
                                            <li>FTC warning for review missions</li>
                                            <li>All clicks are logged for compliance</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold">4. Tracking Conversions</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Your callback URL for affiliate networks:
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/offers/callback`}
                                            className="font-mono text-sm"
                                        />
                                        <Button variant="outline" onClick={copyCallbackUrl}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ADD/EDIT MISSION DIALOG */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingMission ? 'Edit Mission' : 'Add New Mission'}</DialogTitle>
                            <DialogDescription>
                                Create a mission with your affiliate link. Users will see this in the Quick Missions section.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mission Title *</Label>
                                    <Input
                                        placeholder="e.g., Sign up for Binance"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Points Reward *</Label>
                                    <Input
                                        type="number"
                                        value={formData.payout}
                                        onChange={(e) => setFormData({ ...formData, payout: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Affiliate URL *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://partner.example.com/ref=your-code"
                                        value={formData.affiliateUrl}
                                        onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={fetchUrlMetadata}
                                        disabled={isFetchingMeta || !formData.affiliateUrl}
                                    >
                                        {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
                                        Fetch Info
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Paste your affiliate link and click "Fetch Info" to auto-fill product details
                                </p>
                            </div>

                            {/* Product Info Section */}
                            <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Product Information</Label>
                                    {formData.logoUrl && (
                                        <div className="h-10 w-10 rounded-lg overflow-hidden border bg-white">
                                            <img
                                                src={formData.logoUrl}
                                                alt="Product logo"
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Brand Name</Label>
                                        <Input
                                            placeholder="e.g., Binance, Shopify"
                                            value={formData.brandName || ''}
                                            onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Category</Label>
                                        <Select
                                            value={formData.productCategory || ''}
                                            onValueChange={(v) => setFormData({ ...formData, productCategory: v })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="finance">Finance & Banking</SelectItem>
                                                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                                                <SelectItem value="shopping">Shopping</SelectItem>
                                                <SelectItem value="gaming">Gaming</SelectItem>
                                                <SelectItem value="entertainment">Entertainment</SelectItem>
                                                <SelectItem value="productivity">Productivity</SelectItem>
                                                <SelectItem value="social">Social Media</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Logo/Image URL</Label>
                                    <Input
                                        placeholder="https://example.com/logo.png"
                                        value={formData.logoUrl || ''}
                                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    placeholder="Describe what users need to do..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mission Type</Label>
                                    <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="custom">Custom Offer</SelectItem>
                                            <SelectItem value="social">Social Media</SelectItem>
                                            <SelectItem value="install">App Install</SelectItem>
                                            <SelectItem value="review">Write Review</SelectItem>
                                            <SelectItem value="referral">Referral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <Select value={formData.difficulty} onValueChange={(v: any) => setFormData({ ...formData, difficulty: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Easy">Easy (few mins)</SelectItem>
                                            <SelectItem value="Medium">Medium (1-2 days)</SelectItem>
                                            <SelectItem value="Hard">Hard (3+ days)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>Steps (Instructions for users)</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addStep}>
                                        <Plus className="h-4 w-4 mr-1" /> Add Step
                                    </Button>
                                </div>
                                {formData.steps.map((step, idx) => (
                                    <div key={step.id} className="flex gap-2 items-center">
                                        <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                                        <Input
                                            placeholder="e.g., Open the app and register"
                                            value={step.instruction}
                                            onChange={(e) => updateStep(step.id, e.target.value)}
                                        />
                                        {formData.steps.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(step.id)}>
                                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label>Require Proof Screenshot</Label>
                                    <p className="text-xs text-muted-foreground">Users must upload proof of completion</p>
                                </div>
                                <Switch
                                    checked={formData.proofRequired}
                                    onCheckedChange={(v) => setFormData({ ...formData, proofRequired: v })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label>Active</Label>
                                    <p className="text-xs text-muted-foreground">Show this mission to users</p>
                                </div>
                                <Switch
                                    checked={formData.active}
                                    onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                            <Button onClick={handleSaveMission} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                {editingMission ? 'Update Mission' : 'Create Mission'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* DELETE CONFIRMATION DIALOG */}
            <AlertDialog open={!!deletingMission} onOpenChange={() => setDeletingMission(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Mission</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deletingMission?.title}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteMission()
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* DELETE OFFER CONFIRMATION DIALOG */}
            <AlertDialog open={!!deletingOffer} onOpenChange={() => setDeletingOffer(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deletingOffer?.title}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteOffer()
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    )
}
