import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { XMLParser } from 'fast-xml-parser'
import crypto from 'crypto'

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
const RSS_FEEDS = [
    { url: 'https://guardian.ng/feed/', source: 'The Guardian Nigeria' },
    { url: 'https://punchng.com/feed/', source: 'Punch Nigeria' },
    { url: 'https://www.premiumtimesng.com/feed', source: 'Premium Times' },
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            source,
            url,
            limit = '10',
            points = '10',
            reads,
            userId,
            action
        } = req.query

        const limitNum = parseInt(Array.isArray(limit) ? limit[0] : limit) || 10
        const pointsNum = parseInt(Array.isArray(points) ? points[0] : points) || 10
        const userIdStr = Array.isArray(userId) ? userId[0] : userId
        const sourceStr = Array.isArray(source) ? source[0] : source
        const urlStr = Array.isArray(url) ? url[0] : url
        const actionStr = Array.isArray(action) ? action[0] : action

        // Handle ingest action (admin only)
        if (actionStr === 'ingest') {
            return handleIngest(req, res, limitNum, pointsNum)
        }

        let stories: NewsStory[] = []

        // Try to fetch from database first
        if (db) {
            try {
                const storiesSnapshot = await db.collection('news_stories')
                    .orderBy('publishedAt', 'desc')
                    .limit(limitNum)
                    .get()

                stories = storiesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    points: pointsNum
                })) as NewsStory[]
            } catch (e) {
                console.error('Error fetching from db:', e)
            }
        }

        // If no stories in DB, try to fetch from RSS
        if (stories.length === 0) {
            if (sourceStr === 'rss' || urlStr) {
                const feedUrl = urlStr || RSS_FEEDS[0].url
                stories = await fetchFromRSS(feedUrl as string, limitNum, pointsNum)
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

        // Always award 10 points per story read (matching UI display)
        const POINTS_PER_STORY = 10
        const pointsToAward = isCorrect ? POINTS_PER_STORY : 0

        // Record the read attempt
        await readRef.set({
            userId: effectiveUserId,
            storyId,
            quizAnswer,
            isCorrect,
            pointsEarned: pointsToAward,
            createdAt: Date.now(),
            isAnonymous: !userId
        })

        // Award points only to registered users
        let awarded = false
        if (userId && pointsToAward > 0) {
            const userRef = db.collection('users').doc(userId)
            const userDoc = await userRef.get()

            if (userDoc.exists) {
                const userData = userDoc.data()!
                const currentPoints = userData.totalPoints || userData.points || 0
                const todayKey = getTodayKey()
                const weekKey = getCurrentWeekKey()
                const now = Date.now()

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

                // Create Transaction
                await db.collection('transactions').add({
                    userId,
                    type: 'credit',
                    amount: pointsToAward,
                    source: 'news_reading',
                    status: 'completed',
                    description: `Read: ${storyData?.title || 'News Story'}`,
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

    for (const feed of RSS_FEEDS) {
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
                category: item.category || 'News',
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
