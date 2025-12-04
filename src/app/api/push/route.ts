import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const { userId, token, platform } = await request.json()
    if (!userId || !token) {
      return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 })
    }

    const docId = `${userId}_${platform || 'unknown'}_${Buffer.from(token).toString('base64').slice(0, 16)}`
    await db.collection('push_tokens').doc(docId).set({
      userId,
      token,
      platform: platform || 'unknown',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      active: true,
    })

    await db.collection('users').doc(userId).update({
      pushRegisteredAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, token } = await request.json()
    if (!userId || !token) {
      return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 })
    }
    const snap = await db.collection('push_tokens').where('userId', '==', userId).where('token', '==', token).limit(1).get()
    const doc = snap.docs[0]
    if (doc) {
      await doc.ref.update({ active: false, updatedAt: Timestamp.now() })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to unregister token' }, { status: 500 })
  }
}
