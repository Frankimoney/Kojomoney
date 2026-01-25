/**
 * KojoMoney Android Deep Link Schemes
 * Defines the URL schemes to open specific parts of the Android app
 */

export const APP_SCHEME = 'kojomoney://'

export const DEEP_LINKS = [
    {
        id: 'cpx',
        name: 'CPX Research',
        description: 'Open CPX Research offerwall',
        url: 'kojomoney://offerwall/cpx', // Example scheme
        icon: '📋'
    },
    {
        id: 'timewall',
        name: 'TimeWall',
        description: 'Open TimeWall tasks',
        url: 'kojomoney://offerwall/timewall',
        icon: '⏱️'
    },
    {
        id: 'kiwiwall',
        name: 'KiwiWall',
        description: 'Open KiwiWall offerwall',
        url: 'kojomoney://offerwall/kiwiwall',
        icon: '🥝'
    },
    {
        id: 'surveys',
        name: 'Surveys Tab',
        description: 'Go to main Surveys tab',
        url: 'kojomoney://tab/surveys',
        icon: '📊'
    },
    {
        id: 'games',
        name: 'Games Tab',
        description: 'Go to Games tab',
        url: 'kojomoney://tab/games',
        icon: '🎮'
    },
    {
        id: 'missions',
        name: 'Social Missions',
        description: 'Open Social Missions page',
        url: 'kojomoney://missions',
        icon: '🚀'
    },
    {
        id: 'withdraw',
        name: 'Withdrawal Page',
        description: 'Go to Cashout/Redeem page',
        url: 'kojomoney://withdraw',
        icon: '💸'
    },
    {
        id: 'profile',
        name: 'User Profile',
        description: 'Open user profile settings',
        url: 'kojomoney://profile',
        icon: '👤'
    },
    {
        id: 'referral',
        name: 'Referral Page',
        description: 'Open usage referral page',
        url: 'kojomoney://referral',
        icon: '🎁'
    }
] as const

export type DeepLinkId = typeof DEEP_LINKS[number]['id']

/**
 * Helper to get deep link URL by ID
 */
export function getDeepLinkUrl(id: string): string {
    const link = DEEP_LINKS.find(l => l.id === id)
    return link ? link.url : APP_SCHEME
}

/**
 * Check if a URL is an internal deep link
 */
export function isDeepLink(url: string): boolean {
    return url.startsWith(APP_SCHEME)
}
