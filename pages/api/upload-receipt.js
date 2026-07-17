import { supabase } from '../../lib/supabase'

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Allow up to 10MB for image uploads
        },
    },
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { cardId, images } = req.body || {}

    // Validate inputs
    if (!cardId) {
        return res.status(400).json({ error: 'Card ID is required' })
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'At least one image is required' })
    }

    if (images.length > 3) {
        return res.status(400).json({ error: 'Maximum 3 images allowed' })
    }

    try {
        const uploadedUrls = []

        for (let i = 0; i < images.length; i++) {
            const image = images[i]

            // Validate base64 image format
            if (!image.startsWith('data:image/')) {
                return res.status(400).json({ error: `Invalid image format for image ${i + 1}` })
            }

            // Extract base64 data and full mime type
            const matches = image.match(/^data:(image\/[^;]+);base64,(.+)$/)
            if (!matches) {
                return res.status(400).json({ error: `Could not parse image ${i + 1}` })
            }

            const [, fullMimeType, base64Data] = matches
            const buffer = Buffer.from(base64Data, 'base64')

            // Generate unique filename
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(2, 8)
            const ext = fullMimeType.split('/').pop().split('+')[0] || 'img'
            const fileName = `${cardId}/${timestamp}_${randomStr}.${ext}`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('card-receipts')
                .upload(fileName, buffer, {
                    contentType: fullMimeType,
                    upsert: false
                })

            if (uploadError) {
                console.error('Storage upload error:', uploadError)
                return res.status(500).json({ error: `Failed to upload image ${i + 1}: ${uploadError.message}` })
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('card-receipts')
                .getPublicUrl(fileName)

            uploadedUrls.push(publicUrl)
        }

        // Update the card record with the image URLs
        const { error: updateError } = await supabase
            .from('cards')
            .update({ receipt_images: uploadedUrls })
            .eq('id', cardId)

        if (updateError) {
            console.error('Database update error:', updateError)
            return res.status(500).json({ error: `Failed to save image URLs: ${updateError.message}` })
        }

        return res.status(200).json({
            success: true,
            message: 'Images uploaded successfully',
            urls: uploadedUrls
        })

    } catch (err) {
        console.error('Upload receipt error:', err)
        return res.status(500).json({ error: `Upload failed: ${err.message || 'Unknown error'}` })
    }
}
