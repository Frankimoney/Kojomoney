import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiCall } from '@/lib/api-client'

export interface Notification {
    id: string
    title: string
    body: string
    timestamp: number
    isRead: boolean
    type?: 'info' | 'success' | 'warning' | 'error' | 'reward' | 'system' | 'broadcast'
    data?: any
    actionUrl?: string
    // Firestore fields
    createdAt?: number
    firestoreId?: string
}

interface NotificationState {
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean
    lastSync: number | null
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    removeNotification: (id: string) => void
    clearAll: () => void
    syncFromServer: (userId: string) => Promise<void>
    markAsReadOnServer: (userId: string, notificationIds?: string[]) => Promise<void>
    clearAllOnServer: (userId: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            lastSync: null,

            addNotification: (notification) => set((state) => {
                const newNotification: Notification = {
                    ...notification,
                    id: Math.random().toString(36).substring(7),
                    timestamp: Date.now(),
                    isRead: false,
                }
                return {
                    notifications: [newNotification, ...state.notifications],
                    unreadCount: state.unreadCount + 1
                }
            }),

            markAsRead: (id) => set((state) => {
                const notification = state.notifications.find(n => n.id === id)
                if (notification && !notification.isRead) {
                    return {
                        notifications: state.notifications.map(n =>
                            n.id === id ? { ...n, isRead: true } : n
                        ),
                        unreadCount: Math.max(0, state.unreadCount - 1)
                    }
                }
                return state
            }),

            markAllAsRead: () => set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true })),
                unreadCount: 0
            })),

            removeNotification: (id) => set((state) => {
                const notification = state.notifications.find(n => n.id === id)
                return {
                    notifications: state.notifications.filter(n => n.id !== id),
                    unreadCount: notification && !notification.isRead
                        ? Math.max(0, state.unreadCount - 1)
                        : state.unreadCount
                }
            }),

            clearAll: () => set({ notifications: [], unreadCount: 0 }),

            // Sync notifications from Firestore
            syncFromServer: async (userId: string) => {
                if (!userId) {
                    // User not logged in - silently skip sync
                    return
                }

                set({ isLoading: true })

                try {
                    const response = await apiCall(`/api/notifications?userId=${userId}`)

                    if (response.ok) {
                        const data = await response.json()
                        const serverNotifications: Notification[] = (data.notifications || []).map((n: any) => ({
                            id: n.id,
                            firestoreId: n.id,
                            title: n.title,
                            body: n.body,
                            timestamp: n.createdAt || Date.now(),
                            createdAt: n.createdAt,
                            isRead: n.isRead || false,
                            type: n.type || 'info',
                            data: n.data,
                            actionUrl: n.actionUrl,
                        }))

                        // Merge with local notifications (avoid duplicates)
                        const localNotifications = get().notifications.filter(
                            local => !local.firestoreId // Keep only purely local notifications
                        )

                        // Combine and sort by timestamp
                        const merged = [...serverNotifications, ...localNotifications]
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .slice(0, 100) // Keep max 100 notifications

                        const unreadCount = merged.filter(n => !n.isRead).length

                        set({
                            notifications: merged,
                            unreadCount,
                            lastSync: Date.now(),
                            isLoading: false
                        })

                        console.log(`[NotificationStore] Synced ${serverNotifications.length} notifications from server`)
                    } else {
                        // Don't spam console for expected errors when user data doesn't exist yet
                        const text = await response.text()
                        if (!text.includes('not found')) {
                            console.warn('[NotificationStore] Sync issue:', text)
                        }
                        set({ isLoading: false })
                    }
                } catch (error) {
                    // Silent fail - notifications are not critical
                    console.warn('[NotificationStore] Sync skipped:', error)
                    set({ isLoading: false })
                }
            },

            // Mark notifications as read on server
            markAsReadOnServer: async (userId: string, notificationIds?: string[]) => {
                if (!userId) return

                try {
                    const firestoreIds = notificationIds
                        ? get().notifications
                            .filter(n => notificationIds.includes(n.id) && n.firestoreId)
                            .map(n => n.firestoreId)
                        : undefined

                    await apiCall('/api/notifications', {
                        method: 'PATCH',
                        body: JSON.stringify({
                            userId,
                            notificationIds: firestoreIds,
                            markAll: !notificationIds
                        })
                    })
                } catch (error) {
                    console.error('[NotificationStore] Failed to mark as read on server:', error)
                }
            },

            // Clear all notifications on server
            clearAllOnServer: async (userId: string) => {
                if (!userId) return

                try {
                    await apiCall(`/api/notifications?userId=${userId}`, {
                        method: 'DELETE'
                    })
                } catch (error) {
                    console.error('[NotificationStore] Failed to clear on server:', error)
                }
            }
        }),
        {
            name: 'notification-storage',
        }
    )
)
