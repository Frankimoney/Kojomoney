import React, { useState } from 'react'
import { apiJson } from '@/lib/api-client'
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
import { Image as ImageIcon, Video, AlertTriangle } from 'lucide-react'

interface MediaManagerProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (data: {
        url: string;
        alt: string;
        title: string;
        caption?: string;
        type?: 'image' | 'video';
        embedType?: 'iframe' | 'video' | 'image'
    }) => void
    adminToken: string
}

export default function MediaManager({ isOpen, onOpenChange, onSelect, adminToken }: MediaManagerProps) {
    const [tab, setTab] = useState('url')
    const [uploading, setUploading] = useState(false)
    const [url, setUrl] = useState('')
    const [alt, setAlt] = useState('')
    const [title, setTitle] = useState('')
    const [caption, setCaption] = useState('')
    const [error, setError] = useState('')
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
    const [forceType, setForceType] = useState<'image' | 'video' | 'auto'>('auto') // User override for Google Drive

    // Detect if URL is from Google Drive
    const isGoogleDriveUrl = (urlStr: string): boolean => {
        return urlStr.includes('drive.google.com')
    }

    // Detect if URL is from YouTube
    const isYouTubeUrl = (urlStr: string): boolean => {
        return urlStr.includes('youtube.com') || urlStr.includes('youtu.be')
    }

    // Extract Google Drive file ID
    const extractGoogleDriveId = (urlStr: string): string => {
        const match1 = urlStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
        const match2 = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/)
        if (match1) return match1[1]
        if (match2) return match2[1]
        return ''
    }

    // Convert Google Drive share link to direct image URL
    // Note: Google Drive has CORS restrictions. For best results:
    // 1. The file must be set to "Anyone with the link can view"
    // 2. We use the thumbnail URL which is more reliable for embedding
    const convertGoogleDriveToImageUrl = (urlStr: string): string => {
        const fileId = extractGoogleDriveId(urlStr)
        if (fileId) {
            // Use lh3.googleusercontent.com for better CORS compatibility
            // This returns a high-res thumbnail that works for most images
            return `https://lh3.googleusercontent.com/d/${fileId}=w2000`
        }
        return urlStr
    }

    // Alternative format for direct download (may have CORS issues)
    const getGoogleDriveFallbackUrl = (fileId: string): string => {
        return `https://drive.google.com/uc?export=view&id=${fileId}`
    }

    // Convert Google Drive share link to embed URL (for videos)
    const convertGoogleDriveToVideoUrl = (urlStr: string): string => {
        const fileId = extractGoogleDriveId(urlStr)
        if (fileId) {
            // Preview URL for video embedding
            return `https://drive.google.com/file/d/${fileId}/preview`
        }
        return urlStr
    }

    // Detect media type from URL
    const detectMediaType = (urlStr: string): 'image' | 'video' => {
        const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogg', '.m4v']
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
        const lowerUrl = urlStr.toLowerCase()

        // YouTube is always video
        if (isYouTubeUrl(urlStr)) {
            return 'video'
        }

        // Google Drive - check for user override first
        if (isGoogleDriveUrl(urlStr)) {
            if (forceType !== 'auto') return forceType
            // Default to image for Google Drive (user can switch)
            return 'image'
        }

        // Check extensions
        if (videoExts.some(ext => lowerUrl.includes(ext))) return 'video'
        if (imageExts.some(ext => lowerUrl.includes(ext))) return 'image'

        return 'image' // Default to image
    }



    const handleInsert = () => {
        setError('')
        if (!url) {
            setError('Media URL is required.')
            return
        }
        if (!alt) {
            setError('Alt Text / Description is REQUIRED for SEO.')
            return
        }
        if (!title) {
            setError('Title is REQUIRED.')
            return
        }

        const type = detectMediaType(url)

        // Convert URLs to proper format
        let finalUrl = url
        let embedType: 'iframe' | 'video' | 'image' | undefined

        if (isGoogleDriveUrl(url)) {
            if (type === 'video') {
                // Video: use iframe embed
                finalUrl = convertGoogleDriveToVideoUrl(url)
                embedType = 'iframe'
            } else {
                // Image: use direct view URL
                finalUrl = convertGoogleDriveToImageUrl(url)
                embedType = 'image'
            }
        } else if (isYouTubeUrl(url)) {
            embedType = 'iframe' // YouTube always needs iframe
        } else if (type === 'video') {
            embedType = 'video'
        } else {
            embedType = 'image'
        }

        onSelect({ url: finalUrl, alt, title, caption, type, embedType })
        reset()
        onOpenChange(false)
    }



    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 50MB limit for videos, 10MB for images
        const isVideo = file.type.startsWith('video/')
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024

        if (file.size > maxSize) {
            setError(`File size too large (max ${isVideo ? '50MB' : '10MB'})`)
            return
        }

        setUploading(true)
        setError('')

        try {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64 = reader.result as string
                const res = await apiJson<{ success: boolean; url: string; type: string }>('/api/admin/media/upload', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify({
                        file: base64,
                        filename: file.name,
                        mimeType: file.type
                    })
                })

                if (res.success) {
                    setUrl(res.url)
                    setMediaType(res.type as 'image' | 'video')
                    // Auto-fill metadata from filename
                    const name = file.name.split('.')[0].replace(/[-_]/g, ' ')
                    setAlt(name)
                    setTitle(name)
                    setTab('url') // Switch to URL tab to review and insert
                } else {
                    setError('Upload failed')
                }
                setUploading(false)
            }
        } catch (err) {
            console.error(err)
            setError('Upload error')
            setUploading(false)
        }
    }

    const reset = () => {
        setUrl('')
        setAlt('')
        setTitle('')
        setCaption('')
        setError('')
        setMediaType('image')
        setForceType('auto')
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Insert Media</DialogTitle>
                </DialogHeader>

                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url">External URL / Preview</TabsTrigger>
                        <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    </TabsList>

                    <TabsContent value="url" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Media URL (Image or Video) *</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://example.com/media.mp4 or .jpg or Google Drive link"
                                    value={url}
                                    onChange={(e) => {
                                        setUrl(e.target.value)
                                        setMediaType(detectMediaType(e.target.value))
                                        // Reset force type when URL changes
                                        if (!isGoogleDriveUrl(e.target.value)) {
                                            setForceType('auto')
                                        }
                                    }}
                                />
                                {url && (
                                    <div className="h-16 w-24 relative border rounded overflow-hidden shrink-0 bg-muted">
                                        {detectMediaType(url) === 'video' ? (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-xs">
                                                <Video className="h-6 w-6" />
                                            </div>
                                        ) : (
                                            <img
                                                src={isGoogleDriveUrl(url) ? convertGoogleDriveToImageUrl(url) : url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Show error placeholder
                                                    const target = e.currentTarget
                                                    target.style.display = 'none'
                                                    const parent = target.parentElement
                                                    if (parent && !parent.querySelector('.error-placeholder')) {
                                                        const errorDiv = document.createElement('div')
                                                        errorDiv.className = 'error-placeholder w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-500 text-[8px] text-center p-1'
                                                        errorDiv.innerHTML = '<span>⚠️</span><span>Preview unavailable</span>'
                                                        parent.appendChild(errorDiv)
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Google Drive Type Toggle */}
                            {isGoogleDriveUrl(url) && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <span className="text-sm text-blue-700 dark:text-blue-300">Google Drive file detected. Is this an:</span>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={forceType === 'image' || (forceType === 'auto' && detectMediaType(url) === 'image') ? 'default' : 'outline'}
                                                onClick={() => setForceType('image')}
                                                className="h-7 text-xs"
                                            >
                                                <ImageIcon className="h-3 w-3 mr-1" /> Image
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={forceType === 'video' || (forceType === 'auto' && detectMediaType(url) === 'video') ? 'default' : 'outline'}
                                                onClick={() => setForceType('video')}
                                                className="h-7 text-xs"
                                            >
                                                <Video className="h-3 w-3 mr-1" /> Video
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                        <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                                            <strong>⚠️ Important:</strong> The file must be set to <strong>"Anyone with the link can view"</strong> in Google Drive sharing settings, or the image won't display.
                                        </p>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                            File ID: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">{extractGoogleDriveId(url)}</code>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    Alt Text / Description <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="Describe media for SEO"
                                    value={alt}
                                    onChange={(e) => setAlt(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Crucial for accessibility and SEO.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="Tooltip / title text"
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

                    <TabsContent value="upload" className="py-4">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl h-48 flex flex-col items-center justify-center relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                            <input type="file" accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={uploading} />
                            {uploading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                                    <p className="text-sm text-slate-500">Uploading...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2 mb-3">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full group-hover:scale-110 transition-transform">
                                            <ImageIcon className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full group-hover:scale-110 transition-transform">
                                            <Video className="h-5 w-5 text-violet-500" />
                                        </div>
                                    </div>
                                    <p className="font-medium">Click to upload Image or Video</p>
                                    <p className="text-xs text-slate-400 mt-1">Images: JPG, PNG, WEBP (Max 10MB) • Videos: MP4, WebM (Max 50MB)</p>
                                </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleInsert}>
                        {detectMediaType(url) === 'video' ? 'Insert Video' : 'Insert Image'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
