import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

const SITE_URL = 'https://kojomoney.com'

function generateRssFeed(posts: any[]) {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>KojoMoney Blog</title>
    <link>${SITE_URL}</link>
    <description>KojoMoney - Financial Freedom and Earning</description>
    <language>en</language>
    ${posts
            .map(({ title, slug, excerpt, updatedAt, author }) => {
                return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${SITE_URL}/blog/${slug}</link>
      <guid>${SITE_URL}/blog/${slug}</guid>
      <pubDate>${new Date(updatedAt).toUTCString()}</pubDate>
      <description><![CDATA[${excerpt || ''}]]></description>
      ${author ? `<author>${author.name}</author>` : ''}
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
