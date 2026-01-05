/**
 * IndexNow Key Verification
 * This serves the IndexNow API key for search engine verification
 * 
 * Access: /api/indexnow-key or create a static file
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const INDEX_NOW_KEY = process.env.INDEXNOW_KEY || 'kojomoney-indexnow-key'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Content-Type', 'text/plain')
    res.status(200).send(INDEX_NOW_KEY)
}
