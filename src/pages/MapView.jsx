/**
 * MapView.jsx
 * Phase 4: Interactive Leaflet map of all open jobs at /map.
 *
 * Features:
 * - Fetches all open jobs
 * - Custom coloured circular pin per skill category (from skillMeta.js)
 * - Clicking a pin shows a popup: title, skill, pay, distance, View & Apply button
 * - Legend panel listing all skill colours
 * - Centred on worker's location (or India default)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import TopNav from '../components/layout/TopNav'
import BottomNav from '../components/layout/BottomNav'
import { getDistanceKm, formatDistance } from '../utils/distance'
import { getSkillMeta, SKILLS } from '../utils/skillMeta'

// Default centre: Mumbai
const DEFAULT_CENTER = [19.076, 72.8777]

export default function MapView() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [jobs, setJobs]                   = useState([])
  const [appliedJobIds, setAppliedJobIds] = useState(new Set())
  const [loading, setLoading]             = useState(true)
  const [showLegend, setShowLegend]       = useState(false)
  const [applyingId, setApplyingId]       = useState(null)

  const workerLat = profile?.location_lat ?? DEFAULT_CENTER[0]
  const workerLng = profile?.location_lng ?? DEFAULT_CENTER[1]
  const center    = [workerLat, workerLng]

  // Fetch open jobs + applied IDs
  useEffect(() => {
    if (!user) return
    async function load() {
      const [jobsRes, appsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, skill_required, city, pay_offered, location_lat, location_lng, job_date, employer:employer_id(name, trust_score)')
          .eq('status', 'open')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null),
        supabase.from('applications').select('job_id').eq('worker_id', user.id),
      ])
      setJobs(jobsRes.data ?? [])
      setAppliedJobIds(new Set((appsRes.data ?? []).map(a => a.job_id)))
      setLoading(false)
    }
    load()
  }, [user])

  async function handleApply(jobId) {
    if (appliedJobIds.has(jobId)) return
    setApplyingId(jobId)
    const { error } = await supabase.from('applications').insert({
      job_id: jobId, worker_id: user.id, match_type: 'manual_apply', status: 'pending',
    })
    if (!error) setAppliedJobIds(prev => new Set([...prev, jobId]))
    setApplyingId(null)
  }

  return (
    <div className="phone-frame" style={{ overflow: 'hidden' }}>
      <TopNav title="Map View" showBack />

      {/* ── LOADING ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-4 mx-auto mb-3 animate-spin"
              style={{ borderColor: 'var(--color-dw-concrete)', borderTopColor: 'var(--color-dw-blue)' }} />
            <p className="font-mono text-xs" style={{ color: 'var(--color-dw-slate)' }}>Loading job map…</p>
          </div>
        </div>
      )}

      {/* ── MAP ─────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="flex-1 relative">
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Worker's own position */}
            <CircleMarker
              center={center}
              radius={10}
              pathOptions={{
                color: '#1A2B4A',
                fillColor: '#F5C518',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'DM Sans, sans-serif', padding: '4px 0' }}>
                  <strong style={{ color: '#1A2B4A' }}>📍 Your Location</strong>
                </div>
              </Popup>
            </CircleMarker>

            {/* Job pins */}
            {jobs.map(job => {
              const skill = getSkillMeta(job.skill_required)
              const dist  = getDistanceKm(workerLat, workerLng, job.location_lat, job.location_lng)
              const isApplied = appliedJobIds.has(job.id)

              return (
                <CircleMarker
                  key={job.id}
                  center={[job.location_lat, job.location_lng]}
                  radius={12}
                  pathOptions={{
                    color: skill.color,
                    fillColor: skill.color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', minWidth: 180, padding: '4px 0' }}>
                      {/* Skill badge */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          style={{
                            background: skill.color,
                            color: '#fff',
                            fontFamily: 'Syne, sans-serif',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {skill.emoji} {skill.label}
                        </span>
                      </div>

                      {/* Title */}
                      <p style={{ fontWeight: 700, color: '#1A2B4A', fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>
                        {job.title}
                      </p>

                      {/* Pay + distance */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: '#2D8A4E' }}>
                          ₹{job.pay_offered}/day
                        </span>
                        {dist != null && (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7A8D' }}>
                            📡 {formatDistance(dist)}
                          </span>
                        )}
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          style={{
                            flex: 1,
                            background: '#1A2B4A',
                            color: '#FAF9F6',
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 700,
                            fontSize: 11,
                            padding: '7px 8px',
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          View Details
                        </button>
                        {isApplied ? (
                          <span style={{
                            flex: 1, textAlign: 'center',
                            background: '#D4EDDA', color: '#2D8A4E',
                            fontFamily: 'Syne, sans-serif', fontWeight: 700,
                            fontSize: 11, padding: '7px 8px',
                            borderRadius: 6,
                          }}>✓ Applied</span>
                        ) : (
                          <button
                            onClick={() => handleApply(job.id)}
                            disabled={applyingId === job.id}
                            style={{
                              flex: 1,
                              background: '#F5C518',
                              color: '#1A2B4A',
                              fontFamily: 'Syne, sans-serif',
                              fontWeight: 700,
                              fontSize: 11,
                              padding: '7px 8px',
                              borderRadius: 6,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {applyingId === job.id ? '…' : 'Apply'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* ── JOB COUNT CHIP ─────────────────────────────────────── */}
          <div
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 1000,
              background: 'var(--color-dw-blue)',
              color: 'var(--color-dw-white)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, fontWeight: 500,
              padding: '6px 12px', borderRadius: 999,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {jobs.length} open job{jobs.length !== 1 ? 's' : ''} on map
          </div>

          {/* ── LEGEND TOGGLE ──────────────────────────────────────── */}
          <button
            onClick={() => setShowLegend(s => !s)}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 1000,
              background: 'var(--color-dw-white)',
              border: '1.5px solid var(--color-dw-border)',
              borderRadius: 8, padding: '6px 10px',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: 11,
              color: 'var(--color-dw-blue)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {showLegend ? '✕ Legend' : '◉ Legend'}
          </button>

          {/* ── LEGEND PANEL ───────────────────────────────────────── */}
          {showLegend && (
            <div
              style={{
                position: 'absolute', top: 50, right: 12, zIndex: 1000,
                background: 'var(--color-dw-white)',
                border: '1px solid var(--color-dw-border)',
                borderRadius: 12, padding: '12px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                minWidth: 160,
              }}
            >
              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, color: 'var(--color-dw-slate)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 8,
              }}>Skill Colours</p>
              {SKILLS.map(skill => (
                <div key={skill.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: skill.color, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                    color: 'var(--color-dw-blue)',
                  }}>
                    {skill.emoji} {skill.label}
                  </span>
                </div>
              ))}

              {/* Worker dot */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-dw-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F5C518', border: '2px solid #1A2B4A', flexShrink: 0 }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--color-dw-blue)' }}>You</span>
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
