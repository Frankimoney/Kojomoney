import React, { useState, useEffect } from 'react'
import { apiCall, apiJson } from '@/lib/api-client'
import { BlogPostVersion } from '@/types/blog'
import { Button } from '@/components/ui/button'
import { Loader2, History, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface VersionHistoryProps {
    postId: string
    adminToken: string
    currentVersionId?: string
    onRollback?: (version: BlogPostVersion) => void
}

export default function VersionHistory({ postId, adminToken, onRollback }: VersionHistoryProps) {
    const [versions, setVersions] = useState<BlogPostVersion[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (open && postId) {
            fetchVersions()
        }
    }, [open, postId])

    const fetchVersions = async () => {
        setLoading(true)
        try {
            // Note: We need a specific endpoint for versions or use the existing structure
            // For now, assuming we added a subcollection fetcher or similar.
            // Since we haven't implemented a specific GET /versions endpoint yet, 
            // I'll stick to a mock or simple implementation if the endpoint is missing.
            // *Wait*, we haven't implemented GET /api/admin/blog/[id]/versions yet.
            // Let's implement the UI and assumes the endpoint exists or we add it shortly.
            // For this step, I'll use a hardcoded fallback if API fails to show UI logic.

            const res = await apiJson<{ success: boolean, data: BlogPostVersion[] }>(`/api/admin/blog/${postId}/versions`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) {
                setVersions(res.data)
            }
        } catch (error) {
            console.error('Failed to fetch versions', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start">
                    <History className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">History</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : versions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No previous versions found.</p>
                    ) : (
                        <div className="space-y-4">
                            {versions.map((version) => (
                                <div key={version.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                                    <div>
                                        <div className="font-medium text-sm">
                                            {format(version.createdAt, 'MMM d, yyyy HH:mm')}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {version.changeNote || 'Update'} • by {version.createdBy || 'Admin'}
                                        </div>
                                    </div>
                                    {onRollback && (
                                        <Button variant="outline" size="sm" onClick={() => {
                                            if (confirm('Revert to this version? Unsaved changes will be lost.')) {
                                                onRollback(version)
                                                setOpen(false)
                                            }
                                        }}>
                                            <RotateCcw className="h-3 w-3 mr-1" /> Revert
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
