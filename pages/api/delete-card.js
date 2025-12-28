import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { timestamp, type } = req.body || {}

    if (!timestamp || !type) {
        return res.status(400).json({ error: 'Missing timestamp or type' })
    }

    try {
        const filePath = path.join(process.cwd(), 'data', `${type}_cards.json`)

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Bucket not found' })
        }

        const fileData = fs.readFileSync(filePath, 'utf8')
        const cards = JSON.parse(fileData)

        // Filter out the card with the matching timestamp
        const updatedCards = cards.filter(card => card.timestamp !== timestamp)

        if (cards.length === updatedCards.length) {
            return res.status(404).json({ error: 'Card not found' })
        }

        fs.writeFileSync(filePath, JSON.stringify(updatedCards, null, 2))

        return res.status(200).json({ success: true })
    } catch (err) {
        console.error(`Failed to delete ${type} card:`, err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
