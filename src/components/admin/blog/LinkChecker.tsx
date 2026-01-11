import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link2, ExternalLink, AlertTriangle, CheckCircle, Info, XCircle, ArrowUpRight, Home } from 'lucide-react'

interface LinkCheckerProps {
    content: string
}

interface LinkItem {
    url: string
    text: string
    issues: string[]
    isExternal: boolean
}

interface LinkAnalysis {
    internalCount: number
    externalCount: number
    nofollowCount: number
    issueCount: number
    hasAffiliateLinks: boolean
    hasBrokenPatterns: boolean
    problemLinks: LinkItem[]
    seoScore: 'good' | 'warning' | 'poor'
    recommendations: string[]
}

export default function LinkChecker({ content }: LinkCheckerProps) {
    const analysis = useMemo((): LinkAnalysis => {
        const links: LinkItem[] = []
        let internalCount = 0
        let externalCount = 0
        let nofollowCount = 0
        let issueCount = 0
        let hasAffiliateLinks = false
        let hasBrokenPatterns = false
        const recommendations: string[] = []

        // Parse links
        const linkRegex = /<a\s+([^>]*)>([^<]*)<\/a>/gi
        let match

        // Common affiliate/tracking URL patterns
        const affiliatePatterns = [/ref=/, /aff=/, /affiliate/, /partner/, /tracking/, /utm_/, /click\./i]

        while ((match = linkRegex.exec(content)) !== null) {
            const attrs = match[1]
            const text = match[2].trim()
            const issues: string[] = []

            // Get href
            const hrefMatch = attrs.match(/href=["']([^"']*)["']/i)
            const href = hrefMatch ? hrefMatch[1] : ''

            // Determine if external (not kojomoney.com, not relative path)
            const isExternal = href.startsWith('http') &&
                !href.includes('kojomoney.com') &&
                !href.includes('localhost')

            // Check for affiliate links
            if (affiliatePatterns.some(pattern => pattern.test(href))) {
                hasAffiliateLinks = true
            }

            if (isExternal) {
                externalCount++

                // Check for nofollow/sponsored
                const hasNofollow = attrs.toLowerCase().includes('nofollow')
                const hasSponsored = attrs.toLowerCase().includes('sponsored')
                if (hasNofollow || hasSponsored) nofollowCount++

                // Check for target blank
                const hasTarget = attrs.includes('target=')
                if (!hasTarget) {
                    issues.push('Missing target="_blank" for external link')
                }

                // Check for rel attributes on external links
                const relMatch = attrs.match(/rel=["']([^"']*)["']/i)
                const relValue = relMatch ? relMatch[1].toLowerCase() : ''

                if (!relValue.includes('noopener')) {
                    issues.push('Add rel="noopener" for security')
                }

                // Affiliate links should have nofollow/sponsored
                if (affiliatePatterns.some(pattern => pattern.test(href))) {
                    if (!hasNofollow && !hasSponsored) {
                        issues.push('Affiliate link: add rel="nofollow sponsored"')
                    }
                }
            } else {
                // Internal link
                if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
                    internalCount++

                    // Check if internal link uses absolute URL (should use relative)
                    if (href.includes('kojomoney.com')) {
                        issues.push('Use relative URLs for internal links')
                    }
                }
            }

            // Check anchor text quality
            const badAnchorTexts = ['click here', 'read more', 'here', 'this', 'link', 'more']
            if (!text || badAnchorTexts.includes(text.toLowerCase())) {
                issues.push('Use descriptive anchor text for SEO')
            }

            if (text.length > 60) {
                issues.push('Anchor text too long (max 60 chars)')
            }

            // Empty href
            if (!href || href === '#') {
                issues.push('Empty or placeholder link')
                hasBrokenPatterns = true
            }

            // JavaScript links
            if (href.toLowerCase().startsWith('javascript:')) {
                issues.push('Avoid javascript: links for SEO')
                hasBrokenPatterns = true
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

        // Generate SEO recommendations
        if (internalCount === 0) {
            recommendations.push('⚠️ No internal links! Add 2-5 links to other pages on your site')
        } else if (internalCount < 2) {
            recommendations.push('💡 Add more internal links (2-5 recommended per post)')
        } else if (internalCount >= 2 && internalCount <= 5) {
            recommendations.push('✅ Good internal linking (2-5 links)')
        } else if (internalCount > 10) {
            recommendations.push('⚠️ Too many internal links may dilute link equity')
        }

        if (externalCount === 0 && content.length > 1000) {
            recommendations.push('💡 Consider adding 1-2 external links to authoritative sources')
        } else if (externalCount > 0 && externalCount <= 3) {
            recommendations.push('✅ Good external link count')
        } else if (externalCount > 5) {
            recommendations.push('⚠️ Many external links - ensure they add value')
        }

        if (hasAffiliateLinks && nofollowCount === 0) {
            recommendations.push('⚠️ Affiliate links detected - add rel="nofollow sponsored"')
        }

        // Calculate SEO score
        let seoScore: 'good' | 'warning' | 'poor' = 'good'
        if (internalCount === 0 || issueCount > 3 || hasBrokenPatterns) {
            seoScore = 'poor'
        } else if (internalCount < 2 || issueCount > 0) {
            seoScore = 'warning'
        }

        return {
            internalCount,
            externalCount,
            nofollowCount,
            issueCount,
            hasAffiliateLinks,
            hasBrokenPatterns,
            problemLinks: links.slice(0, 5),
            seoScore,
            recommendations
        }
    }, [content])

    const totalLinks = analysis.internalCount + analysis.externalCount

    const scoreColors = {
        good: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        poor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    }

    const scoreLabels = {
        good: '✅ Good',
        warning: '⚠️ Needs Work',
        poor: '❌ Poor'
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> Link SEO
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* SEO Score Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${scoreColors[analysis.seoScore]}`}>
                    {scoreLabels[analysis.seoScore]}
                </div>

                {/* Link Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
                        <div className="flex items-center justify-center gap-1">
                            <Home className="h-3 w-3 text-blue-500" />
                            <span className="font-bold">{analysis.internalCount}</span>
                        </div>
                        <div className="text-muted-foreground">Internal</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded">
                        <div className="flex items-center justify-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-purple-500" />
                            <span className="font-bold">{analysis.externalCount}</span>
                        </div>
                        <div className="text-muted-foreground">External</div>
                    </div>
                    <div className={`p-2 rounded ${analysis.issueCount === 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-yellow-50 dark:bg-yellow-900/30'}`}>
                        <div className="font-bold">{analysis.issueCount}</div>
                        <div className="text-muted-foreground">Issues</div>
                    </div>
                </div>

                {/* SEO Recommendations */}
                {analysis.recommendations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground">SEO Tips:</div>
                        {analysis.recommendations.map((rec, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-1">
                                {rec}
                            </div>
                        ))}
                    </div>
                )}

                {/* No Links Warning */}
                {totalLinks === 0 && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded text-xs">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-300">No links found!</p>
                            <p className="text-muted-foreground mt-1">
                                Add internal links to other blog posts or pages on your site for better SEO.
                                Consider adding 1-2 external links to authoritative sources.
                            </p>
                        </div>
                    </div>
                )}

                {/* Problem Links */}
                {analysis.problemLinks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground">Issues Found:</div>
                        {analysis.problemLinks.map((link, i) => (
                            <div key={i} className={`p-2 rounded text-xs ${link.isExternal ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                <div className="flex items-center gap-1 font-medium">
                                    {link.isExternal ? (
                                        <ArrowUpRight className="h-3 w-3 text-purple-500" />
                                    ) : (
                                        <Home className="h-3 w-3 text-blue-500" />
                                    )}
                                    {link.text}
                                </div>
                                <div className="font-mono text-muted-foreground truncate text-[10px]">{link.url}</div>
                                {link.issues.map((issue, j) => (
                                    <div key={j} className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 mt-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {issue}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* All Good */}
                {analysis.issueCount === 0 && totalLinks > 0 && analysis.seoScore === 'good' && (
                    <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                        <CheckCircle className="h-4 w-4" />
                        <span>Great link structure!</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
