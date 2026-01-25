'use client'

import { BLOG_CATEGORIES } from '@/lib/blog-categories'
import { cn } from '@/lib/utils'

interface CategoryScrollerProps {
    activeCategory?: string
    onCategoryChange: (categoryId: string | null) => void
    className?: string
}

export default function CategoryScroller({
    activeCategory,
    onCategoryChange,
    className = ''
}: CategoryScrollerProps) {
    return (
        <div className={`w-full overflow-x-auto scrollbar-hide ${className}`}>
            <div className="flex items-center gap-2 pb-1 min-w-max">
                {/* All Posts Chip */}
                <button
                    onClick={() => onCategoryChange(null)}
                    className={cn(
                        'flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 transform hover:scale-105',
                        !activeCategory
                            ? 'bg-white text-violet-700 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30'
                            : 'bg-white/30 text-white hover:bg-white/50 backdrop-blur-sm'
                    )}
                >
                    <span className="text-lg">📚</span>
                    <span>All Posts</span>
                </button>

                {/* Category Chips */}
                {BLOG_CATEGORIES.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={cn(
                            'flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 transform hover:scale-105',
                            activeCategory === category.id
                                ? 'bg-white text-violet-700 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30'
                                : 'bg-white/30 text-white hover:bg-white/50 backdrop-blur-sm'
                        )}
                    >
                        <span className="text-lg">{category.icon}</span>
                        <span>{category.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
