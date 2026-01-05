import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { BlogPost } from '@/types/blog'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')

    if (!db) {
        return res.status(200).send('# KojoMoney\n\nService temporarily unavailable.')
    }

    try {
        const snapshot = await db.collection('posts')
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(50)
            .get()

        const posts: BlogPost[] = []
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() } as BlogPost)
        })

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kojomoney.com'

        const content = `# KojoMoney

> The #1 Mobile Earnings Platform. Learn how to earn cash, crypto, and rewards from your phone.

## Core Documentation

- [Home](${baseUrl})
- [About Us](${baseUrl}/about)
- [How It Works](${baseUrl}/how-it-works)
- [Support](${baseUrl}/support)

## Blog & Guides

${posts.map(post => `- [${post.title}](${baseUrl}/blog/${post.slug}): ${post.excerpt ? post.excerpt.replace(/\n/g, ' ') : 'Learn more about this topic.'}`).join('\n')}
`
        return res.status(200).send(content)

    } catch (error) {
        console.error('Error generating llms.txt:', error)
        return res.status(200).send('# KojoMoney\n\nError generating documentation.')
    }
}
