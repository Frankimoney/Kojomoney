import { useEffect, useRef } from 'react';
import { User } from '@/types';
import { useNotificationStore } from '@/lib/notificationStore';
import { toast } from 'sonner';
import { FloatingNotifications } from '@/components/notifications/FloatingNotification';
import { getStreakMultiplier, getNextStreakTier } from '@/lib/points-config';
import { apiCall } from '@/lib/api-client';
import { getGreeting, getLocalHour, getLocalDateString, getUserTimezone } from '@/lib/timezone';

export function useEngagementNotifications(user: User | null) {
    const { addNotification } = useNotificationStore();
    const processedRef = useRef<{ [key: string]: boolean }>({});
    const hasShownSpinReminder = useRef(false);

    // 1. Daily Reset Check
    useEffect(() => {
        if (!user) return;

        const checkDailyReset = () => {
            // Use user's timezone for date check
            const userTimezone = user.timezone || getUserTimezone();
            const today = getLocalDateString(userTimezone);
            const lastCheck = localStorage.getItem('last_daily_reset_check');

            if (lastCheck !== today) {
                // It's a new day for the user
                addNotification({
                    title: 'Daily Tasks Reset! ☀️',
                    body: 'Your daily tasks have been reset. Complete them to maintain your streak!',
                    type: 'info',
                    actionUrl: '/?tab=earn'
                });

                // Show floating notification with timezone-aware greeting
                const greeting = getGreeting(userTimezone);
                FloatingNotifications.reward(
                    greeting,
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

        // Check if user has actually spun today
        const checkSpinStatus = async () => {
            try {
                // Skip if we checked recently to avoid spamming APIS
                const res = await apiCall(`/api/spin/status?userId=${user.id}`);
                const data = await res.json();

                if (data.canSpin && !hasShownSpinReminder.current) {
                    FloatingNotifications.spinReady(() => {
                        window.dispatchEvent(new CustomEvent('open-spin'));
                    });
                    hasShownSpinReminder.current = true;
                }
            } catch (e) {
                console.error('Failed to check spin status for notification', e);
            }
        };

        // Delay slightly to allow app to load
        const timer = setTimeout(checkSpinStatus, 4000);

        return () => clearTimeout(timer);
    }, [user?.id]);

    // 3. Streak Celebration
    useEffect(() => {
        if (!user || !user.dailyStreak) return;

        const { multiplier, tier } = getStreakMultiplier(user.dailyStreak || 0);

        // Only celebrate at exact milestone days (3, 7, 14, 30)
        if (tier.minDays === user.dailyStreak && user.dailyStreak >= 3) {
            // Check if we already celebrated this specific milestone today
            const celebrationKey = `streak_milestone_${user.dailyStreak}_${user.lastActiveDate}`;
            const alreadyCelebrated = localStorage.getItem(celebrationKey);

            if (!alreadyCelebrated) {
                FloatingNotifications.streak(user.dailyStreak);
                localStorage.setItem(celebrationKey, 'true');

                // Clean up old celebration keys (keep only last 5)
                const keys = Object.keys(localStorage).filter(k => k.startsWith('streak_milestone_'));
                if (keys.length > 5) {
                    keys.sort().slice(0, keys.length - 5).forEach(k => localStorage.removeItem(k));
                }
            }
        }
    }, [user?.dailyStreak, user?.lastActiveDate]);

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
                    actionUrl: '/?tab=earn',
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
                    actionUrl: '/?tab=earn'
                });
            }

        }, 120000); // Check every 2 minutes

        return () => clearInterval(checkOpportunities);
    }, [user?.id, addNotification]);

    // 5. Streak at Risk Warning (if no activity by late afternoon)
    useEffect(() => {
        if (!user) return;

        const checkStreakRisk = () => {
            // Use user's timezone for time check
            const userTimezone = user.timezone || getUserTimezone();
            const hour = getLocalHour(userTimezone);
            const hasDoneTrivia = user.todayProgress?.triviaCompleted;
            const key = `streak_warning_${getLocalDateString(userTimezone)}`;

            // If it's after 6pm in user's local time and no trivia done, warn about streak
            if (hour >= 18 && !hasDoneTrivia && !processedRef.current[key] && user.dailyStreak >= 2) {
                FloatingNotifications.warning(
                    "🔥 Don't Lose Your Streak!",
                    `You have a ${user.dailyStreak}-day streak. Complete trivia to keep it!`
                );

                addNotification({
                    title: "Don't lose your streak! 🔥",
                    body: `You haven't played today's trivia yet. Your ${user.dailyStreak}-day streak is at risk.`,
                    type: 'warning',
                    actionUrl: '/?view=trivia'
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

