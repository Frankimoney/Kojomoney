/**
 * Fetch URL Metadata API
 * 
 * POST /api/admin/fetch-url-meta - Fetch Open Graph metadata from a URL
 * 
 * Attempts to follow redirects and scrape title, description, image from the target page.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'

interface UrlMetadata {
    title?: string
    description?: string
    image?: string
    siteName?: string
    url?: string
    favicon?: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { url } = req.body

        if (!url) {
            return res.status(400).json({ error: 'URL is required' })
        }

        // Validate URL format
        let targetUrl: URL
        try {
            targetUrl = new URL(url)
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' })
        }

        // Fetch the URL with a browser-like user agent to avoid blocks
        const response = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            redirect: 'follow',
        })

        if (!response.ok) {
            return res.status(400).json({
                error: `Failed to fetch URL: ${response.status} ${response.statusText}`
            })
        }

        const html = await response.text()
        const finalUrl = response.url // After redirects

        // Parse metadata from HTML
        const metadata: UrlMetadata = {
            url: finalUrl,
        }

        // Extract Open Graph tags
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
        if (ogTitleMatch) metadata.title = decodeHtmlEntities(ogTitleMatch[1])

        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)
        if (ogDescMatch) metadata.description = decodeHtmlEntities(ogDescMatch[1])

        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
        if (ogImageMatch) metadata.image = resolveUrl(ogImageMatch[1], finalUrl)

        const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i)
        if (ogSiteNameMatch) metadata.siteName = decodeHtmlEntities(ogSiteNameMatch[1])

        // Fallbacks to standard meta tags
        if (!metadata.title) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
            if (titleMatch) metadata.title = decodeHtmlEntities(titleMatch[1])
        }

        if (!metadata.description) {
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
            if (descMatch) metadata.description = decodeHtmlEntities(descMatch[1])
        }

        // Try to get favicon
        const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
            || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i)
        if (faviconMatch) {
            metadata.favicon = resolveUrl(faviconMatch[1], finalUrl)
        } else {
            // Default favicon location
            try {
                const faviconUrl = new URL('/favicon.ico', finalUrl)
                metadata.favicon = faviconUrl.toString()
            } catch { }
        }

        // If no site name, use domain
        if (!metadata.siteName) {
            try {
                const urlObj = new URL(finalUrl)
                metadata.siteName = urlObj.hostname.replace('www.', '')
            } catch { }
        }

        return res.status(200).json({
            success: true,
            metadata,
        })
    } catch (error) {
        console.error('Error fetching URL metadata:', error)
        return res.status(500).json({
            error: 'Failed to fetch URL metadata. The site may be blocking requests or unavailable.'
        })
    }
}

// Helper to decode HTML entities
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .trim()
}

// Helper to resolve relative URLs
function resolveUrl(url: string, base: string): string {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
        if (url.startsWith('//')) {
            return 'https:' + url
        }
        return url
    }
    try {
        return new URL(url, base).toString()
    } catch {
        return url
    }
}

export default requireAdmin(handler)
