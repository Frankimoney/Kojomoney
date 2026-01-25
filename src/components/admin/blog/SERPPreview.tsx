import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe } from 'lucide-react'

interface SERPPreviewProps {
    title: string
    metaTitle: string
    metaDescription: string
    slug: string
}

export default function SERPPreview({ title, metaTitle, metaDescription, slug }: SERPPreviewProps) {
    const displayTitle = metaTitle || title || 'Page Title'
    const displayDesc = metaDescription || 'Add a meta description to see how your page will appear in search results.'
    const displayUrl = `kojomoney.com/blog/${slug || 'your-post-slug'}`

    // Truncate for display
    const truncatedTitle = displayTitle.length > 60 ? displayTitle.substring(0, 57) + '...' : displayTitle
    const truncatedDesc = displayDesc.length > 160 ? displayDesc.substring(0, 157) + '...' : displayDesc

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Google Preview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border space-y-1">
                    {/* URL */}
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600">
                            K
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">kojomoney.com</div>
                            <div className="text-xs text-green-700 dark:text-green-400">{displayUrl}</div>
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-tight">
                        {truncatedTitle}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-snug">
                        {truncatedDesc}
                    </p>
                </div>

                {/* Character counts */}
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className={displayTitle.length > 60 ? 'text-red-500' : ''}>
                        Title: {displayTitle.length}/60
                    </span>
                    <span className={displayDesc.length > 160 ? 'text-red-500' : ''}>
                        Desc: {displayDesc.length}/160
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
