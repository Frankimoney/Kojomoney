import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const history: any[] = []

        // Fetch reading points
        try {
            const newsReadsSnap = await db
                .collection('news_reads')
                .where('userId', '==', userId)
                .where('pointsEarned', '>', 0)
                .orderBy('pointsEarned', 'desc')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()

            for (const doc of newsReadsSnap.docs) {
                const data = doc.data()
                // Fetch story title
                let storyTitle = 'News Article'
                try {
                    const storySnap = await db.collection('news_stories').doc(data.storyId).get()
                    if (storySnap.exists) {
                        storyTitle = (storySnap.data() as any)?.title || 'News Article'
                    }
                } catch (e) {
                    // ignore
                }

                history.push({
                    source: 'reading',
                    points: data.pointsEarned || 0,
                    title: storyTitle,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                })
            }
        } catch (err: any) {
            // If index doesn't exist, fetch without orderBy
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                const newsReadsSnap = await db
                    .collection('news_reads')
                    .where('userId', '==', userId)
                    .get()

                for (const doc of newsReadsSnap.docs) {
                    const data = doc.data()
                    if ((data.pointsEarned || 0) > 0) {
                        let storyTitle = 'News Article'
                        try {
                            const storySnap = await db.collection('news_stories').doc(data.storyId).get()
                            if (storySnap.exists) {
                                storyTitle = (storySnap.data() as any)?.title || 'News Article'
                            }
                        } catch (e) {
                            // ignore
                        }

                        history.push({
                            source: 'reading',
                            points: data.pointsEarned || 0,
                            title: storyTitle,
                            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        })
                    }
                }
            } else {
                throw err
            }
        }

        // Fetch trivia points
        try {
            const triviaSnap = await db
                .collection('trivia_attempts')
                .where('userId', '==', userId)
                .where('pointsEarned', '>', 0)
                .orderBy('pointsEarned', 'desc')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()

            for (const doc of triviaSnap.docs) {
                const data = doc.data()
                history.push({
                    source: 'trivia',
                    points: data.pointsEarned || 0,
                    title: `Trivia Challenge - ${data.correctAnswers || 0}/${data.totalQuestions || 0} correct`,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                })
            }
        } catch (err: any) {
            // If index doesn't exist, fetch without orderBy
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                const triviaSnap = await db
                    .collection('trivia_attempts')
                    .where('userId', '==', userId)
                    .get()

                for (const doc of triviaSnap.docs) {
                    const data = doc.data()
                    if ((data.pointsEarned || 0) > 0) {
                        history.push({
                            source: 'trivia',
                            points: data.pointsEarned || 0,
                            title: `Trivia Challenge - ${data.correctAnswers || 0}/${data.totalQuestions || 0} correct`,
                            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        })
                    }
                }
            } else {
                throw err
            }
        }

        // Fetch ad viewing points (if you have this collection)
        try {
            const adsSnap = await db
                .collection('ad_views')
                .where('userId', '==', userId)
                .where('pointsEarned', '>', 0)
                .orderBy('pointsEarned', 'desc')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()

            for (const doc of adsSnap.docs) {
                const data = doc.data()
                history.push({
                    source: 'ads',
                    points: data.pointsEarned || 0,
                    title: 'Watched Advertisement',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                })
            }
        } catch (err: any) {
            // If index doesn't exist or collection doesn't exist, just skip
            const msg = String(err?.details || err?.message || '')
            if (msg.includes('requires an index') || err?.code === 9) {
                try {
                    const adsSnap = await db
                        .collection('ad_views')
                        .where('userId', '==', userId)
                        .get()

                    for (const doc of adsSnap.docs) {
                        const data = doc.data()
                        if ((data.pointsEarned || 0) > 0) {
                            history.push({
                                source: 'ads',
                                points: data.pointsEarned || 0,
                                title: 'Watched Advertisement',
                                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                            })
                        }
                    }
                } catch (e) {
                    // Collection might not exist, ignore
                }
            }
        }

        // Sort by date descending
        history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Limit to 100 most recent
        const limitedHistory = history.slice(0, 100)

        return NextResponse.json({ history: limitedHistory })
    } catch (error) {
        console.error('Error fetching points history:', error)
        return NextResponse.json({ error: 'Failed to fetch points history' }, { status: 500 })
    }
}
