import React, { useState, useEffect } from 'react'
import { apiJson } from '@/lib/api-client'
import { BlogPost, ContentBlock, BlogAuthor, FeaturedImage } from '@/types/blog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ArrowLeft, Save, Eye, Loader2, Link as LinkIcon, Image as ImageIcon,
    Box, Wand2, Bold, Italic, Heading1, Heading2, Heading3, List, Quote,
    Sparkles, FileText, Settings2, BarChart3, Shield, Plus, Trash2, ExternalLink,
    Clock, Target, Zap, CheckCircle2, AlertCircle, ChevronRight,
    AlignLeft, AlignCenter, AlignRight, Underline, Strikethrough, ListOrdered, Code, Minus
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import TiptapUnderline from '@tiptap/extension-underline'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import InternalLinkPicker from './InternalLinkPicker'
import AIWritingTools from './AIWritingTools'
import MediaManager from './MediaManager'
import VersionHistory from './VersionHistory'
import SchemaBuilder from './SchemaBuilder'
import HowToBuilder from './HowToBuilder'
import RelatedPostPicker from './RelatedPostPicker'
import SERPPreview from './SERPPreview'
import ReadabilityScore from './ReadabilityScore'
import ImageSEOChecker from './ImageSEOChecker'
import HeadingChecker from './HeadingChecker'
import LinkChecker from './LinkChecker'
import { BLOG_CATEGORIES } from '@/lib/blog-categories'
import { CalloutExtension } from './CalloutExtension'
import { DEEP_LINKS, APP_SCHEME } from '@/lib/deep-links'
import { Megaphone, Smartphone } from 'lucide-react'

const FloatingToolbar = ({
    editor,
    onOpenLinkPicker,
    onOpenMediaPicker,
    blocks,
    onInsertBlock,
    onSmartCallout,
    isAiLoading
}: {
    editor: any,
    onOpenLinkPicker: () => void,
    onOpenMediaPicker: () => void,
    blocks: ContentBlock[],
    onInsertBlock: (content: string) => void,
    onSmartCallout: () => void,
    isAiLoading: boolean
}) => {
    if (!editor) return null

    const ToolButton = ({ active, onClick, children, title }: { active?: boolean, onClick: () => void, children: React.ReactNode, title: string }) => (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClick()
            }}
            onMouseDown={(e) => e.preventDefault()}
            title={title}
            className={`
                relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-200 ease-out min-w-[36px] min-h-[36px] flex items-center justify-center
                ${active
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 scale-105'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
            `}
        >
            {children}
        </button>
    )

    return (
        <div className="fixed top-16 left-0 right-0 z-40 px-2 sm:px-4 py-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto scrollbar-hide mx-auto max-w-fit">
                {/* Text Formatting */}
                <div className="flex items-center gap-0.5 px-1">
                    <ToolButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                        <Bold className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                        <Italic className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
                        <Underline className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
                        <Strikethrough className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
                        <Code className="h-4 w-4" />
                    </ToolButton>
                </div>

                <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />

                {/* Headings */}
                <div className="flex items-center gap-0.5 px-1">
                    <ToolButton
                        active={editor.isActive('heading', { level: 1 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        title="Heading 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton
                        active={editor.isActive('heading', { level: 2 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        title="Heading 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton
                        active={editor.isActive('heading', { level: 3 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        title="Heading 3"
                    >
                        <Heading3 className="h-4 w-4" />
                    </ToolButton>
                </div>

                <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />

                {/* Text Alignment */}
                <div className="flex items-center gap-0.5 px-1">
                    <ToolButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
                        <AlignLeft className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
                        <AlignCenter className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
                        <AlignRight className="h-4 w-4" />
                    </ToolButton>
                </div>

                <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />

                {/* Lists & Quotes */}
                <div className="flex items-center gap-0.5 px-1">
                    <ToolButton
                        active={editor.isActive('bulletList')}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        title="Bullet List"
                    >
                        <List className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton
                        active={editor.isActive('orderedList')}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        title="Numbered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton
                        active={editor.isActive('blockquote')}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        title="Quote"
                    >
                        <Quote className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Horizontal Line"
                    >
                        <Minus className="h-4 w-4" />
                    </ToolButton>
                </div>

                <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />

                {/* Media & Links */}
                <div className="flex items-center gap-0.5 px-1">
                    <ToolButton onClick={onOpenLinkPicker} title="Insert Link">
                        <LinkIcon className="h-4 w-4" />
                    </ToolButton>
                    <ToolButton onClick={onOpenMediaPicker} title="Insert Image">
                        <ImageIcon className="h-4 w-4" />
                    </ToolButton>
                </div>

                <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />

                {/* Mobile Features */}
                <div className="flex items-center gap-0.5 px-1">
                    <ToolButton
                        active={editor.isActive('callout')}
                        onClick={onSmartCallout}
                        title="Insert Smart Callout (Select text for AI auto-detect)"
                    >
                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                    </ToolButton>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-200 ease-out min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 outline-none focus:ring-0"
                                title="Insert App Deep Link"
                                onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                            >
                                <Smartphone className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-56" sideOffset={10}>
                            <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1.5 opacity-50">App Deep Links</div>
                            {DEEP_LINKS.map(link => (
                                <DropdownMenuItem
                                    key={link.id}
                                    onClick={() => {
                                        editor.chain().focus()
                                            .insertContent(`<a href="${link.url}" class="deep-link-chip" data-type="app-link">📱 ${link.name}</a> `)
                                            .run()
                                    }}
                                    className="gap-2 cursor-pointer"
                                >
                                    <span>{link.icon}</span>
                                    <span>{link.name}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>


                {/* Block Picker */}
                {
                    blocks.length > 0 && (
                        <>
                            <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                            <Select onValueChange={(val) => onInsertBlock(val)}>
                                <SelectTrigger className="w-[130px] h-9 text-xs border-0 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                    <Box className="h-3.5 w-3.5 mr-2 text-violet-500" />
                                    <SelectValue placeholder="Blocks" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {blocks.map(block => (
                                        <SelectItem key={block.id} value={block.content || ''} className="rounded-lg">
                                            {block.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    )
                }
            </div >
        </div >
    )
}

interface PostEditorProps {
    postId: string | null
    adminToken: string
    onBack: () => void
    onPostCreated?: (id: string) => void
}

export default function PostEditor({ postId, adminToken, onBack, onPostCreated }: PostEditorProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [status, setStatus] = useState<'draft' | 'published' | 'scheduled' | 'pending_review'>('draft')
    const [author, setAuthor] = useState<BlogAuthor>({ id: 'admin', name: 'KojoMoney Team' })
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [sendPushNotification, setSendPushNotification] = useState(false)

    // SEO Fields
    const [metaTitle, setMetaTitle] = useState('')
    const [metaDescription, setMetaDescription] = useState('')
    const [focusKeyword, setFocusKeyword] = useState('')
    const [canonicalUrl, setCanonicalUrl] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [faq, setFaq] = useState<{ question: string, answer: string }[]>([])
    const [howTo, setHowTo] = useState<{ name: string; description: string; totalTime?: string; steps: { name: string; text: string; image?: string }[]; tool?: string[]; supply?: string[] } | undefined>(undefined)
    const [relatedPostIds, setRelatedPostIds] = useState<string[]>([])
    const [autoFillingSEO, setAutoFillingSEO] = useState(false)

    // E-E-A-T Fields
    const [experienceBadge, setExperienceBadge] = useState<'tested' | 'reviewed' | 'hands-on' | 'expert-written' | ''>('')
    const [factCheckedBy, setFactCheckedBy] = useState('')
    const [reviewedBy, setReviewedBy] = useState('')
    const [disclosures, setDisclosures] = useState('')
    const [sources, setSources] = useState<{ title: string; url: string }[]>([])

    // AEO & GEO Fields
    const [keyTakeaways, setKeyTakeaways] = useState<string[]>([])
    const [directAnswer, setDirectAnswer] = useState('')
    const [geoKeywords, setGeoKeywords] = useState<string[]>([])
    const [generatingAEO, setGeneratingAEO] = useState(false)





    // Editor Data
    const [featuredImage, setFeaturedImage] = useState<FeaturedImage | null>(null)
    const [mediaPickerMode, setMediaPickerMode] = useState<'editor' | 'featured'>('editor')

    const [blocks, setBlocks] = useState<ContentBlock[]>([])
    const [showLinkPicker, setShowLinkPicker] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [showRelatedPicker, setShowRelatedPicker] = useState(false)
    const [sidebarTab, setSidebarTab] = useState('publish')
    const [isAiLoading, setIsAiLoading] = useState(false) // New state for AI button loading

    const handleSmartCallout = async () => {
        if (!editor) return

        const { selection } = editor.state
        const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ')

        // If no selection, standard toggle behavior
        if (!selectedText || selectedText.length < 5) {
            const types = ['info', 'bonus', 'alert', 'tip'] as const
            const current = editor.getAttributes('callout').type
            const next = types[(types.indexOf(current) + 1) % types.length] || 'info'
            if (editor.isActive('callout')) {
                editor.chain().focus().updateAttributes('callout', { type: next }).run()
            } else {
                editor.chain().focus().setCallout({ type: 'info' }).run()
            }
            return
        }

        // AI Mode
        setIsAiLoading(true)
        try {
            const res = await apiJson<{ success: boolean; content?: string }>('/api/admin/blog/ai-generate', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ mode: 'callout', content: selectedText })
            })

            if (res.success && res.content) {
                const data = JSON.parse(res.content)
                editor.chain().focus()
                    .deleteSelection()
                    .insertContent({
                        type: 'callout',
                        attrs: { type: data.type },
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: data.text }] }]
                    })
                    .run()
            }
        } catch (error) {
            console.error(error)
            // Fallback to simple info callout
            editor.chain().focus().setCallout({ type: 'info' }).run()
        } finally {
            setIsAiLoading(false)
        }
    }

    const [initialContent, setInitialContent] = useState<string | null>(null)
    const [stats, setStats] = useState<{ views: number; countries: Record<string, number>; referrers?: Record<string, number> } | null>(null)

    const extensions = React.useMemo(() => [
        StarterKit.configure({
            // Disable link from StarterKit because we add TiptapLink separately with custom config
            link: false,
        }),
        TiptapLink.configure({
            openOnClick: false,
            HTMLAttributes: {
                class: 'text-violet-600 dark:text-violet-400 underline decoration-violet-300 dark:decoration-violet-700 underline-offset-2 hover:decoration-violet-500 transition-colors',
            },
        }),
        CalloutExtension,
        TiptapImage.configure({
            inline: true,
            allowBase64: true,
            HTMLAttributes: {
                class: 'rounded-2xl max-w-full h-auto shadow-lg my-6',
            },
        }),
        Placeholder.configure({
            placeholder: 'Start writing your amazing content...',
        }),
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        TiptapUnderline,
    ], [])

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[600px] px-4 py-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-4 [&_blockquote]:italic',
            },
        },
    })

    useEffect(() => {
        loadBlocks()
        if (postId) {
            loadPost()
        }
    }, [postId])

    useEffect(() => {
        if (editor && initialContent !== null) {
            editor.commands.setContent(initialContent)
            setInitialContent(null)
        }
    }, [editor, initialContent])

    const loadBlocks = async () => {
        try {
            const res = await apiJson<{ success: boolean, data: ContentBlock[] }>('/api/admin/blog/blocks', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) setBlocks(res.data)
        } catch (e) { console.error(e) }
    }

    const loadPost = async () => {
        if (!postId) return
        setLoading(true)
        try {
            const res = await apiJson<{ success: boolean, data: BlogPost }>(`/api/admin/blog/${postId}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success) {
                const post = res.data
                setTitle(post.title)
                setSlug(post.slug)
                setStatus(post.status)
                setMetaTitle(post.metaTitle || '')
                setMetaDescription(post.metaDescription || '')
                setFocusKeyword(post.focusKeyword || '')
                setCanonicalUrl(post.canonicalUrl || '')
                setExcerpt(post.excerpt || '')
                setFaq(post.faq || [])
                setHowTo(post.howTo)
                setRelatedPostIds(post.relatedPostIds || [])
                if (post.author) setAuthor(post.author)

                // Load E-E-A-T fields
                if (post.experienceBadge) setExperienceBadge(post.experienceBadge)
                if (post.factCheckedBy) setFactCheckedBy(post.factCheckedBy)
                if (post.reviewedBy) setReviewedBy(post.reviewedBy)
                if (post.disclosures) setDisclosures(post.disclosures)
                if (post.sources) setSources(post.sources || [])
                if (post.featuredImage) setFeaturedImage(post.featuredImage)

                // Load AEO/GEO fields
                if (post.keyTakeaways) setKeyTakeaways(post.keyTakeaways)
                if (post.directAnswer) setDirectAnswer(post.directAnswer)
                if (post.geoKeywords) setGeoKeywords(post.geoKeywords)

                // Load categories
                if (post.categories && post.categories.length > 0) {
                    setSelectedCategory(post.categories[0])
                }

                if (post.sendPushNotification) setSendPushNotification(post.sendPushNotification)

                // Load Stats if available (assuming it's in the document or a sub-fetch, but for now assuming it's returned if we updated API)
                // If not in standard API, we might need separate call, but let's assume 'stats' field exists optionally on BlogPost
                if ((post as any).stats) setStats((post as any).stats)

                if (editor) {
                    editor.commands.setContent(post.content)
                } else {
                    setInitialContent(post.content)
                }
            }
        } catch (error) {
            console.error('Failed to load post', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const content = editor?.getHTML() || ''
            const payload = {
                title,
                slug,
                content,
                status,
                featuredImage: featuredImage || undefined,
                author,
                categories: selectedCategory ? [selectedCategory] : [],
                sendPushNotification,
                metaTitle,
                metaDescription,
                focusKeyword,
                canonicalUrl,
                excerpt,
                faq,
                howTo,
                relatedPostIds,
                // E-E-A-T fields
                experienceBadge: experienceBadge || undefined,
                factCheckedBy: factCheckedBy || undefined,
                factCheckedAt: factCheckedBy ? Date.now() : undefined,
                reviewedBy: reviewedBy || undefined,
                lastReviewedAt: reviewedBy ? Date.now() : undefined,
                disclosures: disclosures || undefined,
                sources: sources.length > 0 ? sources : undefined,
                // AEO & GEO
                keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : undefined,
                directAnswer: directAnswer || undefined,
                geoKeywords: geoKeywords.length > 0 ? geoKeywords : undefined
            }

            if (postId) {
                await apiJson(`/api/admin/blog/${postId}`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify(payload)
                })
            } else {
                const res = await apiJson<{ success: boolean, data: BlogPost }>('/api/admin/blog', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify(payload)
                })
                if (res.success && res.data?.id && onPostCreated) {
                    onPostCreated(res.data.id)
                }
            }
        } catch (error) {
            console.error('Failed to save', error)
        } finally {
            setSaving(false)
        }
    }

    const handlePreview = () => {
        if (postId) {
            window.open(`/blog/preview/${postId}`, '_blank')
        } else {
            alert('Please save the post first to preview.')
        }
    }

    const handleAutoFillSEO = async () => {
        const content = editor?.getHTML() || ''
        if (!title || content.length < 100) {
            alert('Add a title and more content before auto-filling SEO.')
            return
        }

        setAutoFillingSEO(true)
        try {
            const res = await apiJson<{
                success: boolean;
                data?: {
                    metaTitle: string;
                    metaDescription: string;
                    focusKeyword: string;
                    slug: string;
                    excerpt: string
                };
                error?: string
            }>('/api/admin/blog/ai-auto-seo', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ title, content })
            })

            if (res.success && res.data) {
                if (!metaTitle && res.data.metaTitle) setMetaTitle(res.data.metaTitle)
                if (!metaDescription && res.data.metaDescription) setMetaDescription(res.data.metaDescription)
                if (!focusKeyword && res.data.focusKeyword) setFocusKeyword(res.data.focusKeyword)
                if (!slug && res.data.slug) setSlug(res.data.slug)
                if (!excerpt && res.data.excerpt) setExcerpt(res.data.excerpt)
            } else {
                alert(res.error || 'Failed to auto-fill SEO')
            }
        } catch (error) {
            console.error('Auto SEO error:', error)
            alert('Failed to auto-fill SEO')
        } finally {
            setAutoFillingSEO(false)
        }
    }

    const handleGenerateAEO = async () => {
        const content = editor?.getHTML() || ''
        if (!title || content.length < 100) {
            alert('Add a title and some content before generating AEO data.')
            return
        }

        setGeneratingAEO(true)
        try {
            const res = await apiJson<{
                success: boolean;
                data?: {
                    keyTakeaways: string[];
                    directAnswer: string;
                    geoKeywords: string[];
                };
                error?: string
            }>('/api/admin/blog/ai-geo', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ title, content, focusKeyword })
            })

            if (res.success && res.data) {
                if (keyTakeaways.length === 0 && res.data.keyTakeaways) setKeyTakeaways(res.data.keyTakeaways)
                if (!directAnswer && res.data.directAnswer) setDirectAnswer(res.data.directAnswer)
                if (geoKeywords.length === 0 && res.data.geoKeywords) setGeoKeywords(res.data.geoKeywords)
            } else {
                alert(res.error || 'Failed to generate AEO data')
            }
        } catch (error) {
            console.error('AEO generation error:', error)
            alert('Failed to generate AEO data')
        } finally {
            setGeneratingAEO(false)
        }
    }

    const insertBlock = (content: string) => {
        if (!content) return
        editor?.chain().focus().insertContent(content).run()
    }

    const handleLinkSelect = (post: BlogPost) => {
        const url = `/blog/${post.slug}`
        if (editor?.state.selection.empty) {
            editor.chain().focus()
                .insertContent(`<a href="${url}">${post.title}</a>`)
                .run()
        } else {
            editor?.chain().focus()
                .setLink({ href: url })
                .run()
        }
    }

    const handleMediaSelect = (media: { url: string; alt: string; title: string; caption?: string }) => {
        if (mediaPickerMode === 'featured') {
            setFeaturedImage({
                url: media.url,
                alt: media.alt,
                title: media.title,
                caption: media.caption
            })
            return
        }

        if (editor) {
            editor.chain().focus().setImage({
                src: media.url,
                alt: media.alt,
                title: media.title
            }).run()

            if (media.caption) {
                editor.chain().focus().insertContent(`<p class="text-center text-sm text-muted-foreground mt-1">${media.caption}</p>`).run()
            }
        }
    }

    // Word count & reading time
    const wordCount = editor?.getText().split(/\s+/).filter(w => w.length > 0).length || 0
    const readingTime = Math.ceil(wordCount / 200)

    // SEO Score calculation
    const seoChecks = [
        { pass: title.length >= 10 && title.length <= 70, label: 'Title length' },
        { pass: metaDescription.length >= 120 && metaDescription.length <= 160, label: 'Meta description' },
        { pass: focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase()), label: 'Keyword in title' },
        { pass: wordCount >= 300, label: 'Content length' },
        { pass: slug.length > 0, label: 'URL slug set' }
    ]
    const seoScore = Math.round((seoChecks.filter(c => c.pass).length / seoChecks.length) * 100)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-violet-200 dark:border-violet-900"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-violet-600 animate-spin"></div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Loading editor...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/20">
            {/* Modern Header */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-2">
                        {/* Left Section */}
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack}
                                className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                            </Button>

                            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-700" />

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <h1 className="text-sm sm:text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                        {postId ? 'Edit' : 'New'}<span className="hidden sm:inline"> Post</span>
                                    </h1>
                                    <Badge
                                        className={`
                                            text-[8px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 font-semibold uppercase tracking-wider rounded-full border-0 flex-shrink-0
                                            ${status === 'published'
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                                                : status === 'scheduled'
                                                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                                                    : status === 'pending_review'
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        {status === 'pending_review' ? 'Review' : status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:max-w-[250px] hidden xs:block">
                                    {title || 'Untitled Draft'}
                                </p>
                            </div>
                        </div>

                        {/* Right Section - Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            {/* Stats Pills */}
                            <div className="hidden lg:flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{wordCount} words</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{readingTime} min read</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${seoScore >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                    seoScore >= 50 ? 'bg-amber-100 dark:bg-amber-900/30' :
                                        'bg-red-100 dark:bg-red-900/30'
                                    }`}>
                                    <Target className="h-3.5 w-3.5" style={{ color: seoScore >= 80 ? '#10b981' : seoScore >= 50 ? '#f59e0b' : '#ef4444' }} />
                                    <span className="text-xs font-bold" style={{ color: seoScore >= 80 ? '#10b981' : seoScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                                        SEO {seoScore}%
                                    </span>
                                </div>
                            </div>

                            <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />

                            {postId && <VersionHistory postId={postId} adminToken={adminToken} />}

                            <Button
                                variant="outline"
                                onClick={handlePreview}
                                disabled={!postId}
                                className="h-9 sm:h-10 px-2 sm:px-4 rounded-lg sm:rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <Eye className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Preview</span>
                            </Button>

                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="h-9 sm:h-10 px-3 sm:px-5 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">Save</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto p-3 sm:p-6 pt-20 sm:pt-24">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-4 sm:gap-8">
                    {/* Main Editor Column */}
                    <div className="space-y-6">
                        {/* Title Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                            <div className="p-4 sm:p-8 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                                {/* Title Input */}
                                <Input
                                    placeholder="Enter your post title..."
                                    className="text-2xl sm:text-4xl md:text-5xl font-black border-none px-0 shadow-none focus-visible:ring-0 bg-transparent h-auto py-1 sm:py-2 placeholder:text-slate-200 dark:placeholder:text-slate-800 tracking-tight leading-tight"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />

                                {/* Slug Display */}
                                <div className="flex items-center gap-2 max-w-full overflow-x-auto">
                                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 min-w-0">
                                        <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm text-slate-400 font-mono">/blog/</span>
                                        <Input
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="h-5 sm:h-6 w-[150px] sm:w-[250px] text-xs sm:text-sm font-mono border-none shadow-none focus-visible:ring-0 bg-transparent p-0 text-violet-600 dark:text-violet-400 font-semibold"
                                            placeholder="post-url-slug"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Floating Toolbar */}
                            <FloatingToolbar
                                editor={editor}
                                onOpenLinkPicker={() => setShowLinkPicker(true)}
                                onOpenMediaPicker={() => {
                                    setMediaPickerMode('editor')
                                    setShowMediaPicker(true)
                                }}
                                blocks={blocks}
                                onInsertBlock={insertBlock}
                                onSmartCallout={handleSmartCallout}
                                isAiLoading={isAiLoading}
                            />

                            {/* Editor Area */}
                            <div className="min-h-[400px] sm:min-h-[650px] bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
                                <EditorContent editor={editor} className="px-3 sm:px-8 py-4 sm:py-6" />
                            </div>
                        </div>

                        {/* AI Writing Tools */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg sm:rounded-xl">
                                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">AI Writing Assistant</h3>
                                        <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Generate and enhance your content with AI</p>
                                    </div>
                                </div>
                            </div>
                            <AIWritingTools
                                adminToken={adminToken}
                                currentContent={editor?.getHTML() || ''}
                                onApplyContent={(content, newTitle) => {
                                    editor?.commands.setContent(content)
                                    if (newTitle) setTitle(newTitle)
                                }}
                            />
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* Quick Stats Card */}
                        <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl shadow-violet-200/50 dark:shadow-violet-900/30">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h3 className="font-bold text-base sm:text-lg">Content Stats</h3>
                                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-300" />
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="text-center">
                                    <div className="text-center font-bold text-2xl sm:text-3xl">{wordCount}</div>
                                    <div className="text-[10px] sm:text-xs text-violet-200 uppercase tracking-wider">Words</div>
                                </div>
                                <div className="text-center border-x border-white/20">
                                    <div className="text-center font-bold text-2xl sm:text-3xl">{stats?.views || 0}</div>
                                    <div className="text-[10px] sm:text-xs text-violet-200 uppercase tracking-wider">Views</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-center font-bold text-2xl sm:text-3xl">{seoScore}%</div>
                                    <div className="text-[10px] sm:text-xs text-violet-200 uppercase tracking-wider">SEO</div>
                                </div>
                            </div>

                            {/* Short Country Summary */}
                            {/* Short Country Summary */}
                            <div className="mt-4 pt-4 border-t border-white/10 text-xs">
                                <p className="opacity-70 mb-1">Top Locations:</p>
                                {stats && stats.countries && Object.keys(stats.countries).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(stats.countries)
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 3)
                                            .map(([country, count]) => (
                                                <span key={country} className="bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <span>{country}</span>
                                                    <span className="opacity-70 text-[10px]">({count})</span>
                                                </span>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="text-white/50 italic">No views yet</p>
                                )}
                            </div>

                            {/* Top Referrers Summary */}
                            <div className="mt-4 pt-4 border-t border-white/10 text-xs">
                                <p className="opacity-70 mb-1">Top Sources:</p>
                                {stats && stats.referrers && Object.keys(stats.referrers).length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        {Object.entries(stats.referrers)
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 3)
                                            .map(([source, count]) => (
                                                <div key={source} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                                    <span className="truncate max-w-[120px]">{source}</span>
                                                    <span className="font-bold opacity-80">{count}</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="text-white/50 italic">No referral data yet</p>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Tabs */}
                        <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="w-full">
                            <TabsList className="w-full h-12 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl grid grid-cols-4">
                                <TabsTrigger value="publish" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all text-xs">
                                    <Settings2 className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Publish</span>
                                </TabsTrigger>
                                <TabsTrigger value="seo" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all text-xs">
                                    <Target className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">SEO</span>
                                </TabsTrigger>
                                <TabsTrigger value="eeat" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all text-xs">
                                    <Shield className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">E-E-A-T</span>
                                </TabsTrigger>
                                <TabsTrigger value="analysis" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all text-xs">
                                    <BarChart3 className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Analysis</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Publish Tab */}
                            <TabsContent value="publish" className="mt-4 space-y-4">
                                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-100 dark:border-slate-700 px-5 py-4">
                                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <Settings2 className="h-4 w-4" />
                                            Publishing Options
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        {/* Featured Image Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Featured Image</label>
                                            <div
                                                onClick={() => {
                                                    setMediaPickerMode('featured')
                                                    setShowMediaPicker(true)
                                                }}
                                                className={`
                                                    relative aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700
                                                    flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 dark:hover:border-violet-500
                                                    hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group overflow-hidden
                                                    ${featuredImage ? 'border-solid border-slate-200 dark:border-slate-700 p-0' : 'p-4'}
                                                `}
                                            >
                                                {featuredImage ? (
                                                    <>
                                                        <img
                                                            src={featuredImage.url}
                                                            alt={featuredImage.alt}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <Button variant="secondary" size="sm" className="h-8">
                                                                Change
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-8"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setFeaturedImage(null)
                                                                }}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                            <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                            Click to add image
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
                                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                                <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${status === 'published' ? 'bg-emerald-500' :
                                                            status === 'draft' ? 'bg-slate-400' :
                                                                status === 'scheduled' ? 'bg-blue-500' : 'bg-amber-500'
                                                            }`} />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="draft" className="rounded-lg">Draft</SelectItem>
                                                    <SelectItem value="pending_review" className="rounded-lg">Pending Review</SelectItem>
                                                    <SelectItem value="scheduled" className="rounded-lg">Scheduled</SelectItem>
                                                    <SelectItem value="published" className="rounded-lg">Published</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Category Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
                                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                                <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <span>{BLOG_CATEGORIES.find(c => c.id === selectedCategory)?.icon || '📁'}</span>
                                                        <SelectValue placeholder="Select a category" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {BLOG_CATEGORIES.map(category => (
                                                        <SelectItem key={category.id} value={category.id} className="rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <span>{category.icon}</span>
                                                                <span>{category.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-slate-400">Choose a category to help users find this post</p>
                                        </div>

                                        {/* Push Notification Toggle */}
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                                            <div className="mt-0.5 text-indigo-500">
                                                <Megaphone className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <input
                                                        type="checkbox"
                                                        id="sendPush"
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        // Note: We need state for this. I'll add the state variable 'sendPushNotification'
                                                        checked={sendPushNotification}
                                                        onChange={(e) => setSendPushNotification(e.target.checked)}
                                                    />
                                                    <label htmlFor="sendPush" className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 select-none cursor-pointer">
                                                        Send Push Notification
                                                    </label>
                                                </div>
                                                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-tight">
                                                    Notify all app users about this post when published.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Author</label>
                                            <Select
                                                value={author.id}
                                                onValueChange={(v) => {
                                                    const authors: Record<string, BlogAuthor> = {
                                                        'admin': {
                                                            id: 'admin',
                                                            name: 'KojoMoney Team',
                                                            bio: 'The official KojoMoney editorial team, dedicated to helping you earn more online.',
                                                            verified: true,
                                                            credentials: 'Official Platform',
                                                            expertise: ['Rewards Apps', 'Online Earning', 'Money Tips']
                                                        },
                                                        'sarah': {
                                                            id: 'sarah',
                                                            name: 'Sarah Johnson',
                                                            bio: 'Personal finance expert with over 8 years of experience helping people maximize their online earnings.',
                                                            verified: true,
                                                            credentials: 'Certified Financial Educator',
                                                            expertise: ['Personal Finance', 'Rewards Programs', 'Budgeting'],
                                                            yearsExperience: 8,
                                                            socialLinks: { twitter: 'https://twitter.com/sarahjfinance', linkedin: 'https://linkedin.com/in/sarahjfinance' }
                                                        },
                                                        'mike': {
                                                            id: 'mike',
                                                            name: 'Mike Chen',
                                                            bio: 'Tech writer and app reviewer who tests every earning app before recommending it.',
                                                            verified: true,
                                                            credentials: 'Tech Journalist',
                                                            expertise: ['App Reviews', 'Mobile Technology', 'User Experience'],
                                                            yearsExperience: 5,
                                                            socialLinks: { twitter: 'https://twitter.com/mikechentech' }
                                                        },
                                                        'emma': {
                                                            id: 'emma',
                                                            name: 'Emma Williams',
                                                            bio: 'Frugal living expert sharing practical tips to save and earn more every day.',
                                                            verified: true,
                                                            credentials: 'Money-Saving Specialist',
                                                            expertise: ['Money-Saving Tips', 'Cashback', 'Deals & Offers'],
                                                            yearsExperience: 6
                                                        },
                                                        'david': {
                                                            id: 'david',
                                                            name: 'David Brown',
                                                            bio: 'Full-time app tester who earns with reward apps daily and shares honest reviews.',
                                                            verified: true,
                                                            credentials: 'Professional App Tester',
                                                            expertise: ['App Testing', 'Offerwalls', 'Survey Sites'],
                                                            yearsExperience: 4
                                                        }
                                                    }
                                                    setAuthor(authors[v] || authors['admin'])
                                                }}
                                            >
                                                <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <SelectValue placeholder="Select author" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="admin" className="rounded-lg">KojoMoney Team</SelectItem>
                                                    <SelectItem value="sarah" className="rounded-lg">Sarah Johnson</SelectItem>
                                                    <SelectItem value="mike" className="rounded-lg">Mike Chen</SelectItem>
                                                    <SelectItem value="emma" className="rounded-lg">Emma Williams</SelectItem>
                                                    <SelectItem value="david" className="rounded-lg">David Brown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {author.bio && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{author.bio}</p>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Related Posts</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowRelatedPicker(true)}
                                                    className="h-7 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg"
                                                >
                                                    Edit <ChevronRight className="h-3 w-3 ml-1" />
                                                </Button>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                                                {relatedPostIds.length === 0 ? 'Auto-selected by tags' : `${relatedPostIds.length} posts manually selected`}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* SEO Tab */}
                            <TabsContent value="seo" className="mt-4 space-y-4">
                                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-100 dark:border-slate-700 px-5 py-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <Target className="h-4 w-4" />
                                                SEO Settings
                                            </CardTitle>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAutoFillSEO}
                                                disabled={autoFillingSEO}
                                                className="h-8 text-xs gap-1.5 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:from-violet-100 hover:to-indigo-100"
                                            >
                                                {autoFillingSEO ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                                                AI Fill
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        {/* SEO Checklist */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SEO Checklist</label>
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
                                                {seoChecks.map((check, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm">
                                                        {check.pass ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                                        )}
                                                        <span className={check.pass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500'}>
                                                            {check.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Focus Keyword</label>
                                            <Input
                                                value={focusKeyword}
                                                onChange={(e) => setFocusKeyword(e.target.value)}
                                                placeholder="e.g. money making apps"
                                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta Title</label>
                                                <span className={`text-xs font-medium ${metaTitle.length > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {metaTitle.length}/60
                                                </span>
                                            </div>
                                            <Input
                                                value={metaTitle}
                                                onChange={(e) => setMetaTitle(e.target.value)}
                                                placeholder={title || "Enter meta title..."}
                                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta Description</label>
                                                <span className={`text-xs font-medium ${metaDescription.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {metaDescription.length}/160
                                                </span>
                                            </div>
                                            <Textarea
                                                value={metaDescription}
                                                onChange={(e) => setMetaDescription(e.target.value)}
                                                placeholder="Brief description for search engines..."
                                                className="min-h-[100px] rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm resize-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Excerpt</label>
                                            <Textarea
                                                value={excerpt}
                                                onChange={(e) => setExcerpt(e.target.value)}
                                                placeholder="Short summary for post listings..."
                                                className="min-h-[80px] rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm resize-none"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* AEO & GEO Optimization */}
                                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden mt-6">
                                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-purple-100 dark:border-purple-800 px-5 py-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                                <Zap className="h-4 w-4" />
                                                AEO & GEO Optimization
                                            </CardTitle>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGenerateAEO}
                                                disabled={generatingAEO}
                                                className="h-7 text-xs gap-1.5 bg-white/50 dark:bg-slate-900/50 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-white dark:hover:bg-slate-900"
                                            >
                                                {generatingAEO ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                Auto-Generate
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        {/* Direct Answer */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Direct Answer (Target: ~40-60 words)</label>
                                                <span className={`text-xs font-medium ${directAnswer.length > 350 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {directAnswer.length}/350
                                                </span>
                                            </div>
                                            <Textarea
                                                value={directAnswer}
                                                onChange={(e) => setDirectAnswer(e.target.value)}
                                                placeholder="Provide a concise, direct answer to the main topic question..."
                                                className="min-h-[100px] rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm resize-none"
                                            />
                                        </div>

                                        {/* Key Takeaways */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key Takeaways</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setKeyTakeaways([...keyTakeaways, ''])}
                                                    className="h-6 text-xs text-purple-600 hover:bg-purple-50"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add
                                                </Button>
                                            </div>
                                            {keyTakeaways.length === 0 && (
                                                <p className="text-xs text-slate-400 italic">Add bullet points summarizing the article for AI snapshots.</p>
                                            )}
                                            {keyTakeaways.map((takeaway, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input
                                                        value={takeaway}
                                                        onChange={(e) => {
                                                            const newTakeaways = [...keyTakeaways]
                                                            newTakeaways[index] = e.target.value
                                                            setKeyTakeaways(newTakeaways)
                                                        }}
                                                        placeholder={`Takeaway ${index + 1}`}
                                                        className="h-9 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setKeyTakeaways(keyTakeaways.filter((_, i) => i !== index))}
                                                        className="h-9 w-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* GEO Keywords */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conversational Questions</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setGeoKeywords([...geoKeywords, ''])}
                                                    className="h-6 text-xs text-purple-600 hover:bg-purple-50"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add
                                                </Button>
                                            </div>
                                            {geoKeywords.length === 0 && (
                                                <p className="text-xs text-slate-400 italic">Add conversational queries users might ask AI (e.g. "How do I...").</p>
                                            )}
                                            {geoKeywords.map((k, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input
                                                        value={k}
                                                        onChange={(e) => {
                                                            const newK = [...geoKeywords]
                                                            newK[index] = e.target.value
                                                            setGeoKeywords(newK)
                                                        }}
                                                        placeholder="e.g. How do I start..."
                                                        className="h-9 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setGeoKeywords(geoKeywords.filter((_, i) => i !== index))}
                                                        className="h-9 w-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* SERP Preview */}
                                <SERPPreview
                                    title={title}
                                    metaTitle={metaTitle}
                                    metaDescription={metaDescription}
                                    slug={slug}
                                />

                                {/* Schema Builders */}
                                <SchemaBuilder
                                    value={faq}
                                    onChange={setFaq}
                                    title={title}
                                    content={editor?.getHTML() || ''}
                                    adminToken={adminToken}
                                />
                                <HowToBuilder
                                    value={howTo}
                                    onChange={setHowTo}
                                    title={title}
                                    content={editor?.getHTML() || ''}
                                    adminToken={adminToken}
                                />
                            </TabsContent>

                            {/* E-E-A-T Tab */}
                            <TabsContent value="eeat" className="mt-4 space-y-4">
                                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-emerald-100 dark:border-emerald-800 px-5 py-4">
                                        <CardTitle className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                            <Shield className="h-4 w-4" />
                                            Trust & Credibility
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        {/* Experience Badge */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Experience Badge</label>
                                            <Select value={experienceBadge || 'none'} onValueChange={(v: any) => setExperienceBadge(v === 'none' ? '' : v)}>
                                                <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <SelectValue placeholder="Select experience type..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                    <SelectItem value="tested" className="rounded-lg">🧪 Hands-on Tested</SelectItem>
                                                    <SelectItem value="reviewed" className="rounded-lg">📖 Expert Reviewed</SelectItem>
                                                    <SelectItem value="hands-on" className="rounded-lg">✨ First-Hand Experience</SelectItem>
                                                    <SelectItem value="expert-written" className="rounded-lg">🏆 Expert Written</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-slate-500">Shows a trust badge indicating content credibility</p>
                                        </div>

                                        {/* Fact Checked By */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fact-Checked By</label>
                                            <Input
                                                value={factCheckedBy}
                                                onChange={(e) => setFactCheckedBy(e.target.value)}
                                                placeholder="e.g. John Smith, Editor"
                                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>

                                        {/* Reviewed By */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reviewed By</label>
                                            <Input
                                                value={reviewedBy}
                                                onChange={(e) => setReviewedBy(e.target.value)}
                                                placeholder="e.g. Editorial Team"
                                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>

                                        {/* Disclosures */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disclosures / Editorial Note</label>
                                            <Textarea
                                                value={disclosures}
                                                onChange={(e) => setDisclosures(e.target.value)}
                                                placeholder="e.g. This post contains affiliate links. We may earn a commission at no extra cost to you."
                                                className="min-h-[80px] rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm resize-none"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Sources Card */}
                                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800 px-5 py-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                                <ExternalLink className="h-4 w-4" />
                                                Sources & Citations
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSources([...sources, { title: '', url: '' }])}
                                                className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                            >
                                                <Plus className="h-3 w-3 mr-1" /> Add Source
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4">
                                        {sources.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center py-4">No sources added. Add citations to improve credibility.</p>
                                        ) : (
                                            sources.map((source, index) => (
                                                <div key={index} className="flex gap-2 items-start">
                                                    <div className="flex-1 space-y-2">
                                                        <Input
                                                            value={source.title}
                                                            onChange={(e) => {
                                                                const newSources = [...sources]
                                                                newSources[index].title = e.target.value
                                                                setSources(newSources)
                                                            }}
                                                            placeholder="Source title"
                                                            className="h-9 text-sm rounded-lg bg-slate-50 dark:bg-slate-800"
                                                        />
                                                        <Input
                                                            value={source.url}
                                                            onChange={(e) => {
                                                                const newSources = [...sources]
                                                                newSources[index].url = e.target.value
                                                                setSources(newSources)
                                                            }}
                                                            placeholder="https://example.com/source"
                                                            className="h-9 text-sm rounded-lg bg-slate-50 dark:bg-slate-800"
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSources(sources.filter((_, i) => i !== index))}
                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Analysis Tab */}
                            <TabsContent value="analysis" className="mt-4 space-y-4">
                                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-100 dark:border-slate-700 px-5 py-4">
                                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4" />
                                            Content Analysis
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-6">
                                        <ReadabilityScore content={editor?.getHTML() || ''} />
                                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />
                                        <HeadingChecker content={editor?.getHTML() || ''} />
                                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />
                                        <ImageSEOChecker content={editor?.getHTML() || ''} />
                                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />
                                        <LinkChecker content={editor?.getHTML() || ''} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <InternalLinkPicker
                isOpen={showLinkPicker}
                onOpenChange={setShowLinkPicker}
                adminToken={adminToken}
                onSelect={handleLinkSelect}
            />

            <MediaManager
                isOpen={showMediaPicker}
                onOpenChange={setShowMediaPicker}
                onSelect={handleMediaSelect}
            />

            <RelatedPostPicker
                isOpen={showRelatedPicker}
                onOpenChange={setShowRelatedPicker}
                adminToken={adminToken}
                selectedIds={relatedPostIds}
                onSelect={setRelatedPostIds}
            />
        </div>
    )
}
