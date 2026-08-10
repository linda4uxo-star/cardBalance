const NEARBY_CAR_MIN_DISTANCE_KM = 0.55
const NEARBY_CAR_MAX_DISTANCE_KM = 1.45
const NEARBY_CAR_ROUTE_MAX_DISTANCE_KM = 2.1
const NEARBY_CAR_MIN_COUNT = 2
const NEARBY_CAR_MAX_COUNT = 4
const NEARBY_CAR_ROUTE_ATTEMPTS = 10
const NEARBY_CAR_ROUTE_TIMEOUT_MS = 9000

const CAR_ICON_SIZE = 44

const CAR_ICON_HTML = `
  <img src="/maprideicon.png" style="width:100%;height:100%;object-fit:contain;" />
  <span class="car-lamp car-brake-lamp car-brake-left"></span>
  <span class="car-lamp car-brake-lamp car-brake-right"></span>
  <span class="car-lamp car-turn-lamp car-turn-left"></span>
  <span class="car-lamp car-turn-lamp car-turn-right"></span>
`

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

function getSmoothedHeading(currentRotation, nextBearing) {
  if (!Number.isFinite(nextBearing)) return currentRotation || 0
  if (!Number.isFinite(currentRotation)) return nextBearing
  const currentNormalized = ((currentRotation % 360) + 360) % 360
  const delta = ((nextBearing - currentNormalized + 540) % 360) - 180
  return currentRotation + delta
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
  // Try real road/path routing on several public OSRM servers. A car is only
  // allowed on the route engine's path — never a straight-line guess.
  const servers = [
    `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-bike/route/v1/bike/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
  ]

  for (let i = 0; i < servers.length; i += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), NEARBY_CAR_ROUTE_TIMEOUT_MS)
    try {
      const res = await fetch(servers[i], { signal: controller.signal })
      if (!res.ok) {
        clearTimeout(timeoutId)
        continue
      }
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        clearTimeout(timeoutId)
        continue
      }
      const route = data.routes[0]
      clearTimeout(timeoutId)
      if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
        continue
      }
      return route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    } catch (err) {
      clearTimeout(timeoutId)
      // Fall through to the next server.
    }
  }

  return null
}

// Virtual cars may only drive on real, routed paths (roads, tracks, paths).
// They are never placed on a synthetic straight-line route, so they can't cut
// across fields, parks, rivers or other empty space.

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

  // No routed path found nearby: skip this car rather than park it off-road.
  return null
}

function applyCarVisual(marker, { heading = null, light = 'driving', turn = 'none' } = {}) {
  const shell = marker && marker.getElement
    ? marker.getElement().querySelector('.car-icon-shell')
    : null
  if (!shell) return
  if (Number.isFinite(heading)) {
    shell.style.transform = `rotate(${heading}deg)`
  }
  shell.dataset.light = light
  shell.dataset.turn = turn
}

function startNearbyCarOnRoute(map, L, routeCoords, index) {
  const totalPoints = routeCoords.length
  const cumulative = []
  let totalMeters = 0
  const bearings = []

  for (let i = 0; i < totalPoints - 1; i += 1) {
    const [lat1, lng1] = routeCoords[i]
    const [lat2, lng2] = routeCoords[i + 1]
    const segMeters = haversineDistance(lat1, lng1, lat2, lng2) * 1000
    totalMeters += segMeters
    cumulative.push(totalMeters)
    bearings.push(getHeadingBetweenPoints(routeCoords[i], routeCoords[i + 1]))
  }
  if (totalMeters < 1) return

  const icon = L.divIcon({
    className: 'car-marker',
    html: `<div class="car-icon-shell" style="width:${CAR_ICON_SIZE}px;height:${CAR_ICON_SIZE}px;">${CAR_ICON_HTML}</div>`,
    iconSize: [CAR_ICON_SIZE, CAR_ICON_SIZE],
    iconAnchor: [CAR_ICON_SIZE / 2, CAR_ICON_SIZE / 2],
  })

  const marker = L.marker(routeCoords[0], { icon }).addTo(map)

  let direction = Math.random() > 0.5 ? 1 : -1
  let posMeters = Math.random() * totalMeters
  let heading = bearings[0]
  let speedKmh = 0
  let stopped = false
  let stopUntil = 0
  let lightState = 'driving'
  let turnState = 'none'
  let lastNow = 0
  let rafId = null

  const pointAt = (meters) => {
    let segIndex = 0
    while (segIndex < cumulative.length - 1 && meters > cumulative[segIndex]) {
      segIndex += 1
    }
    const segStart = segIndex === 0 ? 0 : cumulative[segIndex - 1]
    const segLen = cumulative[segIndex] - segStart
    const t = segLen > 0 ? Math.max(0, Math.min(1, (meters - segStart) / segLen)) : 0
    return {
      lat: routeCoords[segIndex][0] + (routeCoords[segIndex + 1][0] - routeCoords[segIndex][0]) * t,
      lng: routeCoords[segIndex][1] + (routeCoords[segIndex + 1][1] - routeCoords[segIndex][1]) * t,
      bearing: bearings[segIndex],
    }
  }

  const lookAheadTurn = (meters) => {
    const lookMeters = 90
    let bestAngle = 0
    let bestDist = null
    let bestExitBearing = null

    for (let i = 0; i < cumulative.length - 1; i += 1) {
      const segCenter = i === 0 ? cumulative[0] / 2 : (cumulative[i - 1] + cumulative[i]) / 2
      const distFromPos = Math.abs(segCenter - meters)
      if (distFromPos > lookMeters) continue
      const angle = getBearingDifference(bearings[i], bearings[i + 1])
      if (angle > bestAngle) {
        bestAngle = angle
        bestDist = distFromPos
        bestExitBearing = bearings[i + 1]
        if (bestAngle >= 80) break
      }
    }

    return { angle: bestAngle, dist: bestDist, exitBearing: bestExitBearing }
  }

  const tick = (now) => {
    if (!lastNow) lastNow = now
    const dt = Math.min(0.1, (now - lastNow) / 1000)
    lastNow = now

    const nowTs = performance.now()

    // Hit either end of the route: brake, pause, then drive back the other way.
    if (posMeters >= totalMeters || posMeters <= 0) {
      posMeters = Math.max(0, Math.min(totalMeters, posMeters))
      if (!stopped) {
        stopped = true
        stopUntil = nowTs + 900 + Math.random() * 800
        lightState = 'braking'
        turnState = 'none'
      } else if (nowTs >= stopUntil) {
        stopped = false
        direction = direction > 0 ? -1 : 1
        posMeters += direction * 0.6
      }
    }

    if (stopped) {
      speedKmh = 0
      applyCarVisual(marker, { heading, light: 'braking', turn: 'none' })
      return
    }

    const ahead = lookAheadTurn(posMeters)
    let targetSpeed = 46

    if (ahead.angle >= 75) {
      targetSpeed = ahead.dist !== null && ahead.dist < 28 ? 0 : 10
    } else if (ahead.angle >= 45) {
      targetSpeed = 16
    } else if (ahead.angle >= 26) {
      targetSpeed = 24
    } else if (ahead.angle >= 14) {
      targetSpeed = 34
    }

    // Smooth acceleration/deceleration toward the target speed.
    const accel = targetSpeed > speedKmh ? 9 : 16
    if (Math.abs(targetSpeed - speedKmh) < accel * dt) {
      speedKmh = targetSpeed
    } else {
      speedKmh += (targetSpeed > speedKmh ? 1 : -1) * accel * dt
    }

    const approachingSharpTurn =
      ahead.angle >= 45 && ahead.dist !== null && ahead.dist < 42

    lightState = targetSpeed < speedKmh || approachingSharpTurn ? 'braking' : 'driving'

    turnState = 'none'
    if (approachingSharpTurn && ahead.exitBearing !== null) {
      const turnDelta = ((ahead.exitBearing - heading + 540) % 360) - 180
      turnState = turnDelta > 0 ? 'left' : 'right'
    }

    // Full stop at a sharp turn vertex, like waiting at an intersection.
    if (targetSpeed === 0 && approachingSharpTurn && speedKmh <= 0.5) {
      stopped = true
      stopUntil = nowTs + 700 + Math.random() * 500
      lightState = 'braking'
      turnState = 'none'
    }

    posMeters += (speedKmh / 3.6) * dt * direction

    const pos = pointAt(Math.max(0, Math.min(totalMeters, posMeters)))
    const targetHeading = direction > 0 ? pos.bearing : (pos.bearing + 180) % 360
    heading = getSmoothedHeading(heading, targetHeading)

    marker.setLatLng([pos.lat, pos.lng])
    applyCarVisual(marker, { heading, light: lightState, turn: turnState })
  }

  const loop = (now) => {
    tick(now)
    rafId = window.requestAnimationFrame(loop)
  }
  rafId = window.requestAnimationFrame(loop)

  activeCars.push({ marker, rafId })
}

export function clearNearbyCars(map) {
  buildToken += 1
  activeCars.forEach(({ marker, rafId }) => {
    if (rafId) cancelAnimationFrame(rafId)
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