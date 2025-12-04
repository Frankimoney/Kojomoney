'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, LogIn, Gift, Shield } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

interface AuthSystemProps {
    onAuthSuccess: (user: any) => void
}

const AuthSystem = ({ onAuthSuccess }: AuthSystemProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Registration form state
    const [registerForm, setRegisterForm] = useState({
        email: '',
        name: '',
        phone: '',
        referralCode: ''
    })

    // Login form state
    const [loginForm, setLoginForm] = useState({
        email: ''
    })

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text })
        setTimeout(() => setMessage(null), 5000)
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
        let remove: any
        const init = async () => {
            try {
                const { App } = await import('@capacitor/app')
                remove = App.addListener('appUrlOpen', ({ url }: { url: string }) => {
                    try {
                        const parsed = new URL(url)
                        const ref = parsed.searchParams.get('ref')
                        if (ref) {
                            setRegisterForm(prev => ({ ...prev, referralCode: ref }))
                            setMessage({ type: 'success', text: `Referral code applied: ${ref}` })
                            setTimeout(() => setMessage(null), 5000)
                        }
                    } catch (_) {}
                })
            } catch (_) {}
        }
        init()
        return () => {
            try { remove && remove.remove && remove.remove() } catch (_) {}
        }
    }, [])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await apiCall('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(registerForm)
            })

            const data = await response.json()

            if (data.success) {
                showMessage('success', 'Account created successfully! Welcome to Kojomoney!')
                onAuthSuccess(data.user)

                // Store user session
                localStorage.setItem('kojomoneyUser', JSON.stringify(data.user))
                try {
                    const anonId = localStorage.getItem('kojomoneyAnonId')
                    if (anonId) {
                        await apiCall('/api/users/merge-anon', {
                            method: 'POST',
                            body: JSON.stringify({ anonId })
                        })
                    }
                } catch (_) {}
            } else {
                showMessage('error', data.error || 'Registration failed')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await apiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginForm)
            })

            const data = await response.json()

            if (data.success) {
                showMessage('success', 'Welcome back! Login successful.')
                onAuthSuccess(data.user)

                // Store user session
                localStorage.setItem('kojomoneyUser', JSON.stringify(data.user))
                try {
                    const anonId = localStorage.getItem('kojomoneyAnonId')
                    if (anonId) {
                        await apiCall('/api/users/merge-anon', {
                            method: 'POST',
                            body: JSON.stringify({ anonId })
                        })
                    }
                } catch (_) {}
            } else {
                showMessage('error', data.error || 'Login failed')
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
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
                    <p className="text-gray-600">Earn points by reading, watching, and playing!</p>
                </div>

                {/* Auth Tabs */}
                <Card>
                    <CardHeader>
                        <Tabs defaultValue="register" className="w-full">
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

                            <TabsContent value="register">
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div>
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={registerForm.email}
                                            onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="John Doe"
                                            value={registerForm.name}
                                            onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+2348000000000"
                                            value={registerForm.phone}
                                            onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="referral">Referral Code (Optional)</Label>
                                        <Input
                                            id="referral"
                                            type="text"
                                            placeholder="KOJO123456"
                                            value={registerForm.referralCode}
                                            onChange={(e) => setRegisterForm(prev => ({ ...prev, referralCode: e.target.value }))}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Creating Account...' : 'Create Account'}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <Label htmlFor="login-email">Email *</Label>
                                        <Input
                                            id="login-email"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={loginForm.email}
                                            onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Logging in...' : 'Login'}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardHeader>
                </Card>

                {/* Features */}
                <div className="mt-8 space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <Gift className="h-8 w-8 text-green-500" />
                                <div>
                                    <h4 className="font-semibold">100 Points Welcome Bonus</h4>
                                    <p className="text-sm text-gray-600">Get started with bonus points when you refer friends!</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <Shield className="h-8 w-8 text-blue-500" />
                                <div>
                                    <h4 className="font-semibold">Secure & Protected</h4>
                                    <p className="text-sm text-gray-600">Advanced fraud detection keeps your earnings safe</p>
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
