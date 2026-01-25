import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit, logAIUsage } from '@/lib/ai-rate-limiter'
import { getAISystemPrompt } from '@/lib/ai-knowledge'

const FAQ_PROMPT = `Generate FAQ questions and answers based on this blog content.

TITLE: {title}

CONTENT:
{content}

Generate 3-5 frequently asked questions that readers might have after reading this content.

Return JSON array format:
[
    {"question": "Question 1?", "answer": "Answer 1"},
    {"question": "Question 2?", "answer": "Answer 2"}
]

RULES:
1. Questions should be what real users would search for
2. Answers should be 1-3 sentences, factual and helpful
3. Do NOT repeat information verbatim from the content
4. Focus on practical, actionable questions
5. Include at least one "how" and one "what" question

Return ONLY valid JSON array, no other text.`

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const authEmail = (req as any).adminEmail || 'admin'
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
        const { title, content } = body

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content required' })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' })
        }

        const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        const truncatedContent = plainContent.substring(0, 3000)

        const prompt = FAQ_PROMPT
            .replace('{title}', title)
            .replace('{content}', truncatedContent)

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: getAISystemPrompt('faq') + '\n\nReturn only valid JSON array.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 800,
                temperature: 0.4
            })
        })

        if (!response.ok) {
            const err = await response.json()
            console.error('OpenAI error:', err)
            return res.status(500).json({ error: 'AI generation failed' })
        }

        const data = await response.json()
        const rawContent = data.choices?.[0]?.message?.content || ''
        const tokensUsed = data.usage?.total_tokens || 0

        let faqs
        try {
            const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
                faqs = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('No JSON found')
            }
        } catch (parseError) {
            console.error('Parse error:', parseError, rawContent)
            return res.status(500).json({ error: 'Failed to parse AI response' })
        }

        await logAIUsage(authEmail, 'ai-faq', tokensUsed, 'gpt-4.1')

        return res.status(200).json({
            success: true,
            data: faqs,
            tokensUsed
        })

    } catch (error) {
        console.error('FAQ generation error:', error)
        return res.status(500).json({ error: 'Failed to generate FAQs' })
    }
}

export default requireAdmin(handler)
