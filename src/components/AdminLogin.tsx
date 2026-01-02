'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, KeyRound, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiCall } from '@/lib/api-client'

interface AdminLoginProps {
    onLogin: () => void
}

type LoginStep = 'credentials' | 'verify_code'

export default function AdminLogin({ onLogin }: AdminLoginProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [attempts, setAttempts] = useState(0)

    // 2FA State
    const [step, setStep] = useState<LoginStep>('credentials')
    const [code, setCode] = useState(['', '', '', '', '', ''])
    const [codeExpiry, setCodeExpiry] = useState(300)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Countdown timer for code expiry
    useEffect(() => {
        if (step === 'verify_code' && codeExpiry > 0) {
            const timer = setInterval(() => {
                setCodeExpiry(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [step, codeExpiry])

    // Focus first code input when entering verification step
    useEffect(() => {
        if (step === 'verify_code') {
            inputRefs.current[0]?.focus()
        }
    }, [step])

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return // Only allow digits

        const newCode = [...code]
        newCode[index] = value.slice(-1) // Only take last digit
        setCode(newCode)

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }

        // Auto-submit when all digits entered
        if (newCode.every(d => d) && newCode.join('').length === 6) {
            setTimeout(() => handleVerifyCode(newCode.join('')), 100)
        }
    }

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (pasted.length === 6) {
            const newCode = pasted.split('')
            setCode(newCode)
            inputRefs.current[5]?.focus()
            setTimeout(() => handleVerifyCode(pasted), 100)
        }
    }

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

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
            const res = await apiCall('/api/auth/admin-login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (res.ok && data.step === 'verify_code') {
                setStep('verify_code')
                setCodeExpiry(data.expiresIn || 300)
                setSuccess(data.message)
                setError(null)
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

    const handleVerifyCode = async (codeStr?: string) => {
        const verificationCode = codeStr || code.join('')

        if (verificationCode.length !== 6) {
            setError('Please enter the complete 6-digit code')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const res = await apiCall('/api/auth/admin-login', {
                method: 'POST',
                body: JSON.stringify({ email, code: verificationCode })
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
            } else if (data.step === 'login') {
                // Need to restart login
                setStep('credentials')
                setCode(['', '', '', '', '', ''])
                setError(data.error)
            } else {
                setError(data.error || 'Invalid code')
                setCode(['', '', '', '', '', ''])
                inputRefs.current[0]?.focus()
            }
        } catch (err) {
            setError('Verification failed. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleBack = () => {
        setStep('credentials')
        setCode(['', '', '', '', '', ''])
        setError(null)
        setSuccess(null)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
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
                        <CardTitle className="text-2xl font-bold text-white">
                            {step === 'credentials' ? 'Admin Access' : '2-Step Verification'}
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                            {step === 'credentials'
                                ? 'Enter your credentials to access the admin dashboard'
                                : 'Enter the verification code sent to your email'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AnimatePresence mode="wait">
                            {step === 'credentials' ? (
                                <motion.form
                                    key="credentials"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleCredentialsSubmit}
                                    className="space-y-4"
                                >
                                    {error && (
                                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-200 text-sm">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-gray-200">Admin Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="your-admin-email@gmail.com"
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
                                                Sending Code...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="h-4 w-4 mr-2" />
                                                Continue
                                            </>
                                        )}
                                    </Button>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="verify"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    {success && (
                                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 text-green-200 text-sm">
                                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                            {success}
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-200 text-sm">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                                        <Mail className="h-4 w-4" />
                                        <span>Code sent to <strong>{email}</strong></span>
                                    </div>

                                    {/* Code Input */}
                                    <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                                        {code.map((digit, index) => (
                                            <Input
                                                key={index}
                                                ref={(el) => { inputRefs.current[index] = el }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleCodeChange(index, e.target.value)}
                                                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                                className="w-12 h-14 text-center text-2xl font-bold bg-white/10 border-white/20 text-white"
                                                disabled={isLoading}
                                            />
                                        ))}
                                    </div>

                                    {/* Timer */}
                                    <div className="text-center">
                                        {codeExpiry > 0 ? (
                                            <p className="text-gray-400 text-sm">
                                                Code expires in <span className="text-white font-mono">{formatTime(codeExpiry)}</span>
                                            </p>
                                        ) : (
                                            <p className="text-red-400 text-sm">
                                                Code expired. Please go back and try again.
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => handleVerifyCode()}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                                        disabled={isLoading || code.some(d => !d)}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Verify Code
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-gray-400 hover:text-white"
                                        onClick={handleBack}
                                        disabled={isLoading}
                                    >
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to Login
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                                <KeyRound className="h-3 w-3" />
                                <span>Two-factor authentication enabled</span>
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
