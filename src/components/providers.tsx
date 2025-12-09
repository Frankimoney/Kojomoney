'use client'

import { AppThemeProvider } from "./theme-provider"

export function RootProviders({ children }: { children: React.ReactNode }) {
    return (
        <AppThemeProvider>
            {children}
        </AppThemeProvider>
    )
}
