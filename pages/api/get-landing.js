import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('active_landing_page')
            .eq('id', 1)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No row returned, meaning it hasn't been set yet.
                return res.status(200).json({ active_landing_page: 'visa' })
            }
            throw error
        }

        return res.status(200).json(data)
    } catch (error) {
        console.error('Error fetching landing page settings:', error)
        return res.status(500).json({ error: 'Failed to fetch settings' })
    }
}
