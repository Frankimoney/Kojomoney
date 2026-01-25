'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiCall } from '@/lib/api-client'

export default function AcceptInvitePage() {
    const router = useRouter()
    const { token } = router.query

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Admin info from token validation
    const [adminInfo, setAdminInfo] = useState<{ email: string; name: string; role: string } | null>(null)

    // Password form
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Validate token on load
    useEffect(() => {
        // Clear any existing session to ensure we don't redirect to an old account
        localStorage.removeItem('adminSession')

        if (!token) return

        const validateToken = async () => {
            try {
                const res = await apiCall(`/api/admin/users/accept-invite?token=${token}`)
                const data = await res.json()

                if (res.ok && data.success) {
                    setAdminInfo(data.admin)
                    setError(null)
                } else {
                    setError(data.error || 'Invalid invitation link')
                }
            } catch (err) {
                setError('Failed to validate invitation. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        validateToken()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await apiCall('/api/admin/users/accept-invite', {
                method: 'POST',
                body: JSON.stringify({ token, password })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setSuccess(true)
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/admin')
                }, 3000)
            } else {
                setError(data.error || 'Failed to set password')
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-xl max-w-md w-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mb-4" />
                        <p className="text-gray-300">Validating invitation...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state (invalid/expired token)
    if (error && !adminInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-xl max-w-md w-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Invalid Invitation</h2>
                        <p className="text-gray-300 text-center mb-6">{error}</p>
                        <Button variant="outline" onClick={() => router.push('/admin')}>
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-xl">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="h-10 w-10 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Account Activated!</h2>
                            <p className="text-gray-300 text-center mb-6">
                                Your account has been set up successfully.<br />
                                Redirecting to login...
                            </p>
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    // Main form
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
                        <CardTitle className="text-2xl font-bold text-white">
                            Welcome, {adminInfo?.name}!
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                            Set up your password to activate your admin account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-4 mb-6">
                            <p className="text-indigo-200 text-sm">
                                <strong>Email:</strong> {adminInfo?.email}<br />
                                <strong>Role:</strong> <span className="capitalize">{adminInfo?.role?.replace('_', ' ')}</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-200 text-sm">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-200">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="At least 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                                        disabled={isSubmitting}
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

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-gray-200">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4 mr-2" />
                                        Activate Account
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-gray-400 text-xs mt-4">
                    © {new Date().getFullYear()} KojoMoney. Admin access only.
                </p>
            </motion.div>
        </div>
    )
}
