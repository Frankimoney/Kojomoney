import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface LinkCheckerProps {
    content: string
}

interface LinkItem {
    url: string
    text: string
    issues: string[]
    isExternal: boolean
}

export default function LinkChecker({ content }: LinkCheckerProps) {
    const analysis = useMemo(() => {
        const links: LinkItem[] = []
        let internalCount = 0
        let externalCount = 0
        let nofollowCount = 0
        let issueCount = 0

        // Parse links
        const linkRegex = /<a\s+([^>]*)>([^<]*)<\/a>/gi
        let match

        while ((match = linkRegex.exec(content)) !== null) {
            const attrs = match[1]
            const text = match[2].trim()
            const issues: string[] = []

            // Get href
            const hrefMatch = attrs.match(/href=["']([^"']*)["']/i)
            const href = hrefMatch ? hrefMatch[1] : ''

            // Determine if external
            const isExternal = href.startsWith('http') && !href.includes('kojomoney.com')

            if (isExternal) {
                externalCount++

                // Check for nofollow
                const hasNofollow = attrs.toLowerCase().includes('nofollow')
                if (hasNofollow) nofollowCount++

                // Check for target blank
                const hasTarget = attrs.includes('target=')
                if (!hasTarget) {
                    issues.push('Missing target="_blank"')
                }

                // Recommend nofollow for certain domains
                if (!hasNofollow) {
                    issues.push('Consider adding rel="nofollow"')
                }
            } else {
                internalCount++
            }

            // Check anchor text
            if (!text || text.toLowerCase() === 'click here' || text.toLowerCase() === 'read more') {
                issues.push('Use descriptive anchor text')
            }

            if (text.length > 60) {
                issues.push('Anchor text too long')
            }

            // Empty href
            if (!href || href === '#') {
                issues.push('Empty or placeholder link')
            }

            if (issues.length > 0) {
                issueCount++
                links.push({
                    url: href.length > 40 ? href.substring(0, 37) + '...' : href,
                    text: text.substring(0, 30) || '(no text)',
                    issues,
                    isExternal
                })
            }
        }

        return {
            internalCount,
            externalCount,
            nofollowCount,
            issueCount,
            problemLinks: links.slice(0, 5)
        }
    }, [content])

    const totalLinks = analysis.internalCount + analysis.externalCount

    if (totalLinks === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" /> Link Checker
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No links found. Add internal links for better SEO.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Link Checker
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
                        <div className="font-bold">{analysis.internalCount}</div>
                        <div className="text-muted-foreground">Internal</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded">
                        <div className="font-bold">{analysis.externalCount}</div>
                        <div className="text-muted-foreground">External</div>
                    </div>
                    <div className={`p-2 rounded ${analysis.issueCount === 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-yellow-50 dark:bg-yellow-900/30'}`}>
                        <div className="font-bold">{analysis.issueCount}</div>
                        <div className="text-muted-foreground">Issues</div>
                    </div>
                </div>

                {/* Recommendations */}
                {analysis.internalCount < 2 && (
                    <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        <Info className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Add more internal links (2-5 recommended per post)</span>
                    </div>
                )}

                {/* Problem Links */}
                {analysis.problemLinks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground">Issues Found:</div>
                        {analysis.problemLinks.map((link, i) => (
                            <div key={i} className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs">
                                <div className="font-medium">{link.text}</div>
                                <div className="font-mono text-muted-foreground truncate">{link.url}</div>
                                {link.issues.map((issue, j) => (
                                    <div key={j} className="flex items-center gap-1 text-yellow-600 mt-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {issue}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {analysis.issueCount === 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                        <CheckCircle className="h-4 w-4" />
                        <span>All links look good!</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
