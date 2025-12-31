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
    Calendar, Globe, Smartphone, BarChart3, Settings, Shield, AlertTriangle,
    FileText, Link, ExternalLink, Check, X, Loader2, LogOut, Bell, Send
} from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { logoutAdmin, getAdminEmail, getAdminToken } from '@/components/AdminLogin'
import { exportUsers, exportWithdrawals, exportTransactions, generateAdminReport, exportPendingPayments } from '@/services/exportService'

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
    // Diesel Metrics
    totalLiabilityPoints?: number
    adRevenue24h?: number
    payouts24h?: number
    netMargin?: number
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
    riskScore?: number
    fraudSignals?: string[]
    adminNote?: string
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

    // Broadcast notification state
    const [broadcastTitle, setBroadcastTitle] = useState('')
    const [broadcastBody, setBroadcastBody] = useState('')
    const [sendingBroadcast, setSendingBroadcast] = useState(false)
    const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string; totalUsers?: number } | null>(null)

    // Economy Config State
    const [config, setConfig] = useState<any>(null)
    const [isSavingConfig, setIsSavingConfig] = useState(false)

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
        } else if (activeTab === 'economy') {
            loadConfig()
        }
    }, [activeTab, withdrawalFilter])

    const loadConfig = async () => {
        try {
            const token = getAdminToken()
            if (!token) return

            const res = await apiCall('/api/admin/config', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                setConfig(data)
            }
        } catch (error) {
            console.error('Failed to load config', error)
        }
    }

    const handleSaveConfig = async () => {
        if (!config) return
        setIsSavingConfig(true)
        try {
            const token = getAdminToken()
            const res = await apiCall('/api/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            })

            if (res.ok) {
                alert('Configuration saved successfully!')
            } else {
                alert('Failed to save configuration.')
            }
        } catch (error) {
            console.error('Failed to save config', error)
            alert('Error saving configuration.')
        } finally {
            setIsSavingConfig(false)
        }
    }

    const updateConfigRate = (key: string, value: string) => {
        if (!config) return
        setConfig({
            ...config,
            earningRates: {
                ...config.earningRates,
                [key]: parseFloat(value) || 0
            }
        })
    }

    const updateConfigLimit = (key: string, value: string) => {
        if (!config) return
        setConfig({
            ...config,
            dailyLimits: {
                ...config.dailyLimits,
                [key]: parseInt(value) || 0
            }
        })
    }

    const updateGlobalMargin = (value: string) => {
        if (!config) return
        setConfig({
            ...config,
            globalMargin: parseFloat(value) || 1.0
        })
    }

    const updateCountryMultiplier = (code: string, value: string) => {
        if (!config) return
        setConfig({
            ...config,
            countryMultipliers: {
                ...(config.countryMultipliers || {}),
                [code]: parseFloat(value) || 0
            }
        })
    }

    const removeCountryMultiplier = (code: string) => {
        if (!config || !config.countryMultipliers) return
        const newMultipliers = { ...config.countryMultipliers }
        delete newMultipliers[code]
        setConfig({ ...config, countryMultipliers: newMultipliers })
    }

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

    // Handle broadcast notification
    const handleSendBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastBody.trim()) {
            setError('Title and message are required')
            return
        }

        setSendingBroadcast(true)
        setBroadcastResult(null)
        try {
            const response = await authApiCall('/api/cron/broadcast', {
                method: 'POST',
                body: JSON.stringify({
                    title: broadcastTitle,
                    body: broadcastBody,
                }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setBroadcastResult({
                    success: true,
                    message: data.message,
                    totalUsers: data.totalUsers
                })
                setSuccess(`Broadcast sent to ${data.totalUsers} users!`)
                // Clear form after success
                setBroadcastTitle('')
                setBroadcastBody('')
            } else {
                setBroadcastResult({
                    success: false,
                    message: data.error || 'Failed to send broadcast'
                })
                setError(data.error || 'Failed to send broadcast')
            }
        } catch (err) {
            setError('Failed to send broadcast')
            setBroadcastResult({
                success: false,
                message: 'Network error occurred'
            })
        } finally {
            setSendingBroadcast(false)
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
                        <TabsTrigger value="broadcast" className="flex items-center gap-2">
                            <Bell className="h-4 w-4" /> Broadcast
                        </TabsTrigger>
                        <TabsTrigger value="economy" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Economy
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatsCard
                                title="Points Liability"
                                value={stats?.totalLiabilityPoints || 0}
                                icon={Users}
                                format="number"
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Ad Revenue (24h)"
                                value={stats?.adRevenue24h || 0}
                                icon={TrendingUp}
                                format="currency"
                                trendUp={true}
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Payouts (24h)"
                                value={stats?.payouts24h || 0}
                                icon={Wallet}
                                format="currency"
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Net Margin"
                                value={stats?.netMargin || 0}
                                icon={DollarSign}
                                format="currency"
                                highlight={true}
                                className={(stats?.netMargin || 0) < 0 ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-green-500 bg-green-50 dark:bg-green-900/10"}
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
                                    title="Export all withdrawals"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => exportPendingPayments(withdrawals)}
                                    disabled={withdrawals.filter(w => w.status === 'pending').length === 0}
                                    title="Export pending for manual payment"
                                >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Export for Payment
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
                                        <TableHead>Risk</TableHead>
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
                                                <TableCell>
                                                    {(withdrawal.riskScore || 0) > 0 ? (
                                                        <Badge variant={(withdrawal.riskScore || 0) > 50 ? "destructive" : "outline"} className={(withdrawal.riskScore || 0) > 50 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 hover:bg-red-200" : ""}>
                                                            Risk: {withdrawal.riskScore}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">Low</span>
                                                    )}
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

                    {/* BROADCAST TAB */}
                    <TabsContent value="broadcast" className="space-y-6">
                        <div className="max-w-2xl mx-auto">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bell className="h-5 w-5" />
                                        Send Broadcast Notification
                                    </CardTitle>
                                    <CardDescription>
                                        Send a push notification to all users with active devices. This will be delivered to all Android and iOS users.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="broadcast-title">Notification Title *</Label>
                                        <Input
                                            id="broadcast-title"
                                            placeholder="e.g., 🎉 Happy New Year!"
                                            value={broadcastTitle}
                                            onChange={(e) => setBroadcastTitle(e.target.value)}
                                            maxLength={100}
                                        />
                                        <p className="text-xs text-muted-foreground">{broadcastTitle.length}/100 characters</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="broadcast-body">Notification Message *</Label>
                                        <textarea
                                            id="broadcast-body"
                                            className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            placeholder="e.g., Earn double points today! Don't miss out on our special New Year bonus."
                                            value={broadcastBody}
                                            onChange={(e) => setBroadcastBody(e.target.value)}
                                            maxLength={500}
                                        />
                                        <p className="text-xs text-muted-foreground">{broadcastBody.length}/500 characters</p>
                                    </div>

                                    {/* Preview */}
                                    {(broadcastTitle || broadcastBody) && (
                                        <div className="p-4 bg-muted rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                                            <div className="bg-background rounded-lg p-3 shadow-sm border">
                                                <p className="font-semibold text-sm">{broadcastTitle || 'Title...'}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{broadcastBody || 'Message...'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Result Message */}
                                    {broadcastResult && (
                                        <div className={`p-4 rounded-lg ${broadcastResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                                            <div className="flex items-center gap-2">
                                                {broadcastResult.success ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-600" />
                                                )}
                                                <span className={broadcastResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                                    {broadcastResult.message}
                                                </span>
                                            </div>
                                            {broadcastResult.totalUsers && (
                                                <p className="text-sm text-muted-foreground mt-1 ml-7">
                                                    Delivered to {broadcastResult.totalUsers} user{broadcastResult.totalUsers !== 1 ? 's' : ''}.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleSendBroadcast}
                                        disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastBody.trim()}
                                    >
                                        {sendingBroadcast ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Sending to all users...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Broadcast to All Users
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Tips Card */}
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle className="text-sm">Tips for Effective Notifications</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground space-y-2">
                                    <p>• Use emojis 🎉 to make notifications stand out</p>
                                    <p>• Keep titles under 50 characters for best display</p>
                                    <p>• Create urgency: "Limited time", "Today only", "Last chance"</p>
                                    <p>• Be specific about the benefit: points, rewards, bonuses</p>
                                    <p>• Avoid sending too many notifications (max 2-3 per day)</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ECONOMY TAB */}
                    <TabsContent value="economy" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight">Economy Control</h3>
                                <p className="text-muted-foreground">Manage earning rates and daily limits for users.</p>
                            </div>
                            <Button onClick={handleSaveConfig} disabled={isSavingConfig || !config}>
                                {isSavingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>

                        {config ? (
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Diesel Control: Global Margin */}
                                <Card className="border-l-4 border-l-red-500 bg-red-50/10 md:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-red-600">
                                            <AlertCircle className="h-5 w-5" />
                                            Profit Margin "Kill Switch"
                                        </CardTitle>
                                        <CardDescription>
                                            Global Margin Adjustment. Lowering this increases the cost of rewards for everyone.
                                            Current Factor: {config.globalMargin || 1.0}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold">0.1</span>
                                                <input
                                                    type="range"
                                                    min="0.1"
                                                    max="2.0"
                                                    step="0.05"
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                                                    value={config.globalMargin || 1.0}
                                                    onChange={(e) => updateGlobalMargin(e.target.value)}
                                                />
                                                <span className="text-sm font-bold">2.0</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                1.0 = Standard. 0.8 = Users pay 20% more points for same $ value.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Diesel Control: Country Matrix */}
                                <Card className="md:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Globe className="h-5 w-5 text-indigo-500" />
                                            Global Currency Matrix
                                        </CardTitle>
                                        <CardDescription>
                                            Country-specific exchange rate multipliers.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Country Code</TableHead>
                                                    <TableHead>Multiplier</TableHead>
                                                    <TableHead>Value of 1000 pts</TableHead>
                                                    <TableHead>Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(config.countryMultipliers || {}).map(([code, mult]) => (
                                                    <TableRow key={code}>
                                                        <TableCell className="font-mono">{code}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                className="w-24 h-8"
                                                                value={mult as number}
                                                                step="0.01"
                                                                onChange={(e) => updateCountryMultiplier(code, e.target.value)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            ${((1000 / 10000) * (mult as number)).toFixed(2)} USD (approx)
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="sm" onClick={() => removeCountryMultiplier(code)}>
                                                                <X className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow>
                                                    <TableCell colSpan={4}>
                                                        <div className="flex gap-2 items-center">
                                                            <Input
                                                                placeholder="Code (e.g. GH)"
                                                                className="w-24 h-8"
                                                                id="new-country-code"
                                                            />
                                                            <Button size="sm" variant="outline" onClick={() => {
                                                                const el = document.getElementById('new-country-code') as HTMLInputElement
                                                                if (el && el.value) {
                                                                    updateCountryMultiplier(el.value.toUpperCase(), '1.0')
                                                                    el.value = ''
                                                                }
                                                            }}>Add Country</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-green-500" />
                                            Earning Rates (Points)
                                        </CardTitle>
                                        <CardDescription>
                                            Set how many points users earn for each action. (1000 pts = $0.10)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Watch Ad</Label>
                                                <Input
                                                    type="number"
                                                    value={config.earningRates?.watchAd ?? 0}
                                                    onChange={(e) => updateConfigRate('watchAd', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Read News</Label>
                                                <Input
                                                    type="number"
                                                    value={config.earningRates?.readNews ?? 0}
                                                    onChange={(e) => updateConfigRate('readNews', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Trivia Correct Answer</Label>
                                                <Input
                                                    type="number"
                                                    value={config.earningRates?.triviaCorrect ?? 0}
                                                    onChange={(e) => updateConfigRate('triviaCorrect', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Trivia 5/5 Bonus</Label>
                                                <Input
                                                    type="number"
                                                    value={config.earningRates?.triviaBonus ?? 0}
                                                    onChange={(e) => updateConfigRate('triviaBonus', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Game Playtime (per min)</Label>
                                                <Input
                                                    type="number"
                                                    value={config.earningRates?.gamePlaytimePerMin ?? 0}
                                                    onChange={(e) => updateConfigRate('gamePlaytimePerMin', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Referral Signup Bonus</Label>
                                                <Input
                                                    type="number"
                                                    value={config.earningRates?.referralSignup ?? 0}
                                                    onChange={(e) => updateConfigRate('referralSignup', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Ban className="h-5 w-5 text-red-500" />
                                            Daily Limits
                                        </CardTitle>
                                        <CardDescription>
                                            Cap the maximum actions a user can perform per day.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Max Ads per Day</Label>
                                            <Input
                                                type="number"
                                                value={config.dailyLimits?.maxAds ?? 0}
                                                onChange={(e) => updateConfigLimit('maxAds', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max News Stories per Day</Label>
                                            <Input
                                                type="number"
                                                value={config.dailyLimits?.maxNews ?? 0}
                                                onChange={(e) => updateConfigLimit('maxNews', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Surveys per Day</Label>
                                            <Input
                                                type="number"
                                                value={config.dailyLimits?.maxSurveys ?? 0}
                                                onChange={(e) => updateConfigLimit('maxSurveys', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Game Minutes per Day</Label>
                                            <Input
                                                type="number"
                                                value={config.dailyLimits?.maxGamesMinutes ?? 0}
                                                onChange={(e) => updateConfigLimit('maxGamesMinutes', e.target.value)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="md:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Settings className="h-5 w-5 text-blue-500" />
                                            Advanced & Random Ranges
                                        </CardTitle>
                                        <CardDescription>
                                            Configure ranges for variable rewards.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Daily Spin Range</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="space-y-2 flex-1">
                                                    <Label>Min Points</Label>
                                                    <Input
                                                        type="number"
                                                        value={config.earningRates?.dailySpinMin ?? 0}
                                                        onChange={(e) => updateConfigRate('dailySpinMin', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2 flex-1">
                                                    <Label>Max Points</Label>
                                                    <Input
                                                        type="number"
                                                        value={config.earningRates?.dailySpinMax ?? 0}
                                                        onChange={(e) => updateConfigRate('dailySpinMax', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Offerwall Range</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="space-y-2 flex-1">
                                                    <Label>Min Points</Label>
                                                    <Input
                                                        type="number"
                                                        value={config.earningRates?.offerwallMin ?? 0}
                                                        onChange={(e) => updateConfigRate('offerwallMin', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2 flex-1">
                                                    <Label>Max Points</Label>
                                                    <Input
                                                        type="number"
                                                        value={config.earningRates?.offerwallMax ?? 0}
                                                        onChange={(e) => updateConfigRate('offerwallMax', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}
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

                            {/* Fraud Analysis Section */}
                            {(selectedWithdrawal.riskScore || 0) > 0 && (
                                <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-800">
                                    <Label className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Fraud Analysis (Risk: {selectedWithdrawal.riskScore})
                                    </Label>
                                    <div className="text-sm space-y-1 text-red-600 dark:text-red-300">
                                        {selectedWithdrawal.fraudSignals?.map((sig, i) => (
                                            <p key={i} className="flex items-center gap-2">• {sig}</p>
                                        ))}
                                        {!selectedWithdrawal.fraudSignals?.length && <p>High risk detected.</p>}
                                    </div>
                                    {selectedWithdrawal.adminNote && <p className="text-xs text-muted-foreground pt-1 border-t border-red-200 dark:border-red-800 mt-2">Note: {selectedWithdrawal.adminNote}</p>}
                                </div>
                            )}

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
    loading,
    className
}: {
    title: string
    value: number
    icon: any
    trend?: string
    trendUp?: boolean
    highlight?: boolean
    format?: 'default' | 'number' | 'currency'
    loading?: boolean
    className?: string
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
        <Card className={`${highlight ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : ''} ${className || ''}`}>
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
