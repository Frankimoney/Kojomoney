import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { db } from '@/lib/firebase-admin'
import { BlogPost } from '@/types/blog'
import BlogLayout from '@/components/blog/BlogLayout'
import CategoryScroller from '@/components/blog/CategoryScroller'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, ArrowRight, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { BLOG_CATEGORIES, getCategoryById } from '@/lib/blog-categories'

interface BlogIndexProps {
    posts: BlogPost[]
    page: number
    hasMore: boolean
    categories: string[]
    activeCategory: string | null
    searchQuery: string | null
    settings?: any
}

const POSTS_PER_PAGE = 9

export default function BlogIndex({ posts, page, hasMore, categories, activeCategory, searchQuery, settings }: BlogIndexProps) {
    const router = useRouter()
    const [searchInput, setSearchInput] = useState(searchQuery || '')
    const [showSearch, setShowSearch] = useState(!!searchQuery)

    const handleCategoryChange = (categoryId: string | null) => {
        if (categoryId) {
            router.push(`/blog?category=${categoryId}`)
        } else {
            router.push('/blog')
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchInput.trim()) {
            router.push(`/blog?search=${encodeURIComponent(searchInput.trim())}`)
        }
    }

    const clearSearch = () => {
        setSearchInput('')
        setShowSearch(false)
        router.push('/blog')
    }
    return (
        <BlogLayout settings={settings}>
            <Head>
                <title>{searchQuery ? `Search: ${searchQuery} - KojoMoney Blog` : activeCategory ? `${getCategoryById(activeCategory)?.name || activeCategory} - KojoMoney Blog` : 'Earning Guides & Tips - KojoMoney Blog'}</title>
                <meta name="description" content="Discover earning guides, payment proofs, bonus alerts, and tips to maximize your income on KojoMoney." />
            </Head>

            {/* Premium Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 dark:from-violet-900 dark:via-indigo-900 dark:to-purple-950 pt-12 pb-8">
                {/* Background decorations */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/5 to-transparent rounded-full" />
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    {/* Header Row: Title + Search */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                        <div className="text-white">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                                    📚 {posts.length}+ Articles
                                </span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                                {searchQuery ? (
                                    <>Results for "<span className="text-violet-200">{searchQuery}</span>"</>
                                ) : activeCategory ? (
                                    <>{getCategoryById(activeCategory)?.icon} {getCategoryById(activeCategory)?.name || activeCategory}</>
                                ) : (
                                    <>Earning Guides <br className="sm:hidden" /><span className="text-violet-200">&amp; Tips</span></>
                                )}
                            </h1>
                            <p className="text-violet-200/80 mt-3 max-w-md text-sm sm:text-base">
                                {searchQuery ? `Found ${posts.length} matching posts` : 'Payment proofs, bonus alerts, and expert tips to maximize your earnings'}
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="w-full sm:w-auto">
                            {showSearch ? (
                                <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            placeholder="Search articles..."
                                            className="pl-10 pr-10 h-12 bg-white dark:bg-slate-900 border-0 shadow-xl rounded-xl text-slate-900 dark:text-white"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                        >
                                            <X className="h-4 w-4 text-slate-400" />
                                        </button>
                                    </div>
                                    <Button type="submit" className="h-12 px-6 bg-white text-violet-600 hover:bg-violet-50 shadow-xl rounded-xl font-semibold">
                                        Search
                                    </Button>
                                </form>
                            ) : (
                                <Button
                                    onClick={() => setShowSearch(true)}
                                    className="gap-2 h-12 px-6 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/20 rounded-xl font-medium"
                                >
                                    <Search className="h-4 w-4" />
                                    <span>Search Articles</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Category Scroller - Horizontal Chips */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <CategoryScroller
                            activeCategory={activeCategory || undefined}
                            onCategoryChange={handleCategoryChange}
                        />
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 py-8">
                {/* Posts Grid */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    <div className="flex-1">

                        {posts.length === 0 ? (
                            <div className="text-center py-20 bg-muted/20 rounded-lg">
                                <h3 className="text-xl font-semibold mb-2">No posts found</h3>
                                <p className="text-muted-foreground">Try adjusting your search or category.</p>
                                {(searchQuery || activeCategory) && (
                                    <Link href="/blog" className="mt-4 inline-block text-primary hover:underline">Clear Filters</Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {posts.map((post) => (
                                    <Card key={post.id} className="flex flex-col h-full hover:shadow-lg transition-shadow border-muted">
                                        {post.featuredImage && (
                                            <div className="h-48 w-full bg-muted relative overflow-hidden rounded-t-lg">
                                                <img
                                                    src={post.featuredImage.url}
                                                    alt={post.featuredImage.alt}
                                                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                                                />
                                            </div>
                                        )}
                                        <CardHeader className="flex-1">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                                {post.tags?.[0] && <Badge variant="secondary" className="text-[10px]">{post.tags[0]}</Badge>}
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readingTime || 5} min read</span>
                                            </div>
                                            <Link href={`/blog/${post.slug}`}>
                                                <CardTitle className="text-xl font-bold leading-tight hover:text-primary transition-colors cursor-pointer line-clamp-2">
                                                    {post.title}
                                                </CardTitle>
                                            </Link>
                                            <CardDescription className="line-clamp-3 mt-2">
                                                {post.excerpt || post.metaDescription}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardFooter className="pt-0 border-t items-center justify-between text-xs text-muted-foreground bg-muted/10 p-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3" />
                                                <span>{post.author?.name || 'KojoMoney Team'}</span>
                                            </div>
                                            <div>
                                                {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : ''}
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="flex justify-center gap-2 mt-12">
                            {page > 1 && (
                                <Link href={{ query: { ...searchQuery ? { search: searchQuery } : {}, ...activeCategory ? { category: activeCategory } : {}, page: page - 1 } }}>
                                    <Button variant="outline">Previous</Button>
                                </Link>
                            )}
                            {hasMore && (
                                <Link href={{ query: { ...searchQuery ? { search: searchQuery } : {}, ...activeCategory ? { category: activeCategory } : {}, page: page + 1 } }}>
                                    <Button variant="outline">Next</Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="w-full lg:w-72 space-y-8">
                        {/* Categories Widget */}
                        <div className="border rounded-lg p-6">
                            <h3 className="font-bold mb-4">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                                <Link href="/blog">
                                    <Badge variant={!activeCategory ? "default" : "outline"} className="cursor-pointer">All</Badge>
                                </Link>
                                {categories.map(cat => (
                                    <Link key={cat} href={`/blog?category=${encodeURIComponent(cat)}`}>
                                        <Badge variant={activeCategory === cat ? "default" : "outline"} className="cursor-pointer">
                                            {cat}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Newsletter Widget (CTA) */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
                            <h3 className="font-bold mb-2">Join the Community</h3>
                            <p className="text-sm text-muted-foreground mb-4">Get the latest earning tips delivered to your inbox.</p>
                            <Input placeholder="Enter your email" className="mb-2 bg-background" />
                            <Button className="w-full">Subscribe</Button>
                        </div>
                    </aside>
                </div>
            </div>
        </BlogLayout>
    )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const page = parseInt(context.query.page as string || '1')
    const search = (context.query.search as string || '').toLowerCase()
    const category = context.query.category as string || null

    if (!db) {
        return {
            props: {
                posts: [],
                page: 1,
                hasMore: false,
                categories: [],
                activeCategory: null,
                searchQuery: null,
                settings: {}
            }
        }
    }

    let query = db.collection('posts')
        .where('status', '==', 'published')
    // .orderBy('publishedAt', 'desc') // Requires composite index if filtering

    // Note: Firestore advanced filtering (search + sort) often requires specific indexes
    // For simplicity, we fetch a bit more and filter in memory if search is present, 
    // OR rely on client-side search indexing (Algolia/Typesense) in prod.
    // Here, we'll try basic approach.

    if (category) {
        query = query.where('categories', 'array-contains', category)
    }

    try {
        // Fetch posts
        // Warning: orderBy with where might fail without index. 
        // Best practice: Create index URL from error and click it.
        const snapshot = await query.orderBy('publishedAt', 'desc').limit(100).get()

        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost))

        // Filter by title (Search) - naive impl for MVP
        if (search) {
            posts = posts.filter(p => p.title.toLowerCase().includes(search) || p.excerpt?.toLowerCase().includes(search))
        }

        // Pagination
        const total = posts.length
        const start = (page - 1) * POSTS_PER_PAGE
        const paginatedPosts = posts.slice(start, start + POSTS_PER_PAGE)
        const hasMore = start + POSTS_PER_PAGE < total

        // Extract Categories from all published posts (cached/naive)
        // In real app, store categories in separate collection
        const allCategories = Array.from(new Set(posts.flatMap(p => p.tags || []))).slice(0, 10)

        // Serialize dates
        const serializedPosts = paginatedPosts.map(post => ({
            ...post,
            publishedAt: post.publishedAt || null,
            createdAt: post.createdAt || null
        }))

        // Fetch Global Settings
        const settingsDoc = await db.collection('settings').doc('blog').get()
        const settings = settingsDoc.exists ? settingsDoc.data() : {}

        return {
            props: {
                posts: serializedPosts,
                page,
                hasMore,
                categories: allCategories, // Using Tags as categories for now
                activeCategory: category,
                searchQuery: search || null,
                settings
            }
        }
    } catch (error) {
        console.error('Error fetching blog posts:', error)
        return {
            props: {
                posts: [],
                page: 1,
                hasMore: false,
                categories: [],
                activeCategory: null,
                searchQuery: null
            }
        }
    }
}
