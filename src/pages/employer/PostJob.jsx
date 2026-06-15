/**
 * PostJob.jsx
 * Phase 5: Full employer job posting form at /employer/post-job.
 *
 * Features:
 * - Job title, description, skill required (dropdown)
 * - City input + interactive Leaflet map pin
 * - Date picker (default today, disables past dates)
 * - Duration selector: Half Day / Full Day / Multi Day
 * - Number of workers needed
 * - Pay offered (₹/day) with validation (must be > 0)
 * - Live AI wage suggestion box fetching from FastAPI backend (Phase 5 update)
 * - On submit: inserts row into public.jobs with status = 'open'
 * - Redirects to /applications with ?success=1 for the success banner
 */
import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TopNav from '../../components/layout/TopNav'
import BottomNav from '../../components/layout/BottomNav'

// Lazy-load the map so Leaflet doesn't block the initial paint
const LocationPicker = lazy(() => import('../../components/map/LocationPicker'))

// ── Skill categories matching worker profile options ─────────────────────────
const SKILL_OPTIONS = [
  { value: '',             label: 'Select a skill…' },
  { value: 'construction', label: '🏗️  Construction' },
  { value: 'plumbing',     label: '🔧  Plumbing' },
  { value: 'electrical',   label: '⚡  Electrical' },
  { value: 'painting',     label: '🖌️  Painting' },
  { value: 'carpentry',    label: '🪚  Carpentry' },
  { value: 'cleaning',     label: '🧹  Cleaning' },
  { value: 'gardening',    label: '🌿  Gardening' },
  { value: 'delivery',     label: '📦  Delivery' },
  { value: 'domestic',     label: '🏠  Domestic Help' },
  { value: 'other',        label: '⚙️  Other' },
]

// ── Duration options ──────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { value: 'half_day',  label: 'Half Day', sub: '~4 hrs' },
  { value: 'full_day',  label: 'Full Day', sub: '~8 hrs' },
  { value: 'multi_day', label: 'Multi Day', sub: '2+ days' },
]

/** Returns today's date formatted as YYYY-MM-DD (for date input min attribute) */
function todayString() {
  return new Date().toISOString().split('T')[0]
}

// ── Form field label style reuse ──────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label
      className="font-mono text-[11px] uppercase tracking-widest mb-2 block"
      style={{ color: 'var(--color-dw-slate)' }}
    >
      {children}
    </label>
  )
}

// ── Section divider with title ─────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p
        className="font-display font-bold text-[13px] mb-3 px-4"
        style={{ color: 'var(--color-dw-blue)' }}
      >
        {title}
      </p>
      <div className="px-4 flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PostJob() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Form state — all controlled inputs
  const [form, setForm] = useState({
    title:          '',
    description:    '',
    skill:          '',
    city:           '',
    locationLat:    null,
    locationLng:    null,
    jobDate:        todayString(),
    duration:       'full_day',
    workersNeeded:  1,
    payOffered:     '',
  })

  const [errors, setErrors]   = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // AI State
  const [aiWage, setAiWage] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // ── Field helpers ────────────────────────────────────────────────────────
  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear the error for this field as user types
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  // ── Live AI Wage Fetcher ──────────────────────────────────────────────────
  useEffect(() => {
    if (!form.skill || !form.city || form.city.length < 3) {
      setAiWage(null)
      return
    }

    const timer = setTimeout(async () => {
      setAiLoading(true)
      try {
        const res = await fetch('http://localhost:8000/api/suggest-wage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill: form.skill, city: form.city })
        })
        if (res.ok) {
          const data = await res.json()
          setAiWage([data.min_wage, data.max_wage])
        }
      } catch (err) {
        console.error('Failed to fetch AI wage:', err)
        setAiWage(null)
      } finally {
        setAiLoading(false)
      }
    }, 600) // Debounce

    return () => clearTimeout(timer)
  }, [form.skill, form.city])

  const skillLabel = SKILL_OPTIONS.find(s => s.value === form.skill)?.label?.replace(/^[\S]+\s+/, '') || ''
  const cityLabel  = form.city || 'your city'

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const e = {}

    if (!form.title.trim())              e.title = 'Job title is required'
    if (!form.skill)                     e.skill = 'Please select a skill category'
    if (!form.city.trim())               e.city  = 'Please enter a city'
    if (!form.jobDate)                   e.jobDate = 'Job date is required'
    if (form.jobDate < todayString())    e.jobDate = 'Job date cannot be in the past'
    if (!form.payOffered || Number(form.payOffered) <= 0)
      e.payOffered = 'Pay must be greater than ₹0'
    if (!form.workersNeeded || Number(form.workersNeeded) < 1)
      e.workersNeeded = 'At least 1 worker is required'

    return e
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)

    // Run validation
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Scroll to top of form to show first error
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)

    // Optional: Call /check-fraud
    let fraudScore = 0
    try {
      const fraudRes = await fetch('http://localhost:8000/api/check-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description || form.title, pay_offered: Number(form.payOffered) })
      })
      if (fraudRes.ok) {
        const fraudData = await fraudRes.json()
        fraudScore = fraudData.fraud_score
      }
    } catch (err) {
      console.warn('Fraud check unavailable:', err)
    }

    // Insert into public.jobs
    const { error } = await supabase
      .from('jobs')
      .insert({
        employer_id:          user.id,
        title:                form.title.trim(),
        description:          form.description.trim() || null,
        skill_required:       form.skill,
        city:                 form.city.trim(),
        location_lat:         form.locationLat,
        location_lng:         form.locationLng,
        job_date:             form.jobDate,
        duration:             form.duration,
        workers_needed:       Number(form.workersNeeded),
        pay_offered:          Number(form.payOffered),
        // Persist the AI wage suggestion so it stays on record
        ai_suggested_wage_min: aiWage?.[0] ?? null,
        ai_suggested_wage_max: aiWage?.[1] ?? null,
        status:               'open',
        fraud_score:          fraudScore,
      })

    if (error) {
      setSubmitError(`Failed to post job: ${error.message}`)
      setSubmitting(false)
      return
    }

    // Success — redirect with a query flag for the success banner
    navigate('/applications?success=1')
  }

  // ── Error helper ──────────────────────────────────────────────────────────
  function FieldError({ field }) {
    if (!errors[field]) return null
    return (
      <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-dw-red)' }}>
        ⚠ {errors[field]}
      </p>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="phone-frame">
      <TopNav title="Post a Job" showBack />

      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto scrollbar-hide pb-28"
        noValidate
      >
        {/* ── Submit-level error ─────────────────────────────────────── */}
        {submitError && (
          <div
            className="mx-4 mt-4 rounded-lg px-4 py-3 text-sm animate-fade-in"
            style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}
          >
            {submitError}
          </div>
        )}

        {/* ── Validation summary (if any errors) ────────────────────── */}
        {Object.keys(errors).length > 0 && (
          <div
            className="mx-4 mt-4 rounded-lg px-4 py-3 animate-fade-in"
            style={{ background: 'var(--color-dw-red-soft)', border: '1px solid var(--color-dw-red)' }}
          >
            <p className="font-display font-bold text-sm mb-1" style={{ color: 'var(--color-dw-red)' }}>
              Please fix the errors below
            </p>
            <ul className="font-mono text-[10px] list-disc pl-4" style={{ color: 'var(--color-dw-red)' }}>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-6">

          {/* ── SECTION 1: Job basics ────────────────────────────────── */}
          <Section title="Job Details">
            {/* Title */}
            <div>
              <FieldLabel>Job Title *</FieldLabel>
              <input
                id="job-title"
                className="dw-input"
                type="text"
                placeholder="e.g. Plumber needed for bathroom repair"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                style={{ borderColor: errors.title ? 'var(--color-dw-red)' : '' }}
              />
              <FieldError field="title" />
            </div>

            {/* Description */}
            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                id="job-description"
                className="dw-input"
                style={{ resize: 'vertical', minHeight: 80 }}
                placeholder="Describe the work, tools needed, any special requirements…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Skill required */}
            <div>
              <FieldLabel>Skill Required *</FieldLabel>
              <select
                id="job-skill"
                className="dw-input"
                value={form.skill}
                onChange={e => set('skill', e.target.value)}
                style={{ borderColor: errors.skill ? 'var(--color-dw-red)' : '' }}
              >
                {SKILL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={!opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError field="skill" />
            </div>
          </Section>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--color-dw-border)', margin: '0 16px' }} />

          {/* ── SECTION 2: Location ──────────────────────────────────── */}
          <Section title="Location">
            {/* City */}
            <div>
              <FieldLabel>City *</FieldLabel>
              <input
                id="job-city"
                className="dw-input"
                type="text"
                placeholder="Mumbai, Delhi, Bangalore…"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                style={{ borderColor: errors.city ? 'var(--color-dw-red)' : '' }}
              />
              <FieldError field="city" />
            </div>

            {/* Map — lazy loaded */}
            <Suspense
              fallback={
                <div
                  className="skeleton"
                  style={{ height: 200, borderRadius: 8 }}
                />
              }
            >
              <LocationPicker
                lat={form.locationLat}
                lng={form.locationLng}
                onChange={(lat, lng) => {
                  set('locationLat', lat)
                  set('locationLng', lng)
                }}
                city={form.city}
              />
            </Suspense>
          </Section>

          <div style={{ height: 1, background: 'var(--color-dw-border)', margin: '0 16px' }} />

          {/* ── SECTION 3: Schedule ──────────────────────────────────── */}
          <Section title="Schedule">
            {/* Job date */}
            <div>
              <FieldLabel>Job Date *</FieldLabel>
              <input
                id="job-date"
                className="dw-input"
                type="date"
                min={todayString()}
                value={form.jobDate}
                onChange={e => set('jobDate', e.target.value)}
                style={{ borderColor: errors.jobDate ? 'var(--color-dw-red)' : '' }}
              />
              <FieldError field="jobDate" />
            </div>

            {/* Duration */}
            <div>
              <FieldLabel>Duration *</FieldLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 8,
                }}
              >
                {DURATION_OPTIONS.map(opt => {
                  const selected = form.duration === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('duration', opt.value)}
                      style={{
                        padding: '10px 8px',
                        border: `1.5px solid ${selected ? 'var(--color-dw-blue)' : 'var(--color-dw-border)'}`,
                        borderRadius: 8,
                        textAlign: 'center',
                        background: selected ? 'var(--color-dw-blue)' : 'var(--color-dw-white)',
                        cursor: 'pointer',
                        minHeight: 56,
                        transition: 'all 0.15s ease',
                      }}
                      aria-pressed={selected}
                    >
                      <p
                        className="font-display font-bold text-sm"
                        style={{ color: selected ? 'var(--color-dw-yellow)' : 'var(--color-dw-blue)' }}
                      >
                        {opt.label}
                      </p>
                      <p
                        className="font-mono text-[10px] mt-0.5"
                        style={{ color: selected ? 'rgba(255,255,255,0.6)' : 'var(--color-dw-slate)' }}
                      >
                        {opt.sub}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Workers needed */}
            <div>
              <FieldLabel>Workers Needed *</FieldLabel>
              <div className="flex items-center gap-3">
                {/* Decrement */}
                <button
                  type="button"
                  onClick={() => set('workersNeeded', Math.max(1, Number(form.workersNeeded) - 1))}
                  className="flex items-center justify-center rounded-xl font-display font-bold text-xl"
                  style={{
                    width: 48,
                    height: 48,
                    background: 'var(--color-dw-concrete)',
                    color: 'var(--color-dw-blue)',
                    flexShrink: 0,
                  }}
                  aria-label="Decrease workers"
                >
                  −
                </button>

                {/* Number input */}
                <input
                  id="job-workers-needed"
                  className="dw-input text-center font-mono font-bold text-xl"
                  type="number"
                  min={1}
                  max={50}
                  value={form.workersNeeded}
                  onChange={e => set('workersNeeded', e.target.value)}
                  style={{ flex: 1, borderColor: errors.workersNeeded ? 'var(--color-dw-red)' : '' }}
                />

                {/* Increment */}
                <button
                  type="button"
                  onClick={() => set('workersNeeded', Math.min(50, Number(form.workersNeeded) + 1))}
                  className="flex items-center justify-center rounded-xl font-display font-bold text-xl"
                  style={{
                    width: 48,
                    height: 48,
                    background: 'var(--color-dw-blue)',
                    color: 'var(--color-dw-yellow)',
                    flexShrink: 0,
                  }}
                  aria-label="Increase workers"
                >
                  +
                </button>
              </div>
              <FieldError field="workersNeeded" />
            </div>
          </Section>

          <div style={{ height: 1, background: 'var(--color-dw-border)', margin: '0 16px' }} />

          {/* ── SECTION 4: Pay ───────────────────────────────────────── */}
          <Section title="Pay">
            {/* Pay offered */}
            <div>
              <FieldLabel>Pay Offered *</FieldLabel>
              <div className="relative">
                {/* ₹ prefix */}
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm font-bold"
                  style={{ color: 'var(--color-dw-slate)' }}
                >
                  ₹
                </span>
                <input
                  id="job-pay"
                  className="dw-input font-mono font-bold text-lg"
                  type="number"
                  placeholder="600"
                  min={1}
                  style={{
                    paddingLeft: 28,
                    borderColor: errors.payOffered ? 'var(--color-dw-red)' : '',
                  }}
                  value={form.payOffered}
                  onChange={e => set('payOffered', e.target.value)}
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs"
                  style={{ color: 'var(--color-dw-slate)' }}
                >
                  /day
                </span>
              </div>
              <FieldError field="payOffered" />
            </div>

            {/* ── LIVE AI WAGE SUGGESTION BOX ────────────────────────────── */}
            {aiLoading && (
               <div className="rounded-lg px-4 py-3 flex items-center gap-2" style={{ background: 'var(--color-dw-concrete)' }}>
                 <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-dw-blue)', borderTopColor: 'transparent' }} />
                 <p className="font-mono text-xs" style={{ color: 'var(--color-dw-slate)' }}>AI analyzing local wages...</p>
               </div>
            )}

            {!aiLoading && aiWage && form.skill && (
              <div
                className="ai-box animate-fade-in"
                style={{ position: 'relative' }}
              >
                {/* AI label chip */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: 'var(--color-dw-yellow)',
                        color: 'var(--color-dw-blue)',
                      }}
                    >
                      ◆ Live AI Suggestion
                    </span>
                  </div>
                </div>

                {/* Suggested range */}
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono text-2xl font-bold"
                    style={{ color: 'var(--color-dw-blue)' }}
                  >
                    ₹{aiWage[0]}–₹{aiWage[1]}
                  </span>
                  <span className="font-mono text-sm" style={{ color: 'var(--color-dw-slate)' }}>
                    /day
                  </span>
                </div>

                {/* Context label */}
                <p className="font-body text-xs mt-1" style={{ color: 'var(--color-dw-slate)' }}>
                  Suggested fair wage for{' '}
                  <strong style={{ color: 'var(--color-dw-blue)' }}>{skillLabel}</strong>
                  {' '}in{' '}
                  <strong style={{ color: 'var(--color-dw-blue)' }}>{cityLabel}</strong>
                  {' '}based on real-time market data
                </p>

                {/* Quick-fill button */}
                <button
                  type="button"
                  onClick={() => set('payOffered', aiWage[1].toString())}
                  className="mt-2 font-display font-bold text-[11px] px-3 py-1.5 rounded-lg transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'var(--color-dw-blue)',
                    color: 'var(--color-dw-yellow)',
                    minHeight: '36px',
                  }}
                >
                  Use ₹{aiWage[1]} →
                </button>
              </div>
            )}

            {/* Show hint when no skill selected yet */}
            {!form.skill && !aiLoading && (
              <div
                className="rounded-lg px-4 py-3 flex items-center gap-2"
                style={{ background: 'var(--color-dw-concrete)' }}
              >
                <span style={{ color: 'var(--color-dw-slate)' }}>◆</span>
                <p className="font-body text-xs" style={{ color: 'var(--color-dw-slate)' }}>
                  Select a skill and city to see the AI wage suggestion
                </p>
              </div>
            )}
          </Section>

          {/* ── SUBMIT BUTTON ────────────────────────────────────────── */}
          <div className="px-4 pb-4">
            <button
              id="post-job-submit"
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Posting Job…' : '📢 Post Job Now'}
            </button>

            {/* Summary chips before submit */}
            {form.title && form.skill && form.payOffered && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center animate-fade-in">
                {[
                  { icon: '💼', label: form.title.slice(0, 20) + (form.title.length > 20 ? '…' : '') },
                  { icon: '₹', label: `${form.payOffered}/day` },
                  { icon: '📅', label: form.jobDate },
                  { icon: '👷', label: `${form.workersNeeded} worker${form.workersNeeded > 1 ? 's' : ''}` },
                ].map(chip => (
                  <span
                    key={chip.label}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--color-dw-concrete)', color: 'var(--color-dw-slate)' }}
                  >
                    {chip.icon} {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>

      <BottomNav />
    </div>
  )
}
