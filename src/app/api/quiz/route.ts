import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp } from 'firebase-admin/firestore'

 export const dynamic = 'force-dynamic'

type Quiz = {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
  type?: 'multiple_choice' | 'true_false'
  difficulty?: 'easy' | 'medium' | 'hard'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get('storyId')
    const wantContent = searchParams.get('content') === '1'
    if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 })

    if (wantContent) {
      const storySnap = await db.collection('news_stories').doc(storyId).get()
      if (!storySnap.exists) return NextResponse.json({ error: 'Story not found' }, { status: 404 })
      const s = storySnap.data() as any
      const html = s?.externalUrl ? await safeFetchHtml(s.externalUrl) : undefined
      const text = ensureContentText(html, s?.title, s?.summary)
      return NextResponse.json({ text, sourceUrl: s?.externalUrl || null })
    }

    const snap = await db.collection('news_quizzes').doc(storyId).get()
    if (!snap.exists) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    return NextResponse.json({ quiz: snap.data() })
  } catch (error) {
    console.error('Quiz GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to get quiz'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get('storyId')
    const body = await request.json().catch(() => ({}))
    const overrideUrl: string | undefined = body?.externalUrl
    let title = body?.title as string | undefined
    let summary = body?.summary as string | undefined
    const difficulty = (body?.difficulty as Quiz['difficulty']) || (searchParams.get('difficulty') as Quiz['difficulty']) || 'medium'
    const preferredType = (body?.type as Quiz['type']) || (searchParams.get('type') as Quiz['type']) || undefined

    if (!storyId && !overrideUrl && !summary) {
      return NextResponse.json({ error: 'storyId or article data required' }, { status: 400 })
    }

    // If storyId provided, load from Firestore
    let story: any = null
    if (storyId) {
      const storySnap = await db.collection('news_stories').doc(storyId).get()
      if (storySnap.exists) {
        story = storySnap.data()
        title = title ?? story.title
        summary = summary ?? story.summary
      }
    }

    const externalUrl: string | undefined = overrideUrl ?? story?.externalUrl
    const articleHtml = externalUrl ? await safeFetchHtml(externalUrl) : undefined
    const articleText = ensureContentText(articleHtml, title, summary)

    // Try OpenAI first
    const aiQuiz = await callOpenAIQuiz(articleText, { title, url: externalUrl, difficulty, type: preferredType }).catch(() => null)
    const quiz: Quiz = aiQuiz ?? generateLocalQuiz(title, summary)

    // Persist
    const payload = {
      question: quiz.question,
      options: quiz.options,
      correctIndex: quiz.correctIndex,
      explanation: quiz.explanation ?? null,
      storyId: storyId ?? null,
      createdAt: Timestamp.now(),
      sourceUrl: externalUrl ?? null,
      model: process.env.OPENAI_MODEL ?? (process.env.OPENAI_API_KEY ? 'openai' : 'local'),
      type: quiz.type || 'multiple_choice',
      difficulty
    }
    if (storyId) {
      await db.collection('news_quizzes').doc(storyId).set(payload)
    }

    return NextResponse.json({ quiz: payload })
  } catch (error) {
    console.error('Quiz POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate quiz'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function safeFetchHtml(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { headers: { 'Accept': 'text/html' }, signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return undefined
    return await res.text()
  } catch {
    return undefined
  }
}

function ensureContentText(html: string | undefined, title?: string, summary?: string): string {
  const t = stripHtml(html ?? '')
  const cleaned = t.length >= 400 ? t : stripHtml(summary ?? '')
  const finalText = cleaned && cleaned.length > 200 ? cleaned : `${title ?? ''} ${summary ?? ''}`
  return finalText.trim().slice(0, 6000)
}

function stripHtml(input: any): string {
  const s = typeof input === 'string' ? input : String(input ?? '')
  return s.replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
}

function generateLocalQuiz(title?: string, summary?: string): Quiz {
  const text = `${title || ''} ${summary || ''}`.toLowerCase()
  const isSports = /\b(epl|premier league|caf|fifa|uefa|npfl|football|goal|arsenal|chelsea|manchester|barcelona|real madrid)\b/.test(text)
  const isPolitics = /\b(senator|governor|house of representatives|assembly|president|politics|inec|policy|minister)\b/.test(text)
  const isBusiness = /\b(business|economy|market|stock|bank|cbn|price|nnpc|naira)\b/.test(text)

  if (isSports) {
    return { question: 'Which sport is discussed in this article?', options: ['Football','Basketball','Tennis','Athletics'], correctIndex: 0, type: 'multiple_choice', difficulty: 'easy' }
  }
  if (isPolitics) {
    return { question: 'What domain best fits this article?', options: ['Politics','Business','Sports','Entertainment'], correctIndex: 0, type: 'multiple_choice', difficulty: 'easy' }
  }
  if (isBusiness) {
    return { question: 'What domain best fits this article?', options: ['Business','Politics','Sports','Technology'], correctIndex: 0, type: 'multiple_choice', difficulty: 'easy' }
  }
  return { question: 'Which category best describes this story?', options: ['News','Politics','Business','Sports'], correctIndex: 0, type: 'multiple_choice', difficulty: 'easy' }
}

async function callOpenAIQuiz(articleText: string, meta: { title?: string; url?: string; difficulty?: Quiz['difficulty']; type?: Quiz['type'] }): Promise<Quiz | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const targetType = meta.type || 'multiple_choice'
  const targetOptions = targetType === 'true_false' ? 2 : 4
  const sys = `You generate concise quizzes for news articles.
Output strict JSON with fields: question, options (exactly ${targetOptions}), correctIndex (0-based), explanation, type ('${targetType}'), difficulty ('${meta.difficulty || 'medium'}').
Keep questions short, factual, and grounded in the article. Make distractors plausible.
`
  const usr = `Title: ${meta.title || ''}
URL: ${meta.url || ''}
Difficulty: ${meta.difficulty || 'medium'}
Type: ${targetType}
Article:
${articleText}

Task: Create one ${targetType === 'true_false' ? 'True/False' : 'multiple choice'} question that tests reading comprehension. Return JSON only.`
  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: usr }
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) return null
  const parsed = JSON.parse(text)
  const question = String(parsed.question || '').trim()
  const options = Array.isArray(parsed.options) ? parsed.options.map((o: any) => String(o)) : []
  const correctIndex = Number.isInteger(parsed.correctIndex) ? parsed.correctIndex : 0
  const explanation = parsed.explanation ? String(parsed.explanation) : undefined
  const type = (parsed.type === 'true_false' || parsed.type === 'multiple_choice') ? parsed.type : (options.length === 2 ? 'true_false' : 'multiple_choice')
  const difficulty = (parsed.difficulty === 'easy' || parsed.difficulty === 'medium' || parsed.difficulty === 'hard') ? parsed.difficulty : undefined
  if (!question || options.length !== (type === 'true_false' ? 2 : 4)) return null
  return { question, options, correctIndex, explanation, type, difficulty }
}
