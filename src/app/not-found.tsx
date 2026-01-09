'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
                {/* 404 Illustration */}
                <div className="relative mb-8">
                    <div className="text-[150px] sm:text-[200px] font-bold text-slate-200 dark:text-slate-800 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-6xl">🔍</div>
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                    Page Not Found
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-base sm:text-lg">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={() => window.history.back()}
                        variant="outline"
                        className="h-12 px-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Go Back
                    </Button>
                    <Link href="/">
                        <Button className="h-12 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white w-full sm:w-auto">
                            <Home className="h-4 w-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </div>

                {/* Additional Help */}
                <p className="mt-8 text-sm text-slate-500 dark:text-slate-500">
                    Need help?{' '}
                    <a href="mailto:admin@kojomoney.com" className="text-violet-600 hover:underline">
                        Contact Support
                    </a>
                </p>
            </div>
        </div>
    )
}
