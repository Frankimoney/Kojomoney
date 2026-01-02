import type { NextApiRequest, NextApiResponse } from 'next'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const SYSTEM_PROMPT = `You are KojoBot, a friendly and helpful AI assistant for the KojoMoney rewards app. Your role is to help users understand how to earn points, redeem rewards, and get the most out of the app.

## About KojoMoney:
- KojoMoney is a rewards app where users collect points by completing activities
- Points can be redeemed for gift cards and other rewards
- Minimum withdrawal is 1000 points

## How to Earn Points:
1. **Daily Trivia** - Answer quiz questions to earn 50+ points daily
2. **Watch Ads** - Earn 5 points per ad (up to 10 ads/day)
3. **Read News** - Earn 10 points per story (up to 10 stories/day)
4. **Complete Offers** - Install apps, take surveys (100-5000+ points)
5. **Lucky Spin** - Free daily spin for random rewards
6. **Refer Friends** - Earn 10% of everything your referrals earn, forever!
7. **Daily Challenges** - Complete all tasks for a bonus chest

## Streaks:
- Login daily to build your streak
- Higher streaks = bonus multipliers on earnings
- Don't break your streak!

## Withdrawals:
- Minimum: 1000 points
- Methods: Gift Cards (Amazon, Google Play, etc.)
- Processing: Usually within 24-48 hours

## Rules:
- Be helpful, friendly, and concise
- If you don't know something specific, suggest contacting support at admin@kojomoney.com
- Never make false promises about earnings
- Keep responses short (2-4 sentences max unless explaining something complex)
- Use emojis sparingly to be friendly 😊

Current date: ${new Date().toLocaleDateString()}`

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
        // Build messages array with history
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
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
                model: 'gpt-4o-mini', // Cost effective, fast
                messages,
                max_tokens: 300,
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
