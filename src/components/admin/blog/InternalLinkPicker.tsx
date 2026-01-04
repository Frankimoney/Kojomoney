import React, { useState, useEffect } from 'react'
import { apiCall } from '@/lib/api-client'
import { BlogPost } from '@/types/blog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Search, Link as LinkIcon, Loader2 } from 'lucide-react'

interface InternalLinkPickerProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (post: BlogPost) => void
    adminToken: string
}

export default function InternalLinkPicker({ isOpen, onOpenChange, onSelect, adminToken }: InternalLinkPickerProps) {
    const [search, setSearch] = useState('')
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchPosts()
        }
    }, [isOpen, search])

    const fetchPosts = async () => {
        setLoading(true)
        try {
            // Use admin API for full list, or public search API if exits
            // Admin list endpoint supports search
            const res = await apiCall(`/api/admin/blog?search=${encodeURIComponent(search)}&limit=10`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) {
                setPosts(res.data)
            }
        } catch (error) {
            console.error('Failed to search posts', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Insert Internal Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search posts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center p-4 text-sm text-muted-foreground">
                                No posts found.
                            </div>
                        ) : (
                            posts.map(post => (
                                <div
                                    key={post.id}
                                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer group"
                                    onClick={() => {
                                        onSelect(post)
                                        onOpenChange(false)
                                    }}
                                >
                                    <div>
                                        <div className="font-medium text-sm">{post.title}</div>
                                        <div className="text-xs text-muted-foreground">/blog/{post.slug}</div>
                                    </div>
                                    <LinkIcon className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
