/**
 * Blog Categories for KojoMoney Reward App
 * Focused on conversion-oriented content
 */

export const BLOG_CATEGORIES = [
    {
        id: 'earning-guides',
        name: 'Earning Guides',
        slug: 'earning-guides',
        description: 'Step-by-step guides to maximize your earnings',
        icon: '📖',
        color: 'violet'
    },
    {
        id: 'payment-proof',
        name: 'Payment Proof',
        slug: 'payment-proof',
        description: 'Real withdrawal screenshots and success stories',
        icon: '💰',
        color: 'emerald'
    },
    {
        id: 'bonus-alerts',
        name: 'Bonus Alerts',
        slug: 'bonus-alerts',
        description: 'Limited-time offers, double points, and special events',
        icon: '🔥',
        color: 'amber'
    },
    {
        id: 'app-news',
        name: 'App News',
        slug: 'app-news',
        description: 'New features, updates, and announcements',
        icon: '📰',
        color: 'blue'
    }
] as const

export type BlogCategoryId = typeof BLOG_CATEGORIES[number]['id']

// Helper to get category by id
export function getCategoryById(id: string) {
    return BLOG_CATEGORIES.find(c => c.id === id)
}

// Helper to get category by slug
export function getCategoryBySlug(slug: string) {
    return BLOG_CATEGORIES.find(c => c.slug === slug)
}

// Offerwall links for Action Bar CTAs
export const OFFERWALL_LINKS = {
    cpx: '/earn?tab=cpx',
    timewall: '/earn?tab=timewall',
    kiwiwall: '/earn?tab=kiwiwall',
    surveys: '/surveys',
    games: '/games',
    social: '/social-missions',
    default: '/earn'
} as const

// Action bar CTA types
export const POST_ACTIONS = {
    tryOffer: {
        label: 'Try This Offer',
        icon: '🎯',
        description: 'Start earning now'
    },
    shareEarn: {
        label: 'Share & Earn',
        icon: '📤',
        description: 'Get bonus points for sharing'
    },
    saveForLater: {
        label: 'Save for Later',
        icon: '🔖',
        description: 'Bookmark this guide'
    }
} as const
