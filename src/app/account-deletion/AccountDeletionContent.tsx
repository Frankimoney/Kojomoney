'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Trash2,
    User,
    Mail,
    CheckCircle,
    AlertTriangle,
    Clock,
    Shield,
    Smartphone,
    ArrowRight,
    ExternalLink,
    HelpCircle
} from 'lucide-react'

export default function AccountDeletionContent() {
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

    const faqs = [
        {
            question: "How long does account deletion take?",
            answer: "Account deletion requests are processed within 30 days. Most requests are completed within 7 business days. You will receive an email confirmation once your account has been deleted."
        },
        {
            question: "Can I recover my account after deletion?",
            answer: "No. Account deletion is permanent and cannot be undone. All your data, including points, earnings history, and personal information will be permanently removed from our systems."
        },
        {
            question: "What happens to my pending earnings?",
            answer: "Any pending withdrawals will be processed before account deletion. Unredeemed points will be forfeited. We recommend withdrawing any available balance before requesting deletion."
        },
        {
            question: "What data is retained after deletion?",
            answer: "Some data may be retained for legal compliance purposes, including financial transaction records (up to 7 years as required by law) and fraud prevention records. This retained data is anonymized and cannot be linked back to you."
        },
        {
            question: "Can I create a new account after deletion?",
            answer: "Yes, you may create a new account after deletion. However, you will start fresh with zero points and no history from your previous account."
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            {/* Header */}
            <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">K</span>
                        </div>
                        <span className="font-bold text-xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            KojoMoney
                        </span>
                    </div>
                    <a
                        href="mailto:admin@kojomoney.com?subject=Account%20Deletion%20Request"
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                        Contact Support
                    </a>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-2xl mb-6">
                        <Trash2 className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Account Deletion
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        We respect your right to delete your account and personal data.
                        Learn how to request account deletion through the app or by contacting our support team.
                    </p>
                </motion.div>

                {/* Two Methods Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid md:grid-cols-2 gap-6 mb-12"
                >
                    {/* Method 1: In-App */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-lg shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Option 1</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Delete via App</p>
                            </div>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            If you have the KojoMoney app installed, you can delete your account directly from your profile settings.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    1
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Open KojoMoney App</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Launch the app and log into your account</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    2
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Go to Profile</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Tap on your profile icon or navigate to Settings</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    3
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Select "Delete Account"</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Scroll down to find the account deletion option</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    4
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Confirm Deletion</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Follow the prompts to confirm your request</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Method 2: Email */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-lg shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Option 2</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Contact Admin</p>
                            </div>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            If you cannot access the app or prefer to contact us directly, you can request account deletion via email.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    1
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Send an Email</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Email us at <a href="mailto:admin@kojomoney.com" className="text-blue-600 hover:underline">admin@kojomoney.com</a>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    2
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Use Subject Line</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">"Account Deletion Request"</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    3
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Include Your Details</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Email address registered with your account</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    4
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Await Confirmation</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">We'll process your request within 30 days</p>
                                </div>
                            </div>
                        </div>

                        {/* Email Button */}
                        <a
                            href="mailto:admin@kojomoney.com?subject=Account%20Deletion%20Request&body=Hello%20KojoMoney%20Team%2C%0A%0AI%20would%20like%20to%20request%20the%20deletion%20of%20my%20account.%0A%0AMy%20registered%20email%20address%20is%3A%20%5BYour%20Email%5D%0A%0APlease%20confirm%20once%20my%20account%20and%20data%20have%20been%20deleted.%0A%0AThank%20you."
                            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                        >
                            <Mail className="w-5 h-5" />
                            Send Deletion Request Email
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </motion.div>

                {/* What Gets Deleted Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none mb-8"
                >
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-emerald-500" />
                        What Happens When You Delete Your Account
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Data Deleted */}
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                Data Permanently Deleted
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "Your account profile and username",
                                    "Email address and personal information",
                                    "Points balance and earnings history",
                                    "Referral connections and bonuses",
                                    "Survey and offer completion history",
                                    "App preferences and settings",
                                    "Push notification subscriptions"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Data Retained */}
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Data Retained for Legal Compliance
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "Anonymized transaction records (7 years)",
                                    "Fraud prevention records (if applicable)",
                                    "Legal compliance documentation"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                                        <Clock className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-4 text-sm text-slate-500 dark:text-slate-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                <strong>Note:</strong> Retained data is anonymized and cannot be linked back to your identity.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Processing Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-8 text-white mb-8"
                >
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                        <Clock className="w-6 h-6" />
                        Processing Timeline
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-3xl font-bold">24hrs</p>
                            <p className="text-emerald-100">Request acknowledgment</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-3xl font-bold">7 days</p>
                            <p className="text-emerald-100">Typical processing time</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-3xl font-bold">30 days</p>
                            <p className="text-emerald-100">Maximum processing time</p>
                        </div>
                    </div>
                </motion.div>

                {/* FAQ Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-12"
                >
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <HelpCircle className="w-6 h-6 text-blue-500" />
                        Frequently Asked Questions
                    </h2>

                    <div className="space-y-3">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <span className="font-medium text-slate-900 dark:text-white pr-4">
                                        {faq.question}
                                    </span>
                                    <ArrowRight
                                        className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${expandedFaq === index ? 'rotate-90' : ''
                                            }`}
                                    />
                                </button>
                                {expandedFaq === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="px-5 pb-4"
                                    >
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {faq.answer}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-slate-100 dark:bg-zinc-800/50 rounded-2xl p-6 md:p-8 text-center"
                >
                    <User className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Need Help?
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        If you have any questions about account deletion or your data, our support team is here to help.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="mailto:admin@kojomoney.com"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                        >
                            <Mail className="w-5 h-5" />
                            admin@kojomoney.com
                        </a>
                        <a
                            href="/privacy"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-xl font-medium transition-colors"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Privacy Policy
                        </a>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-zinc-800 mt-12 py-8">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        © {new Date().getFullYear()} KojoMoney. All rights reserved.
                    </p>
                    <div className="flex justify-center gap-6 mt-4">
                        <a href="/privacy" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="/terms" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                            Terms of Service
                        </a>
                        <a href="/gdpr" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                            GDPR Rights
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
