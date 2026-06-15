/**
 * EmployerProfile.jsx
 * Phase 2: Employer profile setup and edit page at /employer/profile.
 *
 * Fields:
 * - Company/household name (stored as public.users.name)
 * - Phone number
 * - City
 * - Employer type: Household / Contractor / Small Business (stored in public.users metadata via a new column)
 *
 * On save: updates public.users table, refreshes auth context, redirects to /.
 *
 * Visual reference: dailywork-ui-design.html — form inputs, skill pills, card styles
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TopNav from '../../components/layout/TopNav'

// Employer type options — shown as selectable tiles
const EMPLOYER_TYPES = [
  { value: 'household',     label: 'Household',      emoji: '🏠', desc: 'Need help at home' },
  { value: 'contractor',    label: 'Contractor',     emoji: '🏗️', desc: 'Construction & projects' },
  { value: 'small_business',label: 'Small Business', emoji: '🏪', desc: 'Business or shop owner' },
]

export default function EmployerProfile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile, signOut } = useAuth()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    employer_type: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Load existing data on mount
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        employer_type: profile.employer_type || '',
      })
    }
    setLoading(false)
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // Update public.users with employer profile fields
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        employer_type: form.employer_type || null,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(`Failed to save profile: ${updateError.message}`)
      setSaving(false)
      return
    }

    await refreshProfile()
    setSuccess(true)
    setTimeout(() => navigate('/'), 900)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="phone-frame flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-dw-concrete)', borderTopColor: 'var(--color-dw-blue)' }} />
      </div>
    )
  }

  return (
    <div className="phone-frame">
      <TopNav title="My Profile" showBack />

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-8">

        {/* Header card with employer badge */}
        <div className="mx-4 mt-4 mb-4 rounded-xl p-5 relative overflow-hidden" style={{ background: 'var(--color-dw-yellow)' }}>
          <div className="absolute rounded-full" style={{ width: 160, height: 160, background: 'rgba(26,43,74,0.06)', top: -40, right: -30 }} />
          <div className="flex items-center gap-3 relative z-10">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-display font-extrabold"
              style={{ background: 'var(--color-dw-blue)', color: 'var(--color-dw-yellow)' }}
            >
              {form.name ? form.name[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'rgba(26,43,74,0.6)' }}>
                Employer Account
              </p>
              <p className="font-display font-bold text-lg" style={{ color: 'var(--color-dw-blue)', letterSpacing: '-0.01em' }}>
                {form.name || 'Set your name below'}
              </p>
            </div>
          </div>
          {/* Trust badge */}
          <div className="flex items-center gap-2 mt-3 relative z-10">
            <span className="status-chip chip-open text-[10px]">
              ✓ Verified Employer
            </span>
            {profile?.trust_score > 0 && (
              <span className="font-mono text-[11px]" style={{ color: 'rgba(26,43,74,0.7)' }}>
                ★ {profile.trust_score.toFixed(1)} trust score
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-4 mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-green-soft)', color: 'var(--color-dw-green)' }}>
            ✓ Profile saved! Redirecting…
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="px-4 flex flex-col gap-5">

          {/* Name */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Company / Household Name
            </label>
            <input
              id="employer-profile-name"
              className="dw-input"
              type="text"
              placeholder="e.g. Priya Sharma, Sharma Builders"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Phone Number
            </label>
            <input
              id="employer-profile-phone"
              className="dw-input"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          {/* City */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              City
            </label>
            <input
              id="employer-profile-city"
              className="dw-input"
              type="text"
              placeholder="Mumbai, Delhi, Bangalore…"
              value={form.city}
              onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
            />
          </div>

          {/* Employer type */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-3 block" style={{ color: 'var(--color-dw-slate)' }}>
              I am a…
            </label>
            <div className="flex flex-col gap-2">
              {EMPLOYER_TYPES.map(type => {
                const isSelected = form.employer_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, employer_type: type.value }))}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--color-dw-blue)' : 'var(--color-dw-white)',
                      borderColor: isSelected ? 'var(--color-dw-blue)' : 'var(--color-dw-border)',
                      minHeight: '64px',
                    }}
                    aria-pressed={isSelected}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <div>
                      <p
                        className="font-display font-bold text-sm"
                        style={{ color: isSelected ? 'var(--color-dw-yellow)' : 'var(--color-dw-blue)' }}
                      >
                        {type.label}
                      </p>
                      <p
                        className="font-body text-xs"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--color-dw-slate)' }}
                      >
                        {type.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--color-dw-yellow)', color: 'var(--color-dw-blue)' }}
                        >
                          ✓
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stats summary (if returning user) */}
          {profile?.trust_score !== undefined && (
            <div className="card">
              <p className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-dw-slate)' }}>
                Your Stats
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-3 rounded-lg" style={{ background: 'var(--color-dw-concrete)' }}>
                  <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-dw-blue)' }}>
                    {profile.trust_score?.toFixed(1) || '—'}
                  </p>
                  <p className="font-body text-xs mt-0.5" style={{ color: 'var(--color-dw-slate)' }}>Trust Score</p>
                </div>
                <div className="text-center py-3 rounded-lg" style={{ background: 'var(--color-dw-concrete)' }}>
                  <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-dw-blue)' }}>
                    {profile.id_verified ? '✓' : '—'}
                  </p>
                  <p className="font-body text-xs mt-0.5" style={{ color: 'var(--color-dw-slate)' }}>ID Verified</p>
                </div>
              </div>
            </div>
          )}

          {/* Save */}
          <button
            id="employer-profile-save"
            type="submit"
            className="btn-yellow"
            style={{ width: '100%', marginTop: 8 }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Employer Profile'}
          </button>
        </form>

        {/* ── LOGOUT BUTTON ────────────────────────────────────────────── */}
        <div className="px-4 mt-8 mb-6 text-center">
          <button
            type="button"
            className="font-mono text-[11px] underline"
            style={{ color: 'var(--color-dw-red)' }}
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
          >
            Log out of your account
          </button>
        </div>
      </div>
    </div>
  )
}
