
import { NextApiRequest, NextApiResponse } from 'next'
import { sign, verify } from 'jsonwebtoken'

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || 'dev-admin-secret-key-change-in-prod'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'manamongmen99@gmail.com,francistogor@gmail.com').split(',').map(e => e.trim().toLowerCase())

export function generateAdminToken(email: string) {
    return sign({ email, role: 'node_admin' }, ADMIN_SECRET, { expiresIn: '24h' })
}

export function verifyAdminToken(token: string) {
    try {
        return verify(token, ADMIN_SECRET) as { email: string, role: string }
    } catch (e) {
        return null
    }
}

export function requireAdmin(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyAdminToken(token)

        if (!decoded || decoded.role !== 'node_admin') {
            return res.status(403).json({ error: 'Forbidden: Invalid admin token' })
        }

        // Check if email is allowed
        if (!ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            return res.status(403).json({ error: 'Forbidden: Email not authorized' })
        }

        return handler(req, res)
    }
}
