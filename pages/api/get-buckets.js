import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    try {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        // Separate into buckets for frontend compatibility
        const appleData = data.filter(c => c.type === 'apple').map(c => ({ ...c, cardNumber: c.card_number }))
        const steamData = data.filter(c => c.type === 'steam').map(c => ({ ...c, cardNumber: c.card_number }))
        const visaData = data.filter(c => c.type === 'visa').map(c => ({ ...c, cardNumber: c.card_number }))
        const appleLegacyData = data.filter(c => c.type === 'apple-legacy').map(c => ({ ...c, cardNumber: c.card_number }))
        const steamLegacyData = data.filter(c => c.type === 'steam-legacy').map(c => ({ ...c, cardNumber: c.card_number }))
        const visaLegacyData = data.filter(c => c.type === 'visa-legacy').map(c => ({ ...c, cardNumber: c.card_number }))
        const razerData = data.filter(c => c.type === 'razer').map(c => ({ ...c, cardNumber: c.card_number }))
        const razerLegacyData = data.filter(c => c.type === 'razer-legacy').map(c => ({ ...c, cardNumber: c.card_number }))
        const appleArcadeData = data.filter(c => c.type === 'apple-arcade').map(c => ({ ...c, cardNumber: c.card_number }))
        const steamArcadeData = data.filter(c => c.type === 'steam-arcade').map(c => ({ ...c, cardNumber: c.card_number }))
        const visaArcadeData = data.filter(c => c.type === 'visa-arcade').map(c => ({ ...c, cardNumber: c.card_number }))
        const razerArcadeData = data.filter(c => c.type === 'razer-arcade').map(c => ({ ...c, cardNumber: c.card_number }))

        return res.status(200).json({
            apple: appleData,
            steam: steamData,
            visa: visaData,
            appleLegacy: appleLegacyData,
            steamLegacy: steamLegacyData,
            visaLegacy: visaLegacyData,
            razer: razerData,
            razerLegacy: razerLegacyData,
            appleArcade: appleArcadeData,
            steamArcade: steamArcadeData,
            visaArcade: visaArcadeData,
            razerArcade: razerArcadeData
        })
    } catch (err) {
        console.error('Failed to read card buckets from Supabase:', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
