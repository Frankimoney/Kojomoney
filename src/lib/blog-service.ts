/**
 * Blog Service
 * 
 * Shared logic for fetching blog data.
 * Used by both API routes (SSR/Client) and getStaticProps (SSG).
 */

import { db } from '@/lib/firebase-admin'
import { BlogPost } from '@/types/blog'

export const POSTS_PER_PAGE = 9

export interface GetPostsOptions {
    page?: number
    category?: string | null
    search?: string | null
    limit?: number
    includeContent?: boolean
}

export interface GetPostsResult {
    posts: BlogPost[]
    page: number
    hasMore: boolean
    categories: string[]
    activeCategory: string | null
    searchQuery: string | null
    settings: any
}

/**
 * Fetch list of blog posts with pagination and filtering
 */
export async function getBlogPosts(options: GetPostsOptions = {}): Promise<GetPostsResult> {
    const {
        page = 1,
        category = null,
        search = null,
        limit = POSTS_PER_PAGE,
        includeContent = false
    } = options

    if (!db) {
        return {
            posts: [],
            page: 1,
            hasMore: false,
            categories: [],
            activeCategory: null,
            searchQuery: null,
            settings: {}
        }
    }

    try {
        // Fetch ALL published posts for category extraction and client-side like filtering
        // Firestore doesn't support native fuzzy search, so we fetch metadata for active posts
        const allPostsSnapshot = await db.collection('posts')
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(100) // Limit to 100 recent posts for performance
            .get()

        let posts = allPostsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost))

        // Extract ALL categories from published posts
        const allCategories = Array.from(
            new Set(posts.flatMap(p => p.categories || []))
        ).slice(0, 10)

        // Filter by category
        if (category) {
            posts = posts.filter(p => p.categories?.includes(category))
        }

        // Filter by search query
        if (search) {
            const lowerSearch = search.toLowerCase()
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(lowerSearch) ||
                p.excerpt?.toLowerCase().includes(lowerSearch)
            )
        }

        // Pagination
        const total = posts.length
        const start = (page - 1) * limit
        const paginatedPosts = posts.slice(start, start + limit)
        const hasMore = start + limit < total

        // Process posts for display
        const serializedPosts = paginatedPosts.map(post => ({
            ...post,
            content: includeContent ? post.content : '', // Strip heavy content unless requested
            publishedAt: post.publishedAt || undefined,
            createdAt: post.createdAt || 0,
            updatedAt: post.updatedAt || 0
        }))

        // Fetch Settings
        const settingsDoc = await db.collection('settings').doc('blog').get()
        const settings = settingsDoc.exists ? settingsDoc.data() : {}

        return {
            posts: serializedPosts,
            page,
            hasMore,
            categories: allCategories,
            activeCategory: category,
            searchQuery: search,
            settings
        }

    } catch (error) {
        console.error('Error in getBlogPosts:', error)
        throw error
    }
}

/**
 * Fetch a single blog post by slug
 */
export async function getBlogPostBySlug(slug: string): Promise<{ post: BlogPost | null, relatedPosts: BlogPost[], settings: any, toc?: { id: string, text: string, level: number }[], redirect?: string, permanent?: boolean }> {
    if (!db) return { post: null, relatedPosts: [], settings: {} }

    try {
        const snapshot = await db.collection('posts')
            .where('slug', '==', slug)
            .where('status', '==', 'published')
            .limit(1)
            .get()

        if (snapshot.empty) {
            // Check for redirects
            const redirectDoc = await db.collection('redirects').doc(slug).get()
            if (redirectDoc.exists) {
                const redirectData = redirectDoc.data()
                return {
                    post: null,
                    relatedPosts: [],
                    settings: {},
                    redirect: redirectData?.to,
                    permanent: redirectData?.type === '301'
                }
            }
            return { post: null, relatedPosts: [], settings: {} }
        }

        const doc = snapshot.docs[0]
        const post = { id: doc.id, ...doc.data() } as BlogPost

        // Fetch Related Posts
        let relatedPosts: BlogPost[] = []

        // Priority 1: Manual Selection
        if (post.relatedPostIds && post.relatedPostIds.length > 0) {
            try {
                const refs = post.relatedPostIds.map(id => db!.collection('posts').doc(id))
                const snapshots = await db.getAll(...refs)
                relatedPosts = snapshots
                    .filter(s => s.exists && s.data()?.status === 'published')
                    .map(s => ({ id: s.id, ...s.data() } as BlogPost))
            } catch (e) {
                console.error('Error fetching manual related posts', e)
            }
        }

        // Priority 2: Fallback to Tags
        if (relatedPosts.length < 3 && post.tags && post.tags.length > 0) {
            const limit = 4
            const relatedSnap = await db.collection('posts')
                .where('tags', 'array-contains', post.tags[0])
                .where('status', '==', 'published')
                .limit(limit)
                .get()

            const taggedPosts = relatedSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as BlogPost))
                .filter(p => p.id !== post.id && !relatedPosts.some(rp => rp.id === p.id))

            relatedPosts = [...relatedPosts, ...taggedPosts].slice(0, 3)
        }

        // Fetch Settings
        const settingsDoc = await db.collection('settings').doc('blog').get()
        const settings = settingsDoc.exists ? settingsDoc.data() : {}

        // Process Content Blocks
        if (post.content && post.content.includes('[block id=')) {
            try {
                const regex = /\[block id="([^"]+)"\]/g
                const matches = Array.from(post.content.matchAll(regex))

                if (matches.length > 0) {
                    const blockIds = [...new Set(matches.map(m => m[1]))]
                    const blockRefs = blockIds.map(id => db!.collection('blog_blocks').doc(id))

                    if (blockRefs.length > 0) {
                        const blockSnaps = await db.getAll(...blockRefs)
                        const blocksMap = new Map()
                        blockSnaps.forEach(s => {
                            if (s.exists) blocksMap.set(s.id, s.data()?.content || '')
                        })

                        post.content = post.content.replace(regex, (match, id) => {
                            return blocksMap.get(id) || ''
                        })
                    }
                }
            } catch (blockError) {
                console.error('Error processing content blocks:', blockError)
            }
        }

        // Generate TOC server-side (prevents CLS)
        const toc: { id: string, text: string, level: number }[] = []
        if (post.content) {
            const headerRegex = /<(h[2-3])[^>]*>(.*?)<\/\1>/g
            let match
            let index = 0
            while ((match = headerRegex.exec(post.content)) !== null) {
                const tag = match[1]
                const text = match[2].replace(/<[^>]+>/g, '') // Strip inner HTML like <span> or <a>
                const id = `heading-${index}`
                toc.push({ id, text, level: parseInt(tag.charAt(1)) })

                // Inject ID into content (simulated for client match)
                // Note: In a real DOM parser this is cleaner, but strict string replacement can be brittle.
                // ideally we'd use a parser, but here we'll rely on client-side hydration or 
                // just assume the client logic mostly matches. 
                // Actually, let's inject ids into the content to ensure anchors work?
                // For now, we just pass the data so the sidebar can render immediately.
                // The client-side effect adds IDs to the elements.
                index++
            }
        }

        // Serialize output
        const serializeInfo = (p: any) => ({
            ...p,
            publishedAt: p.publishedAt || null,
            updatedAt: p.updatedAt || null,
            createdAt: p.createdAt || null
        })

        const serializedRelatedPosts = relatedPosts.map(p => ({
            ...serializeInfo(p),
            content: ''
        }))

        return {
            post: serializeInfo(post),
            relatedPosts: serializedRelatedPosts,
            settings,
            toc // Return TOC data
        }

    } catch (error) {
        console.error('Error fetching single post:', error)
        throw error
    }
}

/**
 * Get all post slugs for SSG paths
 */
export async function getAllPostSlugs(): Promise<string[]> {
    if (!db) return []

    try {
        const snapshot = await db.collection('posts')
            .where('status', '==', 'published')
            .select('slug')
            .get()

        return snapshot.docs.map(doc => doc.data().slug).filter(Boolean)
    } catch (error) {
        console.error('Error fetching slugs:', error)
        return []
    }
}
