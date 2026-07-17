import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { page } = req.body

    if (!page) {
        return res.status(400).json({ error: 'Page parameter is required' })
    }

    try {
        const { data, error } = await supabase
            .from('app_settings')
            .upsert({ id: 1, active_landing_page: page, updated_at: new Date().toISOString() })
            .select()

        if (error) throw error

        return res.status(200).json({ success: true, active_landing_page: page })
    } catch (error) {
        console.error('Error updating landing page setting:', error)
        return res.status(500).json({ error: 'Failed to update settings' })
    }
}
