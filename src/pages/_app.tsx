import '@/app/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        // Handle Android back button
        if (Capacitor.isNativePlatform()) {
            const handleBackButton = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                    window.history.back()
                } else {
                    // At root, exit the app
                    CapacitorApp.exitApp()
                }
            })

            return () => {
                handleBackButton.then(listener => listener.remove())
            }
        }
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
