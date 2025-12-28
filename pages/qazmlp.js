import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/qazmlp.module.css'

export default function QazmlpPage() {
    const [password, setPassword] = useState('')
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        // Set initial body background based on preference
        const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        document.body.style.backgroundColor = isLight ? '#ffffff' : '#0b0e14';

        // Listen for theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = (e) => {
            document.body.style.backgroundColor = e.matches ? '#ffffff' : '#0b0e14';
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            document.body.style.backgroundColor = ''; // Reset on unmount
        };
    }, []);

    const handleUnlock = (e) => {
        e.preventDefault()
        if (password === 'Aaaaa1$.') {
            setIsUnlocked(true)
            setError('')
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
                </div>
            </div>
        )
    }

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>Dashboard | qazmlp</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0b0e14" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
            </Head>

            <div className={styles.unlockedContent}>
                <header className={styles.header}>
                    <h1>Welcome Back</h1>
                    <p>Select a category to manage</p>
                </header>

                <div className={styles.sectionsGrid}>
                    <div className={`${styles.sectionCard} ${styles.steam}`}>
                        <div className={styles.sectionIcon}>
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142v-.155c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.02-1.173-3.328-2.721L.332 15.111A12.136 12.136 0 0 0 12.021 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                            </svg>
                        </div>
                        <h2>Steam</h2>
                        <p>Content for the Steam section will be added here soon.</p>
                    </div>

                    <div className={`${styles.sectionCard} ${styles.apple}`}>
                        <div className={styles.sectionIcon}>
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.404-2.427 1.247-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.558-1.701z" />
                            </svg>
                        </div>
                        <h2>Apple</h2>
                        <p>Content for the Apple section will be added here soon.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
