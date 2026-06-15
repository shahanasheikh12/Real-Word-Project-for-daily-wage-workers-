/**
 * Applications.jsx
 * Phase 3: Job applications / My job posts page at /applications.
 *
 * Worker view — shows the worker's own applications with status chips
 * Employer view — shows all jobs the employer has posted, with applicant counts
 *
 * Success banner: shown when redirected here with ?success=1 after posting a job
 *
 * Reads from:
 *   - public.applications (for workers)
 *   - public.jobs (for employers)
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import TopNav from '../components/layout/TopNav'
import BottomNav from '../components/layout/BottomNav'

import { getSkillMeta, DURATION_LABELS, APP_STATUS, JOB_STATUS } from '../utils/skillMeta'
export default function Applications() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const isWorker = profile?.role !== 'employer'

  const [jobs, setJobs]               = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // ?success=1 is appended by PostJob on successful submit
  const showSuccess = searchParams.get('success') === '1'

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    async function load() {
      setLoading(true)
      setError(null)

      if (isWorker) {
        // Worker: fetch own applications joined with job details
        const { data, error: fetchError } = await supabase
          .from('applications')
          .select(`
            id, status, match_type, applied_at,
            jobs (
              id, title, skill_required, city, pay_offered,
              job_date, duration, status
            )
          `)
          .eq('worker_id', user.id)
          .order('applied_at', { ascending: false })

        if (fetchError) setError(fetchError.message)
        else setApplications(data || [])
      } else {
        // Employer: fetch own job posts + count of applications for each
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select(`
            id, title, skill_required, city, pay_offered,
            job_date, duration, workers_needed, status, created_at,
            ai_suggested_wage_min, ai_suggested_wage_max,
            applications (count)
          `)
          .eq('employer_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) setError(fetchError.message)
        else setJobs(data || [])
      }

      setLoading(false)
    }

    load()
  }, [user, isWorker])

  // ── Cancel a job (employer action) ───────────────────────────────────────
  async function cancelJob(jobId) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .eq('employer_id', user.id)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'cancelled' } : j))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="phone-frame">
      <TopNav title={isWorker ? 'My Applications' : 'My Job Posts'} showBack />

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ── SUCCESS BANNER ─────────────────────────────────────────── */}
        {showSuccess && (
          <div
            className="mx-4 mt-4 rounded-xl px-4 py-4 flex items-center gap-3 animate-fade-in"
            style={{
              background: 'var(--color-dw-green-soft)',
              border: '1.5px solid var(--color-dw-green)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'var(--color-dw-green)' }}
            >
              ✅
            </div>
            <div>
              <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-green)' }}>
                Job Posted Successfully!
              </p>
              <p className="font-body text-xs mt-0.5" style={{ color: 'var(--color-dw-green)' }}>
                AI matching is searching for the best available workers nearby.
              </p>
            </div>
          </div>
        )}

        {/* ── EMPLOYER: Post new job CTA ──────────────────────────────── */}
        {!isWorker && (
          <div className="px-4 mt-4 mb-2 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-dw-blue)' }}>
              {jobs.length} Job{jobs.length !== 1 ? 's' : ''} Posted
            </h2>
            <button
              onClick={() => navigate('/employer/post-job')}
              className="font-display font-bold text-[12px] px-4 py-2 rounded-lg"
              style={{
                background: 'var(--color-dw-yellow)',
                color: 'var(--color-dw-blue)',
                minHeight: '44px',
              }}
            >
              + New Job
            </button>
          </div>
        )}

        {/* ── LOADING STATE ───────────────────────────────────────────── */}
        {loading && (
          <div className="px-4 mt-4 flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton rounded-xl" style={{ height: 110 }} />
            ))}
          </div>
        )}

        {/* ── ERROR STATE ─────────────────────────────────────────────── */}
        {!loading && error && (
          <div
            className="mx-4 mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}
          >
            Failed to load: {error}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            EMPLOYER VIEW — posted jobs list
        ════════════════════════════════════════════════════════════ */}
        {!loading && !error && !isWorker && (
          <div className="px-4 mt-2 flex flex-col gap-3">
            {jobs.length === 0 ? (
              <div className="card text-center py-10 mt-4">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-display font-bold text-base" style={{ color: 'var(--color-dw-blue)' }}>
                  No job posts yet
                </p>
                <p className="font-body text-sm mt-1 mb-4" style={{ color: 'var(--color-dw-slate)' }}>
                  Post your first job and find workers in minutes.
                </p>
                <button
                  className="btn-primary"
                  style={{ maxWidth: 200, margin: '0 auto' }}
                  onClick={() => navigate('/employer/post-job')}
                >
                  Post a Job
                </button>
              </div>
            ) : (
              jobs.map(job => {
                const statusInfo = JOB_STATUS[job.status] || { label: job.status, chipClass: 'chip-pending' }
                const appCount   = job.applications?.[0]?.count ?? 0
                const skill      = getSkillMeta(job.skill_required)
                const isCancellable = ['open', 'filled'].includes(job.status)

                return (
                  <div
                    key={job.id}
                    className="card animate-fade-in"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    {/* Top row: skill badge + status chip */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="skill-badge">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--color-dw-yellow)' }}
                        />
                        {skill.emoji} {skill.label}
                      </span>
                      <span className={`status-chip ${statusInfo.chipClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Job title */}
                    <p
                      className="font-display font-bold text-sm mb-2"
                      style={{ color: 'var(--color-dw-blue)', lineHeight: 1.3 }}
                    >
                      {job.title}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                        📍 {job.city}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                        📅 {job.job_date}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                        ⏱ {DURATION_LABELS[job.duration] || job.duration}
                      </span>
                    </div>

                    {/* Footer: pay + applicants */}
                    <div
                      className="flex items-center justify-between pt-2"
                      style={{ borderTop: '1px solid var(--color-dw-border)' }}
                    >
                      <div>
                        <span
                          className="font-mono text-lg font-bold"
                          style={{ color: 'var(--color-dw-green)' }}
                        >
                          ₹{job.pay_offered}
                          <span className="text-[11px] font-normal" style={{ color: 'var(--color-dw-slate)' }}>
                            /day
                          </span>
                        </span>
                        {/* AI wage suggestion stored on row */}
                        {job.ai_suggested_wage_min && (
                          <span
                            className="font-mono text-[10px] ml-2 px-2 py-0.5 rounded"
                            style={{ background: 'var(--color-dw-yellow-soft)', color: 'var(--color-dw-slate)' }}
                          >
                            ◆ AI: ₹{job.ai_suggested_wage_min}–₹{job.ai_suggested_wage_max}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Applicant count badge */}
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-full"
                          style={{ background: appCount > 0 ? 'var(--color-dw-yellow-soft)' : 'var(--color-dw-concrete)' }}
                        >
                          <span className="text-sm">👷</span>
                          <span
                            className="font-mono text-[11px] font-bold"
                            style={{ color: 'var(--color-dw-blue)' }}
                          >
                            {appCount} applied
                          </span>
                        </div>

                        {/* Cancel button */}
                        {isCancellable && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); cancelJob(job.id) }}
                            className="font-mono text-[10px] px-2 py-1 rounded-lg"
                            style={{
                              background: 'var(--color-dw-red-soft)',
                              color: 'var(--color-dw-red)',
                              minHeight: '32px',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            WORKER VIEW — my applications list
        ════════════════════════════════════════════════════════════ */}
        {!loading && !error && isWorker && (
          <div className="px-4 mt-4 flex flex-col gap-3">
            {applications.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-4xl mb-3">📤</div>
                <p className="font-display font-bold text-base" style={{ color: 'var(--color-dw-blue)' }}>
                  No applications yet
                </p>
                <p className="font-body text-sm mt-1 mb-4" style={{ color: 'var(--color-dw-slate)' }}>
                  Browse open jobs and apply to get started.
                </p>
                <button
                  className="btn-primary"
                  style={{ maxWidth: 200, margin: '0 auto' }}
                  onClick={() => navigate('/jobs')}
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              applications.map(app => {
                const job = app.jobs
                const appStatus  = APP_STATUS[app.status] || { label: app.status, chipClass: 'chip-pending' }
                const jobStatus  = JOB_STATUS[job?.status] || { label: job?.status, chipClass: 'chip-pending' }
                const skill      = getSkillMeta(job?.skill_required)

                return (
                  <div
                    key={app.id}
                    className="card animate-fade-in"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/jobs/${job?.id}`)}
                  >
                    {/* Top: skill badge + application status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="skill-badge">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--color-dw-yellow)' }}
                        />
                        {skill.emoji} {skill.label}
                      </span>
                      <span className={`status-chip ${appStatus.chipClass}`}>
                        {appStatus.label}
                      </span>
                    </div>

                    {/* Job title */}
                    <p
                      className="font-display font-bold text-sm mb-2"
                      style={{ color: 'var(--color-dw-blue)', lineHeight: 1.3 }}
                    >
                      {job?.title || '—'}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                        📍 {job?.city}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
                        📅 {job?.job_date}
                      </span>
                      {app.match_type === 'ai_matched' && (
                        <span
                          className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-dw-yellow-soft)', color: 'var(--color-dw-blue)' }}
                        >
                          ◆ AI Matched
                        </span>
                      )}
                    </div>

                    {/* Footer: pay + applied time */}
                    <div
                      className="flex items-center justify-between pt-2"
                      style={{ borderTop: '1px solid var(--color-dw-border)' }}
                    >
                      <span
                        className="font-mono text-base font-bold"
                        style={{ color: 'var(--color-dw-green)' }}
                      >
                        ₹{job?.pay_offered}
                        <span className="text-[11px] font-normal" style={{ color: 'var(--color-dw-slate)' }}>
                          /day
                        </span>
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--color-dw-slate)' }}>
                        Applied {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
