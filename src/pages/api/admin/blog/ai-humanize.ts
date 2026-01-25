import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit, logAIUsage } from '@/lib/ai-rate-limiter'
import { cleanAIisms, addImperfections, addBurstiness } from '@/lib/ai-blacklist'

const PERSONAS: Record<string, string> = {
    skeptical: 'a skeptical Nigerian blogger who questions claims, uses "sha", "sef", and writes like they\'re chatting with a friend',
    casual: 'a friendly Nigerian expert who explains things like they\'re gisting with someone, using relatable examples',
    technical: 'a no-nonsense tech writer who gets straight to the point without fluff'
}

const HUMANIZER_PROMPT = `You are a human ghostwriter. Your ONLY job is to rewrite this text so AI detectors (ZeroGPT, GPTZero, Originality.ai) score it as HUMAN (<15% AI).

The secret? Burstiness and Perplexity.

BURSTINESS RULES (Critical):
- Mix sentence lengths DRAMATICALLY. One sentence: 4 words. Next: 35 words with multiple clauses.
- Use fragments. "Like this." One-word sentences? Sure.
- Vary paragraph length. One paragraph = 1 sentence. Next = 5 sentences.

PERPLEXITY RULES (Critical):
- Use unexpected word choices. Not "beneficial" — say "helpful" or "handy".
- Start sentences with "And", "But", "So", "Because", "Look," — AI avoids these.
- Ask rhetorical questions mid-paragraph. Why? Because humans do this.
- Use contractions always. "Don't", "won't", "it's", never "do not".

BANNED AI WORDS (Never use):
delve, tapestry, landscape, moreover, furthermore, pivotal, testament, realm, vibrant, bustling, underscore, comprehensive, leverage, utilize, facilitate, optimize, innovative, groundbreaking, unprecedented, compelling, nuanced, endeavor, embark, journey, ecosystem, framework, foster, bolster, meticulous, intricate, encompasses, embodies, exemplifies, epitomizes, quintessential, in conclusion, it is important to note, in today's world, in the realm of

PERSONA: {personaDescription}
INTENSITY: {level}/3 (3 = complete restructure)

PRESERVE EXACTLY:
- All <h1>, <h2>, <h3> headings
- All <a href="...">...</a> links
- Core facts and advice

REWRITE THIS:
{content}

OUTPUT: Clean HTML only. No intro like "Here is". Just the rewritten content.`

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const authEmail = (req as any).adminEmail || 'admin'

    // Rate limit
    const rateCheck = await checkRateLimit(authEmail, 'ai-humanize', true)
    if (!rateCheck.allowed) {
        const resetIn = Math.ceil((rateCheck.resetAt - Date.now()) / 60000)
        return res.status(429).json({
            error: `Rate limit exceeded. Try again in ${resetIn} minutes.`,
            resetAt: rateCheck.resetAt
        })
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const { content, persona = 'casual', aggressiveness = 2 } = body

        if (!content) {
            return res.status(400).json({ error: 'Content required' })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' })
        }

        const personaDescription = PERSONAS[persona] || PERSONAS.casual
        const level = Math.min(3, Math.max(1, aggressiveness))

        // HIGH temperature for true unpredictability (0.85 - 0.95)
        const temperature = 0.85 + (level * 0.03) // Level 1: 0.88, Level 2: 0.91, Level 3: 0.94

        const prompt = HUMANIZER_PROMPT
            .replace('{personaDescription}', personaDescription)
            .replace('{level}', String(level))
            .replace('{content}', content)

        let result = ''
        let attempts = 0
        const maxAttempts = 3 // Try up to 3 times if verification fails
        let tokensUsed = 0

        while (attempts < maxAttempts) {
            attempts++

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a human rewriter. Your ONLY goal: make this text undetectable by AI detectors (ZeroGPT, GPTZero, Originality.ai).

CRITICAL RULES:
1. BURSTINESS: Mix very short sentences (3-5 words) with long ones (25+ words). This is the #1 signal.
2. BANNED WORDS - NEVER USE: delve, tapestry, landscape, moreover, furthermore, pivotal, testament, realm, vibrant, bustling, leverage, utilize, comprehensive, innovative, unprecedented, compelling, nuanced, endeavor, ecosystem, framework, foster, meticulous, intricate, in conclusion
3. CONTRACTIONS: Always use don't, won't, it's, you're - never "do not"
4. SENTENCE STARTERS: Start some with "And", "But", "So", "Look," - AI avoids these
5. RHETORICAL QUESTIONS: Ask "Why?" or "What does this mean?" mid-paragraph
6. FRAGMENTS: Use incomplete sentences. Like this. For impact.
7. PRESERVE: Keep all <h1>, <h2>, <h3> tags and <a href> links exactly as-is

Output clean HTML only. No markdown. No intro text.`
                        },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 4000,
                    temperature: temperature,
                    top_p: 0.9, // Nucleus sampling for variety
                    presence_penalty: 0.6, // Higher to avoid repetition
                    frequency_penalty: 0.8 // Higher to force new words
                })
            })

            if (!response.ok) {
                const err = await response.json()
                console.error('OpenAI error:', err)
                return res.status(500).json({ error: 'AI humanization failed' })
            }

            const data = await response.json()
            result = data.choices?.[0]?.message?.content || ''
            tokensUsed += data.usage?.total_tokens || 0

            // AGGRESSIVE Post-processing
            result = cleanAIisms(result)
            result = addImperfections(result)
            result = addBurstiness(result)

            // Verification
            const aiScore = verifyHumanization(result)

            if (aiScore.passed || attempts >= maxAttempts) {
                console.log(`Humanization complete after ${attempts} attempt(s). Issues: ${aiScore.issues.join(', ') || 'None'}`)
                break
            }

            console.log(`Humanization attempt ${attempts} failed: ${aiScore.issues.join(', ')}. Retrying...`)
        }

        // Log usage
        await logAIUsage(authEmail, 'ai-humanize', tokensUsed, 'gpt-4o')

        return res.status(200).json({
            success: true,
            content: result,
            tokensUsed,
            remaining: rateCheck.remaining,
            attempts
        })

    } catch (error) {
        console.error('Humanize error:', error)
        return res.status(500).json({ error: 'Failed to humanize content' })
    }
}

// Strict verification function
function verifyHumanization(content: string): { passed: boolean; issues: string[] } {
    const issues: string[] = []
    const lowerContent = content.toLowerCase()

    // Check for remaining blacklisted words
    const criticalAIWords = [
        'delve', 'tapestry', 'moreover', 'furthermore', 'pivotal', 'testament',
        'vibrant', 'bustling', 'realm', 'in the realm of', 'it is important to note',
        'landscape', 'leverage', 'utilize', 'comprehensive', 'innovative',
        'unprecedented', 'in conclusion', 'in today\'s world'
    ]

    for (const word of criticalAIWords) {
        if (lowerContent.includes(word)) {
            issues.push(`Contains AI-ism: "${word}"`)
        }
    }

    // Check for sentence uniformity (burstiness check)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length > 5) {
        const lengths = sentences.map(s => s.trim().split(/\s+/).length)
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
        const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length

        // Need high variance (burstiness)
        if (variance < 20) {
            issues.push('Low burstiness - sentences too uniform')
        }

        // Check for short sentences (need some)
        const shortSentences = lengths.filter(l => l <= 6).length
        if (shortSentences < 2) {
            issues.push('No short punchy sentences')
        }
    }

    // Check for contractions (humans use them)
    const contractionCount = (content.match(/\b(don't|won't|can't|isn't|aren't|it's|you're|they're|we're|I'm|I've|you've|we've|I'd|you'd|we'd|I'll|you'll|we'll|that's|there's|what's|let's)\b/gi) || []).length
    if (contractionCount < 3 && content.length > 500) {
        issues.push('Too few contractions')
    }

    // Check for sentence starters with And/But/So
    const casualStarters = (content.match(/[.!?]\s*(And|But|So|Because|Look,|Here's|Plus,)\s/gi) || []).length
    if (casualStarters < 1 && content.length > 500) {
        issues.push('No casual sentence starters')
    }

    return {
        passed: issues.length === 0,
        issues
    }
}

export default requireAdmin(handler)
