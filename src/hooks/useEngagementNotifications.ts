import { useEffect, useRef } from 'react';
import { User } from '@/types';
import { useNotificationStore } from '@/lib/notificationStore';
import { toast } from 'sonner';
import { FloatingNotifications } from '@/components/notifications/FloatingNotification';
import { getStreakMultiplier, getNextStreakTier } from '@/lib/points-config';

export function useEngagementNotifications(user: User | null) {
    const { addNotification } = useNotificationStore();
    const processedRef = useRef<{ [key: string]: boolean }>({});
    const hasShownSpinReminder = useRef(false);

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

                // Show floating notification for better visibility
                FloatingNotifications.reward(
                    'Good Morning! ☀️',
                    'Daily tasks reset. Time to earn!',
                    { label: 'Start Earning', onClick: () => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'earn' })) }
                );

                localStorage.setItem('last_daily_reset_check', today);
            }
        };

        checkDailyReset();
    }, [user?.id, addNotification]);

    // 2. Spin Reminder - Show once per session if spin available
    useEffect(() => {
        if (!user || hasShownSpinReminder.current) return;

        // Check if user hasn't spun today (would need backend data for this)
        // For now, show reminder after 5 seconds on startup
        const timer = setTimeout(() => {
            if (!hasShownSpinReminder.current) {
                FloatingNotifications.spinReady(() => {
                    window.dispatchEvent(new CustomEvent('open-spin'));
                });
                hasShownSpinReminder.current = true;
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [user?.id]);

    // 3. Streak Celebration
    useEffect(() => {
        if (!user) return;

        const streakKey = `streak_celebrated_${user.dailyStreak}`;
        const { multiplier, tier } = getStreakMultiplier(user.dailyStreak || 0);

        // Celebrate when reaching new streak milestones
        if (user.dailyStreak >= 3 && !processedRef.current[streakKey]) {
            const nextTier = getNextStreakTier(user.dailyStreak || 0);

            if (tier.minDays === user.dailyStreak) {
                // User just hit a milestone
                FloatingNotifications.streak(user.dailyStreak);
            }

            processedRef.current[streakKey] = true;
        }
    }, [user?.dailyStreak]);

    // 4. Survey/Offer Availability Simulator
    useEffect(() => {
        if (!user) return;

        const checkOpportunities = setInterval(() => {
            const random = Math.random();

            // 3% chance of a new survey every 2 minutes
            if (random > 0.97) {
                addNotification({
                    title: 'New Survey Available! 📋',
                    body: 'A high-paying survey just became available.',
                    type: 'reward',
                    actionUrl: '/earn/surveys',
                    data: { points: 500 }
                });

                FloatingNotifications.reward(
                    '💰 New Survey!',
                    'Earn 500+ points in 5 minutes',
                    { label: 'Take Survey', onClick: () => { } }
                );
            }

            // 2% chance of a special offer
            else if (random < 0.02) {
                addNotification({
                    title: 'Boosted Offer! 🚀',
                    body: 'One of our partners boosted their rewards.',
                    type: 'reward',
                    actionUrl: '/earn/offerwall'
                });
            }

        }, 120000); // Check every 2 minutes

        return () => clearInterval(checkOpportunities);
    }, [user?.id, addNotification]);

    // 5. Streak at Risk Warning (if no activity by late afternoon)
    useEffect(() => {
        if (!user) return;

        const checkStreakRisk = () => {
            const hour = new Date().getHours();
            const hasDoneTrivia = user.todayProgress?.triviaCompleted;
            const key = `streak_warning_${new Date().toISOString().split('T')[0]}`;

            // If it's after 6pm and no trivia done, warn about streak
            if (hour >= 18 && !hasDoneTrivia && !processedRef.current[key] && user.dailyStreak >= 2) {
                FloatingNotifications.warning(
                    "🔥 Don't Lose Your Streak!",
                    `You have a ${user.dailyStreak}-day streak. Complete trivia to keep it!`
                );

                addNotification({
                    title: "Don't lose your streak! 🔥",
                    body: `You haven't played today's trivia yet. Your ${user.dailyStreak}-day streak is at risk.`,
                    type: 'warning',
                    actionUrl: '/earn/trivia'
                });

                processedRef.current[key] = true;
            }
        };

        // Check immediately and then every 30 minutes
        checkStreakRisk();
        const interval = setInterval(checkStreakRisk, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user, addNotification]);
}

