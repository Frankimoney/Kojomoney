'use client'

import React from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Script from 'next/script'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Menu, X, Coins, Home, BookOpen, ArrowRight, Send, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

// Dynamically import AIChatbot to prevent SSR issues
const AIChatbot = dynamic(() => import('@/components/AIChatbot'), {
    ssr: false
})

// Premium Footer Component
const BlogFooter = () => (
    <footer className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white py-16 mt-16">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8 xl:gap-10">
                {/* Brand Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/app-icon.png"
                            alt="KojoMoney"
                            width={48}
                            height={48}
                            className="rounded-xl shadow-lg"
                        />
                        <div>
                            <h3 className="font-bold text-xl">KojoMoney</h3>
                            <p className="text-violet-300 text-sm">Blog & Guides</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Your trusted source for earning tips, payment proofs, and guides to maximize your income with KojoMoney.
                    </p>
                    <div className="flex gap-3">
                        {/* Telegram */}
                        <a href="https://t.me/kojomoney36" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/10 hover:bg-[#0088cc]/80 rounded-lg transition-colors group">
                            <Send className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                        </a>
                        {/* TikTok */}
                        <a href="https://www.tiktok.com/@kojomoney36" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/10 hover:bg-black/60 rounded-lg transition-colors group">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white group-hover:scale-110 transition-transform">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <h4 className="font-semibold text-lg mb-5 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-violet-400" />
                        Categories
                    </h4>
                    <ul className="space-y-3">
                        {[
                            { name: 'Earning Guides', href: '/blog?category=earning-guides', icon: '📖' },
                            { name: 'Payment Proofs', href: '/blog?category=payment-proofs', icon: '💸' },
                            { name: 'Bonus Alerts', href: '/blog?category=bonus-alerts', icon: '🎁' },
                            { name: 'App Updates', href: '/blog?category=app-updates', icon: '📱' },
                        ].map((item) => (
                            <li key={item.name}>
                                <Link href={item.href} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                                    <span>{item.icon}</span>
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="font-semibold text-lg mb-5 flex items-center gap-2">
                        <Home className="h-4 w-4 text-violet-400" />
                        Quick Links
                    </h4>
                    <ul className="space-y-3">
                        {[
                            { name: 'All Blog Posts', href: '/blog' },
                            { name: 'FAQs', href: '/' },
                            { name: 'Privacy Policy', href: '/privacy' },
                            { name: 'Terms of Service', href: '/terms' },
                        ].map((item) => (
                            <li key={item.name}>
                                <Link href={item.href} className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 group">
                                    {item.name}
                                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-2xl p-6 border border-violet-500/20">
                    <h4 className="font-semibold text-lg mb-3">Start Earning Today</h4>
                    <p className="text-slate-400 text-sm mb-4">
                        Join thousands earning rewards with KojoMoney!
                    </p>
                    {/* Web App Button - Always accessible */}
                    <Link href="/">
                        <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg mb-2">
                            <Coins className="h-4 w-4 mr-2" />
                            Get Started Free
                        </Button>
                    </Link>
                    {/* TODO: Uncomment when app is on Play Store
                    <a href="https://play.google.com/store/apps/details?id=com.kojomoney.app" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                            <Smartphone className="h-4 w-4 mr-2" />
                            Download Android App
                        </Button>
                    </a>
                    */}
                    <p className="text-xs text-slate-500 mt-3 text-center">
                        📱 Android app coming soon to Play Store
                    </p>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10 mt-12 pt-8 flex flex-col items-center gap-4 text-center">
                <div className="flex flex-col sm:flex-row justify-between w-full items-center gap-4">
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} KojoMoney. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                    </div>
                </div>
                <p className="text-[10px] text-slate-600 max-w-2xl leading-relaxed">
                    Google Inc. is not a sponsor to, nor is it involved in any way with KojoMoney promotions, contests, or rewards.
                    All rewards and prizes are sponsored by KojoMoney and its approved partners.
                </p>
            </div>
        </div>
    </footer>
)

// Premium Header Component
const BlogHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const [user, setUser] = React.useState<{ name?: string; email?: string } | null>(null)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)
    const { theme, setTheme } = useTheme()

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        // Check if user is logged in from the main app
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('kojomoneyUser')
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser))
                } catch { }
            }

            const handleScroll = () => {
                setIsScrolled(window.scrollY > 10)
            }
            window.addEventListener('scroll', handleScroll)
            return () => window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    const getInitials = (name?: string, email?: string) => {
        if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        if (email) return email[0].toUpperCase()
        return 'U'
    }

    return (
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 dark:shadow-slate-900/20' : 'bg-transparent'
            }`}>
            <div className="container mx-auto px-4">
                <div className="h-16 md:h-20 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative p-1.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-lg shadow-violet-200 dark:shadow-violet-900/30 group-hover:shadow-xl transition-shadow">
                            <Image
                                src="/app-icon.png"
                                alt="KojoMoney"
                                width={40}
                                height={40}
                                className="rounded-xl"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-xl bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                                KojoMoney
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">Blog & Guides</p>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Link href="/" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all">
                            Home
                        </Link>
                        <Link href="/blog" className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                            Blog
                        </Link>
                    </nav>

                    {/* Right Section */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Dark Mode Toggle */}
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="h-5 w-5 text-amber-500" />
                                ) : (
                                    <Moon className="h-5 w-5 text-slate-600" />
                                )}
                            </button>
                        )}
                        {user ? (
                            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                                    {getInitials(user.name, user.email)}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-sm font-medium">{user.name || 'My Account'}</p>
                                    <p className="text-xs text-slate-500">View Profile</p>
                                </div>
                            </Link>
                        ) : (
                            <Link href="/">
                                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 rounded-xl h-10 px-5">
                                    <Coins className="h-4 w-4 mr-2" />
                                    Start Earning
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {isMenuOpen && (
                <div className="md:hidden border-t bg-white dark:bg-slate-900 shadow-xl">
                    <div className="container mx-auto px-4 py-4 space-y-4">
                        <nav className="flex flex-col gap-1">
                            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Home className="h-5 w-5 text-slate-500" />
                                <span className="font-medium">Home</span>
                            </Link>
                            <Link href="/blog" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                                <BookOpen className="h-5 w-5" />
                                <span className="font-medium">Blog</span>
                            </Link>
                            {/* Mobile Dark Mode Toggle */}
                            {mounted && (
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="h-5 w-5 text-amber-500" />
                                    ) : (
                                        <Moon className="h-5 w-5 text-slate-500" />
                                    )}
                                    <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                            )}
                        </nav>

                        <div className="pt-2 border-t">
                            {user ? (
                                <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                                        {getInitials(user.name, user.email)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{user.name || user.email || 'My Account'}</p>
                                        <p className="text-sm text-slate-500">Go to Dashboard</p>
                                    </div>
                                </Link>
                            ) : (
                                <Link href="/" className="block">
                                    <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-12 rounded-xl">
                                        <Coins className="h-5 w-5 mr-2" />
                                        Start Earning
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}

export interface BlogSettings {
    googleAnalyticsId?: string
    googleSearchConsoleCode?: string
}

export default function BlogLayout({ children, settings }: { children: React.ReactNode, settings?: BlogSettings }) {
    return (
        <div className="min-h-screen flex flex-col font-sans text-foreground bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            <Head>
                {settings?.googleSearchConsoleCode && (
                    <div dangerouslySetInnerHTML={{ __html: settings.googleSearchConsoleCode.includes('<meta') ? settings.googleSearchConsoleCode : `<meta name="google-site-verification" content="${settings.googleSearchConsoleCode}" />` }} />
                )}
            </Head>
            {settings?.googleAnalyticsId && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`}
                        strategy="afterInteractive"
                    />
                    <Script id="google-analytics" strategy="afterInteractive">
                        {`
                          window.dataLayer = window.dataLayer || [];
                          function gtag(){dataLayer.push(arguments);}
                          gtag('js', new Date());
                          gtag('config', '${settings.googleAnalyticsId}');
                        `}
                    </Script>
                </>
            )}
            <BlogHeader />
            <main className="flex-1">
                {children}
            </main>
            <BlogFooter />

            {/* AI Support Chatbot */}
            <AIChatbot />
        </div>
    )
}
