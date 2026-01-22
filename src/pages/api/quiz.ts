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
    const content = `${title} ${summary}`.toLowerCase()
    const titleClean = title.replace(/['"]/g, '')

    // Detect category for context
    const categories = [
        { keywords: ['politics', 'government', 'president', 'minister', 'election', 'vote', 'parliament', 'senate', 'congress'], category: 'Politics' },
        { keywords: ['business', 'economy', 'market', 'stock', 'company', 'bank', 'finance', 'trade', 'investment', 'ceo'], category: 'Business' },
        { keywords: ['sport', 'football', 'soccer', 'match', 'player', 'team', 'game', 'league', 'tournament', 'champion'], category: 'Sports' },
        { keywords: ['entertainment', 'movie', 'music', 'celebrity', 'star', 'show', 'album', 'concert', 'film', 'actor', 'actress'], category: 'Entertainment' },
        { keywords: ['technology', 'tech', 'digital', 'app', 'internet', 'phone', 'ai', 'software', 'startup', 'innovation'], category: 'Technology' },
        { keywords: ['health', 'medical', 'hospital', 'doctor', 'disease', 'virus', 'treatment', 'vaccine', 'patient', 'wellness'], category: 'Health' },
        { keywords: ['science', 'research', 'study', 'discovery', 'scientist', 'experiment', 'space', 'climate'], category: 'Science' },
        { keywords: ['crime', 'police', 'arrest', 'court', 'prison', 'murder', 'robbery', 'investigation'], category: 'Crime' },
    ]

    let detectedCategory = 'News'
    let matchedKeywords: string[] = []
    for (const cat of categories) {
        const matches = cat.keywords.filter(kw => content.includes(kw))
        if (matches.length > 0) {
            detectedCategory = cat.category
            matchedKeywords = matches
            break
        }
    }

    // Extract key entities from title for more specific questions
    const words = titleClean.split(/\s+/).filter(w => w.length > 3)
    const capitalizedWords = words.filter(w => /^[A-Z]/.test(w) && !/^(The|This|That|What|When|Where|Why|How|And|But|For|With)$/.test(w))
    const keyEntity = capitalizedWords.length > 0 ? capitalizedWords[0] : words[0] || 'this topic'

    // Question templates - more varied and engaging
    const questionTemplates = [
        // Type 1: Main topic identification
        {
            question: `What is the main topic of this story?`,
            generateOptions: () => {
                const correct = detectedCategory
                const allCats = ['Politics', 'Business', 'Sports', 'Entertainment', 'Technology', 'Health', 'Science', 'Crime', 'World News']
                const others = allCats.filter(c => c !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        },
        // Type 2: Title-based comprehension
        {
            question: `According to the headline, what is being discussed?`,
            generateOptions: () => {
                const correctTopic = keyEntity
                const wrongTopics = ['Weather patterns', 'Stock prices', 'Celebrity gossip', 'Sports scores', 'Tech updates', 'Health tips']
                    .filter(t => !content.includes(t.toLowerCase().split(' ')[0]))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3)
                return { correct: correctTopic, others: wrongTopics }
            }
        },
        // Type 3: Story tone/nature
        {
            question: `What type of news does this story represent?`,
            generateOptions: () => {
                // Detect tone
                const isBreaking = content.includes('breaking') || content.includes('urgent') || content.includes('just in')
                const isOpinion = content.includes('opinion') || content.includes('analysis') || content.includes('commentary')
                const isFeature = content.includes('how to') || content.includes('guide') || content.includes('tips')
                const isInvestigative = content.includes('investigation') || content.includes('revealed') || content.includes('exposed')

                let correct = 'Current Affairs'
                if (isBreaking) correct = 'Breaking News'
                else if (isOpinion) correct = 'Analysis/Opinion'
                else if (isFeature) correct = 'Feature Story'
                else if (isInvestigative) correct = 'Investigative Report'

                const options = ['Breaking News', 'Analysis/Opinion', 'Feature Story', 'Current Affairs', 'Investigative Report']
                const others = options.filter(o => o !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        },
        // Type 4: Learning outcome
        {
            question: `After reading this story, you would learn about:`,
            generateOptions: () => {
                const learningMap: Record<string, string> = {
                    'Politics': 'Government and political developments',
                    'Business': 'Economic and business matters',
                    'Sports': 'Athletic competitions and results',
                    'Entertainment': 'Arts and entertainment news',
                    'Technology': 'Tech innovations and digital trends',
                    'Health': 'Medical and wellness information',
                    'Science': 'Scientific discoveries and research',
                    'Crime': 'Law enforcement and legal matters',
                    'News': 'Current events and general news'
                }
                const correct = learningMap[detectedCategory] || 'Current events and news'
                const others = Object.values(learningMap).filter(v => v !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        },
        // Type 5: Source attribution awareness
        {
            question: `This type of story would typically be found in which section?`,
            generateOptions: () => {
                const sections: Record<string, string> = {
                    'Politics': 'National/Politics Section',
                    'Business': 'Business/Finance Section',
                    'Sports': 'Sports Section',
                    'Entertainment': 'Lifestyle/Entertainment Section',
                    'Technology': 'Technology Section',
                    'Health': 'Health & Wellness Section',
                    'Science': 'Science Section',
                    'Crime': 'Local News/Crime Section',
                    'News': 'Front Page/Headlines'
                }
                const correct = sections[detectedCategory] || 'Front Page/Headlines'
                const others = Object.values(sections).filter(v => v !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        },
        // Type 6: Reader interest targeting
        {
            question: `Who would be most interested in this story?`,
            generateOptions: () => {
                const audiences: Record<string, string> = {
                    'Politics': 'People interested in government affairs',
                    'Business': 'Investors and business professionals',
                    'Sports': 'Sports fans and enthusiasts',
                    'Entertainment': 'Pop culture followers',
                    'Technology': 'Tech enthusiasts and professionals',
                    'Health': 'Health-conscious individuals',
                    'Science': 'Science and research enthusiasts',
                    'Crime': 'Those following local safety news',
                    'News': 'General news readers'
                }
                const correct = audiences[detectedCategory] || 'General news readers'
                const others = Object.values(audiences).filter(v => v !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        },
        // Type 7: Impact assessment
        {
            question: `What area does this news primarily impact?`,
            generateOptions: () => {
                const impacts: Record<string, string> = {
                    'Politics': 'Public policy and governance',
                    'Business': 'Economy and markets',
                    'Sports': 'Athletic community and fans',
                    'Entertainment': 'Culture and leisure',
                    'Technology': 'Digital life and innovation',
                    'Health': 'Public health and wellness',
                    'Science': 'Knowledge and research',
                    'Crime': 'Public safety and justice',
                    'News': 'Society and daily life'
                }
                const correct = impacts[detectedCategory] || 'Society in general'
                const others = Object.values(impacts).filter(v => v !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        },
        // Type 8: Keyword-based confirmation
        {
            question: `Which keyword best relates to this story?`,
            generateOptions: () => {
                const keywordMap: Record<string, string[]> = {
                    'Politics': ['Election', 'Government', 'Policy', 'Parliament'],
                    'Business': ['Market', 'Investment', 'Economy', 'Trade'],
                    'Sports': ['Championship', 'Match', 'Tournament', 'League'],
                    'Entertainment': ['Celebrity', 'Music', 'Film', 'Concert'],
                    'Technology': ['Innovation', 'Digital', 'AI', 'Software'],
                    'Health': ['Treatment', 'Medical', 'Wellness', 'Vaccine'],
                    'Science': ['Research', 'Discovery', 'Study', 'Experiment'],
                    'Crime': ['Investigation', 'Arrest', 'Court', 'Police'],
                    'News': ['Update', 'Report', 'Announcement', 'Event']
                }
                const catKeywords = keywordMap[detectedCategory] || keywordMap['News']
                const correct = catKeywords[Math.floor(Math.random() * catKeywords.length)]
                const allKeywords = Object.values(keywordMap).flat()
                const others = allKeywords.filter(k => k !== correct && !catKeywords.includes(k)).sort(() => Math.random() - 0.5).slice(0, 3)
                return { correct, others }
            }
        }
    ]

    // Select a random question template
    const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)]
    const { correct, others } = template.generateOptions()

    // Create options array with correct answer at random position
    const correctIndex = Math.floor(Math.random() * 4)
    const options: string[] = []
    let wrongIdx = 0

    for (let i = 0; i < 4; i++) {
        if (i === correctIndex) {
            options.push(correct)
        } else {
            options.push(others[wrongIdx++] || `Option ${wrongIdx + 1}`)
        }
    }

    return {
        question: template.question,
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
