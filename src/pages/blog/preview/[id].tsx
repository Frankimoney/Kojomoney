import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { apiJson } from '@/lib/api-client'
import { BlogPost } from '@/types/blog'
import { getAdminToken } from '@/components/AdminLogin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Zap, Star, Check, HelpCircle } from 'lucide-react'
import EEATSignals, { TrustSignalsBar, EnhancedAuthorBox, SourcesCitations, ArticleMetaFooter, EditorialDisclosure } from '@/components/blog/EEATSignals'
import Head from 'next/head'
import PostActionBar from '@/components/blog/PostActionBar'
import BlogBreadcrumbs, { buildPostBreadcrumbs } from '@/components/blog/BlogBreadcrumbs'

// In a real app, we'd import the actual Frontend Blog Layout components here
// For now, we'll simulate the layout or import if available.
// Let's assume a basic layout for the preview.

export default function BlogPreview() {
    const router = useRouter()
    const { id } = router.query
    const [post, setPost] = useState<BlogPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (id) {
            const token = getAdminToken()
            if (token) {
                loadDraft(token)
            } else {
                setError('Unauthorized. Please log in as admin.')
                setLoading(false)
            }
        }
    }, [id])

    const loadDraft = async (token: string) => {

        try {
            const res = await apiJson<{ success: boolean; data: BlogPost }>(`/api/admin/blog/${id}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.success) {
                console.log('[Preview] Loaded post:', res.data?.title, 'Featured Image:', res.data?.featuredImage)
                setPost(res.data)
            } else {
                setError('Failed to load draft')
            }
        } catch (err) {
            setError('Error loading draft')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!post) return null

    return (
        <div className="min-h-screen bg-background">
            <Head>
                <title>Preview: {post.title}</title>
                <meta name="robots" content="noindex" />
            </Head>

            {/* Preview Banner */}
            <div className="fixed top-0 left-0 right-0 h-12 bg-yellow-400 text-yellow-900 flex items-center justify-between px-4 z-50 shadow-md">
                <div className="flex items-center gap-2 font-bold">
                    <span>🚧 Preview Mode</span>
                    <span className="text-xs font-normal opacity-75">(Draft)</span>
                </div>
                <Button size="sm" variant="ghost" className="hover:bg-yellow-500/20 text-yellow-900" onClick={() => window.close()}>
                    Close Preview
                </Button>
            </div>

            {/* Blog Content (Simulated Layout) */}
            <main className="container max-w-4xl mx-auto pt-24 pb-12 px-4">
                <Button variant="ghost" className="mb-6" onClick={() => window.close()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Editor
                </Button>

                <article>
                    {/* Breadcrumbs */}
                    <BlogBreadcrumbs
                        items={buildPostBreadcrumbs({ title: post.title, categories: post.categories })}
                        className="mb-6"
                    />

                    {/* Modern Header */}
                    <header className="mb-10 text-center">
                        <div className="flex justify-center">
                            <TrustSignalsBar post={post} />
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {post.categories?.map(catId => (
                                <Badge key={catId} variant="secondary" className="px-3 py-1 text-sm font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 uppercase tracking-wide">
                                    {catId.replace('-', ' ')}
                                </Badge>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-100">
                            {post.title}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                            {post.author?.name && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900 dark:text-slate-200">{post.author.name}</span>
                                </div>
                            )}
                            {post.updatedAt && <span>Updated {new Date(post.updatedAt).toLocaleDateString()}</span>}
                        </div>
                    </header>

                    {/* Featured Image */}
                    {post.featuredImage && (
                        <div className="mb-12 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2.5rem] opacity-20 blur-lg group-hover:opacity-30 transition duration-1000"></div>
                            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl">
                                <img
                                    src={post.featuredImage.url}
                                    alt={post.featuredImage.alt || 'Featured image'}
                                    title={post.featuredImage.title}
                                    className="w-full h-auto object-cover max-h-[600px] transform group-hover:scale-105 transition duration-700 ease-out"
                                />
                            </div>
                            {post.featuredImage.caption && (
                                <p className="text-center text-sm text-muted-foreground mt-4 italic">{post.featuredImage.caption}</p>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <EditorialDisclosure post={post} />

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
                        className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-img:rounded-3xl prose-img:shadow-lg leading-loose
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

                    {/* Action Bar */}
                    <PostActionBar
                        postTitle={post.title}
                        postSlug={post.slug}
                        className="my-10"
                    />
                </article>

                {/* FAQ */}
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

                {/* GEO: Conversational Keywords */}
                {post.geoKeywords && post.geoKeywords.length > 0 && (
                    <div className="mt-8 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-violet-500 flex-shrink-0" />
                            <span className="truncate">Common Questions & Topics</span>
                        </h3>
                        <div className="flex flex-wrap gap-2 w-full">
                            {post.geoKeywords.map((keyword, i) => (
                                <Badge key={i} variant="outline" className="px-3 py-1 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-normal text-slate-600 dark:text-slate-400 break-words max-w-full">
                                    {keyword}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <SourcesCitations sources={post.sources} />
                <EnhancedAuthorBox author={post.author} post={post} />
                <ArticleMetaFooter post={post} />
            </main>
        </div>
    )
}
