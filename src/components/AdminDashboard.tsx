'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database, Users, TrendingUp, DollarSign, Eye, Settings, BarChart3, Activity } from 'lucide-react'

interface AdminData {
    overview?: {
        totalUsers: number
        totalNews: number
        totalTrivia: number
        totalWithdrawals: number
        totalPointsInSystem: number
        activeUsersThisWeek: number
    }
    stats?: {
        newUsersThisWeek: number
        newUsersThisMonth: number
        totalPointsInSystem: number
        pointsEarnedThisWeek: number
        totalWithdrawalsThisMonth: number
        topUsers: Array<{
            email: string
            name?: string
            totalPoints: number
            dailyStreak: number
            createdAt: string
        }>
    }
    users?: Array<any>
    data?: Array<any>
}

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview')
    const [selectedTable, setSelectedTable] = useState('users')
    const [adminData, setAdminData] = useState<AdminData>({})
    const [ingestStats, setIngestStats] = useState<{ inserted: number; updated: number; processed: number } | null>(null)
    const [ingestLoading, setIngestLoading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAdminData = async (action: string, table?: string) => {
        setLoading(true)
        setError(null)

        try {
            const url = table
                ? `/api/admin?action=${action}&table=${table}`
                : `/api/admin?action=${action}`

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer admin-earnapp-2024'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch admin data')
            }

            const data = await response.json()

            if (data.error) {
                throw new Error(data.error)
            }

            setAdminData(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAdminData('overview')
    }, [])

    useEffect(() => {
        if (activeTab === 'table') {
            fetchAdminData('table', selectedTable)
        } else if (activeTab === 'users') {
            fetchAdminData('users')
        } else if (activeTab === 'stats') {
            fetchAdminData('stats')
        }
    }, [activeTab, selectedTable])

    const refreshFeeds = async () => {
        try {
            setIngestLoading(true)
            setError(null)
            const res = await fetch('/api/news?action=ingest&source=rss&limit=20&points=5', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer admin-earnapp-2024' }
            })
            const data = await res.json()
            if (!res.ok || data.error) throw new Error(data.error || 'Ingest failed')
            setIngestStats({ inserted: data.inserted || 0, updated: data.updated || 0, processed: data.processed || 0 })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIngestLoading(false)
        }
    }

    const OverviewTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminData.overview?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        +{adminData.overview?.activeUsersThisWeek || 0} active this week
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminData.overview?.totalPointsInSystem || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        In circulation
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">News Stories</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminData.overview?.totalNews || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Published stories
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Trivia Sets</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminData.overview?.totalTrivia || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Daily trivia created
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminData.overview?.totalWithdrawals || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Total withdrawal requests
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminData.overview?.activeUsersThisWeek || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Active this week
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Feeds</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button onClick={refreshFeeds} disabled={ingestLoading}>
                        {ingestLoading ? 'Refreshing...' : 'Refresh Feeds'}
                    </Button>
                    {ingestStats && (
                        <div className="text-xs text-muted-foreground">
                            Updated: {ingestStats.updated}, Inserted: {ingestStats.inserted}, Processed: {ingestStats.processed}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )

    const TableTab = () => (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="news_reads">News Reads</SelectItem>
                        <SelectItem value="ad_views">Ad Views</SelectItem>
                        <SelectItem value="withdrawals">Withdrawals</SelectItem>
                        <SelectItem value="daily_activities">Daily Activities</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={() => fetchAdminData('table', selectedTable)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {selectedTable === 'users' && (
                                <>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Streak</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                </>
                            )}
                            {selectedTable === 'news_reads' && (
                                <>
                                    <TableHead>User</TableHead>
                                    <TableHead>Story</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead>Points</TableHead>
                                </>
                            )}
                            {selectedTable === 'ad_views' && (
                                <>
                                    <TableHead>User</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Status</TableHead>
                                </>
                            )}
                            {selectedTable === 'withdrawals' && (
                                <>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </>
                            )}
                            {selectedTable === 'daily_activities' && (
                                <>
                                    <TableHead>User</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Ads</TableHead>
                                    <TableHead>Stories</TableHead>
                                    <TableHead>Trivia</TableHead>
                                    <TableHead>Points</TableHead>
                                </>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    Loading data...
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-red-600">
                                    Error: {error}
                                </TableCell>
                            </TableRow>
                        ) : adminData.data && adminData.data.length > 0 ? (
                            adminData.data.map((row, index) => (
                                <TableRow key={index}>
                                    {selectedTable === 'users' && (
                                        <>
                                            <TableCell>{row.email}</TableCell>
                                            <TableCell>{row.name || '-'}</TableCell>
                                            <TableCell>{row.totalPoints}</TableCell>
                                            <TableCell>{row.dailyStreak}</TableCell>
                                            <TableCell>
                                                <Badge variant={row.isBlocked ? 'destructive' : 'default'}>
                                                    {row.isBlocked ? 'Blocked' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                                        </>
                                    )}
                                    {selectedTable === 'news_reads' && (
                                        <>
                                            <TableCell>{row.user?.email}</TableCell>
                                            <TableCell className="max-w-xs truncate">{row.story?.title}</TableCell>
                                            <TableCell>{new Date(row.startedAt).toLocaleString()}</TableCell>
                                            <TableCell>{row.completedAt ? new Date(row.completedAt).toLocaleString() : '-'}</TableCell>
                                            <TableCell>{row.pointsEarned || 0}</TableCell>
                                        </>
                                    )}
                                    {selectedTable === 'ad_views' && (
                                        <>
                                            <TableCell>{row.user?.email}</TableCell>
                                            <TableCell>{new Date(row.startedAt).toLocaleString()}</TableCell>
                                            <TableCell>{row.completedAt ? new Date(row.completedAt).toLocaleString() : '-'}</TableCell>
                                            <TableCell>{row.pointsEarned || 0}</TableCell>
                                            <TableCell>
                                                <Badge variant={row.isConfirmed ? 'default' : 'secondary'}>
                                                    {row.isConfirmed ? 'Confirmed' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                        </>
                                    )}
                                    {selectedTable === 'withdrawals' && (
                                        <>
                                            <TableCell>{row.user?.email}</TableCell>
                                            <TableCell>₦{row.amount}</TableCell>
                                            <TableCell>{row.bankName}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    row.status === 'approved' ? 'default' :
                                                        row.status === 'rejected' ? 'destructive' : 'secondary'
                                                }>
                                                    {row.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                                        </>
                                    )}
                                    {selectedTable === 'daily_activities' && (
                                        <>
                                            <TableCell>{row.user?.email}</TableCell>
                                            <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                                            <TableCell>{row.adsWatched}</TableCell>
                                            <TableCell>{row.storiesRead}</TableCell>
                                            <TableCell>{row.triviaPlayed ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{row.pointsEarned}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    No data found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage your Kojomoney database and users</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="table">Table Data</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab />
                    </TabsContent>

                    <TabsContent value="table">
                        <TableTab />
                    </TabsContent>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>View and manage all registered users</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">User management features coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                        <Card>
                            <CardHeader>
                                <CardTitle>Statistics & Analytics</CardTitle>
                                <CardDescription>Detailed insights about your app performance</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Advanced analytics coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default AdminDashboard
