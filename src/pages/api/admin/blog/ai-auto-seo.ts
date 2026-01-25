import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit, logAIUsage } from '@/lib/ai-rate-limiter'
import { getAISystemPrompt } from '@/lib/ai-knowledge'

const AUTO_SEO_PROMPT = `Analyze this blog content and generate SEO metadata.

TITLE: {title}

CONTENT:
{content}

Generate the following in JSON format:
{
    "metaTitle": "SEO-optimized title under 60 characters",
    "metaDescription": "Compelling description between 140-155 characters that includes main keyword",
    "focusKeyword": "The single most important 2-4 word keyword phrase",
    "slug": "url-friendly-slug-with-hyphens",
    "excerpt": "2-3 sentence summary for post previews, max 200 characters"
}

RULES:
1. metaTitle must be under 60 characters
2. metaDescription must be 140-155 characters
3. focusKeyword should be the main topic, 2-4 words
4. slug should be lowercase, hyphens only, no special chars
5. excerpt should hook the reader

Return ONLY valid JSON, no other text.`

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    // Rate limit (using request headers since requireAdmin already verified)
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

        // Strip HTML for cleaner analysis
        const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        const truncatedContent = plainContent.substring(0, 3000) // Limit content length

        const prompt = AUTO_SEO_PROMPT
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
                    { role: 'system', content: getAISystemPrompt('seo') + '\n\nReturn only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
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

        // Parse JSON from response
        let seoData
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                seoData = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('No JSON found')
            }
        } catch (parseError) {
            console.error('Parse error:', parseError, rawContent)
            return res.status(500).json({ error: 'Failed to parse AI response' })
        }

        // Log usage
        await logAIUsage(authEmail, 'ai-auto-seo', tokensUsed, 'gpt-4.1')

        return res.status(200).json({
            success: true,
            data: {
                metaTitle: seoData.metaTitle || '',
                metaDescription: seoData.metaDescription || '',
                focusKeyword: seoData.focusKeyword || '',
                slug: seoData.slug || '',
                excerpt: seoData.excerpt || ''
            },
            tokensUsed
        })

    } catch (error) {
        console.error('Auto SEO error:', error)
        return res.status(500).json({ error: 'Failed to generate SEO data' })
    }
}

export default requireAdmin(handler)
