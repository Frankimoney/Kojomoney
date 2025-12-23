import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { XMLParser } from 'fast-xml-parser'
import crypto from 'crypto'
import { allowCors } from '@/lib/cors'
import { getHappyHourBonus } from '@/lib/happyHour'
import { getStreakMultiplier } from '@/lib/points-config'

export const dynamic = 'force-dynamic'

interface NewsStory {
    id: string
    title: string
    summary: string
    imageUrl?: string
    category?: string
    points: number
    publishedAt: string
    isExternal?: boolean
    externalUrl?: string
    source?: string
    quizQuestion?: string
    quizOptions?: string[]
    correctAnswer?: number
}

// Helper keys
function getTodayKey(): string {
    return new Date().toISOString().split('T')[0]
}

function getCurrentWeekKey(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
}

// RSS Feed URLs to aggregate
// African Country Codes (ISO 3166-1 alpha-2)
const AFRICA_CODES = new Set([
    'NG', 'GH', 'KE', 'ZA', 'EG', 'MA', 'DZ', 'TN', 'ET', 'UG',
    'TZ', 'RW', 'CM', 'CI', 'SN', 'ZW', 'ZM', 'AO', 'MZ', 'MG',
    'NA', 'BW', 'LR', 'SL', 'BJ', 'TG', 'BF', 'NE', 'ML', 'GM'
])

// RSS Feed Configurations
const GLOBAL_FEEDS = [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NY Times' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://www.huffpost.com/section/front-page/feed', source: 'HuffPost' },
    { url: 'https://feeds.reuters.com/reuters/U.S.news', source: 'Reuters' }
]

const AFRICA_FEEDS = [
    { url: 'https://guardian.ng/feed/', source: 'The Guardian Nigeria' },
    { url: 'https://punchng.com/feed/', source: 'Punch Nigeria' },
    { url: 'https://www.premiumtimesng.com/feed', source: 'Premium Times' },
    { url: 'https://allafrica.com/tools/headlines/v2/crackers/latest/headlines.xml', source: 'AllAfrica' },
    { url: 'https://www.news24.com/news24/partner/feed', source: 'News24 South Africa' }
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default allowCors(handler)

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            source,
            url,
            limit = '10',
            points = '10',
            reads,
            userId,
            action,
            region: regionParam
        } = req.query

        const limitNum = parseInt(Array.isArray(limit) ? limit[0] : limit) || 10
        const pointsNum = parseInt(Array.isArray(points) ? points[0] : points) || 10
        const userIdStr = Array.isArray(userId) ? userId[0] : userId
        const sourceStr = Array.isArray(source) ? source[0] : source
        const urlStr = Array.isArray(url) ? url[0] : url
        const actionStr = Array.isArray(action) ? action[0] : action

        // Detect Region
        // Detect Region
        let isAfrica = false
        // Development fallback: Default to Nigeria (Africa) if running locally and no header present
        const isDev = process.env.NODE_ENV === 'development'

        if (regionParam === 'africa') {
            isAfrica = true
        } else if (regionParam === 'global') {
            isAfrica = false
        } else {
            // Auto-detect
            const country = (req.headers['x-vercel-ip-country'] as string)?.toUpperCase() || (isDev ? 'NG' : '')
            isAfrica = country ? AFRICA_CODES.has(country) : false // Default to global if unknown
        }

        // Handle ingest action (admin only)
        if (actionStr === 'ingest') {
            return handleIngest(req, res, limitNum, pointsNum)
        }

        let stories: NewsStory[] = []

        // Try to fetch from database first (if we were ingesting)
        // For now, we'll skip DB priority if we want absolute daily freshness from RSS
        // or we can query DB with a date filter.
        // Let's rely on RSS fallbacks for now to ensure "changes every day" behavior without heavy DB management.

        // Fetch from RSS
        if (stories.length === 0) {
            if (sourceStr === 'rss' || !sourceStr) {
                const feedUrl = urlStr

                if (feedUrl) {
                    // Direct URL override
                    stories = await fetchFromRSS(feedUrl as string, limitNum, pointsNum)
                } else {
                    // Daily Rotation & Mixing Logic
                    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)

                    if (isAfrica) {
                        // For Africa: MIX strategy (Priority Local + Global Variety)
                        // Split limit: 70% Local, 30% Global
                        const localLimit = Math.ceil(limitNum * 0.7)
                        const globalLimit = limitNum - localLimit

                        const localIndex = dayOfYear % AFRICA_FEEDS.length
                        const globalIndex = dayOfYear % GLOBAL_FEEDS.length

                        const localFeed = AFRICA_FEEDS[localIndex]
                        const globalFeed = GLOBAL_FEEDS[globalIndex]

                        // Fetch in parallel
                        const [localStories, globalStories] = await Promise.all([
                            fetchFromRSS(localFeed.url, localLimit, pointsNum, localFeed.source),
                            fetchFromRSS(globalFeed.url, globalLimit, pointsNum, globalFeed.source)
                        ])

                        stories = [...localStories, ...globalStories]
                    } else {
                        // For Global: Rotate Global Feeds
                        const feedIndex = dayOfYear % GLOBAL_FEEDS.length
                        const selectedFeed = GLOBAL_FEEDS[feedIndex]
                        stories = await fetchFromRSS(selectedFeed.url, limitNum, pointsNum, selectedFeed.source)
                    }
                }
            }
        }

        // Get read IDs for the user if requested
        let readIds: string[] = []
        if (reads && userIdStr && db) {
            try {
                const readsSnapshot = await db.collection('news_reads')
                    .where('userId', '==', userIdStr)
                    .orderBy('createdAt', 'desc')
                    .limit(100)
                    .get()

                readIds = readsSnapshot.docs.map(doc => doc.data().storyId)
            } catch (e) {
                console.error('Error fetching read IDs:', e)
            }
        }

        return res.status(200).json({
            stories,
            reads: readIds,
            count: stories.length
        })
    } catch (error) {
        console.error('Error in news API:', error)
        return res.status(500).json({ error: 'Failed to fetch news' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { storyId, quizAnswer, anonId, userId } = req.body

        if (!storyId) {
            return res.status(400).json({ error: 'Missing storyId' })
        }

        // Determine effective user ID
        const effectiveUserId = userId || (anonId ? `anon:${anonId}` : null)

        if (!effectiveUserId) {
            return res.status(400).json({
                error: 'User identification required',
                needsLogin: true
            })
        }

        if (!db) {
            // Return mock response if no database
            return res.status(200).json({
                isCorrect: true,
                pointsEarned: 10,
                awarded: false,
                needsLogin: !userId
            })
        }

        // Check if already read
        const readRef = db.collection('news_reads').doc(`${effectiveUserId}_${storyId}`)
        const readDoc = await readRef.get()

        if (readDoc.exists) {
            return res.status(200).json({
                isCorrect: true,
                pointsEarned: 0,
                hasReadBefore: true,
                awarded: false
            })
        }

        // Get story info for quiz validation
        const storyDoc = await db.collection('news_stories').doc(storyId).get()
        const storyData = storyDoc.exists ? storyDoc.data() : null

        // Simple quiz validation (if story has quiz data)
        const isCorrect = storyData?.correctAnswer !== undefined
            ? quizAnswer === storyData.correctAnswer
            : true // Default to correct if no quiz

        // Award points only to registered users
        let awarded = false
        let pointsToAward = 0
        let happyHourInfo = { finalPoints: 0, multiplier: 1, bonusLabel: null as string | null }
        let streakInfo = { multiplier: 1, tier: { label: 'No Streak' } }

        if (userId && isCorrect) {
            const userRef = db.collection('users').doc(userId)
            const userDoc = await userRef.get()

            if (userDoc.exists) {
                const userData = userDoc.data()!
                const currentPoints = userData.totalPoints || userData.points || 0
                const todayKey = getTodayKey()
                const weekKey = getCurrentWeekKey()
                const now = Date.now()

                // Get user's streak for multiplier
                const dailyStreak = userData.dailyStreak || 0
                streakInfo = getStreakMultiplier(dailyStreak)

                // Calculate points with both Happy Hour AND Streak multipliers
                const BASE_POINTS_PER_STORY = 10
                happyHourInfo = getHappyHourBonus(BASE_POINTS_PER_STORY)
                const combinedMultiplier = happyHourInfo.multiplier * streakInfo.multiplier
                pointsToAward = Math.floor(BASE_POINTS_PER_STORY * combinedMultiplier)

                // Check daily stats
                const currentProgress = userData.todayProgress || { adsWatched: 0, storiesRead: 0, triviaCompleted: false }

                // Reset if new day
                if (userData.lastActiveDate !== todayKey) {
                    currentProgress.adsWatched = 0
                    currentProgress.storiesRead = 0
                    currentProgress.triviaCompleted = false
                }

                // Increment story count
                currentProgress.storiesRead = (currentProgress.storiesRead || 0) + 1

                await userRef.update({
                    totalPoints: currentPoints + pointsToAward,
                    points: currentPoints + pointsToAward,
                    newsPoints: (userData.newsPoints || 0) + pointsToAward,
                    storiesRead: (userData.storiesRead || 0) + 1, // Keep legacy field for now
                    todayProgress: currentProgress,
                    lastActiveDate: todayKey,
                    updatedAt: now
                })

                // Build bonus description
                const bonusLabels: string[] = []
                if (happyHourInfo.bonusLabel) bonusLabels.push(happyHourInfo.bonusLabel)
                if (streakInfo.multiplier > 1) bonusLabels.push(`${streakInfo.tier.label} ${streakInfo.multiplier}x`)
                const bonusDescription = bonusLabels.length > 0 ? ` (${bonusLabels.join(' + ')})` : ''

                // Create Transaction with bonus info
                await db.collection('transactions').add({
                    userId,
                    type: 'credit',
                    amount: pointsToAward,
                    baseAmount: 10,
                    happyHourMultiplier: happyHourInfo.multiplier,
                    streakMultiplier: streakInfo.multiplier,
                    source: 'news_reading',
                    status: 'completed',
                    description: `Read: ${storyData?.title || 'News Story'}${bonusDescription}`,
                    createdAt: now
                })

                // Update Tournament Points (Add 5 points per story read)
                const entrySnapshot = await db.collection('tournament_entries')
                    .where('weekKey', '==', weekKey)
                    .where('userId', '==', userId)
                    .limit(1)
                    .get()

                if (!entrySnapshot.empty) {
                    const entryDoc = entrySnapshot.docs[0]
                    await entryDoc.ref.update({
                        points: (entryDoc.data().points || 0) + 5, // 5 points per story for tournament
                        lastUpdated: now
                    })
                } else {
                    // Auto-join
                    await db.collection('tournament_entries').add({
                        weekKey,
                        userId,
                        name: userData.name || userData.username || 'Anonymous',
                        avatar: userData.avatarUrl || '',
                        points: 5,
                        joinedAt: now,
                        lastUpdated: now
                    })
                }

                awarded = true
            }
        }

        return res.status(200).json({
            isCorrect,
            pointsEarned: pointsToAward,
            awarded,
            needsLogin: !userId && pointsToAward > 0,
            quizExplanation: storyData?.quizExplanation || null
        })
    } catch (error) {
        console.error('Error submitting news read:', error)
        return res.status(500).json({ error: 'Failed to submit quiz' })
    }
}

async function handleIngest(
    req: NextApiRequest,
    res: NextApiResponse,
    limit: number,
    points: number
) {
    // Check for admin auth
    const authHeader = req.headers.authorization
    if (authHeader !== 'Bearer admin-earnapp-2024') {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    let inserted = 0
    let updated = 0
    let processed = 0

    const ALL_FEEDS = [...GLOBAL_FEEDS, ...AFRICA_FEEDS]
    for (const feed of ALL_FEEDS) {
        try {
            const stories = await fetchFromRSS(feed.url, limit, points, feed.source)

            for (const story of stories) {
                processed++
                const existingDoc = await db.collection('news_stories')
                    .where('externalUrl', '==', story.externalUrl)
                    .limit(1)
                    .get()

                if (existingDoc.empty) {
                    await db.collection('news_stories').doc(story.id).set({
                        ...story,
                        createdAt: Date.now()
                    })
                    inserted++
                } else {
                    updated++
                }
            }
        } catch (e) {
            console.error(`Error ingesting from ${feed.url}:`, e)
        }
    }

    return res.status(200).json({
        success: true,
        inserted,
        updated,
        processed
    })
}

async function fetchFromRSS(
    feedUrl: string,
    limit: number,
    points: number,
    sourceName?: string
): Promise<NewsStory[]> {
    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'KojoMoney/1.0 NewsReader'
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch RSS: ${response.statusText}`)
        }

        const xmlText = await response.text()
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        })

        const result = parser.parse(xmlText)
        const channel = result?.rss?.channel || result?.feed
        const items = channel?.item || channel?.entry || []

        const stories: NewsStory[] = []
        const itemsArray = Array.isArray(items) ? items : [items]

        for (let i = 0; i < Math.min(itemsArray.length, limit); i++) {
            const item = itemsArray[i]
            if (!item) continue

            const title = item.title || item['title'] || 'Untitled'
            const description = item.description || item.summary || item.content || ''
            const link = item.link?.['@_href'] || item.link || item.guid || ''
            const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString()

            // Try to extract image from content or media
            let imageUrl = ''
            if (item['media:content']?.['@_url']) {
                imageUrl = item['media:content']['@_url']
            } else if (item.enclosure?.['@_url']) {
                imageUrl = item.enclosure['@_url']
            } else {
                // Try to extract from description HTML
                const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/)
                if (imgMatch) {
                    imageUrl = imgMatch[1]
                }
            }

            // Clean summary (remove HTML tags)
            const cleanSummary = description
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim()
                .slice(0, 300)

            stories.push({
                id: crypto.createHash('md5').update(link).digest('hex'),
                title: typeof title === 'string' ? title : String(title),
                summary: cleanSummary || 'Read more...',
                imageUrl,
                category: (() => {
                    const c = item.category
                    if (!c) return 'News'
                    const v = Array.isArray(c) ? c[0] : c
                    if (typeof v === 'string') return v
                    if (typeof v === 'object' && v['#text']) return v['#text']
                    return 'News'
                })(),
                points,
                publishedAt: new Date(pubDate).toISOString(),
                isExternal: true,
                externalUrl: link,
                source: sourceName || new URL(feedUrl).hostname
            })
        }

        return stories
    } catch (error) {
        console.error('Error fetching RSS:', error)
        return []
    }
}
