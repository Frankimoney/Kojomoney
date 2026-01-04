import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { List, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface HeadingCheckerProps {
    content: string
}

interface HeadingItem {
    level: number
    text: string
    issue?: string
}

export default function HeadingChecker({ content }: HeadingCheckerProps) {
    const analysis = useMemo(() => {
        const headings: HeadingItem[] = []
        const issues: string[] = []

        // Extract headings
        const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi
        let match
        let h1Count = 0
        let lastLevel = 0

        while ((match = headingRegex.exec(content)) !== null) {
            const level = parseInt(match[1])
            const text = match[2].trim()

            if (level === 1) h1Count++

            // Check for skipped levels
            let issue: string | undefined
            if (lastLevel > 0 && level > lastLevel + 1) {
                issue = `Skipped H${lastLevel + 1}`
            }

            headings.push({ level, text: text.substring(0, 50), issue })
            lastLevel = level
        }

        // Check H1 count
        if (h1Count === 0) {
            issues.push('Missing H1 tag - every page needs exactly one H1')
        } else if (h1Count > 1) {
            issues.push(`Found ${h1Count} H1 tags - use only one H1 per page`)
        }

        // Check heading hierarchy
        const hasH4Plus = headings.some(h => h.level >= 4)
        if (hasH4Plus) {
            issues.push('H4+ headings found - consider simplifying structure to H2/H3 only')
        }

        // Check for empty headings
        const emptyHeadings = headings.filter(h => !h.text)
        if (emptyHeadings.length > 0) {
            issues.push('Empty heading tags found')
        }

        // Check first heading
        if (headings.length > 0 && headings[0].level !== 1) {
            issues.push('First heading should be H1')
        }

        return {
            headings: headings.slice(0, 10), // Show max 10
            issues,
            h1Count,
            totalHeadings: headings.length
        }
    }, [content])

    if (analysis.totalHeadings === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <List className="h-4 w-4" /> Heading Structure
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No headings found. Add H1, H2, H3 tags for better SEO.</p>
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
                            className={`flex items-center gap-2 ${h.issue ? 'text-yellow-600' : ''}`}
                            style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                        >
                            <span className={`font-mono font-bold ${h.level === 1 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                H{h.level}
                            </span>
                            <span className="truncate">{h.text || '(empty)'}</span>
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
