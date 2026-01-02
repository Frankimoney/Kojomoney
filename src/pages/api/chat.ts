import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Read knowledge base from file - this makes it easy to update
function getKnowledgeBase(): string {
    try {
        const knowledgePath = path.join(process.cwd(), 'src', 'data', 'chatbot-knowledge.md')
        const knowledge = fs.readFileSync(knowledgePath, 'utf-8')
        return knowledge
    } catch (error) {
        console.error('Error reading knowledge base:', error)
        return ''
    }
}

// Build the system prompt with knowledge base
function buildSystemPrompt(): string {
    const knowledge = getKnowledgeBase()

    return `You are KojoBot, a friendly and helpful AI assistant for the KojoMoney rewards app.

## Your Role:
- Help users understand how to earn points and redeem rewards
- Give proactive advice on maximizing earnings
- Troubleshoot common issues
- Be encouraging and positive

## Your Knowledge Base:
${knowledge}

## Response Guidelines:
- Be helpful, friendly, and concise
- Keep responses short (2-4 sentences) unless explaining something complex
- Use emojis sparingly to be friendly 😊
- Always be encouraging and positive
- When giving advice, be specific and actionable
- Suggest ONE thing they can do immediately
- If you don't know something, suggest contacting admin@kojomoney.com
- Never make false promises about earnings

Current date: ${new Date().toLocaleDateString()}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { message, history = [] } = req.body

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' })
    }

    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    try {
        // Build system prompt with latest knowledge
        const systemPrompt = buildSystemPrompt()

        // Build messages array with history
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map((msg: any) => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: message }
        ]

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 400,
                temperature: 0.7
            })
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('OpenAI API error:', error)
            return res.status(500).json({ error: 'Failed to get AI response' })
        }

        const data = await response.json()
        const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again."

        return res.status(200).json({ reply })

    } catch (error) {
        console.error('Chat API error:', error)
        return res.status(500).json({ error: 'Something went wrong. Please try again.' })
    }
}
