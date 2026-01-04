import { GetServerSideProps } from 'next'
import { db } from '@/lib/firebase-admin'
import { BlogPost } from '@/types/blog'

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    // Set caching headers: cache for 1 hour, stale-while-revalidate for 1 day
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')

    if (!db) {
        res.write('# KojoMoney\n\nService temporarily unavailable.')
        res.end()
        return { props: {} }
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
        res.write(content)
        res.end()

    } catch (error) {
        console.error('Error generating llms.txt:', error)
        res.write('# KojoMoney\n\nError generating documentation.')
        res.end()
    }

    return { props: {} }
}

export default function LLMsTxt() {
    return null
}
