/**
 * LocationPicker.jsx
 * Interactive map component for selecting a job location.
 * Uses Leaflet + OpenStreetMap (free, no API key needed).
 *
 * Props:
 *   lat, lng          — current pin position (controlled)
 *   onChange(lat, lng) — called when user clicks/drags pin
 *   city              — string displayed in the map header
 *
 * Behavior:
 *   - Shows a draggable pin at the given lat/lng
 *   - Clicking anywhere on the map moves the pin (calls onChange)
 *   - If lat/lng are null, defaults to center of India
 *
 * Visual: matches the map dark-blue frame style of dailywork-ui-design.html
 */
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet's default marker icon path issue with Vite bundling
// (Leaflet tries to load images from a path that doesn't exist after bundling)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom DailyWork-branded marker (deep blue with yellow)
const dwIcon = new L.DivIcon({
  html: `
    <div style="
      width: 28px; height: 36px;
      display: flex; flex-direction: column; align-items: center;
      filter: drop-shadow(0 4px 8px rgba(26,43,74,0.35));
    ">
      <div style="
        width: 28px; height: 28px;
        background: #1A2B4A;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        border: 3px solid #F5C518;
      ">
        <div style="
          width: 8px; height: 8px;
          background: #F5C518;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    </div>
  `,
  className: '',
  iconSize:   [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
})

/**
 * ClickHandler — inner component that listens to map click events.
 * Must be rendered inside <MapContainer>.
 */
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Default center: Mumbai, India
const DEFAULT_LAT = 19.076
const DEFAULT_LNG = 72.8777

export default function LocationPicker({ lat, lng, onChange, city }) {
  const mapRef = useRef(null)
  const currentLat = lat || DEFAULT_LAT
  const currentLng = lng || DEFAULT_LNG

  // When city changes (typed by user), try to geo-search via Nominatim
  // (lightweight, free geocoding from OpenStreetMap)
  useEffect(() => {
    if (!city || city.trim().length < 3) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)},India&format=json&limit=1`,
          { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data[0]) {
          const newLat = parseFloat(data[0].lat)
          const newLng = parseFloat(data[0].lon)
          onChange(newLat, newLng)
          // Pan the map to the new location
          mapRef.current?.flyTo([newLat, newLng], 13, { duration: 1.2 })
        }
      } catch {
        // Ignore AbortError from cleanup
      }
    }, 800) // debounce: wait 800ms after user stops typing city

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [city]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Map label */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-dw-slate)' }}>
          Pin Job Location
        </span>
        {lat && lng && (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--color-dw-concrete)', color: 'var(--color-dw-slate)' }}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Map container */}
      <div style={{ height: 200, borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--color-dw-border)' }}>
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          zoomControl={true}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={onChange} />
          <Marker
            position={[currentLat, currentLng]}
            icon={dwIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const pos = e.target.getLatLng()
                onChange(pos.lat, pos.lng)
              },
            }}
          />
        </MapContainer>
      </div>

      <p className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--color-dw-slate)' }}>
        Tap the map or drag the pin to set the exact job location
      </p>
    </div>
  )
}
