import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const { secret, newPoints } = await request.json()

        // Simple secret check (you should use a proper auth mechanism)
        if (secret !== 'admin-earnapp-2024') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const pointsToSet = newPoints || 10

        // Get all news stories
        const storiesSnap = await db.collection('news_stories').get()

        let updated = 0
        const batch = db.batch()

        storiesSnap.docs.forEach((doc) => {
            batch.update(doc.ref, { points: pointsToSet })
            updated++
        })

        await batch.commit()

        return NextResponse.json({
            success: true,
            message: `Updated ${updated} stories to ${pointsToSet} points`
        })
    } catch (error) {
        console.error('Error updating story points:', error)
        const message = error instanceof Error ? error.message : 'Failed to update'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
