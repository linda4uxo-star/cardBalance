import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/qazmlp.module.css'
import { supabase } from '../lib/supabase'

export default function QazmlpPage() {
    const [password, setPassword] = useState('')
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [error, setError] = useState('')
    const [showBiometricOptIn, setShowBiometricOptIn] = useState(false)
    const [biometricsAvailable, setBiometricsAvailable] = useState(false)
    const [allCards, setAllCards] = useState([])
    const [isEditing, setIsEditing] = useState(false)
    const [holdTimeout, setHoldTimeout] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const [startY, setStartY] = useState(0)

    const fetchBuckets = async (isManual = false) => {
        if (isManual) setIsRefreshing(true)
        try {
            const res = await fetch('/api/get-buckets')
            const data = await res.json()
            if (res.ok) {
                // Flatten and sort cards by created_at
                const combined = [
                    ...data.apple.map(c => ({ ...c, type: 'apple' })),
                    ...data.steam.map(c => ({ ...c, type: 'steam' }))
                ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                setAllCards(combined)
            }
        } catch (err) {
            console.error('Failed to fetch buckets:', err)
        } finally {
            if (isManual) {
                setTimeout(() => setIsRefreshing(false), 600)
            }
        }
    }

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            setStartY(e.touches[0].pageY)
        }
    }

    const handleTouchMove = (e) => {
        if (startY > 0) {
            const currentY = e.touches[0].pageY
            const diff = currentY - startY
            if (diff > 0) {
                // Apply custom resistance
                const distance = Math.min(diff * 0.4, 80)
                setPullDistance(distance)
            }
        }
    }

    const handleTouchEnd = () => {
        if (pullDistance > 60) {
            fetchBuckets(true)
        }
        setPullDistance(0)
        setStartY(0)
    }

    const handleDelete = async (card) => {
        try {
            const res = await fetch('/api/delete-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamp: card.timestamp, type: card.type })
            })
            if (res.ok) {
                fetchBuckets()
            }
        } catch (err) {
            console.error('Failed to delete card:', err)
        } finally {
            setDeletingId(null)
            setConfirmDeleteId(null)
        }
    }

    const handleTapToDelete = (card) => {
        if (confirmDeleteId === card.timestamp) {
            setDeletingId(card.timestamp)
            handleDelete(card)
        } else {
            setConfirmDeleteId(card.timestamp)
            // Cancel confirmation after 2 seconds if not tapped again
            setTimeout(() => {
                setConfirmDeleteId(prev => prev === card.timestamp ? null : prev)
            }, 2000)
        }
    }

    useEffect(() => {
        // Set initial body background based on preference
        const isLight = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
        document.body.style.backgroundColor = isLight ? '#ffffff' : '#0b0e14';

        // Check if biometrics are available and enabled
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setBiometricsAvailable(true)
            const enabled = localStorage.getItem('biometricsEnabled') === 'true'
            if (enabled && !isUnlocked) {
                setTimeout(() => handleBiometricUnlock(), 500)
            }
        }

        if (isUnlocked) {
            fetchBuckets()

            // Set up real-time subscription
            const subscription = supabase
                .channel('cards_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => {
                    fetchBuckets()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(subscription)
            }
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = (e) => {
            document.body.style.backgroundColor = e.matches ? '#ffffff' : '#0b0e14';
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            document.body.style.backgroundColor = '';
        };
    }, [isUnlocked]);

    const handleBiometricUnlock = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const credentialIdStr = localStorage.getItem('biometricCredentialId');
            if (!credentialIdStr) return;

            const credentialId = Uint8Array.from(atob(credentialIdStr), c => c.charCodeAt(0));

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: credentialId,
                        type: 'public-key',
                        transports: ['internal']
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            if (assertion) {
                setIsUnlocked(true)
                setError('')
            }
        } catch (err) {
            console.error('Biometric authentication failed:', err)
            // Don't show error for cancel
            if (err.name !== 'NotAllowedError') {
                setError('Biometric authentication failed. Please use your password.')
            }
        }
    }

    const handleEnableBiometrics = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const userID = new Uint8Array(16);
            window.crypto.getRandomValues(userID);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: "cardBalance" },
                    user: {
                        id: userID,
                        name: "user@cardbalance",
                        displayName: "CardBalance User"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                const idBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
                localStorage.setItem('biometricCredentialId', idBase64);
                localStorage.setItem('biometricsEnabled', 'true');
                setShowBiometricOptIn(false);
            }
        } catch (err) {
            console.error('Failed to enable biometrics:', err);
            setShowBiometricOptIn(false);
        }
    }

    const handleUnlock = (e) => {
        e.preventDefault()
        if (password === 'Aaaaa1$.') {
            setIsUnlocked(true)
            setError('')

            // Check if we should offer biometrics
            const enabled = localStorage.getItem('biometricsEnabled') === 'true'
            const declined = localStorage.getItem('biometricsDeclined') === 'true'
            if (biometricsAvailable && !enabled && !declined) {
                setShowBiometricOptIn(true)
            }
        } else {
            setError('Incorrect password. Please try again.')
            setPassword('')
        }
    }

    if (!isUnlocked) {
        return (
            <div className={styles.pageContainer}>
                <Head>
                    <title>Access Required</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                    <meta name="theme-color" content="#0b0e14" media="(prefers-color-scheme: dark)" />
                    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
                </Head>

                <div className={styles.passwordGate}>
                    <h1>Protected Area</h1>
                    <form onSubmit={handleUnlock}>
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

                    {biometricsAvailable && localStorage.getItem('biometricsEnabled') === 'true' && (
                        <button onClick={handleBiometricUnlock} className={styles.biometricBtn}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                            </svg>
                            Unlock with Biometrics
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            className={styles.pageContainer}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <Head>
                <title>Dashboard | qazmlp</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0b0e14" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
            </Head>

            {pullDistance > 0 && (
                <div className={styles.pullIndicator} style={{ height: `${pullDistance}px`, opacity: pullDistance / 80 }}>
                    <svg className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"></path>
                        <path d="M1 20v-6h6"></path>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                </div>
            )}

            {showBiometricOptIn && (
                <div className={styles.biometricModalOverlay}>
                    <div className={styles.biometricModal}>
                        <h2>Enable Biometrics?</h2>
                        <p>Would you like to use Face ID or Touch ID for future access to this page?</p>
                        <div className={styles.modalActions}>
                            <button className={styles.enableBtn} onClick={handleEnableBiometrics}>
                                Enable Biometrics
                            </button>
                            <button className={styles.skipBtn} onClick={() => {
                                setShowBiometricOptIn(false);
                                localStorage.setItem('biometricsDeclined', 'true');
                            }}>
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.unlockedContent}>
                <header className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h1>Welcome back</h1>
                        <p>Select a category to manage</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            className={`${styles.refreshBtn} ${isRefreshing ? styles.active : ''}`}
                            onClick={() => fetchBuckets(true)}
                            aria-label="Refresh cards"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
                        <button
                            className={`${styles.editBtn} ${isEditing ? styles.active : ''}`}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </button>
                    </div>
                </header>

                <div className={styles.cardGrid}>
                    {allCards.length > 0 ? (
                        allCards.map((card, idx) => (
                            <div
                                key={idx}
                                className={`${styles.codeCard} ${isEditing ? styles.isEditing : ''}`}
                            >
                                <div className={styles.cardTop}>
                                    <div className={styles.typeBadge}>
                                        {card.type === 'apple' ? (
                                            <>
                                                <img src="/appleIcon.png" alt="Apple" />
                                                <span>Apple Card</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142v-.155c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.02-1.173-3.328-2.721L.332 15.111A12.136 12.136 0 0 0 12.021 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                                                </svg>
                                                <span>Steam Card</span>
                                            </>
                                        )}
                                    </div>
                                    <span className={styles.timestamp}>
                                        {new Date(card.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={styles.cardCode}>{card.cardNumber}</div>

                                {isEditing && (
                                    <div className={styles.deleteOverlay}>
                                        <button
                                            className={`${styles.deleteBtn} ${confirmDeleteId === card.timestamp ? styles.confirming : ''} ${deletingId === card.timestamp ? styles.deleting : ''}`}
                                            onClick={() => handleTapToDelete(card)}
                                        >
                                            {deletingId === card.timestamp ? 'Deleting...' : (confirmDeleteId === card.timestamp ? 'Tap again to delete' : 'Delete')}
                                        </button>
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
        </div>
    )
}
