'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'

interface AdminLoginProps {
    onLogin: () => void
}

// Backend handles authentication
// const ADMIN_PASSWORD_HASH = 'admin123' 
// const ADMIN_EMAILS = [ ... ]

export default function AdminLogin({ onLogin }: AdminLoginProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [attempts, setAttempts] = useState(0)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (attempts >= 5) {
            setError('Too many login attempts. Please try again later.')
            return
        }

        if (!email || !password) {
            setError('Please enter both email and password')
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch('/api/auth/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                // Store admin session
                if (typeof window !== 'undefined') {
                    const session = {
                        email: data.user.email,
                        token: data.token,
                        loginTime: Date.now(),
                        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                    }
                    localStorage.setItem('adminSession', JSON.stringify(session))
                }
                onLogin()
            } else {
                setAttempts(prev => prev + 1)
                setError(data.error || 'Invalid credentials')
            }
        } catch (err) {
            setError('Login failed. Please check your connection.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">Admin Access</CardTitle>
                        <CardDescription className="text-gray-300">
                            Enter your credentials to access the admin dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-200 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-200">Admin Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@kojomoney.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-200">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full text-gray-400 hover:text-white hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4 mr-2" />
                                        Login to Dashboard
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                                <KeyRound className="h-3 w-3" />
                                <span>Secure admin authentication</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-gray-400 text-xs mt-4">
                    © {new Date().getFullYear()} KojoMoney. Admin access only.
                </p>
            </motion.div>
        </div>
    )
}

// Utility functions
export function checkAdminSession(): boolean {
    if (typeof window === 'undefined') return false

    try {
        const sessionStr = localStorage.getItem('adminSession')
        if (!sessionStr) return false

        const session = JSON.parse(sessionStr)
        if (session.expiresAt < Date.now()) {
            localStorage.removeItem('adminSession')
            return false
        }

        return true
    } catch {
        return false
    }
}

export function logoutAdmin(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('adminSession')
    }
}

export function getAdminEmail(): string | null {
    if (typeof window === 'undefined') return null

    try {
        const sessionStr = localStorage.getItem('adminSession')
        if (!sessionStr) return null
        return JSON.parse(sessionStr).email
    } catch {
        return null
    }
}

export function getAdminToken(): string | null {
    if (typeof window === 'undefined') return null

    try {
        const sessionStr = localStorage.getItem('adminSession')
        if (!sessionStr) return null
        return JSON.parse(sessionStr).token || null
    } catch {
        return null
    }
}
