import '@/app/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'

// Helper function to show toast notification
function showExitToast(message: string) {
    // Remove any existing toast
    const existingToast = document.getElementById('exit-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'exit-toast';
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 99999;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        let lastBackPress = 0;
        const EXIT_DELAY = 2000; // 2 seconds window for double-tap

        const setupBackHandler = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');

                // Only set up on native platforms
                if (!Capacitor.isNativePlatform()) return;

                const { App: CapacitorApp } = await import('@capacitor/app');

                // Remove any existing listeners first
                await CapacitorApp.removeAllListeners();

                await CapacitorApp.addListener('backButton', async () => {
                    const currentPath = window.location.pathname;
                    const rootPaths = ['/', '/login', '/auth/login', '/index'];
                    const isRoot = rootPaths.includes(currentPath);

                    console.log('Back button pressed, path:', currentPath, 'isRoot:', isRoot);

                    if (!isRoot) {
                        // Not at root - navigate back
                        window.history.back();
                        return;
                    }

                    // At root - implement double-tap to exit
                    const currentTime = Date.now();

                    if (lastBackPress && (currentTime - lastBackPress) < EXIT_DELAY) {
                        // Double tap detected - exit app
                        console.log('Exiting app...');
                        await CapacitorApp.exitApp();
                    } else {
                        // First tap - show toast and wait for second tap
                        lastBackPress = currentTime;
                        showExitToast('Tap back again to exit');
                    }
                });

                console.log('Back button handler set up successfully');
            } catch (e) {
                console.log('Back button setup failed:', e);
            }
        };

        setupBackHandler();

        return () => {
            import('@capacitor/app').then(({ App }) => App.removeAllListeners());
        };
    }, [])

    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <Component {...pageProps} />
        </>
    )
}
