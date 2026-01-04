import React, { useState, useEffect } from 'react'
import { apiJson } from '@/lib/api-client'
import { BlogPost } from '@/types/blog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Trash2, Plus, ExternalLink, Eye, AlertCircle } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import PostEditor from './PostEditor'
import BlockManager from './BlockManager'
import BlogSettings from './BlogSettings'
import { format } from 'date-fns'

interface BlogManagerProps {
    adminToken: string
}

export default function BlogManager({ adminToken }: BlogManagerProps) {
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('all')

    const fetchPosts = async () => {
        setLoading(true)
        try {
            // Using admin API which lists all
            const res = await apiJson<{ success: boolean, data: BlogPost[] }>('/api/admin/blog', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) {
                setPosts(res.data)
            }
        } catch (error) {
            console.error('Failed to fetch posts', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (view === 'list') {
            fetchPosts()
        }
    }, [view])

    const handleCreate = () => {
        setSelectedPostId(null)
        setView('create')
    }

    const handleEdit = (id: string) => {
        setSelectedPostId(id)
        setView('edit')
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return
        try {
            await apiJson(`/api/admin/blog/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            fetchPosts()
        } catch (error) {
            console.error('Failed to delete post', error)
        }
    }

    const filteredPosts = posts.filter(p => {
        if (filterStatus === 'all') return true
        return p.status === filterStatus
    })

    if (view === 'create' || view === 'edit') {
        return (
            <PostEditor
                adminToken={adminToken}
                postId={selectedPostId}
                onBack={() => setView('list')}
                onPostCreated={(id) => handleEdit(id)}
            />
        )
    }

    return (
        <Card className="w-full border shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
                <div>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        Content Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Manage your blog posts, blocks, and settings</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none">
                    <Plus className="h-4 w-4" /> New Post
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="all" onValueChange={setFilterStatus} className="w-full">
                    <div className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                        <TabsList className="bg-white dark:bg-slate-800 border p-1 h-auto">
                            <TabsTrigger value="all" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-4 py-1.5 h-auto">All Posts</TabsTrigger>
                            <TabsTrigger value="published" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-600 px-4 py-1.5 h-auto">Published</TabsTrigger>
                            <TabsTrigger value="draft" className="data-[state=active]:bg-gray-100 px-4 py-1.5 h-auto">Drafts</TabsTrigger>
                            <TabsTrigger value="pending_review" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-4 py-1.5 h-auto">Review</TabsTrigger>
                            <TabsTrigger value="blocks" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-4 py-1.5 h-auto">Blocks</TabsTrigger>
                            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-100 px-4 py-1.5 h-auto">Settings</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6">
                        {filterStatus === 'settings' ? (
                            <BlogSettings adminToken={adminToken} />
                        ) : filterStatus === 'blocks' ? (
                            <BlockManager adminToken={adminToken} />
                        ) : (
                            <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                                        <TableRow>
                                            <TableHead className="pl-6">Post Details</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Author</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Performance</TableHead>
                                            <TableHead className="text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-48">
                                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                                        Loading Content...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredPosts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-48 text-muted-foreground">
                                                    No posts found matching this filter.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPosts.map((post) => (
                                                <TableRow key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => handleEdit(post.id)}>
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="font-semibold text-base group-hover:text-indigo-600 transition-colors">
                                                                {post.title}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border font-mono">/{post.slug}</span>
                                                                {post.tags && post.tags.length > 0 && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                        <span>{post.tags[0]}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={
                                                            post.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' :
                                                                post.status === 'pending_review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                                                    post.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                        }>
                                                            {post.status.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-bold">
                                                                {(post.author?.name || 'A').charAt(0)}
                                                            </div>
                                                            <span className="text-sm">{post.author?.name || 'Admin'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs">
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                {post.publishedAt ? format(post.publishedAt, 'MMM d, yyyy') : 'Unpublished'}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {post.updatedAt ? `Updated ${format(post.updatedAt, 'MMM d')}` : ''}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const lastDate = post.updatedAt || post.publishedAt
                                                            if (!lastDate) return <span className="text-muted-foreground text-xs">-</span>
                                                            const days = differenceInDays(new Date(), new Date(lastDate))
                                                            if (days > 180) {
                                                                return (
                                                                    <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 text-[10px] gap-1 pl-1">
                                                                        <AlertCircle className="h-3 w-3" /> Stale
                                                                    </Badge>
                                                                )
                                                            } else if (days < 7) {
                                                                return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">New</Badge>
                                                            }
                                                            return <span className="text-xs text-muted-foreground">Normal</span>
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                            {post.status === 'published' && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" asChild>
                                                                    <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" title="View Live">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-indigo-600" onClick={() => handleEdit(post.id)} title="Edit">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600 text-muted-foreground hover:bg-red-50" onClick={() => handleDelete(post.id)} title="Delete">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    )
}
