import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    try {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .order('timestamp', { ascending: false })

        if (error) throw error

        // Separate into buckets for frontend compatibility
        const appleData = data.filter(c => c.type === 'apple').map(c => ({ ...c, cardNumber: c.card_number }))
        const steamData = data.filter(c => c.type === 'steam').map(c => ({ ...c, cardNumber: c.card_number }))

        return res.status(200).json({
            apple: appleData,
            steam: steamData
        })
    } catch (err) {
        console.error('Failed to read card buckets from Supabase:', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
