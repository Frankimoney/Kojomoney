
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) return res.status(500).send("No DB");
    try {
        const aggs = await db.collection('users').aggregate({
            totalPoints: admin.firestore.AggregateField.sum('totalPoints'),
            points: admin.firestore.AggregateField.sum('points'),
            count: admin.firestore.AggregateField.count()
        }).get();

        return res.json({
            data: aggs.data()
        });
    } catch (e: any) {
        return res.status(500).json({ error: e.message, stack: e.stack });
    }
}
