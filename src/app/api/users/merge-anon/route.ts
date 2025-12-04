import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const targetUserId = (session?.user as any)?.id || session?.user?.email || null
    if (!targetUserId) return NextResponse.json({ error: 'Login required' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const anonId = String(body?.anonId || '').trim()
    if (!anonId) return NextResponse.json({ error: 'anonId required' }, { status: 400 })
    const anonUserId = `anon:${anonId}`

    // Merge points from anon user doc
    const anonDoc = await db.collection('users').doc(anonUserId).get()
    let transferredPoints = 0
    let transferredNews = 0
    if (anonDoc.exists) {
      const data = anonDoc.data() as any
      const total = Number(data?.totalPoints || 0)
      const news = Number(data?.newsPoints || 0)
      if (total > 0 || news > 0) {
        await db.collection('users').doc(targetUserId).set({
          totalPoints: total > 0 ? FieldValue.increment(total) : undefined,
          newsPoints: news > 0 ? FieldValue.increment(news) : undefined,
          mergedFromAnon: anonUserId,
          updatedAt: Timestamp.now(),
        }, { merge: true })
        transferredPoints = total
        transferredNews = news
      }
      await db.collection('users').doc(anonUserId).set({ mergedTo: targetUserId, totalPoints: 0, newsPoints: 0 }, { merge: true })
    }

    // Move news_reads documents from anon to target
    const readsSnap = await db.collection('news_reads').where('userId', '==', anonUserId).limit(500).get()
    let migratedReads = 0
    let skippedReads = 0
    for (const doc of readsSnap.docs) {
      const data = doc.data() as any
      const storyId = String(data?.storyId || '')
      if (!storyId) { skippedReads++; continue }
      const newId = `${targetUserId}_${storyId}`
      const newRef = db.collection('news_reads').doc(newId)
      const existing = await newRef.get()
      if (existing.exists) { skippedReads++; continue }
      await newRef.set({ ...data, userId: targetUserId })
      await doc.ref.delete()
      migratedReads++
    }

    return NextResponse.json({ ok: true, transferredPoints, transferredNews, migratedReads, skippedReads })
  } catch (error) {
    console.error('merge-anon error:', error)
    const message = error instanceof Error ? error.message : 'Failed to merge'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
