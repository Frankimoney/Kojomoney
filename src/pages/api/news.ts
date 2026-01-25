import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { XMLParser } from 'fast-xml-parser'
import crypto from 'crypto'
import { allowCors } from '@/lib/cors'
import { getHappyHourBonus } from '@/lib/happyHour'
import { DAILY_LIMITS, getStreakMultiplier } from '@/lib/points-config'
import { getEconomyConfig } from '@/lib/server-config'
import { checkMilestoneAsync } from '@/services/milestoneService'

export const dynamic = 'force-dynamic'

// Daily limit for news reading
export const MAX_DAILY_STORIES = DAILY_LIMITS.maxNews

interface NewsStory {
    id: string
    title: string
    summary: string
    imageUrl?: string
    category?: string
    points: number
    publishedAt: string
    isExternal: boolean
    externalUrl?: string
    source?: string
    content?: string // Full content extracted from RSS
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
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml', source: 'Sky News' },
    { url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html', source: 'CNBC' }
]

// Country-specific African feeds
const COUNTRY_FEEDS: Record<string, { url: string; source: string }[]> = {
    // Nigeria
    'NG': [
        { url: 'https://guardian.ng/feed/', source: 'The Guardian Nigeria' },
        { url: 'https://punchng.com/feed/', source: 'Punch Nigeria' },
        { url: 'https://www.premiumtimesng.com/feed', source: 'Premium Times' },
        { url: 'https://www.channelstv.com/feed/', source: 'Channels TV' },
        { url: 'https://dailytrust.com/feed/', source: 'Daily Trust' },
    ],
    // Ghana
    'GH': [
        { url: 'https://www.myjoyonline.com/feed/', source: 'Joy Online Ghana' },
        { url: 'https://www.graphic.com.gh/feed', source: 'Graphic Ghana' },
    ],
    // South Africa
    'ZA': [
        { url: 'https://feeds.news24.com/articles/news24/TopStories/rss', source: 'News24 South Africa' },
        { url: 'https://www.iol.co.za/cmlink/1.640', source: 'IOL South Africa' },
    ],
    // Kenya
    'KE': [
        { url: 'https://nation.africa/kenya/rss.xml', source: 'Nation Kenya' },
        { url: 'https://www.citizen.digital/feed', source: 'Citizen Digital Kenya' },
    ],
}

// Fallback Pan-African feeds (for countries not listed above)
const PAN_AFRICAN_FEEDS = [
    { url: 'https://www.africanews.com/feed/', source: 'Africanews' },
    { url: 'https://guardian.ng/feed/', source: 'The Guardian Nigeria' },
    { url: 'https://feeds.news24.com/articles/news24/TopStories/rss', source: 'News24 South Africa' },
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const config = await getEconomyConfig()

    if (req.method === 'GET') {
        return handleGet(req, res, config)
    } else if (req.method === 'POST') {
        return handlePost(req, res, config)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

export default allowCors(handler)

async function handleGet(req: NextApiRequest, res: NextApiResponse, config: any) {
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
        // Use server config for points, ignore client query
        const pointsNum = config.earningRates.readNews || 10
        const userIdStr = Array.isArray(userId) ? userId[0] : userId
        const sourceStr = Array.isArray(source) ? source[0] : source
        const urlStr = Array.isArray(url) ? url[0] : url
        const actionStr = Array.isArray(action) ? action[0] : action

        // Detect Region and Country
        let isAfrica = false
        let countryCode = ''
        // Development fallback: Default to Nigeria (Africa) if running locally and no header present
        const isDev = process.env.NODE_ENV === 'development'

        if (regionParam === 'africa') {
            isAfrica = true
            countryCode = 'NG' // Default to Nigeria for manual override
        } else if (regionParam === 'global') {
            isAfrica = false
        } else {
            // Auto-detect from IP - check multiple header formats for different hosting providers
            countryCode = (
                (req.headers['x-vercel-ip-country'] as string) ||      // Vercel
                (req.headers['cf-ipcountry'] as string) ||             // Cloudflare
                (req.headers['x-country-code'] as string) ||           // Generic / Firebase
                (req.headers['x-appengine-country'] as string) ||      // Google App Engine
                (isDev ? 'NG' : '')                                     // Development fallback
            ).toUpperCase()
            isAfrica = countryCode ? AFRICA_CODES.has(countryCode) : false
            console.log(`[News] Detected country: ${countryCode}, isAfrica: ${isAfrica}`)
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
                        // Split limit: 60% Local, 40% Global (e.g., 6 local + 4 global)
                        const localLimit = Math.ceil(limitNum * 0.6)
                        const globalLimit = limitNum - localLimit

                        // Get country-specific feeds or fall back to Pan-African
                        const countryFeeds = COUNTRY_FEEDS[countryCode] || PAN_AFRICAN_FEEDS
                        const localIndex = dayOfYear % countryFeeds.length
                        const globalIndex = dayOfYear % GLOBAL_FEEDS.length

                        const localFeed = countryFeeds[localIndex]
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
        let storiesReadToday = 0
        if (reads && userIdStr && db) {
            try {
                const readsSnapshot = await db.collection('news_reads')
                    .where('userId', '==', userIdStr)
                    .orderBy('createdAt', 'desc')
                    .limit(100)
                    .get()

                readIds = readsSnapshot.docs.map(doc => doc.data().storyId)

                // Get user's daily progress
                const userDoc = await db.collection('users').doc(userIdStr).get()
                if (userDoc.exists) {
                    const userData = userDoc.data()!
                    const todayKey = getTodayKey()
                    const todayProgress = userData.todayProgress || { storiesRead: 0 }
                    storiesReadToday = userData.lastActiveDate === todayKey ? (todayProgress.storiesRead || 0) : 0
                }
            } catch (e) {
                console.error('Error fetching read IDs:', e)
            }
        }

        return res.status(200).json({
            stories,
            reads: readIds,
            count: stories.length,
            storiesReadToday,
            maxDailyStories: config.dailyLimits.maxNews,
            storiesRemaining: config.dailyLimits.maxNews - storiesReadToday
        })
    } catch (error) {
        console.error('Error in news API:', error)
        return res.status(500).json({ error: 'Failed to fetch news' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, config: any) {
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

        // Get story info for context
        const storyDoc = await db.collection('news_stories').doc(storyId).get()
        const storyData = storyDoc.exists ? storyDoc.data() : null

        // Get quiz data from news_quizzes collection (this is where quizzes are actually stored)
        const quizDoc = await db.collection('news_quizzes').doc(storyId).get()
        const quizData = quizDoc.exists ? quizDoc.data() : null

        // Validate quiz answer against the stored correctIndex
        let isCorrect = false
        if (quizData?.correctIndex !== undefined) {
            // Quiz exists - validate the answer
            isCorrect = quizAnswer === quizData.correctIndex
        } else if (storyData?.correctAnswer !== undefined) {
            // Fallback to story's correctAnswer if it exists
            isCorrect = quizAnswer === storyData.correctAnswer
        } else {
            // No quiz data found - this shouldn't happen normally
            // Default to incorrect to prevent abuse
            console.warn(`[News] No quiz data found for storyId: ${storyId}`)
            isCorrect = false
        }

        // Award points only to registered users
        let awarded = false
        let pointsToAward = 0
        let happyHourInfo = { finalPoints: 0, multiplier: 1, bonusLabel: null as string | null }
        let streakInfo = { multiplier: 1, tier: { label: 'No Streak' } }
        let storiesReadToday = 0

        if (userId && isCorrect) {
            const userRef = db.collection('users').doc(userId)
            const userDoc = await userRef.get()

            if (userDoc.exists) {
                const userData = userDoc.data()!
                const currentPoints = userData.totalPoints || userData.points || 0
                const todayKey = getTodayKey()
                const weekKey = getCurrentWeekKey()
                const now = Date.now()

                // Check daily limit
                const todayProgress = userData.todayProgress || { storiesRead: 0 }
                storiesReadToday = userData.lastActiveDate === todayKey ? (todayProgress.storiesRead || 0) : 0

                if (storiesReadToday >= config.dailyLimits.maxNews) {
                    return res.status(200).json({
                        isCorrect: true,
                        pointsEarned: 0,
                        awarded: false,
                        dailyLimitReached: true,
                        storiesReadToday,
                        maxDailyStories: config.dailyLimits.maxNews,
                        message: `Daily limit reached! You've read ${config.dailyLimits.maxNews} stories today. Come back tomorrow for more.`
                    })
                }

                // Get user's streak for multiplier
                const dailyStreak = userData.dailyStreak || 0
                streakInfo = getStreakMultiplier(dailyStreak)

                // Calculate points with both Happy Hour AND Streak multipliers
                // Use dynamic rate
                const BASE_POINTS_PER_STORY = config.earningRates.readNews
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

                // Calculate new streak
                const yesterdayDate = new Date()
                yesterdayDate.setDate(yesterdayDate.getDate() - 1)
                const yesterday = yesterdayDate.toISOString().split('T')[0]

                let newStreak = userData.dailyStreak || 0
                const lastActive = userData.lastActiveDate

                // Only update streak if it hasn't been updated today
                if (lastActive !== todayKey) {
                    if (lastActive === yesterday) {
                        newStreak += 1 // Consecutive day
                    } else {
                        newStreak = 1 // Broken streak or first day
                    }
                } else if (newStreak === 0) {
                    // Edge case: User active today but streak is 0 (likely due to missing update logic previously)
                    newStreak = 1
                }

                await userRef.update({
                    totalPoints: currentPoints + pointsToAward,
                    points: currentPoints + pointsToAward,
                    newsPoints: (userData.newsPoints || 0) + pointsToAward,
                    storiesRead: (userData.storiesRead || 0) + 1, // Keep legacy field for now
                    todayProgress: currentProgress,
                    lastActiveDate: todayKey,
                    dailyStreak: newStreak,
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

                // Check for milestone celebration (fire and forget)
                checkMilestoneAsync(userId, currentPoints, currentPoints + pointsToAward)

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
            basePoints: 10,
            happyHourMultiplier: happyHourInfo.multiplier,
            happyHourName: happyHourInfo.bonusLabel || null,
            streakMultiplier: streakInfo.multiplier,
            streakName: streakInfo.multiplier > 1 ? `${streakInfo.tier.label} ${streakInfo.multiplier}x` : null,
            awarded,
            needsLogin: !userId && pointsToAward > 0,
            quizExplanation: storyData?.quizExplanation || null,
            storiesReadToday: awarded ? (storiesReadToday + 1) : storiesReadToday,
            maxDailyStories: MAX_DAILY_STORIES,
            storiesRemaining: MAX_DAILY_STORIES - (awarded ? (storiesReadToday + 1) : storiesReadToday)
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

    // Combine all country feeds for ingestion
    const allAfricanFeeds = Object.values(COUNTRY_FEEDS).flat()
    const ALL_FEEDS = [...GLOBAL_FEEDS, ...allAfricanFeeds, ...PAN_AFRICAN_FEEDS]
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
            console.warn(`RSS feed unavailable (${response.status}): ${feedUrl}`)
            return []
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
            // 1. media:content (most common for RSS 2.0 with media extension)
            if (item['media:content']?.['@_url']) {
                imageUrl = item['media:content']['@_url']
            }
            // 2. media:thumbnail (alternative media namespace)
            else if (item['media:thumbnail']?.['@_url']) {
                imageUrl = item['media:thumbnail']['@_url']
            }
            // 3. enclosure (RSS 2.0 standard for attachments)
            else if (item.enclosure?.['@_url']) {
                imageUrl = item.enclosure['@_url']
            }
            // 4. image field (some feeds use this directly)
            else if (item.image?.url || item.image?.['@_url'] || (typeof item.image === 'string' && item.image)) {
                imageUrl = item.image?.url || item.image?.['@_url'] || item.image
            }
            // 5. Try to extract from content:encoded (full HTML content)
            else if (item['content:encoded']) {
                const contentImgMatch = String(item['content:encoded']).match(/<img[^>]+src=["']([^"']+)["']/)
                if (contentImgMatch) {
                    imageUrl = contentImgMatch[1]
                }
            }
            // 6. Try to extract from description HTML
            else {
                const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/)
                if (imgMatch) {
                    imageUrl = imgMatch[1]
                }
            }

            // Fallback: Use a placeholder image based on category
            if (!imageUrl) {
                const category = (() => {
                    const c = item.category
                    if (!c) return 'news'
                    const v = Array.isArray(c) ? c[0] : c
                    if (typeof v === 'string') return v.toLowerCase()
                    if (typeof v === 'object' && v['#text']) return String(v['#text']).toLowerCase()
                    return 'news'
                })()
                // Use unsplash placeholder based on category
                const placeholderQuery = category.includes('sport') ? 'sports' :
                    category.includes('tech') ? 'technology' :
                        category.includes('business') ? 'business' :
                            category.includes('politic') ? 'politics' :
                                category.includes('entertainment') ? 'entertainment' :
                                    'news'
                imageUrl = `https://source.unsplash.com/800x450/?${placeholderQuery}`
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

            // Extract and clean full content
            let rawContent = ''
            if (item['content:encoded']) {
                rawContent = String(item['content:encoded'])
            } else if (item.content && typeof item.content === 'string') {
                rawContent = item.content
            } else if (item.content && item.content['#text']) {
                rawContent = item.content['#text']
            }

            const cleanContent = rawContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/\s+/g, ' ')
                .trim()

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
                source: sourceName || new URL(feedUrl).hostname,
                content: cleanContent.length > 500 ? cleanContent : undefined
            })
        }

        return stories
    } catch (error) {
        console.error('Error fetching RSS:', error)
        return []
    }
}
