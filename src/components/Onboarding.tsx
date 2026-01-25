'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Gift, Trophy, Wallet, CheckCircle2, ArrowRight } from 'lucide-react'

interface OnboardingProps {
    onComplete: () => void
}

const SLIDES = [
    {
        id: 1,
        title: "Welcome to KojoMoney",
        desc: "Discover a fun way to collect rewards for your daily activities.",
        color: "from-violet-600 to-indigo-600",
        icon: Wallet
    },
    {
        id: 2,
        title: "Complete Fun Tasks",
        desc: "Play games, take trivia, and discover new apps to gather points.",
        color: "from-pink-500 to-rose-500",
        icon: Trophy
    },
    {
        id: 3,
        title: "Redeem Rewards",
        desc: "Exchange your collected points for gift cards and other exciting rewards.",
        color: "from-green-500 to-emerald-600",
        icon: Gift
    }
]

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0)
    const currentSlide = SLIDES[step]

    const handleNext = () => {
        if (step < SLIDES.length - 1) {
            setStep(step + 1)
        } else {
            onComplete()
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute inset-0 bg-gradient-to-br ${currentSlide.color} opacity-40`}
                />
            </AnimatePresence>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center mb-8 shadow-2xl ring-1 ring-white/30">
                            <currentSlide.icon className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl font-black mb-4 tracking-tight drop-shadow-md">{currentSlide.title}</h1>
                        <p className="text-lg text-white/80 max-w-xs font-medium leading-relaxed">{currentSlide.desc}</p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="relative z-10 p-8 pb-12 w-full max-w-md mx-auto">
                <div className="flex justify-center gap-2 mb-8">
                    {SLIDES.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
                        />
                    ))}
                </div>

                <Button
                    onClick={handleNext}
                    className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-white/90 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {step === SLIDES.length - 1 ? (
                        <span className="flex items-center gap-2">Start Earning <CheckCircle2 className="w-5 h-5" /></span>
                    ) : (
                        <span className="flex items-center gap-2">Next <ArrowRight className="w-5 h-5" /></span>
                    )}
                </Button>
            </div>
        </div>
    )
}
