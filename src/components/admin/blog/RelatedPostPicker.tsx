import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Check, X } from "lucide-react"
import { apiJson } from '@/lib/api-client'
import { BlogPost } from '@/types/blog'
import { Badge } from '@/components/ui/badge'

interface RelatedPostPickerProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    adminToken: string
    selectedIds: string[]
    onSelect: (ids: string[]) => void
}

export default function RelatedPostPicker({
    isOpen,
    onOpenChange,
    adminToken,
    selectedIds,
    onSelect
}: RelatedPostPickerProps) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(false)

    // A map of id -> title for display purposes (could be optimized)
    const [selectedTitles, setSelectedTitles] = useState<Record<string, string>>({})

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            // In a real app we'd search via API. Here we fetch all and filter client side 
            // OR use the existing listing API.
            const res = await apiJson<{ success: boolean, data: BlogPost[] }>('/api/admin/blog', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) {
                const filtered = res.data.filter(p =>
                    p.title.toLowerCase().includes(search.toLowerCase()) &&
                    p.status === 'published'
                )
                setResults(filtered)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const toggleSelection = (post: BlogPost) => {
        const newIds = selectedIds.includes(post.id)
            ? selectedIds.filter(id => id !== post.id)
            : [...selectedIds, post.id]

        onSelect(newIds)

        // Store title for display
        if (!selectedIds.includes(post.id)) {
            setSelectedTitles(prev => ({ ...prev, [post.id]: post.title }))
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Select Related Posts</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search published posts..."
                        />
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                    </form>

                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {results.length > 0 ? (
                            results.map(post => {
                                const isSelected = selectedIds.includes(post.id)
                                return (
                                    <div
                                        key={post.id}
                                        className={`p-3 border rounded-md cursor-pointer hover:bg-muted flex items-center justify-between ${isSelected ? 'bg-primary/10 border-primary' : ''}`}
                                        onClick={() => toggleSelection(post)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{post.title}</p>
                                            <span className="text-xs text-muted-foreground">/{post.slug}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">
                                {loading ? 'Searching...' : 'Search for posts to link.'}
                            </p>
                        )}
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                        {selectedIds.length} posts selected
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
