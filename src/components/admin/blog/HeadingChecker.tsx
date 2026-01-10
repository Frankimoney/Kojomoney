import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { List, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface HeadingCheckerProps {
    content: string
    /** If true, indicates that the post title is rendered as H1, so content should start with H2 */
    hasTitle?: boolean
    /** The post title (shown as H1 in the tree) */
    title?: string
}

interface HeadingItem {
    level: number
    text: string
    issue?: string
    isTitle?: boolean
}

export default function HeadingChecker({ content, hasTitle = true, title }: HeadingCheckerProps) {
    const analysis = useMemo(() => {
        const headings: HeadingItem[] = []
        const issues: string[] = []

        // If hasTitle is true, the post title serves as H1
        // Add it as the first "virtual" heading
        if (hasTitle && title) {
            headings.push({
                level: 1,
                text: title.substring(0, 50),
                isTitle: true
            })
        }

        // Extract headings from content
        const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi
        let match
        let h1CountInContent = 0
        let lastLevel = hasTitle ? 1 : 0 // Start from H1 level if we have a title

        while ((match = headingRegex.exec(content)) !== null) {
            const level = parseInt(match[1])
            const text = match[2].trim()

            if (level === 1) h1CountInContent++

            // Check for skipped levels
            let issue: string | undefined
            if (lastLevel > 0 && level > lastLevel + 1) {
                issue = `Skipped H${lastLevel + 1}`
            }

            headings.push({ level, text: text.substring(0, 50), issue })
            lastLevel = level
        }

        // Check H1 count in content
        if (hasTitle) {
            // If we have a title as H1, there should be NO H1 in content
            if (h1CountInContent > 0) {
                issues.push(`Found ${h1CountInContent} H1 tag(s) in content - post title is already H1`)
            }
            // Check that first content heading is H2 (not something else)
            const firstContentHeading = headings.find(h => !h.isTitle)
            if (firstContentHeading && firstContentHeading.level !== 2) {
                issues.push(`First content heading should be H2 (found H${firstContentHeading.level})`)
            }
        } else {
            // No title, so we need exactly one H1 in content
            if (h1CountInContent === 0) {
                issues.push('Missing H1 tag - every page needs exactly one H1')
            } else if (h1CountInContent > 1) {
                issues.push(`Found ${h1CountInContent} H1 tags - use only one H1 per page`)
            }
        }

        // Check heading hierarchy - H4+ is discouraged
        const hasH4Plus = headings.some(h => h.level >= 4 && !h.isTitle)
        if (hasH4Plus) {
            issues.push('H4+ headings found - consider simplifying structure to H2/H3 only')
        }

        // Check for empty headings
        const emptyHeadings = headings.filter(h => !h.text && !h.isTitle)
        if (emptyHeadings.length > 0) {
            issues.push('Empty heading tags found')
        }

        return {
            headings: headings.slice(0, 12), // Show max 12
            issues,
            h1Count: hasTitle ? 1 : h1CountInContent,
            totalHeadings: headings.length
        }
    }, [content, hasTitle, title])

    if (analysis.totalHeadings === 0 || (analysis.totalHeadings === 1 && hasTitle)) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <List className="h-4 w-4" /> Heading Structure
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {hasTitle ? 'No content headings found. Add H2, H3 tags to structure your content.' : 'No headings found. Add H1, H2, H3 tags for better SEO.'}
                    </p>
                </CardContent>
            </Card>
        )
    }

    const hasIssues = analysis.issues.length > 0

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <List className="h-4 w-4" /> Heading Structure
                    </CardTitle>
                    <span className={`text-xs ${hasIssues ? 'text-yellow-600' : 'text-green-600'}`}>
                        {analysis.totalHeadings} headings
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Issues */}
                {analysis.issues.length > 0 && (
                    <div className="space-y-1">
                        {analysis.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                                <AlertCircle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{issue}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Heading Tree */}
                <div className="space-y-1 pt-2 border-t text-xs max-h-[150px] overflow-y-auto">
                    {analysis.headings.map((h, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 ${h.issue ? 'text-yellow-600' : ''} ${h.isTitle ? 'bg-blue-50 dark:bg-blue-900/20 rounded px-1 -mx-1' : ''}`}
                            style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                        >
                            <span className={`font-mono font-bold ${h.level === 1 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                H{h.level}
                            </span>
                            <span className="truncate">{h.text || '(empty)'}</span>
                            {h.isTitle && (
                                <span className="text-[10px] text-blue-500 shrink-0 bg-blue-100 dark:bg-blue-900/40 px-1 rounded">Title</span>
                            )}
                            {h.issue && (
                                <span className="text-xs text-yellow-500 shrink-0">({h.issue})</span>
                            )}
                        </div>
                    ))}
                </div>

                {!hasIssues && (
                    <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                        <CheckCircle className="h-4 w-4" />
                        <span>Good heading structure!</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
