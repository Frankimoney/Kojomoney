import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

const EXTERNAL_DATA_URL = 'https://kojomoney.com'

function generateSiteMap(posts: any[]) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
            .map(({ slug, updatedAt }) => {
                return `
  <url>
    <loc>${EXTERNAL_DATA_URL}/blog/${slug}</loc>
    <lastmod>${new Date(updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
            })
            .join('')}
</urlset>`
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
