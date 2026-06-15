/**
 * Login.jsx
 * Shared login page for workers and employers.
 * After login, reads the user's role from public.users and redirects accordingly.
 * Admins are redirected to /admin/dashboard.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function Login() {
  const navigate = useNavigate()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // 1. Sign in with Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 2. Fetch the user's role from public.users
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('role, must_change_password')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      setError('Profile not found. Please contact support.')
      setLoading(false)
      return
    }

    // 3. Redirect based on role
    const { role, must_change_password } = userData
    if (role === 'admin') {
      navigate(must_change_password ? '/admin/change-password' : '/admin/dashboard')
    } else if (role === 'worker') {
      navigate('/')
    } else {
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div className="phone-frame">
      {/* Header */}
      <div
        className="px-6 pt-12 pb-8"
        style={{ background: 'var(--color-dw-blue)' }}
      >
        <h1
          className="font-display text-3xl font-extrabold mb-1"
          style={{ color: 'var(--color-dw-white)', letterSpacing: '-0.02em' }}
        >
          Daily<span style={{ color: 'var(--color-dw-yellow)' }}>Work</span>
        </h1>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Find work. Find workers. Fast.
        </p>
      </div>

      {/* Form card */}
      <div className="flex-1 px-6 pt-8 pb-6 flex flex-col gap-6">
        <div>
          <h2
            className="font-display text-2xl font-bold mb-1"
            style={{ color: 'var(--color-dw-blue)' }}
          >
            Welcome back
          </h2>
          <p className="font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>
            Sign in to continue
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm font-body animate-fade-in"
            style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label
              className="font-mono text-[11px] uppercase tracking-widest mb-2 block"
              style={{ color: 'var(--color-dw-slate)' }}
            >
              Email
            </label>
            <input
              id="login-email"
              className="dw-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="font-mono text-[11px] uppercase tracking-widest mb-2 block"
              style={{ color: 'var(--color-dw-slate)' }}
            >
              Password
            </label>
            <input
              id="login-password"
              className="dw-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {/* Submit button */}
          <button
            id="login-submit"
            type="submit"
            className="btn-primary mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Signup links */}
        <div className="text-center">
          <p className="font-body text-sm mb-4" style={{ color: 'var(--color-dw-slate)' }}>
            Don't have an account?
          </p>
          <div className="flex gap-3">
            <Link
              to="/signup/worker"
              className="btn-secondary flex-1 text-center no-underline flex items-center justify-center"
              style={{ fontSize: '13px' }}
            >
              I'm a Worker
            </Link>
            <Link
              to="/signup/employer"
              className="btn-yellow flex-1 text-center no-underline flex items-center justify-center"
              style={{ fontSize: '13px' }}
            >
              I'm an Employer
            </Link>
          </div>
        </div>

        {/* Admin login link */}
        <div className="text-center pt-2">
          <Link
            to="/admin/login"
            className="font-mono text-[11px] underline"
            style={{ color: 'var(--color-dw-slate)' }}
          >
            Admin login →
          </Link>
        </div>
      </div>
    </div>
  )
}
