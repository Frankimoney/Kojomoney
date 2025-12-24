'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Users, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
    RefreshCw, Search, Eye, Download, Ban, Gift, Wallet,
    ArrowUpRight, ArrowDownRight, Activity, AlertCircle, Mail,
    Calendar, Globe, Smartphone, BarChart3, Settings, Shield,
    FileText, Link, ExternalLink, Check, X, Loader2, LogOut
} from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { logoutAdmin, getAdminEmail, getAdminToken } from '@/components/AdminLogin'
import { exportUsers, exportWithdrawals, exportTransactions, generateAdminReport } from '@/services/exportService'

interface DashboardStats {
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    totalWithdrawals: number
    pendingWithdrawals: number
    totalPointsDistributed: number
    totalMissions: number
    totalOffers: number
    activeMissions: number
    completedMissions24h: number
}

interface User {
    id: string
    email: string
    displayName: string
    points: number
    totalEarnings: number
    referralCode: string
    referredBy?: string
    createdAt: number
    lastActive?: number
    country?: string
    deviceType?: string
    status: 'active' | 'suspended' | 'banned'
    isBanned?: boolean
    bannedReason?: string
}

interface Withdrawal {
    id: string
    oderId: string
    usedId: string
    userEmail: string
    amount: number
    amountUSD: number
    method: 'paypal' | 'bank' | 'crypto' | 'mobile_money' | 'gift_card'
    accountDetails: string
    status: 'pending' | 'processing' | 'completed' | 'rejected'
    createdAt: number
    processedAt?: number
    processedBy?: string
    rejectionReason?: string
}

interface Transaction {
    id: string
    oderId: string
    userId: string
    type: 'credit' | 'debit'
    amount: number
    source: string
    status: string
    createdAt: number
    metadata?: any
}

interface AdminDashboardProps {
    onLogout?: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState('overview')
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [withdrawalFilter, setWithdrawalFilter] = useState<string>('pending')
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
    const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false)
    const [processingAction, setProcessingAction] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [adminEmail, setAdminEmail] = useState<string | null>(null)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showBanDialog, setShowBanDialog] = useState(false)
    const [banReason, setBanReason] = useState('')
    const [processingBan, setProcessingBan] = useState(false)
    const [showEmailDialog, setShowEmailDialog] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailMessage, setEmailMessage] = useState('')
    const [sendingEmail, setSendingEmail] = useState(false)
    const [showPointsDialog, setShowPointsDialog] = useState(false)
    const [pointsAmount, setPointsAmount] = useState('')
    const [pointsReason, setPointsReason] = useState('')
    const [processingPoints, setProcessingPoints] = useState(false)

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
        setAdminEmail(getAdminEmail())
    }, [])

    useEffect(() => {
        loadDashboardData()
    }, [])

    useEffect(() => {
        if (activeTab === 'withdrawals') {
            loadWithdrawals()
        } else if (activeTab === 'users') {
            loadUsers()
        } else if (activeTab === 'transactions') {
            loadTransactions()
        }
    }, [activeTab, withdrawalFilter])

    const loadDashboardData = async () => {
        setIsLoading(true)
        try {
            const response = await authApiCall('/api/admin/stats')
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
            setError('Failed to load dashboard data')
        } finally {
            setIsLoading(false)
        }
    }

    const loadUsers = async () => {
        try {
            const response = await authApiCall(`/api/admin/users?search=${searchQuery}`)
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users || [])
            }
        } catch (err) {
            console.error('Failed to load users:', err)
        }
    }

    const loadWithdrawals = async () => {
        try {
            const response = await authApiCall(`/api/admin/withdrawals?status=${withdrawalFilter}`)
            if (response.ok) {
                const data = await response.json()
                setWithdrawals(data.withdrawals || [])
            }
        } catch (err) {
            console.error('Failed to load withdrawals:', err)
        }
    }

    const loadTransactions = async () => {
        try {
            const response = await authApiCall('/api/admin/transactions?limit=100')
            if (response.ok) {
                const data = await response.json()
                setTransactions(data.transactions || [])
            }
        } catch (err) {
            console.error('Failed to load transactions:', err)
        }
    }

    const handleWithdrawalAction = async (action: 'approve' | 'reject') => {
        if (!selectedWithdrawal) return

        setProcessingAction(true)
        try {
            const response = await authApiCall('/api/admin/withdrawals/process', {
                method: 'POST',
                body: JSON.stringify({
                    withdrawalId: selectedWithdrawal.id,
                    action,
                    rejectionReason: action === 'reject' ? rejectionReason : undefined,
                }),
            })

            if (response.ok) {
                setSuccess(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
                setShowWithdrawalDialog(false)
                setSelectedWithdrawal(null)
                setRejectionReason('')
                loadWithdrawals()
            } else {
                const data = await response.json()
                setError(data.error || `Failed to ${action} withdrawal`)
            }
        } catch (err) {
            setError(`Failed to ${action} withdrawal`)
        } finally {
            setProcessingAction(false)
        }
    }

    const handleLogout = () => {
        logoutAdmin()
        if (onLogout) {
            onLogout()
        } else {
            window.location.reload()
        }
    }

    const handleExportAll = async () => {
        setIsExporting(true)
        try {
            await generateAdminReport(authApiCall)
            setSuccess('Reports exported successfully!')
        } catch (err) {
            setError('Failed to export reports')
        } finally {
            setIsExporting(false)
        }
    }

    const handleBanUser = async (action: 'ban' | 'unban') => {
        if (!selectedUser) return

        setProcessingBan(true)
        try {
            const response = await authApiCall('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                    userId: selectedUser.id,
                    action,
                    reason: banReason || undefined,
                }),
            })

            if (response.ok) {
                setSuccess(`User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`)
                setShowBanDialog(false)
                setSelectedUser(null)
                setBanReason('')
                loadUsers()
            } else {
                const data = await response.json()
                setError(data.error || `Failed to ${action} user`)
            }
        } catch (err) {
            setError(`Failed to ${action} user`)
        } finally {
            setProcessingBan(false)
        }
    }

    const handleSendEmail = async () => {
        if (!selectedUser || !emailSubject || !emailMessage) {
            setError('Subject and message are required')
            return
        }

        setSendingEmail(true)
        try {
            const response = await authApiCall('/api/admin/send-email', {
                method: 'POST',
                body: JSON.stringify({
                    to: selectedUser.email,
                    subject: emailSubject,
                    message: emailMessage,
                    userName: selectedUser.displayName,
                }),
            })

            if (response.ok) {
                setSuccess(`Email sent to ${selectedUser.email}`)
                setShowEmailDialog(false)
                setSelectedUser(null)
                setEmailSubject('')
                setEmailMessage('')
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to send email')
            }
        } catch (err) {
            setError('Failed to send email')
        } finally {
            setSendingEmail(false)
        }
    }

    const handleModifyPoints = async () => {
        if (!selectedUser || !pointsAmount) return

        const amount = parseInt(pointsAmount)
        if (isNaN(amount) || amount === 0) {
            setError('Please enter a valid non-zero amount')
            return
        }

        setProcessingPoints(true)
        try {
            const response = await authApiCall('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'modify_points',
                    userId: selectedUser.id,
                    points: amount,
                    reason: pointsReason || 'Manual adjustment by admin'
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setSuccess(`Points updated. New balance: ${data.newPoints}`)
                setShowPointsDialog(false)
                setSelectedUser(null)
                setPointsAmount('')
                setPointsReason('')
                loadUsers()
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to modify points')
            }
        } catch (err) {
            setError('Failed to modify points')
        } finally {
            setProcessingPoints(false)
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
            case 'processing':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'paypal': return '💳'
            case 'bank': return '🏦'
            case 'crypto': return '₿'
            case 'mobile_money': return '📱'
            case 'gift_card': return '🎁'
            default: return '💰'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
            {/* Header */}
            <header className="bg-white dark:bg-zinc-950 border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Admin Dashboard</h1>
                            <p className="text-xs text-muted-foreground">KojoMoney Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {adminEmail && (
                            <span className="text-xs text-muted-foreground hidden md:block">
                                {adminEmail}
                            </span>
                        )}
                        <Button variant="outline" size="sm" onClick={loadDashboardData}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Alerts */}
            <div className="max-w-7xl mx-auto px-4">
                {error && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">×</Button>
                    </div>
                )}
                {success && (
                    <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                        <Button variant="ghost" size="sm" onClick={() => setSuccess(null)} className="ml-auto">×</Button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" /> Withdrawals
                            {stats?.pendingWithdrawals ? (
                                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                    {stats.pendingWithdrawals}
                                </Badge>
                            ) : null}
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Transactions
                        </TabsTrigger>
                        <TabsTrigger value="missions" className="flex items-center gap-2">
                            <Gift className="h-4 w-4" /> Missions
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatsCard
                                title="Total Users"
                                value={stats?.totalUsers || 0}
                                icon={Users}
                                trend={stats?.newUsersToday ? `+${stats.newUsersToday} today` : undefined}
                                trendUp={true}
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Active Users"
                                value={stats?.activeUsers || 0}
                                icon={Activity}
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Pending Withdrawals"
                                value={stats?.pendingWithdrawals || 0}
                                icon={Clock}
                                highlight={(stats?.pendingWithdrawals || 0) > 0}
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Points Distributed"
                                value={stats?.totalPointsDistributed || 0}
                                icon={TrendingUp}
                                format="number"
                                loading={isLoading}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('withdrawals')}>
                                        <Wallet className="h-4 w-4 mr-3" />
                                        Process Withdrawals
                                        {stats?.pendingWithdrawals ? (
                                            <Badge variant="destructive" className="ml-auto">{stats.pendingWithdrawals} pending</Badge>
                                        ) : null}
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('missions')}>
                                        <Gift className="h-4 w-4 mr-3" />
                                        Manage Missions
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('users')}>
                                        <Users className="h-4 w-4 mr-3" />
                                        View Users
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={handleExportAll}
                                        disabled={isExporting}
                                    >
                                        {isExporting ? (
                                            <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4 mr-3" />
                                        )}
                                        {isExporting ? 'Exporting...' : 'Export All Reports'}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Platform Stats */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Platform Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="text-sm">Active Missions</span>
                                        <span className="font-bold">{stats?.activeMissions || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="text-sm">Missions Completed (24h)</span>
                                        <span className="font-bold">{stats?.completedMissions24h || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="text-sm">Total Offers</span>
                                        <span className="font-bold">{stats?.totalOffers || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="text-sm">Total Withdrawals</span>
                                        <span className="font-bold">{stats?.totalWithdrawals || 0}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* WITHDRAWALS TAB */}
                    <TabsContent value="withdrawals" className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <h2 className="text-lg font-semibold">Withdrawal Requests</h2>
                            <div className="flex gap-2">
                                <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="processing">Processing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={loadWithdrawals}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => exportWithdrawals(withdrawals)}
                                    disabled={withdrawals.length === 0}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No withdrawal requests found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        withdrawals.map((withdrawal) => (
                                            <TableRow key={withdrawal.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{withdrawal.userEmail}</p>
                                                        <p className="text-xs text-muted-foreground">{withdrawal.usedId?.slice(0, 8)}...</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-bold">{withdrawal.amount} pts</p>
                                                        <p className="text-xs text-muted-foreground">{formatCurrency(withdrawal.amountUSD)}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-2">
                                                        {getMethodIcon(withdrawal.method)}
                                                        <span className="capitalize">{withdrawal.method?.replace('_', ' ')}</span>
                                                    </span>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {withdrawal.accountDetails}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(withdrawal.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {withdrawal.status === 'pending' && (
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => {
                                                                    setSelectedWithdrawal(withdrawal)
                                                                    setShowWithdrawalDialog(true)
                                                                }}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => {
                                                                    setSelectedWithdrawal(withdrawal)
                                                                    setShowWithdrawalDialog(true)
                                                                }}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {withdrawal.status !== 'pending' && (
                                                        <Button size="sm" variant="ghost">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    {/* USERS TAB */}
                    <TabsContent value="users" className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <h2 className="text-lg font-semibold">Users ({users.length})</h2>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                                        className="pl-9 w-[250px]"
                                    />
                                </div>
                                <Button variant="outline" onClick={loadUsers}>
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => exportUsers(users)}
                                    disabled={users.length === 0}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Points</TableHead>
                                        <TableHead>Total Earned</TableHead>
                                        <TableHead>Referral Code</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No users found. Click search to load users.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{user.displayName || 'Anonymous'}</p>
                                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold">{user.points?.toLocaleString() || 0}</TableCell>
                                                <TableCell>{user.totalEarnings?.toLocaleString() || 0}</TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">{user.referralCode}</code>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(user.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={user.isBanned || user.status === 'banned' ? 'destructive' : 'default'}>
                                                        {user.isBanned || user.status === 'banned' ? 'Banned' : 'Active'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setEmailSubject('')
                                                                setEmailMessage('')
                                                                setShowEmailDialog(true)
                                                            }}
                                                        >
                                                            <Mail className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className={user.isBanned || user.status === 'banned'
                                                                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                                                : 'text-red-600 hover:text-red-700 hover:bg-red-50'}
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setShowBanDialog(true)
                                                            }}
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setPointsAmount('')
                                                                setPointsReason('')
                                                                setShowPointsDialog(true)
                                                            }}
                                                            title="Modify Points"
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    {/* TRANSACTIONS TAB */}
                    <TabsContent value="transactions" className="space-y-4">
                        <div className="flex justify-between">
                            <h2 className="text-lg font-semibold">Recent Transactions</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={loadTransactions}>
                                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => exportTransactions(transactions)}
                                    disabled={transactions.length === 0}
                                >
                                    <Download className="h-4 w-4 mr-2" /> Export
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No transactions found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="font-mono text-xs">{tx.userId?.slice(0, 8)}...</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.type === 'credit' ? 'default' : 'secondary'}>
                                                        {tx.type === 'credit' ? (
                                                            <ArrowUpRight className="h-3 w-3 mr-1" />
                                                        ) : (
                                                            <ArrowDownRight className="h-3 w-3 mr-1" />
                                                        )}
                                                        {tx.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={tx.type === 'credit' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                                    {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                                                </TableCell>
                                                <TableCell className="capitalize">{tx.source?.replace('_', ' ')}</TableCell>
                                                <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(tx.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    {/* MISSIONS TAB */}
                    <TabsContent value="missions">
                        <div className="text-center py-8">
                            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground mb-4">Manage your affiliate missions and offers</p>
                            <Button onClick={() => window.location.href = '/admin/missions'}>
                                Open Mission Manager
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Withdrawal Processing Dialog */}
            <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Withdrawal Request</DialogTitle>
                        <DialogDescription>
                            Review and process this withdrawal request.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedWithdrawal && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">User</Label>
                                    <p className="font-medium">{selectedWithdrawal.userEmail}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Amount</Label>
                                    <p className="font-bold text-lg">{selectedWithdrawal.amount} pts</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(selectedWithdrawal.amountUSD)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Method</Label>
                                    <p className="font-medium capitalize">{getMethodIcon(selectedWithdrawal.method)} {selectedWithdrawal.method?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Account</Label>
                                    <p className="font-mono text-sm">{selectedWithdrawal.accountDetails}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Rejection Reason (if rejecting)</Label>
                                <Input
                                    placeholder="e.g., Invalid account details"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowWithdrawalDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleWithdrawalAction('reject')}
                            disabled={processingAction}
                        >
                            {processingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                            Reject
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleWithdrawalAction('approve')}
                            disabled={processingAction}
                        >
                            {processingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Ban Dialog */}
            <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedUser?.isBanned || selectedUser?.status === 'banned'
                                ? 'Unban User'
                                : 'Ban User'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedUser?.isBanned || selectedUser?.status === 'banned'
                                ? 'This will restore the user\'s access to the platform.'
                                : 'This will prevent the user from accessing the platform.'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {selectedUser.displayName?.charAt(0) || selectedUser.email?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{selectedUser.displayName || 'Anonymous'}</p>
                                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Points:</span>{' '}
                                        <span className="font-medium">{selectedUser.points?.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Referral:</span>{' '}
                                        <code className="text-xs bg-background px-1 rounded">{selectedUser.referralCode}</code>
                                    </div>
                                </div>
                            </div>

                            {!(selectedUser.isBanned || selectedUser.status === 'banned') && (
                                <div className="space-y-2">
                                    <Label>Ban Reason (optional)</Label>
                                    <Input
                                        placeholder="e.g., Fraudulent activity, Terms violation"
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBanDialog(false)}>
                            Cancel
                        </Button>
                        {selectedUser?.isBanned || selectedUser?.status === 'banned' ? (
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleBanUser('unban')}
                                disabled={processingBan}
                            >
                                {processingBan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                Unban User
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={() => handleBanUser('ban')}
                                disabled={processingBan}
                            >
                                {processingBan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                                Ban User
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Send Email Dialog */}
            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Send Email to User</DialogTitle>
                        <DialogDescription>
                            Send a personalized email to this user using your configured SMTP.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {selectedUser.displayName?.charAt(0) || selectedUser.email?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <p className="font-medium">{selectedUser.displayName || 'Anonymous'}</p>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Subject *</Label>
                                <Input
                                    placeholder="e.g., Important Update About Your Account"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Message *</Label>
                                <textarea
                                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder="Write your personalized message here..."
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    The email will include a styled header and the user's name as greeting.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendEmail}
                            disabled={sendingEmail || !emailSubject || !emailMessage}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                            Send Email
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modify Points Dialog */}
            <Dialog open={showPointsDialog} onOpenChange={setShowPointsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modify Points</DialogTitle>
                        <DialogDescription>
                            Credit or Debit points for this user. Use negative values to remove points.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                <span className="text-sm font-medium">Current Balance</span>
                                <span className="font-bold text-lg">{selectedUser.points?.toLocaleString()} pts</span>
                            </div>

                            <div className="space-y-2">
                                <Label>Amount (+/-) *</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 500 or -500"
                                    value={pointsAmount}
                                    onChange={(e) => setPointsAmount(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Positive to add points, Negative to remove points.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Reason (optional)</Label>
                                <Input
                                    placeholder="e.g., Bonus, Correction, Refund"
                                    value={pointsReason}
                                    onChange={(e) => setPointsReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowPointsDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleModifyPoints}
                            disabled={processingPoints || !pointsAmount}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {processingPoints ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                            Update Points
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}

// Stats Card Component
function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    trendUp,
    highlight,
    format = 'default',
    loading
}: {
    title: string
    value: number
    icon: any
    trend?: string
    trendUp?: boolean
    highlight?: boolean
    format?: 'default' | 'number' | 'currency'
    loading?: boolean
}) {
    const formattedValue = format === 'number'
        ? value.toLocaleString()
        : format === 'currency'
            ? `$${value.toLocaleString()}`
            : value

    if (loading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={highlight ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : ''}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-muted-foreground">{title}</span>
                    <Icon className={`h-5 w-5 ${highlight ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                </div>
                <p className="text-2xl font-bold">{formattedValue}</p>
                {trend && (
                    <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {trendUp ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                        {trend}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
