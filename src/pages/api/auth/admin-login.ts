
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateAdminToken } from '@/lib/admin-auth'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const ADMIN_EMAILS = ['admin@kojomoney.com', 'owner@kojomoney.com']

import { allowCors } from '@/lib/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
    }

    // Verify credentials
    // IN PRODUCTION: Use a secure database and hashed passwords
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' })
    }

    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
        return res.status(403).json({ error: 'Unauthorized email' })
    }

    // Generate token
    const token = generateAdminToken(email)

    return res.status(200).json({
        success: true,
        token,
        user: { email, role: 'node_admin' }
    })
}

export default allowCors(handler)
