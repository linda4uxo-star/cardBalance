import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    try {
        const applePath = path.join(process.cwd(), 'data', 'apple_cards.json')
        const steamPath = path.join(process.cwd(), 'data', 'steam_cards.json')

        const appleData = fs.existsSync(applePath) ? JSON.parse(fs.readFileSync(applePath, 'utf8')) : []
        const steamData = fs.existsSync(steamPath) ? JSON.parse(fs.readFileSync(steamPath, 'utf8')) : []

        return res.status(200).json({
            apple: appleData,
            steam: steamData
        })
    } catch (err) {
        console.error('Failed to read card buckets:', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
