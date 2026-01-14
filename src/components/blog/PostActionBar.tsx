'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Target, Share2, Bookmark, BookmarkCheck, ExternalLink, Gift, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { OFFERWALL_LINKS } from '@/lib/blog-categories'

interface PostActionBarProps {
    postTitle: string
    postSlug: string
    offerType?: 'cpx' | 'timewall' | 'kiwiwall' | 'surveys' | 'games' | 'social' | 'default'
    referralCode?: string
    showSaveButton?: boolean
    className?: string
}

export default function PostActionBar({
    postTitle,
    postSlug,
    offerType = 'default',
    referralCode,
    showSaveButton = true,
    className = ''
}: PostActionBarProps) {
    const [isSaved, setIsSaved] = useState(false)
    const [copied, setCopied] = useState(false)
    const { toast } = useToast()

    const offerLink = OFFERWALL_LINKS[offerType] || OFFERWALL_LINKS.default
    const shareUrl = `https://kojomoney.com/blog/${postSlug}${referralCode ? `?ref=${referralCode}` : ''}`

    const handleTryOffer = () => {
        window.location.href = offerLink
    }

    const handleShare = async () => {
        const shareData = {
            title: postTitle,
            text: `Check out this guide on KojoMoney: ${postTitle}`,
            url: shareUrl
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData)
                toast({
                    title: 'Shared!',
                    description: 'Thanks for sharing. You may earn bonus points!',
                })
            } catch (err) {
                // User cancelled or error
            }
        } else {
            // Fallback: copy link
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            toast({
                title: 'Link Copied!',
                description: 'Share this link to earn bonus points',
            })
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleSave = () => {
        // Get saved posts from localStorage
        const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]')

        if (isSaved) {
            // Remove from saved
            const newSaved = saved.filter((slug: string) => slug !== postSlug)
            localStorage.setItem('savedPosts', JSON.stringify(newSaved))
            setIsSaved(false)
            toast({
                title: 'Removed',
                description: 'Post removed from saved items',
            })
        } else {
            // Add to saved
            saved.push(postSlug)
            localStorage.setItem('savedPosts', JSON.stringify(saved))
            setIsSaved(true)
            toast({
                title: 'Saved!',
                description: 'You can find this in your saved posts',
            })
        }
    }

    // Check if post is already saved on mount
    useState(() => {
        const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]')
        setIsSaved(saved.includes(postSlug))
    })

    return (
        <div className={`bg-gradient-to-r from-violet-50 via-white to-emerald-50 dark:from-violet-950/30 dark:via-slate-900 dark:to-emerald-950/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 sm:p-6 ${className}`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                {/* Try This Offer - Primary CTA */}
                <Button
                    onClick={handleTryOffer}
                    className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-violet-200 dark:shadow-violet-900/30 gap-2"
                >
                    <Target className="h-5 w-5" />
                    <span>Try This Offer</span>
                    <ExternalLink className="h-4 w-4 opacity-60" />
                </Button>

                {/* Share & Earn */}
                <Button
                    onClick={handleShare}
                    variant="outline"
                    className="flex-1 h-12 sm:h-14 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold gap-2"
                >
                    {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                    <span>{copied ? 'Link Copied!' : 'Share & Earn'}</span>
                    <Gift className="h-4 w-4 opacity-60" />
                </Button>

                {/* Save for Later */}
                {showSaveButton && (
                    <Button
                        onClick={handleSave}
                        variant="ghost"
                        aria-label={isSaved ? "Remove from saved posts" : "Save post for later"}
                        className={`h-12 sm:h-14 px-4 sm:px-6 gap-2 ${isSaved ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'}`}
                    >
                        {isSaved ? (
                            <BookmarkCheck className="h-5 w-5 fill-current" />
                        ) : (
                            <Bookmark className="h-5 w-5" />
                        )}
                        <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                    </Button>
                )}
            </div>

            {/* Bonus hint */}
            <p className="text-center text-xs text-slate-600 dark:text-slate-400 mt-3">
                💡 <span className="font-medium">Pro tip:</span> Share this post with friends to earn <span className="text-emerald-600 dark:text-emerald-400 font-semibold">bonus points</span>!
            </p>
        </div>
    )
}
