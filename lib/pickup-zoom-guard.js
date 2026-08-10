/**
 * Pickup-privacy zoom guard.
 * Keeps the pickup location unreadable on maps that show a shared trip route:
 * - Full zoom is allowed only while the pickup point is OUTSIDE the viewport
 *   (e.g. when the viewer is zoomed into the drop-off area).
 * - As soon as the pickup point enters the viewport (or the viewer zooms
 *   while it is visible), the map is pulled back to `maxPickupZoom`,
 *   so the pickup can never be inspected at street level.
 */
export function createPickupZoomGuard(
  map,
  pickup,
  { maxPickupZoom = 15, onEnforced = null } = {},
) {
  if (
    !map
    || !pickup
    || !Number.isFinite(Number(pickup.lat))
    || !Number.isFinite(Number(pickup.lng))
  ) {
    return () => {}
  }

  let disposed = false

  const isPickupInView = () => (
    map.getBounds().contains([Number(pickup.lat), Number(pickup.lng)])
  )

  const isZoomAllowed = () => (
    map.getZoom() <= maxPickupZoom || !isPickupInView()
  )

  const enforce = (animate) => {
    if (disposed || isZoomAllowed()) return
    map.setView(map.getCenter(), maxPickupZoom, { animate })
    if (typeof onEnforced === 'function') onEnforced()
  }

  // Clamp the zoom through Leaflet's own move pipeline (no tile reload),
  // so the map stays fully visible while it is fighting the zoom-in.
  const clampZoom = () => {
    if (disposed || isZoomAllowed()) return
    if (typeof map._move === 'function') {
      map._move(map.getCenter(), maxPickupZoom, { pinch: true, round: false }, undefined)
      return
    }
    map.setView(map.getCenter(), maxPickupZoom, { animate: false })
    if (typeof onEnforced === 'function') onEnforced()
  }

  // Continuous enforcement: react mid-gesture so the pickup can never
  // be seen or approached at a zoomed-in level, even while zooming/panning.
  const handleZoom = () => clampZoom()
  const handleMove = () => clampZoom()
  const handleZoomEnd = () => enforce(false)
  const handleMoveEnd = () => enforce(true)

  map.on('zoom', handleZoom)
  map.on('move', handleMove)
  map.on('zoomend', handleZoomEnd)
  map.on('moveend', handleMoveEnd)

  return function disposePickupZoomGuard() {
    disposed = true
    map.off('zoom', handleZoom)
    map.off('move', handleMove)
    map.off('zoomend', handleZoomEnd)
    map.off('moveend', handleMoveEnd)
  }
}