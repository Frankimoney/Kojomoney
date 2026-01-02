'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Star, ThumbsUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { celebrationConfetti } from '@/lib/safe-confetti'

interface ReviewPromptProps {
    isOpen: boolean
    onClose: () => void
    triggerSource: 'withdrawal' | 'spin' | 'mission'
}

export function ReviewPrompt({ isOpen, onClose, triggerSource }: ReviewPromptProps) {
    const [rating, setRating] = useState(0)

    // Only show if we haven't asked recently (simulated by parent logic usually, but good to have safety)

    const handleRate = (stars: number) => {
        setRating(stars)
        if (stars >= 4) {
            celebrationConfetti()
        }
    }

    const handleContinue = () => {
        if (rating >= 4) {
            // Redirect to store
            // In a real app, you'd detect OS. For now, we assume Android/Play Store given the context.
            window.open('https://play.google.com/store/apps/details?id=com.kojomoney.app', '_blank')
        }
        // If rating is low, we just close (feedback "swallowed" effectively to protect public rating)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md mx-auto w-[90%] rounded-xl">
                <DialogHeader className="text-center items-center">
                    <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full mb-4">
                        <ThumbsUp className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <DialogTitle className="text-xl">Enjoying KojoMoney?</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        {triggerSource === 'withdrawal' && "Congrats on your withdrawal! 💸"}
                        {triggerSource === 'spin' && "Nice win! 🎰"}
                        {triggerSource === 'mission' && "Great job completing that mission! 🚀"}
                        <br />
                        Would you mind rating us 5 stars? It helps us add more rewards!
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center gap-2 py-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                            key={star}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRate(star)}
                            className="focus:outline-none"
                        >
                            <Star
                                className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                            />
                        </motion.button>
                    ))}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleContinue}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                        disabled={rating === 0}
                    >
                        Submit Rating
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
