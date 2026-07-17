import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { timestamp, type } = req.body || {}

    if (!timestamp || !type) {
        return res.status(400).json({ error: 'Missing timestamp or type' })
    }

    try {
        // First, fetch the card to get id and receipt_images URLs
        const { data: cardData, error: fetchError } = await supabase
            .from('cards')
            .select('id, receipt_images')
            .match({ timestamp, type })
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is okay
            console.error('Error fetching card for deletion:', fetchError)
        }

        // Delete images from storage by completely wiping the associated card folder
        if (cardData && cardData.id) {
            const folderPath = cardData.id.toString();
            const { data: filesList, error: listError } = await supabase.storage
                .from('card-receipts')
                .list(folderPath);

            if (listError) {
                console.error('Error listing folder contents in storage:', listError);
            } else if (filesList && filesList.length > 0) {
                const filePaths = filesList.map(item => `${folderPath}/${item.name}`);
                const { error: storageError } = await supabase.storage
                    .from('card-receipts')
                    .remove(filePaths);

                if (storageError) {
                    console.error('Error completely deleting image folder from storage:', storageError);
                } else {
                    console.log(`Deleted ${filePaths.length} image(s) from storage for card folder: ${folderPath}`);
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
