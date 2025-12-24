import { NextApiRequest, NextApiResponse } from 'next'

export const allowCors = (handler: Function) => async (req: NextApiRequest, res: NextApiResponse) => {
    // Allowed origins for CORS
    const allowedOrigins = [
        'https://kojomoney-6e131.web.app',
        'https://kojomoney.web.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'capacitor://localhost', // Capacitor iOS
        'http://localhost', // Capacitor Android
    ]

    const origin = req.headers.origin

    if (origin && allowedOrigins.includes(origin)) {
        // Known origin: allow with credentials
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
    } else if (origin) {
        // Unknown origin: allow without credentials (for flexibility)
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Credentials', 'false')
    } else {
        // No origin (e.g., server-to-server, curl): allow all
        res.setHeader('Access-Control-Allow-Origin', '*')
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Request-Timestamp, X-Request-Signature'
    )

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    return await handler(req, res)
}
