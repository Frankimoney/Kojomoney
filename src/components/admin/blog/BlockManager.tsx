import React, { useState, useEffect } from 'react'
import { apiCall, apiJson } from '@/lib/api-client'
import { ContentBlock } from '@/types/blog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Edit, Trash2, Plus, Copy, Box } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BlockManagerProps {
    adminToken: string
}

export default function BlockManager({ adminToken }: BlockManagerProps) {
    const [blocks, setBlocks] = useState<ContentBlock[]>([])
    const [loading, setLoading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingBlock, setEditingBlock] = useState<Partial<ContentBlock> | null>(null)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()

    const fetchBlocks = async () => {
        setLoading(true)
        try {
            const res = await apiJson('/api/admin/blog/blocks', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) {
                setBlocks(res.data)
            }
        } catch (error) {
            console.error('Failed to fetch blocks', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBlocks()
    }, [])

    const handleSave = async () => {
        if (!editingBlock?.name || !editingBlock?.content) return
        setSaving(true)
        try {
            await apiCall('/api/admin/blog/blocks', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify(editingBlock)
            })
            setIsDialogOpen(false)
            fetchBlocks()
            toast({ title: 'Success', description: 'Block saved successfully' })
        } catch (error) {
            console.error('Failed to save block', error)
            toast({ title: 'Error', description: 'Failed to save block', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this block?')) return
        try {
            await apiCall(`/api/admin/blog/blocks?id=${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            fetchBlocks()
        } catch (error) {
            console.error('Failed to delete block', error)
        }
    }

    const copyShortcode = (id: string) => {
        navigator.clipboard.writeText(`[block id="${id}"]`)
        toast({ title: 'Copied', description: 'Shortcode copied to clipboard' })
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Reusable Blocks</h3>
                <Button onClick={() => { setEditingBlock({}); setIsDialogOpen(true) }} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> New Block
                </Button>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
                <div className="rounded-xl border bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                            <TableRow>
                                <TableHead className="w-[200px]">Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Shortcode</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && blocks.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-32 text-muted-foreground">Loading...</TableCell></TableRow>
                            ) : blocks.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No blocks yet.</TableCell></TableRow>
                            ) : (
                                blocks.map((block) => (
                                    <TableRow key={block.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                                    <Box className="h-4 w-4" />
                                                </div>
                                                {block.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                                                {block.category || 'General'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <code
                                                className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs font-mono text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors border select-all"
                                                onClick={() => copyShortcode(block.id)}
                                                title="Click to copy"
                                            >
                                                [block id="{block.id}"]
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-indigo-600" onClick={() => { setEditingBlock(block); setIsDialogOpen(true) }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600 text-muted-foreground" onClick={() => handleDelete(block.id)}>
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
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBlock?.id ? 'Edit Block' : 'New Block'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Block Name</label>
                            <Input
                                value={editingBlock?.name || ''}
                                onChange={(e) => setEditingBlock(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Newsletter Signup"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Input
                                value={editingBlock?.category || ''}
                                onChange={(e) => setEditingBlock(prev => ({ ...prev, category: e.target.value }))}
                                placeholder="e.g., CTA"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Content (HTML)</label>
                            <Textarea
                                value={editingBlock?.content || ''}
                                onChange={(e) => setEditingBlock(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="<div class='cta'>...</div>"
                                className="min-h-[150px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Supports HTML. Used for inserting complex layouts repeated across posts.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Block'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
