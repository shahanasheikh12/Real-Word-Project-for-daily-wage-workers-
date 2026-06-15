/**
 * SignupWorker.jsx
 * Worker registration page.
 * Collects: name, phone, email, password.
 * Sets role = 'worker' in user metadata, which the DB trigger picks up.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function SignupWorker() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Register with Supabase Auth
    // raw_user_meta_data is read by the DB trigger to populate public.users
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: 'worker', // picked up by DB trigger
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Redirect to home — the profile is sparse, user will complete it on /worker/profile
    navigate('/')
    setLoading(false)
  }

  return (
    <div className="phone-frame">
      {/* Header */}
      <div className="px-6 pt-10 pb-6" style={{ background: 'var(--color-dw-blue)' }}>
        <Link to="/login" className="font-mono text-[11px] mb-4 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
          ← Back to login
        </Link>
        <h1 className="font-display text-2xl font-extrabold" style={{ color: 'var(--color-dw-white)', letterSpacing: '-0.02em' }}>
          Join as a <span style={{ color: 'var(--color-dw-yellow)' }}>Worker</span>
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Find daily work near you, instantly.
        </p>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-5">
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          {/* Full name */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Full Name
            </label>
            <input id="worker-name" className="dw-input" type="text" placeholder="Raju Kumar" value={form.name} onChange={handleChange('name')} required />
          </div>

          {/* Phone */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Phone Number
            </label>
            <input id="worker-phone" className="dw-input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange('phone')} required />
          </div>

          {/* Email */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Email
            </label>
            <input id="worker-email" className="dw-input" type="email" placeholder="raju@email.com" value={form.email} onChange={handleChange('email')} required autoComplete="email" />
          </div>

          {/* Password */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Password
            </label>
            <input id="worker-password" className="dw-input" type="password" placeholder="At least 8 characters" value={form.password} onChange={handleChange('password')} required minLength={8} autoComplete="new-password" />
          </div>

          <button id="worker-signup-submit" type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Worker Account'}
          </button>
        </form>

        {/* Info chips */}
        <div className="ai-box flex items-start gap-3 mt-2">
          <span className="text-xl">🤖</span>
          <p className="font-body text-sm" style={{ color: 'var(--color-dw-blue)' }}>
            Our AI matches you to jobs based on your skills, location, and availability — automatically.
          </p>
        </div>

        <p className="text-center font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-dw-blue)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
