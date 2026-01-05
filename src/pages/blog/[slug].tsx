'use client'

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BlogPost } from '@/types/blog'
import BlogLayout from '@/components/blog/BlogLayout'
import PostActionBar from '@/components/blog/PostActionBar'
import BlogBreadcrumbs, { buildPostBreadcrumbs } from '@/components/blog/BlogBreadcrumbs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, Share2, Facebook, Twitter, Linkedin, ArrowRight, Star, Check, Zap, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import BlogAnalytics from '@/components/blog/BlogAnalytics'
import EEATSignals, { TrustSignalsBar, EnhancedAuthorBox, SourcesCitations, ArticleMetaFooter, EditorialDisclosure } from '@/components/blog/EEATSignals'
import { apiCall } from '@/lib/api-client'

export default function BlogPostPage() {
    const router = useRouter()
    const { slug } = router.query

    const [post, setPost] = useState<BlogPost | null>(null)
    const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
    const [settings, setSettings] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toc, setToc] = useState<{ id: string, text: string, level: number }[]>([])

    // Fetch post data
    useEffect(() => {
        const fetchPost = async () => {
            if (!slug) return

            setLoading(true)
            setError(null)

            try {
                const data = await apiCall(`/api/blog/${slug}`)

                if (data.error) {
                    setError(data.error)
                    return
                }

                setPost(data.post)
                setRelatedPosts(data.relatedPosts || [])
                setSettings(data.settings || {})
            } catch (err) {
                console.error('Error fetching post:', err)
                setError('Failed to load article')
            } finally {
                setLoading(false)
            }
        }

        if (router.isReady) {
            fetchPost()
        }
    }, [router.isReady, slug])

    // Generate Table of Contents after content loads
    useEffect(() => {
        if (!post?.content || typeof window === 'undefined') return

        // Small delay to ensure DOM is updated
        const timer = setTimeout(() => {
            const headers = document.querySelectorAll('.blog-content h2, .blog-content h3')
            const items = Array.from(headers).map((header, index) => {
                const id = `heading-${index}`
                header.id = id
                return {
                    id,
                    text: header.textContent || '',
                    level: parseInt(header.tagName[1])
                }
            })
            setToc(items)
        }, 100)

        return () => clearTimeout(timer)
    }, [post?.content])

    // Loading state
    if (loading) {
        return (
            <BlogLayout settings={settings}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                    <span className="ml-3 text-muted-foreground">Loading article...</span>
                </div>
            </BlogLayout>
        )
    }

    // Error state
    if (error || !post) {
        return (
            <BlogLayout settings={settings}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
                    <p className="text-muted-foreground mb-6">{error || 'The article you are looking for does not exist.'}</p>
                    <Link href="/blog">
                        <Button>Back to Blog</Button>
                    </Link>
                </div>
            </BlogLayout>
        )
    }

    // JSON-LD Schema
    const schema = {
        "@context": "https://schema.org",
        "@type": post.schemaType || "Article",
        "headline": post.metaTitle || post.title,
        "description": post.metaDescription || post.excerpt,
        "image": post.featuredImage?.url,
        "author": {
            "@type": "Person",
            "name": post.author?.name || "KojoMoney Team",
            "url": "https://kojomoney.com"
        },
        "publisher": {
            "@type": "Organization",
            "name": "KojoMoney",
            "logo": {
                "@type": "ImageObject",
                "url": "https://kojomoney.com/logo.png"
            }
        },
        "datePublished": post.publishedAt,
        "dateModified": post.updatedAt || post.publishedAt,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://kojomoney.com/blog/${post.slug}`
        }
    }

    // FAQ Schema
    let faqSchema: any = null
    if (post.faq && post.faq.length > 0) {
        faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": post.faq.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer
                }
            }))
        }
    }

    // Breadcrumb Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://kojomoney.com"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://kojomoney.com/blog"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": post.title,
                "item": `https://kojomoney.com/blog/${post.slug}`
            }
        ]
    }

    // HowTo Schema (if post has howTo)
    let howToSchema: any = null
    if (post.howTo && post.howTo.steps && post.howTo.steps.length > 0) {
        howToSchema = {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": post.howTo.name || post.metaTitle || post.title,
            "description": post.howTo.description || post.metaDescription || post.excerpt,
            "image": post.featuredImage?.url,
            "totalTime": post.howTo.totalTime || "PT30M",
            "supply": post.howTo.supply?.map(s => ({ "@type": "HowToSupply", "name": s })),
            "tool": post.howTo.tool?.map(t => ({ "@type": "HowToTool", "name": t })),
            "step": post.howTo.steps.map((step, index) => ({
                "@type": "HowToStep",
                "position": index + 1,
                "name": step.name,
                "text": step.text,
                "image": step.image || undefined
            }))
        }
    }

    return (
        <BlogLayout settings={settings}>
            <Head>
                <title>{post.metaTitle || post.title} | KojoMoney</title>
                <meta name="description" content={post.metaDescription || post.excerpt} />
                <link rel="canonical" href={post.canonicalUrl || `https://kojomoney.com/blog/${post.slug}`} />
                {post.noIndex && <meta name="robots" content="noindex" />}

                {/* OG Tags */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.metaTitle || post.title} />
                <meta property="og:description" content={post.metaDescription || post.excerpt} />
                <meta property="og:image" content={post.ogImage || post.featuredImage?.url} />
                <meta property="og:url" content={`https://kojomoney.com/blog/${post.slug}`} />

                {/* Schema */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
                {faqSchema && (
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
                )}
                {howToSchema && (
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
                )}
            </Head>

            <BlogAnalytics postId={post.id} title={post.title} />

            <article className="container mx-auto px-4 py-8 md:py-16">
                {/* Breadcrumbs */}
                <BlogBreadcrumbs
                    items={buildPostBreadcrumbs({ title: post.title, categories: post.categories })}
                    className="mb-6"
                />

                <div className="max-w-4xl mx-auto">
                    {/* Modern Header */}
                    <header className="mb-10 text-center">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {post.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200">
                                    {tag}
                                </Badge>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-100">
                            {post.title}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                {post.author?.avatar ? (
                                    <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                                        <User className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                        {post.author?.name || 'KojoMoney Team'}
                                        {post.author?.verified && (
                                            <svg className="h-4 w-4 text-blue-500 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                        )}
                                    </div>
                                    <div className="text-xs">
                                        {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Draft'}
                                    </div>
                                </div>
                            </div>
                            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                                <Clock className="h-4 w-4" />
                                {post.readingTime || 5} min read
                            </div>
                        </div>

                        {/* Trust Signals (moved below meta) */}
                        <div className="mt-6 flex justify-center">
                            <TrustSignalsBar post={post} />
                        </div>
                    </header>

                    {/* Featured Image - Modern & Wide */}
                    {post.featuredImage && (
                        <div className="mb-12 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2.5rem] opacity-20 blur-lg group-hover:opacity-30 transition duration-1000"></div>
                            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl">
                                <img
                                    src={post.featuredImage.url}
                                    alt={post.featuredImage.alt}
                                    title={post.featuredImage.title}
                                    className="w-full h-auto object-cover max-h-[600px] transform group-hover:scale-105 transition duration-700 ease-out"
                                />
                            </div>
                            {post.featuredImage.caption && (
                                <p className="text-center text-sm text-muted-foreground mt-4 italic">{post.featuredImage.caption}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto">
                    {/* Left Sidebar (Share) - Hidden on mobile, sticky on desktop */}
                    <div className="hidden lg:block lg:col-span-2">
                        <div className="sticky top-32 flex flex-col gap-4 items-center">
                            <div className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-blue-50 hover:text-blue-600"><Facebook className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-sky-50 hover:text-sky-500"><Twitter className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-blue-50 hover:text-blue-700"><Linkedin className="h-5 w-5" /></Button>
                                <div className="w-full h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-50"><Share2 className="h-5 w-5" /></Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-7">
                        {/* Mobile TOC / Summary */}
                        {toc.length > 0 && (
                            <div className="lg:hidden mb-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="font-bold text-lg mb-4">Table of Contents</p>
                                <ul className="space-y-2 text-sm">
                                    {toc.map(item => (
                                        <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
                                            <a href={`#${item.id}`} className="text-muted-foreground hover:text-primary block py-1">{item.text}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Article Body */}

                        {/* AEO: Direct Answer */}
                        {post.directAnswer && (
                            <div className="mb-8 p-6 bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500 rounded-r-xl">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-2 flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Quick Answer
                                </h3>
                                <p className="font-medium text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                    {post.directAnswer}
                                </p>
                            </div>
                        )}

                        {/* AEO: Key Takeaways */}
                        {post.keyTakeaways && post.keyTakeaways.length > 0 && (
                            <div className="mb-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 sm:p-8">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Star className="h-5 w-5 text-amber-500 fill-current" />
                                    Key Takeaways
                                </h3>
                                <ul className="grid gap-3">
                                    {post.keyTakeaways.map((point, i) => (
                                        <li key={i} className="flex gap-3 text-base">
                                            <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-slate-700 dark:text-slate-300">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div
                            className="blog-content prose prose-lg prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-img:rounded-3xl prose-img:shadow-lg leading-loose
                                [&_h1]:text-4xl [&_h1]:font-black [&_h1]:mb-6 [&_h1]:mt-8
                                [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:dark:border-slate-700 [&_h2]:pb-3
                                [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mb-3 [&_h3]:mt-8
                                [&_p]:mb-5 [&_p]:text-slate-700 [&_p]:dark:text-slate-300 [&_p]:leading-relaxed
                                [&_strong]:font-bold [&_strong]:text-slate-900 [&_strong]:dark:text-white
                                [&_em]:italic
                                [&_u]:underline
                                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:space-y-2
                                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:space-y-2
                                [&_li]:text-slate-700 [&_li]:dark:text-slate-300
                                [&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:dark:text-slate-400 [&_blockquote]:my-8 [&_blockquote]:bg-slate-50 [&_blockquote]:dark:bg-slate-800/50 [&_blockquote]:py-4 [&_blockquote]:pr-4 [&_blockquote]:rounded-r-xl
                                [&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded-md [&_code]:text-sm [&_code]:font-mono [&_code]:text-violet-700 [&_code]:dark:text-violet-300
                                [&_a]:text-violet-600 [&_a]:dark:text-violet-400 [&_a]:underline [&_a]:decoration-violet-300 [&_a]:hover:decoration-violet-500 [&_a]:underline-offset-2
                                [&_hr]:my-10 [&_hr]:border-slate-200 [&_hr]:dark:border-slate-700"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Action Bar - Convert readers to earners */}
                        <PostActionBar
                            postTitle={post.title}
                            postSlug={post.slug}
                            className="my-10"
                        />
                        {post.faq && post.faq.length > 0 && (
                            <div className="mt-12 border-t pt-8">
                                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                                <div className="space-y-6">
                                    {post.faq.map((item, i) => (
                                        <div key={i} className="border-b pb-4 last:border-0">
                                            <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                                            <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: item.answer }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sources & Citations */}
                        <SourcesCitations sources={post.sources} />

                        {/* Article Meta Footer */}
                        <ArticleMetaFooter post={post} />

                        {/* Enhanced Author Box */}
                        <EnhancedAuthorBox author={post.author} post={post} />
                    </div>

                    {/* Right Sidebar (Desktop TOC) */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-32">
                            {toc.length > 0 && (
                                <div className="pl-6 border-l border-slate-200 dark:border-slate-800">
                                    <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-400">On this page</h4>
                                    <ul className="space-y-3 text-sm">
                                        {toc.map(item => (
                                            <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
                                                <a href={`#${item.id}`} className="text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors block py-0.5 leading-relaxed">
                                                    {item.text}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="mt-20 pt-12 border-t">
                        <h2 className="text-3xl font-bold mb-8 text-center">Read Next</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {relatedPosts.map(related => (
                                <Card key={related.id} className="hover:shadow-md transition-all">
                                    <CardHeader>
                                        <Link href={`/blog/${related.slug}`}>
                                            <CardTitle className="cursor-pointer hover:text-primary line-clamp-2">{related.title}</CardTitle>
                                        </Link>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-3">{related.excerpt}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Link href={`/blog/${related.slug}`} className="text-sm text-primary font-bold flex items-center gap-1">
                                            Read Article <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </article>
        </BlogLayout>
    )
}
