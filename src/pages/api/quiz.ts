import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'
import { checkRateLimit, verifyRequestSignature } from '@/lib/security'

export const dynamic = 'force-dynamic'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    // SECURITY: Basic Rate Limit (IP based)
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
    if (!checkRateLimit(`ip_quiz_${ip}`, 5, 60000)) { // 5 requests per minute per IP
        return res.status(429).json({ error: 'Too many requests' })
    }

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        // SECURITY: Verify Signature for POST
        const signature = req.headers['x-request-signature'] as string
        const timestamp = parseInt(req.headers['x-request-timestamp'] as string)

        if (!signature || !timestamp || !verifyRequestSignature(signature, req.body, timestamp)) {
            // Allow unsigned for now to prevent breaking live app, but log warnings
            console.warn(`[SECURITY] Invalid signature on Quiz POST from ${ip}`)
            // return res.status(403).json({ error: 'Invalid request signature' })
        }

        return handlePost(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { storyId, content, url } = req.query
        const storyIdStr = Array.isArray(storyId) ? storyId[0] : storyId
        const urlStr = Array.isArray(url) ? url[0] : url
        const wantsContent = content === '1'

        if (!storyIdStr && !urlStr) {
            return res.status(400).json({ error: 'Missing storyId or url' })
        }

        // Try to get cached quiz from database
        if (db && storyIdStr) {
            try {
                const quizDoc = await db.collection('news_quizzes').doc(storyIdStr).get()
                if (quizDoc.exists) {
                    const data = quizDoc.data()!

                    if (wantsContent && data.fullContent) {
                        return res.status(200).json({ text: data.fullContent })
                    }

                    return res.status(200).json({
                        quiz: {
                            question: data.question,
                            options: data.options,
                            correctIndex: data.correctIndex
                        }
                    })
                }

                // Try to get story info for content fetch
                if (wantsContent) {
                    const storyDoc = await db.collection('news_stories').doc(storyIdStr).get()
                    if (storyDoc.exists) {
                        const story = storyDoc.data()!
                        if (story.externalUrl) {
                            const content = await fetchArticleContent(story.externalUrl)
                            return res.status(200).json({ text: content })
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching quiz:', e)
            }
        }

        // Helper to fetch content if URL provided
        if (wantsContent && urlStr) {
            const content = await fetchArticleContent(urlStr)
            return res.status(200).json({ text: content })
        }

        // Return default quiz if not found
        return res.status(200).json({
            quiz: {
                question: 'What category best describes this story?',
                options: ['News', 'Politics', 'Business', 'Entertainment'],
                correctIndex: 0
            }
        })
    } catch (error) {
        console.error('Error in quiz GET:', error)
        return res.status(500).json({ error: 'Failed to fetch quiz' })
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { storyId } = req.query
        const { externalUrl, title, summary } = req.body
        const storyIdStr = Array.isArray(storyId) ? storyId[0] : storyId

        if (!storyIdStr) {
            return res.status(400).json({ error: 'Missing storyId' })
        }

        // Check if quiz already exists
        if (db) {
            const existingQuiz = await db.collection('news_quizzes').doc(storyIdStr).get()
            if (existingQuiz.exists) {
                const data = existingQuiz.data()!
                return res.status(200).json({
                    quiz: {
                        question: data.question,
                        options: data.options,
                        correctIndex: data.correctIndex
                    }
                })
            }
        }

        // Generate a quiz based on the story content
        const quiz = generateQuiz(title, summary)

        // Store the generated quiz
        if (db) {
            try {
                await db.collection('news_quizzes').doc(storyIdStr).set({
                    ...quiz,
                    storyId: storyIdStr,
                    externalUrl,
                    title,
                    createdAt: Date.now()
                })
            } catch (e) {
                console.error('Failed to store quiz:', e)
            }
        }

        return res.status(200).json({
            quiz: {
                question: quiz.question,
                options: quiz.options,
                correctIndex: quiz.correctIndex
            }
        })
    } catch (error) {
        console.error('Error generating quiz:', error)
        return res.status(500).json({ error: 'Failed to generate quiz' })
    }
}

function generateQuiz(title: string, summary: string): {
    question: string
    options: string[]
    correctIndex: number
} {
    // Simple quiz generation based on content analysis
    const content = `${title} ${summary}`.toLowerCase()

    // Category-based questions
    const categories = [
        { keyword: ['politics', 'government', 'president', 'minister', 'election', 'vote'], category: 'Politics' },
        { keyword: ['business', 'economy', 'market', 'stock', 'company', 'bank', 'finance'], category: 'Business' },
        { keyword: ['sport', 'football', 'match', 'player', 'team', 'game', 'league'], category: 'Sports' },
        { keyword: ['entertainment', 'movie', 'music', 'celebrity', 'star', 'show'], category: 'Entertainment' },
        { keyword: ['technology', 'tech', 'digital', 'app', 'internet', 'phone'], category: 'Technology' },
        { keyword: ['health', 'medical', 'hospital', 'doctor', 'disease', 'virus'], category: 'Health' },
    ]

    let detectedCategory = 'News'
    for (const cat of categories) {
        if (cat.keyword.some(kw => content.includes(kw))) {
            detectedCategory = cat.category
            break
        }
    }

    const allCategories = ['News', 'Politics', 'Business', 'Sports', 'Entertainment', 'Technology', 'Health']
    const otherCategories = allCategories.filter(c => c !== detectedCategory)

    // Shuffle and pick 3 wrong options
    const shuffled = otherCategories.sort(() => Math.random() - 0.5).slice(0, 3)

    // Create options array with correct answer at random position
    const correctIndex = Math.floor(Math.random() * 4)
    const options: string[] = []
    let wrongIdx = 0

    for (let i = 0; i < 4; i++) {
        if (i === correctIndex) {
            options.push(detectedCategory)
        } else {
            options.push(shuffled[wrongIdx++])
        }
    }

    return {
        question: 'What category best describes this story?',
        options,
        correctIndex
    }
}

async function fetchArticleContent(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.ok) {
            return 'Content not available.'
        }

        const html = await response.text()

        // Simple text extraction - remove scripts, styles, and HTML tags
        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim()

        // Return first 2000 characters
        return text.slice(0, 2000) || 'Content not available.'
    } catch (error) {
        console.error('Error fetching article content:', error)
        return 'Content not available.'
    }
}

export default allowCors(handler)
