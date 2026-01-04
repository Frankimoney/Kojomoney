import { GetServerSideProps } from 'next'
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
          </item>
        `
            })
            .join('')}
    </channel>
  </rss>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    let posts: any[] = []

    if (db) {
        try {
            const snapshot = await db.collection('posts')
                .where('status', '==', 'published')
                .orderBy('publishedAt', 'desc')
                .limit(20) // RSS usually limited
                .get()

            snapshot.forEach(doc => {
                posts.push(doc.data())
            })
        } catch (e) {
            console.error('RSS generation error:', e)
        }
    }

    const rss = generateRssFeed(posts)

    res.setHeader('Content-Type', 'text/xml')
    res.write(rss)
    res.end()

    return {
        props: {},
    }
}

export default function Rss() {
    // Empty
}
