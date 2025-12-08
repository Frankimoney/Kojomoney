import { useState, useEffect } from 'react'
import AdminDashboard from '@/components/AdminDashboard'
import AdminLogin, { checkAdminSession } from '@/components/AdminLogin'
import Head from 'next/head'

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing session
        const hasSession = checkAdminSession()
        setIsAuthenticated(hasSession)
        setIsLoading(false)
    }, [])

    const handleLogout = () => {
        setIsAuthenticated(false)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <>
                <Head>
                    <title>Admin Login - KojoMoney</title>
                    <meta name="robots" content="noindex, nofollow" />
                </Head>
                <AdminLogin onLogin={() => setIsAuthenticated(true)} />
            </>
        )
    }

    return (
        <>
            <Head>
                <title>Admin Dashboard - KojoMoney</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <AdminDashboard onLogout={handleLogout} />
        </>
    )
}
