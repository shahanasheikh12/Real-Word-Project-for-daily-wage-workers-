/**
 * SignupEmployer.jsx
 * Employer registration page.
 * Collects: name, phone, email, password.
 * Sets role = 'employer' in user metadata.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function SignupEmployer() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: 'employer',
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    navigate('/')
    setLoading(false)
  }

  return (
    <div className="phone-frame">
      {/* Yellow header for employer theme */}
      <div className="px-6 pt-10 pb-6" style={{ background: 'var(--color-dw-yellow)' }}>
        <Link to="/login" className="font-mono text-[11px] mb-4 block" style={{ color: 'rgba(26,43,74,0.6)' }}>
          ← Back to login
        </Link>
        <h1 className="font-display text-2xl font-extrabold" style={{ color: 'var(--color-dw-blue)', letterSpacing: '-0.02em' }}>
          Join as an <span style={{ color: 'var(--color-dw-blue)', textDecoration: 'underline', textDecorationColor: 'rgba(26,43,74,0.3)' }}>Employer</span>
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: 'rgba(26,43,74,0.7)' }}>
          Post jobs and find verified workers today.
        </p>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-5">
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>Full Name / Business Name</label>
            <input id="employer-name" className="dw-input" type="text" placeholder="Priya Sharma / Sharma Builders" value={form.name} onChange={handleChange('name')} required />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>Phone Number</label>
            <input id="employer-phone" className="dw-input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange('phone')} required />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>Email</label>
            <input id="employer-email" className="dw-input" type="email" placeholder="priya@email.com" value={form.email} onChange={handleChange('email')} required autoComplete="email" />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>Password</label>
            <input id="employer-password" className="dw-input" type="password" placeholder="At least 8 characters" value={form.password} onChange={handleChange('password')} required minLength={8} autoComplete="new-password" />
          </div>

          <button id="employer-signup-submit" type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Employer Account'}
          </button>
        </form>

        <div className="ai-box flex items-start gap-3 mt-2">
          <span className="text-xl">⚡</span>
          <p className="font-body text-sm" style={{ color: 'var(--color-dw-blue)' }}>
            AI-powered matching connects you with the best available, verified workers within minutes.
          </p>
        </div>

        <p className="text-center font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-dw-blue)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
