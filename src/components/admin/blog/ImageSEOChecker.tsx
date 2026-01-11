import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Image as ImageIcon, AlertCircle, CheckCircle, XCircle, Star } from 'lucide-react'

interface FeaturedImage {
    url: string
    alt?: string
    title?: string
    caption?: string
}

interface ImageSEOCheckerProps {
    content: string
    /** The featured image (counts as the main image for SEO) */
    featuredImage?: FeaturedImage | null
}

interface ImageIssue {
    src: string
    issues: string[]
    isFeatured?: boolean
}

export default function ImageSEOChecker({ content, featuredImage }: ImageSEOCheckerProps) {
    const analysis = useMemo(() => {
        const images: ImageIssue[] = []
        let totalImages = 0
        let imagesWithAlt = 0
        let imagesWithTitle = 0
        let badFilenames = 0

        // Check featured image first
        if (featuredImage && featuredImage.url) {
            totalImages++
            const issues: string[] = []
            const filename = featuredImage.url.split('/').pop() || ''

            // Check alt
            if (!featuredImage.alt || featuredImage.alt.trim() === '') {
                issues.push('Missing alt text')
            } else {
                imagesWithAlt++
            }

            // Check title
            if (!featuredImage.title || featuredImage.title.trim() === '') {
                issues.push('Missing title attribute')
            } else {
                imagesWithTitle++
            }

            // Check for bad filenames (Google Drive URLs are okay)
            if (!featuredImage.url.includes('googleusercontent.com') &&
                !featuredImage.url.includes('drive.google.com')) {
                if (/^(IMG|DSC|image|photo|screenshot|Screen Shot)[\d_-]/i.test(filename)) {
                    issues.push('Generic filename - rename to keyword-rich name')
                    badFilenames++
                }
            }

            if (issues.length > 0) {
                images.push({
                    src: 'Featured Image',
                    issues,
                    isFeatured: true
                })
            }
        }

        // Parse images from HTML content
        const imgRegex = /<img\s+([^>]*)>/gi
        let match
        while ((match = imgRegex.exec(content)) !== null) {
            totalImages++
            const attrs = match[1]
            const issues: string[] = []

            // Check alt
            const altMatch = attrs.match(/alt=["']([^"']*)["']/i)
            const alt = altMatch ? altMatch[1] : ''
            if (!alt || alt.trim() === '') {
                issues.push('Missing alt text')
            } else {
                imagesWithAlt++
            }

            // Check title
            const titleMatch = attrs.match(/title=["']([^"']*)["']/i)
            if (!titleMatch || !titleMatch[1].trim()) {
                issues.push('Missing title attribute')
            } else {
                imagesWithTitle++
            }

            // Check src for bad filenames
            const srcMatch = attrs.match(/src=["']([^"']*)["']/i)
            const src = srcMatch ? srcMatch[1] : ''
            const filename = src.split('/').pop() || ''

            // Skip Google Drive/Cloud URLs for filename check
            if (!src.includes('googleusercontent.com') && !src.includes('drive.google.com')) {
                if (/^(IMG|DSC|image|photo|screenshot|Screen Shot)[\d_-]/i.test(filename)) {
                    issues.push('Generic filename - rename to keyword-rich name')
                    badFilenames++
                }
            }

            if (issues.length > 0) {
                images.push({
                    src: filename.length > 30 ? '...' + filename.slice(-27) : filename,
                    issues
                })
            }
        }

        return {
            totalImages,
            imagesWithAlt,
            imagesWithTitle,
            badFilenames,
            hasFeaturedImage: !!(featuredImage && featuredImage.url),
            problemImages: images.slice(0, 5) // Show max 5
        }
    }, [content, featuredImage])

    if (analysis.totalImages === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Image SEO
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No images found. Add a featured image or images in content for better SEO.</p>
                </CardContent>
            </Card>
        )
    }

    const allGood = analysis.problemImages.length === 0

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Image SEO
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Featured Image Status */}
                <div className={`flex items-center gap-2 text-xs p-2 rounded ${analysis.hasFeaturedImage ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'}`}>
                    <Star className={`h-3 w-3 ${analysis.hasFeaturedImage ? 'fill-current' : ''}`} />
                    {analysis.hasFeaturedImage ? 'Featured image set ✓' : 'No featured image set'}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/50 p-2 rounded">
                        <div className="font-bold">{analysis.totalImages}</div>
                        <div className="text-muted-foreground">Images</div>
                    </div>
                    <div className={`p-2 rounded ${analysis.imagesWithAlt === analysis.totalImages ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        <div className="font-bold">{analysis.imagesWithAlt}/{analysis.totalImages}</div>
                        <div className="text-muted-foreground">With Alt</div>
                    </div>
                    <div className={`p-2 rounded ${analysis.badFilenames === 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <div className="font-bold">{analysis.badFilenames}</div>
                        <div className="text-muted-foreground">Bad Names</div>
                    </div>
                </div>

                {/* Issues */}
                {analysis.problemImages.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground">Issues Found:</div>
                        {analysis.problemImages.map((img, i) => (
                            <div key={i} className={`p-2 rounded text-xs ${img.isFeatured ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="font-mono text-muted-foreground truncate flex items-center gap-1">
                                    {img.isFeatured && <Star className="h-3 w-3 text-amber-500" />}
                                    {img.src}
                                </div>
                                {img.issues.map((issue, j) => (
                                    <div key={j} className="flex items-center gap-1 text-red-600 dark:text-red-400 mt-1">
                                        <XCircle className="h-3 w-3" />
                                        {issue}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {allGood && (
                    <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                        <CheckCircle className="h-4 w-4" />
                        <span>All images have proper SEO attributes!</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
