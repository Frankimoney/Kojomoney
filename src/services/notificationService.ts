
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { useNotificationStore } from '@/lib/notificationStore';
import { toast } from 'sonner';

class NotificationService {
    private static instance: NotificationService;
    private initialized = false;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    public async init() {
        if (this.initialized) return;

        try {
            await this.checkPermissions();
            await this.addListeners();
            this.initialized = true;
            console.log('NotificationService initialized');
        } catch (error) {
            console.error('Failed to initialize NotificationService:', error);
        }
    }

    private async checkPermissions() {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        try {
            const { receive } = await FirebaseMessaging.checkPermissions();

            if (receive !== 'granted') {
                const result = await FirebaseMessaging.requestPermissions();
                if (result.receive === 'granted') {
                    await this.register();
                }
            } else {
                await this.register();
            }
        } catch (error) {
            console.error('Error checking/requesting permissions:', error);
        }
    }

    private async register() {
        if (!Capacitor.isNativePlatform()) {
            console.log('Skipping push registration on web/non-native platform');
            return;
        }

        try {
            const { token } = await FirebaseMessaging.getToken();
            console.log('Push Token:', token);

            // Get userId from localStorage
            const savedUser = localStorage.getItem('kojomoneyUser');
            const userId = savedUser ? JSON.parse(savedUser)?.id : null;

            if (userId && token) {
                // Register token with backend
                const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

                const response = await fetch('/api/notifications/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, token, platform })
                });

                if (response.ok) {
                    console.log('Push token registered with backend');
                } else {
                    console.error('Failed to register push token with backend');
                }
            }
        } catch (error) {
            console.error('Error getting/registering token:', error);
        }
    }

    private async addListeners() {
        if (!Capacitor.isNativePlatform()) {
            return;
        }
        await FirebaseMessaging.removeAllListeners();

        await FirebaseMessaging.addListener('notificationReceived', (payload) => {
            console.log('Notification received:', payload);

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
                        // Create custom event to open notification center
                        window.dispatchEvent(new CustomEvent('open-notifications'));
                    }
                }
            });
        });

        await FirebaseMessaging.addListener('notificationActionPerformed', (payload) => {
            console.log('Notification action performed:', payload);
            const { notification } = payload;

            // Handle deep linking or specific actions here
            // Handle deep linking or specific actions here
            if ((notification?.data as any)?.url) {
                // navigate((notification.data as any).url)
            }

            // Open notification center
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-notifications'));
            }, 500);
        });
    }

    public async getDeliveredNotifications() {
        if (Capacitor.isNativePlatform()) {
            return await FirebaseMessaging.getDeliveredNotifications();
        }
        return { notifications: [] };
    }

    public async removeDeliveredNotifications(ids: string[]) {
        if (Capacitor.isNativePlatform()) {
            // TODO: Verify API signature for removeDeliveredNotifications in v7.4.0
            // await FirebaseMessaging.removeDeliveredNotifications({ ids });
        }
    }
}

export default NotificationService.getInstance();
