/**
 * JobDetail.jsx
 * Phase 4: Full job detail page at /jobs/:id.
 *
 * Features:
 * - Fetches job by ID with employer info and confirmed application count
 * - Deep-blue hero header: title, skill badge, status chip, pay + AI range
 * - 2-column key stats grid: date, duration, workers needed, confirmed, city, distance
 * - "Only N spots left!" urgency banner
 * - Description section
 * - Employer card with trust score stars
 * - Embedded mini Leaflet map (non-interactive, shows job pin)
 * - Sticky bottom apply button (workers only)
 * - "Already Applied" state with green confirmation
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TopNav from '../../components/layout/TopNav'
import BottomNav from '../../components/layout/BottomNav'
import RatingModal from '../../components/jobs/RatingModal'
import { getDistanceKm, formatDistance } from '../../utils/distance'
import { getSkillMeta, DURATION_LABELS, JOB_STATUS } from '../../utils/skillMeta'

function StarRating({ score }) {
  const n = Math.round(score ?? 0)
  return (
    <span style={{ color: 'var(--color-dw-yellow)', letterSpacing: -1, fontSize: 14 }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [job, setJob]                           = useState(null)
  const [confirmedCount, setConfirmedCount]     = useState(0)
  const [confirmedWorkers, setConfirmedWorkers] = useState([])
  const [myApp, setMyApp]                       = useState(null)
  const [alreadyApplied, setAlreadyApplied]     = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [applying, setApplying]                 = useState(false)
  const [error, setError]                       = useState(null)
  const [applySuccess, setApplySuccess]         = useState(false)

  const [showRating, setShowRating] = useState(false)
  const [ratee, setRatee] = useState(null)
  const [hasRated, setHasRated] = useState(false)
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  const isWorker = profile?.role !== 'employer'

  useEffect(() => {
    if (!user || !id) return
    async function load() {
      setLoading(true)
      const [jobRes, appsRes, myAppRes, ratingRes] = await Promise.all([
        supabase
          .from('jobs')
          .select(`
            id, title, description, skill_required, city,
            location_lat, location_lng,
            job_date, duration, workers_needed,
            pay_offered, ai_suggested_wage_min, ai_suggested_wage_max,
            status, created_at, fraud_score,
            employer:employer_id ( id, name, phone, trust_score )
          `)
          .eq('id', id)
          .single(),

        supabase
          .from('applications')
          .select('id, status, worker:worker_id(id, name)')
          .eq('job_id', id)
          .in('status', ['confirmed', 'completed']),

        supabase
          .from('applications')
          .select('id, status')
          .eq('job_id', id)
          .eq('worker_id', user.id)
          .maybeSingle(),

        supabase
          .from('ratings')
          .select('id')
          .eq('job_id', id)
          .eq('rater_id', user.id)
          .maybeSingle()
      ])

      if (jobRes.error) { setError(jobRes.error.message); setLoading(false); return }
      setJob(jobRes.data)
      const cWorkers = appsRes.data || []
      setConfirmedWorkers(cWorkers)
      setConfirmedCount(cWorkers.filter(w => w.status === 'confirmed' || w.status === 'completed').length)
      setMyApp(myAppRes.data)
      setAlreadyApplied(!!myAppRes.data)
      setHasRated(!!ratingRes.data)
      setLoading(false)
    }
    load()
  }, [id, user])

  async function markCompleted(applicationId, workerId, workerName) {
    await supabase.from('applications').update({ status: 'completed' }).eq('id', applicationId)
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', id)
    
    setJob(prev => ({ ...prev, status: 'completed' }))
    setConfirmedWorkers(prev => prev.map(w => w.id === applicationId ? { ...w, status: 'completed' } : w))
    
    setRatee({ id: workerId, name: workerName })
    setShowRating(true)
  }

  async function handleRatingSubmit({ score, comment }) {
    setIsSubmittingRating(true)
    await supabase.from('ratings').insert({
      job_id: id,
      rater_id: user.id,
      ratee_id: ratee?.id,
      score,
      comment
    })
    setShowRating(false)
    setHasRated(true)
    setIsSubmittingRating(false)
  }

  async function handleApply() {
    if (alreadyApplied || applying) return
    setApplying(true)
    const { error } = await supabase.from('applications').insert({
      job_id: id, worker_id: user.id,
      match_type: 'manual_apply', status: 'pending',
    })
    if (!error) { setAlreadyApplied(true); setApplySuccess(true) }
    setApplying(false)
  }

  const workerLat = profile?.location_lat
  const workerLng = profile?.location_lng

  if (loading) {
    return (
      <div className="phone-frame">
        <TopNav title="Job Detail" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: 'var(--color-dw-concrete)', borderTopColor: 'var(--color-dw-blue)' }} />
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="phone-frame">
        <TopNav title="Job Detail" showBack />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="text-4xl">😕</div>
          <p className="font-display font-bold text-lg" style={{ color: 'var(--color-dw-blue)' }}>Job not found</p>
          <p className="font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>{error ?? 'This job may have been removed.'}</p>
          <button className="btn-secondary" style={{ maxWidth: 180 }} onClick={() => navigate('/jobs')}>← Back to Jobs</button>
        </div>
      </div>
    )
  }

  const skill       = getSkillMeta(job.skill_required)
  const statusMeta  = JOB_STATUS[job.status] ?? { label: job.status, chipClass: 'chip-pending' }
  const dist        = getDistanceKm(workerLat, workerLng, job.location_lat, job.location_lng)
  const hasLocation = job.location_lat != null && job.location_lng != null
  const spotsLeft   = Math.max(0, (job.workers_needed ?? 1) - confirmedCount)
  const wasHired    = myApp && ['confirmed', 'completed'].includes(myApp.status)

  return (
    <div className="phone-frame">
      <TopNav title="Job Details" showBack />

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-28">

        {/* ── HERO HEADER ─────────────────────────────────────────────── */}
        <div
          className="px-4 py-5"
          style={{ background: 'var(--color-dw-blue)', position: 'relative', overflow: 'hidden' }}
        >
          <div className="absolute rounded-full" style={{ width: 200, height: 200, background: 'rgba(245,197,24,0.06)', top: -60, right: -40 }} />
          <div className="absolute rounded-full" style={{ width: 120, height: 120, background: 'rgba(245,197,24,0.04)', bottom: -20, left: -20 }} />

          {/* Skill + status */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="font-display font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: skill.color, color: '#fff' }}
            >
              {skill.emoji} {skill.label}
            </span>
            <span className={`status-chip ${statusMeta.chipClass}`}>{statusMeta.label}</span>
          </div>

          {/* Title */}
          <h1
            className="font-display font-extrabold text-xl mb-3 relative z-10"
            style={{ color: 'var(--color-dw-white)', letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            {job.title}
          </h1>

          {/* Pay */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-3xl font-bold" style={{ color: 'var(--color-dw-yellow)' }}>₹{job.pay_offered}</span>
            <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>/day</span>
            {job.ai_suggested_wage_min && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded ml-1"
                style={{ background: 'rgba(245,197,24,0.2)', color: 'var(--color-dw-yellow)' }}
              >
                ◆ AI: ₹{job.ai_suggested_wage_min}–₹{job.ai_suggested_wage_max}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-4 flex flex-col gap-5">

          {/* ── APPLY SUCCESS BANNER ─────────────────────────────────── */}
          {applySuccess && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in"
              style={{ background: 'var(--color-dw-green-soft)', border: '1.5px solid var(--color-dw-green)' }}
            >
              <span className="text-xl">✅</span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-green)' }}>Application Sent!</p>
                <p className="font-body text-xs" style={{ color: 'var(--color-dw-green)' }}>The employer will review your profile and respond shortly.</p>
              </div>
            </div>
          )}

          {/* ── KEY STATS GRID ───────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { icon: '📅', label: 'Date',      val: job.job_date },
              { icon: '⏱',  label: 'Duration',  val: DURATION_LABELS[job.duration] ?? job.duration },
              { icon: '👷', label: 'Needed',    val: `${job.workers_needed} worker${job.workers_needed !== 1 ? 's' : ''}` },
              { icon: '✅', label: 'Confirmed', val: `${confirmedCount} / ${job.workers_needed}` },
              { icon: '📍', label: 'City',      val: job.city || '—' },
              { icon: '📡', label: 'Distance',  val: dist != null ? formatDistance(dist) : '—' },
            ].map(item => (
              <div key={item.label} className="card py-3 text-center">
                <p className="text-xl mb-1">{item.icon}</p>
                <p className="font-mono text-base font-bold" style={{ color: 'var(--color-dw-blue)' }}>{item.val}</p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-dw-slate)' }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Spots left urgency */}
          {spotsLeft > 0 && spotsLeft <= 3 && (
            <div
              className="rounded-lg px-4 py-3 flex items-center gap-2 animate-fade-in"
              style={{ background: 'var(--color-dw-yellow-soft)', border: '1px solid var(--color-dw-yellow)' }}
            >
              <span>⚡</span>
              <p className="font-mono text-[11px]" style={{ color: 'var(--color-dw-blue)' }}>
                Only <strong>{spotsLeft}</strong> spot{spotsLeft !== 1 ? 's' : ''} left — apply now!
              </p>
            </div>
          )}

          {/* ── DESCRIPTION ─────────────────────────────────────────── */}
          {job.description && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-dw-slate)' }}>
                About this Job
              </p>
              <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--color-dw-blue)' }}>
                {job.description}
              </p>
            </div>
          )}

          {/* ── HIRED WORKERS (EMPLOYER VIEW) ───────────────────────── */}
          {!isWorker && confirmedWorkers.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-dw-slate)' }}>
                Hired Workers
              </p>
              <div className="flex flex-col gap-2">
                {confirmedWorkers.map(app => (
                  <div key={app.id} className="card flex items-center justify-between">
                    <span className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
                      {app.worker?.name || 'Worker'}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/chat/${app.id}`)}
                        className="btn-secondary py-1 px-3 text-xs w-auto min-h-0 h-auto"
                      >
                        Message
                      </button>
                      {job.status === 'open' && app.status === 'confirmed' && (
                        <button
                          onClick={() => markCompleted(app.id, app.worker?.id, app.worker?.name)}
                          className="btn-primary py-1 px-3 text-xs w-auto min-h-0 h-auto"
                        >
                          Mark Completed
                        </button>
                      )}
                      {job.status === 'completed' && !hasRated && (
                        <button
                          onClick={() => {
                            setRatee({ id: app.worker?.id, name: app.worker?.name })
                            setShowRating(true)
                          }}
                          className="btn-primary py-1 px-3 text-xs w-auto min-h-0 h-auto"
                        >
                          Rate Worker
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── EMPLOYER CARD ────────────────────────────────────────── */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-dw-slate)' }}>
              Posted By
            </p>
            <div className="card flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-xl font-display font-extrabold text-lg flex-shrink-0"
                style={{ width: 48, height: 48, background: 'var(--color-dw-yellow)', color: 'var(--color-dw-blue)' }}
              >
                {job.employer?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
                  {job.employer?.name ?? 'Employer'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating score={job.employer?.trust_score} />
                  <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                    {job.employer?.trust_score?.toFixed(1) ?? '—'} trust score
                  </span>
                </div>
              </div>
              {/* If worker is hired, show message button */}
              {isWorker && wasHired && (
                <button
                  onClick={() => navigate(`/chat/${myApp.id}`)}
                  className="btn-secondary py-1 px-3 text-xs w-auto min-h-0 h-auto"
                >
                  Message
                </button>
              )}
            </div>
          </div>

          {/* ── MINI MAP ─────────────────────────────────────────────── */}
          {hasLocation && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-dw-slate)' }}>
                Job Location
              </p>
              <div style={{ height: 180, borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--color-dw-border)' }}>
                <MapContainer
                  center={[job.location_lat, job.location_lng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  dragging={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  touchZoom={false}
                >
                  <TileLayer
                    attribution='© OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker
                    center={[job.location_lat, job.location_lng]}
                    radius={14}
                    pathOptions={{ color: skill.color, fillColor: skill.color, fillOpacity: 0.9, weight: 3 }}
                  >
                    <Popup>{job.title}</Popup>
                  </CircleMarker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY APPLY / RATE BUTTON ──────────────────────────────────────── */}
      {isWorker && (
        <div
          className="px-4 py-3"
          style={{
            position: 'sticky', bottom: 0, zIndex: 50,
            background: 'var(--color-dw-white)',
            borderTop: '1px solid var(--color-dw-border)',
          }}
        >
          {job.status === 'completed' && wasHired && !hasRated ? (
            <button
              className="btn-primary"
              onClick={() => {
                setRatee({ id: job.employer?.id, name: job.employer?.name })
                setShowRating(true)
              }}
            >
              Rate Employer
            </button>
          ) : job.status !== 'open' ? (
            <div className="text-center py-2">
              <p className="font-mono text-sm" style={{ color: 'var(--color-dw-slate)' }}>
                This job is no longer accepting applications.
              </p>
            </div>
          ) : alreadyApplied ? (
            <div
              className="text-center py-3 rounded-xl font-display font-bold text-sm"
              style={{ background: 'var(--color-dw-green-soft)', color: 'var(--color-dw-green)' }}
            >
              ✓ You have applied to this job
            </div>
          ) : (
            <button
              id="job-detail-apply"
              className="btn-primary"
              disabled={applying}
              onClick={handleApply}
            >
              {applying ? 'Sending application…' : `Apply Now — ₹${job.pay_offered}/day`}
            </button>
          )}
        </div>
      )}

      <BottomNav />

      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleRatingSubmit}
        rateeName={ratee?.name || 'User'}
        isSubmitting={isSubmittingRating}
      />
    </div>
  )
}
