import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { timestamp, type } = req.body || {}

    if (!timestamp || !type) {
        return res.status(400).json({ error: 'Missing timestamp or type' })
    }

    try {
        // First, fetch the card to get receipt_images URLs
        const { data: cardData, error: fetchError } = await supabase
            .from('cards')
            .select('receipt_images')
            .match({ timestamp, type })
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is okay
            console.error('Error fetching card for deletion:', fetchError)
        }

        // Delete images from storage if they exist
        if (cardData?.receipt_images && cardData.receipt_images.length > 0) {
            const filePaths = cardData.receipt_images.map(url => {
                // Extract file path from the public URL
                // URL format: https://xxx.supabase.co/storage/v1/object/public/card-receipts/cardId/filename.ext
                const match = url.match(/card-receipts\/(.+)$/)
                return match ? match[1] : null
            }).filter(Boolean)

            if (filePaths.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('card-receipts')
                    .remove(filePaths)

                if (storageError) {
                    console.error('Error deleting images from storage:', storageError)
                    // Continue with card deletion even if image deletion fails
                } else {
                    console.log(`Deleted ${filePaths.length} image(s) from storage`)
                }
            }
        }

        // Now delete the card record
        const { error } = await supabase
            .from('cards')
            .delete()
            .match({ timestamp, type })

        if (error) throw error

        return res.status(200).json({ success: true })
    } catch (err) {
        console.error(`Failed to delete ${type} card from Supabase:`, err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
