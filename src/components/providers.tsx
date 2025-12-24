'use client'

import { AppThemeProvider } from "./theme-provider"
import { useEffect } from "react"
import AdService from "@/services/adService"

function AdInitializer({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Initialize ads when app starts
        AdService.initialize().catch(err => {
            console.error('[AdInitializer] Failed to initialize ads:', err)
        })
    }, [])

    return <>{children}</>
}

export function RootProviders({ children }: { children: React.ReactNode }) {
    return (
        <AppThemeProvider>
            <AdInitializer>
                {children}
            </AdInitializer>
        </AppThemeProvider>
    )
}
