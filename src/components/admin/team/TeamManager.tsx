import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Mail, Trash2, Plus, Shield, UserPlus, Calendar, ShieldAlert, ShieldCheck, Edit3 } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { getAdminEmail, getAdminToken } from '@/components/AdminLogin'

type AdminRole = 'super_admin' | 'editor' | 'support' | 'viewer'
type AdminStatus = 'active' | 'pending'

interface AdminUser {
    email: string
    role: AdminRole
    name?: string
    addedBy?: string
    createdAt: number
    lastLogin?: number
    status?: AdminStatus
}

export default function TeamManager() {
    const [admins, setAdmins] = useState<AdminUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviting, setIsInviting] = useState(false)

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<AdminRole>('viewer')
    const [inviteName, setInviteName] = useState('')
    const [inviteError, setInviteError] = useState<string | null>(null)
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

    const currentUserEmail = getAdminEmail()

    useEffect(() => {
        loadAdmins()
    }, [])

    const loadAdmins = async () => {
        setIsLoading(true)
        try {
            const token = getAdminToken()
            const res = await apiCall('/api/admin/users/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await res.json()
            if (data.success) {
                setAdmins(data.admins)
            }
        } catch (error) {
            console.error('Failed to load admins:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviteError(null)
        setInviteSuccess(null)
        setIsInviting(true)

        try {
            const token = getAdminToken()
            const res = await apiCall('/api/admin/users/invite', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                    name: inviteName
                })
            })
            const data = await res.json()

            if (data.success) {
                setInviteSuccess(data.message)
                setInviteEmail('')
                setInviteName('')
                loadAdmins() // Reload list
            } else {
                setInviteError(data.error || 'Failed to invite')
            }
        } catch (error) {
            setInviteError('Failed to invite user')
        } finally {
            setIsInviting(false)
        }
    }

    const handleDelete = async (email: string) => {
        if (!confirm(`Are you sure you want to remove ${email} from the team?`)) return

        try {
            const token = getAdminToken()
            const res = await apiCall('/api/admin/users/delete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            })
            const data = await res.json()

            if (data.success) {
                loadAdmins()
            } else {
                alert(data.error)
            }
        } catch (error) {
            alert('Failed to delete user')
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'super_admin': return <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium border border-violet-200 dark:border-violet-700 flex items-center gap-1 w-fit"><ShieldAlert className="h-3 w-3" /> Super Admin</span>
            case 'editor': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-700 flex items-center gap-1 w-fit"><Edit3 className="h-3 w-3" /> Editor</span>
            case 'support': return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium border border-green-200 dark:border-green-700 flex items-center gap-1 w-fit"><ShieldCheck className="h-3 w-3" /> Support</span>
            default: return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1 w-fit"><Shield className="h-3 w-3" /> Viewer</span>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Invite Card */}
                <Card className="md:w-1/3">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-violet-600" />
                            Invite Team Member
                        </CardTitle>
                        <CardDescription>
                            Add a new administrator to the dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-4">
                            {inviteError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {inviteError}
                                </div>
                            )}
                            {inviteSuccess && (
                                <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">
                                    {inviteSuccess}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    placeholder="colleague@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Select Role</Label>
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AdminRole)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                                        <SelectItem value="editor">Editor (Blog only)</SelectItem>
                                        <SelectItem value="support">Support (Users & Payments)</SelectItem>
                                        <SelectItem value="super_admin">Super Admin (Full Access)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    {inviteRole === 'viewer' && 'Can only view dashboard stats.'}
                                    {inviteRole === 'editor' && 'Can manage blog posts.'}
                                    {inviteRole === 'support' && 'Can manage users and withdrawals.'}
                                    {inviteRole === 'super_admin' && 'Full access including settings and team management.'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Name (Optional)</Label>
                                <Input
                                    placeholder="John Doe"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-violet-600 hover:bg-violet-700"
                                disabled={isInviting}
                            >
                                {isInviting ? 'Sending Invite...' : 'Send Invite'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Team List */}
                <Card className="md:w-2/3">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-violet-600" />
                            Team Members
                        </CardTitle>
                        <CardDescription>
                            Manage existing administrators and their permissions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="hidden sm:table-cell">Added</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                Loading team...
                                            </TableCell>
                                        </TableRow>
                                    ) : admins.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                No other team members found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        admins.map((admin) => (
                                            <TableRow key={admin.email}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{admin.name || admin.email}</span>
                                                        <span className="text-xs text-slate-500">{admin.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {getRoleBadge(admin.role)}
                                                        {admin.status === 'pending' && (
                                                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-700 w-fit">
                                                                ⏳ Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(admin.createdAt).toLocaleDateString()}
                                                    </div>
                                                    {admin.addedBy && (
                                                        <div className="mt-0.5">by {admin.addedBy.split('@')[0]}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {admin.email !== currentUserEmail ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                            onClick={() => handleDelete(admin.email)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">You</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
