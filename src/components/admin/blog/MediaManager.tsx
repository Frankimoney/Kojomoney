import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Image as ImageIcon, Link as LinkIcon, CheckCircle, AlertTriangle } from 'lucide-react'

interface MediaManagerProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (data: { url: string; alt: string; title: string; caption?: string }) => void
}

export default function MediaManager({ isOpen, onOpenChange, onSelect }: MediaManagerProps) {
    const [url, setUrl] = useState('')
    const [alt, setAlt] = useState('')
    const [title, setTitle] = useState('')
    const [caption, setCaption] = useState('')
    const [error, setError] = useState('')

    const handleInsert = () => {
        setError('')
        if (!url) {
            setError('Image URL is required.')
            return
        }
        if (!alt) {
            setError('Alt Text is REQUIRED for SEO.')
            return
        }
        if (!title) {
            setError('Image Title is REQUIRED.')
            return
        }

        onSelect({ url, alt, title, caption })
        reset()
        onOpenChange(false)
    }

    const reset = () => {
        setUrl('')
        setAlt('')
        setTitle('')
        setCaption('')
        setError('')
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Insert Media</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="url" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url">External URL</TabsTrigger>
                        <TabsTrigger value="upload" disabled>Upload (Coming Soon)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="url" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Image URL *</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://example.com/image.jpg"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                                {url && (
                                    <div className="h-10 w-10 relative border rounded overflow-hidden shrink-0 bg-muted">
                                        <img src={url} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    Alt Text <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="Describe image for SEO"
                                    value={alt}
                                    onChange={(e) => setAlt(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Crucial for accessibility and SEO.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    Image Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="Tooltip text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Caption (Optional)</Label>
                            <Input
                                placeholder="Displayed below image"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                <AlertTriangle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleInsert}>Insert Image</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
