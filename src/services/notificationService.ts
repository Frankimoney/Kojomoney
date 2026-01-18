/**
 * NotificationService - Safe FCM initialization for Transsion ROMs (Tecno/Infinix)
 * 
 * CRITICAL: Firebase Messaging must NOT be imported at module level!
 * Dynamic import is used to prevent early permission checks that crash on 
 * Transsion devices running Android 15 with null permission states.
 */

import { Capacitor } from '@capacitor/core';
import { useNotificationStore } from '@/lib/notificationStore';
import { toast } from 'sonner';
import { apiCall } from '@/lib/api-client';

// Type definition for dynamic import
type FirebaseMessagingType = typeof import('@capacitor-firebase/messaging').FirebaseMessaging;

class NotificationService {
    private static instance: NotificationService;
    private initialized = false;
    private FirebaseMessaging: FirebaseMessagingType | null = null;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Dynamically import Firebase Messaging to prevent early initialization crashes
     * This MUST be called only after user login on Transsion ROMs
     */
    private async loadFirebaseMessaging(): Promise<FirebaseMessagingType | null> {
        if (this.FirebaseMessaging) {
            return this.FirebaseMessaging;
        }

        try {
            console.log('[NotificationService] Dynamically importing Firebase Messaging...');
            const module = await import('@capacitor-firebase/messaging');
            this.FirebaseMessaging = module.FirebaseMessaging;
            console.log('[NotificationService] Firebase Messaging loaded successfully');
            return this.FirebaseMessaging;
        } catch (error) {
            console.error('[NotificationService] Failed to load Firebase Messaging:', error);
            return null;
        }
    }

    /**
     * Initialize notification service - ONLY call after user login!
     * This delays FCM initialization to prevent crashes on Transsion ROMs
     */
    public async init() {
        if (this.initialized) {
            console.log('[NotificationService] Already initialized, skipping');
            return;
        }

        // Only initialize on native platform
        if (!Capacitor.isNativePlatform()) {
            console.log('[NotificationService] Not native platform, skipping initialization');
            return;
        }

        try {
            console.log('[NotificationService] Starting delayed initialization...');

            // Step 1: Dynamically load Firebase Messaging
            const messaging = await this.loadFirebaseMessaging();
            if (!messaging) {
                console.warn('[NotificationService] Could not load Firebase Messaging, aborting');
                return;
            }

            // Step 2: Check and request permissions with full error handling
            await this.checkPermissions(messaging);

            // Step 3: Add listeners for notifications
            await this.addListeners(messaging);

            this.initialized = true;
            console.log('[NotificationService] Initialization complete');
        } catch (error) {
            console.error('[NotificationService] Failed to initialize:', error);
            // Don't throw - fail gracefully to prevent app crash
        }
    }

    private async checkPermissions(messaging: FirebaseMessagingType) {
        console.log('[NotificationService] Checking permissions...');

        try {
            // Wrap in try-catch for Transsion ROM compatibility
            // These devices may return null for permission states
            let permissionResult;

            try {
                permissionResult = await messaging.checkPermissions();
                console.log('[NotificationService] Permission result:', permissionResult);
            } catch (permCheckError) {
                console.warn('[NotificationService] Permission check failed (ROM issue):', permCheckError);
                // On Transsion ROMs, skip permission check and try to register anyway
                // The user will see the permission dialog when we request
                try {
                    await this.requestAndRegister(messaging);
                } catch (e) {
                    console.warn('[NotificationService] Fallback registration failed:', e);
                }
                return;
            }

            // Null-safe permission check
            const receive = permissionResult?.receive;
            console.log('[NotificationService] Receive permission:', receive);

            if (!receive || receive !== 'granted') {
                // Request permission
                await this.requestAndRegister(messaging);
            } else {
                // Already granted, just register
                await this.register(messaging);
            }
        } catch (error) {
            console.error('[NotificationService] Error in permission flow:', error);
            // Don't throw - fail gracefully
        }
    }

    private async requestAndRegister(messaging: FirebaseMessagingType) {
        try {
            console.log('[NotificationService] Requesting permissions...');
            const result = await messaging.requestPermissions();
            console.log('[NotificationService] Permission request result:', result);

            // Null-safe result check
            if (result?.receive === 'granted') {
                await this.register(messaging);
            } else {
                console.log('[NotificationService] Permission not granted:', result?.receive);
            }
        } catch (requestError) {
            console.warn('[NotificationService] Permission request failed:', requestError);
            // Still try to register - some devices grant permission silently
            try {
                await this.register(messaging);
            } catch (e) {
                console.warn('[NotificationService] Silent registration failed:', e);
            }
        }
    }

    private async register(messaging: FirebaseMessagingType) {
        console.log('[NotificationService] Registering for push notifications...');

        try {
            const tokenResult = await messaging.getToken();
            const token = tokenResult?.token;

            if (!token) {
                console.warn('[NotificationService] No token received');
                return;
            }

            console.log('[NotificationService] Push Token:', token?.substring(0, 30) + '...');

            // Get userId from localStorage
            const savedUser = localStorage.getItem('kojomoneyUser');
            const userId = savedUser ? JSON.parse(savedUser)?.id : null;

            if (userId && token) {
                // Register token with backend
                const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

                try {
                    const response = await apiCall('/api/notifications/register', {
                        method: 'POST',
                        body: JSON.stringify({ userId, token, platform })
                    });

                    if (response.ok) {
                        console.log('[NotificationService] Token registered with backend');
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('[NotificationService] Backend registration failed:', errorData);
                    }
                } catch (apiError) {
                    console.error('[NotificationService] API error:', apiError);
                }
            } else {
                console.warn('[NotificationService] Missing userId or token', { userId: !!userId, token: !!token });
            }
        } catch (error) {
            console.error('[NotificationService] Error registering:', error);
        }
    }

    private async addListeners(messaging: FirebaseMessagingType) {
        console.log('[NotificationService] Adding notification listeners...');

        try {
            await messaging.removeAllListeners();

            await messaging.addListener('notificationReceived', (payload) => {
                console.log('[NotificationService] Notification received:', payload);

                const { notification } = payload;

                // Add to store
                useNotificationStore.getState().addNotification({
                    title: notification?.title || 'New Notification',
                    body: notification?.body || '',
                    type: 'info',
                    data: notification?.data
                });

                // Show toast if app is in foreground
                toast(notification?.title || 'New Notification', {
                    description: notification?.body,
                    action: {
                        label: 'View',
                        onClick: () => {
                            window.dispatchEvent(new CustomEvent('open-notifications'));
                        }
                    }
                });
            });

            await messaging.addListener('notificationActionPerformed', (payload) => {
                console.log('[NotificationService] Notification action:', payload);
                const { notification } = payload;

                // Handle deep linking
                if ((notification?.data as any)?.url) {
                    // navigate((notification.data as any).url)
                }

                // Open notification center
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-notifications'));
                }, 500);
            });

            console.log('[NotificationService] Listeners added');
        } catch (error) {
            console.error('[NotificationService] Error adding listeners:', error);
        }
    }

    public async getDeliveredNotifications() {
        if (!Capacitor.isNativePlatform() || !this.FirebaseMessaging) {
            return { notifications: [] };
        }

        try {
            return await this.FirebaseMessaging.getDeliveredNotifications();
        } catch (error) {
            console.error('[NotificationService] Error getting delivered notifications:', error);
            return { notifications: [] };
        }
    }

    public async removeDeliveredNotifications(ids: string[]) {
        if (!Capacitor.isNativePlatform() || !this.FirebaseMessaging) {
            return;
        }

        try {
            // Note: Verify API signature for removeDeliveredNotifications in your version
            // await this.FirebaseMessaging.removeDeliveredNotifications({ ids });
        } catch (error) {
            console.error('[NotificationService] Error removing notifications:', error);
        }
    }
}

export default NotificationService.getInstance();
