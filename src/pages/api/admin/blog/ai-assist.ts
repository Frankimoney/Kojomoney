import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    try {
        const { mode, title, content } = req.body

        // Get OpenAI API Key from environment
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'OpenAI API key not configured' })
        }

        let prompt = ''
        if (mode === 'outline') {
            prompt = `Generate a structured blog post outline for the topic: "${title}". 
            Return the outline as HTML with <h2> for main sections and <p> for brief descriptions. 
            Include 4-5 main sections. Keep descriptions brief (1-2 sentences each).`
        } else if (mode === 'rewrite') {
            prompt = `Suggest 5 catchy, SEO-friendly alternative titles for: "${title}". 
            Return each title on a new line. Make them engaging and click-worthy.`
        } else {
            return res.status(400).json({ success: false, error: 'Invalid mode' })
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful blog writing assistant. Be concise and practical.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('OpenAI Error:', error)
            return res.status(500).json({ success: false, error: 'AI generation failed' })
        }

        const data = await response.json()
        const result = data.choices?.[0]?.message?.content || ''

        return res.status(200).json({ success: true, result })

    } catch (error) {
        console.error('AI Assist error:', error)
        return res.status(500).json({ success: false, error: 'Failed to generate content' })
    }
}

export default requireAdmin(handler)
