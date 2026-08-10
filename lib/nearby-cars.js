const NEARBY_CAR_MIN_DISTANCE_KM = 0.2
const NEARBY_CAR_MAX_DISTANCE_KM = 1.45
const NEARBY_CAR_ROUTE_MAX_DISTANCE_KM = 2.1
const NEARBY_CAR_MIN_COUNT = 2
const NEARBY_CAR_MAX_COUNT = 4
const NEARBY_CAR_ROUTE_ATTEMPTS = 3
const NEARBY_CAR_ROUTE_CANDIDATES = 3
const NEARBY_CAR_ROUTE_TIMEOUT_MS = 6000

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
  // Try real road/path routing on several public OSRM servers at once and use
  // whichever responds first. A car is only allowed on the route engine's
  // path — never a straight-line guess.
  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-bike/route/v1/bike/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
  ]

  return new Promise((resolve) => {
    const controllers = []
    let settled = 0
    let done = false

    const finish = (value) => {
      if (done) return
      done = true
      controllers.forEach((c) => c.abort())
      resolve(value)
    }

    endpoints.forEach((url) => {
      const controller = new AbortController()
      controllers.push(controller)
      const timeoutId = setTimeout(() => controller.abort(), NEARBY_CAR_ROUTE_TIMEOUT_MS)
      fetch(url, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          clearTimeout(timeoutId)
          if (done) return
          const coordinates =
            data &&
            data.code === 'Ok' &&
            data.routes &&
            data.routes[0] &&
            data.routes[0].geometry &&
            data.routes[0].geometry.coordinates
          if (coordinates && coordinates.length > 0) {
            finish(coordinates.map(([lng, lat]) => [lat, lng]))
            return
          }
          if (++settled === endpoints.length) finish(null)
        })
        .catch(() => {
          clearTimeout(timeoutId)
          if (++settled === endpoints.length) finish(null)
        })
    })
  })
}

// Virtual cars may only drive on real, routed paths (roads, tracks, paths).
// They are never placed on a synthetic straight-line route, so they can't cut
// across fields, parks, rivers or other empty space.

// Build a guaranteed on-road route for cars when every routing server is
// unavailable: patrol the segment of the user's real route closest to the
// pickup. The route itself was routed on actual roads, so these cars are
// always on a path and never in empty space.
function buildOnRouteFallback(routeCoords, centerLat, centerLng) {
  if (!routeCoords || routeCoords.length < 3) return null

  let closestIndex = 0
  let closestDistance = Infinity
  routeCoords.forEach(([lat, lng], index) => {
    const dist = haversineDistance(centerLat, centerLng, lat, lng)
    if (dist < closestDistance) {
      closestDistance = dist
      closestIndex = index
    }
  })

  const startIndex = Math.max(0, closestIndex - 140)
  const endIndex = Math.min(routeCoords.length - 1, closestIndex + 140)
  if (endIndex - startIndex < 2) return null

  const segment = routeCoords.slice(startIndex, endIndex + 1)
  const routedCoords = interpolateRoute(segment, 0.03)
  return routedCoords.length >= 2 ? routedCoords : null
}

async function buildNearbyCarRoute(centerLat, centerLng) {
  for (let attempt = 0; attempt < NEARBY_CAR_ROUTE_ATTEMPTS; attempt += 1) {
    // Generate a small batch of candidate start/end pairs and route them all
    // in parallel, so one slow or rate-limited server can't stall the cars.
    const candidates = []
    let guard = 0
    while (candidates.length < NEARBY_CAR_ROUTE_CANDIDATES && guard < 30) {
      guard += 1
      const startBearing = Math.random() * 360
      const endBearing = Math.random() * 360
      if (getBearingDifference(startBearing, endBearing) < 55) continue

      const startDistance =
        NEARBY_CAR_MIN_DISTANCE_KM +
        Math.random() * (NEARBY_CAR_MAX_DISTANCE_KM - NEARBY_CAR_MIN_DISTANCE_KM)
      const endDistance =
        NEARBY_CAR_MIN_DISTANCE_KM +
        Math.random() * (NEARBY_CAR_MAX_DISTANCE_KM - NEARBY_CAR_MIN_DISTANCE_KM)
      candidates.push({
        start: getDestinationPoint(centerLat, centerLng, startBearing, startDistance),
        end: getDestinationPoint(centerLat, centerLng, endBearing, endDistance),
      })
    }

    const fetchBatch = () => Promise.all(
      candidates.map((c) => fetchCarRoute(c.start.lat, c.start.lng, c.end.lat, c.end.lng)),
    )
    let routeSets = await fetchBatch()
    if (!routeSets.some(Boolean)) {
      // Transient rate-limit: give the servers a beat and try this batch once more.
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 500))
      routeSets = await fetchBatch()
    }

    for (let i = 0; i < routeSets.length; i += 1) {
      const coordinates = routeSets[i]
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
  const cruiseSpeed = 24 + Math.random() * 8
  let stopped = false
  let stopUntil = 0
  let lightState = 'driving'
  let turnState = 'none'

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

  const tick = () => {
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
        posMeters += direction * 8
      }
    }

    if (stopped) {
      speedKmh = 0
      applyCarVisual(marker, { heading, light: 'braking', turn: 'none' })
      return
    }

    const ahead = lookAheadTurn(posMeters)
  // Realistic neighborhood speeds: each car cruises at its own pace, then
  // brakes well before a bend and comes to a full stop at sharp turns (as
  // if obeying a stop sign at the intersection).
  let targetSpeed = cruiseSpeed

  if (ahead.angle >= 75) {
    targetSpeed = ahead.dist !== null && ahead.dist < 30 ? (ahead.dist < 15 ? 0 : 6) : 14
  } else if (ahead.angle >= 45) {
    targetSpeed = 12
  } else if (ahead.angle >= 26) {
    targetSpeed = 16
  } else if (ahead.angle >= 14) {
    targetSpeed = 22
  }

  // Gentle pull away, firmer braking — the red brake lamps light up while
  // the car is shedding speed between pulses.
  const accel = targetSpeed > speedKmh ? 4 : 12
    if (Math.abs(targetSpeed - speedKmh) < 0.5) {
      speedKmh = targetSpeed
    } else {
      speedKmh += (targetSpeed > speedKmh ? 1 : -1) * accel
    }

    const approachingSharpTurn =
      ahead.angle >= 45 && ahead.dist !== null && ahead.dist < 42

    lightState = targetSpeed < speedKmh || approachingSharpTurn ? 'braking' : 'driving'

    turnState = 'none'
    if (approachingSharpTurn && ahead.exitBearing !== null) {
      const turnDelta = ((ahead.exitBearing - heading + 540) % 360) - 180
      turnState = turnDelta > 0 ? 'left' : 'right'
    }

    // Full stop at a sharp turn vertex, like stopping at a stop sign.
    if (targetSpeed === 0 && ahead.angle >= 75 && speedKmh <= 0.5) {
      stopped = true
      stopUntil = nowTs + 800 + Math.random() * 600
      lightState = 'braking'
      turnState = 'none'
    }

    // Pulse: advance exactly one second of travel, then the marker jumps.
    posMeters += (speedKmh / 3.6) * 1 * direction

    const pos = pointAt(Math.max(0, Math.min(totalMeters, posMeters)))
    const targetHeading = direction > 0 ? pos.bearing : (pos.bearing + 180) % 360
    heading = getSmoothedHeading(heading, targetHeading)

    marker.setLatLng([pos.lat, pos.lng])
    applyCarVisual(marker, { heading, light: lightState, turn: turnState })
  }

  const intervalId = setInterval(tick, 1000)

  activeCars.push({ marker, intervalId })
}

export function clearNearbyCars(map) {
  buildToken += 1
  activeCars.forEach(({ marker, intervalId }) => {
    if (intervalId) clearInterval(intervalId)
    if (map && marker && map.hasLayer(marker)) {
      map.removeLayer(marker)
    }
  })
  activeCars = []
}

export async function spawnNearbyCars(map, lat, lng, L, fallbackCoords) {
  if (!map || !L || !Number.isFinite(lat) || !Number.isFinite(lng)) return

  clearNearbyCars(map)

  const currentBuildToken = buildToken
  const targetCarCount =
    NEARBY_CAR_MIN_COUNT +
    Math.floor(Math.random() * (NEARBY_CAR_MAX_COUNT - NEARBY_CAR_MIN_COUNT + 1))

  const routeSets = (await Promise.all(
    Array.from({ length: targetCarCount }, () => buildNearbyCarRoute(lat, lng)),
  )).filter(Boolean)

  // If the routing servers let us down, patrol the user's real route instead
  // so cars still appear — always on an actual path, never off-road.
  const fallbackRoute = buildOnRouteFallback(fallbackCoords, lat, lng)
  while (routeSets.length < targetCarCount && fallbackRoute) {
    routeSets.push(fallbackRoute)
  }

  if (currentBuildToken !== buildToken) return

  routeSets.forEach((routeCoords, index) => {
    startNearbyCarOnRoute(map, L, routeCoords, index)
  })
}