/**
 * JobFeed.jsx
 * Phase 4: Full job browsing page at /jobs — for workers.
 *
 * Features:
 * - Fetches all open jobs from Supabase, joined with employer name + trust_score
 * - Calculates distance from worker's stored lat/lng
 * - Filter bar: skill, city (text), min pay, max pay
 * - Sort: Nearest / Highest Pay / Most Recent
 * - Apply button → inserts into applications with match_type='manual_apply'
 * - Shows "Applied" badge if worker already applied
 * - Skeleton loading + empty state
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TopNav from '../../components/layout/TopNav'
import BottomNav from '../../components/layout/BottomNav'
import JobCard from '../../components/jobs/JobCard'
import { getDistanceKm } from '../../utils/distance'
import { SKILLS } from '../../utils/skillMeta'

export default function JobFeed() {
  const navigate   = useNavigate()
  const { user, profile } = useAuth()

  // ── Data state ────────────────────────────────────────────────────────
  const [jobs, setJobs]                   = useState([])
  const [appliedJobIds, setAppliedJobIds] = useState(new Set())
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [applyingId, setApplyingId]       = useState(null)

  // ── Filter + sort state ───────────────────────────────────────────────
  const [filterSkill,  setFilterSkill]  = useState('')
  const [filterCity,   setFilterCity]   = useState('')
  const [filterMinPay, setFilterMinPay] = useState('')
  const [filterMaxPay, setFilterMaxPay] = useState('')
  const [sortBy,       setSortBy]       = useState('recent')
  const [showFilters,  setShowFilters]  = useState(false)

  // ── Fetch data on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      setError(null)

      const [jobsRes, appsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select(`
            id, title, description, skill_required, city,
            location_lat, location_lng,
            job_date, duration, workers_needed,
            pay_offered, ai_suggested_wage_min, ai_suggested_wage_max,
            status, created_at,
            employer:employer_id ( id, name, trust_score )
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false }),

        supabase
          .from('applications')
          .select('job_id')
          .eq('worker_id', user.id),
      ])

      if (jobsRes.error) { setError(jobsRes.error.message); setLoading(false); return }

      setJobs(jobsRes.data ?? [])
      setAppliedJobIds(new Set((appsRes.data ?? []).map(a => a.job_id)))
      setLoading(false)
    }
    load()
  }, [user])

  // ── Apply to a job ────────────────────────────────────────────────────
  async function handleApply(jobId) {
    if (appliedJobIds.has(jobId)) return
    setApplyingId(jobId)
    const { error } = await supabase.from('applications').insert({
      job_id: jobId, worker_id: user.id,
      match_type: 'manual_apply', status: 'pending',
    })
    if (!error) setAppliedJobIds(prev => new Set([...prev, jobId]))
    setApplyingId(null)
  }

  const workerLat = profile?.location_lat ?? null
  const workerLng = profile?.location_lng ?? null

  // ── Filtered + sorted jobs ────────────────────────────────────────────
  const displayJobs = useMemo(() => {
    let list = [...jobs]

    if (filterSkill)  list = list.filter(j => j.skill_required === filterSkill)
    if (filterCity)   list = list.filter(j => j.city?.toLowerCase().includes(filterCity.toLowerCase()))
    if (filterMinPay) list = list.filter(j => (j.pay_offered ?? 0) >= Number(filterMinPay))
    if (filterMaxPay) list = list.filter(j => (j.pay_offered ?? 0) <= Number(filterMaxPay))

    if (sortBy === 'pay') {
      list.sort((a, b) => (b.pay_offered ?? 0) - (a.pay_offered ?? 0))
    } else if (sortBy === 'nearest') {
      list.sort((a, b) => {
        const dA = getDistanceKm(workerLat, workerLng, a.location_lat, a.location_lng) ?? Infinity
        const dB = getDistanceKm(workerLat, workerLng, b.location_lat, b.location_lng) ?? Infinity
        return dA - dB
      })
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
    return list
  }, [jobs, filterSkill, filterCity, filterMinPay, filterMaxPay, sortBy, workerLat, workerLng])

  const activeFilterCount = [filterSkill, filterCity, filterMinPay, filterMaxPay].filter(Boolean).length

  return (
    <div className="phone-frame">
      <TopNav title="Browse Jobs" showBack />

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ── SORT BAR ────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-dw-border)', background: 'var(--color-dw-white)' }}
        >
          {[['recent','🕐 Recent'],['nearest','📡 Nearest'],['pay','₹ Pay']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className="font-mono text-[11px] px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: sortBy === val ? 'var(--color-dw-blue)' : 'var(--color-dw-white)',
                borderColor: sortBy === val ? 'var(--color-dw-blue)' : 'var(--color-dw-border)',
                color: sortBy === val ? 'var(--color-dw-white)' : 'var(--color-dw-slate)',
                minHeight: 36,
              }}
            >
              {lbl}
            </button>
          ))}

          <button
            onClick={() => setShowFilters(f => !f)}
            className="ml-auto font-mono text-[11px] px-3 py-1.5 rounded-full border flex items-center gap-1.5"
            style={{
              background: activeFilterCount > 0 ? 'var(--color-dw-yellow)' : 'var(--color-dw-white)',
              borderColor: activeFilterCount > 0 ? 'var(--color-dw-yellow)' : 'var(--color-dw-border)',
              color: 'var(--color-dw-blue)',
              minHeight: 36,
            }}
          >
            ⚙ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* ── FILTER PANEL ───────────────────────────────────────── */}
        {showFilters && (
          <div
            className="px-4 py-4 flex flex-col gap-3 animate-fade-in"
            style={{ background: 'var(--color-dw-concrete)', borderBottom: '1px solid var(--color-dw-border)' }}
          >
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--color-dw-slate)' }}>Skill</label>
              <select
                className="dw-input"
                style={{ padding: '10px 12px' }}
                value={filterSkill}
                onChange={e => setFilterSkill(e.target.value)}
              >
                <option value="">All skills</option>
                {SKILLS.map(s => (
                  <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--color-dw-slate)' }}>City</label>
              <input
                className="dw-input"
                style={{ padding: '10px 12px' }}
                type="text"
                placeholder="Filter by city…"
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--color-dw-slate)' }}>Pay Range (₹/day)</label>
              <div className="flex gap-2">
                <input className="dw-input" style={{ padding: '10px 12px' }} type="number" placeholder="Min ₹" value={filterMinPay} onChange={e => setFilterMinPay(e.target.value)} />
                <input className="dw-input" style={{ padding: '10px 12px' }} type="number" placeholder="Max ₹" value={filterMaxPay} onChange={e => setFilterMaxPay(e.target.value)} />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                className="font-mono text-[11px] underline text-left"
                style={{ color: 'var(--color-dw-red)' }}
                onClick={() => { setFilterSkill(''); setFilterCity(''); setFilterMinPay(''); setFilterMaxPay('') }}
              >
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── RESULTS COUNT ──────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
              {displayJobs.length} job{displayJobs.length !== 1 ? 's' : ''} found
            </span>
            {activeFilterCount > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-dw-yellow-soft)', color: 'var(--color-dw-blue)' }}>
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
        )}

        {/* ── LOADING SKELETONS ──────────────────────────────────── */}
        {loading && (
          <div className="px-4 pt-3 flex flex-col gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton rounded-xl" style={{ height: 130 }} />)}
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="mx-4 mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}>
            {error}
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────── */}
        {!loading && !error && displayJobs.length === 0 && (
          <div className="card mx-4 mt-6 text-center py-10">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-display font-bold text-base" style={{ color: 'var(--color-dw-blue)' }}>
              {activeFilterCount > 0 ? 'No jobs match your filters' : 'No jobs found near you today'}
            </p>
            <p className="font-body text-sm mt-1" style={{ color: 'var(--color-dw-slate)' }}>
              {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Check back tomorrow or expand your search.'}
            </p>
          </div>
        )}

        {/* ── JOB CARDS ─────────────────────────────────────────── */}
        {!loading && !error && displayJobs.length > 0 && (
          <div className="px-4 pt-2 pb-4 flex flex-col gap-3">
            {displayJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                distanceKm={getDistanceKm(workerLat, workerLng, job.location_lat, job.location_lng)}
                applied={appliedJobIds.has(job.id)}
                onApply={handleApply}
                applying={applyingId === job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
