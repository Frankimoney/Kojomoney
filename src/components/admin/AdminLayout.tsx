import { ReactNode, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Shield, RefreshCw, LogOut, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { logoutAdmin, getAdminEmail } from '@/components/AdminLogin'

interface AdminLayoutProps {
    children: ReactNode
    title?: string
    subtitle?: string
    actions?: ReactNode
    showRefresh?: boolean
    onRefresh?: () => void
    isLoading?: boolean
    error?: string | null
    success?: string | null
    onClearError?: () => void
    onClearSuccess?: () => void
}

export default function AdminLayout({
    children,
    title = 'Admin Dashboard',
    subtitle = 'KojoMoney Management',
    actions,
    showRefresh = false,
    onRefresh,
    isLoading = false,
    error,
    success,
    onClearError,
    onClearSuccess
}: AdminLayoutProps) {
    const [adminEmail, setAdminEmail] = useState<string | null>(null)

    useEffect(() => {
        setAdminEmail(getAdminEmail())
    }, [])

    const handleLogout = () => {
        logoutAdmin()
        window.location.reload()
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-zinc-950 border-b dark:border-zinc-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold dark:text-white">{title}</h1>
                            <p className="text-xs text-muted-foreground">{subtitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {adminEmail && (
                            <span className="text-xs text-muted-foreground hidden md:block">
                                {adminEmail}
                            </span>
                        )}

                        <ThemeToggle />

                        {showRefresh && onRefresh && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRefresh}
                                className="h-9 w-9 sm:h-9 sm:w-auto p-0 sm:px-3"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline ml-2">Refresh</span>
                            </Button>
                        )}

                        {actions}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-9 w-9 sm:h-9 sm:w-auto p-0 sm:px-3"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">Logout</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Alerts */}
            <div className="max-w-7xl mx-auto px-4">
                {error && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                        {onClearError && (
                            <Button variant="ghost" size="sm" onClick={onClearError} className="ml-auto hover:bg-red-100 dark:hover:bg-red-900/40">×</Button>
                        )}
                    </div>
                )}
                {success && (
                    <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                        {onClearSuccess && (
                            <Button variant="ghost" size="sm" onClick={onClearSuccess} className="ml-auto hover:bg-green-100 dark:hover:bg-green-900/40">×</Button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    )
}
