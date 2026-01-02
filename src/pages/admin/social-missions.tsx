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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, ExternalLink, Loader2, MessageCircle, Video, Receipt } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { getAdminToken } from '@/components/AdminLogin'
import Head from 'next/head'

interface SocialMission {
    id?: string
    title: string
    socialType: 'telegram' | 'tiktok' | 'payment_proof'
    channelName: string
    socialUrl: string
    payout: number
    description: string
    active: boolean
}

const DEFAULT_MISSION: SocialMission = {
    title: '',
    socialType: 'telegram',
    channelName: '',
    socialUrl: '',
    payout: 100,
    description: '',
    active: true,
}

const SOCIAL_ICONS = {
    telegram: <MessageCircle className="h-4 w-4" />,
    tiktok: <Video className="h-4 w-4" />,
    payment_proof: <Receipt className="h-4 w-4" />,
}

export default function AdminSocialMissionsPage() {
    const [missions, setMissions] = useState<SocialMission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showDialog, setShowDialog] = useState(false)
    const [editingMission, setEditingMission] = useState<SocialMission | null>(null)
    const [formData, setFormData] = useState<SocialMission>(DEFAULT_MISSION)
    const [error, setError] = useState<string | null>(null)

    // Fetch missions
    useEffect(() => {
        fetchMissions()
    }, [])

    const fetchMissions = async () => {
        setIsLoading(true)
        try {
            const res = await apiCall('/api/social-missions')
            const data = await res.json()
            setMissions(data.missions || [])
        } catch (err) {
            console.error('Failed to fetch social missions:', err)
            setError('Failed to load missions')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingMission(null)
        setFormData(DEFAULT_MISSION)
        setShowDialog(true)
    }

    const handleEdit = (mission: SocialMission) => {
        setEditingMission(mission)
        setFormData(mission)
        setShowDialog(true)
    }

    const handleSave = async () => {
        setIsSaving(true)
        setError(null)

        try {
            const token = getAdminToken()

            if (editingMission?.id) {
                // Update
                await apiCall('/api/social-missions', {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ id: editingMission.id, ...formData })
                })
            } else {
                // Create
                await apiCall('/api/social-missions', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify(formData)
                })
            }

            setShowDialog(false)
            fetchMissions()
        } catch (err: any) {
            setError(err.message || 'Failed to save mission')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this mission?')) return

        try {
            const token = getAdminToken()
            await apiCall('/api/social-missions', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id })
            })
            fetchMissions()
        } catch (err) {
            console.error('Failed to delete:', err)
        }
    }

    const handleToggleActive = async (mission: SocialMission) => {
        try {
            const token = getAdminToken()
            await apiCall('/api/social-missions', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: mission.id, active: !mission.active })
            })
            fetchMissions()
        } catch (err) {
            console.error('Failed to toggle:', err)
        }
    }

    return (
        <>
            <Head>
                <title>Social Missions - KojoMoney Admin</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Social Missions</h1>
                            <p className="text-muted-foreground">Manage TikTok, Telegram follows & Payment Proofs</p>
                        </div>
                        <Button onClick={handleCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Mission
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : missions.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                No social missions yet. Click "Add Mission" to create one.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {missions.map((mission) => (
                                <Card key={mission.id} className={!mission.active ? 'opacity-60' : ''}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${mission.socialType === 'telegram' ? 'bg-blue-100 text-blue-600' :
                                                        mission.socialType === 'tiktok' ? 'bg-pink-100 text-pink-600' :
                                                            'bg-green-100 text-green-600'
                                                    }`}>
                                                    {SOCIAL_ICONS[mission.socialType]}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{mission.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{mission.description}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Badge variant="secondary">{mission.socialType}</Badge>
                                                        <Badge variant="outline">{mission.payout} pts</Badge>
                                                        {!mission.active && <Badge variant="destructive">Inactive</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={mission.active}
                                                    onCheckedChange={() => handleToggleActive(mission)}
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => handleEdit(mission)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDelete(mission.id!)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingMission ? 'Edit Mission' : 'Create Social Mission'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Mission Type</Label>
                            <Select
                                value={formData.socialType}
                                onValueChange={(v: any) => setFormData({ ...formData, socialType: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="telegram">Telegram Follow</SelectItem>
                                    <SelectItem value="tiktok">TikTok Follow</SelectItem>
                                    <SelectItem value="payment_proof">Post Payment Proof</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder={formData.socialType === 'payment_proof'
                                    ? 'Post Your Payment Proof'
                                    : 'Follow us on Telegram'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={formData.socialType === 'payment_proof'
                                    ? 'Post your payment screenshot on TikTok/Telegram and tag @KojoMoney'
                                    : 'Join our channel for updates and bonuses'}
                                rows={3}
                            />
                        </div>

                        {formData.socialType !== 'payment_proof' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Channel/Profile Name</Label>
                                    <Input
                                        value={formData.channelName}
                                        onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                                        placeholder="@kojomoney"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>URL</Label>
                                    <Input
                                        value={formData.socialUrl}
                                        onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                                        placeholder="https://t.me/kojomoney"
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label>Payout (points)</Label>
                            <Input
                                type="number"
                                value={formData.payout}
                                onChange={(e) => setFormData({ ...formData, payout: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingMission ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
