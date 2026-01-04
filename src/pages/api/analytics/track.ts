import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import requestIp from 'request-ip'
import geoip from 'geoip-lite'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { postId, title, type = 'view', referrer } = req.body

        // Get IP and Geo Data
        const ip = requestIp.getClientIp(req) || 'unknown'
        const geo = geoip.lookup(ip)
        const country = geo?.country || 'Unknown'
        const city = geo?.city || 'Unknown'

        // Store in Firestore
        // We'll use a subcollection 'analytics' under the post for detailed logs
        // And increment counters on the post document for aggregation

        // Note: FieldValue requires importing from firebase-admin in the lib usually, 
        // but let's assume specific import if needed or use db.FieldValue if available on instance (it's not usually)
        // We need to import FieldValue properly.
        const FieldValue = require('firebase-admin').firestore.FieldValue;

        await db.collection('posts').doc(postId).collection('analytics').add({
            type, // 'view', 'scroll', etc
            ip, // Consider anonymizing if GDPR is strict, but user asked for country
            country,
            city,
            referrer: referrer || req.headers.referer || 'direct',
            userAgent: req.headers['user-agent'] || 'unknown',
            createdAt: Date.now()
        })

        // Increment aggregate counters
        if (type === 'view') {
            await db.collection('posts').doc(postId).update({
                'stats.views': FieldValue.increment(1),
                [`stats.countries.${country}`]: FieldValue.increment(1),
                [`stats.referrers.${getReferrerDomain(referrer || (req.headers.referer as string) || 'direct')}`]: FieldValue.increment(1)
            })
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Analytics error:', error)
        return res.status(200).json({ success: false })
    }
}

function getReferrerDomain(referrer: string): string {
    if (!referrer || referrer === 'direct') return 'Direct'
    try {
        const url = new URL(referrer)
        return url.hostname.replace('www.', '')
    } catch {
        return 'Unknown'
    }
}
