import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    pickupAddress,
    dropoffAddress,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    routeGeometry,
    distanceKm,
    durationMin,
    rideType,
    rideName,
    amount,
  } = req.body || {}

  if (!pickupAddress || !dropoffAddress || !rideType || !amount) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { data, error } = await supabase
      .from('payuber_sessions')
      .insert({
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        pickup_lat: pickupLat ?? null,
        pickup_lng: pickupLng ?? null,
        dropoff_lat: dropoffLat ?? null,
        dropoff_lng: dropoffLng ?? null,
        route_geometry: routeGeometry ?? null,
        distance_km: distanceKm ?? null,
        duration_min: durationMin ?? null,
        ride_type: rideType,
        ride_name: rideName ?? rideType,
        amount,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    return res.status(200).json({ id: data.id })
  } catch (err) {
    console.error('Failed to create payuber session:', err)
    return res.status(500).json({ error: 'Failed to create payment session' })
  }
}
