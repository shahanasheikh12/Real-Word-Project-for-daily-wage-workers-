/**
 * Home.jsx
 * Main feed page at /.
 * Role-aware: workers see live job feed + availability beacon,
 * employers see their posted jobs summary + post-job CTA.
 *
 * Phase 4 update: workers' feed now fetches real open jobs from Supabase,
 * shows up to 5 preview cards using the shared JobCard component.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import TopNav from '../components/layout/TopNav'
import BottomNav from '../components/layout/BottomNav'
import JobCard from '../components/jobs/JobCard'
import { getDistanceKm } from '../utils/distance'

export default function Home() {
  const { user, profile, signOut } = useAuth()
  const navigate   = useNavigate()
  const isWorker   = profile?.role !== 'employer'

  // Worker feed state
  const [jobs, setJobs]                   = useState([])
  const [appliedJobIds, setAppliedJobIds] = useState(new Set())
  const [loadingJobs, setLoadingJobs]     = useState(true)
  const [applyingId, setApplyingId]       = useState(null)

  // Worker location for distance
  const workerLat = profile?.location_lat ?? null
  const workerLng = profile?.location_lng ?? null

  // Fetch preview jobs (up to 5, most recent)
  useEffect(() => {
    if (!user || !isWorker) { setLoadingJobs(false); return }
    async function loadFeed() {
      const [jobsRes, appsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select(`id, title, skill_required, city, location_lat, location_lng,
            pay_offered, job_date, duration, status, created_at,
            employer:employer_id ( id, name, trust_score )`)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('applications').select('job_id').eq('worker_id', user.id),
      ])
      setJobs(jobsRes.data ?? [])
      setAppliedJobIds(new Set((appsRes.data ?? []).map(a => a.job_id)))
      setLoadingJobs(false)
    }
    loadFeed()
  }, [user, isWorker])

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

  return (
    <div className="phone-frame">
      <TopNav />

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ══════════════════════════════════════════
            WORKER VIEW
        ══════════════════════════════════════════ */}
        {isWorker && (
          <>
            {/* Availability Beacon */}
            <div
              className="mx-0 mt-0 mb-4 rounded-none p-6 relative overflow-hidden cursor-pointer shadow-sm"
              style={{ background: 'var(--color-dw-blue)' }}
              onClick={() => navigate('/worker/profile')}
            >
              <div className="absolute rounded-full" style={{ width: 160, height: 160, background: 'rgba(245,197,24,0.08)', top: -40, right: -30 }} />
              <div className="absolute rounded-full" style={{ width: 100, height: 100, background: 'rgba(245,197,24,0.06)', top: -10, right: 0 }} />

              <p className="font-mono text-[11px] uppercase tracking-widest mb-3 relative z-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your Availability
              </p>

              <div className="flex items-center gap-3 relative z-10">
                <div
                  className="rounded-full flex-shrink-0 beacon-pulse"
                  style={{
                    width: 14, height: 14,
                    background: profile?.availability === 'today'    ? 'var(--color-dw-yellow)'
                               : profile?.availability === 'tomorrow' ? 'var(--color-dw-orange)'
                               : 'var(--color-dw-slate)',
                  }}
                />
                <div>
                  <p className="font-display font-bold text-xl" style={{ color: 'var(--color-dw-white)' }}>
                    {profile?.availability === 'today'    ? 'Available Today'
                    : profile?.availability === 'tomorrow' ? 'Available Tomorrow'
                    : 'Set Availability'}
                  </p>
                  <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Tap to update your status →
                  </p>
                </div>
              </div>

              {/* Availability chips */}
              <div className="flex gap-2 mt-3 relative z-10">
                {['today','tomorrow','unavailable'].map(v => (
                  <span
                    key={v}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-full border capitalize"
                    style={{
                      borderColor: profile?.availability === v ? 'var(--color-dw-yellow)' : 'rgba(255,255,255,0.2)',
                      background: profile?.availability === v ? 'var(--color-dw-yellow)' : 'transparent',
                      color: profile?.availability === v ? 'var(--color-dw-blue)' : 'rgba(255,255,255,0.7)',
                      fontWeight: profile?.availability === v ? 600 : 400,
                    }}
                  >
                    {v === 'unavailable' ? 'Unavailable' : v === 'today' ? 'Today' : 'Tomorrow'}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Match Banner */}
            <div className="mx-4 mb-4 ai-box flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: 'var(--color-dw-yellow)' }}>
                🤖
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>AI Match Ready</p>
                <p className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                  {jobs.length > 0 ? `${jobs.length} open jobs found near you` : 'Complete your profile to unlock AI job matching'}
                </p>
              </div>
              <button
                className="font-display font-bold text-[11px] px-3 py-2 rounded-md"
                style={{ background: 'var(--color-dw-blue)', color: 'var(--color-dw-yellow)', minHeight: '36px' }}
                onClick={() => navigate('/jobs')}
              >
                Browse →
              </button>
            </div>

            {/* Section heading */}
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-display font-bold text-[15px]" style={{ color: 'var(--color-dw-blue)' }}>
                Jobs Near You
              </h2>
              <button className="font-mono text-[11px] underline" style={{ color: 'var(--color-dw-slate)' }} onClick={() => navigate('/jobs')}>
                See all
              </button>
            </div>

            {/* Loading skeletons */}
            {loadingJobs && (
              <div className="px-4 flex flex-col gap-3">
                {[1,2,3].map(i => <div key={i} className="skeleton rounded-xl" style={{ height: 130 }} />)}
              </div>
            )}

            {/* Live job cards */}
            {!loadingJobs && jobs.length > 0 && (
              <div className="px-4 flex flex-col gap-3">
                {jobs.map(job => (
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
                {/* See all jobs CTA */}
                <button
                  className="btn-secondary mt-1"
                  onClick={() => navigate('/jobs')}
                >
                  Browse All Jobs →
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loadingJobs && jobs.length === 0 && (
              <div className="mx-4 card text-center py-10 mt-6">
                <div className="text-5xl mb-4">📭</div>
                <p className="font-display font-bold text-base" style={{ color: 'var(--color-dw-blue)' }}>No jobs found near you today</p>
                <p className="font-body text-sm mt-1" style={{ color: 'var(--color-dw-slate)' }}>
                  Check back tomorrow or expand your search.
                </p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════
            EMPLOYER VIEW
        ══════════════════════════════════════════ */}
        {!isWorker && (
          <>
            <div className="px-4 pt-4 mb-4">
              <h2 className="font-display font-extrabold text-2xl" style={{ color: 'var(--color-dw-blue)', letterSpacing: '-0.02em' }}>
                Your Job Posts
              </h2>
              <p className="font-body text-sm mt-1" style={{ color: 'var(--color-dw-slate)' }}>
                Post a job and find workers in minutes.
              </p>
            </div>

            {/* Post job CTA */}
            <div className="mx-4 mb-4 rounded-xl p-5 relative overflow-hidden" style={{ background: 'var(--color-dw-yellow)' }}>
              <div className="absolute rounded-full" style={{ width: 160, height: 160, background: 'rgba(26,43,74,0.06)', top: -40, right: -30 }} />
              <p className="font-display font-bold text-lg relative z-10" style={{ color: 'var(--color-dw-blue)' }}>
                Need a worker today?
              </p>
              <p className="font-body text-sm mt-1 mb-4 relative z-10" style={{ color: 'rgba(26,43,74,0.7)' }}>
                AI matches you to the best available workers nearby instantly.
              </p>
              <button
                className="btn-primary relative z-10"
                style={{ background: 'var(--color-dw-blue)' }}
                onClick={() => navigate('/employer/post-job')}
              >
                + Post a Job Now
              </button>
            </div>

            {/* View all posts link */}
            <div className="mx-4 mt-2 flex items-center justify-between">
              <h3 className="font-display font-bold text-base" style={{ color: 'var(--color-dw-blue)' }}>Recent Posts</h3>
              <button className="font-mono text-[11px] underline" style={{ color: 'var(--color-dw-slate)' }} onClick={() => navigate('/applications')}>
                See all →
              </button>
            </div>

            {/* No posts placeholder */}
            <div className="mx-4 mt-3 card text-center py-8">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-display font-bold text-base" style={{ color: 'var(--color-dw-blue)' }}>
                No job posts yet
              </p>
              <p className="font-body text-sm mt-1" style={{ color: 'var(--color-dw-slate)' }}>
                Post your first job and start receiving applications.
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
