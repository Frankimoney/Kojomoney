
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { GetStaticProps } from 'next'
import { BlogPost } from '@/types/blog'
import BlogLayout from '@/components/blog/BlogLayout'
import CategoryScroller from '@/components/blog/CategoryScroller'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, ArrowRight, Search, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { getCategoryById } from '@/lib/blog-categories'
import { apiCall } from '@/lib/api-client'
import { getBlogPosts, GetPostsResult } from '@/lib/blog-service'

interface BlogIndexProps {
    initialData: GetPostsResult
    error?: string
}

export default function BlogIndex({ initialData, error }: BlogIndexProps) {
    const router = useRouter()

    // Initialize state with SSG data
    const [posts, setPosts] = useState<BlogPost[]>(initialData?.posts || [])
    const [page, setPage] = useState(initialData?.page || 1)
    const [hasMore, setHasMore] = useState(initialData?.hasMore || false)
    const [categories, setCategories] = useState<string[]>(initialData?.categories || [])
    const [activeCategory, setActiveCategory] = useState<string | null>(initialData?.activeCategory || null)
    const [searchQuery, setSearchQuery] = useState<string | null>(initialData?.searchQuery || null)
    const [settings, setSettings] = useState<any>(initialData?.settings || {})

    // Only show loading for client-side transitions (not initial load)
    const [loading, setLoading] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [showSearch, setShowSearch] = useState(false)

    // Handle client-side navigation/filtering updates
    useEffect(() => {
        // Skip the first run as data is already provided via props (unless query params change mismatching props)
        if (!router.isReady) return

        const { page: qPage, category: qCategory, search: qSearch } = router.query

        // If the query params match the initial data, we don't need to refetch
        // (This logic can be refined, but simplest is to just fetch if params exist and differ)
        const isDefault = !qPage && !qCategory && !qSearch
        if (isDefault) return // Stick with initial SSG data

        const fetchPosts = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (qPage) params.set('page', qPage as string)
                if (qCategory) params.set('category', qCategory as string)
                if (qSearch) params.set('search', qSearch as string)

                const response = await apiCall(`/api/blog/posts?${params.toString()}`)
                const data = await response.json()

                setPosts(data.posts || [])
                setPage(data.page || 1)
                setHasMore(data.hasMore || false)
                setCategories(data.categories || [])
                setActiveCategory(data.activeCategory || null)
                setSearchQuery(data.searchQuery || null)
                setSettings(data.settings || {}) // Keep setting updates just in case

                if (data.searchQuery) {
                    setSearchInput(data.searchQuery)
                    setShowSearch(true)
                }
            } catch (error) {
                console.error('Error fetching posts:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchPosts()
    }, [router.isReady, router.query.page, router.query.category, router.query.search])

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
                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                        <span className="ml-3 text-muted-foreground">Loading articles...</span>
                    </div>
                ) : (
                    /* Posts Grid */
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
                                                    <Image
                                                        src={post.featuredImage.url}
                                                        alt={post.featuredImage.alt || post.title}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                        className="object-cover transition-transform hover:scale-105 duration-500"
                                                        loading="lazy"
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
                )}
            </div>
        </BlogLayout>
    )
}

export const getStaticProps: GetStaticProps = async () => {
    try {
        const data = await getBlogPosts({ page: 1 })

        const isStatic = process.env.BUILD_MODE === 'static';

        return {
            props: {
                initialData: JSON.parse(JSON.stringify(data)) // Ensure serializability
            },
            ...(isStatic ? {} : { revalidate: 60 }), // ISR: Revalidate only if not static export
        }
    } catch (error) {
        console.error('SSG Error:', error)
        const isStatic = process.env.BUILD_MODE === 'static';
        return {
            props: {
                initialData: {
                    posts: [],
                    page: 1,
                    hasMore: false,
                    categories: [],
                    activeCategory: null,
                    searchQuery: null,
                    settings: {}
                },
                error: 'Failed to fetch posts'
            },
            ...(isStatic ? {} : { revalidate: 60 })
        }
    }
}

