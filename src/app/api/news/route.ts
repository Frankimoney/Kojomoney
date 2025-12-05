import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { XMLParser } from 'fast-xml-parser'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

 export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams
        const source = params.get('source')
        const websiteUrl = params.get('url')
        const limit = Math.max(1, Math.min(parseInt(params.get('limit') ?? '20', 10) || 20, 50))
        const points = Math.max(1, Math.min(parseInt(params.get('points') ?? '10', 10) || 10, 100))
        const includeReads = params.get('reads') === '1'

        // Fetch from a specific website (RSS/Atom autodetection)
        if (websiteUrl) {
            const stories = await fetchWebsiteLatest(websiteUrl, limit, points)
            return NextResponse.json({ stories })
        }

        if (source === 'rss') {
            const stories = await fetchNigeriaRSSAggregate(limit, points)
            return NextResponse.json({ stories })
        }

        // Fetch from Mediastack when requested
        if (source === 'mediastack') {
            const stories = await fetchMediastack(params, limit, points)
            return NextResponse.json({ stories })
        }

        // Default: return active stories from Firestore (internal curated)
        // Avoid composite index requirement by fetching and sorting in-memory
        const snap = await db
            .collection('news_stories')
            .where('isActive', '==', true)
            .limit(Math.max(limit * 3, limit))
            .get()

        const docs = snap.docs.map((d) => {
            const v = d.data() as any
            const published = v.publishedAt?.toDate?.() ?? v.publishedAt ?? null
            return {
                id: d.id,
                ...v,
                publishedAt: published ?? new Date().toISOString(),
            }
        })
        docs.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        if (includeReads) {
            const session = await getServerSession(authOptions)
            const sessionUserId = (session?.user as any)?.id || session?.user?.email || null
            if (sessionUserId) {
                const readsSnap = await db.collection('news_reads').where('userId', '==', sessionUserId).limit(1000).get()
                const readIds = readsSnap.docs.map(d => (d.data() as any).storyId).filter(Boolean)
                return NextResponse.json({ stories: docs.slice(0, limit), reads: readIds })
            }
            return NextResponse.json({ stories: docs.slice(0, limit), reads: [] })
        }
        return NextResponse.json({ stories: docs.slice(0, limit) })
    } catch (error) {
        console.error('Error fetching news stories:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch stories'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

async function fetchMediastack(params: URLSearchParams, limit: number, points: number) {
    const accessKey = process.env.MEDIASTACK_API_KEY
    const base = process.env.MEDIASTACK_BASE_URL ?? 'http://api.mediastack.com/v1/news'

    if (!accessKey) {
        throw new Error('MEDIASTACK_API_KEY is not set')
    }

    const url = new URL(base)
    url.searchParams.set('access_key', accessKey)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('sort', 'published_desc')

    const languages = params.get('languages') ?? 'en'
    const countries = params.get('countries') ?? 'ng'
    url.searchParams.set('languages', languages)
    url.searchParams.set('countries', countries)

    const categories = params.get('categories')
    const keywords = params.get('keywords')
    const domains = params.get('domains')
    if (categories) url.searchParams.set('categories', categories)
    if (keywords) url.searchParams.set('keywords', keywords)
    if (domains) url.searchParams.set('domains', domains)

    const res = await fetch(url.toString())
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Mediastack request failed: ${res.status} ${text}`)
    }
    const payload = await res.json()
    const data = Array.isArray(payload?.data) ? payload.data : []

    return data.slice(0, limit).map((item: any) => ({
        id: item.url ?? `${item.source || 'mediastack'}_${item.published_at || Date.now()}`,
        title: item.title || 'Untitled',
        summary: item.description || '',
        imageUrl: item.image || undefined,
        category: item.category || undefined,
        points,
        publishedAt: item.published_at || new Date().toISOString(),
        source: item.source || 'mediastack',
        externalUrl: item.url,
        isExternal: true,
    }))
}

async function fetchWebsiteLatest(inputUrl: string, limit: number, points: number) {
    const normalized = normalizeUrl(inputUrl)
    const candidates = [
        normalized,
        normalized.endsWith('/') ? normalized + 'feed' : normalized + '/feed',
        normalized.endsWith('/') ? normalized + 'rss' : normalized + '/rss',
        normalized.endsWith('/') ? normalized + 'atom.xml' : normalized + '/atom.xml',
        normalized.endsWith('/') ? normalized + 'index.xml' : normalized + '/index.xml',
    ]

    let feedXml: string | null = null
    let feedUrlUsed: string | null = null
    for (const candidate of candidates) {
        try {
            const res = await fetch(candidate, { headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' } })
            if (!res.ok) continue
            const contentType = res.headers.get('content-type') || ''
            const text = await res.text()
            if (contentType.includes('xml') || text.includes('<rss') || text.includes('<feed')) {
                feedXml = text
                feedUrlUsed = candidate
                break
            }
        } catch (_) {
            // try next candidate
        }
    }

    if (!feedXml) {
        throw new Error('Unable to locate an RSS/Atom feed for the provided URL')
    }

    const parser = new XMLParser({ ignoreAttributes: false })
    const obj = parser.parse(feedXml)

    const stories: any[] = []
    // RSS 2.0
    if (obj?.rss?.channel?.item) {
        const items = Array.isArray(obj.rss.channel.item) ? obj.rss.channel.item : [obj.rss.channel.item]
        for (const it of items.slice(0, limit)) {
            const contentHtml = it['content:encoded'] || it.content || it['content'] || ''
            stories.push({
                id: it.link || it.guid || `${feedUrlUsed}_${it.title}`,
                title: it.title || 'Untitled',
                summary: stripHtml(it.description || contentHtml || ''),
                imageUrl: extractImageFromItem(it) || extractImageFromHtml(contentHtml || it.description || ''),
                category: Array.isArray(it.category) ? it.category[0] : it.category,
                points,
                publishedAt: it.pubDate || new Date().toISOString(),
                source: feedUrlUsed || normalized,
                externalUrl: it.link,
                isExternal: true,
            })
        }
        return stories
    }

    // Atom
    if (obj?.feed?.entry) {
        const entries = Array.isArray(obj.feed.entry) ? obj.feed.entry : [obj.feed.entry]
        for (const e of entries.slice(0, limit)) {
            const link = extractAtomLink(e)
            const rawSummary = e.summary?.['#text'] || e.summary || e.content?.['#text'] || e.content || ''
            const contentHtml = e.content?.['#text'] || e.content || ''
            stories.push({
                id: link || e.id || `${feedUrlUsed}_${e.title}`,
                title: e.title || 'Untitled',
                summary: stripHtml(rawSummary),
                imageUrl: extractImageFromItem(e) || extractImageFromHtml(contentHtml || rawSummary),
                category: undefined,
                points,
                publishedAt: e.updated || e.published || new Date().toISOString(),
                source: feedUrlUsed || normalized,
                externalUrl: link,
                isExternal: true,
            })
        }
        return stories
    }

    throw new Error('Unsupported feed format')
}

async function fetchNigeriaRSSAggregate(limit: number, points: number) {
    const feeds = [
        'https://guardian.ng/feed/',
        'https://punchng.com/feed/',
        'https://www.vanguardngr.com/feed/',
        'https://www.premiumtimesng.com/feed',
        'https://www.channelstv.com/feed/',
        'https://dailytrust.com/feed/',
        'https://thenationonlineng.net/feed/',
        'https://thisdaylive.com/feed/',
        'https://leadership.ng/feed/',
        'https://saharareporters.com/feed',
        'https://www.eplinfo.net/',
    ]

    const results: any[] = []
    await Promise.all(
        feeds.map(async (f) => {
            try {
                const s = await fetchWebsiteLatest(f, limit, points)
                results.push(...s)
            } catch (_) { }
        })
    )

    const dedup = new Map<string, any>()
    for (const r of results) {
        const key = r.externalUrl || r.id
        if (!dedup.has(key)) dedup.set(key, r)
    }
    const merged = Array.from(dedup.values())
    merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    return merged.slice(0, limit)
}

function stripHtml(input: any): string {
    const s = typeof input === 'string' ? input : String(input ?? '')
    return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeUrl(u: string) {
    try {
        const hasProtocol = /^https?:\/\//i.test(u)
        return hasProtocol ? u : `https://${u}`
    } catch {
        return u
    }
}

function extractAtomLink(entry: any): string | undefined {
    const link = entry?.link
    if (!link) return undefined
    if (typeof link === 'string') return link
    if (Array.isArray(link)) {
        const alt = link.find((l: any) => l['@_rel'] === 'alternate')
        return (alt?.['@_href']) || link[0]?.['@_href'] || link[0]
    }
    return link['@_href'] || link.href
}

function extractImageFromItem(it: any): string | undefined {
    // Try enclosure (RSS)
    const enclosure = it.enclosure || (Array.isArray(it.enclosure) ? it.enclosure[0] : undefined)
    if (enclosure && (enclosure['@_type']?.includes('image') || enclosure.type?.includes('image'))) {
        return enclosure['@_url'] || enclosure.url
    }
    // Look for media:content or media:thumbnail
    const mediaContent = it['media:content'] || it.mediaContent
    if (mediaContent) {
        const mc = Array.isArray(mediaContent) ? mediaContent[0] : mediaContent
        return mc['@_url'] || mc.url
    }
    const mediaThumb = it['media:thumbnail'] || it.mediaThumbnail
    if (mediaThumb) {
        const mt = Array.isArray(mediaThumb) ? mediaThumb[0] : mediaThumb
        return mt['@_url'] || mt.url
    }
    // Some feeds embed images inside HTML description/content
    const html = it['content:encoded'] || it.content || it.description || ''
    const inline = extractImageFromHtml(html)
    if (inline) return inline
    return undefined
}

function extractImageFromHtml(html: any): string | undefined {
    if (!html || typeof html !== 'string') return undefined
    // Try <img src="...">
    const imgMatch = html.match(/<img[^>]*src=["']([^"'>]+)["'][^>]*>/i)
    if (imgMatch && imgMatch[1]) return imgMatch[1]
    // Try srcset pick the first URL
    const srcsetMatch = html.match(/srcset=["']([^"'>]+)["']/i)
    if (srcsetMatch && srcsetMatch[1]) {
        const first = srcsetMatch[1].split(',')[0].trim().split(' ')[0]
        if (first) return first
    }
    return undefined
}

export async function POST(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams
        const action = params.get('action')

        if (action === 'ingest') {
            const auth = request.headers.get('authorization') || ''
            if (auth !== 'Bearer admin-earnapp-2024') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            const url = params.get('url')
            const limit = Math.max(1, Math.min(parseInt(params.get('limit') ?? '20', 10) || 20, 100))
            const points = Math.max(1, Math.min(parseInt(params.get('points') ?? '5', 10) || 5, 100))

            let stories: any[] = []
            if (url) {
                stories = await fetchWebsiteLatest(url, limit, points)
            } else {
                stories = await fetchNigeriaRSSAggregate(limit, points)
            }

            let inserted = 0
            let updated = 0
            for (const s of stories) {
                const docId = docIdFromExternalUrl(s.externalUrl || s.id)
                const ref = db.collection('news_stories').doc(docId)
                const snap = await ref.get()
                const d = new Date(s.publishedAt)
                const publishedTs = isNaN(d.getTime()) ? Timestamp.now() : Timestamp.fromDate(d)
                // Quiz generation
                const quiz = generateQuizForStory(s.title, s.summary, s.category)
                // OG fallback for image
                const resolvedImage = s.imageUrl || await fetchOgImage(s.externalUrl)
                const assignedPoints = isEplInfoSource(s) ? 10 : points
                const payload: any = {
                    title: s.title,
                    summary: s.summary,
                    imageUrl: resolvedImage || null,
                    category: s.category || null,
                    points: assignedPoints,
                    publishedAt: publishedTs,
                    isActive: true,
                    quizQuestion: quiz.question,
                    quizOptions: quiz.options,
                    correctAnswer: quiz.correctIndex,
                    source: s.source || 'rss',
                    externalUrl: s.externalUrl || null,
                    createdAt: snap.exists ? (snap.data() as any)?.createdAt ?? Timestamp.now() : Timestamp.now(),
                    updatedAt: Timestamp.now(),
                }
                if (snap.exists) {
                    await ref.set(payload, { merge: true })
                    updated++
                } else {
                    await ref.set(payload)
                    inserted++
                }
            }
            return NextResponse.json({ success: true, inserted, updated, processed: stories.length })
        }

        const { storyId, quizAnswer, anonId, userId: bodyUserId } = await request.json()

        // Resolve user from session; allow anonymous submissions but only award points when logged in
        const session = await getServerSession(authOptions)
        const sessionUserId = (session?.user as any)?.id || session?.user?.email || null
        const anon = (typeof anonId === 'string' && anonId.trim()) ? `anon:${anonId.trim()}` : `anon:${(request as any).ip || 'unknown'}`
        // Prioritize session, then explicit body userId (from custom auth), then anon
        const userId = sessionUserId || bodyUserId || anon

        // Check if user already read this story (allow repeats but only award once)
        const readId = `${userId}_${storyId}`
        const existingRead = await db.collection('news_reads').doc(readId).get()
        const hasReadBefore = existingRead.exists

        // Get story details
        const storySnap = await db.collection('news_stories').doc(storyId).get()
        const story = storySnap.data() as any

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 })
        }

        // Validate against AI-generated quiz if available
        const quizSnap = await db.collection('news_quizzes').doc(storyId).get()
        const correctIndex = quizSnap.exists
            ? ((quizSnap.data() as any)?.correctIndex ?? story.correctAnswer ?? 0)
            : (story.correctAnswer ?? 0)
        const isCorrectNow = Number(quizAnswer) === Number(correctIndex)

        // Create news read record
        await db.collection('news_reads').doc(readId).set({
            userId,
            storyId,
            quizAnswer,
            isCorrect: isCorrectNow,
            pointsEarned: !hasReadBefore && isCorrectNow ? story.points : 0,
            startedAt: Timestamp.now(),
            completedAt: Timestamp.now(),
            ipAddress: (request as any).ip || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            attempts: hasReadBefore ? FieldValue.increment(1) : 1,
        })

        // Update user points if correct (do not fail submission if user doc missing)
        // Award points only once per story per user (including anonymous)
        if (!hasReadBefore && isCorrectNow) {
            try {
                await db.collection('users').doc(userId).update({
                    totalPoints: FieldValue.increment(story.points),
                    newsPoints: FieldValue.increment(story.points),
                })
            } catch (e) {
                try {
                    await db.collection('users').doc(userId).set({
                        totalPoints: FieldValue.increment(story.points),
                        newsPoints: FieldValue.increment(story.points),
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    }, { merge: true })
                } catch (_) {
                    // ignore user update errors
                }
            }
        }

        const quizExplanation = quizSnap.exists ? (quizSnap.data() as any)?.explanation || story.quizExplanation || null : null
        return NextResponse.json({
            success: true,
            isCorrect: isCorrectNow,
            pointsEarned: !hasReadBefore && isCorrectNow ? story.points : 0,
            hasReadBefore,
            needsLogin: false,
            awarded: !hasReadBefore && isCorrectNow,
            storyPoints: story.points,
            quizExplanation,
        })
    } catch (error) {
        console.error('Error submitting news read:', error)
        const message = error instanceof Error ? error.message : 'Failed to submit'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

function docIdFromExternalUrl(u: string): string {
    try {
        return Buffer.from(u).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    } catch {
        return encodeURIComponent(u)
    }
}
const QUIZ_CATEGORIES = ['News', 'Politics', 'Business', 'Sports', 'Entertainment', 'Technology', 'Health', 'Education', 'World']

function classifyCategory(title?: string, summary?: string, category?: string): string {
    const text = `${title || ''} ${summary || ''} ${category || ''}`.toLowerCase()
    const has = (w: string | RegExp) => {
        if (typeof w === 'string') return text.includes(w)
        return w.test(text)
    }
    if (has('epl') || has('premier league') || has('caf') || has('fifa') || has('uefa') || has('npfl') || has('football') || has('goal') || has(/arsenal|chelsea|manchester|rivers united|barcelona|real madrid/)) return 'Sports'
    if (has('senator') || has('governor') || has('house of representatives') || has('assembly') || has('president') || has('politics') || has('inec') || has('policy') || has('minister')) return 'Politics'
    if (has('business') || has('economy') || has('market') || has('stock') || has('bank') || has('cbn') || has('price') || has('nnpc') || has('naira')) return 'Business'
    if (has('technology') || has('tech') || has('ai') || has('software') || has('app') || has('startup')) return 'Technology'
    if (has('health') || has('hospital') || has('doctor') || has('patient') || has('vaccine') || has('covid')) return 'Health'
    if (has('school') || has('university') || has('students') || has('education') || has('jamb')) return 'Education'
    if (has('entertainment') || has('music') || has('movie') || has('celebrity') || has('award')) return 'Entertainment'
    if (has('world') || has('international')) return 'World'
    return category && QUIZ_CATEGORIES.includes(category) ? category : 'News'
}

function generateQuizForStory(title?: string, summary?: string, category?: string) {
    const normalized = classifyCategory(title, summary, category)
    if (normalized === 'Sports') {
        return { question: 'Which sport is discussed in this article?', options: ['Football', 'Basketball', 'Tennis', 'Athletics'], correctIndex: 0 }
    }
    if (normalized === 'Politics') {
        return { question: 'What domain best fits this article?', options: ['Politics', 'Business', 'Sports', 'Entertainment'], correctIndex: 0 }
    }
    if (normalized === 'Business') {
        return { question: 'What domain best fits this article?', options: ['Business', 'Politics', 'Sports', 'Technology'], correctIndex: 0 }
    }
    if (normalized === 'Technology') {
        return { question: 'What domain best fits this article?', options: ['Technology', 'Business', 'Entertainment', 'Sports'], correctIndex: 0 }
    }
    if (normalized === 'Health') {
        return { question: 'What domain best fits this article?', options: ['Health', 'Politics', 'Sports', 'Business'], correctIndex: 0 }
    }
    const distractors = QUIZ_CATEGORIES.filter(c => c !== normalized).slice(0, 3)
    return { question: 'Which category best describes this story?', options: [normalized, ...distractors], correctIndex: 0 }
}

function isEplInfoSource(s: any): boolean {
    const src = (s?.source || '').toLowerCase()
    const url = (s?.externalUrl || s?.id || '').toLowerCase()
    return src.includes('eplinfo') || url.includes('eplinfo') || src.includes('www.eplinfo.net') || url.includes('www.eplinfo.net')
}

async function fetchOgImage(url?: string): Promise<string | undefined> {
    if (!url) return undefined
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(url, { headers: { 'Accept': 'text/html' }, signal: controller.signal })
        clearTimeout(timeout)
        if (!res.ok) return undefined
        const html = await res.text()
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
        if (ogMatch && ogMatch[1]) return ogMatch[1]
        const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
        if (twMatch && twMatch[1]) return twMatch[1]
        return undefined
    } catch {
        return undefined
    }
}
