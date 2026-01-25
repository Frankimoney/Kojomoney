import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

const EXTERNAL_DATA_URL = 'https://kojomoney.com'

// Extract images from HTML content
function extractImages(content: string): { url: string; title?: string; caption?: string }[] {
    const images: { url: string; title?: string; caption?: string }[] = []

    // Match img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)?["'])?[^>]*(?:title=["']([^"']*)?["'])?[^>]*>/gi
    let match
    while ((match = imgRegex.exec(content)) !== null) {
        images.push({
            url: match[1],
            title: match[3] || match[2], // Use title or alt text
            caption: match[2] // Alt as caption
        })
    }

    return images
}

// Extract videos from HTML content
function extractVideos(content: string): { url: string; title?: string; description?: string; thumbnail?: string }[] {
    const videos: { url: string; title?: string; description?: string; thumbnail?: string }[] = []

    // Match video tags
    const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*(?:title=["']([^"']*)?["'])?[^>]*>/gi
    let match
    while ((match = videoRegex.exec(content)) !== null) {
        videos.push({
            url: match[1],
            title: match[2] || 'Video'
        })
    }

    // Match iframe embeds (YouTube, Google Drive, etc.)
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*(?:title=["']([^"']*)?["'])?[^>]*>/gi
    while ((match = iframeRegex.exec(content)) !== null) {
        const src = match[1]
        // Only include video-related iframes
        if (src.includes('youtube.com') || src.includes('youtu.be') ||
            src.includes('drive.google.com') || src.includes('vimeo.com')) {
            videos.push({
                url: src,
                title: match[2] || 'Embedded Video'
            })
        }
    }

    return videos
}

function generateSiteMap(posts: any[]) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${EXTERNAL_DATA_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${EXTERNAL_DATA_URL}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${posts
            .map((post) => {
                const { slug, updatedAt, title, content, featuredImage, excerpt } = post
                const images = extractImages(content || '')
                const videos = extractVideos(content || '')

                // Add featured image if exists
                if (featuredImage?.url) {
                    images.unshift({
                        url: featuredImage.url,
                        title: featuredImage.title || title,
                        caption: featuredImage.alt || featuredImage.caption
                    })
                }

                return `
  <url>
    <loc>${EXTERNAL_DATA_URL}/blog/${slug}</loc>
    <lastmod>${new Date(updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${images.map(img => `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>${img.title ? `
      <image:title>${escapeXml(img.title)}</image:title>` : ''}${img.caption ? `
      <image:caption>${escapeXml(img.caption)}</image:caption>` : ''}
    </image:image>`).join('')}${videos.map(vid => `
    <video:video>
      <video:thumbnail_loc>${escapeXml(vid.thumbnail || featuredImage?.url || '')}</video:thumbnail_loc>
      <video:title>${escapeXml(vid.title || title)}</video:title>
      <video:description>${escapeXml(vid.description || excerpt || title)}</video:description>
      <video:content_loc>${escapeXml(vid.url)}</video:content_loc>
    </video:video>`).join('')}
  </url>`
            })
            .join('')}
</urlset>`
}

// Escape special XML characters
function escapeXml(str: string): string {
    if (!str) return ''
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    let posts: any[] = []

    if (db) {
        try {
            const snapshot = await db.collection('posts')
                .where('status', '==', 'published')
                .orderBy('updatedAt', 'desc')
                .get()

            snapshot.forEach(doc => {
                posts.push(doc.data())
            })
        } catch (e) {
            console.error('Sitemap generation error:', e)
        }
    }

    const sitemap = generateSiteMap(posts)

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    res.status(200).send(sitemap)
}
