/**
 * Blog System Type Definitions
 */

export type BlogPostStatus = 'draft' | 'pending_review' | 'scheduled' | 'published'

export type SchemaType = 'Article' | 'NewsArticle' | 'BlogPosting'

export interface FAQItem {
    question: string
    answer: string
}

export interface HowToStep {
    name: string
    text: string
    image?: string
    url?: string
}

export interface HowToBlock {
    name: string
    description: string
    totalTime?: string // ISO 8601 duration e.g. PT20M
    steps: HowToStep[]
    supply?: string[]
    tool?: string[]
}

export interface BlogAuthor {
    id: string
    name: string
    bio?: string
    avatar?: string
    verified?: boolean
    // E-E-A-T Enhanced Fields
    credentials?: string // e.g., "Certified Financial Advisor", "5+ Years in FinTech"
    expertise?: string[] // e.g., ["Personal Finance", "Mobile Apps", "Rewards Programs"]
    socialLinks?: {
        twitter?: string
        linkedin?: string
        website?: string
    }
    yearsExperience?: number // Years of experience in the field
}

export interface FeaturedImage {
    url: string
    alt: string
    title?: string
    caption?: string
    width?: number
    height?: number
}

export interface BlogPost {
    id: string
    title: string
    slug: string
    excerpt?: string
    content: string // HTML or JSON from Tiptap
    featuredImage?: FeaturedImage

    // Status & Dates
    status: BlogPostStatus
    publishedAt?: number
    scheduledAt?: number
    updatedAt: number
    createdAt: number

    // Author
    author: BlogAuthor

    // Taxonomy
    tags: string[]
    categories: string[] // e.g., ['Tutorials', 'News']

    // SEO & Quality
    focusKeyword?: string
    metaTitle?: string
    metaDescription?: string
    canonicalUrl?: string
    noIndex?: boolean
    noFollow?: boolean
    ogImage?: string // Overrides featuredImage for social

    // Schema
    schemaType?: SchemaType
    faq?: FAQItem[]
    howTo?: HowToBlock

    // Stats
    wordCount?: number
    readingTime?: number // in minutes

    // Internal Linking / Relations
    relatedPostIds?: string[] // Manual selections

    // E-E-A-T Enhanced Fields
    factCheckedBy?: string // Name of fact-checker
    factCheckedAt?: number // Timestamp
    lastReviewedAt?: number // Last editorial review timestamp
    reviewedBy?: string // Editor name who reviewed
    sources?: { title: string; url: string }[] // External citations/sources
    experienceBadge?: 'tested' | 'reviewed' | 'hands-on' | 'expert-written' // Experience indicator
    disclosures?: string // e.g., "This post contains affiliate links"
    editorialNote?: string // Transparency note

    // AEO & GEO
    keyTakeaways?: string[]
    directAnswer?: string // Concise answer for featured snippets (<300 chars)
    geoKeywords?: string[] // Conversational queries like "How to..."

    // Mobile Integration
    sendPushNotification?: boolean

}

export interface ContentBlock {
    id: string
    name: string
    content: string // HTML
    category: string // e.g. 'CTA', 'Bio', 'Ad'
    createdAt: number
    updatedAt: number
}

export interface BlogPostVersion {
    id: string
    postId: string
    data: Partial<BlogPost>
    createdAt: number
    createdBy: string
    changeNote?: string
}
