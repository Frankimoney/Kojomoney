import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
    id: string
    title: string
    body: string
    timestamp: number
    isRead: boolean
    type?: 'info' | 'success' | 'warning' | 'error' | 'reward' | 'system'
    data?: any
    actionUrl?: string
}

interface NotificationState {
    notifications: Notification[]
    unreadCount: number
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    removeNotification: (id: string) => void
    clearAll: () => void
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            unreadCount: 0,

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

            clearAll: () => set({ notifications: [], unreadCount: 0 })
        }),
        {
            name: 'notification-storage',
        }
    )
)
