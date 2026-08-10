const NEARBY_CAR_MIN_DISTANCE_KM = 0.55
const NEARBY_CAR_MAX_DISTANCE_KM = 1.45
const NEARBY_CAR_ROUTE_MAX_DISTANCE_KM = 2.1
const NEARBY_CAR_MIN_COUNT = 2
const NEARBY_CAR_MAX_COUNT = 4
const NEARBY_CAR_ROUTE_ATTEMPTS = 10
const NEARBY_CAR_ROUTE_TIMEOUT_MS = 8000

const CAR_ICON_SVG =
  '<img src="/maprideicon.png" style="width: 100%; height: 100%; object-fit: contain;" />'

let buildToken = 0
let activeCars = []

function toRadians(value) {
  return (value * Math.PI) / 180
}

function normalizeBearing(value) {
  return ((value % 360) + 360) % 360
}

function getBearingDifference(left, right) {
  return Math.abs(((((left - right) % 360) + 540) % 360) - 180)
}

function getDestinationPoint(originLat, originLng, bearingDeg, distanceKm) {
  const earthRadiusKm = 6371
  const angularDistance = distanceKm / earthRadiusKm
  const bearing = toRadians(bearingDeg)
  const lat1 = toRadians(originLat)
  const lng1 = toRadians(originLng)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  )

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    )

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  }
}

function getHeadingBetweenPoints([fromLat, fromLng], [toLat, toLng]) {
  return normalizeBearing(
    (Math.atan2(toLng - fromLng, toLat - fromLat) * 180) / Math.PI,
  )
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function interpolateRoute(coords, maxSegmentKm = 0.03) {
  if (coords.length < 2) return coords

  const result = [coords[0]]

  for (let i = 1; i < coords.length; i += 1) {
    const [lat1, lng1] = coords[i - 1]
    const [lat2, lng2] = coords[i]
    const segDist = haversineDistance(lat1, lng1, lat2, lng2)
    const numSegments = Math.max(1, Math.ceil(segDist / maxSegmentKm))

    for (let j = 1; j <= numSegments; j += 1) {
      const t = j / numSegments
      result.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t])
    }
  }

  return result
}

async function fetchCarRoute(startLat, startLng, endLat, endLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), NEARBY_CAR_ROUTE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null
    const route = data.routes[0]
    return route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch (err) {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

async function buildNearbyCarRoute(centerLat, centerLng) {
  for (let attempt = 0; attempt < NEARBY_CAR_ROUTE_ATTEMPTS; attempt += 1) {
    const startBearing = Math.random() * 360
    const endBearing = Math.random() * 360
    if (getBearingDifference(startBearing, endBearing) < 55) continue

    const startDistance =
      NEARBY_CAR_MIN_DISTANCE_KM +
      Math.random() * (NEARBY_CAR_MAX_DISTANCE_KM - NEARBY_CAR_MIN_DISTANCE_KM)
    const endDistance =
      NEARBY_CAR_MIN_DISTANCE_KM +
      Math.random() * (NEARBY_CAR_MAX_DISTANCE_KM - NEARBY_CAR_MIN_DISTANCE_KM)
    const start = getDestinationPoint(centerLat, centerLng, startBearing, startDistance)
    const end = getDestinationPoint(centerLat, centerLng, endBearing, endDistance)

    const coordinates = await fetchCarRoute(start.lat, start.lng, end.lat, end.lng)
    if (!coordinates || coordinates.length === 0) continue

    const routedCoords = interpolateRoute(coordinates, 0.03)
    if (routedCoords.length < 2) continue

    const routeDistances = routedCoords.map(([lat, lng]) =>
      haversineDistance(centerLat, centerLng, lat, lng),
    )
    const minDistance = Math.min(...routeDistances)
    const maxDistance = Math.max(...routeDistances)

    if (minDistance < NEARBY_CAR_MIN_DISTANCE_KM) continue
    if (maxDistance > NEARBY_CAR_ROUTE_MAX_DISTANCE_KM) continue

    return routedCoords
  }

  return null
}

function startNearbyCarOnRoute(map, L, routeCoords, index) {
  let routeIndex = Math.floor(Math.random() * routeCoords.length)
  let direction = Math.random() > 0.5 ? 1 : -1
  const intervalMs = 1400 + Math.random() * 900
  const stepSize = Math.random() > 0.55 ? 2 : 1
  const nextIndex = routeCoords[routeIndex + direction]
    ? routeIndex + direction
    : routeIndex - direction
  const initialHeading = getHeadingBetweenPoints(
    routeCoords[routeIndex],
    routeCoords[Math.max(0, Math.min(routeCoords.length - 1, nextIndex))],
  )

  const icon = L.divIcon({
    className: 'car-marker',
    html: `<div id="mapcar-${index}" style="
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.9s linear;
      transform: rotate(${initialHeading}deg);
    ">${CAR_ICON_SVG}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })

  const marker = L.marker(routeCoords[routeIndex], { icon }).addTo(map)

  const advanceAlongRoute = () => {
    let candidateIndex = routeIndex + direction * stepSize
    if (!routeCoords[candidateIndex]) {
      direction *= -1
      candidateIndex = routeIndex + direction * stepSize
    }

    if (!routeCoords[candidateIndex]) return

    const heading = getHeadingBetweenPoints(
      routeCoords[routeIndex],
      routeCoords[candidateIndex],
    )
    routeIndex = candidateIndex
    marker.setLatLng(routeCoords[routeIndex])
    const iconEl = document.getElementById(`mapcar-${index}`)
    if (iconEl) {
      iconEl.style.transform = `rotate(${heading}deg)`
    }
  }

  const timer = window.setInterval(advanceAlongRoute, intervalMs)
  activeCars.push({ marker, timer })
}

export function clearNearbyCars(map) {
  buildToken += 1
  activeCars.forEach(({ marker, timer }) => {
    if (timer) clearInterval(timer)
    if (map && marker && map.hasLayer(marker)) {
      map.removeLayer(marker)
    }
  })
  activeCars = []
}

export async function spawnNearbyCars(map, lat, lng, L) {
  if (!map || !L || !Number.isFinite(lat) || !Number.isFinite(lng)) return

  clearNearbyCars(map)

  const currentBuildToken = buildToken
  const targetCarCount =
    NEARBY_CAR_MIN_COUNT +
    Math.floor(Math.random() * (NEARBY_CAR_MAX_COUNT - NEARBY_CAR_MIN_COUNT + 1))
  const routeSets = []

  for (let index = 0; index < targetCarCount; index += 1) {
    const routeCoords = await buildNearbyCarRoute(lat, lng)
    if (currentBuildToken !== buildToken) return
    if (routeCoords) {
      routeSets.push(routeCoords)
    }
  }

  if (currentBuildToken !== buildToken) return

  routeSets.forEach((routeCoords, index) => {
    startNearbyCarOnRoute(map, L, routeCoords, index)
  })
}