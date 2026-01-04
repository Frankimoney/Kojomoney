import { useEffect, useRef } from 'react'

interface BlogAnalyticsProps {
    postId: string
    title: string
}

declare global {
    interface Window {
        gtag?: (...args: any[]) => void
    }
}

export default function BlogAnalytics({ postId, title }: BlogAnalyticsProps) {
    // Scroll Depth Tracking
    const scrollRef = useRef({
        25: false,
        50: false,
        75: false,
        90: false
    })

    useEffect(() => {
        // Track Page View
        const trackView = async () => {
            try {
                // Ensure we don't count duplicate views in same session if we want strictness,
                // but for now simple page load tracking
                await fetch('/api/analytics/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId,
                        title,
                        type: 'view',
                        referrer: document.referrer
                    })
                })
            } catch (e) {
                console.error('Failed to track view', e)
            }
        }

        // Only track in client
        if (typeof window !== 'undefined') {
            trackView()
        }

        const handleScroll = () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
            const scrolled = (winScroll / height) * 100

            const thresholds = [25, 50, 75, 90]

            thresholds.forEach(threshold => {
                const key = threshold as keyof typeof scrollRef.current
                if (scrolled >= threshold && !scrollRef.current[key]) {
                    scrollRef.current[key] = true
                    // Fire GA Event
                    if (window.gtag) {
                        window.gtag('event', 'scroll_depth', {
                            event_category: 'Blog',
                            event_label: title,
                            value: threshold,
                            post_id: postId
                        })
                    }
                    console.log(`[Analytics] Scroll Depth: ${threshold}% for ${title}`)
                }
            })
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [postId, title])

    // Outbound Link Tracking
    useEffect(() => {
        const handleLinkClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('a')
            if (!target) return

            const href = target.getAttribute('href')
            if (!href) return

            // Check if external
            const isExternal = href.startsWith('http') && !href.includes(window.location.hostname)

            if (isExternal) {
                if (window.gtag) {
                    window.gtag('event', 'outbound_click', {
                        event_category: 'Outbound',
                        event_label: href,
                        post_id: postId
                    })
                }
                console.log(`[Analytics] Outbound Click: ${href}`)
            }
        }

        const content = document.querySelector('.blog-content')
        if (content) {
            content.addEventListener('click', handleLinkClick as any)
        }

        return () => {
            if (content) {
                content.removeEventListener('click', handleLinkClick as any)
            }
        }
    }, [postId])

    return null
}
