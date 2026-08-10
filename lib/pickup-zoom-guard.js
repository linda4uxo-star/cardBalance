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
  { maxPickupZoom = 15 } = {},
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
  }

  const handleZoomEnd = () => enforce(false)
  const handleMoveEnd = () => enforce(true)

  map.on('zoomend', handleZoomEnd)
  map.on('moveend', handleMoveEnd)

  return function disposePickupZoomGuard() {
    disposed = true
    map.off('zoomend', handleZoomEnd)
    map.off('moveend', handleMoveEnd)
  }
}