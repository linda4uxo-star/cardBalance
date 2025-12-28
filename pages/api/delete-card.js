import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { timestamp, type } = req.body || {}

    if (!timestamp || !type) {
        return res.status(400).json({ error: 'Missing timestamp or type' })
    }

    try {
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
