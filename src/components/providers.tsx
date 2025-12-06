'use client'

import { SessionProvider } from "next-auth/react"
import { AppThemeProvider } from "./theme-provider"

export function RootProviders({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AppThemeProvider>
                {children}
            </AppThemeProvider>
        </SessionProvider>
    )
}
