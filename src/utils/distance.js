/**
 * distance.js
 * Haversine formula to calculate distance between two lat/lng coordinates.
 * Used in job feed and map to show how far a job is from the worker.
 */

/** Earth radius in kilometres */
const EARTH_RADIUS_KM = 6371

/**
 * Returns the distance in kilometres between two coordinate pairs.
 * Returns null if any coordinate is missing.
 *
 * @param {number} lat1 - Origin latitude
 * @param {number} lng1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lng2 - Destination longitude
 * @returns {number|null} Distance in km, or null
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null

  const toRad = deg => (deg * Math.PI) / 180
  const dLat  = toRad(lat2 - lat1)
  const dLng  = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Returns a human-readable distance label.
 * e.g. "0.8 km" or "12.3 km" or "—" if unknown
 */
export function formatDistance(km) {
  if (km == null) return '—'
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${km.toFixed(1)} km`
}
