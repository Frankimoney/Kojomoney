import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Image as ImageIcon, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface ImageSEOCheckerProps {
    content: string
}

interface ImageIssue {
    src: string
    issues: string[]
}

export default function ImageSEOChecker({ content }: ImageSEOCheckerProps) {
    const analysis = useMemo(() => {
        // Parse images from HTML content
        const imgRegex = /<img\s+([^>]*)>/gi
        const images: ImageIssue[] = []
        let totalImages = 0
        let imagesWithAlt = 0
        let imagesWithTitle = 0
        let badFilenames = 0

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

            if (/^(IMG|DSC|image|photo|screenshot|Screen Shot)[\d_-]/i.test(filename)) {
                issues.push('Generic filename - rename to keyword-rich name')
                badFilenames++
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
            problemImages: images.slice(0, 5) // Show max 5
        }
    }, [content])

    if (analysis.totalImages === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Image SEO
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No images found in content.</p>
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
                            <div key={i} className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs">
                                <div className="font-mono text-muted-foreground truncate">{img.src}</div>
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
