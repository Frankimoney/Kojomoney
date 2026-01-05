import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit, logAIUsage } from '@/lib/ai-rate-limiter'
import { cleanAIisms, addImperfections } from '@/lib/ai-blacklist'

const GENERATOR_PROMPT = `You are a real person writing a blog post. Not an AI. A human who types like they talk.

Topic: {topic}
Primary Keyword: {primaryKeyword}
Secondary Keywords: {secondaryKeywords}
LSI Keywords: {lsiKeywords}
Tone: {tone}

WRITING STYLE (CRITICAL):

Split up the text.
Every sentence on a new line within paragraphs when it helps readability.
No fluff, nothing cringe.
No formal language. Keep it neutral and real.

Kick off with real questions and worries your audience faces.
Use plain talk to hit the mark. Skip the tech talk unless everyone's chatting about it.

Sprinkle in stories and examples like you're sharing insights over coffee with a pal.
This touch of personal flair makes your tips stick.

Nothing generic. Keep every word very specific.

Weave in keywords like you're seasoning a dish – just enough to taste but not so much it spoils the meal.
Pop them into titles, subtitles, and the body, making sure they fit snugly into the conversation.

Chop up complex tips into bullet points, lists, and bold highlights.
This makes it a breeze for both people and search engines to skim through.

Nudge your readers to chat, share, and engage with your content.
It's a two-way street that amps up the value.

Ditch the jargon like "digital landscape", "leverage", "utilize", "comprehensive", "pivotal" for something more down-to-earth and straightforward.
Keep it real, keep it fresh, and keep it engaging.

BANNED WORDS (Never use these):
delve, tapestry, landscape, moreover, furthermore, pivotal, testament, realm, vibrant, bustling, underscore, comprehensive, leverage, utilize, facilitate, optimize, innovative, groundbreaking, unprecedented, compelling, nuanced, endeavor, embark, journey, ecosystem, framework, foster, bolster, meticulous, intricate, in conclusion, it is important to note

STRUCTURE:
1. ONE H1 tag at the top (the title) – make it catchy and specific
2. Use H2 for main sections, H3 for subsections
3. NO H4, H5, or H6 tags
4. 6-8 main sections minimum
5. Use <ul> or <ol> lists where helpful
6. Use <strong> to highlight key points

INTERNAL LINKING (MANDATORY - YOU MUST DO THIS):
You MUST include at least 2-3 of these links in your article. This is NOT optional.
Copy these EXACTLY into your article where they fit naturally:

1. When talking about earning money or tasks:
   <a href="https://kojomoney.com/earn">start earning on KojoMoney</a>

2. When talking about social media, TikTok, Instagram, Telegram:
   <a href="https://kojomoney.com/social-missions">social missions</a>

3. When talking about surveys or polls:
   <a href="https://kojomoney.com/surveys">paid surveys</a>

4. When talking about games or play-to-earn:
   <a href="https://kojomoney.com/games">money-making games</a>

5. When talking about referrals or inviting friends:
   <a href="https://kojomoney.com/referrals">referral program</a>

6. When talking about withdrawals or cash out:
   <a href="https://kojomoney.com/wallet">withdraw your earnings</a>

IMPORTANT: At minimum, include link #1 (earn) somewhere in the article. The article is INCOMPLETE without internal links.

EXTERNAL LINKING:
Include 2-4 links to trusted sources (Wikipedia, Forbes, official docs) where they add real value.

OUTPUT:
Clean HTML only. No markdown. No intro like "Here's the article".
Start directly with <h1>Your Title</h1>`

// Helper to validate links
async function validateAndCleanLinks(html: string): Promise<string> {
    // Regex to find hrefs
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi
    const links: { fullMatch: string, url: string, text: string, index: number }[] = []
    let match
    while ((match = linkRegex.exec(html)) !== null) {
        links.push({ fullMatch: match[0], url: match[1], text: match[2], index: match.index })
    }

    if (links.length === 0) return html

    // Check links in parallel
    const checks = await Promise.all(links.map(async (link) => {
        // Skip internal or relative links
        if (link.url.startsWith('/') || link.url.includes('kojomoney.com')) {
            return { ...link, valid: true }
        }

        try {
            // Set 5s timeout
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 5000)

            const res = await fetch(link.url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: { 'User-Agent': 'KojoMoneyBot/1.0' }
            })
            clearTimeout(id)

            if (!res.ok && res.status !== 405 && res.status !== 403) {
                return { ...link, valid: false }
            }
            return { ...link, valid: true }
        } catch (e) {
            console.log(`Link validation failed for ${link.url}`, e)
            return { ...link, valid: false }
        }
    }))

    // Replace invalid links with just text
    let newHtml = html
    for (const check of checks) {
        if (!check.valid) {
            newHtml = newHtml.replace(check.fullMatch, check.text)
        }
    }

    return newHtml
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const authEmail = (req as any).adminEmail || 'admin'

    // Rate limit check
    const rateCheck = await checkRateLimit(authEmail, 'ai-generate', true)
    if (!rateCheck.allowed) {
        const resetIn = Math.ceil((rateCheck.resetAt - Date.now()) / 60000)
        return res.status(429).json({
            error: `Rate limit exceeded. Try again in ${resetIn} minutes.`,
            resetAt: rateCheck.resetAt
        })
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const { topic, primaryKeyword, secondaryKeywords, lsiKeywords, tone, mode, content: inputContent } = body

        if (mode === 'callout') {
            if (!inputContent) return res.status(400).json({ error: 'Content required for callout generation' })
        } else if (!topic || !primaryKeyword) {
            return res.status(400).json({ error: 'Topic and primary keyword required' })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            console.error('Missing OPENAI_API_KEY environment variable')
            return res.status(503).json({ error: 'OpenAI API key not configured on server' })
        }

        // Limit LSI keywords to 10 max
        const safeLsiKeywords = (lsiKeywords || []).slice(0, 10)

        // Default: Blog Post Generation
        let systemPrompt = 'You are a human blogger. Write naturally like a real person. Use contractions. Vary sentence length. Ask rhetorical questions. Be specific, not generic. Never use words like: delve, tapestry, landscape, leverage, utilize, comprehensive, pivotal, innovative, unprecedented. Output clean HTML only - start with <h1>.'

        let userPrompt = GENERATOR_PROMPT
            .replace('{topic}', topic || '')
            .replace('{primaryKeyword}', primaryKeyword || '')
            .replace('{secondaryKeywords}', (secondaryKeywords || []).join(', '))
            .replace('{lsiKeywords}', safeLsiKeywords.length > 0 ? safeLsiKeywords.join(', ') : 'None provided')
            .replace('{tone}', tone || 'professional')

        // Mode: Smart Callout
        if (mode === 'callout') {
            systemPrompt = `You are a blog editor assistant.
Analyze the user provided text and determine the best Callout Type for it:
- 'bonus': If it mentions extra points, money, money multiplying, or high rewards.
- 'alert': If it is a warning, expiring offer, restriction, or critical info.
- 'tip': If it is a helpful trick, strategy, or "pro tip".
- 'info': If it is general knowledge or "did you know".

Rewrite the text to be punchy, exciting, and short (max 2 sentences).
Return ONLY valid JSON in this format: { "type": "bonus" | "alert" | "tip" | "info", "text": "Rewritten text here" }`
            userPrompt = `Text to analyze: "${inputContent}"`
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: mode === 'callout' ? 150 : 4000,
                temperature: mode === 'callout' ? 0.3 : 0.9,
                top_p: 0.95,
                presence_penalty: 0.3,
                frequency_penalty: 0.5,
                response_format: mode === 'callout' ? { type: "json_object" } : undefined
            })
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }))
            console.error('OpenAI error:', err)
            return res.status(500).json({ error: 'AI provider error: ' + (err.error?.message || err.error || 'Unknown error') })
        }

        const data = await response.json()
        let content = data.choices?.[0]?.message?.content || ''
        const tokensUsed = data.usage?.total_tokens || 0

        if (mode !== 'callout') {
            // Post-process: clean AI-isms and add imperfections
            content = content.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
            content = content.replace(/^(Here('s| is) (the|your) (article|content|blog post)[:\.]?\s*)/i, '')
            content = cleanAIisms(content)
            content = addImperfections(content)
            content = await validateAndCleanLinks(content)
        }

        // Log usage
        await logAIUsage(authEmail, 'ai-generate', tokensUsed, data.model)

        return res.status(200).json({
            success: true,
            content,
            tokensUsed,
            remaining: rateCheck.remaining
        })

    } catch (error: any) {
        console.error('Generate error:', error)
        return res.status(500).json({ error: 'Internal server error: ' + error.message })
    }
}

export default requireAdmin(handler)
