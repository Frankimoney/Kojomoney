'use client'

import { AppThemeProvider } from "./theme-provider"
import { useEffect, useState } from "react"
import AdService from "@/services/adService"

function AdInitializer({ children }: { children: React.ReactNode }) {
    const [adsReady, setAdsReady] = useState(false)

    useEffect(() => {
        // Function to initialize ads
        const initAds = async () => {
            console.log('[AdInitializer] Starting ad initialization...')
            try {
                const success = await AdService.initialize()
                console.log('[AdInitializer] Ad initialization result:', success)
                setAdsReady(success)
            } catch (err) {
                console.error('[AdInitializer] Failed to initialize ads:', err)
            }
        }

        // Check if Capacitor is available
        const capacitor = (window as any)?.Capacitor

        if (capacitor?.isNativePlatform?.()) {
            // On native platform, wait a bit for everything to be ready
            console.log('[AdInitializer] Native platform detected, waiting for ready state...')

            // Try to use Capacitor's ready event if available
            if (capacitor?.Plugins?.App) {
                import('@capacitor/app').then(({ App }) => {
                    App.addListener('appStateChange', () => {
                        // App state changed, ensure ads are initialized
                        if (!adsReady) {
                            initAds()
                        }
                    })
                }).catch(() => {
                    // Fallback: just init with delay
                    setTimeout(initAds, 500)
                })
            }

            // Initialize ads after a short delay to ensure Capacitor is fully ready
            setTimeout(initAds, 1000)
        } else {
            console.log('[AdInitializer] Not a native platform, skipping ad init')
        }
    }, [])

    return <>{children}</>
}

import { Toaster } from "@/components/ui/sonner"

// ... (existing code)

export function RootProviders({ children }: { children: React.ReactNode }) {
    return (
        <AppThemeProvider>
            <AdInitializer>
                {children}
            </AdInitializer>
            <Toaster />
        </AppThemeProvider>
    )
}
