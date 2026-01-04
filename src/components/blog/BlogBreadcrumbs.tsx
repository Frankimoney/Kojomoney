'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { getCategoryById } from '@/lib/blog-categories'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BlogBreadcrumbsProps {
    items: BreadcrumbItem[]
    className?: string
}

export default function BlogBreadcrumbs({ items, className = '' }: BlogBreadcrumbsProps) {
    return (
        <nav className={`flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 overflow-x-auto scrollbar-hide ${className}`}>
            {/* Home */}
            <Link
                href="/"
                className="flex items-center gap-1 hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
            >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
            </Link>

            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

            {/* Blog */}
            <Link
                href="/blog"
                className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
            >
                Blog
            </Link>

            {/* Dynamic Items */}
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}

// Helper to build breadcrumbs for a blog post
export function buildPostBreadcrumbs(post: {
    title: string
    categories?: string[]
}): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = []

    // Add category if exists
    if (post.categories && post.categories.length > 0) {
        const category = getCategoryById(post.categories[0])
        if (category) {
            items.push({
                label: category.name,
                href: `/blog?category=${category.slug}`
            })
        }
    }

    // Add post title (current page, no link)
    items.push({
        label: post.title
    })

    return items
}
