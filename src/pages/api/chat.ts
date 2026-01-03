import type { NextApiRequest, NextApiResponse } from 'next'
import { allowCors } from '@/lib/cors'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Inline knowledge base for reliable serverless execution
const KNOWLEDGE_BASE = `# KojoBot Knowledge Base

## About KojoMoney
- KojoMoney is a rewards app where users collect points by completing activities
- Points can be redeemed for gift cards (Amazon, Google Play, Steam, etc.)
- Minimum withdrawal is 1000 points
- Available worldwide with varying offers by region
- The app is free to use, no purchases required

## How to Earn Points

### Daily Trivia (50+ points)
- Answer 5-10 quiz questions daily
- Get bonus points for perfect scores
- Builds your streak for multipliers
- Resets at midnight (your local time)

### Watch Ads (5 points each)
- Up to 10 ads per day = 50 points max
- 30-60 second videos
- Must complete full video to earn

### Read News Stories (10 points each)
- Up to 10 stories per day = 100 points max
- Must read for at least 30 seconds

### Complete Offers (100-5000+ points)
- Install and try new apps
- Complete surveys
- Sign up for services
- Points credit within 24-48 hours usually

### Lucky Spin (Free Daily)
- One free spin every 24 hours
- Win 5 to 500 points randomly
- Watch an ad for a bonus spin

### Refer Friends (10% Lifetime Commission)
- Share your unique referral code
- Earn 10% of everything your friends earn FOREVER
- No limit on referrals

### Daily Challenges
- Complete all daily tasks
- Unlock a bonus chest with extra points
- Streaks give multiplier bonuses

### Play Games
- Practice Games: Play mini-games for bonus points
- Playtime Rewards: Earn points per minute of gameplay

### Post Payment Proof (500 bonus points)
- After you receive a payment/withdrawal
- Post your payment screenshot on TikTok or Telegram
- Tag @KojoMoney in your post
- Upload screenshot as proof in the app
- Admin reviews and approves for 500 bonus points

## Referral System
- Each user has a unique referral code
- When friends sign up and earn, you get 10% bonus
- This is LIFETIME - you earn forever from each referral

## Streak System
- Login and complete at least one task daily
- Streak increases each consecutive day
- Missing a day resets your streak to 0
- Day 7+: 1.2x multiplier (20% bonus)
- Day 30+: 1.5x multiplier (50% bonus)

## Withdrawals & Redemptions
- Minimum: 1000 points
- Must have verified email
- Processing time: Usually 24-48 hours
- Gift cards delivered via email

## Troubleshooting
- Points Not Credited: Wait 24-48 hours for offer points
- Ad Not Loading: Check internet, try again in a few minutes
- Can't Withdraw: Need 1000 points minimum and verified email
- Streak Lost: Complete at least one task daily to maintain

## Support
- Email: admin@kojomoney.com
- Response time: Usually within 24 hours
`

// Build the system prompt with knowledge base
function buildSystemPrompt(): string {
    return `You are KojoBot, a friendly and helpful AI assistant for the KojoMoney rewards app.

## Your Role:
- Help users understand how to earn points and redeem rewards
- Give proactive advice on maximizing earnings
- Troubleshoot common issues
- Be encouraging and positive

## Your Knowledge Base:
${KNOWLEDGE_BASE}

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

export default allowCors(handler)
