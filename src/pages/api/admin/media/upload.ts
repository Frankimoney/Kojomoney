import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { storage } from '@/lib/firebase-admin'

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb' // Allow larger payloads for videos
        }
    }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!storage) {
        return res.status(500).json({ error: 'Storage not initialized' })
    }

    try {
        const { file: fileData, filename, mimeType } = req.body

        if (!fileData || !filename) {
            return res.status(400).json({ error: 'Missing file data' })
        }

        // Determine if it's video or image
        const isVideo = mimeType?.startsWith('video/')
        const isImage = mimeType?.startsWith('image/')

        if (!isVideo && !isImage) {
            return res.status(400).json({ error: 'Only image and video files are allowed' })
        }

        // Convert base64 to buffer
        // Remove header "data:image/xyz;base64," or "data:video/xyz;base64,"
        const base64Data = fileData.replace(/^data:(image|video)\/[\w+-]+;base64,/, "")
        const buffer = Buffer.from(base64Data, 'base64')

        // Use default bucket or specified one
        const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)

        // Create unique path with folder based on type
        const folder = isVideo ? 'blog-videos' : 'blog-uploads'
        const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `${folder}/${Date.now()}-${safeName}`
        const file = bucket.file(path)

        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
            }
        })

        // Make public
        await file.makePublic()

        // Construct public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`

        return res.status(200).json({
            success: true,
            url: publicUrl,
            type: isVideo ? 'video' : 'image'
        })

    } catch (error: any) {
        console.error('Upload Error:', error)
        return res.status(500).json({ error: error.message || 'Upload failed' })
    }
}

export default requireAdmin(handler, 'editor')
