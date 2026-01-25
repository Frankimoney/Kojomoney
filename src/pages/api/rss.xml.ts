import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

const SITE_URL = 'https://kojomoney.com'

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

// Extract first video from content
function extractFirstVideo(content: string): string | null {
    // Check for video tag
    const videoMatch = content?.match(/<video[^>]+src=["']([^"']+)["']/)
    if (videoMatch) return videoMatch[1]

    // Check for YouTube/Vimeo/Drive iframe
    const iframeMatch = content?.match(/<iframe[^>]+src=["']([^"']+(?:youtube|vimeo|drive\.google)[^"']+)["']/)
    if (iframeMatch) return iframeMatch[1]

    return null
}

function generateRssFeed(posts: any[]) {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" 
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>KojoMoney Blog</title>
    <link>${SITE_URL}</link>
    <description>KojoMoney - Financial Freedom and Earning Tips</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/api/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>KojoMoney Blog</title>
      <link>${SITE_URL}</link>
    </image>
    ${posts
            .map((post) => {
                const { title, slug, excerpt, updatedAt, publishedAt, author, featuredImage, content } = post
                const firstVideo = extractFirstVideo(content || '')

                return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${SITE_URL}/blog/${slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${slug}</guid>
      <pubDate>${new Date(publishedAt || updatedAt).toUTCString()}</pubDate>
      <description><![CDATA[${excerpt || ''}]]></description>
      ${author?.name ? `<dc:creator>${escapeXml(author.name)}</dc:creator>` : ''}${featuredImage?.url ? `
      <enclosure url="${escapeXml(featuredImage.url)}" type="image/jpeg" length="0"/>
      <media:content url="${escapeXml(featuredImage.url)}" medium="image">
        <media:title>${escapeXml(featuredImage.title || title)}</media:title>
        <media:description>${escapeXml(featuredImage.alt || featuredImage.caption || excerpt || '')}</media:description>
      </media:content>
      <media:thumbnail url="${escapeXml(featuredImage.url)}"/>` : ''}${firstVideo ? `
      <media:content url="${escapeXml(firstVideo)}" medium="video">
        <media:title>${escapeXml(title)} - Video</media:title>
      </media:content>` : ''}
    </item>`
            })
            .join('')}
  </channel>
</rss>`
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
                .orderBy('publishedAt', 'desc')
                .limit(20)
                .get()

            snapshot.forEach(doc => {
                posts.push(doc.data())
            })
        } catch (e) {
            console.error('RSS generation error:', e)
        }
    }

    const rss = generateRssFeed(posts)

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    res.status(200).send(rss)
}
