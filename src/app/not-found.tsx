import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
            <div className="text-center text-white p-8">
                <h1 className="text-6xl font-bold mb-4">404</h1>
                <h2 className="text-2xl mb-4">Page Not Found</h2>
                <p className="mb-8 text-purple-100">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-100 transition-colors"
                >
                    Go Home
                </Link>
            </div>
        </div>
    )
}
