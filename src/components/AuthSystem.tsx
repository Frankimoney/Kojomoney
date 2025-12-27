'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, LogIn, Gift, Shield, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { apiCall } from '@/lib/api-client'
import { getUserTimezone } from '@/lib/timezone'

interface AuthSystemProps {
    onAuthSuccess: (user: any) => void
}

type AuthStep = 'enter-details' | 'verify-email' | 'complete'

interface PasswordStrength {
    score: number
    feedback: string[]
}

const AuthSystem = ({ onAuthSuccess }: AuthSystemProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [activeTab, setActiveTab] = useState('register')

    // Registration states
    const [registerStep, setRegisterStep] = useState<AuthStep>('enter-details')
    const [registerForm, setRegisterForm] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        name: '',
        phone: '',
        referralCode: ''
    })
    const [registerVerification, setRegisterVerification] = useState({
        verificationId: '',
        code: '',
        contactEmail: ''
    })
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] })

    // Password visibility states
    const [showRegPassword, setShowRegPassword] = useState(false)
    const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false)
    const [showLoginPassword, setShowLoginPassword] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    // Login states
    const [loginStep, setLoginStep] = useState<AuthStep>('enter-details')
    const [loginForm, setLoginForm] = useState({
        usernameOrEmail: '',
        password: ''
    })
    const [loginVerification, setLoginVerification] = useState({
        verificationId: '',
        code: '',
        contactEmail: ''
    })

    // Forgot password states
    type ForgotStep = 'enter-email' | 'verify-code' | 'new-password' | 'complete'
    const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [forgotStep, setForgotStep] = useState<ForgotStep>('enter-email')
    const [forgotForm, setForgotForm] = useState({
        email: '',
        verificationId: '',
        code: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text })
        setTimeout(() => setMessage(null), 6000)
    }

    // Prefill referral code from URL param ?ref=CODE
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const ref = params.get('ref')
            if (ref) {
                setRegisterForm(prev => ({ ...prev, referralCode: ref }))
                setMessage({ type: 'success', text: `Referral code applied: ${ref}` })
                setTimeout(() => setMessage(null), 5000)
            }
        }
    }, [])

    // Handle native deep links: kojomoney://signup?ref=CODE
    useEffect(() => {
        let listenerHandle: any = null
        const init = async () => {
            try {
                const { App } = await import('@capacitor/app')
                listenerHandle = await App.addListener('appUrlOpen', ({ url }: { url: string }) => {
                    try {
                        const parsed = new URL(url)
                        const ref = parsed.searchParams.get('ref')
                        if (ref) {
                            setRegisterForm(prev => ({ ...prev, referralCode: ref }))
                            setMessage({ type: 'success', text: `Referral code applied: ${ref}` })
                            setTimeout(() => setMessage(null), 5000)
                        }
                    } catch (_) { }
                })
            } catch (_) { }
        }
        init()
        return () => {
            if (listenerHandle && typeof listenerHandle.remove === 'function') {
                listenerHandle.remove()
            }
        }
    }, [])

    // Password strength checker
    const checkPasswordStrength = (password: string) => {
        const feedback: string[] = []
        let score = 0

        if (password.length >= 8) score++
        else feedback.push('At least 8 characters')

        if (/[A-Z]/.test(password)) score++
        else feedback.push('One uppercase letter')

        if (/[a-z]/.test(password)) score++
        else feedback.push('One lowercase letter')

        if (/[0-9]/.test(password)) score++
        else feedback.push('One number')

        setPasswordStrength({ score: Math.min(score, 4), feedback })
        return score === 4
    }

    const handleRegisterInitiate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Validate inputs
        if (!registerForm.username || registerForm.username.length < 3) {
            showMessage('error', 'Username must be at least 3 characters')
            setIsLoading(false)
            return
        }

        if (!registerForm.email) {
            showMessage('error', 'Email is required')
            setIsLoading(false)
            return
        }

        if (!registerForm.password) {
            showMessage('error', 'Password is required')
            setIsLoading(false)
            return
        }

        if (registerForm.password !== registerForm.passwordConfirm) {
            showMessage('error', 'Passwords do not match')
            setIsLoading(false)
            return
        }

        if (!checkPasswordStrength(registerForm.password)) {
            showMessage('error', 'Password does not meet security requirements')
            setIsLoading(false)
            return
        }

        try {
            // Send verification code
            console.log('[AUTH] Sending verification request...')
            const response = await apiCall('/api/auth/send-verification', {
                method: 'POST',
                body: JSON.stringify({
                    email: registerForm.email,
                    type: 'register'
                })
            })

            console.log('[AUTH] Response status:', response.status)
            const data = await response.json()
            console.log('[AUTH] Response data:', data)

            if (data.success) {
                console.log('[AUTH] Success! Transitioning to verify-email step')
                setRegisterVerification({
                    verificationId: data.verificationId,
                    code: '',
                    contactEmail: registerForm.email
                })
                setRegisterStep('verify-email')
                showMessage('success', `Verification code sent to ${registerForm.email}`)
            } else {
                console.log('[AUTH] API returned error:', data.error)
                showMessage('error', data.error || 'Failed to send verification code')
            }
        } catch (error) {
            console.error('[AUTH] Catch error:', error)
            showMessage('error', 'Network error. Please try again.')
        } finally {
            console.log('[AUTH] Setting isLoading to false')
            setIsLoading(false)
        }
    }

    const handleRegisterVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!registerVerification.code) {
            showMessage('error', 'Verification code is required')
            setIsLoading(false)
            return
        }

        try {
            // Verify code
            const verifyResponse = await apiCall('/api/auth/verify-code', {
                method: 'POST',
                body: JSON.stringify({
                    verificationId: registerVerification.verificationId,
                    code: registerVerification.code
                })
            })

            const verifyData = await verifyResponse.json()

            if (!verifyData.success) {
                showMessage('error', verifyData.error || 'Invalid verification code')
                setIsLoading(false)
                return
            }

            // Now register the user with timezone
            const timezone = getUserTimezone()
            const registerResponse = await apiCall('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: registerForm.username,
                    email: registerForm.email,
                    password: registerForm.password,
                    passwordConfirm: registerForm.passwordConfirm,
                    name: registerForm.name,
                    phone: registerForm.phone,
                    referralCode: registerForm.referralCode,
                    verificationId: registerVerification.verificationId,
                    timezone
                })
            })

            const registerData = await registerResponse.json()

            if (registerData.success) {
                showMessage('success', 'Account created successfully! Welcome to Kojomoney!')
                onAuthSuccess(registerData.user)

                // Store user session
                localStorage.setItem('kojomoneyUser', JSON.stringify(registerData.user))
                try {
                    const anonId = localStorage.getItem('kojomoneyAnonId')
                    if (anonId) {
                        await apiCall('/api/users/merge-anon', {
                            method: 'POST',
                            body: JSON.stringify({ anonId })
                        })
                    }
                } catch (_) { }

                setRegisterStep('complete')
            } else {
                showMessage('error', registerData.error || 'Registration failed')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLoginInitiate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!loginForm.usernameOrEmail || !loginForm.password) {
            showMessage('error', 'Username/Email and password are required')
            setIsLoading(false)
            return
        }

        try {
            // Send verification code
            const response = await apiCall('/api/auth/send-verification', {
                method: 'POST',
                body: JSON.stringify({
                    email: loginForm.usernameOrEmail,
                    type: 'login'
                })
            })

            const data = await response.json()

            if (data.success) {
                setLoginVerification({
                    verificationId: data.verificationId,
                    code: '',
                    contactEmail: data.email || loginForm.usernameOrEmail  // Use actual email from API
                })
                setLoginStep('verify-email')
                showMessage('success', `Verification code sent to ${data.email || loginForm.usernameOrEmail}`)
            } else {
                showMessage('error', data.error || 'Failed to send verification code')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLoginVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!loginVerification.code) {
            showMessage('error', 'Verification code is required')
            setIsLoading(false)
            return
        }

        try {
            // Verify code
            const verifyResponse = await apiCall('/api/auth/verify-code', {
                method: 'POST',
                body: JSON.stringify({
                    verificationId: loginVerification.verificationId,
                    code: loginVerification.code
                })
            })

            const verifyData = await verifyResponse.json()

            if (!verifyData.success) {
                showMessage('error', verifyData.error || 'Invalid verification code')
                setIsLoading(false)
                return
            }

            // Now login with timezone update
            const timezone = getUserTimezone()
            const loginResponse = await apiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    usernameOrEmail: loginForm.usernameOrEmail,
                    password: loginForm.password,
                    verificationId: loginVerification.verificationId,
                    timezone  // Update timezone on each login
                })
            })

            const loginData = await loginResponse.json()

            if (loginData.success) {
                showMessage('success', 'Welcome back! Login successful.')
                onAuthSuccess(loginData.user)

                // Store user session
                localStorage.setItem('kojomoneyUser', JSON.stringify(loginData.user))
                try {
                    const anonId = localStorage.getItem('kojomoneyAnonId')
                    if (anonId) {
                        await apiCall('/api/users/merge-anon', {
                            method: 'POST',
                            body: JSON.stringify({ anonId })
                        })
                    }
                } catch (_) { }

                setLoginStep('complete')
            } else {
                showMessage('error', loginData.error || 'Login failed')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendCode = async (type: 'register' | 'login') => {
        if (resendCooldown > 0) return

        setIsLoading(true)
        const email = type === 'register' ? registerForm.email : loginForm.usernameOrEmail

        try {
            const response = await apiCall('/api/auth/send-verification', {
                method: 'POST',
                body: JSON.stringify({ email, type })
            })

            const data = await response.json()

            if (data.success) {
                if (type === 'register') {
                    setRegisterVerification(prev => ({ ...prev, verificationId: data.verificationId }))
                } else {
                    setLoginVerification(prev => ({
                        ...prev,
                        verificationId: data.verificationId,
                        contactEmail: data.email || prev.contactEmail  // Update with actual email
                    }))
                }
                showMessage('success', `New verification code sent to ${data.email || email}!`)

                // Start 60-second cooldown
                setResendCooldown(60)
                const interval = setInterval(() => {
                    setResendCooldown(prev => {
                        if (prev <= 1) {
                            clearInterval(interval)
                            return 0
                        }
                        return prev - 1
                    })
                }, 1000)
            } else {
                showMessage('error', data.error || 'Failed to resend code')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const getStrengthColor = (score: number) => {
        if (score === 0) return 'bg-gray-300'
        if (score === 1) return 'bg-red-500'
        if (score === 2) return 'bg-orange-500'
        if (score === 3) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getStrengthText = (score: number) => {
        if (score === 0) return 'None'
        if (score === 1) return 'Weak'
        if (score === 2) return 'Fair'
        if (score === 3) return 'Good'
        return 'Strong'
    }

    const handleTabChange = (value: string) => {
        setActiveTab(value)
        setMessage(null)
        setRegisterStep('enter-details')
        setLoginStep('enter-details')
        setShowForgotPassword(false)
        setForgotStep('enter-email')
    }

    // Forgot Password Handlers
    const handleForgotPasswordSendCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!forgotForm.email) {
            showMessage('error', 'Email is required')
            setIsLoading(false)
            return
        }

        try {
            const response = await apiCall('/api/auth/send-verification', {
                method: 'POST',
                body: JSON.stringify({
                    email: forgotForm.email,
                    type: 'reset-password'
                })
            })

            const data = await response.json()

            if (data.success) {
                setForgotForm(prev => ({ ...prev, verificationId: data.verificationId }))
                setForgotStep('verify-code')
                showMessage('success', `Reset code sent to ${forgotForm.email}`)
            } else {
                showMessage('error', data.error || 'Failed to send reset code')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleForgotPasswordVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!forgotForm.code || forgotForm.code.length !== 6) {
            showMessage('error', 'Please enter the 6-digit code')
            return
        }

        setForgotStep('new-password')
    }

    const handleForgotPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        if (!forgotForm.newPassword) {
            showMessage('error', 'New password is required')
            setIsLoading(false)
            return
        }

        if (forgotForm.newPassword !== forgotForm.confirmPassword) {
            showMessage('error', 'Passwords do not match')
            setIsLoading(false)
            return
        }

        if (forgotForm.newPassword.length < 8) {
            showMessage('error', 'Password must be at least 8 characters')
            setIsLoading(false)
            return
        }

        try {
            const response = await apiCall('/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    verificationId: forgotForm.verificationId,
                    code: forgotForm.code,
                    newPassword: forgotForm.newPassword,
                    email: forgotForm.email
                })
            })

            const data = await response.json()

            if (data.success) {
                setForgotStep('complete')
                showMessage('success', 'Password reset successfully! You can now login.')
            } else {
                showMessage('error', data.error || 'Failed to reset password')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleBackToLogin = () => {
        setShowForgotPassword(false)
        setForgotStep('enter-email')
        setForgotForm({
            email: '',
            verificationId: '',
            code: '',
            newPassword: '',
            confirmPassword: ''
        })
        setMessage(null)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-4">
                        <span className="text-white text-2xl font-bold">KOJO</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Kojomoney</h1>
                    <p className="text-gray-600">Secure Earnings Platform</p>
                </div>

                {/* Auth Tabs */}
                <Card>
                    <CardHeader className="relative">
                        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full relative">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="register" className="flex items-center space-x-2">
                                    <UserPlus className="h-4 w-4" />
                                    <span>Register</span>
                                </TabsTrigger>
                                <TabsTrigger value="login" className="flex items-center space-x-2">
                                    <LogIn className="h-4 w-4" />
                                    <span>Login</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Message Alert */}
                            {message && (
                                <Alert className={`mt-4 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                                    {message.type === 'error' ? (
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    )}
                                    <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                                        {message.text}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <TabsContent value="register" className="space-y-4 mt-4">
                                {registerStep === 'enter-details' && (
                                    <form onSubmit={handleRegisterInitiate} className="space-y-4">
                                        <div>
                                            <Label htmlFor="reg-username">Username *</Label>
                                            <Input
                                                id="reg-username"
                                                type="text"
                                                placeholder="john_doe"
                                                value={registerForm.username}
                                                onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">3-20 characters, letters, numbers, underscores</p>
                                        </div>

                                        <div>
                                            <Label htmlFor="reg-email">Email *</Label>
                                            <Input
                                                id="reg-email"
                                                type="email"
                                                placeholder="your@email.com"
                                                value={registerForm.email}
                                                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="reg-password">Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="reg-password"
                                                    type={showRegPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={registerForm.password}
                                                    onChange={(e) => {
                                                        setRegisterForm(prev => ({ ...prev, password: e.target.value }))
                                                        checkPasswordStrength(e.target.value)
                                                    }}
                                                    required
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRegPassword(!showRegPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <div className="mt-2 space-y-2">
                                                <div className="flex gap-1">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div
                                                            key={i}
                                                            className={`h-1 flex-1 rounded ${i < passwordStrength.score ? getStrengthColor(passwordStrength.score) : 'bg-gray-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-xs font-medium">Strength: {getStrengthText(passwordStrength.score)}</p>
                                                {passwordStrength.feedback.length > 0 && (
                                                    <ul className="text-xs text-gray-600 space-y-1">
                                                        {passwordStrength.feedback.map((item, i) => (
                                                            <li key={i} className="flex items-center gap-1">
                                                                <span className="text-red-500">•</span> Add {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="reg-password-confirm">Confirm Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="reg-password-confirm"
                                                    type={showRegPasswordConfirm ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={registerForm.passwordConfirm}
                                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, passwordConfirm: e.target.value }))}
                                                    required
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRegPasswordConfirm(!showRegPasswordConfirm)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showRegPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="reg-name">Full Name *</Label>
                                            <Input
                                                id="reg-name"
                                                type="text"
                                                placeholder="John Doe"
                                                value={registerForm.name}
                                                onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="reg-phone">Phone Number *</Label>
                                            <Input
                                                id="reg-phone"
                                                type="tel"
                                                placeholder="+2348000000000"
                                                value={registerForm.phone}
                                                onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="reg-referral">Referral Code (Optional)</Label>
                                            <Input
                                                id="reg-referral"
                                                type="text"
                                                placeholder="KOJO123456"
                                                value={registerForm.referralCode}
                                                onChange={(e) => setRegisterForm(prev => ({ ...prev, referralCode: e.target.value }))}
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={isLoading || !registerForm.username || !registerForm.email || !registerForm.password || !registerForm.passwordConfirm || !registerForm.name || !registerForm.phone || registerForm.password !== registerForm.passwordConfirm}
                                        >
                                            {isLoading ? 'Sending Verification...' : 'Continue to Verification'}
                                        </Button>
                                    </form>
                                )}

                                {registerStep === 'verify-email' && (
                                    <form onSubmit={handleRegisterVerify} className="space-y-4">
                                        <Alert className="border-blue-200 bg-blue-50">
                                            <AlertCircle className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800">
                                                A verification code has been sent to <strong>{registerVerification.contactEmail}</strong>
                                            </AlertDescription>
                                        </Alert>

                                        <div>
                                            <Label htmlFor="reg-verify-code">Verification Code *</Label>
                                            <Input
                                                id="reg-verify-code"
                                                type="text"
                                                placeholder="000000"
                                                maxLength={6}
                                                value={registerVerification.code}
                                                onChange={(e) => setRegisterVerification(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Check your email for the 6-digit code</p>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={isLoading || registerVerification.code.length !== 6}>
                                            {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                                        </Button>

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setRegisterStep('enter-details')}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => handleResendCode('register')}
                                                disabled={isLoading || resendCooldown > 0}
                                            >
                                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                                            </Button>
                                        </div>
                                    </form>
                                )}

                                {registerStep === 'complete' && (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration Complete!</h3>
                                        <p className="text-gray-600 mb-4">Your account is now secure and verified.</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="login" className="space-y-4 mt-4">
                                {loginStep === 'enter-details' && (
                                    <form onSubmit={handleLoginInitiate} className="space-y-4">
                                        <div>
                                            <Label htmlFor="login-username">Username or Email *</Label>
                                            <Input
                                                id="login-username"
                                                type="text"
                                                placeholder="username or email@example.com"
                                                value={loginForm.usernameOrEmail}
                                                onChange={(e) => setLoginForm(prev => ({ ...prev, usernameOrEmail: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="login-password">Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="login-password"
                                                    type={showLoginPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={loginForm.password}
                                                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                                                    required
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading ? 'Sending Code...' : 'Continue to Verification'}
                                        </Button>

                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotPassword(true)}
                                                className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
                                            >
                                                Forgot your password?
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {loginStep === 'verify-email' && (
                                    <form onSubmit={handleLoginVerify} className="space-y-4">
                                        <Alert className="border-blue-200 bg-blue-50">
                                            <AlertCircle className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800">
                                                A verification code has been sent to <strong>{loginVerification.contactEmail}</strong>
                                            </AlertDescription>
                                        </Alert>

                                        <div>
                                            <Label htmlFor="login-verify-code">Verification Code *</Label>
                                            <Input
                                                id="login-verify-code"
                                                type="text"
                                                placeholder="000000"
                                                maxLength={6}
                                                value={loginVerification.code}
                                                onChange={(e) => setLoginVerification(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Check your email for the 6-digit code</p>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={isLoading || loginVerification.code.length !== 6}>
                                            {isLoading ? 'Verifying...' : 'Verify & Login'}
                                        </Button>

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setLoginStep('enter-details')}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => handleResendCode('login')}
                                                disabled={isLoading || resendCooldown > 0}
                                            >
                                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                                            </Button>
                                        </div>
                                    </form>
                                )}

                                {loginStep === 'complete' && (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Login Successful!</h3>
                                        <p className="text-gray-600 mb-4">Welcome back to Kojomoney.</p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Forgot Password Modal/Overlay */}
                            {showForgotPassword && (
                                <div className="absolute inset-0 bg-white rounded-lg p-4 z-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                                            <button
                                                onClick={handleBackToLogin}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Message Alert in Forgot Password */}
                                        {message && (
                                            <Alert className={`${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                                                {message.type === 'error' ? (
                                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                                ) : (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                )}
                                                <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                                                    {message.text}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {forgotStep === 'enter-email' && (
                                            <form onSubmit={handleForgotPasswordSendCode} className="space-y-4">
                                                <p className="text-sm text-gray-600">
                                                    Enter your email address and we'll send you a code to reset your password.
                                                </p>
                                                <div>
                                                    <Label htmlFor="forgot-email">Email Address *</Label>
                                                    <Input
                                                        id="forgot-email"
                                                        type="email"
                                                        placeholder="your@email.com"
                                                        value={forgotForm.email}
                                                        onChange={(e) => setForgotForm(prev => ({ ...prev, email: e.target.value }))}
                                                        required
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="outline" className="flex-1" onClick={handleBackToLogin}>
                                                        Cancel
                                                    </Button>
                                                    <Button type="submit" className="flex-1" disabled={isLoading}>
                                                        {isLoading ? 'Sending...' : 'Send Reset Code'}
                                                    </Button>
                                                </div>
                                            </form>
                                        )}

                                        {forgotStep === 'verify-code' && (
                                            <form onSubmit={handleForgotPasswordVerifyCode} className="space-y-4">
                                                <Alert className="border-blue-200 bg-blue-50">
                                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                                    <AlertDescription className="text-blue-800">
                                                        A reset code has been sent to <strong>{forgotForm.email}</strong>
                                                    </AlertDescription>
                                                </Alert>
                                                <div>
                                                    <Label htmlFor="forgot-code">Verification Code *</Label>
                                                    <Input
                                                        id="forgot-code"
                                                        type="text"
                                                        placeholder="000000"
                                                        maxLength={6}
                                                        value={forgotForm.code}
                                                        onChange={(e) => setForgotForm(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                                                        required
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setForgotStep('enter-email')}>
                                                        Back
                                                    </Button>
                                                    <Button type="submit" className="flex-1" disabled={forgotForm.code.length !== 6}>
                                                        Verify Code
                                                    </Button>
                                                </div>
                                            </form>
                                        )}

                                        {forgotStep === 'new-password' && (
                                            <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                                                <p className="text-sm text-gray-600">
                                                    Enter your new password below.
                                                </p>
                                                <div>
                                                    <Label htmlFor="new-password">New Password *</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="new-password"
                                                            type={showNewPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            value={forgotForm.newPassword}
                                                            onChange={(e) => setForgotForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                            required
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                                                </div>
                                                <div>
                                                    <Label htmlFor="confirm-new-password">Confirm Password *</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="confirm-new-password"
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            value={forgotForm.confirmPassword}
                                                            onChange={(e) => setForgotForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                            required
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setForgotStep('verify-code')}>
                                                        Back
                                                    </Button>
                                                    <Button type="submit" className="flex-1" disabled={isLoading}>
                                                        {isLoading ? 'Resetting...' : 'Reset Password'}
                                                    </Button>
                                                </div>
                                            </form>
                                        )}

                                        {forgotStep === 'complete' && (
                                            <div className="text-center py-8">
                                                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Reset!</h3>
                                                <p className="text-gray-600 mb-4">Your password has been successfully reset.</p>
                                                <Button onClick={handleBackToLogin} className="w-full">
                                                    Back to Login
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Tabs>
                    </CardHeader>
                </Card>

                {/* Features */}
                <div className="mt-8 space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <Shield className="h-6 w-6 text-blue-500" />
                                <div>
                                    <h4 className="font-semibold text-sm">Two-Factor Security</h4>
                                    <p className="text-xs text-gray-600">Email verification for every login</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <Gift className="h-6 w-6 text-green-500" />
                                <div>
                                    <h4 className="font-semibold text-sm">100 Points Welcome Bonus</h4>
                                    <p className="text-xs text-gray-600">Plus referral rewards for friends</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Message Alert */}
                {message && (
                    <Alert className={`mt-4 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                        <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    )
}

export default AuthSystem
