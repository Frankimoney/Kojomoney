import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <h2 className="text-4xl font-bold mb-4">404 - Not Found</h2>
            <p className="mb-6 text-slate-400">Could not find request resource</p>
            <Link
                href="/"
                className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
                Return Home
            </Link>
        </div>
    )
}
