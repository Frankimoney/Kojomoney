import type { NextApiRequest, NextApiResponse } from 'next'

// Simple health-check API to verify that Next API routes are active on the server.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || null, time: new Date().toISOString() })
}
