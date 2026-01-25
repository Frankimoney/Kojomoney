import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit, logAIUsage } from '@/lib/ai-rate-limiter'
import { getAISystemPrompt } from '@/lib/ai-knowledge'

const AEO_PROMPT = `You are an AEO (Answer Engine Optimization) expert.
Analyze the following blog post content and generate optimization data for AI snapshots and Answer Engines (like Google SGE, Perplexity, ChatGPT).

Title: {title}
Focus Keyword: {focusKeyword}
Content: {content_snippet}

Requirements:
1. keyTakeaways: Generate 3-5 concise, high-value bullet points summarizing the core value.
2. directAnswer: Write a definitive, direct answer to the implicit question behind the focus keyword. Target 40-60 words. Structure it for "Position Zero" featured snippets.
3. geoKeywords: Generate 5 conversational, natural-language questions users might ask AI about this topic (e.g., "How do I...", "Best way to...").

Return STRICT JSON format:
{
  "keyTakeaways": ["string", ...],
  "directAnswer": "string",
  "geoKeywords": ["string", ...]
}`

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const authEmail = (req as any).adminEmail || 'admin'
    const rateCheck = await checkRateLimit(authEmail, 'ai-geo', true)
    if (!rateCheck.allowed) {
        return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const { title, content, focusKeyword } = body

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content required' })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return res.status(503).json({ error: 'AI service not configured' })
        }

        // Truncate content to avoid token limits, keeping most relevant parts (start)
        const contentSnippet = content.replace(/<[^>]*>/g, ' ').slice(0, 12000)

        const prompt = AEO_PROMPT
            .replace('{title}', title)
            .replace('{focusKeyword}', focusKeyword || 'topic')
            .replace('{content_snippet}', contentSnippet)

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: getAISystemPrompt('seo') },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1000,
                temperature: 0.3
            })
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            console.error('OpenAI Error:', err)
            throw new Error('AI provider error')
        }

        const data = await response.json()
        const resultString = data.choices?.[0]?.message?.content || '{}'
        const result = JSON.parse(resultString)

        await logAIUsage(authEmail, 'ai-geo', data.usage?.total_tokens || 0, 'gpt-4-turbo-preview')

        return res.status(200).json({
            success: true,
            data: {
                keyTakeaways: result.keyTakeaways || [],
                directAnswer: result.directAnswer || '',
                geoKeywords: result.geoKeywords || []
            }
        })

    } catch (error: any) {
        console.error('AEO Generation Error:', error)
        return res.status(500).json({ error: error.message || 'Internal server error' })
    }
}

export default requireAdmin(handler)
