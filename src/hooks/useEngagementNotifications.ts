import { useEffect, useRef } from 'react';
import { User } from '@/types';
import { useNotificationStore } from '@/lib/notificationStore';
import { toast } from 'sonner';

export function useEngagementNotifications(user: User | null) {
    const { addNotification } = useNotificationStore();
    const processedRef = useRef<{ [key: string]: boolean }>({});

    // 1. Daily Reset Check
    useEffect(() => {
        if (!user) return;

        const checkDailyReset = () => {
            const today = new Date().toISOString().split('T')[0];
            const lastCheck = localStorage.getItem('last_daily_reset_check');

            if (lastCheck !== today) {
                // It's a new day for the user
                addNotification({
                    title: 'Daily Tasks Reset! ☀️',
                    body: 'Your daily tasks have been reset. Complete them to maintain your streak!',
                    type: 'info',
                    actionUrl: '/earn'
                });

                // If checking for the first time today, show a toast
                toast.info('Daily Tasks Reset!', {
                    description: 'Start earning points now.'
                });

                localStorage.setItem('last_daily_reset_check', today);
            }
        };

        checkDailyReset();
    }, [user?.id, addNotification]);

    // 2. Survey/Offer Availability Simulator (or Real Check)
    useEffect(() => {
        if (!user) return;

        // Mock check for new opportunities every 2 minutes
        // In a real app, this would poll an endpoint or listen to a socket
        const checkOpportunities = setInterval(() => {
            const random = Math.random();
            const key = `opp_${Date.now()}`;

            // 5% chance of a new survey every interval
            if (random > 0.95) {
                addNotification({
                    title: 'New Survey Available! 📋',
                    body: 'A high-paying survey just became available. Take it before it expires!',
                    type: 'reward',
                    actionUrl: '/earn/surveys',
                    data: { points: 500 }
                });
                toast.success('New Survey Available! (+500 pts)');
            }

            // 5% chance of a special offer
            else if (random < 0.05) {
                addNotification({
                    title: 'Boosted Offer Detected 🚀',
                    body: 'One of our partners boosted their rewards. Check the offerwall now.',
                    type: 'reward',
                    actionUrl: '/earn/offerwall'
                });
                toast.success('New Boosted Offer!');
            }

        }, 120000); // Check every 2 minutes

        return () => clearInterval(checkOpportunities);
    }, [user?.id, addNotification]);

    // 3. Streak Reminder
    useEffect(() => {
        if (!user) return;

        // If user hasn't completed trivia today, remind them
        const hasDoneTrivia = user.todayProgress?.triviaCompleted;
        const key = `trivia_remind_${new Date().toISOString().split('T')[0]}`;

        if (!hasDoneTrivia && !processedRef.current[key]) {
            // Only remind if it's "later" in the day? 
            // For now, just remind once per session if not done.
            // We use a timeout to not annoy immediately on load
            const timer = setTimeout(() => {
                if (!processedRef.current[key]) {
                    addNotification({
                        title: 'Don\'t lose your streak! 🔥',
                        body: 'You haven\'t played today\'s trivia yet. Complete it to keep your streak alive.',
                        type: 'warning',
                        actionUrl: '/earn/trivia'
                    });
                    processedRef.current[key] = true;
                }
            }, 60000); // 1 minute after load

            return () => clearTimeout(timer);
        }
    }, [user, addNotification]);
}
