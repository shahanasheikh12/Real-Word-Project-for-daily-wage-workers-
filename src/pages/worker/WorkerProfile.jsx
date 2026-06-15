/**
 * WorkerProfile.jsx
 * Phase 2: Worker profile setup and edit page at /worker/profile.
 *
 * Features:
 * - Profile completion percentage bar
 * - Availability toggle (Available Today / Available Tomorrow / Not Available)
 *   → saves immediately to Supabase on change
 * - Form: name, phone, city, skills (multi-select), experience, daily wage, ID photo upload, profile photo upload
 * - Photo uploads go to Supabase Storage bucket "worker-documents"
 * - On save: upserts worker_profiles and updates users tables
 * - Redirects to / on save
 *
 * Visual reference: dailywork-ui-design.html — availability beacon, skill pills, upload areas
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TopNav from '../../components/layout/TopNav'

// All available skill options matching the PRD
const SKILL_OPTIONS = [
  { value: 'construction', label: 'Construction', emoji: '🏗️' },
  { value: 'plumbing',     label: 'Plumbing',     emoji: '🔧' },
  { value: 'electrical',   label: 'Electrical',   emoji: '⚡' },
  { value: 'painting',     label: 'Painting',     emoji: '🖌️' },
  { value: 'carpentry',    label: 'Carpentry',    emoji: '🪚' },
  { value: 'cleaning',     label: 'Cleaning',     emoji: '🧹' },
  { value: 'gardening',    label: 'Gardening',    emoji: '🌿' },
  { value: 'delivery',     label: 'Delivery',     emoji: '📦' },
  { value: 'domestic',     label: 'Domestic Help', emoji: '🏠' },
  { value: 'other',        label: 'Other',        emoji: '⚙️' },
]

// Availability options — displayed as toggle chips in the beacon
const AVAILABILITY_OPTIONS = [
  { value: 'today',       label: 'Today',       color: 'var(--color-dw-green)' },
  { value: 'tomorrow',    label: 'Tomorrow',    color: 'var(--color-dw-orange)' },
  { value: 'unavailable', label: 'Unavailable', color: 'var(--color-dw-slate)' },
]

function StarRating({ score }) {
  const n = Math.round(score ?? 0)
  return (
    <span style={{ color: 'var(--color-dw-yellow)', letterSpacing: -1, fontSize: 14 }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

/**
 * Calculates profile completion percentage based on filled fields.
 * Returns a number 0–100 and a message describing what's missing.
 */
function calcCompletion(form, workerForm) {
  const fields = [
    { filled: !!form.name,                     label: 'name' },
    { filled: !!form.phone,                    label: 'phone' },
    { filled: !!form.city,                     label: 'city' },
    { filled: workerForm.skills.length > 0,    label: 'skills' },
    { filled: !!workerForm.experience_years,   label: 'experience' },
    { filled: !!workerForm.daily_wage,         label: 'daily wage' },
    { filled: !!workerForm.profilePhotoUrl,    label: 'profile photo' },
    { filled: !!workerForm.idPhotoUrl,         label: 'ID photo' },
  ]
  const filledCount = fields.filter(f => f.filled).length
  const pct = Math.round((filledCount / fields.length) * 100)
  const missing = fields.filter(f => !f.filled).map(f => f.label)
  return { pct, missing }
}

export default function WorkerProfile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile, signOut } = useAuth()

  // User-level fields (stored in public.users)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
  })

  // Worker-level fields (stored in worker_profiles)
  const [workerForm, setWorkerForm] = useState({
    skills: [],
    experience_years: '',
    daily_wage: '',
    availability: 'unavailable',
    profilePhotoUrl: '',
    idPhotoUrl: '',
  })

  // UI state
  const [loading, setLoading] = useState(true)         // initial data fetch
  const [saving, setSaving] = useState(false)          // save button loading
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(null) // 'profile' | 'id' | null
  const [availabilitySaving, setAvailabilitySaving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceError, setVoiceError] = useState(null)

  // Earnings log state
  const [completedJobs, setCompletedJobs] = useState([])
  const [weeklyEarnings, setWeeklyEarnings] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState(0)

  const profilePhotoInputRef = useRef(null)
  const idPhotoInputRef = useRef(null)

  // ── Load existing profile data on mount ──────────────────────────────────
  useEffect(() => {
    if (!user) return

    async function loadProfile() {
      // Load public.users data
      if (profile) {
        setForm({
          name: profile.name || '',
          phone: profile.phone || '',
          city: profile.city || '',
        })
      }

      // Load worker_profiles data
      const { data: wp } = await supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (wp) {
        setWorkerForm({
          skills: wp.skills || [],
          experience_years: wp.experience_years?.toString() || '',
          daily_wage: wp.daily_wage_expectation?.toString() || '',
          availability: wp.availability || 'unavailable',
          profilePhotoUrl: wp.profile_photo_url || '',
          idPhotoUrl: wp.id_photo_url || '',
        })
      }

      // Load completed jobs for Earnings Log
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          id, status, 
          jobs (
            id, title, pay_offered, job_date,
            employer:employer_id ( name )
          )
        `)
        .eq('worker_id', user.id)
        .eq('status', 'completed')

      if (apps) {
        const jobsList = apps.map(app => app.jobs).filter(Boolean)
        
        const now = new Date()
        let weekly = 0
        let monthly = 0
        
        jobsList.forEach(job => {
          if (!job.job_date) return
          const jobDate = new Date(job.job_date)
          const diffTime = now.getTime() - jobDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays >= 0 && diffDays <= 7) weekly += Number(job.pay_offered) || 0
          if (diffDays >= 0 && diffDays <= 30) monthly += Number(job.pay_offered) || 0
        })
        
        jobsList.sort((a, b) => new Date(b.job_date) - new Date(a.job_date))
        
        setCompletedJobs(jobsList)
        setWeeklyEarnings(weekly)
        setMonthlyEarnings(monthly)
      }

      setLoading(false)
    }

    loadProfile()
  }, [user, profile])

  // ── Availability toggle — saves immediately ──────────────────────────────
  async function handleAvailabilityChange(newVal) {
    if (availabilitySaving || newVal === workerForm.availability) return
    setAvailabilitySaving(true)

    // Optimistic UI update
    setWorkerForm(prev => ({ ...prev, availability: newVal }))

    // Upsert worker_profiles with new availability
    const { error } = await supabase
      .from('worker_profiles')
      .upsert(
        { user_id: user.id, availability: newVal },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Failed to update availability:', error.message)
      // Revert on error
      setWorkerForm(prev => ({ ...prev, availability: workerForm.availability }))
    }

    setAvailabilitySaving(false)
  }

  // ── Skill toggle ──────────────────────────────────────────────────────────
  function toggleSkill(skillValue) {
    setWorkerForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skillValue)
        ? prev.skills.filter(s => s !== skillValue)
        : [...prev.skills, skillValue],
    }))
  }

  // ── Photo upload to Supabase Storage ─────────────────────────────────────
  async function handlePhotoUpload(file, type) {
    // type: 'profile' | 'id'
    if (!file) return null
    setUploadingPhoto(type)

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${type}-photo-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('worker-documents')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(`Failed to upload ${type} photo: ${uploadError.message}`)
      setUploadingPhoto(null)
      return null
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('worker-documents')
      .getPublicUrl(path)

    setUploadingPhoto(null)
    return urlData.publicUrl
  }

  async function handleProfilePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await handlePhotoUpload(file, 'profile')
    if (url) setWorkerForm(prev => ({ ...prev, profilePhotoUrl: url }))
  }

  async function handleIdPhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await handlePhotoUpload(file, 'id')
    if (url) setWorkerForm(prev => ({ ...prev, idPhotoUrl: url }))
  }

  // ── Save all profile data ─────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // 1. Update public.users
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
      })
      .eq('id', user.id)

    if (userError) {
      setError(`Failed to save profile: ${userError.message}`)
      setSaving(false)
      return
    }

    // 2. Upsert worker_profiles
    const { error: wpError } = await supabase
      .from('worker_profiles')
      .upsert(
        {
          user_id: user.id,
          skills: workerForm.skills,
          experience_years: parseInt(workerForm.experience_years) || 0,
          daily_wage_expectation: parseFloat(workerForm.daily_wage) || null,
          availability: workerForm.availability,
          profile_photo_url: workerForm.profilePhotoUrl || null,
          id_photo_url: workerForm.idPhotoUrl || null,
        },
        { onConflict: 'user_id' }
      )

    if (wpError) {
      setError(`Failed to save worker profile: ${wpError.message}`)
      setSaving(false)
      return
    }

    // 3. Refresh auth context and redirect
    await refreshProfile()
    setSuccess(true)

    // Brief success flash then navigate
    setTimeout(() => navigate('/'), 900)
    setSaving(false)
  }

  // ── Voice Onboarding ──────────────────────────────────────────────────────
  function startVoiceOnboarding() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError("Your browser doesn't support voice input.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsRecording(true)
      setVoiceError(null)
    }

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setIsRecording(false)
      
      try {
        const aiApiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000'
        const res = await fetch(`${aiApiUrl}/api/voice-onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
        })
        const data = await res.json()
        
        if (data.skill || data.experience_years || data.daily_wage_expectation) {
          setWorkerForm(prev => {
            const newSkills = data.skill && !prev.skills.includes(data.skill) 
              ? [...prev.skills, data.skill] 
              : prev.skills
              
            return {
              ...prev,
              skills: newSkills,
              experience_years: data.experience_years ? data.experience_years.toString() : prev.experience_years,
              daily_wage: data.daily_wage_expectation ? data.daily_wage_expectation.toString() : prev.daily_wage,
            }
          })
          setSuccess("Voice extracted successfully!")
          setTimeout(() => setSuccess(false), 3000)
        } else {
          setVoiceError("Could not understand — please fill manually")
        }
      } catch (err) {
        console.error(err)
        setVoiceError("Failed to connect to AI service.")
      }
    }

    recognition.onerror = (event) => {
      setIsRecording(false)
      setVoiceError("Speech recognition error: " + event.error)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.start()
  }

  // ── Derived: completion percentage ──────────────────────────────────────
  const { pct, missing } = calcCompletion(form, workerForm)

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

        {/* ── PROFILE HEADER (Name & Trust Score) ────────────────────────── */}
        <div className="px-4 pt-4 pb-2 flex flex-col items-center">
          <h2 className="font-display font-bold text-xl" style={{ color: 'var(--color-dw-blue)' }}>
            {profile?.name || 'Worker Profile'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <StarRating score={profile?.trust_score} />
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
              {profile?.trust_score?.toFixed(1) ?? '—'} trust score
            </span>
          </div>
        </div>

        {/* ── AVAILABILITY BEACON ─────────────────────────────────────────── */}
        <div className="mx-4 mt-4 mb-4 rounded-xl p-5 relative overflow-hidden" style={{ background: 'var(--color-dw-blue)' }}>
          {/* Decorative circles */}
          <div className="absolute rounded-full" style={{ width: 160, height: 160, background: 'rgba(245,197,24,0.08)', top: -40, right: -30 }} />
          <div className="absolute rounded-full" style={{ width: 100, height: 100, background: 'rgba(245,197,24,0.06)', top: -10, right: 0 }} />

          {/* Label */}
          <p className="font-mono text-[11px] uppercase tracking-widest mb-3 relative z-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Availability Status
          </p>

          {/* Pulse dot + status text */}
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div
              className="rounded-full flex-shrink-0 beacon-pulse"
              style={{
                width: 14,
                height: 14,
                background: workerForm.availability === 'today' ? 'var(--color-dw-yellow)'
                  : workerForm.availability === 'tomorrow' ? 'var(--color-dw-orange)'
                  : 'var(--color-dw-slate)',
              }}
            />
            <div>
              <p className="font-display font-bold text-xl" style={{ color: 'var(--color-dw-white)', letterSpacing: '-0.02em' }}>
                {workerForm.availability === 'today' ? 'Available Today'
                  : workerForm.availability === 'tomorrow' ? 'Available Tomorrow'
                  : 'Not Available'}
              </p>
              <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {availabilitySaving ? 'Saving…' : 'Tap to change your status'}
              </p>
            </div>
          </div>

          {/* Availability chips */}
          <div className="flex gap-2 relative z-10 flex-wrap">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAvailabilityChange(opt.value)}
                className="font-mono text-[10px] px-3 py-1.5 rounded-full border transition-all"
                style={{
                  borderColor: workerForm.availability === opt.value ? 'var(--color-dw-yellow)' : 'rgba(255,255,255,0.2)',
                  background: workerForm.availability === opt.value ? 'var(--color-dw-yellow)' : 'transparent',
                  color: workerForm.availability === opt.value ? 'var(--color-dw-blue)' : 'rgba(255,255,255,0.7)',
                  fontWeight: workerForm.availability === opt.value ? '600' : '400',
                  minHeight: '32px',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── PROFILE COMPLETION BAR ─────────────────────────────────────── */}
        <div className="mx-4 mb-4 card">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
              Profile {pct}% Complete
            </span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-dw-slate)' }}>
              {pct === 100 ? '🎉 All done!' : `${missing.length} left`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full rounded-full h-2" style={{ background: 'var(--color-dw-concrete)' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? 'var(--color-dw-green)'
                  : pct >= 50 ? 'var(--color-dw-yellow)'
                  : 'var(--color-dw-orange)',
              }}
            />
          </div>

          {/* Missing field hint */}
          {pct < 100 && (
            <p className="font-body text-xs mt-2" style={{ color: 'var(--color-dw-slate)' }}>
              Add your {missing[0]} to get more job matches
            </p>
          )}
        </div>

        {/* ── ERROR / SUCCESS MESSAGES ───────────────────────────────────── */}
        {error && (
          <div className="mx-4 mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-green-soft)', color: 'var(--color-dw-green)' }}>
            {typeof success === 'string' ? `✓ ${success}` : '✓ Profile saved! Redirecting…'}
          </div>
        )}
        {voiceError && (
          <div className="mx-4 mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-orange-soft)', color: 'var(--color-dw-orange)' }}>
            {voiceError}
          </div>
        )}

        {/* ── VOICE ONBOARDING ──────────────────────────────────────────── */}
        <div className="mx-4 mb-6 card flex flex-col items-center text-center animate-fade-in" style={{ background: 'var(--color-dw-concrete)' }}>
          <button
            type="button"
            onClick={startVoiceOnboarding}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all shadow-md ${isRecording ? 'beacon-pulse' : ''}`}
            style={{ 
              background: isRecording ? 'var(--color-dw-red)' : 'var(--color-dw-blue)',
              color: 'var(--color-dw-white)',
              transform: isRecording ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            🎙️
          </button>
          <p className="font-display font-bold text-sm mt-3" style={{ color: 'var(--color-dw-blue)' }}>
            {isRecording ? 'Listening...' : 'Fill with Voice'}
          </p>
          <p className="font-mono text-[10px] mt-1 px-4" style={{ color: 'var(--color-dw-slate)' }}>
            Speak naturally, e.g.: "I am a carpenter with 3 years experience, I want 500 rupees a day"
          </p>
        </div>

        {/* ── FORM ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSave} className="px-4 flex flex-col gap-5">

          {/* Profile photo upload */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-3 block" style={{ color: 'var(--color-dw-slate)' }}>
              Profile Photo
            </label>
            <div
              className="photo-upload-area flex flex-col items-center gap-3"
              onClick={() => profilePhotoInputRef.current?.click()}
            >
              {workerForm.profilePhotoUrl ? (
                <img
                  src={workerForm.profilePhotoUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ border: '3px solid var(--color-dw-blue)' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: 'var(--color-dw-concrete)' }}
                >
                  👤
                </div>
              )}
              <div className="text-center">
                <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
                  {uploadingPhoto === 'profile' ? 'Uploading…' : workerForm.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                </p>
                <p className="font-body text-xs mt-0.5" style={{ color: 'var(--color-dw-slate)' }}>
                  JPG, PNG up to 5MB
                </p>
              </div>
            </div>
            <input
              id="worker-profile-photo"
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePhotoChange}
            />
          </div>

          {/* Full name */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Full Name
            </label>
            <input
              id="worker-profile-name"
              className="dw-input"
              type="text"
              placeholder="Your full name"
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
              id="worker-profile-phone"
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
              id="worker-profile-city"
              className="dw-input"
              type="text"
              placeholder="Mumbai, Delhi, Bangalore…"
              value={form.city}
              onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
            />
          </div>

          {/* Skills multi-select */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-3 block" style={{ color: 'var(--color-dw-slate)' }}>
              Skills <span style={{ color: 'var(--color-dw-slate)', fontWeight: 400 }}>(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => {
                const isSelected = workerForm.skills.includes(skill.value)
                return (
                  <button
                    key={skill.value}
                    type="button"
                    onClick={() => toggleSkill(skill.value)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border font-body text-sm transition-all"
                    style={{
                      background: isSelected ? 'var(--color-dw-blue)' : 'var(--color-dw-white)',
                      borderColor: isSelected ? 'var(--color-dw-blue)' : 'var(--color-dw-border)',
                      color: isSelected ? 'var(--color-dw-yellow)' : 'var(--color-dw-blue)',
                      fontWeight: isSelected ? 600 : 400,
                      minHeight: '44px',
                    }}
                    aria-pressed={isSelected}
                  >
                    <span>{skill.emoji}</span>
                    <span>{skill.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Years of experience */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Years of Experience
            </label>
            <input
              id="worker-experience"
              className="dw-input"
              type="number"
              placeholder="e.g. 3"
              min="0"
              max="50"
              value={workerForm.experience_years}
              onChange={e => setWorkerForm(prev => ({ ...prev, experience_years: e.target.value }))}
            />
          </div>

          {/* Daily wage expectation */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Daily Wage Expectation
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm"
                style={{ color: 'var(--color-dw-slate)' }}
              >
                ₹
              </span>
              <input
                id="worker-daily-wage"
                className="dw-input"
                style={{ paddingLeft: '28px' }}
                type="number"
                placeholder="500"
                min="0"
                value={workerForm.daily_wage}
                onChange={e => setWorkerForm(prev => ({ ...prev, daily_wage: e.target.value }))}
              />
            </div>
            <p className="font-mono text-[11px] mt-1.5" style={{ color: 'var(--color-dw-slate)' }}>
              Amount in Indian Rupees (₹) per day
            </p>
          </div>

          {/* ID photo upload */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-3 block" style={{ color: 'var(--color-dw-slate)' }}>
              ID Verification (Aadhaar / National ID)
            </label>
            <div
              className="photo-upload-area"
              onClick={() => idPhotoInputRef.current?.click()}
            >
              {workerForm.idPhotoUrl ? (
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: 'var(--color-dw-green-soft)' }}
                  >
                    ✅
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-green)' }}>
                      ID uploaded
                    </p>
                    <p className="font-body text-xs" style={{ color: 'var(--color-dw-slate)' }}>
                      Tap to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-3xl mb-2">🪪</div>
                  <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
                    {uploadingPhoto === 'id' ? 'Uploading…' : 'Upload ID Document'}
                  </p>
                  <p className="font-body text-xs mt-1" style={{ color: 'var(--color-dw-slate)' }}>
                    Aadhaar, Voter ID, Driving License
                  </p>
                </div>
              )}
            </div>
            <input
              id="worker-id-photo"
              ref={idPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIdPhotoChange}
            />
          </div>

          {/* AI suggestion box */}
          {workerForm.skills.length > 0 && (
            <div className="ai-box flex items-start gap-3 animate-fade-in">
              <div
                className="flex items-center justify-center rounded-lg text-lg flex-shrink-0"
                style={{ width: 36, height: 36, background: 'var(--color-dw-yellow)' }}
              >
                🤖
              </div>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
                  AI Job Match Ready
                </p>
                <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--color-dw-slate)' }}>
                  Based on your skills in {workerForm.skills.slice(0, 2).join(' & ')}, we'll match you to the best nearby jobs automatically.
                </p>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            id="worker-profile-save"
            type="submit"
            className="btn-primary"
            disabled={saving || uploadingPhoto !== null}
            style={{ marginTop: 8 }}
          >
            {saving ? 'Saving Profile…' : 'Save Profile'}
          </button>
        </form>

        {/* ── EARNINGS LOG ────────────────────────────────────────────── */}
        <div className="px-4 mt-8 mb-4">
          <h3 className="font-display font-bold text-lg mb-3" style={{ color: 'var(--color-dw-blue)' }}>
            Earnings Log
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card text-center py-4">
              <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-dw-slate)' }}>
                Past 7 Days
              </p>
              <p className="font-mono text-2xl font-bold mt-1" style={{ color: 'var(--color-dw-green)' }}>
                ₹{weeklyEarnings}
              </p>
            </div>
            <div className="card text-center py-4">
              <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-dw-slate)' }}>
                Past 30 Days
              </p>
              <p className="font-mono text-2xl font-bold mt-1" style={{ color: 'var(--color-dw-green)' }}>
                ₹{monthlyEarnings}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {completedJobs.length === 0 ? (
              <div className="card text-center py-6">
                <p className="font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>
                  No completed jobs yet.
                </p>
              </div>
            ) : (
              completedJobs.map((job, idx) => (
                <div key={job.id || idx} className="card py-3 px-3 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>
                      {job.title}
                    </p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-dw-slate)' }}>
                      {job.job_date} • {job.employer?.name || 'Employer'}
                    </p>
                  </div>
                  <div className="font-mono text-base font-bold" style={{ color: 'var(--color-dw-green)' }}>
                    +₹{job.pay_offered}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
