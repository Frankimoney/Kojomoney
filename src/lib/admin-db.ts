import { db } from './firebase-admin'
import crypto from 'crypto'

export type AdminRole = 'super_admin' | 'editor' | 'support' | 'viewer'
export type AdminStatus = 'active' | 'pending'

export interface AdminUser {
    email: string
    role: AdminRole
    name?: string
    avatar?: string
    addedBy?: string
    createdAt: number
    lastLogin?: number
    // Secure invite fields
    passwordHash?: string
    inviteToken?: string
    inviteExpiresAt?: number
    status: AdminStatus
}

const COLLECTION = 'admins'

// Environment fallback emails
const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Helper to ensure db is available
function getDb() {
    if (!db) throw new Error('Database not initialized')
    return db
}

export const adminDb = {
    /**
     * Get an admin by email.
     * If not found in DB but exists in ENV, auto-create as super_admin.
     */
    async getAdmin(email: string): Promise<AdminUser | null> {
        const database = getDb()
        const normalizedEmail = email.toLowerCase()
        const doc = await database.collection(COLLECTION).doc(normalizedEmail).get()

        if (doc.exists) {
            const data = doc.data() as AdminUser

            // Auto-update name & avatar for Super Admin
            if (ENV_ADMIN_EMAILS.includes(normalizedEmail)) {
                const updates: any = {}
                let changed = false

                if (data.name === 'System Admin' || data.name === 'System User' || !data.name) {
                    updates.name = 'Thomas Francis'
                    data.name = 'Thomas Francis'
                    changed = true
                }
                if (!data.avatar) {
                    updates.avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas' // Default avatar
                    data.avatar = updates.avatar
                    changed = true
                }

                if (changed) {
                    await database.collection(COLLECTION).doc(normalizedEmail).update(updates)
                }
            }

            return data
        }

        // Bootstrap: If not in DB but in ENV, create as Super Admin
        if (ENV_ADMIN_EMAILS.includes(normalizedEmail)) {
            console.log(`[RBAC] Bootstrapping super_admin: ${normalizedEmail}`)
            const newAdmin: AdminUser = {
                email: normalizedEmail,
                role: 'super_admin',
                name: 'Thomas Francis',
                addedBy: 'system',
                createdAt: Date.now(),
                status: 'active' // Bootstrapped admins are active immediately
            }
            await database.collection(COLLECTION).doc(normalizedEmail).set(newAdmin)
            return newAdmin
        }

        return null
    },

    /**
     * Create or invite a new admin with a pending invite token
     */
    async createAdmin(
        email: string,
        role: AdminRole,
        addedBy: string,
        name?: string
    ): Promise<{ inviteToken: string }> {
        const database = getDb()
        const normalizedEmail = email.toLowerCase()

        // Generate secure invite token (32 bytes = 64 hex chars)
        const inviteToken = crypto.randomBytes(32).toString('hex')

        // Token expires in 7 days
        const inviteExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

        const newAdmin: AdminUser = {
            email: normalizedEmail,
            role,
            name: name || email.split('@')[0],
            addedBy,
            createdAt: Date.now(),
            status: 'pending',
            inviteToken,
            inviteExpiresAt
        }

        await database.collection(COLLECTION).doc(normalizedEmail).set(newAdmin)

        return { inviteToken }
    },

    /**
     * Accept invite and set password
     */
    async acceptInvite(
        token: string,
        passwordHash: string
    ): Promise<{ success: boolean; email?: string; error?: string }> {
        const database = getDb()

        // Find admin by invite token
        const snapshot = await database.collection(COLLECTION)
            .where('inviteToken', '==', token)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return { success: false, error: 'Invalid or expired invite token' }
        }

        const doc = snapshot.docs[0]
        const admin = doc.data() as AdminUser

        // Check if token is expired
        if (admin.inviteExpiresAt && admin.inviteExpiresAt < Date.now()) {
            return { success: false, error: 'Invite token has expired' }
        }

        // Update admin: set password, clear token, activate
        await database.collection(COLLECTION).doc(doc.id).update({
            passwordHash,
            status: 'active',
            inviteToken: null,
            inviteExpiresAt: null
        })

        return { success: true, email: admin.email }
    },

    /**
     * Get admin by invite token (for validation)
     */
    async getAdminByToken(token: string): Promise<AdminUser | null> {
        const database = getDb()

        const snapshot = await database.collection(COLLECTION)
            .where('inviteToken', '==', token)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return null
        }

        return snapshot.docs[0].data() as AdminUser
    },

    /**
     * Remove an admin
     */
    async deleteAdmin(email: string): Promise<void> {
        const database = getDb()
        await database.collection(COLLECTION).doc(email.toLowerCase()).delete()
    },

    /**
     * List all admins
     */
    async listAdmins(): Promise<AdminUser[]> {
        const database = getDb()
        const snapshot = await database.collection(COLLECTION).orderBy('createdAt', 'desc').get()

        const admins = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as AdminUser

            // Auto-update name & avatar (List View)
            if (ENV_ADMIN_EMAILS.includes(data.email.toLowerCase())) {
                const updates: any = {}
                let changed = false

                if (data.name === 'System Admin' || data.name === 'System User' || !data.name) {
                    updates.name = 'Thomas Francis'
                    data.name = 'Thomas Francis'
                    changed = true
                }
                if (!data.avatar) {
                    updates.avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas'
                    data.avatar = updates.avatar
                    changed = true
                }

                if (changed) {
                    await doc.ref.update(updates)
                }
            }
            return data
        }))

        return admins
    },

    /**
     * Update last login time
     */
    async recordLogin(email: string): Promise<void> {
        const database = getDb()
        await database.collection(COLLECTION).doc(email.toLowerCase()).update({
            lastLogin: Date.now()
        })
    },

    /**
     * Update admin password hash
     */
    async updatePassword(email: string, passwordHash: string): Promise<void> {
        const database = getDb()
        await database.collection(COLLECTION).doc(email.toLowerCase()).update({
            passwordHash
        })
    }
}
