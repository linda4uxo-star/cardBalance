function supportsTouchInput() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getTouchPoint(touch, rect) {
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  }
}

function computeZoomCenter(map, baseCenter, baseZoom, anchorPoint, zoom) {
  const scale = map.getZoomScale(zoom, baseZoom)
  const viewHalf = map.getSize().divideBy(2)
  const centerOffset = {
    x: (anchorPoint.x - viewHalf.x) * (1 - 1 / scale),
    y: (anchorPoint.y - viewHalf.y) * (1 - 1 / scale),
  }
  const baseCenterPoint = map.project(baseCenter, baseZoom)
  return map.unproject(
    [baseCenterPoint.x + centerOffset.x, baseCenterPoint.y + centerOffset.y],
    baseZoom,
  )
}

export function enableSingleFingerMobileZoom(
  map,
  {
    tapTimeoutMs = 320,
    tapDistancePx = 32,
    dragThresholdPx = 10,
    zoomSensitivityPx = 110,
    maxDragZoomDelta = 3,
    zoomSnap = 0,
    zoomDelta = 0.1,
    onGestureStart = null,
  } = {},
) {
  if (!map || !supportsTouchInput()) return () => {}

  const container = map.getContainer()
  const previousTouchAction = container.style.touchAction
  const previousZoomSnap = map.options?.zoomSnap
  const previousZoomDelta = map.options?.zoomDelta
  container.style.touchAction = 'manipulation'

  if (map.options) {
    map.options.zoomSnap = zoomSnap
    map.options.zoomDelta = zoomDelta
  }

  if (map.doubleClickZoom?.enabled?.()) {
    map.doubleClickZoom.disable()
  }

  let lastTap = null
  let activeGesture = null

  function resetGesture() {
    if (activeGesture?.frameId) {
      cancelAnimationFrame(activeGesture.frameId)
    }
    if (activeGesture?.touchActionBeforeGesture !== undefined) {
      container.style.touchAction = activeGesture.touchActionBeforeGesture
    }
    if (activeGesture?.draggingWasEnabled) {
      map.dragging.enable()
    }
    activeGesture = null
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 1) {
      resetGesture()
      return
    }

    const touch = event.touches[0]
    const rect = container.getBoundingClientRect()
    const point = getTouchPoint(touch, rect)
    const now = Date.now()

    if (
      lastTap &&
      now - lastTap.time <= tapTimeoutMs &&
      Math.hypot(point.x - lastTap.x, point.y - lastTap.y) <= tapDistancePx
    ) {
      map.stop?.()
      const anchorLatLng = map.containerPointToLatLng([point.x, point.y])
      activeGesture = {
        baseCenter: map.getCenter(),
        baseZoom: map.getZoom(),
        anchorLatLng,
        anchorPoint: { x: point.x, y: point.y },
        startY: point.y,
        draggingWasEnabled: false,
        dragZoomActive: false,
        previewCenter: null,
        previewZoom: map.getZoom(),
        frameId: null,
        touchActionBeforeGesture: container.style.touchAction,
      }
      container.style.touchAction = 'none'
      if (typeof onGestureStart === 'function') {
        onGestureStart()
      }
      event.preventDefault()
      return
    }

    lastTap = {
      time: now,
      x: point.x,
      y: point.y,
    }
  }

  function handleTouchMove(event) {
    if (!activeGesture || event.touches.length !== 1) return

    const touch = event.touches[0]
    const rect = container.getBoundingClientRect()
    const point = getTouchPoint(touch, rect)
    const deltaY = point.y - activeGesture.startY

    if (!activeGesture.dragZoomActive && Math.abs(deltaY) >= dragThresholdPx) {
      activeGesture.dragZoomActive = true
      map.stop?.()
      activeGesture.draggingWasEnabled = map.dragging?.enabled?.() || false
      if (activeGesture.draggingWasEnabled) {
        map.dragging.disable()
      }
      if (typeof map._moveStart === 'function') {
        map._moveStart(true, false)
        activeGesture.moveStarted = true
      }
    }

    if (!activeGesture.dragZoomActive) return

    event.preventDefault()

    const minZoom = map.getMinZoom?.() ?? 0
    const maxZoom = map.getMaxZoom?.() ?? 20
    const zoomDelta = clamp(deltaY / zoomSensitivityPx, -maxDragZoomDelta, maxDragZoomDelta)
    const nextZoom = clamp(activeGesture.baseZoom + zoomDelta, minZoom, maxZoom)
    const previewCenter = computeZoomCenter(
      map,
      activeGesture.baseCenter,
      activeGesture.baseZoom,
      activeGesture.anchorPoint,
      nextZoom,
    )

    activeGesture.previewZoom = nextZoom
    activeGesture.previewCenter = previewCenter

    if (activeGesture.frameId) {
      cancelAnimationFrame(activeGesture.frameId)
    }

    activeGesture.frameId = requestAnimationFrame(() => {
      if (!activeGesture?.dragZoomActive) return

      if (typeof map._move === 'function') {
        map._move(previewCenter, nextZoom, { pinch: true, round: false }, undefined)
      } else {
        map.setZoomAround(activeGesture.anchorLatLng, nextZoom, {
          animate: false,
        })
      }

      if (activeGesture) {
        activeGesture.frameId = null
      }
    })
  }

  function finalizeDragZoom() {
    if (!activeGesture) return

    if (activeGesture.frameId) {
      cancelAnimationFrame(activeGesture.frameId)
      activeGesture.frameId = null
    }

    const finalCenter = activeGesture.previewCenter || map.getCenter()
    const finalZoom = map._limitZoom
      ? map._limitZoom(activeGesture.previewZoom ?? map.getZoom())
      : (activeGesture.previewZoom ?? map.getZoom())

    if (map.options?.zoomAnimation && typeof map._animateZoom === 'function') {
      map._animateZoom(finalCenter, finalZoom, true, map.options.zoomSnap)
      return
    }

    if (typeof map._resetView === 'function') {
      map._resetView(finalCenter, finalZoom)
      return
    }

    map.setView(finalCenter, finalZoom, { animate: false })
  }

  function handleTouchEnd(event) {
    if (!activeGesture) return

    const { baseZoom, anchorLatLng, dragZoomActive } = activeGesture

    if (!dragZoomActive) {
      event.preventDefault()
      const nextZoom = clamp(
        baseZoom + 1,
        map.getMinZoom?.() ?? 0,
        map.getMaxZoom?.() ?? 20,
      )
      map.setZoomAround(anchorLatLng, nextZoom, {
        animate: map.options?.zoomAnimation !== false,
      })
    } else {
      event.preventDefault()
      finalizeDragZoom()
    }

    resetGesture()
  }

  function handleTouchCancel() {
    if (activeGesture?.dragZoomActive) {
      finalizeDragZoom()
    }
    resetGesture()
  }

  container.addEventListener('touchstart', handleTouchStart, { passive: false })
  container.addEventListener('touchmove', handleTouchMove, { passive: false })
  container.addEventListener('touchend', handleTouchEnd, { passive: false })
  container.addEventListener('touchcancel', handleTouchCancel, { passive: true })

  return () => {
    resetGesture()
    container.style.touchAction = previousTouchAction
    if (map.options) {
      map.options.zoomSnap = previousZoomSnap
      map.options.zoomDelta = previousZoomDelta
    }
    container.removeEventListener('touchstart', handleTouchStart)
    container.removeEventListener('touchmove', handleTouchMove)
    container.removeEventListener('touchend', handleTouchEnd)
    container.removeEventListener('touchcancel', handleTouchCancel)
    if (map.doubleClickZoom && !map.doubleClickZoom.enabled()) {
      map.doubleClickZoom.enable()
    }
  }
}