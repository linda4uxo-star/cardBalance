import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Missing session id' })

  try {
    const { data, error } = await supabase
      .from('payuber_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Session not found' })

    return res.status(200).json({
      id: data.id,
      pickupAddress: data.pickup_address,
      dropoffAddress: data.dropoff_address,
      pickupLat: data.pickup_lat,
      pickupLng: data.pickup_lng,
      dropoffLat: data.dropoff_lat,
      dropoffLng: data.dropoff_lng,
      routeGeometry: data.route_geometry,
      distanceKm: data.distance_km,
      durationMin: data.duration_min,
      rideType: data.ride_type,
      rideName: data.ride_name,
      amount: data.amount,
      status: data.status,
      createdAt: data.created_at,
    })
  } catch (err) {
    console.error('Failed to get payuber session:', err)
    return res.status(500).json({ error: 'Failed to load payment session' })
  }
}
