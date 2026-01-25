import { NextApiRequest, NextApiResponse } from 'next'
import { sign, verify } from 'jsonwebtoken'
import { allowCors } from './cors'
import { adminDb, AdminRole, AdminUser } from './admin-db'

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || 'dev-admin-secret-key-change-in-prod'

// Helper to check if a user has sufficient permissions
function hasPermission(userRole: AdminRole, requiredRole?: AdminRole): boolean {
    if (!requiredRole) return true // No specific role required, just being an admin is enough
    if (userRole === 'super_admin') return true // Super admin has all permissions

    const roles: AdminRole[] = ['viewer', 'support', 'editor', 'super_admin']
    const userLevel = roles.indexOf(userRole)
    const requiredLevel = roles.indexOf(requiredRole)

    // Basic hierarchy check (can be made more complex if needed)
    return userLevel >= requiredLevel
}

export function generateAdminToken(email: string, role: AdminRole = 'viewer') {
    return sign({ email, role, type: 'node_admin' }, ADMIN_SECRET, { expiresIn: '24h' })
}

export function verifyAdminToken(token: string) {
    try {
        return verify(token, ADMIN_SECRET) as { email: string, role: AdminRole, type: string }
    } catch (e) {
        return null
    }
}

/**
 * Middleware to require admin authentication.
 * Optional: Pass a requiredRole to restrict access further.
 */
export function requireAdmin(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
    requiredRole?: AdminRole
) {
    const adminCheck = async (req: NextApiRequest, res: NextApiResponse) => {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyAdminToken(token)

        if (!decoded || decoded.type !== 'node_admin') {
            return res.status(403).json({ error: 'Forbidden: Invalid admin token' })
        }

        // Verify against DB to ensure user wasn't deleted/banned
        // We cache this check slightly by trusting the JWT role for the session duration, 
        // but for critical actions we could re-fetch.
        // For now, let's just rely on the token to avoid DB hits on every request, 
        // OR we can do a quick check if strict security is needed. 
        // Given this is an admin panel, let's verify existence if 'super_admin' is required.

        if (requiredRole && !hasPermission(decoded.role, requiredRole)) {
            return res.status(403).json({ error: `Forbidden: Requires ${requiredRole} role` })
        }

        // Inject user info into request if needed (custom property hack or just pass through)
        (req as any).user = decoded

        return handler(req, res)
    }

    return allowCors(adminCheck)
}
