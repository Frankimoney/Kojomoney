'use client'

import { useState } from 'react'
import { ShieldCheck, Mail, Smartphone, CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { apiCall } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface TrustBadgesProps {
    user: {
        id: string
        email: string
        phone?: string
        emailVerified?: boolean
        phoneVerified?: boolean
        hasWithdrawn?: boolean
        createdAt?: any
    }
    onVerificationComplete?: () => void
}

export default function TrustBadges({ user, onVerificationComplete }: TrustBadgesProps) {
    const { toast } = useToast()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [verificationType, setVerificationType] = useState<'email' | 'phone'>('email')
    const [step, setStep] = useState<'input' | 'code'>('input')
    const [isLoading, setIsLoading] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [verificationId, setVerificationId] = useState('')
    const [code, setCode] = useState('')

    const startVerification = (type: 'email' | 'phone') => {
        setVerificationType(type)
        setStep('input')
        setInputValue(type === 'email' ? user.email : (user.phone || ''))
        setCode('')
        setIsDialogOpen(true)
    }

    const handleSendCode = async () => {
        setIsLoading(true)
        try {
            const endpoint = '/api/auth/send-verification'
            const response = await apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    userId: user.id,
                    type: verificationType === 'email' ? 'verify_email' : 'verify_phone',
                    [verificationType]: inputValue
                })
            })

            const data = await response.json()
            if (data.success) {
                setVerificationId(data.verificationId)
                setStep('code')
                toast({
                    title: 'Code Sent',
                    description: `Verification code sent to ${data.target}`
                })
                if (data.devCode) {
                    console.log('Dev Code:', data.devCode) // For local testing
                    alert(`Dev Mode Code: ${data.devCode}`)
                }
            } else {
                toast({ title: 'Error', description: data.error, variant: 'destructive' })
            }
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to send code', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyCode = async () => {
        setIsLoading(true)
        try {
            const response = await apiCall('/api/auth/verify-code', {
                method: 'POST',
                body: JSON.stringify({
                    verificationId,
                    code,
                    userId: user.id // Pass user ID to update DB
                })
            })

            const data = await response.json()
            if (data.success) {
                toast({ title: 'Success', description: 'Verification successful!' })
                setIsDialogOpen(false)
                if (onVerificationComplete) onVerificationComplete()
            } else {
                toast({ title: 'Error', description: data.error, variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to verify code', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const badges = [
        {
            id: 'email',
            label: 'Email Verified',
            icon: Mail,
            earned: !!user.emailVerified,
            description: 'Verify your email address to secure your account.',
            action: () => !user.emailVerified && startVerification('email')
        },

        {
            id: 'cashout',
            label: 'First Cashout',
            icon: CreditCard,
            earned: !!user.hasWithdrawn,
            description: 'Complete your first successful withdrawal.',
            action: () => { } // Automatically earned
        },
        {
            id: 'veteran',
            label: 'Member',
            icon: ShieldCheck,
            earned: true,
            description: 'Official member of the KojoMoney community.',
            action: () => { }
        }
    ]

    const earnedCount = badges.filter(b => b.earned).length
    const totalCount = badges.length

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-500" />
                        Trust Score
                    </CardTitle>
                    <Badge variant={earnedCount === totalCount ? "default" : "secondary"}>
                        {earnedCount}/{totalCount} Badges
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {badges.map((badge) => (
                        <TooltipProvider key={badge.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={badge.action}
                                        className={`
                                        flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                                        ${badge.earned
                                                ? 'border-green-500/20 bg-green-500/5 dark:bg-green-500/10 cursor-default'
                                                : 'border-dashed border-muted bg-muted/30 opacity-70 grayscale hover:grayscale-0 hover:bg-muted/50 cursor-pointer hover:border-blue-300'}
                                    `}>
                                        <div className={`
                                            h-10 w-10 rounded-full flex items-center justify-center mb-2
                                            ${badge.earned ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}
                                        `}>
                                            <badge.icon className="h-5 w-5" />
                                        </div>
                                        <span className={`text-xs font-semibold text-center ${badge.earned ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {badge.label}
                                        </span>
                                        {badge.earned && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            </div>
                                        )}
                                        {!badge.earned && badge.id !== 'cashout' && (
                                            <span className="text-[10px] text-blue-500 font-medium mt-1">Tap to Verify</span>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{badge.description}</p>
                                    {!badge.earned && badge.id !== 'cashout' && <p className="text-xs text-blue-400 mt-1 font-semibold">Click to verify!</p>}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>

                {earnedCount < totalCount && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-blue-800 dark:text-blue-300">Increase your Trust Score!</p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                                Verified users get <strong>2x faster withdrawals</strong> and access to premium surveys.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {step === 'input'
                                ? `Verify ${verificationType === 'email' ? 'Email Address' : 'Phone Number'}`
                                : 'Enter Verification Code'}
                        </DialogTitle>
                        <DialogDescription>
                            {step === 'input'
                                ? `We will send a code to verify your ${verificationType}.`
                                : `Enter the code sent to ${inputValue}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {step === 'input' ? (
                            <div className="space-y-2">
                                <Label>{verificationType === 'email' ? 'Email Address' : 'Phone Number'}</Label>
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={verificationType === 'email' ? 'name@example.com' : '+234...'}
                                    type={verificationType === 'email' ? 'email' : 'tel'}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Verification Code</Label>
                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="123456"
                                    className="text-center text-2xl tracking-widest"
                                    maxLength={6}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {step === 'input' ? (
                            <Button onClick={handleSendCode} disabled={!inputValue || isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Code
                            </Button>
                        ) : (
                            <Button onClick={handleVerifyCode} disabled={code.length < 6 || isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify Code
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
