import { NextApiRequest, NextApiResponse } from 'next'

export const allowCors = (handler: Function) => async (req: NextApiRequest, res: NextApiResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // In production, you might want to restrict this to your specific domains
    const allowedOrigins = [
        'https://kojomoney-6e131.web.app',
        'https://kojomoney.web.app',
        'http://localhost:3000'
    ]

    const origin = req.headers.origin

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    return await handler(req, res)
}
