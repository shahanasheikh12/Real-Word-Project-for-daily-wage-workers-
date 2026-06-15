/**
 * JobCard.jsx
 * Reusable job card component matching dailywork-ui-design.html exactly.
 * Used in JobFeed, MapView popup (mini variant), and Home feed.
 *
 * Props:
 *   job          — the full job row from Supabase (with employer joined)
 *   distanceKm   — number|null — distance from worker's position
 *   applied      — boolean — true if worker already applied
 *   onApply      — async function(jobId) — called when Apply is tapped
 *   applying     — boolean — true while the apply API call is in flight
 *   onClick      — optional function — navigate to job detail on card click
 *   compact      — boolean — smaller variant for map popup
 */
import { useState } from 'react'
import { formatDistance } from '../../utils/distance'
import { getSkillMeta, DURATION_LABELS } from '../../utils/skillMeta'

export default function JobCard({
  job,
  distanceKm = null,
  applied = false,
  onApply,
  applying = false,
  onClick,
  compact = false,
}) {
  const skill = getSkillMeta(job.skill_required)
  const dist  = formatDistance(distanceKm)

  // Stars from employer trust score (0–5)
  function renderStars(score) {
    const filled = Math.round(score ?? 0)
    return '★'.repeat(filled) + '☆'.repeat(5 - filled)
  }

  return (
    <div
      className="job-card animate-fade-in"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Top row: skill badge + pay */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="skill-badge">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-dw-yellow)' }} />
          {skill.emoji} {skill.label}
        </span>
        <div className="text-right">
          <span className="font-mono text-base font-bold" style={{ color: 'var(--color-dw-green)' }}>
            ₹{job.pay_offered}
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>/day</span>
        </div>
      </div>

      {/* Title */}
      <p
        className="font-display font-bold mb-2"
        style={{
          color: 'var(--color-dw-blue)',
          fontSize: compact ? 13 : 14,
          lineHeight: 1.3,
        }}
      >
        {job.title}
      </p>

      {/* Meta chips */}
      {!compact && (
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>📍 {job.city}</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>📅 {job.job_date}</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
            ⏱ {DURATION_LABELS[job.duration] ?? job.duration}
          </span>
          {distanceKm != null && (
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-blue)', fontWeight: 500 }}>
              📡 {dist}
            </span>
          )}
        </div>
      )}

      {/* Footer: employer + apply button */}
      <div
        className="flex items-center justify-between mt-3 pt-2"
        style={{ borderTop: '1px solid var(--color-dw-border)' }}
      >
        {/* Employer info */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center justify-center rounded-full font-display font-bold"
            style={{
              width: 24,
              height: 24,
              background: 'var(--color-dw-concrete)',
              color: 'var(--color-dw-blue)',
              fontSize: 10,
            }}
          >
            {job.employer?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="font-body text-xs" style={{ color: 'var(--color-dw-slate)' }}>
            {job.employer?.name ?? 'Employer'}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-dw-yellow)', letterSpacing: -1 }}>
            {renderStars(job.employer?.trust_score)}
          </span>
        </div>

        {/* Apply button */}
        {onApply && (
          applied ? (
            <span
              className="font-display font-bold text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-dw-green-soft)', color: 'var(--color-dw-green)' }}
            >
              ✓ Applied
            </span>
          ) : (
            <button
              className="apply-btn"
              style={{ minHeight: 36 }}
              disabled={applying}
              onClick={e => { e.stopPropagation(); onApply(job.id) }}
            >
              {applying ? '…' : 'Apply'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
