/**
 * Debug endpoint for checking user points data
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!db) return res.status(500).json({ error: 'No DB connection' })

    try {
        const usersSnapshot = await db.collection('users').limit(10).get()

        const sampleUsers: any[] = []
        let totalPoints = 0
        let totalTotalPoints = 0
        let usersWithPoints = 0
        let usersWithTotalPoints = 0

        usersSnapshot.forEach(doc => {
            const data = doc.data()
            const points = data.points || 0
            const totPoints = data.totalPoints || 0

            totalPoints += points
            totalTotalPoints += totPoints

            if (points > 0) usersWithPoints++
            if (totPoints > 0) usersWithTotalPoints++

            sampleUsers.push({
                id: doc.id,
                email: data.email,
                points: data.points,
                totalPoints: data.totalPoints,
                hasPoints: 'points' in data,
                hasTotalPoints: 'totalPoints' in data
            })
        })

        // Also get total count
        const allUsers = await db.collection('users').get()
        let allTotalPoints = 0
        let allPointsField = 0

        allUsers.forEach(doc => {
            const data = doc.data()
            allTotalPoints += (data.totalPoints || 0)
            allPointsField += (data.points || 0)
        })

        return res.json({
            totalUsersCount: allUsers.size,
            sampleUsersCount: sampleUsers.length,
            sampleUsers,
            summary: {
                samplePointsSum: totalPoints,
                sampleTotalPointsSum: totalTotalPoints,
                sampleUsersWithPoints: usersWithPoints,
                sampleUsersWithTotalPoints: usersWithTotalPoints
            },
            allUsersSummary: {
                totalUsersChecked: allUsers.size,
                sumOfTotalPointsField: allTotalPoints,
                sumOfPointsField: allPointsField,
                combinedPoints: allTotalPoints + allPointsField
            }
        })
    } catch (e: any) {
        return res.status(500).json({ error: e.message, stack: e.stack })
    }
}
