import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/router';
// import { Toast } from '@capacitor/toast'; // You might need to install this or use browser alert

export function useBackExit() {
    const router = useRouter();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let lastTimeBackPress = 0;
        const timePeriodToExit = 2000; // 2 seconds

        const setupListener = async () => {
            await App.removeAllListeners();

            await App.addListener('backButton', async ({ canGoBack }) => {
                const currentPath = window.location.pathname;
                const isRoot = currentPath === '/' || currentPath === '/login' || currentPath === '/auth/login';

                // If not at root, always go back
                if (!isRoot) {
                    window.history.back();
                    return;
                }

                // We are at root. Check for double tap.
                const currentTime = new Date().getTime();

                if (lastTimeBackPress && (currentTime - lastTimeBackPress) < timePeriodToExit) {
                    App.exitApp();
                } else {
                    lastTimeBackPress = currentTime;
                    // Show toast
                    // If @capacitor/toast is not installed, use a custom DOM element or alert
                    // For now, let's try a simple native visual cue if possible, or just expect the user to tap again.

                    // Let's create a temporary toast using DOM since we might not have the Toast plugin installed
                    showToast('Tap back again to exit');
                }
            });
        };

        setupListener();

        return () => {
            App.removeAllListeners();
        };
    }, [router.pathname]);
}

function showToast(message: string) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '50px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0,0,0,0.7)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.3s';

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
