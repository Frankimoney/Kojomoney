/**
 * IndexNow API Endpoint
 * Notifies search engines (Bing, Yandex, etc.) about new/updated content instantly
 * 
 * POST /api/indexnow
 * Body: { urls: string[] }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'

const SITE_URL = 'https://kojomoney.com'

// IndexNow requires an API key - we'll use a simple hash of the domain
// In production, you should generate this once and store it as env variable
const INDEX_NOW_KEY = process.env.INDEXNOW_KEY || 'kojomoney-indexnow-key'

// IndexNow endpoints for different search engines
const INDEX_NOW_ENDPOINTS = [
    'https://api.indexnow.org/indexnow',      // Bing, DuckDuckGo, etc.
    'https://yandex.com/indexnow/indexnow',   // Yandex
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { urls } = req.body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'No URLs provided' })
    }

    // Normalize URLs
    const fullUrls = urls.map(url =>
        url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
    )

    const results: { endpoint: string; success: boolean; error?: string }[] = []

    // Submit to each IndexNow endpoint
    for (const endpoint of INDEX_NOW_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    host: new URL(SITE_URL).hostname,
                    key: INDEX_NOW_KEY,
                    keyLocation: `${SITE_URL}/${INDEX_NOW_KEY}.txt`,
                    urlList: fullUrls
                })
            })

            results.push({
                endpoint,
                success: response.ok || response.status === 200 || response.status === 202,
                error: response.ok ? undefined : `Status: ${response.status}`
            })
        } catch (error: any) {
            results.push({
                endpoint,
                success: false,
                error: error.message
            })
        }
    }

    const allSuccess = results.every(r => r.success)
    const someSuccess = results.some(r => r.success)

    return res.status(someSuccess ? 200 : 500).json({
        success: someSuccess,
        message: allSuccess
            ? 'All search engines notified successfully'
            : someSuccess
                ? 'Some search engines notified'
                : 'Failed to notify search engines',
        results,
        urlsSubmitted: fullUrls.length
    })
}

export default requireAdmin(handler, 'editor')
