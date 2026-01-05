import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit, logAIUsage } from '@/lib/ai-rate-limiter'
import { getAISystemPrompt } from '@/lib/ai-knowledge'

const HOWTO_PROMPT = `Analyze this content and extract step-by-step instructions.

TITLE: {title}

CONTENT:
{content}

Generate a JSON array of steps. Each step should have:
- name: Brief title for the step (under 60 chars)
- text: Detailed instruction (1-3 sentences)

Return 4-8 steps that represent the main actions described in the content.

Format:
[
    {"name": "Step title", "text": "Detailed instructions for this step."},
    {"name": "Another step", "text": "More instructions."}
]

RULES:
1. Extract actual steps from the content, don't make up steps
2. Keep step names action-oriented (Start with verbs)
3. Each step text should be 1-3 complete sentences
4. Order steps logically

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

        const prompt = HOWTO_PROMPT
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
                    { role: 'system', content: getAISystemPrompt('howto') + '\n\nReturn only valid JSON array.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1000,
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

        let steps
        try {
            const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
                steps = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('No JSON found')
            }
        } catch (parseError) {
            console.error('Parse error:', parseError, rawContent)
            return res.status(500).json({ error: 'Failed to parse AI response' })
        }

        await logAIUsage(authEmail, 'ai-howto', tokensUsed, 'gpt-4.1')

        return res.status(200).json({
            success: true,
            data: { steps },
            tokensUsed
        })

    } catch (error) {
        console.error('HowTo generation error:', error)
        return res.status(500).json({ error: 'Failed to generate steps' })
    }
}

export default requireAdmin(handler)
